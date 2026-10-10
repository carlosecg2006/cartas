<?php
declare(strict_types=1);

// Página de amizade: tudo o que duas pessoas já trocaram, em ordem
require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$uid = (int) $user['id'];
$person = null;
foreach (contacts_of($uid) as $c) {
    if ((int) $c['id'] === (int) ($_GET['id'] ?? 0)) {
        $person = $c;
    }
}
if (!$person) {
    http_response_code(404);
    page_head('Pessoa não encontrada');
    echo '<main class="container narrow"><div class="empty"><h1>Essa pessoa não está na sua lista</h1>'
        . '<p><a class="btn" href="amigos.php">Ver sua lista</a></p></div></main>';
    page_foot();
    exit;
}
$pid = (int) $person['id'];
$pname = first_name($person['display']);

$rows = q_all(
    "SELECT l.* FROM letters l WHERE l.status = 'sent' AND (
        (l.sender_id = ? AND l.recipient_id = ?) OR (l.sender_id = ? AND l.recipient_id = ? AND " . sql_delivered() . ')
     ) ORDER BY l.sent_at ASC',
    [$uid, $pid, $pid, $uid]
);
$letters = [];
$sent = $got = 0;
foreach ($rows as $l) {
    $l['content'] = json_decode($l['content'], true) ?: [];
    $l['mine'] = (int) $l['sender_id'] === $uid;
    $l['mine'] ? $sent++ : $got++;
    $letters[] = $l;
}
$favIds = array_map('intval', array_column(q_all('SELECT letter_id FROM favorites WHERE user_id = ?', [$uid]), 'letter_id'));
$first = $letters[0]['sent_at'] ?? null;
$days = $first ? max(0, (int) floor((time() - strtotime($first)) / 86400)) : 0;
$replies = (int) q_val('SELECT COUNT(*) FROM replies p JOIN letters l ON l.id = p.letter_id
    WHERE ((l.sender_id = ? AND l.recipient_id = ?) OR (l.sender_id = ? AND l.recipient_id = ?))', [$uid, $pid, $pid, $uid]);

// agrupa por mês para a linha do tempo
$byMonth = [];
foreach (array_reverse($letters) as $l) {
    $t = strtotime($l['sent_at']);
    $byMonth[ucfirst(MESES_LONGOS[(int) date('n', $t) - 1]) . ' de ' . date('Y', $t)][] = $l;
}

page_head($person['display'], ['body' => 'page-person', 'css' => ['assets/css/letter.css']]);
?>
<main class="container">
    <section class="person-hero">
        <div class="person-pair" aria-hidden="true">
            <?= avatar_html($user, 'xl') ?><span class="pair-line"></span><?= avatar_html($person, 'xl') ?>
        </div>
        <p class="eyebrow">Você e <?= e($pname) ?></p>
        <h1><?= $letters ? 'Trocando cartas <em>desde ' . e(MESES_LONGOS[(int) date('n', strtotime($first)) - 1] . ' de ' . date('Y', strtotime($first))) . '</em>' : 'Nenhuma carta <em>ainda</em>' ?></h1>
        <p class="muted">
            <?php if ($letters): ?>
                <?= $days === 0 ? 'Começou hoje.' : 'Há ' . $days . ($days === 1 ? ' dia' : ' dias') . '.' ?>
            <?php else: ?>
                Toda amizade por carta começa com a primeira.
            <?php endif; ?>
            <?php if ($person['nickname'] !== ''): ?> Você chama <?= e($person['name']) ?> de “<?= e($person['nickname']) ?>”.<?php endif; ?>
        </p>
        <dl class="person-stats">
            <div><dt>Você escreveu</dt><dd><?= $sent ?></dd></div>
            <div><dt><?= e($pname) ?> escreveu</dt><dd><?= $got ?></dd></div>
            <div><dt>Recados</dt><dd><?= $replies ?></dd></div>
            <?php if ($person['birthday']): ?>
                <div><dt>Aniversário</dt><dd class="dd-text"><?= e(birthday_label($person['birthday'])) ?></dd></div>
            <?php endif; ?>
        </dl>
        <div class="row wrap center">
            <a class="btn btn-primary" href="nova.php?para=<?= $pid ?>"><?= icon('pen') ?>Escrever para <?= e($pname) ?></a>
            <a class="btn btn-ghost" href="amigos.php?apelido=<?= $pid ?>"><?= icon('user', 'ic-sm') ?>Apelido</a>
        </div>
    </section>

    <?php if ($letters): ?>
        <section class="timeline">
            <?php foreach ($byMonth as $month => $list): ?>
                <h2 class="timeline-month"><?= e($month) ?></h2>
                <?php foreach ($list as $l):
                    $locked = !$l['mine'] && letter_locked($l);
                    ?>
                    <a class="tl-item <?= $l['mine'] ? 'tl-mine' : 'tl-theirs' ?>" href="carta.php?id=<?= (int) $l['id'] ?>">
                        <div class="mail-env" data-envelope="<?= e(json_encode([
                            'env' => $l['content']['envelope'] ?? [], 'to' => first_name($l['mine'] ? $person['display'] : $user['name']),
                            'paper' => $l['content']['paper']['color'] ?? '#fffdf6', 'sentAt' => iso($l['sent_at']), 'locked' => $locked,
                        ], JSON_UNESCAPED_UNICODE)) ?>"></div>
                        <div class="tl-info">
                            <span class="tl-dir"><?= $l['mine'] ? 'Você → ' . e($pname) : e($pname) . ' → você' ?> · <?= e(fmt_date($l['sent_at'], false)) ?></span>
                            <strong><?= e($l['title'] ?: 'Uma carta') ?><?= in_array((int) $l['id'], $favIds, true) ? ' <span class="fav-dot">★</span>' : '' ?></strong>
                            <?php if ($locked): ?>
                                <span class="tag tag-scheduled">Abre em <?= e(fmt_date($l['open_at'])) ?></span>
                            <?php else: ?>
                                <p class="found-snippet"><?= e(content_excerpt($l['content'], 120)) ?></p>
                            <?php endif; ?>
                        </div>
                    </a>
                <?php endforeach; ?>
            <?php endforeach; ?>
        </section>
    <?php endif; ?>
</main>
<?php
page_foot(['assets/js/letter.js']);
