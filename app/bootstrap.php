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

// Erros vão para o log, nunca para a tela (poderiam mostrar caminhos ou senhas do banco)
if (!config('debug', false)) {
    ini_set('display_errors', '0');
}
ini_set('log_errors', '1');
set_exception_handler('fatal_page');

require APP_DIR . '/helpers.php';
require APP_DIR . '/db.php';
require APP_DIR . '/auth.php';
require APP_DIR . '/content.php';
require APP_DIR . '/people.php';
require APP_DIR . '/letters.php';
require APP_DIR . '/templates.php';
require APP_DIR . '/themes.php';
require APP_DIR . '/push.php';
require APP_DIR . '/invites.php';
require APP_DIR . '/layout.php';

// Cabeçalhos de segurança
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('X-Frame-Options: SAMEORIGIN');
header('Permissions-Policy: camera=(), geolocation=(), microphone=(self), payment=()');
header("Content-Security-Policy: default-src 'self'; "
    . "script-src 'self' https://cdnjs.cloudflare.com; "
    . "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    . "font-src 'self' https://fonts.gstatic.com; "
    . "img-src 'self' data: blob:; "
    . "media-src 'self' blob:; "
    . "frame-src https://www.youtube-nocookie.com https://www.youtube.com https://open.spotify.com; "
    . "connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'");

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
// Sessões guardadas na pasta do site e por 7 dias: ninguém perde a sessão no meio de uma carta longa
$sessDir = ROOT . '/storage/sessions';
if ((is_dir($sessDir) || @mkdir($sessDir, 0700)) && is_writable($sessDir)) {
    session_save_path($sessDir);
    ini_set('session.gc_probability', '1');
    ini_set('session.gc_divisor', '200');
}
ini_set('session.gc_maxlifetime', '604800');
ini_set('session.use_strict_mode', '1');
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
    force_https($https);
}

/**
 * Se o site já respondeu por HTTPS alguma vez, o certificado existe: a partir daí
 * todo acesso por http:// é redirecionado (e o navegador passa a lembrar disso).
 * Antes disso nada muda, para não derrubar um site sem certificado.
 */
function force_https(bool $https): void
{
    if (PHP_SAPI === 'cli-server' || in_array($_SERVER['HTTP_HOST'] ?? '', ['localhost', '127.0.0.1'], true)) {
        return;
    }
    if ($https) {
        header('Strict-Transport-Security: max-age=15552000');
        if (setting('https_ok') !== '1') {
            set_setting('https_ok', '1');
        }
        return;
    }
    if (setting('https_ok') === '1' && in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
        header('Location: https://' . ($_SERVER['HTTP_HOST'] ?? '') . ($_SERVER['REQUEST_URI'] ?? '/'), true, 301);
        exit;
    }
}

/** Erro inesperado (ou banco fora do ar): página amigável, sem detalhes técnicos. */
function fatal_page(Throwable $e): void
{
    error_log('[cartas] ' . get_class($e) . ': ' . $e->getMessage() . ' em ' . $e->getFile() . ':' . $e->getLine());
    $dbDown = $e instanceof PDOException && preg_match('/2002|2006|1040|1203|connect|gone away|Too many/i', $e->getMessage());
    if (!headers_sent()) {
        http_response_code($dbDown ? 503 : 500);
        header('Retry-After: 30');
    }
    $msg = $dbDown
        ? 'O banco de dados da hospedagem está ocupado agora. Espere alguns segundos e tente de novo: nada do que você escreveu se perdeu.'
        : 'O carteiro tropeçou. Tente de novo em instantes.';
    if (basename($_SERVER['SCRIPT_NAME'] ?? '') === 'api.php' || str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json')) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode(['ok' => false, 'error' => $msg, 'retry' => true], JSON_UNESCAPED_UNICODE);
        return;
    }
    echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<title>Um instante</title><style>body{font-family:system-ui,sans-serif;background:#f6f1ea;color:#1d1a16;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}'
        . 'main{max-width:420px;text-align:center}a{display:inline-block;margin-top:1rem;padding:.6rem 1.2rem;border-radius:10px;background:#1d1a16;color:#fbf7f0;text-decoration:none}'
        . '@media (prefers-color-scheme:dark){body{background:#171513;color:#f1ebe2}a{background:#f1ebe2;color:#171513}}</style></head>'
        . '<body><main><div style="font-size:3rem">✉️</div><h1>Um instante…</h1><p>' . htmlspecialchars($msg, ENT_QUOTES) . '</p>'
        . '<a href="">Tentar de novo</a></main></body></html>';
}

