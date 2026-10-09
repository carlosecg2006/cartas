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
$isAdmin = $user['role'] === 'admin';

function need_admin(bool $isAdmin): void
{
    if (!$isAdmin) {
        json_error('Só o remetente pode fazer isso.', 403);
    }
}

function load_letter_for(array $user, $id): array
{
    $letter = find_letter((int) $id);
    if (!$letter || !can_view_letter($letter, $user)) {
        json_error('Carta não encontrada.', 404);
    }
    return $letter;
}

switch ($action) {
    // ---------- Remetente ----------
    case 'save':
        need_admin($isAdmin);
        $letter = load_letter_for($user, $in['id'] ?? 0);
        $content = sanitize_letter_content($in['content'] ?? []);
        $title = plain($in['title'] ?? '', 150);
        db_update('letters', (int) $letter['id'], [
            'title' => $title,
            'content' => json_encode($content, JSON_UNESCAPED_UNICODE),
            'updated_at' => now(),
        ]);
        prune_letter_media((int) $letter['id'], $content);
        json_out(['ok' => true, 'savedAt' => date('H:i')]);

    case 'send':
        need_admin($isAdmin);
        $letter = load_letter_for($user, $in['id'] ?? 0);
        $recipient = q_one("SELECT * FROM users WHERE id = ? AND role = 'friend'", [(int) ($in['recipient_id'] ?? 0)]);
        if (!$recipient) {
            json_error('Escolha para quem vai a carta.');
        }
        $openAt = null;
        if (!empty($in['open_at'])) {
            $ts = strtotime((string) $in['open_at']);
            if ($ts === false) {
                json_error('Data de abertura inválida.');
            }
            $openAt = date('Y-m-d H:i:s', $ts);
        }
        $data = [
            'recipient_id' => (int) $recipient['id'],
            'open_at' => $openAt,
            'status' => 'sent',
            'updated_at' => now(),
        ];
        $firstSend = $letter['status'] !== 'sent' || (int) $letter['recipient_id'] !== (int) $recipient['id'];
        if ($firstSend) {
            $data['sent_at'] = now();
            if ((int) $letter['recipient_id'] !== (int) $recipient['id']) {
                // Nova pessoa: zera a confirmação de leitura
                $data['first_opened_at'] = null;
                $data['last_opened_at'] = null;
                $data['open_count'] = 0;
            }
        }
        db_update('letters', (int) $letter['id'], $data);
        json_out(['ok' => true, 'recipient' => first_name($recipient['name']), 'firstSend' => $firstSend]);

    case 'upload':
        need_admin($isAdmin);
        $letter = load_letter_for($user, $in['id'] ?? 0);
        try {
            $media = upload_image($_FILES['image'] ?? [], (int) $letter['id']);
        } catch (RuntimeException $e) {
            json_error($e->getMessage());
        }
        json_out(['ok' => true] + $media);

    // ---------- Leitor ----------
    case 'opened':
        $letter = load_letter_for($user, $in['id'] ?? 0);
        if (!$isAdmin && !letter_locked($letter)) {
            q('UPDATE letters SET open_count = open_count + 1, last_opened_at = ?, first_opened_at = COALESCE(first_opened_at, ?) WHERE id = ?',
                [now(), now(), (int) $letter['id']]);
        }
        json_out(['ok' => true]);

    case 'react':
        $letter = load_letter_for($user, $in['id'] ?? 0);
        if ($isAdmin || letter_locked($letter)) {
            json_error('Só quem recebeu a carta pode reagir.', 403);
        }
        $emoji = (string) ($in['emoji'] ?? '');
        if (!in_array($emoji, REACTION_EMOJIS, true)) {
            json_error('Reação inválida.');
        }
        $existing = q_val('SELECT id FROM reactions WHERE letter_id = ? AND user_id = ? AND emoji = ?', [(int) $letter['id'], (int) $user['id'], $emoji]);
        if ($existing) {
            q('DELETE FROM reactions WHERE id = ?', [(int) $existing]);
        } else {
            db_insert('reactions', ['letter_id' => (int) $letter['id'], 'user_id' => (int) $user['id'], 'emoji' => $emoji, 'created_at' => now()]);
        }
        json_out(['ok' => true, 'reactions' => letter_reactions((int) $letter['id'])]);

    case 'reply':
        $letter = load_letter_for($user, $in['id'] ?? 0);
        if (letter_locked($letter) && !$isAdmin) {
            json_error('Essa carta ainda está lacrada.', 403);
        }
        if (!$letter['recipient_id']) {
            json_error('A carta ainda não tem destinatário.');
        }
        $message = trim(plain($in['message'] ?? '', 2000));
        if ($message === '') {
            json_error('Escreva alguma coisa.');
        }
        $id = db_insert('replies', ['letter_id' => (int) $letter['id'], 'user_id' => (int) $user['id'], 'message' => $message, 'created_at' => now()]);
        $reply = q_one('SELECT r.*, u.name, u.role, u.avatar, u.color FROM replies r JOIN users u ON u.id = r.user_id WHERE r.id = ?', [$id]);
        json_out(['ok' => true, 'reply' => reply_payload($reply, $user)]);

    case 'delete_reply':
        $reply = q_one('SELECT * FROM replies WHERE id = ?', [(int) ($in['reply_id'] ?? 0)]);
        if (!$reply || (!$isAdmin && (int) $reply['user_id'] !== (int) $user['id'])) {
            json_error('Resposta não encontrada.', 404);
        }
        q('DELETE FROM replies WHERE id = ?', [(int) $reply['id']]);
        json_out(['ok' => true]);

    case 'mailbox':
        $count = (int) q_val("SELECT COUNT(*) FROM letters WHERE recipient_id = ? AND status = 'sent'", [(int) $user['id']]);
        json_out(['ok' => true, 'count' => $count]);
}

json_error('Ação desconhecida.', 404);
