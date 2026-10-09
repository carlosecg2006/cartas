<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();

if ($user['role'] !== 'admin') {
    require APP_DIR . '/views/mailbox.php';
    exit;
}

// ---------- Painel do remetente ----------
$friends = q_all("SELECT * FROM users WHERE role = 'friend' ORDER BY name");
$filterFriend = (int) ($_GET['para'] ?? 0);
$filterStatus = (string) ($_GET['status'] ?? '');

$where = [];
$params = [];
if ($filterFriend) {
    $where[] = 'l.recipient_id = ?';
    $params[] = $filterFriend;
}
if ($filterStatus === 'draft') {
    $where[] = "l.status = 'draft'";
} elseif ($filterStatus === 'sent') {
    $where[] = "l.status = 'sent'";
} elseif ($filterStatus === 'unread') {
    $where[] = "l.status = 'sent' AND l.first_opened_at IS NULL";
}
$sql = "SELECT l.*, u.name AS recipient_name, u.avatar, u.color,
            (SELECT GROUP_CONCAT(emoji) FROM reactions r WHERE r.letter_id = l.id) AS reaction_list,
            (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id) AS reply_count,
            (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id AND p.read_at IS NULL AND p.user_id <> ?) AS unread_replies
        FROM letters l LEFT JOIN users u ON u.id = l.recipient_id"
    . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
    . ' ORDER BY l.updated_at DESC';
$letters = q_all($sql, array_merge([(int) $user['id']], $params));

$stats = q_one("SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts,
        SUM(CASE WHEN status = 'sent' AND first_opened_at IS NOT NULL THEN 1 ELSE 0 END) AS opened
    FROM letters");
$newReplies = (int) q_val('SELECT COUNT(*) FROM replies WHERE read_at IS NULL AND user_id <> ?', [(int) $user['id']]);

function filter_url(array $changes): string
{
    $query = array_filter(array_merge(['para' => $_GET['para'] ?? '', 'status' => $_GET['status'] ?? ''], $changes));
    return 'index.php' . ($query ? '?' . http_build_query($query) : '');
}

page_head('Cartas', ['body' => 'page-admin']);
?>
<main class="container">
    <section class="hero">
        <div>
            <p class="eyebrow">Olá, <?= e(first_name($user['name'])) ?> ✍️</p>
            <h1>Suas cartas</h1>
            <p class="muted">
                <?= (int) $stats['sent'] ?> enviadas · <?= (int) $stats['drafts'] ?> rascunhos · <?= (int) $stats['opened'] ?> já lidas
                <?php if ($newReplies): ?> · <a class="pill pill-hot" href="#cartas"><?= $newReplies ?> resposta<?= $newReplies > 1 ? 's' : '' ?> nova<?= $newReplies > 1 ? 's' : '' ?> 💬</a><?php endif; ?>
            </p>
        </div>
        <form method="post" action="acoes.php">
            <?= csrf_field() ?>
            <input type="hidden" name="acao" value="criar">
            <?php if ($filterFriend): ?><input type="hidden" name="para" value="<?= $filterFriend ?>"><?php endif; ?>
            <button class="btn btn-primary btn-lg"><span aria-hidden="true">＋</span> Criar nova carta</button>
        </form>
    </section>

    <?php if (!$friends): ?>
        <div class="callout-box">
            <span class="callout-emoji">👋</span>
            <div>Você ainda não adicionou ninguém. <a href="amigos.php">Adicione seus amigos</a> para poder enviar cartas para eles.</div>
        </div>
    <?php endif; ?>

    <div class="filters" id="cartas">
        <div class="chips">
            <a class="chip <?= !$filterFriend ? 'active' : '' ?>" href="<?= e(filter_url(['para' => ''])) ?>">Todos</a>
            <?php foreach ($friends as $f): ?>
                <a class="chip <?= $filterFriend === (int) $f['id'] ? 'active' : '' ?>" href="<?= e(filter_url(['para' => $f['id']])) ?>">
                    <?= avatar_html($f, 'xs') ?> <?= e(first_name($f['name'])) ?>
                </a>
            <?php endforeach; ?>
        </div>
        <div class="chips">
            <?php foreach (['' => 'Todas', 'draft' => 'Rascunhos', 'sent' => 'Enviadas', 'unread' => 'Ainda não lidas'] as $key => $label): ?>
                <a class="chip chip-soft <?= $filterStatus === $key ? 'active' : '' ?>" href="<?= e(filter_url(['status' => $key])) ?>"><?= e($label) ?></a>
            <?php endforeach; ?>
        </div>
    </div>

    <?php if (!$letters): ?>
        <div class="empty">
            <div class="empty-icon">🕊️</div>
            <h2>Nenhuma carta por aqui</h2>
            <p class="muted">Que tal escrever a primeira?</p>
        </div>
    <?php else: ?>
        <div class="letter-grid">
            <?php foreach ($letters as $l):
                $content = json_decode($l['content'], true) ?: [];
                $envColor = $content['envelope']['color'] ?? '#e9b8b0';
                $paperColor = $content['paper']['color'] ?? '#fffdf6';
                $locked = letter_locked($l);
                ?>
                <article class="letter-card">
                    <a class="letter-card-preview" href="editor.php?id=<?= (int) $l['id'] ?>" style="--env: <?= e($envColor) ?>; --paper: <?= e($paperColor) ?>">
                        <div class="lc-paper">
                            <strong><?= e($l['title'] ?: 'Sem título') ?></strong>
                            <p><?= e(content_excerpt($content, 120)) ?: '<em>Carta em branco</em>' ?></p>
                        </div>
                        <div class="lc-env"></div>
                    </a>
                    <div class="letter-card-body">
                        <div class="lc-to">
                            <?php if ($l['recipient_id']): ?>
                                <?= avatar_html(['name' => $l['recipient_name'], 'avatar' => $l['avatar'], 'color' => $l['color']], 'sm') ?>
                                <span>Para <b><?= e(first_name($l['recipient_name'])) ?></b></span>
                            <?php else: ?>
                                <span class="avatar avatar-sm avatar-empty">?</span><span class="muted">Sem destinatário</span>
                            <?php endif; ?>
                        </div>
                        <div class="lc-status">
                            <?php if ($l['status'] === 'draft'): ?>
                                <span class="badge badge-draft">Rascunho</span>
                            <?php elseif ($locked): ?>
                                <span class="badge badge-scheduled">⏳ Abre em <?= e(fmt_date($l['open_at'])) ?></span>
                            <?php elseif ($l['first_opened_at']): ?>
                                <span class="badge badge-read" title="Primeira leitura: <?= e(fmt_date($l['first_opened_at'])) ?>">✓✓ Lida <?= (int) $l['open_count'] ?>x · <?= e(time_ago($l['last_opened_at'])) ?></span>
                            <?php else: ?>
                                <span class="badge badge-sent">✉ Enviada · ainda não aberta</span>
                            <?php endif; ?>
                        </div>
                        <?php if ($l['reaction_list'] || $l['reply_count']): ?>
                            <div class="lc-feedback">
                                <?php if ($l['reaction_list']): ?><span class="lc-reactions"><?= e(str_replace(',', ' ', $l['reaction_list'])) ?></span><?php endif; ?>
                                <?php if ($l['reply_count']): ?>
                                    <a href="carta.php?id=<?= (int) $l['id'] ?>#respostas" class="lc-replies <?= $l['unread_replies'] ? 'hot' : '' ?>">
                                        💬 <?= (int) $l['reply_count'] ?><?= $l['unread_replies'] ? ' · ' . (int) $l['unread_replies'] . ' nova' . ($l['unread_replies'] > 1 ? 's' : '') : '' ?>
                                    </a>
                                <?php endif; ?>
                            </div>
                        <?php endif; ?>
                        <div class="lc-actions">
                            <a class="btn btn-sm" href="editor.php?id=<?= (int) $l['id'] ?>">✏️ Editar</a>
                            <a class="btn btn-sm btn-ghost" href="carta.php?id=<?= (int) $l['id'] ?>">👁 Ver</a>
                            <details class="menu">
                                <summary class="btn btn-sm btn-ghost" aria-label="Mais ações">⋯</summary>
                                <div class="menu-list">
                                    <form method="post" action="acoes.php">
                                        <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $l['id'] ?>">
                                        <button name="acao" value="duplicar">📄 Duplicar</button>
                                        <?php if ($l['status'] === 'sent'): ?>
                                            <button name="acao" value="desenviar" data-confirm="A carta volta a ser rascunho e some da caixa de <?= e(first_name((string) $l['recipient_name'])) ?>. Continuar?">↩️ Voltar para rascunho</button>
                                        <?php endif; ?>
                                        <button name="acao" value="excluir" class="danger" data-confirm="Excluir esta carta para sempre? Não dá para desfazer.">🗑 Excluir</button>
                                    </form>
                                </div>
                            </details>
                        </div>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>
<?php
page_foot();
