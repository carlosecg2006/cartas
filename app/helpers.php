<?php
declare(strict_types=1);

function e(?string $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function now(): string
{
    return date('Y-m-d H:i:s');
}

function json_out($data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function json_error(string $message, int $status = 400): never
{
    json_out(['ok' => false, 'error' => $message], $status);
}

function json_input(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '[]', true);
    return is_array($data) ? $data : [];
}

/** JSON seguro para embutir dentro de <script type="application/json">. */
function json_embed($data): string
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
}

function flash(string $message, string $type = 'ok'): void
{
    $_SESSION['flash'][] = ['message' => $message, 'type' => $type];
}

function take_flashes(): array
{
    $flashes = $_SESSION['flash'] ?? [];
    unset($_SESSION['flash']);
    return $flashes;
}

function app_name(): string
{
    return (string) config('app_name', 'Minhas Cartas');
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'), 0, 45);
}

function asset(string $path): string
{
    $file = ROOT . '/' . $path;
    $version = is_file($file) ? filemtime($file) : 0;
    return e($path . '?v=' . $version);
}

const MESES = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function fmt_date(?string $datetime, bool $withTime = true): string
{
    if (!$datetime) {
        return '';
    }
    $ts = strtotime($datetime);
    $text = date('j', $ts) . ' de ' . MESES[(int) date('n', $ts) - 1] . ' de ' . date('Y', $ts);
    return $withTime ? $text . ', ' . date('H:i', $ts) : $text;
}

function fmt_date_long(?string $datetime): string
{
    if (!$datetime) {
        return '';
    }
    $ts = strtotime($datetime);
    return date('j', $ts) . ' de ' . MESES_LONGOS[(int) date('n', $ts) - 1] . ' de ' . date('Y', $ts);
}

function time_ago(?string $datetime): string
{
    if (!$datetime) {
        return 'nunca';
    }
    $diff = time() - strtotime($datetime);
    if ($diff < 60) {
        return 'agora mesmo';
    }
    if ($diff < 3600) {
        return 'há ' . intdiv($diff, 60) . ' min';
    }
    if ($diff < 86400) {
        $h = intdiv($diff, 3600);
        return 'há ' . $h . ($h === 1 ? ' hora' : ' horas');
    }
    if ($diff < 86400 * 30) {
        $d = intdiv($diff, 86400);
        return 'há ' . $d . ($d === 1 ? ' dia' : ' dias');
    }
    return 'em ' . fmt_date($datetime, false);
}

/** Data/hora local → ISO 8601 com fuso, para o JavaScript. */
function iso(?string $datetime): ?string
{
    return $datetime ? date('c', strtotime($datetime)) : null;
}

function first_name(string $name): string
{
    $parts = preg_split('/\s+/', trim($name));
    return $parts[0] ?? $name;
}

function avatar_html(array $user, string $size = 'md'): string
{
    $color = preg_match('/^#[0-9a-fA-F]{6}$/', (string) ($user['color'] ?? '')) ? $user['color'] : '#e8a0a0';
    $label = trim((string) ($user['avatar'] ?? ''));
    if ($label === '') {
        $label = mb_strtoupper(mb_substr(first_name((string) $user['name']), 0, 1));
    }
    return '<span class="avatar avatar-' . e($size) . '" style="--avatar:' . e($color) . '">' . e($label) . '</span>';
}

function random_password(int $length = 10): string
{
    $alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
    $out = '';
    for ($i = 0; $i < $length; $i++) {
        $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    return $out;
}

function slugify_username(string $name): string
{
    $name = mb_strtolower(trim($name));
    $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $name) ?: $name;
    $slug = preg_replace('/[^a-z0-9]+/', '.', $ascii);
    return trim((string) $slug, '.') ?: 'amigo';
}

function base_url(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $dir = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    return (IS_HTTPS ? 'https' : 'http') . '://' . $host . $dir . '/';
}
