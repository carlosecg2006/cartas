<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$admin = require_admin();
$errors = [];
$colors = ['#e8a0a0', '#f2b880', '#e9d27c', '#a8d5a2', '#8ecae6', '#b8a9e8', '#f4a6c8', '#9ad1c9'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string) ($_POST['acao'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);
    $friend = $id ? q_one("SELECT * FROM users WHERE id = ? AND role = 'friend'", [$id]) : null;

    if ($action === 'adicionar' || ($action === 'editar' && $friend)) {
        $name = trim((string) ($_POST['name'] ?? ''));
        $username = mb_strtolower(trim((string) ($_POST['username'] ?? '')));
        $avatar = mb_substr(trim((string) ($_POST['avatar'] ?? '')), 0, 4);
        $color = color_or($_POST['color'] ?? '', $colors[0]);
        if ($username === '') {
            $username = slugify_username($name);
        }
        if ($name === '' || mb_strlen($name) > 80) {
            $errors[] = 'Escreva o nome da pessoa.';
        }
        if (!preg_match('/^[a-z0-9._-]{3,40}$/', $username)) {
            $errors[] = 'O usuário deve ter de 3 a 40 letras minúsculas, números, ponto, hífen ou _.';
        } elseif (q_val('SELECT id FROM users WHERE username = ? AND id <> ?', [$username, $friend ? (int) $friend['id'] : 0])) {
            $errors[] = 'Já existe alguém com o usuário "' . $username . '".';
        }
        if (!$errors) {
            if ($action === 'adicionar') {
                $password = random_password();
                db_insert('users', [
                    'name' => $name, 'username' => $username,
                    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                    'role' => 'friend', 'avatar' => $avatar, 'color' => $color, 'created_at' => now(),
                ]);
                $_SESSION['credentials'] = ['name' => $name, 'username' => $username, 'password' => $password, 'new' => true];
                flash(first_name($name) . ' foi adicionado(a) aos seus amigos! 🎉');
            } else {
                db_update('users', (int) $friend['id'], ['name' => $name, 'username' => $username, 'avatar' => $avatar, 'color' => $color]);
                flash('Dados de ' . first_name($name) . ' atualizados.');
            }
            redirect('amigos.php');
        }
    } elseif ($action === 'nova_senha' && $friend) {
        $password = random_password();
        db_update('users', (int) $friend['id'], ['password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
        q('DELETE FROM remember_tokens WHERE user_id = ?', [(int) $friend['id']]);
        $_SESSION['credentials'] = ['name' => $friend['name'], 'username' => $friend['username'], 'password' => $password, 'new' => false];
        redirect('amigos.php');
    } elseif ($action === 'remover' && $friend) {
        delete_media_files(array_column(q_all('SELECT id FROM letters WHERE recipient_id = ?', [(int) $friend['id']]), 'id'));
        q('DELETE FROM users WHERE id = ?', [(int) $friend['id']]);
        flash(first_name($friend['name']) . ' foi removido(a), junto com as cartas dele(a).');
        redirect('amigos.php');
    }
}

$credentials = $_SESSION['credentials'] ?? null;
unset($_SESSION['credentials']);

$friends = q_all(
    "SELECT u.*,
        (SELECT COUNT(*) FROM letters l WHERE l.recipient_id = u.id AND l.status = 'sent') AS sent_count,
        (SELECT COUNT(*) FROM letters l WHERE l.recipient_id = u.id AND l.status = 'draft') AS draft_count,
        (SELECT COUNT(*) FROM letters l WHERE l.recipient_id = u.id AND l.status = 'sent' AND l.first_opened_at IS NULL) AS unread_count
     FROM users u WHERE u.role = 'friend' ORDER BY u.name"
);
$editing = isset($_GET['editar']) ? q_one("SELECT * FROM users WHERE id = ? AND role = 'friend'", [(int) $_GET['editar']]) : null;
$form = $editing ?: ['name' => $_POST['name'] ?? '', 'username' => $_POST['username'] ?? '', 'avatar' => $_POST['avatar'] ?? '', 'color' => $_POST['color'] ?? $colors[array_rand($colors)]];

page_head('Amigos', ['body' => 'page-friends']);
?>
<main class="container">
    <section class="hero">
        <div>
            <p class="eyebrow">Seus destinatários</p>
            <h1>Amigos</h1>
            <p class="muted">Cada amigo tem o próprio login e só enxerga as cartas escritas para ele.</p>
        </div>
    </section>

    <?php if ($credentials):
        $message = "Oi, " . first_name($credentials['name']) . "! 💌 Tenho cartas pra você em " . base_url()
            . "\nUsuário: " . $credentials['username'] . "\nSenha: " . $credentials['password'];
        ?>
        <div class="credentials card">
            <h2><?= $credentials['new'] ? '🎉 Acesso criado!' : '🔑 Nova senha gerada' ?></h2>
            <p class="muted">Anote ou envie agora: por segurança, a senha não aparece de novo.</p>
            <dl class="cred-list">
                <dt>Usuário</dt><dd><code><?= e($credentials['username']) ?></code></dd>
                <dt>Senha</dt><dd><code><?= e($credentials['password']) ?></code></dd>
            </dl>
            <textarea class="cred-message" readonly rows="4" data-copy-source><?= e($message) ?></textarea>
            <div class="row">
                <button class="btn btn-primary" type="button" data-copy>📋 Copiar mensagem</button>
                <a class="btn btn-ghost" target="_blank" rel="noopener" href="https://wa.me/?text=<?= e(rawurlencode($message)) ?>">Enviar pelo WhatsApp</a>
            </div>
        </div>
    <?php endif; ?>

    <div class="friends-layout">
        <section class="card friend-form-card">
            <h2><?= $editing ? 'Editar ' . e(first_name($editing['name'])) : 'Adicionar amigo' ?></h2>
            <?php foreach ($errors as $error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endforeach; ?>
            <form method="post" class="form" data-friend-form>
                <?= csrf_field() ?>
                <input type="hidden" name="acao" value="<?= $editing ? 'editar' : 'adicionar' ?>">
                <?php if ($editing): ?><input type="hidden" name="id" value="<?= (int) $editing['id'] ?>"><?php endif; ?>
                <label>Nome
                    <input name="name" required maxlength="80" value="<?= e($form['name']) ?>" placeholder="Mariana Souza" data-name-input>
                </label>
                <label>Usuário para entrar
                    <input name="username" maxlength="40" pattern="[a-z0-9._\-]{3,40}" value="<?= e($form['username']) ?>" placeholder="mariana" autocapitalize="none" data-username-input>
                    <small class="muted">Se deixar vazio, eu crio a partir do nome.</small>
                </label>
                <div class="grid-2">
                    <label>Emoji (opcional)
                        <input name="avatar" maxlength="4" value="<?= e($form['avatar']) ?>" placeholder="🌻">
                    </label>
                    <fieldset class="color-field">
                        <legend>Cor</legend>
                        <div class="swatches">
                            <?php foreach ($colors as $c): ?>
                                <label class="swatch" style="--c: <?= e($c) ?>">
                                    <input type="radio" name="color" value="<?= e($c) ?>" <?= $form['color'] === $c ? 'checked' : '' ?>>
                                    <span></span>
                                </label>
                            <?php endforeach; ?>
                        </div>
                    </fieldset>
                </div>
                <?php if (!$editing): ?><p class="small muted">A senha é gerada automaticamente e aparece só uma vez, para você enviar.</p><?php endif; ?>
                <div class="row">
                    <button class="btn btn-primary"><?= $editing ? 'Salvar' : 'Adicionar' ?></button>
                    <?php if ($editing): ?><a class="btn btn-ghost" href="amigos.php">Cancelar</a><?php endif; ?>
                </div>
            </form>
        </section>

        <section class="friend-list">
            <?php if (!$friends): ?>
                <div class="empty small-empty">
                    <div class="empty-icon">🫂</div>
                    <p class="muted">Ninguém por aqui ainda.</p>
                </div>
            <?php endif; ?>
            <?php foreach ($friends as $f): ?>
                <article class="friend-card card">
                    <div class="friend-head">
                        <?= avatar_html($f, 'lg') ?>
                        <div>
                            <h3><?= e($f['name']) ?></h3>
                            <p class="muted small">@<?= e($f['username']) ?> · último acesso <?= e(time_ago($f['last_seen_at'])) ?></p>
                        </div>
                    </div>
                    <p class="friend-stats small">
                        <span>✉ <?= (int) $f['sent_count'] ?> enviada<?= $f['sent_count'] == 1 ? '' : 's' ?></span>
                        <?php if ($f['draft_count']): ?><span>📝 <?= (int) $f['draft_count'] ?> rascunho<?= $f['draft_count'] == 1 ? '' : 's' ?></span><?php endif; ?>
                        <?php if ($f['unread_count']): ?><span>📬 <?= (int) $f['unread_count'] ?> não lida<?= $f['unread_count'] == 1 ? '' : 's' ?></span><?php endif; ?>
                    </p>
                    <div class="row wrap">
                        <form method="post" action="acoes.php">
                            <?= csrf_field() ?><input type="hidden" name="acao" value="criar"><input type="hidden" name="para" value="<?= (int) $f['id'] ?>">
                            <button class="btn btn-sm btn-primary">＋ Carta para <?= e(first_name($f['name'])) ?></button>
                        </form>
                        <a class="btn btn-sm btn-ghost" href="index.php?para=<?= (int) $f['id'] ?>">Ver cartas</a>
                        <details class="menu">
                            <summary class="btn btn-sm btn-ghost" aria-label="Mais ações">⋯</summary>
                            <div class="menu-list">
                                <a href="amigos.php?editar=<?= (int) $f['id'] ?>">✏️ Editar</a>
                                <form method="post">
                                    <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $f['id'] ?>">
                                    <button name="acao" value="nova_senha" data-confirm="Gerar uma nova senha para <?= e(first_name($f['name'])) ?>? A antiga para de funcionar.">🔑 Gerar nova senha</button>
                                    <button name="acao" value="remover" class="danger" data-confirm="Remover <?= e(first_name($f['name'])) ?> e TODAS as cartas para essa pessoa? Não dá para desfazer.">🗑 Remover</button>
                                </form>
                            </div>
                        </details>
                    </div>
                </article>
            <?php endforeach; ?>
        </section>
    </div>
</main>
<?php
page_foot();
