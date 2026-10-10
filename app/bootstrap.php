<?php
declare(strict_types=1);

define('ROOT', dirname(__DIR__));
define('APP_DIR', __DIR__);
define('UPLOAD_DIR', ROOT . '/storage/uploads');

$configFile = ROOT . '/config.php';
$GLOBALS['config'] = is_file($configFile) ? require $configFile : null;

function config(string $key, $default = null)
{
    $value = $GLOBALS['config'];
    foreach (explode('.', $key) as $part) {
        if (!is_array($value) || !array_key_exists($part, $value)) {
            return $default;
        }
        $value = $value[$part];
    }
    return $value;
}

date_default_timezone_set((string) config('timezone', 'America/Sao_Paulo'));
mb_internal_encoding('UTF-8');

require APP_DIR . '/helpers.php';
require APP_DIR . '/db.php';
require APP_DIR . '/auth.php';
require APP_DIR . '/content.php';
require APP_DIR . '/people.php';
require APP_DIR . '/letters.php';
require APP_DIR . '/templates.php';
require APP_DIR . '/layout.php';

// Cabeçalhos de segurança
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');
header("Content-Security-Policy: default-src 'self'; "
    . "script-src 'self' https://cdnjs.cloudflare.com; "
    . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    . "font-src 'self' https://fonts.gstatic.com; "
    . "img-src 'self' data: blob:; "
    . "media-src 'self' blob:; "
    . "frame-src https://www.youtube-nocookie.com https://open.spotify.com; "
    . "connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'");

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('cartas_sess');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $https,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();
define('IS_HTTPS', $https);

// Sem configuração ou sem banco instalado → instalador
$script = basename($_SERVER['SCRIPT_NAME'] ?? '');
if ($script !== 'install.php' && ($GLOBALS['config'] === null || !db_ready())) {
    redirect('install.php');
}
if ($GLOBALS['config'] !== null && $script !== 'install.php') {
    ensure_schema();
}
