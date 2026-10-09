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
$statusSql = [
    'draft' => "l.status = 'draft'",
    'sent' => "l.status = 'sent'",
    'unread' => "l.status = 'sent' AND l.first_opened_at IS NULL",
];
if (isset($statusSql[$filterStatus])) {
    $where[] = $statusSql[$filterStatus];
}
$sql = "SELECT l.*, u.name AS recipient_name, u.avatar, u.color,
            (SELECT GROUP_CONCAT(emoji) FROM reactions r WHERE r.letter_id = l.id) AS reaction_list,
            (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id) AS reply_count,
            (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id AND p.read_at IS NULL AND p.user_id <> ?) AS unread_replies
        FROM letters l LEFT JOIN users u ON u.id = l.recipient_id"
    . ($where ? ' WHERE ' . implode(' AND ', $where) : '')
    . ' ORDER BY l.updated_at DESC';
$letters = q_all($sql, array_merge([(int) $user['id']], $params));

$countParams = $filterFriend ? [$filterFriend] : [];
$countWhere = $filterFriend ? ' WHERE recipient_id = ?' : '';
$counts = q_one("SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN status = 'sent' AND first_opened_at IS NULL THEN 1 ELSE 0 END) AS unread
    FROM letters$countWhere", $countParams);
$newReplies = (int) q_val('SELECT COUNT(*) FROM replies WHERE read_at IS NULL AND user_id <> ?', [(int) $user['id']]);

function filter_url(array $changes): string
{
    $query = array_filter(array_merge(['para' => $_GET['para'] ?? '', 'status' => $_GET['status'] ?? ''], $changes));
    return 'index.php' . ($query ? '?' . http_build_query($query) : '');
}

page_head('Cartas', ['body' => 'page-admin', 'css' => ['assets/css/letter.css']]);
?>
<main class="container">
    <section class="page-head">
        <div>
            <p class="eyebrow">Escrivaninha de <?= e(first_name($user['name'])) ?></p>
            <h1>Suas <em>cartas</em></h1>
            <p>
                <?= (int) $counts['sent'] ?> enviada<?= (int) $counts['sent'] === 1 ? '' : 's' ?>,
                <?= (int) $counts['draft'] ?> em rascunho.
                <?php if ($newReplies): ?>
                    <a href="#cartas"><?= $newReplies ?> resposta<?= $newReplies > 1 ? 's' : '' ?> esperando você.</a>
                <?php endif; ?>
            </p>
        </div>
        <a class="btn btn-primary btn-lg" href="nova.php<?= $filterFriend ? '?para=' . $filterFriend : '' ?>"><?= icon('plus') ?>Nova carta</a>
    </section>

    <?php if (!$friends): ?>
        <div class="notice"><?= icon('users') ?><div>Ninguém na sua lista ainda. <a href="amigos.php">Adicione as pessoas</a> para quem você quer escrever.</div></div>
    <?php endif; ?>

    <nav class="tabs" id="cartas" aria-label="Filtrar por situação">
        <?php foreach (['' => ['Todas', 'total'], 'draft' => ['Rascunhos', 'draft'], 'sent' => ['Enviadas', 'sent'], 'unread' => ['Não abertas', 'unread']] as $key => [$label, $col]): ?>
            <a class="<?= $filterStatus === $key ? 'active' : '' ?>" href="<?= e(filter_url(['status' => $key])) ?>"><?= e($label) ?> <span class="count"><?= (int) $counts[$col] ?></span></a>
        <?php endforeach; ?>
    </nav>

    <?php if (count($friends) > 1): ?>
        <div class="toolbar">
            <div class="people" aria-label="Filtrar por pessoa">
                <a class="person all <?= !$filterFriend ? 'active' : '' ?>" href="<?= e(filter_url(['para' => ''])) ?>">Todo mundo</a>
                <?php foreach ($friends as $f): ?>
                    <a class="person <?= $filterFriend === (int) $f['id'] ? 'active' : '' ?>" href="<?= e(filter_url(['para' => $f['id']])) ?>">
                        <?= avatar_html($f, 'xs') ?><?= e(first_name($f['name'])) ?>
                    </a>
                <?php endforeach; ?>
            </div>
        </div>
    <?php endif; ?>

    <?php if (!$letters): ?>
        <div class="empty">
            <h2>Nada por aqui</h2>
            <p class="muted">Quando você começar uma carta, ela aparece nesta mesa.</p>
            <a class="btn" href="nova.php"><?= icon('pen') ?>Começar uma carta</a>
        </div>
    <?php else: ?>
        <div class="letter-grid">
            <?php foreach ($letters as $l):
                $content = json_decode($l['content'], true) ?: [];
                $locked = letter_locked($l);
                $envelope = [
                    'env' => $content['envelope'] ?? [],
                    'to' => $l['recipient_name'] ? first_name($l['recipient_name']) : '',
                    'paper' => $content['paper']['color'] ?? '#fffdf6',
                    'sentAt' => $l['status'] === 'sent' ? iso($l['sent_at']) : null,
                    'locked' => $locked,
                ];
                ?>
                <article class="letter-card">
                    <a class="lc-visual" href="editor.php?id=<?= (int) $l['id'] ?>" data-envelope="<?= e(json_encode($envelope, JSON_UNESCAPED_UNICODE)) ?>" aria-label="Editar <?= e($l['title']) ?>"></a>
                    <div class="lc-meta">
                        <div class="lc-title"><a href="editor.php?id=<?= (int) $l['id'] ?>"><?= e($l['title'] ?: 'Sem título') ?></a></div>
                        <p class="lc-excerpt"><?= e(content_excerpt($content, 110)) ?></p>
                        <div class="lc-line">
                            <?php if ($l['recipient_id']): ?>
                                <span class="lc-to"><?= avatar_html(['name' => $l['recipient_name'], 'avatar' => $l['avatar'], 'color' => $l['color']], 'xs') ?><?= e(first_name($l['recipient_name'])) ?></span>
                            <?php endif; ?>
                            <?php if ($l['status'] === 'draft'): ?>
                                <span class="tag tag-draft">Rascunho</span>
                            <?php elseif ($locked): ?>
                                <span class="tag tag-scheduled" title="Pode ser aberta a partir de <?= e(fmt_date($l['open_at'])) ?>">Lacrada até <?= e(fmt_date($l['open_at'], false)) ?></span>
                            <?php elseif ($l['first_opened_at']): ?>
                                <span class="tag tag-read" title="Aberta pela primeira vez em <?= e(fmt_date($l['first_opened_at'])) ?>">Lida <?= e(time_ago($l['last_opened_at'])) ?><?= $l['open_count'] > 1 ? ' · ' . (int) $l['open_count'] . 'x' : '' ?></span>
                            <?php else: ?>
                                <span class="tag tag-sent">Entregue, não aberta</span>
                            <?php endif; ?>
                            <?php if ($l['reaction_list']): ?><span class="lc-reactions"><?= e(str_replace(',', '', $l['reaction_list'])) ?></span><?php endif; ?>
                            <?php if ($l['reply_count']): ?>
                                <a href="carta.php?id=<?= (int) $l['id'] ?>#respostas" class="lc-replies <?= $l['unread_replies'] ? 'hot' : '' ?>"><?= icon('message', 'ic-sm') ?><?= (int) $l['reply_count'] ?></a>
                            <?php endif; ?>
                        </div>
                    </div>
                    <div class="lc-actions">
                        <a class="btn btn-sm btn-ghost" href="editor.php?id=<?= (int) $l['id'] ?>"><?= icon('pen', 'ic-sm') ?>Editar</a>
                        <a class="btn btn-sm btn-ghost" href="carta.php?id=<?= (int) $l['id'] ?>"><?= icon('eye', 'ic-sm') ?>Ver</a>
                        <details class="menu">
                            <summary class="btn btn-sm btn-ghost btn-icon" aria-label="Mais ações"><?= icon('more') ?></summary>
                            <div class="menu-list">
                                <form method="post" action="acoes.php">
                                    <?= csrf_field() ?><input type="hidden" name="id" value="<?= (int) $l['id'] ?>">
                                    <button name="acao" value="duplicar"><?= icon('copy', 'ic-sm') ?>Duplicar</button>
                                    <?php if ($l['status'] === 'sent'): ?>
                                        <button name="acao" value="desenviar" data-confirm="A carta volta para os rascunhos e sai da caixa de <?= e(first_name((string) $l['recipient_name'])) ?>. Continuar?"><?= icon('undo', 'ic-sm') ?>Voltar para rascunho</button>
                                    <?php endif; ?>
                                    <button name="acao" value="excluir" class="danger" data-confirm="Excluir esta carta para sempre?"><?= icon('trash', 'ic-sm') ?>Excluir</button>
                                </form>
                            </div>
                        </details>
                    </div>
                </article>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>
<?php
page_foot(['assets/js/letter.js']);
