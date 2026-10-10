<?php
declare(strict_types=1);

// Entrega imagens e áudios só para o dono ou para quem pode abrir uma carta que os usa
require __DIR__ . '/app/bootstrap.php';

$user = current_user();
$file = (string) ($_GET['f'] ?? '');
if (!$user || !preg_match(ANY_MEDIA_RE, $file)) {
    http_response_code(404);
    exit;
}

$media = q_one('SELECT * FROM media WHERE filename = ?', [$file]);
$allowed = $media && can_access_media($media, $user);
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
$size = filesize($path);
header('Accept-Ranges: bytes');
// Pedidos parciais (o Safari precisa disso para tocar áudio)
if (preg_match('/^bytes=(\d*)-(\d*)$/', (string) ($_SERVER['HTTP_RANGE'] ?? ''), $m)) {
    $start = $m[1] === '' ? max(0, $size - (int) $m[2]) : (int) $m[1];
    $end = $m[1] !== '' && $m[2] !== '' ? min((int) $m[2], $size - 1) : $size - 1;
    if ($start > $end || $start >= $size) {
        http_response_code(416);
        header('Content-Range: bytes */' . $size);
        exit;
    }
    http_response_code(206);
    header('Content-Range: bytes ' . $start . '-' . $end . '/' . $size);
    header('Content-Length: ' . ($end - $start + 1));
    $fp = fopen($path, 'rb');
    fseek($fp, $start);
    echo fread($fp, $end - $start + 1);
    fclose($fp);
    exit;
}
header('Content-Length: ' . $size);
readfile($path);
