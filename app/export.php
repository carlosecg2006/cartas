<?php
declare(strict_types=1);

/*
 * "Baixar minhas cartas": um ZIP que abre em qualquer navegador, sem internet e sem este site.
 * Traz as cartas que a pessoa escreveu e recebeu (as lacradas só depois da data), os recados,
 * as fotos e os áudios, e um arquivo cartas.json para quem quiser os dados brutos.
 */

/** Cartas que entram na exportação de uma pessoa. */
function export_letters(int $uid): array
{
    $rows = q_all(
        "SELECT l.*, s.name AS sender_name, r.name AS recipient_name FROM letters l
         LEFT JOIN users s ON s.id = l.sender_id LEFT JOIN users r ON r.id = l.recipient_id
         WHERE l.sender_id = ? OR (l.recipient_id = ? AND l.status = 'sent' AND (l.open_at IS NULL OR l.open_at <= ?) AND " . sql_delivered() . ')
         ORDER BY COALESCE(l.sent_at, l.created_at)',
        [$uid, $uid, now()]
    );
    foreach ($rows as &$l) {
        $l['content'] = sanitize_letter_content(json_decode((string) $l['content'], true) ?: []);
        $l['mine'] = (int) $l['sender_id'] === $uid;
        $l['replies'] = q_all('SELECT p.message, p.created_at, u.name FROM replies p JOIN users u ON u.id = p.user_id WHERE p.letter_id = ? ORDER BY p.id', [(int) $l['id']]);
        $l['reactions'] = array_column(q_all('SELECT emoji FROM reactions WHERE letter_id = ?', [(int) $l['id']]), 'emoji');
    }
    unset($l);
    return $rows;
}

/** Um bloco da carta em HTML simples (o texto já vem limpo do servidor). */
function export_block(array $b): string
{
    $img = fn(string $src, string $alt = '') => $src !== '' ? '<img src="arquivos/' . e($src) . '" alt="' . e($alt) . '" loading="lazy">' : '';
    $align = ($b['align'] ?? 'left') !== 'left' ? ' style="text-align:' . e($b['align']) . '"' : '';
    switch ($b['type']) {
        case 'heading':
            $h = 'h' . min(3, max(1, (int) $b['level'] + 1));
            return "<$h$align>" . $b['html'] . "</$h>";
        case 'paragraph':
            return $b['html'] !== '' ? "<p$align>" . $b['html'] . '</p>' : '';
        case 'quote':
            return '<blockquote>' . $b['html'] . '</blockquote>';
        case 'list':
            $tag = $b['style'] === 'number' ? 'ol' : 'ul';
            return "<$tag>" . implode('', array_map(fn($i) => '<li>' . $i . '</li>', $b['items'])) . "</$tag>";
        case 'checklist':
            return '<ul class="check">' . implode('', array_map(fn($i) => '<li>' . ($i['checked'] ? '☑ ' : '☐ ') . $i['html'] . '</li>', $b['items'])) . '</ul>';
        case 'callout':
            return '<div class="callout"><span>' . e($b['emoji']) . '</span><div>' . $b['html'] . '</div></div>';
        case 'image':
            return '<figure>' . $img($b['src'], $b['caption']) . ($b['caption'] !== '' ? '<figcaption>' . e($b['caption']) . '</figcaption>' : '') . '</figure>';
        case 'gallery':
            return '<div class="gallery">' . implode('', array_map(fn($i) => '<figure>' . $img($i['src'], $i['caption']) . ($i['caption'] !== '' ? '<figcaption>' . e($i['caption']) . '</figcaption>' : '') . '</figure>', $b['items'])) . '</div>';
        case 'phototext':
            return '<div class="phototext">' . $img($b['src']) . '<div>' . $b['html'] . '</div></div>';
        case 'divider':
        case 'pagebreak':
            return '<hr>';
        case 'secret':
            return '<div class="secret"><small>🔒 ' . e($b['label']) . '</small><div>' . $b['html'] . '</div></div>';
        case 'scratch':
            return '<div class="secret"><small>✨ ' . e($b['label']) . '</small>' . $img($b['src']) . '<div>' . $b['html'] . '</div></div>';
        case 'music':
            if ($b['provider'] === 'youtube') {
                return '<p class="music">🎵 <a href="https://www.youtube.com/watch?v=' . e($b['mid']) . '">Música no YouTube</a></p>';
            }
            return $b['provider'] === 'spotify' ? '<p class="music">🎵 <a href="https://open.spotify.com/' . e($b['kind']) . '/' . e($b['mid']) . '">Música no Spotify</a></p>' : '';
        case 'audio':
            return $b['src'] !== '' ? '<p class="audio">🎙️ ' . e($b['label'] ?: 'Mensagem de voz') . '<br><audio controls src="arquivos/' . e($b['src']) . '"></audio></p>' : '';
        case 'signature':
            return '<div class="signature">' . ($b['closing'] !== '' ? '<p>' . e($b['closing']) . '</p>' : '') . '<p class="name">' . e($b['name']) . '</p>'
                . ($b['date'] !== '' ? '<p class="date">' . e($b['date']) . '</p>' : '') . '</div>';
        case 'toggle':
            return '<details class="toggle"><summary>' . e($b['title'] ?: 'Mais') . '</summary><div>' . $b['html'] . '</div></details>';
        case 'timeline':
            $items = '';
            foreach ($b['items'] as $i) {
                $items .= '<li>' . ($i['date'] !== '' ? '<small>' . e($i['date']) . '</small><br>' : '')
                    . ($i['title'] !== '' ? '<b>' . e($i['title']) . '</b><br>' : '') . $i['html'] . '</li>';
            }
            return '<ol class="timeline">' . $items . '</ol>';
        case 'counter':
            if ($b['date'] === '') {
                return '';
            }
            $ts = strtotime(str_replace('T', ' ', $b['date']));
            $when = $ts ? date(str_contains($b['date'], 'T') ? 'd/m/Y H:i' : 'd/m/Y', $ts) : $b['date'];
            return '<p class="counter">⏳ ' . ($b['label'] !== '' ? e($b['label']) . ' · ' : '') . ($b['mode'] === 'until' ? 'Até ' : 'Desde ') . e($when) . '</p>';
        case 'quiz':
            $opts = '';
            foreach ($b['options'] as $n => $o) {
                $opts .= '<li>' . e($o) . ($b['answer'] === $n ? ' ✓' : '') . '</li>';
            }
            return '<div class="quiz"><p><b>❓ ' . e($b['question']) . '</b></p><ol type="A">' . $opts . '</ol></div>';
        case 'coupon':
            return '<div class="coupon" style="background:' . e($b['bg']) . '"><span>' . e($b['emoji']) . '</span><div><b>' . e($b['title']) . '</b>'
                . ($b['details'] !== '' ? '<br><small>' . e($b['details']) . '</small>' : '') . '</div></div>';
        case 'poem':
            return '<div class="poem">' . $b['html'] . ($b['author'] !== '' ? '<p class="date">— ' . e($b['author']) . '</p>' : '') . '</div>';
        case 'place':
            return '<p class="place">' . e($b['emoji']) . ' <b>' . e($b['name']) . '</b>' . ($b['caption'] !== '' ? '<br>' . e($b['caption']) : '')
                . ($b['date'] !== '' ? '<br><small>' . e($b['date']) . '</small>' : '') . '</p>';
        case 'columns':
            return '<div class="phototext"><div>' . $b['left'] . '</div><div>' . $b['right'] . '</div></div>';
        case 'button':
            return $b['url'] !== '' ? '<p class="button"><a href="' . e($b['url']) . '" target="_blank" rel="noopener noreferrer">' . e($b['label'] ?: $b['url']) . '</a></p>' : '';
    }
    return '';
}

function export_letter_html(array $l): string
{
    $c = $l['content'];
    $who = $l['mine'] ? 'Para ' . ($l['recipient_name'] ?: '(rascunho)') : 'De ' . $l['sender_name'];
    $date = $l['sent_at'] ? fmt_date_long($l['sent_at']) : 'Rascunho';
    $html = '<article id="carta-' . (int) $l['id'] . '" class="letter" style="--paper:' . e($c['paper']['color']) . ';--ink:' . e($c['paper']['ink']) . '">'
        . '<header><p class="meta">' . e($who) . ' · ' . e($date) . '</p><h2>' . e($l['title'] ?: 'Carta') . '</h2>'
        . ($c['envelope']['label'] !== '' ? '<p class="label">✉️ ' . e($c['envelope']['label']) . '</p>' : '') . '</header><div class="paper">';
    foreach ($c['blocks'] as $b) {
        $html .= export_block($b);
    }
    $html .= '</div>';
    if (($c['bgm']['kind'] ?? 'none') === 'youtube') {
        $html .= '<p class="music">🎶 Música da carta: <a href="https://www.youtube.com/watch?v=' . e($c['bgm']['mid']) . '">YouTube</a></p>';
    } elseif (($c['bgm']['kind'] ?? 'none') === 'spotify') {
        $html .= '<p class="music">🎶 Música da carta: <a href="https://open.spotify.com/' . e($c['bgm']['skind']) . '/' . e($c['bgm']['mid']) . '">Spotify</a></p>';
    } elseif (($c['bgm']['kind'] ?? 'none') === 'file') {
        $html .= '<p class="music">🎶 Música da carta:<br><audio controls src="arquivos/' . e($c['bgm']['src']) . '"></audio></p>';
    }
    if ($l['reactions']) {
        $html .= '<p class="reactions">' . e(implode(' ', $l['reactions'])) . '</p>';
    }
    if ($l['replies']) {
        $html .= '<section class="replies"><h3>Recados</h3>';
        foreach ($l['replies'] as $r) {
            $html .= '<p><b>' . e($r['name']) . '</b> <small>' . e(fmt_date($r['created_at'])) . '</small><br>' . nl2br(e($r['message'])) . '</p>';
        }
        $html .= '</section>';
    }
    return $html . '</article>';
}

function export_index_html(array $user, array $letters): string
{
    $toc = '';
    foreach ($letters as $l) {
        $toc .= '<li><a href="#carta-' . (int) $l['id'] . '">' . e($l['title'] ?: 'Carta') . '</a> <small>'
            . e(($l['mine'] ? 'para ' . ($l['recipient_name'] ?: 'ninguém ainda') : 'de ' . $l['sender_name']) . ' · ' . ($l['sent_at'] ? fmt_date($l['sent_at'], false) : 'rascunho')) . '</small></li>';
    }
    $css = 'body{margin:0;background:#f6f1ea;color:#1d1a16;font:16px/1.6 Georgia,serif}main{max-width:760px;margin:0 auto;padding:24px 16px 80px}'
        . 'h1{font-size:2.2rem;margin:.2em 0}.letter{margin:48px 0;border-top:1px solid #d6cab9;padding-top:24px}.meta{color:#71685d;font:14px system-ui,sans-serif;margin:0}'
        . '.paper{background:var(--paper);color:var(--ink);padding:28px 32px;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.08)}'
        . 'img{max-width:100%;height:auto;border-radius:4px}.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}'
        . 'figure{margin:12px 0}figcaption{font-size:14px;color:#71685d}.callout{display:flex;gap:10px;background:#fde8e4;padding:12px;border-radius:8px}'
        . '.phototext{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center}.secret{border:1px dashed #b9ad9d;padding:10px 14px;border-radius:8px;margin:12px 0}'
        . '.signature{text-align:right}.signature .name{font-size:1.4rem;margin:0}.signature .date{font-size:13px;color:#71685d}blockquote{border-left:3px solid #d6cab9;margin:12px 0;padding-left:14px;font-style:italic}'
        . '.replies{font:15px system-ui,sans-serif;margin-top:16px}.label{font-style:italic}ul.check{list-style:none;padding-left:0}audio{width:100%}'
        . '.toggle summary{cursor:pointer;font-weight:bold}.timeline{border-left:2px solid #d6cab9;list-style:none;padding-left:16px}.timeline li{margin:0 0 12px}'
        . '.coupon{display:flex;gap:12px;align-items:center;padding:14px;border-radius:10px;border:2px dashed rgba(0,0,0,.25);color:#3b3340}.coupon span{font-size:2rem}'
        . '.poem{text-align:center;line-height:1.9}.place{border:2px dashed #b9ad9d;padding:10px 14px;border-radius:8px;text-align:center}'
        . '.button a{display:inline-block;padding:8px 18px;border-radius:999px;background:var(--ink);color:var(--paper);text-decoration:none}'
        . '@media (max-width:560px){.phototext{grid-template-columns:1fr}.paper{padding:20px}}@media print{.letter{break-before:page}}';
    $html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>Cartas de ' . e($user['name']) . '</title><style>' . $css . '</style></head><body><main>'
        . '<p class="meta">' . e(app_name()) . ' · exportado em ' . e(fmt_date_long(now())) . '</p><h1>As cartas de ' . e($user['name']) . '</h1>'
        . '<p>' . count($letters) . ' carta' . (count($letters) === 1 ? '' : 's') . '. Este arquivo abre em qualquer navegador, mesmo sem internet.</p><ol>' . $toc . '</ol>';
    foreach ($letters as $l) {
        $html .= export_letter_html($l);
    }
    return $html . '</main></body></html>';
}

/** Dados brutos (sem os textos HTML de outras partes do site). */
function export_json(array $user, array $letters): string
{
    $out = [
        'pessoa' => ['nome' => $user['name'], 'usuario' => $user['username'], 'aniversario' => $user['birthday'], 'conta_criada_em' => $user['created_at']],
        'contatos' => array_map(fn($c) => ['nome' => $c['name'], 'apelido' => $c['nickname'], 'anotacoes' => $c['note'] ?? ''], contacts_of((int) $user['id'])),
        'cartas' => array_map(fn($l) => [
            'id' => (int) $l['id'], 'titulo' => $l['title'], 'de' => $l['sender_name'], 'para' => $l['recipient_name'],
            'situacao' => $l['status'], 'enviada_em' => $l['sent_at'], 'abrir_a_partir_de' => $l['open_at'],
            'aberta_pela_primeira_vez' => $l['first_opened_at'], 'conteudo' => $l['content'], 'recados' => $l['replies'], 'reacoes' => $l['reactions'],
        ], $letters),
        'modelos' => array_map(fn($t) => ['nome' => $t['name'], 'criado_em' => $t['created_at'], 'conteudo' => json_decode((string) $t['content'], true)], q_all('SELECT name, content, created_at FROM templates WHERE user_id = ? ORDER BY id', [(int) $user['id']])),
    ];
    return json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
