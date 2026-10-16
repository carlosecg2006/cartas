<?php
declare(strict_types=1);

// Página aberta pelo link de convite (ou de nova senha)
require __DIR__ . '/app/bootstrap.php';

$token = $_GET['t'] ?? $_POST['t'] ?? '';
$token = is_string($token) ? $token : '';
$invite = find_invite($token);
$me = current_user();
$errors = [];
$colors = ['#d9a5a0', '#e2b98f', '#d8c37e', '#a9c4a0', '#9fbfd6', '#b9a8d6', '#d6a3bd', '#9cc8bf'];

if ($invite && $_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = input('acao');
    /** Marca o convite como usado antes de qualquer coisa: dois cliques ao mesmo tempo não criam duas contas. */
    $claim = function () use ($invite): bool {
        return q('UPDATE invites SET used_at = ? WHERE id = ? AND used_at IS NULL', [now(), (int) $invite['id']])->rowCount() === 1;
    };

    if ($invite['kind'] === 'invite' && $action === 'conectar' && $me) {
        // Já tem conta: só conecta as duas pessoas
        if ((int) $me['id'] !== (int) $invite['created_by'] && $claim()) {
            add_contact((int) $me['id'], (int) $invite['created_by']);
            q('UPDATE contacts SET blocked = 0 WHERE owner_id = ? AND contact_id = ?', [(int) $me['id'], (int) $invite['created_by']]);
            add_contact((int) $invite['created_by'], (int) $me['id'], $invite['name']);
            db_update('invites', (int) $invite['id'], ['user_id' => (int) $me['id']]);
            flash('Pronto! Agora vocês podem trocar cartas.');
        }
        redirect('amigos.php');
    }

    if ($invite['kind'] === 'invite' && $action === 'criar' && !$me) {
        $name = trim(input('name'));
        $username = mb_strtolower(trim(input('username')));
        $password = input('password');
        if ($name === '' || mb_strlen($name) > 80) {
            $errors[] = 'Escreva seu nome.';
        }
        if (!preg_match('/^[a-z0-9._-]{3,40}$/', $username)) {
            $errors[] = 'O usuário deve ter de 3 a 40 letras minúsculas, números, ponto, hífen ou _.';
        } elseif (q_val('SELECT id FROM users WHERE username = ?', [$username])) {
            $errors[] = 'O usuário "' . $username . '" já existe. Tente outro.';
        }
        if (mb_strlen($password) < 8) {
            $errors[] = 'A senha precisa de pelo menos 8 caracteres.';
        }
        if (!input('aceito')) {
            $errors[] = 'Para criar a conta, confirme que leu como seus dados são tratados.';
        }
        if (!$errors && !$claim()) {
            $errors[] = 'Esse convite acabou de ser usado. Peça um novo para quem te enviou.';
        }
        if (!$errors) {
            try {
                $id = db_insert('users', [
                    'name' => $name,
                    'username' => $username,
                    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                    'role' => 'friend',
                    'avatar' => mb_substr(trim(input('avatar')), 0, 4),
                    'color' => color_or(input('color'), $colors[0]),
                    'birthday' => parse_birthday(input('birthday')),
                    'created_at' => now(),
                    'created_by' => (int) $invite['created_by'],
                    'managed' => 0, // escolheu a própria senha: ninguém mais mexe nesta conta
                    'terms_at' => now(),
                ]);
            } catch (PDOException $e) {
                // alguém pegou o mesmo usuário no mesmo segundo: devolve o convite
                q('UPDATE invites SET used_at = NULL WHERE id = ?', [(int) $invite['id']]);
                $id = 0;
                $errors[] = 'O usuário "' . $username . '" acabou de ser usado. Tente outro.';
            }
        }
        if (!$errors) {
            add_contact($id, (int) $invite['created_by']);
            // quem convidou continua chamando a pessoa do jeito que escreveu no convite
            add_contact((int) $invite['created_by'], $id, $invite['name'] !== $name ? $invite['name'] : '');
            db_update('invites', (int) $invite['id'], ['user_id' => $id]);
            login_user(find_user($id), true);
            $_SESSION['recovery_code'] = new_recovery_code($id);
            flash('Bem-vindo(a)! Antes de tudo, guarde seu código de recuperação.');
            redirect('conta.php?novo=1#recuperacao');
        }
    }

    if ($invite['kind'] === 'reset' && $action === 'senha') {
        $password = input('password');
        if (mb_strlen($password) < 8) {
            $errors[] = 'A senha precisa de pelo menos 8 caracteres.';
        } elseif (!$claim()) {
            $errors[] = 'Esse link acabou de ser usado.';
        } else {
            db_update('users', (int) $invite['user_id'], ['password_hash' => password_hash($password, PASSWORD_DEFAULT), 'pw_reset_at' => now()]);
            password_changed((int) $invite['user_id'], true);
            flash('Senha nova salva.');
            redirect('index.php');
        }
    }
}

$creator = $invite ? ['name' => $invite['creator_name'], 'avatar' => $invite['creator_avatar'], 'color' => $invite['creator_color']] : null;
page_head($invite && $invite['kind'] === 'reset' ? 'Senha nova' : 'Convite', [
    'body' => 'auth-page', 'nav' => false, 'css' => ['assets/css/letter.css'],
    'og_title' => $invite && $invite['kind'] === 'invite' ? first_name($invite['creator_name']) . ' quer trocar cartas com você 💌' : app_name(),
    'og_description' => 'Abra o link para criar sua conta e receber cartas.',
]);
?>
<main class="auth-wrap">
    <div class="auth-card card wide">
        <?php if (!$invite): ?>
            <h1>Link expirado</h1>
            <p class="muted">Esse link já foi usado ou passou da validade. Peça um novo para quem te enviou.</p>
            <a class="btn btn-primary btn-block" href="login.php">Ir para o login</a>

        <?php elseif ($invite['kind'] === 'reset'): ?>
            <h1>Escolha uma senha nova</h1>
            <p class="muted"><?= e(first_name($invite['creator_name'])) ?> gerou este link para você voltar a entrar.</p>
            <?php foreach ($errors as $error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endforeach; ?>
            <form method="post" class="form">
                <?= csrf_field() ?>
                <input type="hidden" name="t" value="<?= e($token) ?>">
                <input type="hidden" name="acao" value="senha">
                <label>Senha nova (mínimo 8 caracteres) <input type="password" name="password" required minlength="8" autocomplete="new-password" autofocus></label>
                <button class="btn btn-primary btn-block">Salvar e entrar</button>
            </form>

        <?php else: ?>
            <div class="auth-art" aria-hidden="true" data-envelope="<?= e(json_encode(['env' => ['color' => '#e7d3bd', 'liner' => 'hearts', 'seal' => '❤', 'sealColor' => '#a3322a', 'stamp' => 'heart'], 'to' => first_name($invite['name']), 'sentAt' => iso(now())], JSON_UNESCAPED_UNICODE)) ?>"></div>
            <h1>Você foi convidado(a)</h1>
            <p class="muted invite-from"><?= avatar_html($creator, 'sm') ?><span><b><?= e($invite['creator_name']) ?></b> quer trocar cartas com você no <?= e(app_name()) ?>.</span></p>
            <?php foreach ($errors as $error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endforeach; ?>

            <?php if ($me): ?>
                <p>Você já está entrando como <b><?= e($me['name']) ?></b>.</p>
                <?php if ((int) $me['id'] === (int) $invite['created_by']): ?>
                    <p class="muted small">Esse é o seu próprio convite. Envie o link para a pessoa.</p>
                <?php else: ?>
                    <form method="post">
                        <?= csrf_field() ?>
                        <input type="hidden" name="t" value="<?= e($token) ?>">
                        <button class="btn btn-primary btn-block" name="acao" value="conectar">Conectar com <?= e(first_name($invite['creator_name'])) ?></button>
                    </form>
                <?php endif; ?>
            <?php else: ?>
                <form method="post" class="form">
                    <?= csrf_field() ?>
                    <input type="hidden" name="t" value="<?= e($token) ?>">
                    <input type="hidden" name="acao" value="criar">
                    <label>Seu nome <input name="name" required maxlength="80" value="<?= e(input('name', $invite['name'])) ?>" data-name-input></label>
                    <label>Usuário para entrar
                        <input name="username" required pattern="[a-z0-9._\-]{3,40}" value="<?= e(input('username', slugify_username(first_name($invite['name'] ?: 'eu')))) ?>" autocapitalize="none" data-username-input>
                        <small>Só letras minúsculas, números e ponto.</small>
                    </label>
                    <label>Sua senha (mínimo 8 caracteres) <input type="password" name="password" required minlength="8" autocomplete="new-password"></label>
                    <label>Aniversário (opcional) <input type="date" name="birthday" value="<?= e(input('birthday')) ?>"></label>
                    <fieldset>
                        <legend>Sua cor</legend>
                        <div class="swatches">
                            <?php foreach ($colors as $i => $c): ?>
                                <label class="swatch" style="--c: <?= e($c) ?>"><input type="radio" name="color" aria-label="<?= e(color_label($c)) ?>" value="<?= e($c) ?>" <?= $i === 0 ? 'checked' : '' ?>><span></span></label>
                            <?php endforeach; ?>
                        </div>
                    </fieldset>
                    <label class="check"><input type="checkbox" name="aceito" value="1" required> Li <a href="privacidade.php" target="_blank">como meus dados são guardados</a> e concordo.</label>
                    <button class="btn btn-primary btn-block">Criar minha conta</button>
                    <p class="small muted center">Já tem conta? <a href="login.php">Entre</a> e abra o link de novo para se conectar.</p>
                </form>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</main>
<?php
page_foot(['assets/js/letter.js']);
