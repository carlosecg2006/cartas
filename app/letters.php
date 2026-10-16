<?php
declare(strict_types=1);

function find_letter(int $id): ?array
{
    $letter = q_one(
        'SELECT l.*, u.name AS recipient_name, u.avatar AS recipient_avatar, u.color AS recipient_color,
                s.name AS sender_name, s.avatar AS sender_avatar, s.color AS sender_color
         FROM letters l
         LEFT JOIN users u ON u.id = l.recipient_id
         LEFT JOIN users s ON s.id = l.sender_id
         WHERE l.id = ?',
        [$id]
    );
    if ($letter) {
        $letter['content'] = json_decode((string) $letter['content'], true) ?: default_letter_content();
    }
    return $letter;
}

/** 'sender' para quem escreveu, 'recipient' para quem recebeu (depois de enviada), null para o resto. */
function letter_role(array $letter, array $user): ?string
{
    if ((int) $letter['sender_id'] === (int) $user['id']) {
        return 'sender';
    }
    if ((int) $letter['recipient_id'] === (int) $user['id'] && $letter['status'] === 'sent') {
        return 'recipient';
    }
    return null;
}

/** Cada pessoa só vê as cartas que escreveu ou recebeu. */
function can_view_letter(array $letter, array $user): bool
{
    return letter_role($letter, $user) !== null;
}

/** Lacrada até uma data escolhida por quem escreveu. */
function letter_locked(array $letter): bool
{
    return !empty($letter['open_at']) && strtotime($letter['open_at']) > time();
}

/** Correio lento: a carta ainda está "a caminho". */
function letter_in_transit(array $letter): bool
{
    return !empty($letter['delivered_at']) && strtotime($letter['delivered_at']) > time();
}

/** Para quem recebe: 'transit', 'date' ou null (pode abrir). Quem escreveu sempre pode ver. */
function letter_seal(array $letter, array $user): ?string
{
    if (letter_role($letter, $user) !== 'recipient') {
        return null;
    }
    if (letter_in_transit($letter)) {
        return 'transit';
    }
    return letter_locked($letter) ? 'date' : null;
}

/** Condição SQL: cartas que já chegaram (correio lento entregue). */
function sql_delivered(string $alias = 'l'): string
{
    return "($alias.delivered_at IS NULL OR $alias.delivered_at <= '" . now() . "')";
}

/**
 * O que quem está olhando pode saber de uma carta antes de abrir.
 * Quem recebe não vê trecho nenhum antes de abrir, e não vê o título se quem escreveu pediu surpresa.
 */
function letter_unopened_for(array $l, int $viewerId): bool
{
    return (int) ($l['recipient_id'] ?? 0) === $viewerId && (int) ($l['sender_id'] ?? 0) !== $viewerId && empty($l['first_opened_at']);
}

function letter_title_for(array $l, int $viewerId, string $fallback = 'Uma carta para você'): string
{
    if (letter_unopened_for($l, $viewerId) && !empty($l['content']['envelope']['hideTitle'])) {
        return $fallback;
    }
    return (string) ($l['title'] ?: $fallback);
}

function letter_excerpt_for(array $l, int $viewerId): string
{
    return letter_unopened_for($l, $viewerId) ? '' : (string) ($l['excerpt'] ?? '');
}

/** Colunas para listas (sem o conteúdo inteiro, que pode ser grande). */
const LETTER_LIST_COLS = 'l.id, l.sender_id, l.recipient_id, l.title, l.status, l.open_at, l.sent_at, l.delivered_at, '
    . 'l.first_opened_at, l.last_opened_at, l.open_count, l.created_at, l.updated_at, l.meta';

/** Completa uma linha de lista com envelope, cor do papel e trecho (vindos da coluna meta). */
function hydrate_meta(array $l): array
{
    $meta = json_decode((string) ($l['meta'] ?? ''), true);
    if (!is_array($meta)) {
        // carta antiga ainda sem meta: calcula uma vez e guarda
        $content = json_decode((string) q_val('SELECT content FROM letters WHERE id = ?', [(int) $l['id']]), true) ?: [];
        $d = letter_derived((string) $l['title'], $content);
        q('UPDATE letters SET search_text = ?, meta = ? WHERE id = ?', [$d['search_text'], $d['meta'], (int) $l['id']]);
        $meta = json_decode($d['meta'], true);
    }
    $l['content'] = ['envelope' => $meta['envelope'] ?? [], 'paper' => ['color' => $meta['paper'] ?? '#fffdf6']];
    $l['excerpt'] = (string) ($meta['excerpt'] ?? '');
    $l['has_music'] = !empty($meta['bgm']);
    return $l;
}

function create_letter(?int $recipientId, array $sender, string $template = 'branco', ?int $replyTo = null): int
{
    $recipient = $recipientId && is_contact((int) $sender['id'], $recipientId) ? find_user($recipientId) : null;
    $recipientName = $recipient ? name_for((int) $sender['id'], $recipient) : '';
    $content = build_template($template, $recipientName, $sender['name']);
    $title = (letter_templates()[$template]['title'] ?? '') ?: ($recipient ? 'Carta para ' . first_name($recipientName) : 'Nova carta');
    if ($replyTo) {
        $original = q_one('SELECT title FROM letters WHERE id = ?', [$replyTo]);
        if ($original) {
            $title = mb_substr('Re: ' . preg_replace('/^(Re: )+/', '', $original['title']), 0, 150);
        }
    }
    $id = db_insert('letters', [
        'sender_id' => (int) $sender['id'],
        'recipient_id' => $recipient ? (int) $recipient['id'] : null,
        'title' => $title,
        'content' => json_encode($content, JSON_UNESCAPED_UNICODE),
        'status' => 'draft',
        'reply_to' => $replyTo,
        'created_at' => now(),
        'updated_at' => now(),
    ] + letter_derived($title, $content));
    sync_letter_media($id, $content);
    return $id;
}

function duplicate_letter(array $letter): int
{
    $id = db_insert('letters', [
        'sender_id' => (int) $letter['sender_id'],
        'recipient_id' => null,
        'title' => mb_substr('Cópia de ' . $letter['title'], 0, 150),
        'content' => json_encode($letter['content'], JSON_UNESCAPED_UNICODE),
        'status' => 'draft',
        'created_at' => now(),
        'updated_at' => now(),
    ] + letter_derived('Cópia de ' . $letter['title'], $letter['content']));
    sync_letter_media($id, $letter['content']);
    return $id;
}

/** Guarda quais arquivos cada carta usa (é isso que libera o acesso de quem recebe). */
function sync_letter_media(int $letterId, array $content): void
{
    $want = content_media($content);
    $have = array_column(q_all('SELECT filename FROM letter_media WHERE letter_id = ?', [$letterId]), 'filename');
    sort($want);
    sort($have);
    if ($want === $have) {
        return; // nada mudou: evita reescrever a cada salvamento automático
    }
    q('DELETE FROM letter_media WHERE letter_id = ?', [$letterId]);
    foreach ($want as $file) {
        try {
            db_insert('letter_media', ['letter_id' => $letterId, 'filename' => $file]);
        } catch (PDOException $e) {
            // outro salvamento ao mesmo tempo já inseriu
        }
    }
}

/** Apaga arquivos que a pessoa tirou da biblioteca e nenhuma carta usa mais. */
function gc_hidden_media(int $userId): void
{
    $rows = q_all('SELECT m.id, m.filename FROM media m WHERE m.user_id = ? AND m.in_library = 0
        AND NOT EXISTS (SELECT 1 FROM letter_media lm WHERE lm.filename = m.filename)', [$userId]);
    foreach ($rows as $m) {
        @unlink(UPLOAD_DIR . '/' . $m['filename']);
        q('DELETE FROM media WHERE id = ?', [(int) $m['id']]);
    }
}

/** Tamanho máximo de envio que a hospedagem aceita, em bytes. */
function upload_limit_bytes(): int
{
    $parse = static function ($v): int {
        $v = trim((string) $v);
        if ($v === '' || $v === '-1') {
            return PHP_INT_MAX;
        }
        $n = (float) $v;
        return (int) match (strtolower(substr($v, -1))) { 'g' => $n * 1073741824, 'm' => $n * 1048576, 'k' => $n * 1024, default => $n };
    };
    return max(1048576, min($parse(ini_get('upload_max_filesize')), $parse(ini_get('post_max_size')) - 65536, 12 * 1048576));
}

/** Espaço total que cada pessoa pode ocupar com fotos e áudios. */
const USER_STORAGE_MB = 400;

function check_storage_quota(int $userId, int $incoming): void
{
    $used = (int) q_val('SELECT COALESCE(SUM(size), 0) FROM media WHERE user_id = ?', [$userId]);
    if ($used + $incoming > USER_STORAGE_MB * 1048576) {
        throw new RuntimeException('Sua biblioteca chegou ao limite de ' . USER_STORAGE_MB . ' MB. Apague arquivos que não usa mais na aba Biblioteca.');
    }
}

/** As imagens e áudios ficam na biblioteca de quem enviou; apagar a carta não apaga os arquivos. */
function delete_letter(int $id): void
{
    q('UPDATE media SET letter_id = NULL WHERE letter_id = ?', [$id]);
    q('DELETE FROM letters WHERE id = ?', [$id]);
}

/** Quem pode baixar um arquivo de mídia: o dono, ou quem pode abrir uma carta que usa o arquivo. */
function can_access_media(array $media, array $user): bool
{
    if ((int) $media['user_id'] === (int) $user['id']) {
        return true;
    }
    $letters = q_all(
        'SELECT l.* FROM letter_media lm JOIN letters l ON l.id = lm.letter_id
         WHERE lm.filename = ? AND (l.sender_id = ? OR l.recipient_id = ?)',
        [$media['filename'], (int) $user['id'], (int) $user['id']]
    );
    foreach ($letters as $l) {
        if (can_view_letter($l, $user) && letter_seal($l, $user) === null) {
            return true;
        }
    }
    return false;
}

function letter_reactions(int $letterId): array
{
    return array_column(q_all('SELECT emoji FROM reactions WHERE letter_id = ? ORDER BY id', [$letterId]), 'emoji');
}

/** Respostas de quem recebeu aos blocos interativos: {blockId: {value, at}}. */
function letter_interactions(int $letterId, int $recipientId): array
{
    $out = [];
    if (!$recipientId) {
        return $out;
    }
    foreach (q_all('SELECT block_id, value, created_at FROM interactions WHERE letter_id = ? AND user_id = ? ORDER BY id', [$letterId, $recipientId]) as $r) {
        $out[$r['block_id']] = ['value' => $r['value'], 'at' => iso($r['created_at'])];
    }
    return $out;
}

function letter_replies(int $letterId): array
{
    return q_all(
        'SELECT r.id, r.message, r.created_at, r.read_at, r.user_id, u.name, u.role, u.avatar, u.color
         FROM replies r JOIN users u ON u.id = r.user_id WHERE r.letter_id = ? ORDER BY r.id',
        [$letterId]
    );
}

function reply_payload(array $r, array $viewer): array
{
    return [
        'id' => (int) $r['id'],
        'message' => $r['message'],
        'name' => first_name(name_for((int) $viewer['id'], ['id' => $r['user_id'], 'name' => $r['name']])),
        'mine' => (int) $r['user_id'] === (int) $viewer['id'],
        'avatar' => avatar_html($r),
        'when' => time_ago($r['created_at']),
    ];
}

/** Marca como lidas as respostas que a outra pessoa escreveu. */
function mark_replies_read(int $letterId, array $viewer): void
{
    q('UPDATE replies SET read_at = ? WHERE letter_id = ? AND user_id <> ? AND read_at IS NULL',
        [now(), $letterId, (int) $viewer['id']]);
}

/** Mensagens de voz (gravadas no navegador ou enviadas como arquivo). */
function upload_audio(array $file, int $letterId, int $userId): array
{
    $limitMb = (int) floor(upload_limit_bytes() / 1048576);
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        throw new RuntimeException(in_array($file['error'] ?? 0, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)
            ? 'O áudio passa de ' . $limitMb . ' MB, o máximo que a hospedagem aceita.'
            : 'Falha no envio do áudio.');
    }
    if ($file['size'] > upload_limit_bytes()) {
        throw new RuntimeException('O áudio passa de ' . $limitMb . ' MB, o máximo que a hospedagem aceita.');
    }
    check_storage_quota($userId, (int) $file['size']);
    $mime = function_exists('finfo_open') ? (string) finfo_file(finfo_open(FILEINFO_MIME_TYPE), $file['tmp_name']) : '';
    $types = [
        'audio/webm' => 'webm', 'video/webm' => 'webm', 'audio/ogg' => 'ogg', 'application/ogg' => 'ogg',
        'audio/mp4' => 'm4a', 'audio/x-m4a' => 'm4a', 'video/mp4' => 'm4a', 'audio/mpeg' => 'mp3', 'audio/mp3' => 'mp3', 'audio/x-mpeg' => 'mp3',
    ];
    if (!isset($types[$mime])) {
        throw new RuntimeException('Formato de áudio não suportado.');
    }
    $ext = $types[$mime];
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], UPLOAD_DIR . '/' . $name)) {
        throw new RuntimeException('Não consegui salvar o áudio.');
    }
    $served = ['webm' => 'audio/webm', 'ogg' => 'audio/ogg', 'm4a' => 'audio/mp4', 'mp3' => 'audio/mpeg'][$ext];
    db_insert('media', [
        'letter_id' => $letterId, 'filename' => $name, 'mime' => $served,
        'width' => 0, 'height' => 0, 'size' => (int) $file['size'], 'created_at' => now(),
        'user_id' => $userId, 'kind' => 'audio', 'in_library' => 1,
    ]);
    return ['src' => $name];
}

// ---------- Histórico de versões ----------

/** Guarda uma foto da carta no máximo a cada 10 minutos (mantém as 40 últimas). */
function save_version(int $letterId, string $title, string $contentJson, bool $force = false): void
{
    $last = q_one('SELECT id, created_at FROM letter_versions WHERE letter_id = ? ORDER BY id DESC LIMIT 1', [$letterId]);
    if (!$force && $last && strtotime($last['created_at']) > time() - 600) {
        db_update('letter_versions', (int) $last['id'], ['title' => $title, 'content' => $contentJson]);
        return;
    }
    db_insert('letter_versions', ['letter_id' => $letterId, 'title' => $title, 'content' => $contentJson, 'created_at' => now()]);
    $keep = q_all('SELECT id FROM letter_versions WHERE letter_id = ? ORDER BY id DESC LIMIT 40', [$letterId]);
    if (count($keep) === 40) {
        q('DELETE FROM letter_versions WHERE letter_id = ? AND id < ?', [$letterId, (int) end($keep)['id']]);
    }
}

function upload_image(array $file, int $letterId, int $userId, string $kind = 'image'): array
{
    $maxBytes = min((int) config('max_upload_mb', 8) * 1024 * 1024, upload_limit_bytes());
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'A imagem é maior do que a hospedagem permite.',
            UPLOAD_ERR_FORM_SIZE => 'A imagem é grande demais.',
            UPLOAD_ERR_NO_FILE => 'Nenhuma imagem enviada.',
        ];
        throw new RuntimeException($messages[$file['error'] ?? UPLOAD_ERR_NO_FILE] ?? 'Falha no envio da imagem.');
    }
    if ($file['size'] > $maxBytes) {
        throw new RuntimeException('A imagem passa de ' . (int) floor($maxBytes / 1048576) . ' MB.');
    }
    check_storage_quota($userId, (int) $file['size']);
    $info = @getimagesize($file['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($types[$info[2]])) {
        throw new RuntimeException('Formato não suportado. Use JPG, PNG, GIF ou WEBP.');
    }
    // Imagem pequena em bytes mas enorme em pixels esgotaria a memória do servidor
    if ($info[0] * $info[1] > 40000000 || max($info[0], $info[1]) > 12000) {
        throw new RuntimeException('Essa imagem tem resolução grande demais. Tente uma versão menor.');
    }
    if ($info[2] === IMAGETYPE_WEBP && !function_exists('imagecreatefromwebp')) {
        throw new RuntimeException('Esta hospedagem não aceita WEBP. Use JPG ou PNG.');
    }
    if (function_exists('imagecreatetruecolor') && $info[2] !== IMAGETYPE_GIF) {
        // GD precisa de ~5 bytes por pixel; garante memória antes de abrir
        $need = (int) ($info[0] * $info[1] * 5.5) + 32 * 1048576;
        $limit = upload_memory_limit();
        if ($limit > 0 && $need > $limit) {
            @ini_set('memory_limit', (string) min($need, 512 * 1048576));
            if (upload_memory_limit() > 0 && $need > upload_memory_limit()) {
                throw new RuntimeException('Essa foto é grande demais para a hospedagem processar. Tente uma versão menor.');
            }
        }
    }
    $ext = $types[$info[2]];
    $name = bin2hex(random_bytes(16)) . '.' . $ext;
    $dest = UPLOAD_DIR . '/' . $name;
    [$width, $height] = $info;

    if ($ext !== 'gif' && function_exists('imagecreatetruecolor')) {
        // Recodifica a imagem: reduz o tamanho e descarta qualquer conteúdo escondido no arquivo
        $src = match ($ext) {
            'jpg' => @imagecreatefromjpeg($file['tmp_name']),
            'png' => @imagecreatefrompng($file['tmp_name']),
            'webp' => @imagecreatefromwebp($file['tmp_name']),
        };
        if (!$src) {
            throw new RuntimeException('Não consegui ler essa imagem.');
        }
        if ($ext === 'jpg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($file['tmp_name']);
            $rotate = [3 => 180, 6 => -90, 8 => 90][(int) ($exif['Orientation'] ?? 1)] ?? 0;
            if ($rotate) {
                $rotated = imagerotate($src, $rotate, 0);
                imagedestroy($src);
                $src = $rotated;
            }
        }
        $width = imagesx($src);
        $height = imagesy($src);
        $max = $kind === 'sticker' ? 900 : 1800;
        $scale = min(1, $max / max($width, $height));
        $nw = max(1, (int) round($width * $scale));
        $nh = max(1, (int) round($height * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($ext !== 'jpg') {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $width, $height);
        imagedestroy($src);
        $ok = match ($ext) {
            'jpg' => imagejpeg($dst, $dest, 84),
            'png' => imagepng($dst, $dest, 7),
            'webp' => imagewebp($dst, $dest, 84),
        };
        imagedestroy($dst);
        if (!$ok) {
            throw new RuntimeException('Não consegui salvar a imagem.');
        }
        [$width, $height] = [$nw, $nh];
    } elseif (!move_uploaded_file($file['tmp_name'], $dest)) {
        throw new RuntimeException('Não consegui salvar a imagem.');
    }

    $mime = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp'][$ext];
    db_insert('media', [
        'letter_id' => $letterId, 'filename' => $name, 'mime' => $mime,
        'width' => $width, 'height' => $height, 'size' => (int) filesize($dest), 'created_at' => now(),
        'user_id' => $userId, 'kind' => $kind === 'sticker' ? 'sticker' : 'image', 'in_library' => 1,
    ]);
    return ['src' => $name, 'width' => $width, 'height' => $height, 'kind' => $kind];
}

function upload_memory_limit(): int
{
    $v = trim((string) ini_get('memory_limit'));
    if ($v === '' || $v === '-1') {
        return -1;
    }
    $n = (int) $v;
    return match (strtolower(substr($v, -1))) { 'g' => $n * 1073741824, 'm' => $n * 1048576, 'k' => $n * 1024, default => $n };
}

