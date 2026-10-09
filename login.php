<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

if (current_user()) {
    redirect('index.php');
}

$error = '';
$username = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $username = mb_strtolower(trim((string) ($_POST['username'] ?? '')));
    $password = (string) ($_POST['password'] ?? '');

    if (too_many_attempts($username)) {
        $error = 'Muitas tentativas seguidas. Tente de novo em alguns minutos.';
    } else {
        $user = q_one('SELECT * FROM users WHERE username = ?', [$username]);
        if ($user && password_verify($password, $user['password_hash'])) {
            clear_attempts($username);
            if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                db_update('users', (int) $user['id'], ['password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
            }
            login_user($user, !empty($_POST['remember']));
            redirect('index.php');
        }
        record_failed_attempt($username);
        $error = 'Usuário ou senha não conferem.';
    }
}

page_head('Entrar', ['body' => 'auth-page', 'nav' => false, 'css' => ['assets/css/letter.css']]);
?>
<main class="auth-wrap">
    <div class="auth-card card">
        <div class="auth-art" aria-hidden="true" data-envelope="<?= e(json_encode(['env' => ['color' => '#e7d3bd', 'liner' => 'hearts', 'seal' => '❤', 'sealColor' => '#a3322a', 'stamp' => 'heart'], 'to' => '', 'sentAt' => iso(now())], JSON_UNESCAPED_UNICODE)) ?>"></div>
        <h1><?= e(app_name()) ?></h1>
        <p class="muted">Pode ter carta esperando por você.</p>
        <?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <label>Usuário
                <input name="username" required autocomplete="username" autocapitalize="none" value="<?= e($username) ?>" autofocus>
            </label>
            <label>Senha
                <input name="password" type="password" required autocomplete="current-password">
            </label>
            <label class="check"><input type="checkbox" name="remember" value="1" checked> Lembrar de mim neste aparelho</label>
            <button class="btn btn-primary btn-block">Entrar</button>
        </form>
    </div>
</main>
<?php
page_foot(['assets/js/letter.js']);
