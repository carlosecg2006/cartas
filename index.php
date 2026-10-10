<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$uid = (int) $user['id'];
$search = trim(mb_substr((string) ($_GET['q'] ?? ''), 0, 80));
$tab = $search !== '' ? 'busca' : (in_array($_GET['aba'] ?? '', ['escritas', 'favoritas'], true) ? $_GET['aba'] : 'recebidas');
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

// ---------- Favoritas e busca ----------
$favIds = array_map('intval', array_column(q_all('SELECT letter_id FROM favorites WHERE user_id = ?', [$uid]), 'letter_id'));

/** Cartas que eu posso ler agora: as que escrevi e as recebidas que já podem ser abertas. */
function readable_letters(int $uid, string $extraWhere = '', array $extraParams = []): array
{
    $rows = q_all(
        "SELECT l.*, s.name AS sender_name, s.avatar AS sender_avatar, s.color AS sender_color,
            r.name AS recipient_name, r.avatar AS recipient_avatar, r.color AS recipient_color
         FROM letters l LEFT JOIN users s ON s.id = l.sender_id LEFT JOIN users r ON r.id = l.recipient_id
         WHERE (l.sender_id = ? OR (l.recipient_id = ? AND l.status = 'sent' AND " . sql_delivered() . '))' . $extraWhere . '
         ORDER BY COALESCE(l.sent_at, l.updated_at) DESC',
        array_merge([$uid, $uid], $extraParams)
    );
    $out = [];
    foreach ($rows as $l) {
        $mine = (int) $l['sender_id'] === $uid;
        if (!$mine && letter_locked($l)) {
            continue; // lacrada: nem aparece na busca
        }
        $l['content'] = json_decode($l['content'], true) ?: [];
        $l['mine'] = $mine;
        $out[] = $l;
    }
    return $out;
}

/** Trecho do texto em volta do que foi buscado, com o termo marcado. */
function search_snippet(string $text, string $term): string
{
    $pos = mb_stripos($text, $term);
    if ($pos === false) {
        return e(mb_substr($text, 0, 120));
    }
    $start = max(0, $pos - 50);
    $piece = mb_substr($text, $start, 140);
    $at = mb_stripos($piece, $term);
    return ($start > 0 ? '…' : '') . e(mb_substr($piece, 0, $at)) . '<mark>' . e(mb_substr($piece, $at, mb_strlen($term))) . '</mark>'
        . e(mb_substr($piece, $at + mb_strlen($term))) . (mb_strlen($text) > $start + 140 ? '…' : '');
}

$results = [];
if ($tab === 'busca') {
    foreach (readable_letters($uid) as $l) {
        $other = $l['mine'] ? ($l['recipient_id'] ? $nameOf($l['recipient_id'], $l['recipient_name']) : '') : $nameOf($l['sender_id'], $l['sender_name']);
        $text = content_excerpt($l['content'], 100000);
        $hay = $l['title'] . ' ' . $other . ' ' . ($l['content']['envelope']['label'] ?? '') . ' ' . $text;
        if (mb_stripos($hay, $search) !== false) {
            $l['other'] = $other;
            $l['snippet'] = search_snippet(mb_stripos($text, $search) !== false ? $text : $l['title'], $search);
            $results[] = $l;
        }
    }
}
$favorites = [];
if ($tab === 'favoritas' && $favIds) {
    $favorites = readable_letters($uid, ' AND l.id IN (' . implode(',', $favIds) . ')');
    foreach ($favorites as &$f) {
        $f['other'] = $f['mine'] ? ($f['recipient_id'] ? $nameOf($f['recipient_id'], $f['recipient_name']) : '') : $nameOf($f['sender_id'], $f['sender_name']);
        $f['snippet'] = e(content_excerpt($f['content'], 130));
    }
    unset($f);
}

// ---------- Lembrete gentil: alguém da lista para quem você não escreve há tempo ----------
$reminder = null;
if ($tab === 'recebidas' && $contacts) {
    $lastSent = [];
    foreach (q_all("SELECT recipient_id, MAX(sent_at) AS last FROM letters WHERE sender_id = ? AND status = 'sent' GROUP BY recipient_id", [$uid]) as $r) {
        $lastSent[(int) $r['recipient_id']] = $r['last'];
    }
    $lastGot = [];
    foreach (q_all("SELECT sender_id, MAX(sent_at) AS last FROM letters WHERE recipient_id = ? AND status = 'sent' GROUP BY sender_id", [$uid]) as $r) {
        $lastGot[(int) $r['sender_id']] = $r['last'];
    }
    $candidates = [];
    foreach ($contacts as $c) {
        $last = $lastSent[(int) $c['id']] ?? null;
        $days = $last ? (int) floor((time() - strtotime($last)) / 86400) : null;
        if ($days !== null && $days < 45) {
            continue;
        }
        // nunca escreveu: só lembra se a pessoa já te escreveu, ou se está na lista há uma semana
        $since = q_val('SELECT created_at FROM contacts WHERE owner_id = ? AND contact_id = ?', [$uid, (int) $c['id']]);
        if ($days === null && empty($lastGot[(int) $c['id']]) && $since && strtotime((string) $since) > time() - 7 * 86400) {
            continue;
        }
        $candidates[] = $c + ['days' => $days, 'got' => $lastGot[(int) $c['id']] ?? null];
    }
    usort($candidates, fn($a, $b) => ($b['days'] ?? 9999) <=> ($a['days'] ?? 9999));
    $reminder = $candidates[0] ?? null;
}

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

/** Cartão de uma carta na busca ou nas favoritas (escrita por mim ou recebida). */
function found_item(array $l, array $user, bool $fav): void
{
    $href = $l['mine'] && $l['status'] !== 'sent' ? 'editor.php?id=' . (int) $l['id'] : 'carta.php?id=' . (int) $l['id'];
    $who = $l['mine']
        ? ['name' => $l['other'] ?: '?', 'avatar' => $l['recipient_avatar'], 'color' => $l['recipient_color']]
        : ['name' => $l['other'], 'avatar' => $l['sender_avatar'], 'color' => $l['sender_color']];
    ?>
    <a class="found-item" href="<?= e($href) ?>">
        <div class="mail-env" data-envelope="<?= envelope_json($l, first_name($l['mine'] ? ($l['other'] ?: '') : $user['name']), false) ?>"></div>
        <div class="found-info">
            <strong><?= e($l['title'] ?: 'Sem título') ?><?php if ($fav): ?> <span class="fav-dot" title="Favorita">★</span><?php endif; ?></strong>
            <span class="found-who"><?= avatar_html($who, 'xs') ?><?= $l['mine'] ? ($l['other'] !== '' ? 'para ' . e($l['other']) : 'sem destinatário') : 'de ' . e($l['other']) ?>
                <span class="muted">· <?= e(fmt_date($l['sent_at'] ?: $l['updated_at'], false)) ?></span><?= $l['status'] !== 'sent' ? ' <span class="tag tag-draft">Rascunho</span>' : '' ?></span>
            <p class="found-snippet"><?= $l['snippet'] ?></p>
        </div>
    </a>
    <?php
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

    <form class="search-bar" action="index.php" role="search">
        <?= icon('search', 'ic-sm') ?>
        <input type="search" name="q" value="<?= e($search) ?>" placeholder="Buscar nas suas cartas…" aria-label="Buscar cartas">
        <?php if ($search !== ''): ?><a class="search-clear" href="index.php" aria-label="Limpar busca"><?= icon('x', 'ic-sm') ?></a><?php endif; ?>
    </form>

    <div class="push-card" hidden data-push-prompt>
        <?= icon('bell') ?>
        <div><strong>Quer ser avisado(a) no celular quando chegar carta?</strong><span class="muted small">Dá para mudar quando quiser em Conta.</span></div>
        <button class="btn btn-sm btn-primary" type="button" data-push-enable>Ativar avisos</button>
        <button class="btn btn-sm btn-ghost btn-icon" type="button" data-push-dismiss aria-label="Agora não"><?= icon('x', 'ic-sm') ?></button>
    </div>

    <?php if ($reminder):
        $rname = first_name($reminder['display']);
        if ($reminder['days'] === null) {
            $rtext = $reminder['got'] ? $rname . ' já te escreveu e você ainda não mandou nenhuma carta de volta.' : 'Você ainda não escreveu para ' . $rname . '.';
        } elseif ($reminder['days'] >= 60) {
            $rtext = 'Faz ' . (int) floor($reminder['days'] / 30) . ' meses que você não escreve para ' . $rname . '.';
        } else {
            $rtext = 'Faz ' . $reminder['days'] . ' dias que você não escreve para ' . $rname . '.';
        }
        ?>
        <div class="reminder" hidden data-reminder="<?= (int) $reminder['id'] ?>-<?= date('Y-m') ?>">
            <?= avatar_html($reminder, 'sm') ?>
            <div><strong><?= e($rtext) ?></strong><span class="muted small">Um bilhete curto já faz o dia de alguém.</span></div>
            <a class="btn btn-sm" href="nova.php?para=<?= (int) $reminder['id'] ?>"><?= icon('pen', 'ic-sm') ?>Escrever</a>
            <button class="btn btn-sm btn-ghost btn-icon" type="button" data-reminder-dismiss aria-label="Agora não"><?= icon('x', 'ic-sm') ?></button>
        </div>
    <?php endif; ?>

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
        <div class="notice"><?= icon('users') ?><div>Sua lista está vazia. <a href="amigos.php">Convide</a> quem você quer escrever.</div></div>
    <?php endif; ?>

    <nav class="tabs" aria-label="Cartas">
        <a class="<?= $tab === 'recebidas' ? 'active' : '' ?>" href="index.php"><?= icon('inbox', 'ic-sm') ?>Recebidas <span class="count"><?= count($received) ?></span></a>
        <a class="<?= $tab === 'escritas' ? 'active' : '' ?>" href="index.php?aba=escritas"><?= icon('pen', 'ic-sm') ?><span>Escritas<span class="hide-sm"> por você</span></span> <span class="count"><?= (int) $wc['total'] ?></span></a>
        <a class="<?= $tab === 'favoritas' ? 'active' : '' ?>" href="index.php?aba=favoritas"><?= icon('star', 'ic-sm') ?>Favoritas <span class="count"><?= count($favIds) ?></span></a>
    </nav>

    <?php if ($tab === 'busca'): ?>
        <div class="section-title"><h2><?= count($results) ?> carta<?= count($results) === 1 ? '' : 's' ?> com “<?= e($search) ?>”</h2></div>
        <?php if (!$results): ?>
            <div class="empty"><p class="muted">Nada encontrado. Cartas lacradas só entram na busca depois de abertas.</p></div>
        <?php else: ?>
            <div class="found-list"><?php foreach ($results as $l) { found_item($l, $user, in_array((int) $l['id'], $favIds, true)); } ?></div>
        <?php endif; ?>

    <?php elseif ($tab === 'favoritas'): ?>
        <?php if (!$favorites): ?>
            <div class="empty">
                <h2>Nenhuma favorita ainda</h2>
                <p class="muted">Abra uma carta e toque na estrela para guardar aqui as que você quer reler sempre.</p>
            </div>
        <?php else: ?>
            <div class="found-list"><?php foreach ($favorites as $l) { found_item($l, $user, true); } ?></div>
        <?php endif; ?>

    <?php elseif ($tab === 'recebidas'): ?>
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
