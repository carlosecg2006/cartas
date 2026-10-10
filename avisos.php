<?php
declare(strict_types=1);

// Chamado pelo celular quando chega um aviso: diz o que há de novo para quem está logado.
require __DIR__ . '/app/bootstrap.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
$user = current_user();
if (!$user) {
    echo json_encode(['title' => 'Chegou carta nova', 'body' => 'Entre para ver.', 'url' => './login.php'], JSON_UNESCAPED_UNICODE);
    exit;
}
$uid = (int) $user['id'];

$letter = q_one("SELECT l.id, l.title, l.sender_id, l.open_at, s.name AS sender_name FROM letters l JOIN users s ON s.id = l.sender_id
    WHERE l.recipient_id = ? AND l.status = 'sent' AND l.first_opened_at IS NULL AND " . sql_delivered() . ' ORDER BY l.sent_at DESC LIMIT 1', [$uid]);
$reply = q_one('SELECT p.letter_id, p.message, p.created_at, u.id AS uid, u.name FROM replies p JOIN letters l ON l.id = p.letter_id JOIN users u ON u.id = p.user_id
    WHERE (l.sender_id = ? OR l.recipient_id = ?) AND p.user_id <> ? AND p.read_at IS NULL ORDER BY p.id DESC LIMIT 1', [$uid, $uid, $uid]);

$out = ['title' => 'Novidade nas suas cartas', 'body' => 'Toque para ver.', 'url' => './index.php'];
if ($reply && (!$letter || $reply['created_at'] >= q_val('SELECT sent_at FROM letters WHERE id = ?', [(int) $letter['id']]))) {
    $name = first_name(name_for($uid, ['id' => $reply['uid'], 'name' => $reply['name']]));
    $out = ['title' => $name . ' respondeu', 'body' => mb_strimwidth($reply['message'], 0, 120, '…'), 'url' => './carta.php?id=' . (int) $reply['letter_id'] . '#respostas'];
} elseif ($letter) {
    $name = first_name(name_for($uid, ['id' => $letter['sender_id'], 'name' => $letter['sender_name']]));
    $locked = $letter['open_at'] && strtotime($letter['open_at']) > time();
    $out = [
        'title' => 'Carta nova de ' . $name,
        'body' => $locked ? 'Ela está lacrada até ' . fmt_date($letter['open_at']) . '.' : ($letter['title'] ?: 'Toque para abrir o envelope.'),
        'url' => './carta.php?id=' . (int) $letter['id'],
    ];
}
echo json_encode($out, JSON_UNESCAPED_UNICODE);
