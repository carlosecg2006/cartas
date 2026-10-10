<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$letter = find_letter((int) ($_GET['id'] ?? 0));

if (!$letter || !can_view_letter($letter, $user)) {
    http_response_code(404);
    page_head('Carta não encontrada');
    echo '<main class="container narrow"><div class="empty">'
        . '<h1>Essa carta não está aqui</h1><p class="muted">Talvez ela não seja para você, ou ainda não foi enviada.</p>'
        . '<p><a class="btn" href="index.php">Voltar</a></p></div></main>';
    page_foot();
    exit;
}

$uid = (int) $user['id'];
$isSender = letter_role($letter, $user) === 'sender';
$seal = letter_seal($letter, $user);
$locked = $seal !== null;
if (!$locked) {
    mark_replies_read((int) $letter['id'], $user);
}
$toName = $letter['recipient_id'] ? name_for($uid, ['id' => $letter['recipient_id'], 'name' => $letter['recipient_name']]) : '…';
$fromName = name_for($uid, ['id' => $letter['sender_id'], 'name' => $letter['sender_name']]);

$content = $letter['content'];
$otherId = $isSender ? (int) $letter['recipient_id'] : (int) $letter['sender_id'];
$isFav = (bool) q_val('SELECT 1 FROM favorites WHERE user_id = ? AND letter_id = ?', [$uid, (int) $letter['id']]);
$data = [
    'id' => (int) $letter['id'],
    'title' => $letter['title'],
    'toName' => $isSender ? first_name($toName) : first_name($user['name']),
    'envelope' => $content['envelope'],
    'paperColor' => $content['paper']['color'],
    'locked' => $locked,
    'openAt' => iso($letter['open_at']),
    'sentAt' => $letter['status'] === 'sent' ? iso($letter['sent_at']) : null,
    'effect' => $content['effect'] ?? 'none',
    'isAdmin' => $isSender,
    'transit' => $seal === 'transit',
    'content' => $locked ? null : $content,
    'reactions' => $locked ? [] : letter_reactions((int) $letter['id']),
    'reactionChoices' => REACTION_EMOJIS,
    'replies' => $locked ? [] : array_map(fn($r) => reply_payload($r, $user), letter_replies((int) $letter['id'])),
];

page_head($letter['title'] ?: 'Carta', [
    'css' => ['assets/css/letter.css', 'assets/css/viewer.css'],
    'letter_fonts' => true,
    'body' => 'page-viewer',
]);
?>
<script type="application/json" id="letter-data"><?= json_embed($data) ?></script>
<div class="read-progress" data-progress hidden><span></span></div>
<main class="viewer" data-viewer>
    <?php if ($isSender): ?>
        <div class="preview-bar">
            <span class="preview-who"><?= icon('eye', 'ic-sm') ?><?= $letter['status'] === 'sent' ? 'Assim ' . e($toName) . ' vê esta carta' : 'Prévia do rascunho' ?></span>
            <span class="muted small">
                <?php if ($letter['status'] !== 'sent'): ?>
                    Ainda não enviada
                <?php elseif (letter_in_transit($letter)): ?>
                    A caminho, chega em <?= e(fmt_date($letter['delivered_at'])) ?>
                <?php elseif ($letter['first_opened_at']): ?>
                    Aberta <?= (int) $letter['open_count'] ?>x. Primeira vez em <?= e(fmt_date($letter['first_opened_at'])) ?>, última <?= e(time_ago($letter['last_opened_at'])) ?>.
                <?php elseif (letter_locked($letter)): ?>
                    Lacrada até <?= e(fmt_date($letter['open_at'])) ?>
                <?php else: ?>
                    Entregue, ainda não aberta
                <?php endif; ?>
            </span>
            <a class="btn btn-sm" href="editor.php?id=<?= (int) $letter['id'] ?>"><?= icon('pen', 'ic-sm') ?>Editar</a>
        </div>
    <?php endif; ?>

    <section class="envelope-stage" data-envelope-stage>
        <p class="eyebrow"><?= $isSender ? ($data['sentAt'] ? 'Enviada em ' . e(fmt_date_long($letter['sent_at'])) : 'Rascunho') : 'De ' . e($fromName) . ($seal !== 'transit' ? ' · ' . e(fmt_date_long($letter['sent_at'])) : '') ?></p>
        <h1 class="stage-title"><?= $seal === 'transit' ? 'Uma carta está a caminho' : e($letter['title'] ?: 'Uma carta para você') ?></h1>
        <div class="envelope-holder" data-envelope></div>
        <p class="stage-hint" data-hint>
            <?php if ($seal === 'transit'): ?>
                O correio está trazendo. Chega em <?= e(fmt_date($letter['delivered_at'])) ?>.<br>
                <span class="countdown" data-countdown="<?= e(iso($letter['delivered_at'])) ?>" data-reload></span>
            <?php elseif ($seal === 'date'): ?>
                Lacrada até <?= e(fmt_date($letter['open_at'])) ?>.<br>
                <span class="countdown" data-countdown="<?= e(iso($letter['open_at'])) ?>" data-reload></span>
            <?php else: ?>
                Toque no selo para abrir
            <?php endif; ?>
        </p>
    </section>

    <section class="letter-stage" data-letter-stage hidden></section>

    <section class="after-letter" data-after hidden>
        <div class="after-block">
            <p class="after-title"><?= $isSender ? 'Reações' : 'O que essa carta te fez sentir?' ?></p>
            <div class="reaction-row" data-reactions></div>
        </div>

        <div class="after-block" id="respostas">
            <p class="after-title"><?= $isSender ? 'Conversa' : 'Escrever de volta' ?></p>
            <div class="reply-list" data-replies></div>
            <form class="reply-form" data-reply-form>
                <textarea name="message" rows="2" maxlength="2000" placeholder="<?= $isSender ? 'Responder…' : 'Um recado rápido de volta…' ?>" required></textarea>
                <button class="btn btn-primary"><?= icon('send', 'ic-sm') ?>Enviar</button>
            </form>
        </div>

        <?php if (!$isSender): ?>
            <form class="reply-letter" method="post" action="acoes.php">
                <?= csrf_field() ?>
                <input type="hidden" name="acao" value="responder">
                <input type="hidden" name="id" value="<?= (int) $letter['id'] ?>">
                <div>
                    <p class="after-title">Responder com uma carta</p>
                    <p class="muted small">Abre o editor com <?= e(first_name($fromName)) ?> como destinatário.</p>
                </div>
                <button class="btn btn-primary"><?= icon('pen', 'ic-sm') ?>Escrever resposta</button>
            </form>
        <?php endif; ?>

        <div class="export row center wrap">
            <button class="btn btn-ghost fav-btn" type="button" data-favorite aria-pressed="<?= $isFav ? 'true' : 'false' ?>"><svg class="ic" aria-hidden="true"><use href="assets/icons.svg#<?= $isFav ? 'star-fill' : 'star' ?>"></use></svg><span><?= $isFav ? 'Favorita' : 'Favoritar' ?></span></button>
            <?php if ($otherId && is_contact($uid, $otherId)): ?>
                <a class="btn btn-ghost" href="pessoa.php?id=<?= $otherId ?>"><?= icon('mail', 'ic-sm') ?>Cartas com <?= e(first_name($isSender ? $toName : $fromName)) ?></a>
            <?php endif; ?>
            <button class="btn btn-ghost" type="button" data-print><?= icon('printer') ?>Salvar em PDF</button>
            <button class="btn btn-ghost" type="button" data-save-image><?= icon('download') ?>Salvar imagem</button>
            <a class="btn btn-ghost" href="index.php"><?= icon('arrow-left') ?>Voltar</a>
        </div>
    </section>
</main>
<?php
page_foot(['assets/js/letter.js', 'assets/js/viewer.js']);
