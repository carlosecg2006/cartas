<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $current = (string) ($_POST['current'] ?? '');
    $new = (string) ($_POST['new'] ?? '');
    $confirm = (string) ($_POST['confirm'] ?? '');
    if (!password_verify($current, $user['password_hash'])) {
        $errors[] = 'A senha atual não confere.';
    } elseif (mb_strlen($new) < 6) {
        $errors[] = 'A nova senha precisa de pelo menos 6 caracteres.';
    } elseif ($new !== $confirm) {
        $errors[] = 'A confirmação não é igual à nova senha.';
    } else {
        db_update('users', (int) $user['id'], ['password_hash' => password_hash($new, PASSWORD_DEFAULT)]);
        flash('Senha alterada! 🔐');
        redirect('conta.php');
    }
}

page_head('Minha conta');
?>
<main class="container narrow">
    <section class="hero hero-center">
        <?= avatar_html($user, 'xl') ?>
        <h1><?= e($user['name']) ?></h1>
        <p class="muted">@<?= e($user['username']) ?> · <?= $user['role'] === 'admin' ? 'remetente' : 'destinatário(a)' ?></p>
    </section>

    <section class="card">
        <h2>Trocar senha</h2>
        <?php foreach ($errors as $error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endforeach; ?>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <label>Senha atual <input type="password" name="current" required autocomplete="current-password"></label>
            <label>Nova senha <input type="password" name="new" required minlength="6" autocomplete="new-password"></label>
            <label>Repita a nova senha <input type="password" name="confirm" required minlength="6" autocomplete="new-password"></label>
            <button class="btn btn-primary">Salvar nova senha</button>
        </form>
    </section>

    <form method="post" action="logout.php" class="center">
        <?= csrf_field() ?>
        <button class="btn btn-ghost">Sair da conta</button>
    </form>
</main>
<?php
page_foot();
