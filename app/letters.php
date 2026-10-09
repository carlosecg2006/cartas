<?php
declare(strict_types=1);

function find_letter(int $id): ?array
{
    $letter = q_one(
        'SELECT l.*, u.name AS recipient_name, u.avatar AS recipient_avatar, u.color AS recipient_color
         FROM letters l LEFT JOIN users u ON u.id = l.recipient_id WHERE l.id = ?',
        [$id]
    );
    if ($letter) {
        $letter['content'] = json_decode((string) $letter['content'], true) ?: default_letter_content();
    }
    return $letter;
}

/** Admin vê tudo; amigo vê apenas as cartas enviadas para ele. */
function can_view_letter(array $letter, array $user): bool
{
    if ($user['role'] === 'admin') {
        return true;
    }
    return (int) $letter['recipient_id'] === (int) $user['id'] && $letter['status'] === 'sent';
}

function letter_locked(array $letter): bool
{
    return !empty($letter['open_at']) && strtotime($letter['open_at']) > time();
}

function create_letter(?int $recipientId, array $admin): int
{
    $recipient = $recipientId ? q_one("SELECT * FROM users WHERE id = ? AND role = 'friend'", [$recipientId]) : null;
    $content = default_letter_content($recipient['name'] ?? '', $admin['name']);
    return db_insert('letters', [
        'recipient_id' => $recipient ? (int) $recipient['id'] : null,
        'title' => $recipient ? 'Carta para ' . first_name($recipient['name']) : 'Nova carta',
        'content' => json_encode($content, JSON_UNESCAPED_UNICODE),
        'status' => 'draft',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
}

function duplicate_letter(array $letter): int
{
    $content = $letter['content'];
    $id = db_insert('letters', [
        'recipient_id' => null,
        'title' => mb_substr('Cópia de ' . $letter['title'], 0, 150),
        'content' => '{}',
        'status' => 'draft',
        'created_at' => now(),
        'updated_at' => now(),
    ]);
    // Cada carta tem suas próprias cópias das imagens (a privacidade é por carta)
    $map = [];
    foreach (content_media($content) as $file) {
        $media = q_one('SELECT * FROM media WHERE filename = ?', [$file]);
        if (!$media || !is_file(UPLOAD_DIR . '/' . $file)) {
            continue;
        }
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $new = bin2hex(random_bytes(16)) . '.' . $ext;
        if (copy(UPLOAD_DIR . '/' . $file, UPLOAD_DIR . '/' . $new)) {
            db_insert('media', [
                'letter_id' => $id, 'filename' => $new, 'mime' => $media['mime'],
                'width' => $media['width'], 'height' => $media['height'], 'size' => $media['size'], 'created_at' => now(),
            ]);
            $map[$file] = $new;
        }
    }
    foreach ($content['blocks'] as &$b) {
        if (($b['type'] ?? '') === 'image' && isset($map[$b['src'] ?? ''])) {
            $b['src'] = $map[$b['src']];
        }
    }
    unset($b);
    foreach ($content['stickers'] as &$s) {
        if (($s['kind'] ?? '') === 'image' && isset($map[$s['src'] ?? ''])) {
            $s['src'] = $map[$s['src']];
        }
    }
    unset($s);
    db_update('letters', $id, ['content' => json_encode($content, JSON_UNESCAPED_UNICODE)]);
    return $id;
}

function delete_media_files(array $letterIds): void
{
    if (!$letterIds) {
        return;
    }
    $marks = implode(',', array_fill(0, count($letterIds), '?'));
    foreach (q_all("SELECT filename FROM media WHERE letter_id IN ($marks)", array_values($letterIds)) as $m) {
        @unlink(UPLOAD_DIR . '/' . $m['filename']);
    }
}

function delete_letter(int $id): void
{
    delete_media_files([$id]);
    q('DELETE FROM letters WHERE id = ?', [$id]);
}

/** Remove arquivos enviados que a carta não usa mais. */
function prune_letter_media(int $letterId, array $content): void
{
    $used = array_flip(content_media($content));
    $limit = date('Y-m-d H:i:s', time() - 3600); // dá uma hora de folga para o desfazer do editor
    foreach (q_all('SELECT id, filename, created_at FROM media WHERE letter_id = ?', [$letterId]) as $m) {
        if (!isset($used[$m['filename']]) && $m['created_at'] < $limit) {
            @unlink(UPLOAD_DIR . '/' . $m['filename']);
            q('DELETE FROM media WHERE id = ?', [(int) $m['id']]);
        }
    }
}

function letter_reactions(int $letterId): array
{
    return array_column(q_all('SELECT emoji FROM reactions WHERE letter_id = ? ORDER BY id', [$letterId]), 'emoji');
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
        'name' => first_name($r['name']),
        'mine' => (int) $r['user_id'] === (int) $viewer['id'],
        'fromAdmin' => $r['role'] === 'admin',
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

function upload_image(array $file, int $letterId): array
{
    $maxBytes = (int) config('max_upload_mb', 8) * 1024 * 1024;
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        $messages = [
            UPLOAD_ERR_INI_SIZE => 'A imagem é maior do que a hospedagem permite.',
            UPLOAD_ERR_FORM_SIZE => 'A imagem é grande demais.',
            UPLOAD_ERR_NO_FILE => 'Nenhuma imagem enviada.',
        ];
        throw new RuntimeException($messages[$file['error'] ?? UPLOAD_ERR_NO_FILE] ?? 'Falha no envio da imagem.');
    }
    if ($file['size'] > $maxBytes) {
        throw new RuntimeException('A imagem passa de ' . config('max_upload_mb', 8) . ' MB.');
    }
    $info = @getimagesize($file['tmp_name']);
    $types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif', IMAGETYPE_WEBP => 'webp'];
    if (!$info || !isset($types[$info[2]])) {
        throw new RuntimeException('Formato não suportado. Use JPG, PNG, GIF ou WEBP.');
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
                $src = imagerotate($src, $rotate, 0);
            }
        }
        $width = imagesx($src);
        $height = imagesy($src);
        $max = 1600;
        $scale = min(1, $max / max($width, $height));
        $nw = max(1, (int) round($width * $scale));
        $nh = max(1, (int) round($height * $scale));
        $dst = imagecreatetruecolor($nw, $nh);
        if ($ext !== 'jpg') {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $width, $height);
        $ok = match ($ext) {
            'jpg' => imagejpeg($dst, $dest, 84),
            'png' => imagepng($dst, $dest, 7),
            'webp' => imagewebp($dst, $dest, 84),
        };
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
    ]);
    return ['src' => $name, 'width' => $width, 'height' => $height];
}
