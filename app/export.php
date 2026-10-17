<?php
declare(strict_types=1);

/*
 * "Baixar minhas cartas": um ZIP que abre em qualquer navegador, sem internet e sem este site.
 * Traz as cartas que a pessoa escreveu e recebeu (as lacradas só depois da data), os recados,
 * as respostas às perguntas e os vales usados, as fotos e os áudios, e um arquivo cartas.json
 * para quem quiser os dados brutos.
 * O visual é uma aproximação da carta (papel, letra, efeitos de texto, filtros e adesivos),
 * feita só com HTML e CSS dentro do próprio arquivo: nada é buscado na internet.
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
        // "esconder o título até abrir": vale enquanto quem recebeu ainda não abriu
        $l['title_shown'] = letter_title_for($l, $uid, 'Uma carta para você');
        $l['replies'] = q_all('SELECT p.message, p.created_at, u.name FROM replies p JOIN users u ON u.id = p.user_id WHERE p.letter_id = ? ORDER BY p.id', [(int) $l['id']]);
        $l['reactions'] = array_column(q_all('SELECT emoji FROM reactions WHERE letter_id = ?', [(int) $l['id']]), 'emoji');
        // pergunta respondida e vale usado por quem recebeu (só valem para a carta enviada)
        $l['interactions'] = $l['status'] === 'sent' ? letter_interactions((int) $l['id'], (int) $l['recipient_id']) : [];
    }
    unset($l);
    return $rows;
}

/**
 * Definições de desenho do editor (rabiscos, formas e letras), lidas de assets/js/letter.js
 * para o arquivo exportado acompanhar o site sem copiar tudo à mão.
 * Retorna ['doodles' => [nome => [d, fill]], 'shapes' => [nome => [d, viewBox]], 'fonts' => [nome => css]].
 */
function export_defs(): array
{
    static $defs = null;
    if ($defs !== null) {
        return $defs;
    }
    $defs = ['doodles' => [], 'shapes' => [], 'fonts' => []];
    $js = (string) @file_get_contents(ROOT . '/assets/js/letter.js');
    $section = function (string $start, string $end) use ($js): string {
        $a = strpos($js, $start);
        $b = $a === false ? false : strpos($js, $end, $a);
        return $a === false || $b === false ? '' : substr($js, $a, $b - $a);
    };
    $pathOk = fn($d) => (bool) preg_match('/^[MLHVCSQTAZmlhvcsqtaz0-9.,\s-]+$/', $d);
    preg_match_all("/^\s*'?([a-z0-9-]+)'?:\s*\{\s*label:\s*'[^']*',\s*(fill:\s*true,\s*)?d:\s*'([^']+)'/m", $section('const DOODLES', 'const SHAPES'), $m, PREG_SET_ORDER);
    foreach ($m as $x) {
        if ($pathOk($x[3])) {
            $defs['doodles'][$x[1]] = [$x[3], $x[2] !== ''];
        }
    }
    preg_match_all("/^\s*'?([a-z0-9-]+)'?:\s*\{\s*label:\s*'[^']*',\s*vb:\s*'([0-9 .]+)',\s*d:\s*'([^']+)'/m", $section('const SHAPES', 'const SHAPE_COLORS'), $m, PREG_SET_ORDER);
    foreach ($m as $x) {
        if ($pathOk($x[3])) {
            $defs['shapes'][$x[1]] = [$x[3], $x[2]];
        }
    }
    // a medalha é calculada no JavaScript: mesma conta aqui
    $pts = [];
    for ($i = 0; $i < 32; $i++) {
        $a = (M_PI * 2 * $i) / 32 - M_PI / 2;
        $r = $i % 2 ? 41 : 47;
        $pts[] = number_format(50 + $r * cos($a), 1, '.', '') . ' ' . number_format(50 + $r * sin($a), 1, '.', '');
    }
    $defs['shapes']['badge'] = ['M' . implode(' ', $pts) . 'Z', '0 0 100 100'];
    preg_match_all('/^\s*([a-z0-9]+):\s*\{\s*label:\s*\'[^\']*\',\s*css:\s*"([^"]+)"/m', $js, $m, PREG_SET_ORDER);
    foreach ($m as $x) {
        if (preg_match('/^[A-Za-z0-9 \',-]+$/', $x[2])) {
            $defs['fonts'][$x[1]] = $x[2];
        }
    }
    return $defs;
}

/** Família de letra para o CSS (sem internet, cai numa parecida do aparelho). */
function export_font(string $key): string
{
    return export_defs()['fonts'][$key] ?? "'Caveat', cursive";
}

/** Trechos com outra letra (classes ff-*): a mesma lista de letras da carta. */
function export_ff_css(): string
{
    $css = '';
    foreach (LETTER_FONTS as $key) {
        $css .= '.ff-' . $key . '{font-family:' . export_font($key) . '}';
    }
    return $css;
}

const EXPORT_TAPES = [
    'pink' => '#f6b8c8', 'mint' => '#a8dcc0', 'yellow' => '#f7e08a', 'lilac' => '#cdb8ee', 'dots' => '#f4c9a8', 'stripes' => '#9cc9f0',
    'grid' => '#d6e6fa', 'hearts' => '#f7c4d2', 'flowers' => '#f9d7a8', 'stars' => '#c9d7f5', 'gingham' => '#f3b3b3', 'kraft' => '#c9a77c',
    'glitter' => '#e6d38f', 'rainbow' => 'linear-gradient(90deg,#f4a3b5,#f7c873,#a8dcc0,#9cc9f0,#c9b5ee)',
];
const EXPORT_DIVIDERS = ['line' => '', 'dashed' => '', 'dots' => '•  •  •', 'hearts' => '♥  ♥  ♥', 'stars' => '★  ★  ★', 'flowers' => '✿  ✿  ✿', 'wave' => '∿∿∿∿∿'];

/** Um adesivo, posicionado como na carta (x e largura em % do papel; y a partir do bloco ao qual está preso). */
function export_sticker(array $s): string
{
    $defs = export_defs();
    $style = '--x:' . (float) $s['x'] . ';--y:' . (float) $s['y'] . ';--w:' . (float) $s['w'] . ';--r:' . (float) $s['r'] . 'deg;--flip:' . ($s['f'] ? -1 : 1) . ';opacity:' . (float) $s['o'];
    $cls = 'st st-' . $s['kind'] . ($s['ol'] !== '' ? ' ol-' . $s['ol'] : '');
    $svg = fn(string $vb, string $inner) => '<svg viewBox="' . e($vb) . '" aria-hidden="true">' . $inner . '</svg>';
    switch ($s['kind']) {
        case 'emoji':
            $inner = '<span>' . e($s['char']) . '</span>';
            break;
        case 'text':
            $cls .= ' tx-' . $s['style'];
            $style .= ';color:' . $s['color'] . ";font-family:" . export_font($s['font']) . ';--fs:' . (float) ($s['fs'] ?? 1);
            $span = (!empty($s['bg']) ? 'background:' . $s['bg'] . ';padding:.25em .5em;border-radius:.3em;' : '')
                . (!empty($s['bd']) ? 'font-weight:bold;' : '') . (!empty($s['it']) ? 'font-style:italic;' : '');
            if (!empty($s['al'])) {
                $style .= ';text-align:' . $s['al'];
            }
            $cv = (float) ($s['cv'] ?? 0);
            if ($cv != 0.0) {
                // texto curvo: arco de 0..100 com a curvatura pedida (positivo = para cima)
                $h = abs($cv) * 0.3;
                $d = $cv > 0 ? "M2 {$h} Q50 " . (-$h) . " 98 {$h}" : "M2 0 Q50 " . (2 * $h) . ' 98 0';
                $pid = 'cv' . bin2hex(random_bytes(4));
                $inner = '<svg viewBox="0 ' . (-$h - 14) . ' 100 ' . (2 * $h + 22) . '" aria-hidden="true" style="overflow:visible' . ($span !== '' ? ';' . e($span) : '') . '">'
                    . '<path id="' . $pid . '" d="' . $d . '" fill="none"/><text font-size="11" fill="currentColor" text-anchor="middle">'
                    . '<textPath href="#' . $pid . '" startOffset="50%">' . e(str_replace("\n", ' ', $s['text'])) . '</textPath></text></svg>';
            } else {
                $inner = '<span' . ($span !== '' ? ' style="' . e($span) . '"' : '') . '>' . nl2br(e($s['text']), false) . '</span>';
            }
            break;
        case 'image':
            $inner = '<img src="arquivos/' . e($s['src']) . '" alt=""' . ($s['fi'] !== '' ? ' class="imgf-' . e($s['fi']) . '"' : '') . '>';
            if (($s['mask'] ?? '') !== '') {
                $cls .= ' mask-' . $s['mask'];
            }
            break;
        case 'tape':
            $inner = '<i style="background:' . (EXPORT_TAPES[$s['pattern']] ?? '#f6b8c8') . '"></i>';
            break;
        case 'doodle':
            [$d, $fill] = $defs['doodles'][$s['name']] ?? ['M50 83C22 63 9 47 13 31 17 16 37 12 50 31 63 12 83 15 87 31 91 47 78 63 50 83Z', false];
            $inner = $svg('0 0 100 100', '<path d="' . e($d) . '" stroke="' . $s['c'] . '" fill="' . ($fill ? $s['c'] : 'none') . '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>');
            break;
        case 'shape':
            [$d, $vb] = $defs['shapes'][$s['name']] ?? $defs['shapes']['badge'];
            $stroke = $s['s'] !== '' && $s['sw'] > 0 ? ' stroke="' . $s['s'] . '" stroke-width="' . ($s['sw'] * 2) . '" stroke-linejoin="round" paint-order="stroke"' : '';
            $inner = $svg($vb, '<path d="' . e($d) . '" fill="' . $s['c'] . '"' . $stroke . '/>');
            break;
        case 'drawing':
            $paths = '';
            foreach ($s['paths'] as $p) {
                $brush = ['marker' => ' stroke-opacity=".45" stroke-linecap="square"', 'pencil' => ' stroke-opacity=".8"', 'chalk' => ' stroke-opacity=".7" stroke-dasharray="1 1.4"',
                    'neon' => ' style="filter:drop-shadow(0 0 2px ' . $p['c'] . ') drop-shadow(0 0 5px ' . $p['c'] . ')"'][$p['b'] ?? ''] ?? '';
                $paths .= '<path d="' . e($p['d']) . '" stroke="' . $p['c'] . '" stroke-width="' . (float) $p['s'] . '" fill="none" stroke-linecap="round" stroke-linejoin="round"' . $brush . '/>';
            }
            $inner = $svg('0 0 ' . (float) $s['vw'] . ' ' . (float) $s['vh'], $paths);
            break;
        default:
            return '';
    }
    return '<div class="' . e($cls) . '" style="' . e($style) . '">' . $inner . '</div>';
}

/** Um bloco da carta em HTML simples (o texto já vem limpo do servidor). */
function export_block(array $b, array $l = []): string
{
    $filter = fn() => ($b['filter'] ?? '') !== '' ? ' imgf-' . e($b['filter']) : '';
    $img = fn(string $src, string $alt = '') => $src !== '' ? '<img src="arquivos/' . e($src) . '" alt="' . e($alt) . '" loading="lazy">' : '';
    $align = ($b['align'] ?? 'left') !== 'left' ? ' style="text-align:' . e($b['align']) . '"' : '';
    $answers = $l['interactions'] ?? [];
    $who = first_name((string) ($l['recipient_name'] ?? '')) ?: 'Quem recebeu';
    $when = fn(?string $iso) => $iso ? date('d/m/Y', strtotime($iso)) : '';
    switch ($b['type']) {
        case 'heading':
            $h = 'h' . min(4, max(2, (int) $b['level'] + 1));
            return "<$h$align>" . $b['html'] . "</$h>";
        case 'paragraph':
            return $b['html'] !== '' ? "<p$align>" . $b['html'] . '</p>' : '<p class="empty"></p>';
        case 'quote':
            return '<blockquote' . $align . '>' . $b['html'] . '</blockquote>';
        case 'list':
            $tag = $b['style'] === 'number' ? 'ol' : 'ul';
            return "<$tag>" . implode('', array_map(fn($i) => '<li>' . $i . '</li>', $b['items'])) . "</$tag>";
        case 'checklist':
            return '<ul class="check">' . implode('', array_map(fn($i) => '<li>' . ($i['checked'] ? '☑ ' : '☐ ') . $i['html'] . '</li>', $b['items'])) . '</ul>';
        case 'callout':
            return '<div class="callout" style="background:' . e($b['bg']) . '"><span>' . e($b['emoji']) . '</span><div>' . $b['html'] . '</div></div>';
        case 'image':
            if ($b['src'] === '') {
                return '';
            }
            return '<figure class="photo frame-' . e($b['frame']) . ' w-' . e($b['width']) . $filter() . '" style="--tilt:' . (float) $b['tilt'] . 'deg">'
                . $img($b['src'], $b['caption']) . ($b['caption'] !== '' ? '<figcaption>' . e($b['caption']) . '</figcaption>' : '') . '</figure>';
        case 'gallery':
            return '<div class="gallery gallery-' . e($b['layout']) . $filter() . '">' . implode('', array_map(fn($i) => '<figure>' . $img($i['src'], $i['caption'])
                . ($i['caption'] !== '' ? '<figcaption>' . e($i['caption']) . '</figcaption>' : '') . '</figure>', $b['items'])) . '</div>';
        case 'phototext':
            return '<div class="phototext side-' . e($b['side']) . '"><figure class="photo frame-' . e($b['frame']) . $filter() . '">' . $img($b['src']) . '</figure><div>' . $b['html'] . '</div></div>';
        case 'divider':
            $mark = EXPORT_DIVIDERS[$b['style']] ?? '';
            return $mark !== '' ? '<p class="divider" aria-hidden="true">' . $mark . '</p>' : '<hr' . ($b['style'] === 'dashed' ? ' class="dashed"' : '') . '>';
        case 'pagebreak':
            return '<hr class="page">';
        case 'spacer':
            return '<div style="height:' . (int) $b['height'] . 'px"></div>';
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
            $date = $ts ? date(str_contains($b['date'], 'T') ? 'd/m/Y H:i' : 'd/m/Y', $ts) : $b['date'];
            return '<p class="counter">⏳ ' . ($b['label'] !== '' ? e($b['label']) . ' · ' : '') . ($b['mode'] === 'until' ? 'Até ' : 'Desde ') . e($date) . '</p>';
        case 'quiz':
            $chosen = isset($answers[$b['id']]) && preg_match('/^\d$/', $answers[$b['id']]['value']) ? (int) $answers[$b['id']]['value'] : -1;
            $opts = '';
            foreach ($b['options'] as $n => $o) {
                $opts .= '<li' . ($n === $chosen ? ' class="chosen"' : '') . '>' . e($o) . ($b['answer'] === $n ? ' ✓' : '') . '</li>';
            }
            $result = '';
            if ($chosen >= 0) {
                $verdict = $b['answer'] < 0 ? '' : ($chosen === $b['answer'] ? ' (acertou)' : ' (errou)');
                $result = '<p class="answer">' . e(($l['mine'] ?? true) ? $who . ' respondeu' : 'Sua resposta') . ': ' . e($b['options'][$chosen] ?? '') . e($verdict)
                    . ' · ' . e($when($answers[$b['id']]['at'])) . '</p>';
            }
            return '<div class="quiz"><p><b>❓ ' . e($b['question']) . '</b></p><ol type="A">' . $opts . '</ol>' . $result . '</div>';
        case 'coupon':
            $used = ($answers[$b['id']]['value'] ?? '') === 'used';
            return '<div class="coupon' . ($used ? ' used' : '') . '" style="background:' . e($b['bg']) . '"><span>' . e($b['emoji']) . '</span><div><small>VALE</small><br><b>' . e($b['title']) . '</b>'
                . ($b['details'] !== '' ? '<br><small>' . e($b['details']) . '</small>' : '')
                . ($used ? '<br><span class="stamp">' . e((($l['mine'] ?? true) ? $who . ' usou em ' : 'Usado em ') . $when($answers[$b['id']]['at'])) . '</span>' : '') . '</div></div>';
        case 'poem':
            return '<div class="poem"' . $align . '>' . $b['html'] . ($b['author'] !== '' ? '<p class="date">— ' . e($b['author']) . '</p>' : '') . '</div>';
        case 'place':
            return '<p class="place">' . e($b['emoji']) . ' <b>' . e($b['name']) . '</b>' . ($b['caption'] !== '' ? '<br>' . e($b['caption']) : '')
                . ($b['date'] !== '' ? '<br><small>' . e($b['date']) . '</small>' : '') . '</p>';
        case 'columns':
            return '<div class="columns"><div>' . $b['left'] . '</div><div>' . $b['right'] . '</div></div>';
        case 'button':
            return $b['url'] !== '' ? '<p class="button"' . $align . '><a href="' . e($b['url']) . '" target="_blank" rel="noopener noreferrer">' . e($b['label'] ?: $b['url']) . '</a></p>' : '';
    }
    return '';
}

/** Letra, tamanho e cor próprios de um bloco (quando diferentes do papel). */
function export_block_style(array $b): string
{
    $css = [];
    if (($b['font'] ?? '') !== '') {
        $css[] = 'font-family:' . export_font($b['font']);
    }
    if (($b['color'] ?? '') !== '') {
        $css[] = 'color:' . $b['color'];
    }
    $size = ['sm' => .85, 'md' => 1, 'lg' => 1.25, 'xl' => 1.6][$b['size'] ?? ''] ?? null;
    if ($size) {
        $css[] = 'font-size:' . $size . 'em';
    }
    if ($ls = ['tight' => '-.02em', 'wide' => '.06em', 'wider' => '.14em'][$b['spacing'] ?? ''] ?? null) {
        $css[] = 'letter-spacing:' . $ls;
    }
    if ($lh = ['tight' => '1.2', 'loose' => '2', 'looser' => '2.5'][$b['leading'] ?? ''] ?? null) {
        $css[] = 'line-height:' . $lh;
    }
    $box = is_array($b['box'] ?? null) ? $b['box'] : null;
    if ($box) {
        if (($box['bg'] ?? '') !== '') {
            $css[] = 'background-color:' . $box['bg'];
        }
        if (($box['border'] ?? 'none') !== 'none') {
            $css[] = 'border:' . ($box['border'] === 'double' ? '4px' : '2px') . ' ' . $box['border'] . ' ' . ($box['bc'] ?? '#3b3340');
        }
        if ($r = ['sm' => '.3em', 'md' => '.75em', 'round' => '1.6em'][$box['radius'] ?? ''] ?? null) {
            $css[] = 'border-radius:' . $r;
        }
        if ($pad = ['sm' => '.35em .6em', 'md' => '.8em 1.1em'][$box['pad'] ?? ''] ?? null) {
            $css[] = 'padding:' . $pad;
        }
        if (!empty($box['shadow'])) {
            $css[] = 'box-shadow:0 .12em .2em rgba(40,20,30,.12),0 .5em 1.1em -.3em rgba(40,20,30,.3)';
        }
        if (!empty($box['tilt'])) {
            $css[] = 'rotate:' . (int) $box['tilt'] . 'deg';
        }
        if ($w = ['w75' => '75%', 'w50' => '50%'][$box['width'] ?? ''] ?? null) {
            $pos = $box['pos'] ?? 'center';
            $css[] = 'width:' . $w . ';margin-left:' . ($pos === 'left' ? '0' : 'auto') . ';margin-right:' . ($pos === 'right' ? '0' : 'auto');
        }
    }
    return $css ? ' style="' . e(implode(';', $css)) . '"' : '';
}

function export_letter_html(array $l): string
{
    $c = $l['content'];
    $p = $c['paper'];
    $who = $l['mine'] ? 'Para ' . ($l['recipient_name'] ?: '(rascunho)') : 'De ' . $l['sender_name'];
    $date = $l['sent_at'] ? fmt_date_long($l['sent_at']) : 'Rascunho';
    $title = (string) ($l['title_shown'] ?? $l['title']);
    $paperStyle = '--paper:' . $p['color'] . ';--paper2:' . $p['color2'] . ';--ink:' . $p['ink'] . ';--font:' . export_font($p['font']);
    if ($p['style'] === 'image' && $p['image'] !== '') {
        $veil = $p['veilDark'] ? 'rgba(20,16,14,' . (float) $p['veil'] . ')' : 'rgba(255,255,255,' . (float) $p['veil'] . ')';
        $paperStyle .= ';background-image:linear-gradient(' . $veil . ',' . $veil . '),url(arquivos/' . $p['image'] . ')'
            . ';background-size:' . ($p['imageFit'] === 'tile' ? 'auto' : $p['imageFit']) . ';background-repeat:' . ($p['imageFit'] === 'tile' ? 'repeat' : 'no-repeat') . ';background-position:center';
    }
    $sceneStyle = $p['scene'] === 'image' && $p['sceneImage'] !== ''
        ? ' style="background:linear-gradient(rgba(0,0,0,' . (float) $p['sceneDim'] . '),rgba(0,0,0,' . (float) $p['sceneDim'] . ')),url(arquivos/' . e($p['sceneImage']) . ') center/cover"' : '';

    // adesivos vão junto com o bloco ao qual estão presos; os soltos ficam no papel
    $byBlock = [];
    $room = ['square' => 100, 'postcard' => 66.7, 'note' => 125, 'story' => 177.8][$p['format'] ?? ''] ?? 0;
    foreach ($c['stickers'] as $s) {
        $byBlock[$s['anchor']][] = export_sticker($s);
        if ($s['anchor'] === '') {
            // o papel cresce para caber os adesivos soltos lá embaixo (como na carta)
            $room = max($room, (float) $s['y'] + (float) $s['w'] * 0.6 + 2);
        }
    }
    $html = '<article id="carta-' . (int) $l['id'] . '" class="letter">'
        . '<header><p class="meta">' . e($who) . ' · ' . e($date) . '</p><h2>' . e($title ?: 'Carta') . '</h2>'
        . ($c['envelope']['label'] !== '' ? '<p class="label">✉️ ' . e($c['envelope']['label']) . '</p>' : '') . '</header>'
        . '<div class="scene scene-' . e($p['scene']) . '"' . $sceneStyle . '>'
        . '<div class="paper paper-' . e($p['style']) . ' border-' . e($p['border']) . ' size-' . e($p['size']) . '" style="' . e($paperStyle) . '">'
        . implode('', $byBlock[''] ?? [])
        . ($room > 0 ? '<div class="room" style="min-height:calc(' . round($room, 2) . 'cqw - 12cqw)">' : '<div>');
    foreach ($c['blocks'] as $b) {
        $inner = export_block($b, $l);
        $stickers = implode('', $byBlock[$b['id']] ?? []);
        if ($inner !== '' || $stickers !== '') {
            $html .= '<div class="b"' . export_block_style($b) . '>' . $inner . $stickers . '</div>';
        }
    }
    $html .= '</div></div></div>';
    $bgm = $c['bgm'] ?? ['kind' => 'none'];
    $name = ($bgm['name'] ?? '') !== '' ? ' (' . e($bgm['name']) . ')' : '';
    if ($bgm['kind'] === 'youtube') {
        $html .= '<p class="music">🎶 Trilha sonora' . $name . ': <a href="https://www.youtube.com/watch?v=' . e($bgm['mid']) . (!empty($bgm['start']) ? '&amp;t=' . (int) $bgm['start'] . 's' : '') . '">ouvir no YouTube</a></p>';
    } elseif ($bgm['kind'] === 'spotify') {
        $html .= '<p class="music">🎶 Trilha sonora' . $name . ': <a href="https://open.spotify.com/' . e($bgm['skind']) . '/' . e($bgm['mid']) . '">ouvir no Spotify</a></p>';
    } elseif ($bgm['kind'] === 'file') {
        $html .= '<p class="music">🎶 Trilha sonora' . $name . ':<br><audio controls loop src="arquivos/' . e($bgm['src']) . '"></audio></p>';
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

/** CSS do arquivo exportado: aproximação do papel, das letras, dos efeitos e dos adesivos do site. */
function export_css(): string
{
    $mix = fn(int $pct) => "color-mix(in srgb,var(--ink) {$pct}%,transparent)";
    return 'body{margin:0;background:#f6f1ea;color:#1d1a16;font:16px/1.6 Georgia,serif}main{max-width:820px;margin:0 auto;padding:24px 16px 80px}'
        . 'h1{font-size:2.2rem;margin:.2em 0}.letter{margin:48px 0;border-top:1px solid #d6cab9;padding-top:24px}.meta{color:#71685d;font:14px system-ui,sans-serif;margin:0}'
        . '.letter>header h2{font-size:1.6rem;margin:.2em 0 .4em}.label{font-style:italic}'
        // cenário e papel
        . '.scene{padding:clamp(12px,4vw,36px);border-radius:14px;background:#c89f74}'
        . '.scene-desk{background:linear-gradient(180deg,#c89f74,#b68a5f)}.scene-pink{background:#fdeef2}.scene-sky{background:linear-gradient(180deg,#a7d3f5,#e3f1fb)}'
        . '.scene-night{background:linear-gradient(180deg,#1c1d3a,#36305e)}.scene-garden{background:linear-gradient(180deg,#e8f4e0,#d7ebcd)}.scene-plain{background:#f3ede7}'
        . '.scene-sunset{background:linear-gradient(180deg,#4b3b7a,#a65a92 36%,#ef8a6d 66%,#ffc77d)}.scene-beach{background:linear-gradient(180deg,#a9dcf3,#e2f4fb 36%,#5ec3d6 36%,#3ea7c2 64%,#f3dfb4 66%,#e6c993)}'
        . '.scene-lavender{background:#e9dff6}.scene-confetti{background:#fff7ee}.scene-wood{background:linear-gradient(180deg,#6b4428,#4a2d19)}.scene-marble{background:linear-gradient(135deg,#f4f2ef,#e3dfda)}'
        . '.paper{position:relative;container-type:inline-size;overflow:clip;max-width:600px;margin:0 auto;padding:clamp(20px,6cqw,44px) 0;background-color:var(--paper);color:var(--ink);font-family:var(--font);'
        . 'font-size:1.15rem;line-height:1.65;border-radius:4px;box-shadow:0 10px 30px rgba(0,0,0,.18)}.size-sm{font-size:1rem}.size-lg{font-size:1.35rem}'
        . '.paper .b{position:relative;padding:0 clamp(18px,8cqw,48px)}.paper h2,.paper h3,.paper h4{line-height:1.2;margin:.4em 0}.paper p{margin:.35em 0}.paper p.empty{min-height:1em}'
        . ".paper-lined{background-image:repeating-linear-gradient(180deg,transparent 0 calc(1.65em - 1px),{$mix(16)} calc(1.65em - 1px) 1.65em)}"
        . ".paper-notebook{background-image:linear-gradient(90deg,transparent 22px,rgba(226,84,100,.5) 22px 24px,transparent 24px),repeating-linear-gradient(180deg,transparent 0 calc(1.65em - 1px),rgba(90,140,210,.32) calc(1.65em - 1px) 1.65em)}"
        . ".paper-grid{background-image:linear-gradient({$mix(9)} 1px,transparent 1px),linear-gradient(90deg,{$mix(9)} 1px,transparent 1px);background-size:24px 24px}"
        . ".paper-dots{background-image:radial-gradient({$mix(22)} 1.2px,transparent 1.4px);background-size:22px 22px}"
        . '.paper-kraft{background-image:linear-gradient(rgba(176,130,80,.55),rgba(160,115,68,.6))}'
        . '.paper-vintage{background-image:radial-gradient(ellipse at center,transparent 55%,rgba(140,95,40,.28)),linear-gradient(rgba(230,205,160,.35),rgba(230,205,160,.35))}'
        . '.paper-parchment{background-image:radial-gradient(ellipse at center,transparent 50%,rgba(120,80,30,.32)),linear-gradient(rgba(240,220,175,.5),rgba(232,205,150,.5))}'
        . '.paper-watercolor{background-image:radial-gradient(ellipse 40% 24% at 12% 9%,rgba(244,163,181,.38),transparent 70%),radial-gradient(ellipse 32% 20% at 90% 16%,rgba(156,201,240,.36),transparent 70%),'
        . 'radial-gradient(ellipse 36% 20% at 82% 84%,rgba(247,200,115,.32),transparent 70%),radial-gradient(ellipse 30% 22% at 8% 90%,rgba(168,220,192,.36),transparent 70%)}'
        . ".paper-linen{background-image:repeating-linear-gradient(0deg,{$mix(5)} 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,{$mix(5)} 0 1px,transparent 1px 4px)}"
        . ".paper-music{background-image:repeating-linear-gradient(180deg,transparent 0 .5em,{$mix(20)} .5em calc(.5em + 1px),transparent calc(.5em + 1px) .72em,{$mix(20)} .72em calc(.72em + 1px),transparent calc(.72em + 1px) .94em,{$mix(20)} .94em calc(.94em + 1px),transparent calc(.94em + 1px) 4.95em)}"
        . '.paper-gradient{background-image:linear-gradient(135deg,var(--paper),var(--paper2,#f6d6e0))}'
        // bordas
        . ".border-simple{outline:2px solid {$mix(35)};outline-offset:-14px}.border-double{outline:6px double {$mix(40)};outline-offset:-14px}"
        . ".border-dashed,.border-ticket{outline:2px dashed {$mix(35)};outline-offset:-14px}.border-stamp{outline:4px dotted {$mix(30)};outline-offset:-8px}"
        . '.border-hearts{outline:3px dotted #e8546b;outline-offset:-12px}.border-flowers{outline:3px dotted #7aa36a;outline-offset:-12px}.border-stars{outline:3px dotted #d9a520;outline-offset:-12px}'
        . ".border-scallop{outline:2px dotted {$mix(35)};outline-offset:-20px}.border-polaroid{border:14px solid #fff;border-bottom-width:56px;border-radius:2px}"
        // efeitos de texto (fx-*)
        . '.t-sm{font-size:.78em}.t-lg{font-size:1.35em}.t-xl{font-size:1.8em;line-height:1.2}mark{background:#fff3a3;color:inherit;border-radius:3px;padding:0 .1em}'
        . '.fx-hl-yellow,.fx-hl-pink,.fx-hl-green,.fx-hl-blue{--hl:255,222,70;padding:.02em .14em;border-radius:.5em .25em .55em .3em;background:rgba(var(--hl),.55);-webkit-box-decoration-break:clone;box-decoration-break:clone}'
        . '.fx-hl-pink{--hl:255,140,178}.fx-hl-green{--hl:130,222,140}.fx-hl-blue{--hl:120,190,255}'
        . '.fx-wavy{text-decoration:underline wavy #e2566f;text-decoration-thickness:.08em;text-underline-offset:.2em}'
        . '.fx-glow{text-shadow:0 0 .06em rgba(255,255,255,.95),0 0 .2em rgba(255,196,70,1),0 0 .45em rgba(255,180,60,.85)}'
        . '.fx-outline{-webkit-text-fill-color:transparent;-webkit-text-stroke:.035em currentColor}'
        // filtros de foto
        . '.imgf-pb img,img.imgf-pb{filter:grayscale(1) contrast(1.06)}.imgf-sepia img,img.imgf-sepia{filter:sepia(.85) contrast(1.02)}'
        . '.imgf-vintage img,img.imgf-vintage{filter:sepia(.35) contrast(1.1) saturate(.8) brightness(1.05) hue-rotate(-8deg)}.imgf-quente img,img.imgf-quente{filter:sepia(.22) saturate(1.35) hue-rotate(-10deg) brightness(1.04)}'
        . '.imgf-frio img,img.imgf-frio{filter:saturate(.85) hue-rotate(14deg) brightness(1.05) contrast(1.03)}.imgf-desbotado img,img.imgf-desbotado{filter:saturate(.55) contrast(.85) brightness(1.1)}'
        . '.imgf-contraste img,img.imgf-contraste{filter:contrast(1.35) saturate(1.2)}.imgf-sonho img,img.imgf-sonho{filter:saturate(1.3) brightness(1.1) contrast(.9) hue-rotate(-12deg)}'
        // blocos
        . 'img{max-width:100%;height:auto;border-radius:4px}figure{margin:12px auto}figcaption{font-size:.85em;opacity:.75;text-align:center}'
        . '.photo{max-width:65%;transform:rotate(var(--tilt,0deg))}.photo.w-sm{max-width:40%}.photo.w-lg{max-width:100%}.photo img{display:block;width:100%}'
        . '.frame-polaroid{background:#fff;padding:8px 8px 28px;box-shadow:0 4px 14px rgba(0,0,0,.15);color:#3b3340}.frame-rounded img{border-radius:14px}'
        . '.frame-circle img{border-radius:50%;aspect-ratio:1;object-fit:cover}.frame-tape{box-shadow:0 4px 14px rgba(0,0,0,.12)}'
        . '.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.gallery-strip{grid-auto-flow:column;grid-template-columns:none;overflow-x:auto}'
        . '.gallery-scatter figure:nth-child(odd){transform:rotate(-2deg)}.gallery-scatter figure:nth-child(even){transform:rotate(2deg)}'
        . '.callout{display:flex;gap:10px;padding:12px;border-radius:8px;color:#3b3340}'
        . '.phototext,.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center}.phototext.side-right figure{order:2}.phototext .photo{max-width:100%}'
        . ".secret{border:1px dashed {$mix(40)};padding:10px 14px;border-radius:8px;margin:12px 0}"
        . ".signature{text-align:right}.signature .name{font-size:1.4em;margin:0}.signature .date{font-size:.8em;opacity:.75}blockquote{border-left:3px solid {$mix(30)};margin:12px 0;padding-left:14px;font-style:italic}"
        . ".divider{text-align:center;letter-spacing:.3em;opacity:.6}hr{border:0;border-top:1px solid {$mix(30)};margin:16px 0}hr.dashed{border-top-style:dashed}hr.page{border-top:2px dashed {$mix(25)};margin:28px 0}"
        . '.replies{font:15px system-ui,sans-serif;margin-top:16px}ul.check{list-style:none;padding-left:0}audio{width:100%}'
        . ".toggle summary{cursor:pointer;font-weight:bold}.timeline{border-left:2px solid {$mix(30)};list-style:none;padding-left:16px}.timeline li{margin:0 0 12px}"
        . '.quiz li.chosen{font-weight:bold;text-decoration:underline}.quiz .answer{font-size:.9em;opacity:.85}'
        . '.coupon{display:flex;gap:12px;align-items:center;padding:14px;border-radius:10px;border:2px dashed rgba(0,0,0,.25);color:#3b3340;margin:12px 0}.coupon>span{font-size:2rem}'
        . '.coupon .stamp{display:inline-block;margin-top:6px;padding:0 8px;border:2px solid #c0392b;color:#c0392b;border-radius:4px;font:bold 12px system-ui,sans-serif;transform:rotate(-4deg)}'
        . ".poem{text-align:center;line-height:1.9}.place{border:2px dashed {$mix(35)};padding:10px 14px;border-radius:8px;text-align:center}.counter{text-align:center}"
        . '.button a{display:inline-block;padding:8px 18px;border-radius:999px;background:var(--ink);color:var(--paper);text-decoration:none}'
        // adesivos (posição em % do papel, como na carta)
        . '.st{position:absolute;z-index:2;top:calc(var(--y) * 1cqw);left:calc(var(--x) * 1cqw);width:calc(var(--w) * 1cqw);transform:translate(-50%,-50%) rotate(var(--r)) scaleX(var(--flip));pointer-events:none;line-height:1}'
        . '.paper>.st{top:calc(var(--y) * 1cqw)}.st svg,.st img{display:block;width:100%;height:auto;overflow:visible}'
        . '.st-emoji{font-size:calc(var(--w) * .82cqw);text-align:center}.st-text{font-size:max(12px,calc(var(--w) * .16cqw * var(--fs,1)));text-align:center;line-height:1.2}.st-text svg{font-size:inherit}.mask-circle img,.mask-heart img,.mask-star img,.mask-blob img{aspect-ratio:1;object-fit:cover}.mask-circle img{border-radius:50%}.mask-rounded img{border-radius:12%}.mask-arch img{aspect-ratio:4/5;object-fit:cover;border-radius:50% 50% 0 0/40% 40% 0 0}.mask-polaroid img{aspect-ratio:1;object-fit:cover;background:#fff;padding:6% 6% 20%;box-shadow:0 4px 14px rgba(0,0,0,.18)}.mask-stamp img{background:#fff;padding:6%;outline:2px dashed #fff;outline-offset:-3px;box-shadow:0 2px 6px rgba(0,0,0,.2)}.mask-heart img{-webkit-mask:url(data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Cpath%20d%3D%27M50%2095C18%2072%202%2055%204%2033%206%2013%2030%203%2050%2025%2070%203%2094%2013%2096%2033%2098%2055%2082%2072%2050%2095Z%27%2F%3E%3C%2Fsvg%3E) center/100% 100%;mask:url(data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Cpath%20d%3D%27M50%2095C18%2072%202%2055%204%2033%206%2013%2030%203%2050%2025%2070%203%2094%2013%2096%2033%2098%2055%2082%2072%2050%2095Z%27%2F%3E%3C%2Fsvg%3E) center/100% 100%}.mask-star img{-webkit-mask:url(data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Cpath%20d%3D%27M50%202%2062%2036%2098%2037%2069%2059%2080%2096%2050%2075%2020%2096%2031%2059%202%2037%2038%2036Z%27%2F%3E%3C%2Fsvg%3E) center/100% 100%;mask:url(data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Cpath%20d%3D%27M50%202%2062%2036%2098%2037%2069%2059%2080%2096%2050%2075%2020%2096%2031%2059%202%2037%2038%2036Z%27%2F%3E%3C%2Fsvg%3E) center/100% 100%}.mask-blob img{-webkit-mask:url(data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Cpath%20d%3D%27M54%204C77%204%2097%2021%2093%2046%2090%2066%2097%2085%2074%2093%2052%20101%2029%2093%2015%2079%201%2064%203%2039%2015%2023%2025%209%2038%204%2054%204Z%27%2F%3E%3C%2Fsvg%3E) center/100% 100%;mask:url(data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%20preserveAspectRatio%3D%27none%27%3E%3Cpath%20d%3D%27M54%204C77%204%2097%2021%2093%2046%2090%2066%2097%2085%2074%2093%2052%20101%2029%2093%2015%2079%201%2064%203%2039%2015%2023%2025%209%2038%204%2054%204Z%27%2F%3E%3C%2Fsvg%3E) center/100% 100%}.fx-gradient-sunset,.fx-gradient-ocean,.fx-gradient-rainbow{-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent}.fx-gradient-sunset{background-image:linear-gradient(90deg,#ff6b6b,#f7a046 55%,#e8547a)}.fx-gradient-ocean{background-image:linear-gradient(90deg,#1e6fd9,#22a6b3 55%,#3fc9a0)}.fx-gradient-rainbow{background-image:linear-gradient(90deg,#e8546b,#f29e4c,#e8c547,#6bbf8a,#5aa9e6,#9b7be0)}.fx-shadow{text-shadow:.05em .07em .12em rgba(30,20,30,.32)}.b{position:relative}'
        . export_ff_css() . ''
        . '.st-tape i{display:block;height:calc(var(--w) * .26cqw);min-height:12px;opacity:.85}'
        . '.tx-note span,.tx-label span,.tx-bubble span,.tx-tag span,.tx-ticket span{display:inline-block;padding:.3em .6em}.tx-note span{background:#fff3a3;box-shadow:0 3px 8px rgba(0,0,0,.15)}'
        . '.tx-label span,.tx-bubble span{background:#fff;border-radius:999px;box-shadow:0 2px 6px rgba(0,0,0,.15)}.tx-tag span{background:#3b3340;color:#fff;border-radius:4px}'
        . '.tx-ticket span{border:2px dashed currentColor;border-radius:6px}.tx-neon span{text-shadow:0 0 .2em currentColor,0 0 .5em currentColor}'
        . '.tx-outline span{-webkit-text-fill-color:transparent;-webkit-text-stroke:.04em currentColor}.tx-shadow span{text-shadow:.06em .06em 0 rgba(0,0,0,.25)}'
        . '.ol-white svg,.ol-white img,.ol-white span{filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 1px #fff)}.ol-shadow svg,.ol-shadow img,.ol-shadow span{filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}'
        . '.ol-both svg,.ol-both img,.ol-both span{filter:drop-shadow(0 0 2px #fff) drop-shadow(0 3px 4px rgba(0,0,0,.3))}'
        . '.music,.reactions{text-align:center}'
        . '@media (max-width:560px){.phototext,.columns{grid-template-columns:1fr}.phototext.side-right figure{order:0}}@media print{.letter{break-before:page}.scene{padding:0;background:none!important}}';
}

function export_index_html(array $user, array $letters): string
{
    $toc = '';
    foreach ($letters as $l) {
        $toc .= '<li><a href="#carta-' . (int) $l['id'] . '">' . e(($l['title_shown'] ?? $l['title']) ?: 'Carta') . '</a> <small>'
            . e(($l['mine'] ? 'para ' . ($l['recipient_name'] ?: 'ninguém ainda') : 'de ' . $l['sender_name']) . ' · ' . ($l['sent_at'] ? fmt_date($l['sent_at'], false) : 'rascunho')) . '</small></li>';
    }
    $html = '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>Cartas de ' . e($user['name']) . '</title><style>' . export_css() . '</style></head><body><main>'
        . '<p class="meta">' . e(app_name()) . ' · exportado em ' . e(fmt_date_long(now())) . '</p><h1>As cartas de ' . e($user['name']) . '</h1>'
        . '<p>' . count($letters) . ' carta' . (count($letters) === 1 ? '' : 's') . '. Este arquivo abre em qualquer navegador, mesmo sem internet. '
        . 'As letras e os enfeites são uma aproximação: sem internet, o navegador usa as letras que tiver no aparelho.</p><ol>' . $toc . '</ol>';
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
            'id' => (int) $l['id'], 'titulo' => $l['title_shown'] ?? $l['title'], 'de' => $l['sender_name'], 'para' => $l['recipient_name'],
            'situacao' => $l['status'], 'enviada_em' => $l['sent_at'], 'abrir_a_partir_de' => $l['open_at'],
            'aberta_pela_primeira_vez' => $l['first_opened_at'], 'conteudo' => $l['content'], 'recados' => $l['replies'], 'reacoes' => $l['reactions'],
            // {id do bloco: {value: opção escolhida (0 = A) ou "used", at: quando}}
            'respostas_e_vales' => $l['interactions'] ?: new stdClass(),
        ], $letters),
        'modelos' => array_map(fn($t) => ['nome' => $t['name'], 'criado_em' => $t['created_at'], 'conteudo' => json_decode((string) $t['content'], true)], q_all('SELECT name, content, created_at FROM templates WHERE user_id = ? ORDER BY id', [(int) $user['id']])),
    ];
    return json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
}
