<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$user = require_login();
$friends = contacts_of((int) $user['id']);
$para = (int) ($_GET['para'] ?? 0);
$suggested = is_string($_GET['modelo'] ?? null) ? $_GET['modelo'] : '';
$recipient = null;
foreach ($friends as $f) {
    if ((int) $f['id'] === $para) {
        $recipient = $f;
    }
}

$ai = ai_available();
$previews = [];
foreach (letter_templates() as $key => $tpl) {
    $previews[$key] = build_template($key, $recipient['display'] ?? 'Você', $user['name']);
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

    <form method="post" action="acoes.php" data-new-letter>
        <?= csrf_field() ?>
        <input type="hidden" name="acao" value="criar">

        <section class="card assistant">
            <div class="assistant-head">
                <div>
                    <h2>Me ajuda a escrever ✨</h2>
                    <p class="muted small">Responda o que quiser. <?= $ai ? 'A IA escreve o texto e você ajusta depois.' : 'Eu monto um rascunho com o estilo certo e trechos destacados para você completar.' ?></p>
                </div>
            </div>

            <div class="assistant-grid">
                <label>Para quem
                    <select name="para">
                        <option value="">Decidir depois</option>
                        <?php foreach ($friends as $f): ?>
                            <option value="<?= (int) $f['id'] ?>" <?= $para === (int) $f['id'] ? 'selected' : '' ?>><?= e($f['display']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
                <label>Ocasião
                    <select name="ocasiao">
                        <?php foreach (COMPOSE_OCCASIONS as $k => $label): ?>
                            <option value="<?= e($k) ?>" <?= $suggested === 'aniversario' && $k === 'aniversario' ? 'selected' : '' ?>><?= e($label) ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>
            </div>

            <fieldset class="chip-field">
                <legend>Relação</legend>
                <div class="chips">
                    <?php foreach (COMPOSE_RELATIONS as $k => $label): ?>
                        <label class="chip"><input type="radio" name="relacao" value="<?= e($k) ?>" <?= $k === 'amigo' ? 'checked' : '' ?>><span><?= e($label) ?></span></label>
                    <?php endforeach; ?>
                </div>
            </fieldset>

            <fieldset class="chip-field">
                <legend>Tom</legend>
                <div class="chips">
                    <?php foreach (COMPOSE_TONES as $k => [$label, $emoji]): ?>
                        <label class="chip"><input type="radio" name="tom" value="<?= e($k) ?>" <?= $k === 'sincero' ? 'checked' : '' ?>><span><?= e($emoji . ' ' . $label) ?></span></label>
                    <?php endforeach; ?>
                </div>
            </fieldset>

            <label>O que você quer dizer? <span class="muted small">(opcional, com as suas palavras)</span>
                <textarea name="sinto" rows="3" maxlength="800" placeholder="Ex.: que ela é minha parceira desde a escola, que sinto falta dos nossos cafés de sábado e que estou orgulhoso dela"></textarea>
            </label>

            <label>Trilha sonora <span class="muted small">(opcional: link do YouTube ou do Spotify)</span>
                <input name="trilha" inputmode="url" placeholder="https://youtu.be/… ou https://open.spotify.com/track/…" data-music-input>
                <small data-music-hint>A música começa quando a pessoa abrir o envelope.</small>
            </label>

            <div class="assistant-foot">
                <?php if ($ai): ?>
                    <label class="check"><input type="checkbox" name="ia" value="1" checked> Escrever o texto com IA</label>
                <?php endif; ?>
                <button class="btn btn-primary btn-lg" name="assistente" value="1" data-assistant-submit><?= icon('sparkle') ?>Criar minha carta</button>
            </div>
        </section>

        <div class="section-title tpl-title"><h2>Ou comece por um modelo</h2></div>
        <div class="tpl-grid">
            <?php foreach (letter_templates() as $key => $tpl): ?>
                <button class="tpl<?= $suggested === $key ? ' suggested' : '' ?>" name="modelo" value="<?= e($key) ?>">
                    <span class="tpl-preview" aria-hidden="true"><span class="tpl-preview-inner" data-tpl="<?= e($key) ?>" inert></span></span>
                    <strong><?= e($tpl['name']) ?></strong>
                    <span><?= e($tpl['hint']) ?></span>
                </button>
            <?php endforeach; ?>
        </div>
    </form>
</main>
<?php
page_foot(['assets/js/letter.js', 'assets/js/nova.js']);
