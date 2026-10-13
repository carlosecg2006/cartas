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
        // Senha trocada em outro lugar: esta sessão deixa de valer
        if ($user && (int) ($user['auth_version'] ?? 0) !== (int) ($_SESSION['auth_v'] ?? 0)) {
            $user = null;
        }
    }
    if (!$user && !empty($_COOKIE[REMEMBER_COOKIE])) {
        $user = user_from_remember_cookie((string) $_COOKIE[REMEMBER_COOKIE]);
        if ($user) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $user['id'];
            $_SESSION['auth_v'] = (int) ($user['auth_version'] ?? 0);
        }
    }
    if ($user && ($user['role'] ?? '') === 'deleted') {
        $user = null;
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

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        redirect('login.php');
    }
    return $user;
}

function login_user(array $user, bool $remember): void
{
    session_regenerate_id(true);
    $_SESSION['user_id'] = (int) $user['id'];
    $_SESSION['auth_v'] = (int) ($user['auth_version'] ?? 0);
    db_update('users', (int) $user['id'], ['last_login_at' => now(), 'last_seen_at' => now()]);
    if ($remember) {
        issue_remember_cookie((int) $user['id']);
    }
}

/**
 * A senha mudou: derruba todas as sessões e "lembrar de mim" dessa conta.
 * Quem está fazendo a troca continua conectado ($keepCurrent).
 */
function password_changed(int $userId, bool $keepCurrent): void
{
    q('UPDATE users SET auth_version = auth_version + 1 WHERE id = ?', [$userId]);
    q('DELETE FROM remember_tokens WHERE user_id = ?', [$userId]);
    q("DELETE FROM invites WHERE kind = 'reset' AND user_id = ? AND used_at IS NULL", [$userId]);
    if ($keepCurrent) {
        login_user(find_user($userId), true);
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
    // Troca o token de tempos em tempos. O antigo ainda vale 1 minuto, porque a página,
    // as imagens e a API chegam juntas com o mesmo cookie.
    if (strtotime($token['expires_at']) < time() + (REMEMBER_DAYS - 1) * 86400) {
        q('UPDATE remember_tokens SET expires_at = ? WHERE id = ?', [date('Y-m-d H:i:s', time() + 60), (int) $token['id']]);
        issue_remember_cookie((int) $token['user_id']);
    }
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
        page_head('Página expirada', ['nav' => false]);
        echo '<main class="container narrow"><div class="empty"><h1>Essa página ficou aberta por muito tempo</h1>'
            . '<p class="muted">Por segurança, recarregue e tente de novo.</p>'
            . '<p><a class="btn btn-primary" href="' . e(strtok($_SERVER['REQUEST_URI'] ?? 'index.php', '#')) . '">Recarregar</a></p></div></main>';
        page_foot();
        exit;
    }
}

// ---------- Limite de tentativas de login ----------

/**
 * Limites em 15 minutos: 8 erros para o mesmo usuário vindos do mesmo lugar,
 * 30 erros de um mesmo lugar no total, 40 erros contra um mesmo usuário vindos de qualquer lugar.
 */
function too_many_attempts(string $username): bool
{
    $since = date('Y-m-d H:i:s', time() - 900);
    $row = q_one(
        'SELECT SUM(CASE WHEN ip = ? AND username = ? THEN 1 ELSE 0 END) AS pair,
                SUM(CASE WHEN ip = ? THEN 1 ELSE 0 END) AS by_ip,
                SUM(CASE WHEN username = ? THEN 1 ELSE 0 END) AS by_user
         FROM login_attempts WHERE attempted_at > ?',
        [client_ip(), $username, client_ip(), $username, $since]
    );
    return (int) ($row['pair'] ?? 0) >= 8 || (int) ($row['by_ip'] ?? 0) >= 30 || (int) ($row['by_user'] ?? 0) >= 40;
}

function record_failed_attempt(string $username): void
{
    q('DELETE FROM login_attempts WHERE attempted_at < ?', [date('Y-m-d H:i:s', time() - 86400)]);
    db_insert('login_attempts', ['ip' => client_ip(), 'username' => mb_substr($username, 0, 40), 'attempted_at' => now()]);
}

function clear_attempts(string $username): void
{
    q('DELETE FROM login_attempts WHERE ip = ? AND username = ?', [client_ip(), $username]);
}

// ---------- Código de recuperação (sem e-mail: a própria pessoa guarda) ----------

/** Gera um código novo (o antigo deixa de valer). Retorna o código para mostrar uma única vez. */
function new_recovery_code(int $userId): string
{
    $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O, 1/I
    $code = '';
    for ($i = 0; $i < 16; $i++) {
        $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
    }
    $code = implode('-', str_split($code, 4));
    db_update('users', $userId, ['recovery_hash' => password_hash(normalize_recovery($code), PASSWORD_DEFAULT)]);
    return $code;
}

function normalize_recovery(string $code): string
{
    return strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $code));
}

