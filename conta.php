<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$errors = [];
$colors = ['#d9a5a0', '#e2b98f', '#d8c37e', '#a9c4a0', '#9fbfd6', '#b9a8d6', '#d6a3bd', '#9cc8bf', '#c97b84'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if (($_POST['acao'] ?? '') === 'perfil') {
        $name = trim((string) ($_POST['name'] ?? ''));
        if ($name === '' || mb_strlen($name) > 80) {
            $errors[] = 'Escreva seu nome.';
        } else {
            db_update('users', (int) $user['id'], [
                'name' => $name,
                'avatar' => mb_substr(trim((string) ($_POST['avatar'] ?? '')), 0, 4),
                'color' => color_or($_POST['color'] ?? '', $user['color']),
                'birthday' => parse_birthday($_POST['birthday'] ?? ''),
            ]);
            flash('Perfil atualizado.');
            redirect('conta.php');
        }
    } else {
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
            flash('Senha alterada.');
            redirect('conta.php');
        }
    }
}

page_head('Minha conta');
?>
<main class="container narrow">
    <section class="page-head page-head-center">
        <?= avatar_html($user, 'xl') ?>
        <h1><?= e($user['name']) ?></h1>
        <p>@<?= e($user['username']) ?></p>
    </section>

    <?php foreach ($errors as $error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endforeach; ?>

    <section class="card">
        <h2>Seu perfil</h2>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <input type="hidden" name="acao" value="perfil">
            <label>Nome <input name="name" required maxlength="80" value="<?= e($user['name']) ?>"></label>
            <label>Aniversário
                <input type="date" name="birthday" value="<?= e((string) $user['birthday']) ?>">
                <small>Quem tem você na lista é avisado alguns dias antes.</small>
            </label>
            <div class="grid-2">
                <label>Inicial ou emoji <input name="avatar" maxlength="4" value="<?= e($user['avatar']) ?>"></label>
                <fieldset>
                    <legend>Cor</legend>
                    <div class="swatches">
                        <?php foreach ($colors as $c): ?>
                            <label class="swatch" style="--c: <?= e($c) ?>">
                                <input type="radio" name="color" value="<?= e($c) ?>" <?= $user['color'] === $c ? 'checked' : '' ?>>
                                <span></span>
                            </label>
                        <?php endforeach; ?>
                    </div>
                </fieldset>
            </div>
            <button class="btn btn-primary">Salvar perfil</button>
        </form>
    </section>

    <section class="card" style="margin-top:1.2rem">
        <h2>Aparência</h2>
        <p class="muted small">Fica salvo neste aparelho.</p>
        <div class="theme-choice" role="radiogroup" aria-label="Tema">
            <label><input type="radio" name="theme" value="auto" data-theme-choice><span><?= icon('sparkle') ?>Automático</span></label>
            <label><input type="radio" name="theme" value="light" data-theme-choice><span><?= icon('sun') ?>Claro</span></label>
            <label><input type="radio" name="theme" value="dark" data-theme-choice><span><?= icon('moon') ?>Escuro</span></label>
        </div>
    </section>

    <section class="card push-panel" style="margin-top:1.2rem" data-push-panel>
        <h2>Avisos no celular</h2>
        <p class="muted small">Receba um aviso quando chegar carta ou recado novo. O aviso vale para este aparelho; ative em cada um que quiser.</p>
        <p class="push-status" data-push-status>Verificando…</p>
        <div class="row wrap">
            <button class="btn btn-primary" type="button" data-push-enable hidden><?= icon('bell') ?>Ativar avisos</button>
            <button class="btn" type="button" data-push-test hidden>Mandar um aviso de teste</button>
            <button class="btn btn-ghost" type="button" data-push-disable hidden>Desativar neste aparelho</button>
        </div>
        <p class="small muted" data-push-ios hidden>No iPhone: toque em Compartilhar → “Adicionar à Tela de Início”, abra o site pelo ícone e ative aqui.</p>
    </section>

    <section class="card" style="margin-top:1.2rem">
        <h2>Trocar senha</h2>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <input type="hidden" name="acao" value="senha">
            <label>Senha atual <input type="password" name="current" required autocomplete="current-password"></label>
            <label>Nova senha <input type="password" name="new" required minlength="6" autocomplete="new-password"></label>
            <label>Repita a nova senha <input type="password" name="confirm" required minlength="6" autocomplete="new-password"></label>
            <button class="btn btn-primary">Salvar nova senha</button>
        </form>
    </section>

    <form method="post" action="logout.php" class="row center" style="margin-top:1.5rem">
        <?= csrf_field() ?>
        <button class="btn btn-ghost"><?= icon('logout') ?>Sair da conta</button>
    </form>
</main>
<?php
page_foot();
