<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$uid = (int) $user['id'];
$tab = ($_GET['aba'] ?? '') === 'escritas' ? 'escritas' : 'recebidas';
$contacts = contacts_of($uid);
$names = array_column($contacts, 'display', 'id');
$nameOf = fn($id, $fallback) => $names[(int) $id] ?? (string) $fallback;

// ---------- Recebidas ----------
$received = q_all(
    "SELECT l.*, s.name AS sender_name, s.avatar AS sender_avatar, s.color AS sender_color,
        (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id AND p.read_at IS NULL AND p.user_id <> ?) AS unread_replies
     FROM letters l LEFT JOIN users s ON s.id = l.sender_id
     WHERE l.recipient_id = ? AND l.status = 'sent' ORDER BY l.sent_at DESC",
    [$uid, $uid]
);
$transit = $openWhen = $inbox = [];
$newCount = 0;
foreach ($received as $l) {
    $l['content'] = json_decode($l['content'], true) ?: [];
    $l['from'] = $nameOf($l['sender_id'], $l['sender_name']);
    if (letter_in_transit($l)) {
        $transit[] = $l;
        continue;
    }
    if (!$l['first_opened_at'] && !letter_locked($l)) {
        $newCount++;
    }
    if (trim((string) ($l['content']['envelope']['label'] ?? '')) !== '' && !$l['first_opened_at']) {
        $openWhen[] = $l;
    } else {
        $inbox[] = $l;
    }
}

// ---------- Escritas ----------
$filterPerson = (int) ($_GET['para'] ?? 0);
$filterStatus = (string) ($_GET['status'] ?? '');
$where = ['l.sender_id = ?'];
$params = [$uid, $uid];
if ($filterPerson) {
    $where[] = 'l.recipient_id = ?';
    $params[] = $filterPerson;
}
$statusSql = ['draft' => "l.status = 'draft'", 'sent' => "l.status = 'sent'", 'unread' => "l.status = 'sent' AND l.first_opened_at IS NULL"];
if (isset($statusSql[$filterStatus])) {
    $where[] = $statusSql[$filterStatus];
}
$written = q_all(
    "SELECT l.*, u.name AS recipient_name, u.avatar, u.color,
        (SELECT GROUP_CONCAT(emoji) FROM reactions r WHERE r.letter_id = l.id) AS reaction_list,
        (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id) AS reply_count,
        (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id AND p.read_at IS NULL AND p.user_id <> ?) AS unread_replies
     FROM letters l LEFT JOIN users u ON u.id = l.recipient_id WHERE " . implode(' AND ', $where) . ' ORDER BY l.updated_at DESC',
    $params
);
$wc = q_one("SELECT COUNT(*) AS total,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft,
        SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent,
        SUM(CASE WHEN status = 'sent' AND first_opened_at IS NULL THEN 1 ELSE 0 END) AS unread
    FROM letters WHERE sender_id = ?" . ($filterPerson ? ' AND recipient_id = ?' : ''), $filterPerson ? [$uid, $filterPerson] : [$uid]);
$newReplies = (int) q_val('SELECT COUNT(*) FROM replies p JOIN letters l ON l.id = p.letter_id
    WHERE (l.sender_id = ? OR l.recipient_id = ?) AND p.read_at IS NULL AND p.user_id <> ?', [$uid, $uid, $uid]);

$birthdays = upcoming_birthdays($uid, 21);

function filter_url(array $changes): string
{
    $query = array_filter(array_merge(['aba' => 'escritas', 'para' => $_GET['para'] ?? '', 'status' => $_GET['status'] ?? ''], $changes));
    return 'index.php?' . http_build_query($query);
}

function envelope_json(array $l, string $to, bool $locked): string
{
    return e(json_encode([
        'env' => $l['content']['envelope'] ?? [],
        'to' => $to,
        'paper' => $l['content']['paper']['color'] ?? '#fffdf6',
        'sentAt' => $l['status'] === 'sent' ? iso($l['sent_at']) : null,
        'locked' => $locked,
    ], JSON_UNESCAPED_UNICODE));
}

function mail_item(array $l, array $user): void
{
    $transit = letter_in_transit($l);
    $locked = letter_locked($l);
    $state = $transit ? 'transit' : ($locked ? 'locked' : (!$l['first_opened_at'] ? 'new' : 'read'));
    ?>
    <a class="mail-item mail-<?= $state ?>" href="carta.php?id=<?= (int) $l['id'] ?>">
        <div class="mail-env" data-envelope="<?= envelope_json($l, first_name($user['name']), $transit || $locked) ?>"></div>
        <div class="mail-info">
            <strong><?= $transit ? 'Carta a caminho' : e($l['title'] ?: 'Uma carta') ?></strong>
            <span class="mail-from">de <?= e($l['from']) ?></span>
            <div class="tags">
                <?php if ($transit): ?>
                    <span class="tag tag-transit">Chega em <span data-countdown="<?= e(iso($l['delivered_at'])) ?>"><?= e(fmt_date($l['delivered_at'])) ?></span></span>
                <?php elseif ($locked): ?>
                    <span class="tag tag-scheduled">Abre em <span data-countdown="<?= e(iso($l['open_at'])) ?>"><?= e(fmt_date($l['open_at'])) ?></span></span>
                <?php elseif ($state === 'new'): ?>
                    <span class="tag tag-new">Nova</span>
                <?php else: ?>
                    <span class="tag tag-read">Lida</span>
                <?php endif; ?>
                <?php if ($l['unread_replies']): ?><span class="tag tag-reply">Resposta nova</span><?php endif; ?>
            </div>
        </div>
    </a>
    <?php
}

page_head('Cartas', ['body' => 'page-home', 'css' => ['assets/css/letter.css']]);
?>
<main class="container" data-mailbox data-count="<?= count($received) - count($transit) ?>">
    <section class="page-head">
        <div>
            <p class="eyebrow">Correspondência de <?= e(first_name($user['name'])) ?></p>
            <h1>Suas <em>cartas</em></h1>
            <p>
                <?php if ($newCount): ?>
                    <?= $newCount === 1 ? 'Tem uma carta nova esperando você.' : 'Tem ' . $newCount . ' cartas novas esperando você.' ?>
                <?php elseif ($transit): ?>
                    <?= count($transit) === 1 ? 'Tem uma carta a caminho.' : 'Tem ' . count($transit) . ' cartas a caminho.' ?>
                <?php else: ?>
                    Nada novo por enquanto.
                <?php endif; ?>
                <?php if ($newReplies): ?>
                    <a href="<?= e(filter_url([])) ?>"><?= $newReplies ?> resposta<?= $newReplies > 1 ? 's' : '' ?> nova<?= $newReplies > 1 ? 's' : '' ?>.</a>
                <?php endif; ?>
            </p>
        </div>
        <a class="btn btn-primary btn-lg" href="nova.php"><?= icon('plus') ?>Nova carta</a>
    </section>

    <?php if ($birthdays): ?>
        <section class="birthdays">
            <?php foreach ($birthdays as $b): ?>
                <div class="birthday">
                    <?= avatar_html($b, 'sm') ?>
                    <div>
                        <strong><?= $b['days_left'] === 0 ? 'Hoje é aniversário de ' . e($b['display']) . '!' : 'Aniversário de ' . e($b['display']) ?></strong>
                        <span class="muted small"><?= e(birthday_label($b['birthday'])) ?><?= $b['days_left'] > 0 ? ' · em ' . $b['days_left'] . ($b['days_left'] === 1 ? ' dia' : ' dias') : '' ?></span>
                    </div>
                    <a class="btn btn-sm" href="nova.php?para=<?= (int) $b['id'] ?>&amp;modelo=aniversario"><?= icon('pen', 'ic-sm') ?>Escrever</a>
                </div>
            <?php endforeach; ?>
        </section>
    <?php endif; ?>

    <?php if (!$contacts): ?>
        <div class="notice"><?= icon('users') ?><div>Sua lista está vazia. <a href="amigos.php">Crie o acesso</a> de quem você quer escrever.</div></div>
    <?php endif; ?>

    <nav class="tabs" aria-label="Cartas">
        <a class="<?= $tab === 'recebidas' ? 'active' : '' ?>" href="index.php"><?= icon('inbox', 'ic-sm') ?>Recebidas <span class="count"><?= count($received) ?></span></a>
        <a class="<?= $tab === 'escritas' ? 'active' : '' ?>" href="index.php?aba=escritas"><?= icon('pen', 'ic-sm') ?>Escritas por você <span class="count"><?= (int) $wc['total'] ?></span></a>
    </nav>

    <?php if ($tab === 'recebidas'): ?>
        <div class="new-letter-banner" hidden data-new-banner>
            <?= icon('mail') ?>Chegou carta nova. <a href="index.php" class="btn btn-sm btn-primary">Ver agora</a>
        </div>

        <?php if (!$received): ?>
            <div class="empty">
                <div class="empty-art" data-envelope="<?= e(json_encode(['env' => ['color' => '#e7d3bd', 'liner' => 'plain', 'seal' => '…', 'sealColor' => '#bdb2a4'], 'to' => '', 'sentAt' => null], JSON_UNESCAPED_UNICODE)) ?>"></div>
                <p class="muted">Ainda não chegou nada. Que tal escrever primeiro?</p>
            </div>
        <?php endif; ?>

        <?php foreach ([['A caminho', 'O correio está trazendo', $transit], ['Abra quando…', 'Guarde para o momento certo', $openWhen], ['Cartas', '', $inbox]] as [$title, $hint, $list]): ?>
            <?php if ($list): ?>
                <section class="mailbox-section">
                    <?php if (count(array_filter([$transit, $openWhen])) || $title !== 'Cartas'): ?>
                        <div class="section-title"><h2><?= e($title) ?></h2><?php if ($hint): ?><span class="muted small"><?= e($hint) ?></span><?php endif; ?></div>
                    <?php endif; ?>
                    <div class="mailbox-grid">
                        <?php foreach ($list as $l) { mail_item($l, $user); } ?>
                    </div>
                </section>
            <?php endif; ?>
        <?php endforeach; ?>

    <?php else: ?>
        <div class="toolbar">
            <div class="people" aria-label="Filtrar por situação">
                <?php foreach (['' => ['Todas', 'total'], 'draft' => ['Rascunhos', 'draft'], 'sent' => ['Enviadas', 'sent'], 'unread' => ['Não abertas', 'unread']] as $key => [$label, $col]): ?>
                    <a class="person all <?= $filterStatus === $key ? 'active' : '' ?>" href="<?= e(filter_url(['status' => $key])) ?>"><?= e($label) ?> <span class="count"><?= (int) $wc[$col] ?></span></a>
                <?php endforeach; ?>
            </div>
            <?php if (count($contacts) > 1): ?>
                <div class="people" aria-label="Filtrar por pessoa">
                    <a class="person all <?= !$filterPerson ? 'active' : '' ?>" href="<?= e(filter_url(['para' => ''])) ?>">Todo mundo</a>
                    <?php foreach ($contacts as $c): ?>
                        <a class="person <?= $filterPerson === (int) $c['id'] ? 'active' : '' ?>" href="<?= e(filter_url(['para' => $c['id']])) ?>"><?= avatar_html($c, 'xs') ?><?= e($c['display']) ?></a>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>

        <?php if (!$written): ?>
            <div class="empty">
                <h2>Nada por aqui</h2>
                <p class="muted">Quando você começar uma carta, ela aparece nesta mesa.</p>
                <a class="btn" href="nova.php"><?= icon('pen') ?>Começar uma carta</a>
            </div>
        <?php else: ?>
            <div class="letter-grid">
                <?php foreach ($written as $l):
                    $l['content'] = json_decode($l['content'], true) ?: [];
                    $locked = letter_locked($l);
                    $transit = $l['status'] === 'sent' && letter_in_transit($l);
                    $to = $l['recipient_id'] ? $nameOf($l['recipient_id'], $l['recipient_name']) : '';
                    ?>
                    <article class="letter-card">
                        <a class="lc-visual" href="editor.php?id=<?= (int) $l['id'] ?>" data-envelope="<?= envelope_json($l, first_name($to), $locked) ?>" aria-label="Editar <?= e($l['title']) ?>"></a>
                        <div class="lc-meta">
                            <div class="lc-title"><a href="editor.php?id=<?= (int) $l['id'] ?>"><?= e($l['title'] ?: 'Sem título') ?></a></div>
                            <p class="lc-excerpt"><?= e(content_excerpt($l['content'], 110)) ?></p>
                            <div class="lc-line">
                                <?php if ($l['recipient_id']): ?>
                                    <span class="lc-to"><?= avatar_html(['name' => $to, 'avatar' => $l['avatar'], 'color' => $l['color']], 'xs') ?><?= e($to) ?></span>
                                <?php endif; ?>
                                <?php if ($l['status'] === 'draft'): ?>
                                    <span class="tag tag-draft">Rascunho</span>
                                <?php elseif ($transit): ?>
                                    <span class="tag tag-transit">A caminho, chega em <?= e(fmt_date($l['delivered_at'])) ?></span>
                                <?php elseif ($locked): ?>
                                    <span class="tag tag-scheduled">Lacrada até <?= e(fmt_date($l['open_at'], false)) ?></span>
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
                                            <button name="acao" value="desenviar" data-confirm="A carta volta para os rascunhos e sai da caixa de <?= e($to) ?>. Continuar?"><?= icon('undo', 'ic-sm') ?>Voltar para rascunho</button>
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
    <?php endif; ?>
</main>
<?php
page_foot(['assets/js/letter.js']);
