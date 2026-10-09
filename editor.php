<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$admin = require_admin();
$letter = find_letter((int) ($_GET['id'] ?? 0));
if (!$letter) {
    flash('Carta não encontrada.', 'error');
    redirect('index.php');
}

$friends = q_all("SELECT id, name, avatar, color FROM users WHERE role = 'friend' ORDER BY name");
$data = [
    'letter' => [
        'id' => (int) $letter['id'],
        'title' => $letter['title'],
        'status' => $letter['status'],
        'recipientId' => $letter['recipient_id'] ? (int) $letter['recipient_id'] : null,
        'openAt' => $letter['open_at'] ? date('Y-m-d\TH:i', strtotime($letter['open_at'])) : '',
        'content' => sanitize_letter_content($letter['content']),
    ],
    'friends' => array_map(fn($f) => ['id' => (int) $f['id'], 'name' => first_name($f['name'])], $friends),
    'sender' => first_name($admin['name']),
    'today' => fmt_date_long(now()),
];

page_head('Editor', [
    'css' => ['assets/css/letter.css', 'assets/css/editor.css'],
    'letter_fonts' => true,
    'body' => 'page-editor',
    'nav' => false,
]);
?>
<script type="application/json" id="editor-data"><?= json_embed($data) ?></script>

<header class="editor-bar">
    <a class="btn btn-ghost btn-sm" href="index.php" title="Voltar para as cartas">←<span class="hide-sm"> Cartas</span></a>
    <input class="title-input" data-title maxlength="150" placeholder="Título (aparece no envelope)" aria-label="Título da carta">
    <span class="save-status" data-save-status>Salvo</span>
    <div class="bar-actions">
        <button class="btn btn-ghost btn-sm icon-btn" type="button" data-undo title="Desfazer (Ctrl+Z)">↶</button>
        <button class="btn btn-ghost btn-sm icon-btn" type="button" data-redo title="Refazer (Ctrl+Shift+Z)">↷</button>
        <a class="btn btn-ghost btn-sm" href="carta.php?id=<?= (int) $letter['id'] ?>" target="_blank" rel="noopener" data-preview title="Ver como o amigo vai ver">👁<span class="hide-sm"> Prévia</span></a>
        <button class="btn btn-primary btn-sm" type="button" data-open-send>
            ✉<span class="hide-sm"> <?= $letter['status'] === 'sent' ? 'Envio' : 'Enviar' ?></span>
        </button>
    </div>
</header>

<div class="editor-layout">
    <aside class="panel" data-panel>
        <nav class="panel-tabs" role="tablist">
            <button type="button" role="tab" data-tab="blocks" class="active"><span>＋</span>Blocos</button>
            <button type="button" role="tab" data-tab="stickers"><span>✨</span>Adesivos</button>
            <button type="button" role="tab" data-tab="paper"><span>📄</span>Papel</button>
            <button type="button" role="tab" data-tab="envelope"><span>✉</span>Envelope</button>
        </nav>
        <div class="panel-body" data-panel-body></div>
    </aside>

    <main class="canvas-area" data-canvas>
        <p class="canvas-tip hide-sm">Dica: digite <kbd>/</kbd> numa linha vazia para inserir blocos · selecione um texto para formatar · arraste os adesivos para onde quiser</p>
    </main>
</div>

<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden data-file>

<dialog class="send-dialog" data-send-dialog>
    <form method="dialog" class="send-form" data-send-form>
        <div class="send-step" data-send-step="choose">
            <h2>Para quem é esta carta?</h2>
            <?php if (!$friends): ?>
                <p class="muted">Você ainda não tem amigos cadastrados. <a href="amigos.php">Adicione alguém primeiro</a>.</p>
            <?php else: ?>
                <div class="friend-pick">
                    <?php foreach ($friends as $f): ?>
                        <label class="friend-option">
                            <input type="radio" name="recipient" value="<?= (int) $f['id'] ?>" <?= (int) $letter['recipient_id'] === (int) $f['id'] ? 'checked' : '' ?>>
                            <span class="friend-option-box"><?= avatar_html($f, 'md') ?><span><?= e(first_name($f['name'])) ?></span></span>
                        </label>
                    <?php endforeach; ?>
                </div>
                <p class="small muted">Só a pessoa escolhida vai ver esta carta.</p>
            <?php endif; ?>

            <label class="check"><input type="checkbox" data-schedule-toggle> ⏳ Só pode ser aberta a partir de uma data</label>
            <div class="schedule" data-schedule hidden>
                <input type="datetime-local" name="open_at" data-open-at>
                <p class="small muted">Até lá, a pessoa vê o envelope lacrado com uma contagem regressiva.</p>
            </div>

            <div class="send-preview" data-send-preview></div>

            <div class="row end">
                <button class="btn btn-ghost" value="cancel" type="button" data-close-send>Cancelar</button>
                <button class="btn btn-primary" type="submit" data-send-submit <?= $friends ? '' : 'disabled' ?>>Enviar carta ✉</button>
            </div>
        </div>
        <div class="send-step center" data-send-step="done" hidden>
            <div class="sent-anim" aria-hidden="true">💌</div>
            <h2 data-sent-title>Carta enviada!</h2>
            <p class="muted" data-sent-text></p>
            <div class="row center wrap">
                <a class="btn btn-ghost" href="carta.php?id=<?= (int) $letter['id'] ?>" data-sent-view>👁 Ver como vai aparecer</a>
                <a class="btn btn-primary" href="index.php">Voltar às cartas</a>
            </div>
        </div>
    </form>
</dialog>
<?php
page_foot(['assets/js/letter.js', 'assets/js/editor.js']);
