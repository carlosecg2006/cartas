<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$errors = [];
$colors = ['#d9a5a0', '#e2b98f', '#d8c37e', '#a9c4a0', '#9fbfd6', '#b9a8d6', '#d6a3bd', '#9cc8bf', '#c97b84'];

$uid = (int) $user['id'];
$action = input('acao');
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    if ($action === 'perfil') {
        $name = trim(input('name'));
        if ($name === '' || mb_strlen($name) > 80) {
            $errors[] = 'Escreva seu nome.';
        } else {
            db_update('users', $uid, [
                'name' => $name,
                'avatar' => mb_substr(trim(input('avatar')), 0, 4),
                'color' => color_or(input('color'), $user['color']),
                'birthday' => parse_birthday(input('birthday')),
            ]);
            flash('Perfil atualizado.');
            redirect('conta.php');
        }
    } elseif ($action === 'senha') {
        if (!password_verify(input('current'), $user['password_hash'])) {
            $errors[] = 'A senha atual não confere.';
        } elseif (mb_strlen(input('new')) < 8) {
            $errors[] = 'A nova senha precisa de pelo menos 8 caracteres.';
        } elseif (input('new') !== input('confirm')) {
            $errors[] = 'A confirmação não é igual à nova senha.';
        } else {
            db_update('users', $uid, ['password_hash' => password_hash(input('new'), PASSWORD_DEFAULT)]);
            password_changed($uid, true); // os outros aparelhos saem
            flash('Senha alterada. Os outros aparelhos precisam entrar de novo.');
            redirect('conta.php');
        }
    } elseif ($action === 'movimento') {
        db_update('users', $uid, ['reduce_motion' => input('reduce') === '1' ? 1 : 0]);
        flash(input('reduce') === '1' ? 'Animações reduzidas.' : 'Animações completas.');
        redirect('conta.php#aparencia');
    } elseif ($action === 'sair_todos') {
        password_changed($uid, true);
        flash('Pronto: todos os outros aparelhos foram desconectados.');
        redirect('conta.php#privacidade');
    } elseif ($action === 'codigo') {
        if (!password_verify(input('senha_codigo'), $user['password_hash'])) {
            $errors[] = 'Digite sua senha atual para gerar um código novo.';
        } else {
            $_SESSION['recovery_code'] = new_recovery_code($uid);
            redirect('conta.php#recuperacao');
        }
    } elseif ($action === 'independente') {
        db_update('users', $uid, ['managed' => 0]);
        if (empty($user['recovery_hash'])) {
            $_SESSION['recovery_code'] = new_recovery_code($uid);
        }
        q("DELETE FROM invites WHERE kind = 'reset' AND user_id = ? AND used_at IS NULL", [$uid]);
        flash('Pronto: só você cuida da sua conta agora.');
        redirect('conta.php#privacidade');
    } elseif ($action === 'contato' && $user['role'] === 'admin') {
        $mail = trim(input('email'));
        if ($mail !== '' && !filter_var($mail, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Esse e-mail não parece válido.';
        } else {
            set_setting('contact_email', $mail);
            flash('Contato do site salvo.');
            redirect('conta.php#site');
        }
    } elseif ($action === 'apagar') {
        if (!password_verify(input('senha_apagar'), $user['password_hash'])) {
            $errors[] = 'Para apagar a conta, digite sua senha atual.';
        } elseif (input('confirmo') !== 'APAGAR') {
            $errors[] = 'Escreva APAGAR (em maiúsculas) para confirmar.';
        } else {
            delete_account($uid, input('manter') === '1');
            logout_user();
            flash('Sua conta foi apagada. Obrigado por ter escrito por aqui.');
            redirect('login.php');
        }
    }
}

$recoveryCode = $_SESSION['recovery_code'] ?? null;
unset($_SESSION['recovery_code']);
$user = find_user($uid);
$creator = !empty($user['created_by']) ? find_user((int) $user['created_by']) : null;
$managedBy = (int) ($user['managed'] ?? 0) === 1 && $creator ? $creator : null;
$usage = q_one('SELECT COUNT(*) AS n, COALESCE(SUM(size), 0) AS bytes FROM media WHERE user_id = ?', [$uid]);
$counts = q_one("SELECT SUM(CASE WHEN sender_id = ? THEN 1 ELSE 0 END) AS written, SUM(CASE WHEN recipient_id = ? AND status = 'sent' THEN 1 ELSE 0 END) AS received FROM letters WHERE sender_id = ? OR recipient_id = ?", [$uid, $uid, $uid, $uid]);

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
                                <input type="radio" name="color" aria-label="<?= e(color_label($c)) ?>" value="<?= e($c) ?>" <?= $user['color'] === $c ? 'checked' : '' ?>>
                                <span></span>
                            </label>
                        <?php endforeach; ?>
                    </div>
                </fieldset>
            </div>
            <button class="btn btn-primary">Salvar perfil</button>
        </form>
    </section>

    <section class="card" style="margin-top:1.2rem" id="aparencia">
        <h2>Aparência</h2>
        <p class="muted small">O tema fica salvo neste aparelho.</p>
        <div class="theme-choice" role="radiogroup" aria-label="Tema">
            <label><input type="radio" name="theme" value="auto" data-theme-choice><span><?= icon('sparkle') ?>Automático</span></label>
            <label><input type="radio" name="theme" value="light" data-theme-choice><span><?= icon('sun') ?>Claro</span></label>
            <label><input type="radio" name="theme" value="dark" data-theme-choice><span><?= icon('moon') ?>Escuro</span></label>
        </div>
        <form method="post" class="row wrap motion-form">
            <?= csrf_field() ?>
            <input type="hidden" name="acao" value="movimento">
            <div>
                <strong>Reduzir animações</strong>
                <p class="muted small">Envelope abre na hora, sem confete nem texto sendo escrito. Vale em todos os seus aparelhos.</p>
            </div>
            <button class="btn btn-sm" name="reduce" value="<?= (int) $user['reduce_motion'] === 1 ? '0' : '1' ?>"><?= (int) $user['reduce_motion'] === 1 ? 'Ligado · desligar' : 'Ligar' ?></button>
        </form>
    </section>

    <section class="card push-panel" style="margin-top:1.2rem" id="avisos" data-push-panel>
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

    <section class="card" style="margin-top:1.2rem" id="senha">
        <h2>Trocar senha</h2>
        <form method="post" class="form">
            <?= csrf_field() ?>
            <input type="hidden" name="acao" value="senha">
            <label>Senha atual <input type="password" name="current" required autocomplete="current-password"></label>
            <label>Nova senha (mínimo 8 caracteres) <input type="password" name="new" required minlength="8" autocomplete="new-password"></label>
            <label>Repita a nova senha <input type="password" name="confirm" required minlength="8" autocomplete="new-password"></label>
            <button class="btn btn-primary">Salvar nova senha</button>
        </form>
    </section>

    <section class="card" style="margin-top:1.2rem" id="recuperacao">
        <h2>Código de recuperação</h2>
        <?php if ($recoveryCode): ?>
            <div class="recovery-box" data-recovery>
                <p><b>Guarde este código agora.</b> Ele é a única forma de voltar a entrar se você esquecer a senha, e não aparece de novo.</p>
                <code class="recovery-code" data-copy-source><?= e($recoveryCode) ?></code>
                <div class="row wrap">
                    <button class="btn btn-primary btn-sm" type="button" data-copy><?= icon('copy', 'ic-sm') ?>Copiar</button>
                    <a class="btn btn-sm" download="codigo-recuperacao-<?= e($user['username']) ?>.txt" href="data:text/plain;charset=utf-8,<?= e(rawurlencode(app_name() . "\nUsuário: " . $user['username'] . "\nCódigo de recuperação: " . $recoveryCode . "\nUse em: " . base_url() . "recuperar.php\n")) ?>"><?= icon('download', 'ic-sm') ?>Baixar em arquivo</a>
                </div>
                <p class="small muted">Dica: tire um print ou salve num lugar seguro (não mande para ninguém).</p>
                <?php if (isset($_GET['novo'])): ?><a class="btn btn-block" href="index.php">Já guardei, ir para minhas cartas</a><?php endif; ?>
            </div>
        <?php else: ?>
            <p class="muted small"><?= !empty($user['recovery_hash'])
                ? 'Você já tem um código guardado. Gerar um novo invalida o anterior.'
                : 'Você ainda não tem um código. Sem ele, se esquecer a senha, ninguém consegue recuperar sua conta.' ?></p>
            <form method="post" class="row wrap">
                <?= csrf_field() ?>
                <input type="hidden" name="acao" value="codigo">
                <input type="password" name="senha_codigo" required placeholder="Sua senha atual" autocomplete="current-password" aria-label="Sua senha atual" class="grow">
                <button class="btn <?= empty($user['recovery_hash']) ? 'btn-primary' : '' ?>"><?= empty($user['recovery_hash']) ? 'Criar código' : 'Gerar código novo' ?></button>
            </form>
        <?php endif; ?>
    </section>

    <section class="card" style="margin-top:1.2rem" id="privacidade">
        <h2>Privacidade e seus dados</h2>
        <ul class="privacy-facts">
            <li>Você escreveu <b><?= (int) $counts['written'] ?></b> carta<?= (int) $counts['written'] === 1 ? '' : 's' ?> e recebeu <b><?= (int) $counts['received'] ?></b>.</li>
            <li>Sua biblioteca tem <?= (int) $usage['n'] ?> arquivo<?= (int) $usage['n'] === 1 ? '' : 's' ?> (<?= e(number_format($usage['bytes'] / 1048576, 1, ',', '.')) ?> MB de <?= USER_STORAGE_MB ?> MB).</li>
            <?php if (!empty($user['pw_reset_at'])): ?><li>Sua senha foi trocada por um link de senha nova em <?= e(fmt_date($user['pw_reset_at'])) ?>.</li><?php endif; ?>
        </ul>
        <?php if ($managedBy): ?>
            <form method="post" class="notice-inline">
                <?= csrf_field() ?>
                <input type="hidden" name="acao" value="independente">
                <p><?= e(first_name($managedBy['name'])) ?> criou seu acesso e ainda pode gerar um link de senha nova para você (útil se você esquecer a senha).</p>
                <button class="btn btn-sm" data-confirm="Depois disso, se você esquecer a senha, ninguém consegue recuperar a conta. Continuar?">Só eu cuido da minha conta</button>
            </form>
        <?php endif; ?>
        <div class="row wrap">
            <a class="btn" href="exportar.php"><?= icon('download') ?>Baixar todas as minhas cartas</a>
            <form method="post">
                <?= csrf_field() ?>
                <button class="btn btn-ghost" name="acao" value="sair_todos" data-confirm="Desconectar todos os outros celulares e computadores?">Sair de todos os outros aparelhos</button>
            </form>
        </div>
        <p class="small muted">Leia <a href="privacidade.php">como seus dados são guardados</a>.</p>

        <details class="more-options danger-zone" <?= $action === 'apagar' && $errors ? 'open' : '' ?>>
            <summary>Apagar minha conta</summary>
            <form method="post" class="form">
                <?= csrf_field() ?>
                <input type="hidden" name="acao" value="apagar">
                <p class="small">Isso não dá para desfazer. Antes, se quiser, <a href="exportar.php">baixe suas cartas</a>.</p>
                <ul class="small muted">
                    <li>As cartas que outras pessoas escreveram para você voltam para elas, como rascunho.</li>
                    <li>Suas fotos, áudios, recados e reações são apagados.</li>
                </ul>
                <fieldset>
                    <legend>E as cartas que você enviou?</legend>
                    <label class="check"><input type="radio" name="manter" value="0" checked> Apagar também (somem da caixa de quem recebeu)</label>
                    <label class="check"><input type="radio" name="manter" value="1"> Deixar com quem recebeu, como lembrança</label>
                </fieldset>
                <label>Sua senha <input type="password" name="senha_apagar" required autocomplete="current-password"></label>
                <label>Escreva APAGAR para confirmar <input name="confirmo" required autocomplete="off" autocapitalize="characters"></label>
                <button class="btn btn-danger">Apagar minha conta para sempre</button>
            </form>
        </details>
    </section>

    <?php if ($user['role'] === 'admin'): ?>
        <section class="card" style="margin-top:1.2rem" id="site">
            <h2>Sobre o site</h2>
            <p class="muted small">Você instalou o site. Este e-mail aparece na página de privacidade, para as pessoas pedirem coisas sobre os dados delas, e ajuda os avisos do iPhone a funcionarem.</p>
            <form method="post" class="row wrap">
                <?= csrf_field() ?>
                <input type="hidden" name="acao" value="contato">
                <input type="email" name="email" class="grow" placeholder="seu-email@exemplo.com" value="<?= e(site_contact()['email']) ?>" aria-label="E-mail de contato do site">
                <button class="btn">Salvar</button>
            </form>
        </section>
    <?php endif; ?>

    <form method="post" action="logout.php" class="row center" style="margin-top:1.5rem">
        <?= csrf_field() ?>
        <button class="btn btn-ghost"><?= icon('logout') ?>Sair da conta</button>
    </form>
</main>
<?php
page_foot();
