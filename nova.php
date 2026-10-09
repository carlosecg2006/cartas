<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$admin = require_admin();
$friends = q_all("SELECT id, name FROM users WHERE role = 'friend' ORDER BY name");
$para = (int) ($_GET['para'] ?? 0);
$recipient = null;
foreach ($friends as $f) {
    if ((int) $f['id'] === $para) {
        $recipient = $f;
    }
}

$previews = [];
foreach (letter_templates() as $key => $tpl) {
    $previews[$key] = build_template($key, $recipient['name'] ?? 'Mariana', $admin['name']);
}

page_head('Nova carta', ['css' => ['assets/css/letter.css'], 'letter_fonts' => true]);
?>
<script type="application/json" id="tpl-data"><?= json_embed($previews) ?></script>
<main class="container">
    <section class="page-head">
        <div>
            <p class="eyebrow">Nova carta</p>
            <h1>Por onde <em>começar?</em></h1>
            <p>Escolha um ponto de partida. Dá para mudar tudo depois: papel, letra, adesivos, envelope.</p>
        </div>
    </section>

    <form method="post" action="acoes.php">
        <?= csrf_field() ?>
        <input type="hidden" name="acao" value="criar">
        <?php if ($friends): ?>
            <div class="toolbar">
                <label class="tpl-to">
                    <span class="muted">Para</span>
                    <select name="para">
                        <option value="">Decidir depois</option>
                        <?php foreach ($friends as $f): ?>
                            <option value="<?= (int) $f['id'] ?>" <?= $para === (int) $f['id'] ? 'selected' : '' ?>><?= e($f['name']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
            </div>
        <?php endif; ?>
        <div class="tpl-grid">
            <?php foreach (letter_templates() as $key => $tpl): ?>
                <button class="tpl" name="modelo" value="<?= e($key) ?>">
                    <span class="tpl-preview"><span class="tpl-preview-inner" data-tpl="<?= e($key) ?>"></span></span>
                    <strong><?= e($tpl['name']) ?></strong>
                    <span><?= e($tpl['hint']) ?></span>
                </button>
            <?php endforeach; ?>
        </div>
    </form>
</main>
<?php
page_foot(['assets/js/letter.js', 'assets/js/nova.js']);
