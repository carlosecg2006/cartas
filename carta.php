<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$isAdmin = $user['role'] === 'admin';
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

$locked = letter_locked($letter) && !$isAdmin;
if (!$locked) {
    mark_replies_read((int) $letter['id'], $user);
}

$content = $letter['content'];
$data = [
    'id' => (int) $letter['id'],
    'title' => $letter['title'],
    'toName' => $letter['recipient_name'] ? first_name($letter['recipient_name']) : '…',
    'envelope' => $content['envelope'],
    'paperColor' => $content['paper']['color'],
    'locked' => $locked,
    'openAt' => iso($letter['open_at']),
    'sentAt' => $letter['status'] === 'sent' ? iso($letter['sent_at']) : null,
    'effect' => $content['effect'] ?? 'none',
    'isAdmin' => $isAdmin,
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
    <?php if ($isAdmin): ?>
        <div class="preview-bar">
            <span class="preview-who"><?= icon('eye', 'ic-sm') ?><?= $letter['status'] === 'sent' ? 'Assim ' . e($data['toName']) . ' vê esta carta' : 'Prévia do rascunho' ?></span>
            <span class="muted small">
                <?php if ($letter['status'] !== 'sent'): ?>
                    Ainda não enviada
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
        <p class="eyebrow"><?= $data['sentAt'] ? 'Enviada em ' . e(fmt_date_long($letter['sent_at'])) : 'Rascunho' ?></p>
        <h1 class="stage-title"><?= e($letter['title'] ?: 'Uma carta para você') ?></h1>
        <div class="envelope-holder" data-envelope></div>
        <p class="stage-hint" data-hint>
            <?php if ($locked): ?>
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
            <p class="after-title"><?= $isAdmin ? 'Reações' : 'O que essa carta te fez sentir?' ?></p>
            <div class="reaction-row" data-reactions></div>
        </div>

        <div class="after-block" id="respostas">
            <p class="after-title"><?= $isAdmin ? 'Conversa' : 'Escrever de volta' ?></p>
            <div class="reply-list" data-replies></div>
            <form class="reply-form" data-reply-form>
                <textarea name="message" rows="2" maxlength="2000" placeholder="<?= $isAdmin ? 'Responder…' : 'Escreva algo de volta…' ?>" required></textarea>
                <button class="btn btn-primary"><?= icon('send', 'ic-sm') ?>Enviar</button>
            </form>
        </div>

        <div class="export row center wrap">
            <button class="btn btn-ghost" type="button" data-print><?= icon('printer') ?>Salvar em PDF</button>
            <button class="btn btn-ghost" type="button" data-save-image><?= icon('download') ?>Salvar imagem</button>
            <a class="btn btn-ghost" href="index.php"><?= icon('arrow-left') ?>Voltar</a>
        </div>
    </section>
</main>
<?php
page_foot(['assets/js/letter.js', 'assets/js/viewer.js']);
