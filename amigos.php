<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$uid = (int) $user['id'];
$errors = [];
$colors = ['#d9a5a0', '#e2b98f', '#d8c37e', '#a9c4a0', '#9fbfd6', '#b9a8d6', '#d6a3bd', '#9cc8bf'];

/** Contato da minha lista (com dados da conta), ou null. */
function my_contact(int $uid, int $id): ?array
{
    foreach (contacts_of($uid) as $c) {
        if ((int) $c['id'] === $id) {
            return $c;
        }
    }
    return null;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $action = (string) ($_POST['acao'] ?? '');
    $contact = !empty($_POST['id']) ? my_contact($uid, (int) $_POST['id']) : null;
    $createdByMe = $contact && (int) $contact['created_by'] === $uid;

    if ($action === 'criar' || ($action === 'editar' && $createdByMe)) {
        $name = trim((string) ($_POST['name'] ?? ''));
        $username = mb_strtolower(trim((string) ($_POST['username'] ?? '')));
        $avatar = mb_substr(trim((string) ($_POST['avatar'] ?? '')), 0, 4);
        $color = color_or($_POST['color'] ?? '', $colors[0]);
        $birthday = parse_birthday($_POST['birthday'] ?? '');
        if ($username === '') {
            $username = slugify_username($name);
        }
        if ($name === '' || mb_strlen($name) > 80) {
            $errors[] = 'Escreva o nome da pessoa.';
        }
        if (!preg_match('/^[a-z0-9._-]{3,40}$/', $username)) {
            $errors[] = 'O usuário deve ter de 3 a 40 letras minúsculas, números, ponto, hífen ou _.';
        } elseif (q_val('SELECT id FROM users WHERE username = ? AND id <> ?', [$username, $contact ? (int) $contact['id'] : 0])) {
            $errors[] = 'O usuário "' . $username . '" já está em uso. Tente outro, como "' . $username . '2".';
        }
        if (!$errors) {
            if ($action === 'criar') {
                [, $password] = create_account($user, $name, $username, $avatar, $color, $birthday);
                $_SESSION['credentials'] = ['name' => $name, 'username' => $username, 'password' => $password, 'new' => true];
                flash(first_name($name) . ' está na sua lista.');
            } else {
                db_update('users', (int) $contact['id'], ['name' => $name, 'username' => $username, 'avatar' => $avatar, 'color' => $color, 'birthday' => $birthday]);
                flash('Dados de ' . first_name($name) . ' atualizados.');
            }
            redirect('amigos.php');
        }
    } elseif ($action === 'apelido' && $contact) {
        $nick = mb_substr(trim((string) ($_POST['nickname'] ?? '')), 0, 80);
        q('UPDATE contacts SET nickname = ? WHERE owner_id = ? AND contact_id = ?', [$nick, $uid, (int) $contact['id']]);
        flash($nick !== '' ? 'Agora você chama ' . $contact['name'] . ' de "' . $nick . '".' : 'Apelido removido.');
        redirect('amigos.php');
    } elseif ($action === 'nova_senha' && $createdByMe) {
        $password = random_password();
        db_update('users', (int) $contact['id'], ['password_hash' => password_hash($password, PASSWORD_DEFAULT)]);
        q('DELETE FROM remember_tokens WHERE user_id = ?', [(int) $contact['id']]);
        $_SESSION['credentials'] = ['name' => $contact['name'], 'username' => $contact['username'], 'password' => $password, 'new' => false];
        redirect('amigos.php');
    } elseif ($action === 'tirar' && $contact) {
        q('DELETE FROM contacts WHERE owner_id = ? AND contact_id = ?', [$uid, (int) $contact['id']]);
        flash($contact['display'] . ' saiu da sua lista. Se essa pessoa te escrever de novo, volta automaticamente.');
        redirect('amigos.php');
    } elseif ($action === 'excluir_conta' && $createdByMe) {
        delete_account((int) $contact['id']);
        flash('A conta de ' . $contact['display'] . ' foi apagada.');
        redirect('amigos.php');
    }
}

$credentials = $_SESSION['credentials'] ?? null;
unset($_SESSION['credentials']);

$contacts = contacts_of($uid);
$stats = [];
foreach (q_all("SELECT recipient_id AS other, COUNT(*) AS n FROM letters WHERE sender_id = ? AND status = 'sent' GROUP BY recipient_id", [$uid]) as $r) {
    $stats[(int) $r['other']]['sent'] = (int) $r['n'];
}
foreach (q_all("SELECT l.sender_id AS other, COUNT(*) AS n FROM letters l WHERE l.recipient_id = ? AND l.status = 'sent' AND " . sql_delivered() . ' GROUP BY l.sender_id', [$uid]) as $r) {
    $stats[(int) $r['other']]['received'] = (int) $r['n'];
}

$editing = isset($_GET['editar']) ? my_contact($uid, (int) $_GET['editar']) : null;
if ($editing && (int) $editing['created_by'] !== $uid) {
    $editing = null;
}
$nicking = isset($_GET['apelido']) ? my_contact($uid, (int) $_GET['apelido']) : null;
$form = $editing ?: [
    'name' => $_POST['name'] ?? '', 'username' => $_POST['username'] ?? '', 'avatar' => $_POST['avatar'] ?? '',
    'color' => $_POST['color'] ?? $colors[array_rand($colors)], 'birthday' => $_POST['birthday'] ?? '',
];

page_head('Pessoas', ['body' => 'page-friends']);
?>
<main class="container">
    <section class="page-head">
        <div>
            <p class="eyebrow">Sua lista</p>
            <h1>Suas <em>pessoas</em></h1>
            <p>Você só escreve para quem está aqui, com o nome que quiser dar. Ninguém vê a lista de ninguém.</p>
        </div>
    </section>

    <?php if ($credentials):
        $message = 'Oi, ' . first_name($credentials['name']) . '! Criei um acesso pra você trocar cartas comigo: ' . base_url()
            . "\nUsuário: " . $credentials['username'] . "\nSenha: " . $credentials['password'];
        ?>
        <div class="credentials card">
            <h2><?= $credentials['new'] ? 'Acesso criado' : 'Senha nova' ?></h2>
            <p class="muted">Envie agora. Por segurança, a senha não aparece de novo.</p>
            <dl class="cred-list">
                <dt>Usuário</dt><dd><code><?= e($credentials['username']) ?></code></dd>
                <dt>Senha</dt><dd><code><?= e($credentials['password']) ?></code></dd>
            </dl>
            <textarea class="cred-message" readonly rows="4" data-copy-source><?= e($message) ?></textarea>
            <div class="row wrap">
                <button class="btn btn-primary" type="button" data-copy><?= icon('copy') ?>Copiar mensagem</button>
                <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=<?= e(rawurlencode($message)) ?>"><?= icon('send') ?>Mandar pelo WhatsApp</a>
            </div>
        </div>
    <?php endif; ?>

    <div class="friends-layout">
        <section class="card friend-form-card">
            <?php if ($nicking): ?>
                <h2>Como você chama <?= e(first_name($nicking['name'])) ?>?</h2>
                <p class="muted small">Só você vê esse nome. Nas cartas, o envelope usa ele.</p>
                <form method="post" class="form">
                    <?= csrf_field() ?>
                    <input type="hidden" name="acao" value="apelido">
                    <input type="hidden" name="id" value="<?= (int) $nicking['id'] ?>">
                    <label>Apelido <input name="nickname" maxlength="80" value="<?= e($nicking['nickname']) ?>" placeholder="<?= e($nicking['name']) ?>" autofocus></label>
                    <div class="row">
                        <button class="btn btn-primary">Salvar</button>
                        <a class="btn btn-ghost" href="amigos.php">Cancelar</a>
                    </div>
                </form>
            <?php else: ?>
                <h2><?= $editing ? 'Editar ' . e(first_name($editing['name'])) : 'Criar acesso para alguém' ?></h2>
                <?php if (!$editing): ?><p class="muted small">A pessoa entra na sua lista e você entra na dela.</p><?php endif; ?>
                <?php foreach ($errors as $error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endforeach; ?>
                <form method="post" class="form" data-friend-form>
                    <?= csrf_field() ?>
                    <input type="hidden" name="acao" value="<?= $editing ? 'editar' : 'criar' ?>">
                    <?php if ($editing): ?><input type="hidden" name="id" value="<?= (int) $editing['id'] ?>"><?php endif; ?>
                    <label>Nome
                        <input name="name" required maxlength="80" value="<?= e($form['name']) ?>" placeholder="Mariana Souza" data-name-input>
                    </label>
                    <label>Usuário
                        <input name="username" maxlength="40" pattern="[a-z0-9._\-]{3,40}" value="<?= e($form['username']) ?>" placeholder="mariana" autocapitalize="none" data-username-input>
                        <small>Em branco, eu crio a partir do nome.</small>
                    </label>
                    <label>Aniversário (opcional)
                        <input type="date" name="birthday" value="<?= e((string) $form['birthday']) ?>">
                    </label>
                    <div class="grid-2">
                        <label>Inicial ou emoji
                            <input name="avatar" maxlength="4" value="<?= e($form['avatar']) ?>" placeholder="M">
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
                    <?php if (!$editing): ?><p class="small muted">A senha é gerada na hora e mostrada uma única vez.</p><?php endif; ?>
                    <div class="row">
                        <button class="btn btn-primary"><?= $editing ? 'Salvar' : 'Criar acesso' ?></button>
                        <?php if ($editing): ?><a class="btn btn-ghost" href="amigos.php">Cancelar</a><?php endif; ?>
                    </div>
                </form>
            <?php endif; ?>
        </section>

        <section>
            <?php if (!$contacts): ?>
                <div class="empty"><p class="muted">Sua lista está vazia.</p></div>
            <?php else: ?>
                <div class="friend-list">
                    <?php foreach ($contacts as $f):
                        $mine = (int) $f['created_by'] === $uid;
                        $st = $stats[(int) $f['id']] ?? [];
                        ?>
                        <article class="friend-row">
                            <?= avatar_html($f, 'lg') ?>
                            <div>
                                <h3><?= e($f['display']) ?></h3>
                                <p class="muted small">
                                    <?= $f['nickname'] !== '' ? e($f['name']) . ' · ' : '' ?>@<?= e($f['username']) ?>
                                    <?php if ($f['birthday']): ?> · faz aniversário em <?= e(birthday_label($f['birthday'])) ?><?php endif; ?>
                                </p>
                                <p class="friend-stats">
                                    <span><?= (int) ($st['sent'] ?? 0) ?> enviada<?= ($st['sent'] ?? 0) == 1 ? '' : 's' ?></span>
                                    <span><?= (int) ($st['received'] ?? 0) ?> recebida<?= ($st['received'] ?? 0) == 1 ? '' : 's' ?></span>
                                    <?php if ($mine): ?><span>visto <?= e(time_ago($f['last_seen_at'])) ?></span><?php endif; ?>
                                </p>
                            </div>
                            <div class="friend-actions">
                                <a class="btn btn-sm" href="nova.php?para=<?= (int) $f['id'] ?>"><?= icon('pen', 'ic-sm') ?>Escrever</a>
                                <details class="menu">
                                    <summary class="btn btn-sm btn-ghost btn-icon" aria-label="Mais ações"><?= icon('more') ?></summary>
                                    <div class="menu-list">
                                        <a href="index.php?aba=escritas&amp;para=<?= (int) $f['id'] ?>"><?= icon('mail', 'ic-sm') ?>Cartas para essa pessoa</a>
                                        <a href="amigos.php?apelido=<?= (int) $f['id'] ?>"><?= icon('user', 'ic-sm') ?>Dar um apelido</a>
                                        <?php if ($mine): ?>
                                            <a href="amigos.php?editar=<?= (int) $f['id'] ?>"><?= icon('pen', 'ic-sm') ?>Editar dados</a>
                                        <?php endif; ?>
                                        <form method="post">
                                            <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $f['id'] ?>">
                                            <?php if ($mine): ?>
                                                <button name="acao" value="nova_senha" data-confirm="Gerar uma senha nova para <?= e($f['display']) ?>? A antiga para de funcionar."><?= icon('lock', 'ic-sm') ?>Gerar senha nova</button>
                                                <button name="acao" value="excluir_conta" class="danger" data-confirm="Apagar a conta de <?= e($f['display']) ?>? Todas as cartas dela, enviadas e recebidas, somem. Não dá para desfazer."><?= icon('trash', 'ic-sm') ?>Apagar conta</button>
                                            <?php else: ?>
                                                <button name="acao" value="tirar" class="danger" data-confirm="Tirar <?= e($f['display']) ?> da sua lista? As cartas que vocês já trocaram continuam."><?= icon('x', 'ic-sm') ?>Tirar da lista</button>
                                            <?php endif; ?>
                                        </form>
                                    </div>
                                </details>
                            </div>
                        </article>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </section>
    </div>
</main>
<?php
page_foot();
