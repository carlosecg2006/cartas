<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

// Envio maior do que a hospedagem aceita: o PHP descarta tudo e chegaria aqui "vazio"
if (empty($_POST) && empty($_FILES) && (int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 0
    && !str_starts_with((string) ($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
    json_error('O arquivo é maior do que a hospedagem aceita (máximo ' . (int) floor(upload_limit_bytes() / 1048576) . ' MB).', 413);
}
$user = current_user();
if (!$user) {
    json_error('Sua sessão terminou. Entre de novo em outra aba e volte aqui: o que você escreveu continua nesta página.', 401);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_error('Método não permitido.', 405);
}
if (!csrf_valid()) {
    // devolve um token novo para a página continuar funcionando sem recarregar
    json_out(['ok' => false, 'error' => 'Sessão renovada. Tente de novo.', 'csrf' => csrf_token()], 419);
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
        // Só arquivos da própria biblioteca (ou que a carta já usava) podem entrar.
        // Arquivo apagado ou de outra pessoa é tirado da carta em vez de travar o salvamento.
        $files = content_media($content);
        if ($files) {
            $ph = implode(',', array_fill(0, count($files), '?'));
            $ok = array_column(q_all("SELECT filename FROM media WHERE user_id = ? AND filename IN ($ph)", array_merge([$uid], $files)), 'filename');
            $ok = array_merge($ok, array_column(q_all("SELECT filename FROM letter_media WHERE letter_id = ? AND filename IN ($ph)", array_merge([(int) $letter['id']], $files)), 'filename'));
            $bad = array_diff($files, $ok);
            if ($bad) {
                $content = strip_media($content, $bad);
            }
        }
        $title = plain($in['title'] ?? '', 150);
        $json = json_encode($content, JSON_UNESCAPED_UNICODE);
        if (strlen($json) > 1500000) {
            json_error('A carta ficou grande demais (muitos desenhos ou textos enormes). Divida em duas cartas.', 413);
        }
        if ($json === json_encode($letter['content'], JSON_UNESCAPED_UNICODE) && $title === $letter['title'] && empty($in['checkpoint'])) {
            json_out(['ok' => true, 'savedAt' => date('H:i'), 'unchanged' => true]);
        }
        db_update('letters', (int) $letter['id'], [
            'title' => $title,
            'content' => $json,
            'updated_at' => now(),
        ] + letter_derived($title, $content));
        sync_letter_media((int) $letter['id'], $content);
        save_version((int) $letter['id'], $title, $json, !empty($in['checkpoint']));
        json_out(['ok' => true, 'savedAt' => date('H:i'), 'stripped' => !empty($bad)]);

    case 'send':
        $letter = load_letter_for($user, $in['id'] ?? 0, 'sender');
        $recipientId = (int) ($in['recipient_id'] ?? 0);
        $recipient = $recipientId && is_contact($uid, $recipientId) ? find_user($recipientId) : null;
        if (!$recipient) {
            json_error('Escolha alguém da sua lista.');
        }
        if (q_val('SELECT blocked FROM contacts WHERE owner_id = ? AND contact_id = ?', [(int) $recipient['id'], $uid])) {
            json_error('Não foi possível enviar para essa pessoa.', 403);
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
            $data['delivered_at'] = null;
            if ((int) $letter['recipient_id'] !== (int) $recipient['id']) {
                // A conversa, as reações e as favoritas eram de outra pessoa: não podem ir junto
                q('DELETE FROM replies WHERE letter_id = ?', [(int) $letter['id']]);
                q('DELETE FROM reactions WHERE letter_id = ?', [(int) $letter['id']]);
                q('DELETE FROM interactions WHERE letter_id = ?', [(int) $letter['id']]);
                q('DELETE FROM favorites WHERE letter_id = ? AND user_id <> ?', [(int) $letter['id'], $uid]);
                $data['first_opened_at'] = null;
                $data['last_opened_at'] = null;
                $data['open_count'] = 0;
            }
        }
        db_update('letters', (int) $letter['id'], $data);
        // Quem recebe passa a ter quem escreveu na lista, para poder responder
        add_contact((int) $recipient['id'], $uid);
        $notify = $firstSend ? (int) $recipient['id'] : 0;
        json_out_then([
            'ok' => true,
            'recipient' => first_name(name_for($uid, $recipient)),
            'firstSend' => $firstSend,
        ], function () use ($notify) {
            if ($notify) {
                notify_quietly($notify);
            }
        });

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
        if (!preg_match(ANY_MEDIA_RE, $file)) {
            json_error('Arquivo inválido.');
        }
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

    case 'interact':
        // Quem recebe responde a uma pergunta ou usa um vale da carta
        $letter = load_letter_for($user, $in['id'] ?? 0, 'recipient');
        if (letter_seal($letter, $user) !== null) {
            json_error('Essa carta ainda está fechada.', 403);
        }
        $blockId = (string) ($in['block'] ?? '');
        $value = (string) ($in['value'] ?? '');
        $block = null;
        foreach ($letter['content']['blocks'] ?? [] as $b) {
            if (($b['id'] ?? '') === $blockId) {
                $block = $b;
                break;
            }
        }
        $valid = $block && (
            ($block['type'] === 'quiz' && preg_match('/^[0-3]$/', $value) && (int) $value < count($block['options'] ?? []))
            || ($block['type'] === 'coupon' && $value === 'used')
        );
        if (!$valid) {
            json_error('Resposta inválida.');
        }
        q('DELETE FROM interactions WHERE letter_id = ? AND block_id = ? AND user_id = ?', [(int) $letter['id'], $blockId, $uid]);
        try {
            db_insert('interactions', ['letter_id' => (int) $letter['id'], 'block_id' => $blockId, 'user_id' => $uid, 'value' => $value, 'created_at' => now()]);
        } catch (PDOException $e) {
            // dois toques ao mesmo tempo (duas abas): a outra resposta já foi guardada
        }
        json_out_then(
            ['ok' => true, 'interactions' => letter_interactions((int) $letter['id'], $uid) ?: new stdClass()],
            fn() => notify_quietly((int) $letter['sender_id'])
        );

    case 'reply':
        $letter = load_letter_for($user, $in['id'] ?? 0);
        if (letter_seal($letter, $user) !== null) {
            json_error('Essa carta ainda está fechada.', 403);
        }
        if (!$letter['recipient_id'] || $letter['status'] !== 'sent') {
            json_error('A carta ainda não foi enviada.');
        }
        if (letter_locked($letter) || letter_in_transit($letter)) {
            json_error('Dá para conversar depois que a carta puder ser aberta.', 403);
        }
        $message = trim(plain($in['message'] ?? '', 2000));
        if ($message === '') {
            json_error('Escreva alguma coisa.');
        }
        $id = db_insert('replies', ['letter_id' => (int) $letter['id'], 'user_id' => $uid, 'message' => $message, 'created_at' => now()]);
        $reply = q_one('SELECT r.*, u.name, u.role, u.avatar, u.color FROM replies r JOIN users u ON u.id = r.user_id WHERE r.id = ?', [$id]);
        $other = (int) ($uid === (int) $letter['sender_id'] ? $letter['recipient_id'] : $letter['sender_id']);
        json_out_then(['ok' => true, 'reply' => reply_payload($reply, $user)], fn() => notify_quietly($other));

    case 'delete_reply':
        $reply = q_one('SELECT * FROM replies WHERE id = ?', [(int) ($in['reply_id'] ?? 0)]);
        if (!$reply || (int) $reply['user_id'] !== $uid) {
            json_error('Resposta não encontrada.', 404);
        }
        q('DELETE FROM replies WHERE id = ?', [(int) $reply['id']]);
        json_out(['ok' => true]);

    case 'favorite':
        $letter = load_letter_for($user, $in['id'] ?? 0);
        $on = (bool) q_val('SELECT 1 FROM favorites WHERE user_id = ? AND letter_id = ?', [$uid, (int) $letter['id']]);
        if ($on) {
            q('DELETE FROM favorites WHERE user_id = ? AND letter_id = ?', [$uid, (int) $letter['id']]);
        } else {
            db_insert('favorites', ['user_id' => $uid, 'letter_id' => (int) $letter['id'], 'created_at' => now()]);
        }
        json_out(['ok' => true, 'favorite' => !$on]);

    // ---------- Avisos no celular ----------
    case 'push_key':
        $keys = vapid_keys();
        if (!$keys) {
            json_error('Esta hospedagem não tem suporte aos avisos (openssl).');
        }
        json_out(['ok' => true, 'key' => $keys['public']]);

    case 'push_subscribe':
        $endpoint = (string) ($in['endpoint'] ?? '');
        $host = strtolower((string) parse_url($endpoint, PHP_URL_HOST));
        $known = '/(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)$/';
        if (!preg_match('#^https://\S{10,1000}$#', $endpoint) || !preg_match($known, $host)) {
            json_error('Endereço de aviso inválido.');
        }
        $hash = hash('sha256', $endpoint);
        q('DELETE FROM push_subscriptions WHERE endpoint_hash = ?', [$hash]);
        try {
            db_insert('push_subscriptions', ['user_id' => $uid, 'endpoint_hash' => $hash, 'endpoint' => $endpoint, 'created_at' => now()]);
        } catch (PDOException $e) {
            // o mesmo aparelho se cadastrou duas vezes ao mesmo tempo
        }
        // no máximo 5 aparelhos por pessoa (os mais recentes)
        $keep = array_column(q_all('SELECT id FROM push_subscriptions WHERE user_id = ? ORDER BY id DESC LIMIT 5', [$uid]), 'id');
        if (count($keep) === 5) {
            q('DELETE FROM push_subscriptions WHERE user_id = ? AND id < ?', [$uid, (int) min($keep)]);
        }
        json_out(['ok' => true]);

    case 'push_unsubscribe':
        $endpoint = (string) ($in['endpoint'] ?? '');
        q('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint_hash = ?', [$uid, hash('sha256', $endpoint)]);
        json_out(['ok' => true]);

    case 'push_test':
        if (($_SESSION['push_test_at'] ?? 0) > time() - 15) {
            json_error('Espere alguns segundos antes de testar de novo.', 429);
        }
        $_SESSION['push_test_at'] = time();
        session_write_close();
        [$sent, $error] = notify_user($uid);
        json_out(['ok' => true, 'sent' => $sent, 'error' => $error]);

    case 'mailbox':
        $row = q_one("SELECT COUNT(*) AS n, MAX(l.id) AS latest FROM letters l WHERE l.recipient_id = ? AND l.status = 'sent' AND " . sql_delivered(), [$uid]);
        json_out(['ok' => true, 'count' => (int) $row['n'], 'latest' => (int) $row['latest']]);
}

json_error('Ação desconhecida.', 404);
