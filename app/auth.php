<?php
declare(strict_types=1);

const REMEMBER_COOKIE = 'cartas_lembrar';
const REMEMBER_DAYS = 90;

function current_user(): ?array
{
    static $loaded = false, $user = null;
    if ($loaded) {
        return $user;
    }
    $loaded = true;

    if (!empty($_SESSION['user_id'])) {
        $user = q_one('SELECT * FROM users WHERE id = ?', [(int) $_SESSION['user_id']]);
    }
    if (!$user && !empty($_COOKIE[REMEMBER_COOKIE])) {
        $user = user_from_remember_cookie((string) $_COOKIE[REMEMBER_COOKIE]);
        if ($user) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $user['id'];
        }
    }
    if (!$user) {
        unset($_SESSION['user_id']);
        return null;
    }
    // Atualiza "visto por último" no máximo a cada 5 minutos
    if (!$user['last_seen_at'] || strtotime($user['last_seen_at']) < time() - 300) {
        db_update('users', (int) $user['id'], ['last_seen_at' => now()]);
    }
    return $user;
}

function is_admin(): bool
{
    $user = current_user();
    return $user !== null && $user['role'] === 'admin';
}

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        redirect('login.php');
    }
    return $user;
}

function require_admin(): array
{
    $user = require_login();
    if ($user['role'] !== 'admin') {
        http_response_code(403);
        page_head('Sem acesso');
        echo '<main class="container narrow"><div class="empty">'
            . '<h1>Esta parte é só de quem escreve</h1><p><a class="btn" href="index.php">Voltar para a sua caixa</a></p></div></main>';
        page_foot();
        exit;
    }
    return $user;
}

function login_user(array $user, bool $remember): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    db_update('users', (int) $user['id'], ['last_login_at' => now(), 'last_seen_at' => now()]);
    if ($remember) {
        issue_remember_cookie((int) $user['id']);
    }
}

function logout_user(): void
{
    if (!empty($_COOKIE[REMEMBER_COOKIE])) {
        [$selector] = explode(':', (string) $_COOKIE[REMEMBER_COOKIE]) + [''];
        q('DELETE FROM remember_tokens WHERE selector = ?', [$selector]);
        set_remember_cookie('', time() - 3600);
    }
    $_SESSION = [];
    session_regenerate_id(true);
}

function set_remember_cookie(string $value, int $expires): void
{
    setcookie(REMEMBER_COOKIE, $value, [
        'expires' => $expires,
        'path' => '/',
        'secure' => IS_HTTPS,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

function issue_remember_cookie(int $userId): void
{
    $selector = bin2hex(random_bytes(12));
    $validator = bin2hex(random_bytes(32));
    $expires = time() + REMEMBER_DAYS * 86400;
    q('DELETE FROM remember_tokens WHERE expires_at < ?', [now()]);
    db_insert('remember_tokens', [
        'user_id' => $userId,
        'selector' => $selector,
        'validator_hash' => hash('sha256', $validator),
        'expires_at' => date('Y-m-d H:i:s', $expires),
    ]);
    set_remember_cookie($selector . ':' . $validator, $expires);
}

function user_from_remember_cookie(string $cookie): ?array
{
    $parts = explode(':', $cookie);
    if (count($parts) !== 2 || !ctype_xdigit($parts[0]) || !ctype_xdigit($parts[1])) {
        return null;
    }
    [$selector, $validator] = $parts;
    $token = q_one('SELECT * FROM remember_tokens WHERE selector = ?', [$selector]);
    if (!$token || strtotime($token['expires_at']) < time()
        || !hash_equals($token['validator_hash'], hash('sha256', $validator))) {
        return null;
    }
    // Rotaciona o token a cada uso
    q('DELETE FROM remember_tokens WHERE id = ?', [(int) $token['id']]);
    issue_remember_cookie((int) $token['user_id']);
    return q_one('SELECT * FROM users WHERE id = ?', [(int) $token['user_id']]);
}

// ---------- CSRF ----------

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf'];
}

function csrf_field(): string
{
    return '<input type="hidden" name="_csrf" value="' . e(csrf_token()) . '">';
}

function csrf_valid(): bool
{
    $sent = $_POST['_csrf'] ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    return is_string($sent) && $sent !== '' && hash_equals(csrf_token(), $sent);
}

function csrf_check(): void
{
    if (!csrf_valid()) {
        http_response_code(419);
        exit('Sessão expirada. Volte e recarregue a página.');
    }
}

// ---------- Limite de tentativas de login ----------

function too_many_attempts(string $username): bool
{
    $since = date('Y-m-d H:i:s', time() - 900);
    $count = (int) q_val(
        'SELECT COUNT(*) FROM login_attempts WHERE attempted_at > ? AND (ip = ? OR username = ?)',
        [$since, client_ip(), $username]
    );
    return $count >= 8;
}

function record_failed_attempt(string $username): void
{
    q('DELETE FROM login_attempts WHERE attempted_at < ?', [date('Y-m-d H:i:s', time() - 86400)]);
    db_insert('login_attempts', ['ip' => client_ip(), 'username' => mb_substr($username, 0, 40), 'attempted_at' => now()]);
}

function clear_attempts(string $username): void
{
    q('DELETE FROM login_attempts WHERE ip = ? OR username = ?', [client_ip(), $username]);
}
