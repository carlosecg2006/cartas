<?php
declare(strict_types=1);

/** @var array $user */
$letters = q_all(
    "SELECT l.*,
        (SELECT COUNT(*) FROM replies p WHERE p.letter_id = l.id AND p.read_at IS NULL AND p.user_id <> ?) AS unread_replies
     FROM letters l WHERE l.recipient_id = ? AND l.status = 'sent' ORDER BY l.sent_at DESC",
    [(int) $user['id'], (int) $user['id']]
);
$new = 0;
foreach ($letters as $l) {
    if (!$l['first_opened_at'] && !letter_locked($l)) {
        $new++;
    }
}

page_head('Minhas cartas', ['body' => 'page-mailbox']);
?>
<main class="container" data-mailbox data-count="<?= count($letters) ?>">
    <section class="hero hero-center">
        <p class="eyebrow">Oi, <?= e(first_name($user['name'])) ?> <?= e($user['avatar'] ?: '🌷') ?></p>
        <h1>Sua caixinha de cartas</h1>
        <p class="muted mailbox-summary">
            <?php if (!$letters): ?>
                Ainda não chegou nada… mas fica de olho, algo pode chegar em breve ✨
            <?php elseif ($new): ?>
                Você tem <b><?= $new ?> carta<?= $new > 1 ? 's' : '' ?> nova<?= $new > 1 ? 's' : '' ?></b> esperando por você! 💌
            <?php else: ?>
                Você já leu todas as suas cartas. Que tal reler alguma? 🥹
            <?php endif; ?>
        </p>
    </section>

    <div class="new-letter-banner" hidden data-new-banner>
        💌 Chegou carta nova! <a href="index.php" class="btn btn-sm btn-primary">Ver agora</a>
    </div>

    <?php if (!$letters): ?>
        <div class="mailbox-empty">
            <div class="mailbox-post" aria-hidden="true">📭</div>
        </div>
    <?php else: ?>
        <div class="mailbox-grid">
            <?php foreach ($letters as $l):
                $content = json_decode($l['content'], true) ?: [];
                $env = $content['envelope'] ?? [];
                $locked = letter_locked($l);
                $state = $locked ? 'locked' : (!$l['first_opened_at'] ? 'new' : 'read');
                ?>
                <a class="mail-item mail-<?= $state ?>" href="carta.php?id=<?= (int) $l['id'] ?>"
                   style="--env: <?= e($env['color'] ?? '#e9b8b0') ?>; --seal: <?= e($env['sealColor'] ?? '#a8323e') ?>">
                    <div class="mail-env">
                        <div class="mail-flap"></div>
                        <span class="mail-seal"><?= e($env['seal'] ?? '❤') ?></span>
                        <span class="mail-stamp" aria-hidden="true"><?= $locked ? '⏳' : '💌' ?></span>
                        <span class="mail-to">Para <?= e(first_name($user['name'])) ?></span>
                    </div>
                    <div class="mail-info">
                        <strong><?= e($l['title'] ?: 'Uma carta') ?></strong>
                        <?php if ($locked): ?>
                            <span class="badge badge-scheduled">🔒 Abre em <span data-countdown="<?= e(iso($l['open_at'])) ?>"><?= e(fmt_date($l['open_at'])) ?></span></span>
                        <?php elseif ($state === 'new'): ?>
                            <span class="badge badge-new">Nova!</span>
                        <?php else: ?>
                            <span class="muted small">Lida <?= e(time_ago($l['last_opened_at'])) ?></span>
                        <?php endif; ?>
                        <?php if ($l['unread_replies']): ?>
                            <span class="badge badge-reply">💬 resposta nova</span>
                        <?php endif; ?>
                        <span class="muted small">Chegou <?= e(time_ago($l['sent_at'])) ?></span>
                    </div>
                </a>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</main>
<?php
page_foot();
