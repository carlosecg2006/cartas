<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = current_user();
if (!$user) {
    json_error('Sua sessão expirou. Entre de novo.', 401);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido.', 405);
}
if (!csrf_valid()) {
    json_error('Sessão expirada. Recarregue a página.', 419);
}

$action = (string) ($_GET['action'] ?? '');
$in = str_starts_with((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'multipart/') ? $_POST : json_input();
$uid = (int) $user['id'];

/** Carta que o usuário pode ver; com $role exige ser quem escreveu ('sender') ou quem recebeu ('recipient'). */
function load_letter_for(array $user, $id, ?string $role = null): array
{
    $letter = find_letter((int) $id);
    $actual = $letter ? letter_role($letter, $user) : null;
    if (!$letter || $actual === null) {
        json_error('Carta não encontrada.', 404);
    }
    if ($role !== null && $actual !== $role) {
        json_error($role === 'sender' ? 'Só quem escreveu pode fazer isso.' : 'Só quem recebeu pode fazer isso.', 403);
    }
    return $letter;
}

switch ($action) {
    // ---------- Quem escreve ----------
    case 'save':
        $letter = load_letter_for($user, $in['id'] ?? 0, 'sender');
        $content = sanitize_letter_content($in['content'] ?? []);
        // Só arquivos da própria biblioteca podem entrar na carta
        $own = array_flip(array_column(q_all('SELECT filename FROM media WHERE user_id = ?', [$uid]), 'filename'));
        foreach (content_media($content) as $file) {
            if (!isset($own[$file]) && !q_val('SELECT 1 FROM letter_media WHERE letter_id = ? AND filename = ?', [(int) $letter['id'], $file])) {
                json_error('A carta usa um arquivo que não é seu.', 403);
            }
        }
        $title = plain($in['title'] ?? '', 150);
        $json = json_encode($content, JSON_UNESCAPED_UNICODE);
        db_update('letters', (int) $letter['id'], [
            'title' => $title,
            'content' => $json,
            'updated_at' => now(),
        ]);
        sync_letter_media((int) $letter['id'], $content);
        save_version((int) $letter['id'], $title, $json, !empty($in['checkpoint']));
        json_out(['ok' => true, 'savedAt' => date('H:i')]);

    case 'send':
        $letter = load_letter_for($user, $in['id'] ?? 0, 'sender');
        $recipientId = (int) ($in['recipient_id'] ?? 0);
        $recipient = $recipientId && is_contact($uid, $recipientId) ? find_user($recipientId) : null;
        if (!$recipient) {
            json_error('Escolha alguém da sua lista.');
        }
        $openAt = null;
        if (!empty($in['open_at'])) {
            $ts = strtotime((string) $in['open_at']);
            if ($ts === false) {
                json_error('Data de abertura inválida.');
            }
            $openAt = date('Y-m-d H:i:s', $ts);
        }
        // Correio lento: quantas horas a carta leva para chegar
        $delay = max(0, min(24 * 7, (int) ($in['delay_hours'] ?? 0)));
        $data = [
            'recipient_id' => (int) $recipient['id'],
            'open_at' => $openAt,
            'status' => 'sent',
            'updated_at' => now(),
        ];
        $firstSend = $letter['status'] !== 'sent' || (int) $letter['recipient_id'] !== (int) $recipient['id'];
        if ($firstSend) {
            $data['sent_at'] = now();
            $data['delivered_at'] = $delay ? date('Y-m-d H:i:s', time() + $delay * 3600) : null;
            if ((int) $letter['recipient_id'] !== (int) $recipient['id']) {
                $data['first_opened_at'] = null;
                $data['last_opened_at'] = null;
                $data['open_count'] = 0;
            }
        }
        db_update('letters', (int) $letter['id'], $data);
        // Quem recebe passa a ter quem escreveu na lista, para poder responder
        add_contact((int) $recipient['id'], $uid);
        json_out([
            'ok' => true,
            'recipient' => first_name(name_for($uid, $recipient)),
            'firstSend' => $firstSend,
            'arrives' => !empty($data['delivered_at']) ? fmt_date($data['delivered_at']) : null,
        ]);

    case 'upload':
        $letter = load_letter_for($user, $in['id'] ?? 0, 'sender');
        try {
            $media = isset($_FILES['audio'])
                ? upload_audio($_FILES['audio'], (int) $letter['id'], $uid)
                : upload_image($_FILES['image'] ?? [], (int) $letter['id'], $uid, ($in['kind'] ?? '') === 'sticker' ? 'sticker' : 'image');
        } catch (RuntimeException $e) {
            json_error($e->getMessage());
        }
        json_out(['ok' => true] + $media);

    case 'library':
        $rows = q_all("SELECT filename, kind, width, height, created_at FROM media WHERE user_id = ? AND in_library = 1 AND kind <> 'audio' ORDER BY id DESC LIMIT 300", [$uid]);
        json_out(['ok' => true, 'items' => array_map(fn($m) => [
            'src' => $m['filename'], 'kind' => $m['kind'], 'w' => (int) $m['width'], 'h' => (int) $m['height'],
        ], $rows)]);

    case 'library_remove':
        $file = (string) ($in['src'] ?? '');
        q('UPDATE media SET in_library = 0 WHERE filename = ? AND user_id = ?', [$file, $uid]);
        // Se nenhuma carta usa o arquivo, ele pode ir embora de vez
        if (!q_val('SELECT 1 FROM letter_media WHERE filename = ?', [$file])
            && !q_val('SELECT 1 FROM letter_versions v JOIN letters l ON l.id = v.letter_id WHERE l.sender_id = ? AND v.content LIKE ?', [$uid, '%' . $file . '%'])) {
            $m = q_one('SELECT id FROM media WHERE filename = ? AND user_id = ?', [$file, $uid]);
            if ($m) {
                @unlink(UPLOAD_DIR . '/' . $file);
                q('DELETE FROM media WHERE id = ?', [(int) $m['id']]);
            }
        }
        json_out(['ok' => true]);

    case 'versions':
        $letter = load_letter_for($user, $in['id'] ?? 0, 'sender');
        $rows = q_all('SELECT id, title, created_at FROM letter_versions WHERE letter_id = ? ORDER BY id DESC', [(int) $letter['id']]);
        json_out(['ok' => true, 'versions' => array_map(fn($v) => [
            'id' => (int) $v['id'],
            'title' => $v['title'],
            'when' => fmt_date($v['created_at']),
            'ago' => time_ago($v['created_at']),
        ], $rows)]);

    case 'version':
        $letter = load_letter_for($user, $in['id'] ?? 0, 'sender');
        $v = q_one('SELECT * FROM letter_versions WHERE id = ? AND letter_id = ?', [(int) ($in['version_id'] ?? 0), (int) $letter['id']]);
        if (!$v) {
            json_error('Versão não encontrada.', 404);
        }
        json_out(['ok' => true, 'title' => $v['title'], 'content' => sanitize_letter_content(json_decode($v['content'], true))]);

    // ---------- Quem recebe ----------
    case 'opened':
        $letter = load_letter_for($user, $in['id'] ?? 0);
        if (letter_role($letter, $user) === 'recipient' && letter_seal($letter, $user) === null) {
            q('UPDATE letters SET open_count = open_count + 1, last_opened_at = ?, first_opened_at = COALESCE(first_opened_at, ?) WHERE id = ?',
                [now(), now(), (int) $letter['id']]);
        }
        json_out(['ok' => true]);

    case 'react':
        $letter = load_letter_for($user, $in['id'] ?? 0, 'recipient');
        if (letter_seal($letter, $user) !== null) {
            json_error('Essa carta ainda está fechada.', 403);
        }
        $emoji = (string) ($in['emoji'] ?? '');
        if (!in_array($emoji, REACTION_EMOJIS, true)) {
            json_error('Reação inválida.');
        }
        $existing = q_val('SELECT id FROM reactions WHERE letter_id = ? AND user_id = ? AND emoji = ?', [(int) $letter['id'], $uid, $emoji]);
        if ($existing) {
            q('DELETE FROM reactions WHERE id = ?', [(int) $existing]);
        } else {
            db_insert('reactions', ['letter_id' => (int) $letter['id'], 'user_id' => $uid, 'emoji' => $emoji, 'created_at' => now()]);
        }
        json_out(['ok' => true, 'reactions' => letter_reactions((int) $letter['id'])]);

    case 'reply':
        $letter = load_letter_for($user, $in['id'] ?? 0);
        if (letter_seal($letter, $user) !== null) {
            json_error('Essa carta ainda está fechada.', 403);
        }
        if (!$letter['recipient_id'] || $letter['status'] !== 'sent') {
            json_error('A carta ainda não foi enviada.');
        }
        $message = trim(plain($in['message'] ?? '', 2000));
        if ($message === '') {
            json_error('Escreva alguma coisa.');
        }
        $id = db_insert('replies', ['letter_id' => (int) $letter['id'], 'user_id' => $uid, 'message' => $message, 'created_at' => now()]);
        $reply = q_one('SELECT r.*, u.name, u.role, u.avatar, u.color FROM replies r JOIN users u ON u.id = r.user_id WHERE r.id = ?', [$id]);
        json_out(['ok' => true, 'reply' => reply_payload($reply, $user)]);

    case 'delete_reply':
        $reply = q_one('SELECT * FROM replies WHERE id = ?', [(int) ($in['reply_id'] ?? 0)]);
        if (!$reply || (int) $reply['user_id'] !== $uid) {
            json_error('Resposta não encontrada.', 404);
        }
        q('DELETE FROM replies WHERE id = ?', [(int) $reply['id']]);
        json_out(['ok' => true]);

    case 'mailbox':
        $count = (int) q_val("SELECT COUNT(*) FROM letters l WHERE l.recipient_id = ? AND l.status = 'sent' AND " . sql_delivered(), [$uid]);
        json_out(['ok' => true, 'count' => $count]);
}

json_error('Ação desconhecida.', 404);
