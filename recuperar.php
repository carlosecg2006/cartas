<?php
declare(strict_types=1);

// Esqueci minha senha: entra com o código de recuperação que a própria pessoa guardou
require __DIR__ . '/app/bootstrap.php';

if (current_user()) {
    redirect('conta.php#recuperacao');
}
$error = '';
$username = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $username = mb_strtolower(trim(input('username')));
    $code = normalize_recovery(input('code'));
    $password = input('password');
    if (too_many_attempts($username)) {
        $error = 'Muitas tentativas seguidas. Tente de novo em alguns minutos.';
    } elseif (mb_strlen($password) < 8) {
        $error = 'A senha nova precisa de pelo menos 8 caracteres.';
    } else {
        $user = q_one("SELECT * FROM users WHERE username = ? AND role <> 'deleted'", [$username]);
        $hash = $user['recovery_hash'] ?? null;
        if ($user && $hash && strlen($code) === 16 && password_verify($code, $hash)) {
            clear_attempts($username);
            db_update('users', (int) $user['id'], ['password_hash' => password_hash($password, PASSWORD_DEFAULT), 'pw_reset_at' => now()]);
            password_changed((int) $user['id'], true);
            // o código usado deixa de valer; já entrega um novo
            $_SESSION['recovery_code'] = new_recovery_code((int) $user['id']);
            flash('Senha nova salva. Guarde o código novo que aparece abaixo.');
            redirect('conta.php#recuperacao');
        }
        record_failed_attempt($username);
        $error = 'Usuário ou código não conferem.';
    }
}

page_head('Recuperar acesso', ['body' => 'auth-page', 'nav' => false]);
?>
<main class="auth-wrap">
    <div class="auth-card card">
        <h1>Esqueci a senha</h1>
        <p class="muted">Use o código de recuperação que você guardou (algo como <code>ABCD-EFGH-JKLM-NPQR</code>).</p>
        <?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <label>Usuário <input name="username" required autocomplete="username" autocapitalize="none" value="<?= e($username) ?>"></label>
            <label>Código de recuperação <input name="code" required autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX"></label>
            <label>Senha nova (mínimo 8 caracteres) <input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
            <button class="btn btn-primary btn-block">Salvar e entrar</button>
        </form>
        <details class="more-options">
            <summary>Não tenho o código</summary>
            <p class="small muted">Se quem te convidou criou seu acesso com senha, peça a essa pessoa um “link para escolher senha nova” (fica em Pessoas). Se não, infelizmente ninguém consegue entrar na sua conta, nem quem cuida do site: é isso que protege as suas cartas.</p>
        </details>
        <p class="small center"><a href="login.php">Voltar para o login</a></p>
    </div>
</main>
<?php
page_foot([], ['footer' => false]);
