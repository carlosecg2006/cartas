<?php
declare(strict_types=1);

// Entrega as imagens das cartas só para quem pode ver a carta
require __DIR__ . '/app/bootstrap.php';

$user = current_user();
$file = (string) ($_GET['f'] ?? '');
if (!$user || !preg_match(MEDIA_RE, $file)) {
    http_response_code(404);
    exit;
}

$media = q_one('SELECT * FROM media WHERE filename = ?', [$file]);
$letter = $media && $media['letter_id'] ? find_letter((int) $media['letter_id']) : null;
$allowed = $media && ($user['role'] === 'admin'
    || ($letter && can_view_letter($letter, $user) && !letter_locked($letter)));
$path = UPLOAD_DIR . '/' . $file;

if (!$allowed || !is_file($path)) {
    http_response_code(404);
    exit;
}

header_remove('Pragma');
header_remove('Expires');
$etag = '"' . $file . '"';
header('Content-Type: ' . $media['mime']);
header('Cache-Control: private, max-age=604800, immutable');
header('ETag: ' . $etag);
if (($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) {
    http_response_code(304);
    exit;
}
header('Content-Length: ' . filesize($path));
readfile($path);
