<?php
declare(strict_types=1);

/** @var array $user */
$letters = q_all(
    "SELECT l.*,
        (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id AND p.read_at IS NULL AND p.user_id <> ?) AS unread_replies
     FROM letters l WHERE l.recipient_id = ? AND l.status = 'sent' ORDER BY l.sent_at DESC",
    [(int) $user['id'], (int) $user['id']]
);

// Cartas "abra quando…" ficam numa seção própria
$regular = [];
$openWhen = [];
$new = 0;
foreach ($letters as $l) {
    $l['content'] = json_decode($l['content'], true) ?: [];
    if (!$l['first_opened_at'] && !letter_locked($l)) {
        $new++;
    }
    if (trim((string) ($l['content']['envelope']['label'] ?? '')) !== '' && !$l['first_opened_at']) {
        $openWhen[] = $l;
    } else {
        $regular[] = $l;
    }
}

function mail_item(array $l, array $user): void
{
    $env = $l['content']['envelope'] ?? [];
    $locked = letter_locked($l);
    $state = $locked ? 'locked' : (!$l['first_opened_at'] ? 'new' : 'read');
    $envelope = [
        'env' => $env,
        'to' => first_name($user['name']),
        'paper' => $l['content']['paper']['color'] ?? '#fffdf6',
        'sentAt' => iso($l['sent_at']),
        'locked' => $locked,
    ];
    ?>
    <a class="mail-item mail-<?= $state ?>" href="carta.php?id=<?= (int) $l['id'] ?>">
        <div class="mail-env" data-envelope="<?= e(json_encode($envelope, JSON_UNESCAPED_UNICODE)) ?>"></div>
        <div class="mail-info">
            <strong><?= e($l['title'] ?: 'Uma carta') ?></strong>
            <div class="tags">
                <?php if ($locked): ?>
                    <span class="tag tag-scheduled">Abre em <span data-countdown="<?= e(iso($l['open_at'])) ?>"><?= e(fmt_date($l['open_at'])) ?></span></span>
                <?php elseif ($state === 'new'): ?>
                    <span class="tag tag-new">Nova</span>
                <?php else: ?>
                    <span class="tag tag-read">Lida</span>
                <?php endif; ?>
                <?php if ($l['unread_replies']): ?><span class="tag tag-reply">Resposta nova</span><?php endif; ?>
            </div>
            <span class="muted small">Chegou <?= e(time_ago($l['sent_at'])) ?></span>
        </div>
    </a>
    <?php
}

page_head('Sua caixa', ['body' => 'page-mailbox', 'css' => ['assets/css/letter.css']]);
?>
<main class="container" data-mailbox data-count="<?= count($letters) ?>">
    <section class="page-head page-head-center">
        <p class="eyebrow">Correspondência de <?= e(first_name($user['name'])) ?></p>
        <h1>Sua caixa de <em>cartas</em></h1>
        <p>
            <?php if (!$letters): ?>
                Ainda não chegou nada. Volte daqui a pouco.
            <?php elseif ($new): ?>
                <?= $new === 1 ? 'Tem uma carta nova esperando você.' : 'Tem ' . $new . ' cartas novas esperando você.' ?>
            <?php else: ?>
                Tudo lido por enquanto. Reler também vale.
            <?php endif; ?>
        </p>
    </section>

    <div class="new-letter-banner" hidden data-new-banner>
        <?= icon('mail') ?>Chegou carta nova. <a href="index.php" class="btn btn-sm btn-primary">Ver agora</a>
    </div>

    <?php if (!$letters): ?>
        <div class="empty">
            <div class="empty-art" data-envelope="<?= e(json_encode(['env' => ['color' => '#e7d3bd', 'liner' => 'plain', 'seal' => '…', 'sealColor' => '#bdb2a4'], 'to' => '', 'sentAt' => null], JSON_UNESCAPED_UNICODE)) ?>"></div>
        </div>
    <?php endif; ?>

    <?php if ($openWhen): ?>
        <section class="mailbox-section">
            <div class="section-title"><h2>Abra quando…</h2><span class="muted small">Guarde para o momento certo</span></div>
            <div class="mailbox-grid">
                <?php foreach ($openWhen as $l) { mail_item($l, $user); } ?>
            </div>
        </section>
    <?php endif; ?>

    <?php if ($regular): ?>
        <section class="mailbox-section">
            <?php if ($openWhen): ?><div class="section-title"><h2>Cartas</h2></div><?php endif; ?>
            <div class="mailbox-grid">
                <?php foreach ($regular as $l) { mail_item($l, $user); } ?>
            </div>
        </section>
    <?php endif; ?>
</main>
<?php
page_foot(['assets/js/letter.js']);
