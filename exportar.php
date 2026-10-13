<?php
declare(strict_types=1);

// Baixar todas as minhas cartas (LGPD: portabilidade e acesso aos próprios dados)
require __DIR__ . '/app/bootstrap.php';
require APP_DIR . '/export.php';

$user = require_login();
$uid = (int) $user['id'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    session_write_close();
    @set_time_limit(120);
    $withMedia = input('arquivos') === '1' && class_exists('ZipArchive');
    $letters = export_letters($uid);
    $base = 'cartas-' . slugify_username(first_name($user['name'])) . '-' . date('Y-m-d');

    if (!class_exists('ZipArchive')) {
        // Sem ZIP na hospedagem: um único HTML com os textos
        header('Content-Type: text/html; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $base . '.html"');
        echo export_index_html($user, $letters);
        exit;
    }
    $tmp = ROOT . '/storage/export-' . bin2hex(random_bytes(8)) . '.zip';
    $zip = new ZipArchive();
    if ($zip->open($tmp, ZipArchive::CREATE) !== true) {
        throw new RuntimeException('Não consegui montar o arquivo.');
    }
    $zip->addFromString($base . '/abrir-aqui.html', export_index_html($user, $letters));
    $zip->addFromString($base . '/cartas.json', export_json($user, $letters));
    if ($withMedia) {
        $files = [];
        foreach ($letters as $l) {
            foreach (content_media($l['content']) as $f) {
                $files[$f] = true;
            }
        }
        foreach (array_keys($files) as $f) {
            $path = UPLOAD_DIR . '/' . $f;
            if (preg_match(ANY_MEDIA_RE, $f) && is_file($path)) {
                $zip->addFile($path, $base . '/arquivos/' . $f);
                // fotos e áudios já são comprimidos: guardar sem recomprimir é bem mais rápido
                if (method_exists($zip, 'setCompressionName')) {
                    $zip->setCompressionName($base . '/arquivos/' . $f, ZipArchive::CM_STORE);
                }
            }
        }
    }
    $zip->close();
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . $base . '.zip"');
    header('Content-Length: ' . filesize($tmp));
    header('Cache-Control: no-store');
    readfile($tmp);
    @unlink($tmp);
    exit;
}

$count = (int) q_val("SELECT COUNT(*) FROM letters WHERE sender_id = ? OR (recipient_id = ? AND status = 'sent')", [$uid, $uid]);
$bytes = (int) q_val('SELECT COALESCE(SUM(m.size), 0) FROM media m WHERE m.filename IN (SELECT lm.filename FROM letter_media lm JOIN letters l ON l.id = lm.letter_id
    WHERE l.sender_id = ? OR (l.recipient_id = ? AND l.status = \'sent\'))', [$uid, $uid]);

page_head('Baixar minhas cartas');
?>
<main class="container narrow">
    <section class="page-head page-head-center">
        <p class="eyebrow">Seus dados</p>
        <h1>Baixar <em>suas cartas</em></h1>
        <p>Um arquivo com tudo o que você escreveu e recebeu, que abre em qualquer navegador, mesmo sem internet e sem este site.</p>
    </section>
    <section class="card">
        <ul class="privacy-facts">
            <li><b><?= $count ?></b> carta<?= $count === 1 ? '' : 's' ?> (as lacradas entram depois da data de abrir)</li>
            <li>Recados e reações de cada carta</li>
            <li>Fotos e áudios: cerca de <?= e(number_format($bytes / 1048576, 1, ',', '.')) ?> MB</li>
            <li>Um arquivo <code>cartas.json</code> com os dados brutos</li>
        </ul>
        <form method="post" class="row wrap" data-export-form>
            <?= csrf_field() ?>
            <button class="btn btn-primary" name="arquivos" value="1"><?= icon('download') ?>Baixar com fotos e áudios</button>
            <button class="btn" name="arquivos" value="0">Só os textos (mais rápido)</button>
        </form>
        <p class="small muted">Se tiver muitas fotos, pode levar alguns segundos para o download começar.</p>
    </section>
</main>
<?php
page_foot();
