<?php
declare(strict_types=1);

/*
 * Validação do conteúdo das cartas.
 * O editor envia um JSON com papel, envelope, blocos e adesivos; aqui tudo é
 * conferido contra uma lista de valores permitidos e o HTML dos textos passa
 * por uma lista branca de tags, para nada perigoso chegar ao leitor.
 * As mesmas opções existem em assets/js/letter.js — mantenha as duas em sincronia.
 */

const LETTER_FONTS = ['caveat', 'dancing', 'indie', 'patrick', 'shadows', 'homemade', 'gloria',
    'special', 'playfair', 'lora', 'nunito', 'quicksand',
    'pacifico', 'greatvibes', 'satisfy', 'amatic', 'kalam', 'sacramento', 'courier', 'reenie', 'fredoka', 'cormorant', 'marker', 'nanum'];
const PAPER_STYLES = ['plain', 'lined', 'grid', 'dots', 'kraft', 'vintage', 'parchment', 'image',
    'watercolor', 'linen', 'notebook', 'music', 'gradient'];
const PAPER_BORDERS = ['none', 'simple', 'double', 'dashed', 'stamp', 'hearts', 'flowers',
    'stars', 'scallop', 'polaroid', 'ticket'];
const PAPER_SCENES = ['desk', 'pink', 'sky', 'night', 'garden', 'plain', 'image',
    'sunset', 'beach', 'lavender', 'confetti', 'wood', 'marble'];
const REVEAL_MODES = ['fade', 'write', 'none'];
const SCRATCH_COVERS = ['silver', 'gold', 'pink', 'mint'];
const IMAGE_FITS = ['cover', 'contain', 'tile'];
const TEXT_SIZES = ['sm', 'md', 'lg'];
const BLOCK_SIZES = ['', 'sm', 'md', 'lg', 'xl'];
const ALIGNS = ['left', 'center', 'right', 'justify'];
const ENVELOPE_LINERS = ['plain', 'stripes', 'dots', 'hearts', 'stars', 'flowers', 'checks'];
const DIVIDER_STYLES = ['line', 'dashed', 'dots', 'hearts', 'stars', 'flowers', 'wave'];
const IMAGE_FRAMES = ['plain', 'polaroid', 'rounded', 'tape', 'circle'];
const IMAGE_WIDTHS = ['sm', 'md', 'lg'];
const TAPE_PATTERNS = ['pink', 'mint', 'yellow', 'lilac', 'dots', 'stripes', 'grid', 'hearts',
    'flowers', 'stars', 'gingham', 'kraft', 'glitter', 'rainbow'];
const TEXT_STICKER_STYLES = ['none', 'label', 'note', 'bubble', 'neon', 'outline', 'tag', 'ticket', 'shadow'];
const SPOTIFY_KINDS = ['track', 'album', 'playlist', 'episode'];
const DOODLE_NAMES = ['heart', 'heart-fill', 'star', 'sparkle', 'arrow', 'arrow-loop', 'swirl', 'squiggle', 'circle',
    'underline', 'flower', 'leaf', 'cloud', 'sun', 'moon', 'smile', 'xo', 'crown', 'bow', 'note',
    'flower2', 'leaf2', 'sun2', 'moon2', 'cloud2', 'crown2', 'music', 'lips', 'envelope', 'camera', 'coffee2', 'cake',
    'gift', 'balloon', 'butterfly', 'rainbow', 'umbrella', 'plane2', 'house', 'key', 'lock', 'ring', 'cat2', 'paw'];
const STAMP_NAMES = ['heart', 'flower', 'bird', 'moon', 'coffee', 'mountain', 'wave', 'plane', 'cat', 'sun',
    'rose', 'star', 'cake', 'beach'];
// 'emoji' = chuva do seu jeito: os emojis escolhidos (effectOpts.emojis) caem quando o envelope abre
const EFFECT_NAMES = ['none', 'hearts', 'confetti', 'petals', 'stars', 'snow', 'emoji'];
const GALLERY_LAYOUTS = ['scatter', 'grid', 'strip'];
// Adesivos: animação, contorno recortado/sombra, filtro de foto e formas geométricas
const STICKER_ANIMS = ['', 'float', 'pulse', 'wiggle', 'spin', 'sparkle', 'bounce'];
const STICKER_OUTLINES = ['', 'white', 'shadow', 'both'];
const IMAGE_FILTERS = ['', 'pb', 'sepia', 'vintage', 'quente', 'frio', 'desbotado', 'contraste', 'sonho'];
const SHAPE_NAMES = ['circle', 'square', 'rounded', 'heart', 'star', 'blob', 'arrow', 'bubble', 'ribbon', 'badge', 'cloud', 'sparkle4'];
// Efeitos de texto (classes aceitas em <span>): marca-texto, sublinhado ondulado, brilho e contorno
const TEXT_FX_CLASSES = ['fx-hl-yellow', 'fx-hl-pink', 'fx-hl-green', 'fx-hl-blue', 'fx-wavy', 'fx-glow', 'fx-outline',
    'fx-gradient-sunset', 'fx-gradient-ocean', 'fx-gradient-rainbow', 'fx-shadow'];
// Espaçamento entre letras e entre linhas de um bloco ('' = o do papel)
const BLOCK_SPACING = ['', 'tight', 'wide', 'wider'];
const BLOCK_LEADING = ['', 'tight', 'loose', 'looser'];
// "Caixa" de qualquer bloco: fundo, borda, cantos, respiro, sombra, inclinação e largura
const BOX_BORDERS = ['none', 'solid', 'dashed', 'dotted', 'double'];
const BOX_RADII = ['0', 'sm', 'md', 'round'];
const BOX_PADS = ['none', 'sm', 'md'];
const BOX_WIDTHS = ['full', 'w75', 'w50'];
const BOX_POSITIONS = ['center', 'left', 'right'];
const REACTION_EMOJIS = ['❤️', '🥹', '😂', '😭', '🤗', '🔥', '✨', '🫶'];

const MEDIA_RE = '/^[a-f0-9]{32}\.(jpg|png|webp|gif)$/';
const AUDIO_RE = '/^[a-f0-9]{32}\.(webm|ogg|m4a|mp3)$/';
const ANY_MEDIA_RE = '/^[a-f0-9]{32}\.(jpg|png|webp|gif|webm|ogg|m4a|mp3)$/';

function default_letter_content(string $recipientName = '', string $senderName = ''): array
{
    $greeting = $recipientName !== '' ? 'Oi, ' . e(first_name($recipientName)) . '!' : '';
    return [
        'v' => 1,
        'paper' => [
            'style' => 'lined', 'color' => '#fffdf6', 'ink' => '#3b3340', 'font' => 'caveat',
            'size' => 'md', 'border' => 'none', 'scene' => 'desk', 'layout' => 2,
        ],
        'envelope' => ['color' => '#e9b8b0', 'liner' => 'hearts', 'seal' => '❤', 'sealColor' => '#a8323e', 'stamp' => 'heart', 'label' => ''],
        'effect' => 'hearts',
        'blocks' => [
            ['id' => 'b' . bin2hex(random_bytes(4)), 'type' => 'heading', 'level' => 1, 'html' => $greeting],
            ['id' => 'b' . bin2hex(random_bytes(4)), 'type' => 'paragraph', 'html' => ''],
            ['id' => 'b' . bin2hex(random_bytes(4)), 'type' => 'signature', 'closing' => 'Com carinho,',
                'name' => first_name($senderName), 'date' => fmt_date_long(now())],
        ],
        'stickers' => [],
    ];
}

// ---------- utilitários de validação ----------

function pick($value, array $allowed, $default)
{
    return in_array($value, $allowed, true) ? $value : $default;
}

function color_or($value, string $default): string
{
    return is_string($value) && preg_match('/^#[0-9a-fA-F]{6}$/', $value) ? strtolower($value) : $default;
}

function num($value, float $min, float $max, float $default): float
{
    if (!is_numeric($value)) {
        return $default;
    }
    return round(max($min, min($max, (float) $value)), 3);
}

function plain($value, int $max): string
{
    if (!is_string($value)) {
        return '';
    }
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    return mb_substr($value, 0, $max);
}

function media_or($value): string
{
    return is_string($value) && preg_match(MEDIA_RE, $value) ? $value : '';
}

function safe_id($value): string
{
    return is_string($value) && preg_match('/^[A-Za-z0-9_-]{1,24}$/', $value) ? $value : 'b' . bin2hex(random_bytes(4));
}

/** Data do contador: 'AAAA-MM-DD' ou 'AAAA-MM-DDTHH:MM' (data real); senão vazio. */
function counter_date_or($value): string
{
    if (!is_string($value) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/', $value, $m)) {
        return '';
    }
    if (!checkdate((int) $m[2], (int) $m[3], (int) $m[1]) || (int) $m[1] < 1900 || (int) $m[1] > 2200) {
        return '';
    }
    if (isset($m[4]) && ((int) $m[4] > 23 || (int) $m[5] > 59)) {
        return '';
    }
    return $value;
}

/** Link de botão: só http/https; "exemplo.com" vira "https://exemplo.com". Inválido → vazio. */
function safe_url($value): string
{
    if (!is_string($value)) {
        return '';
    }
    $url = trim($value);
    if ($url === '' || strlen($url) > 500 || preg_match('/[\s<>"\x00-\x1F]/', $url)) {
        return '';
    }
    if (!preg_match('#^[a-z][a-z0-9+.-]*:#i', $url)) {
        $url = 'https://' . ltrim($url, '/');
    }
    $parts = parse_url($url);
    if (!$parts || !in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true) || empty($parts['host'])
        || !preg_match('/^[a-z0-9.-]+$/i', $parts['host']) || (!str_contains($parts['host'], '.') && strtolower($parts['host']) !== 'localhost')) {
        return '';
    }
    return preg_replace('#^https?#i', strtolower($parts['scheme']), $url) ?? '';
}

// ---------- HTML de texto (lista branca) ----------

function sanitize_inline_html($html, int $max = 20000): string
{
    if (!is_string($html)) {
        return '';
    }
    $html = trim($html);
    if ($html === '') {
        return '';
    }
    if (strlen($html) > $max * 3) {
        $html = substr($html, 0, $max * 3);
    }
    $doc = new DOMDocument();
    $prev = libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><div>' . $html . '</div>', LIBXML_NONET | LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    libxml_use_internal_errors($prev);

    $root = null;
    foreach ($doc->childNodes as $child) {
        if ($child instanceof DOMElement) {
            $root = $child;
            break;
        }
    }
    if (!$root) {
        return '';
    }
    $out = '';
    foreach ($root->childNodes as $child) {
        $out .= sanitize_node($child);
    }
    $out = preg_replace('/(<br>)+$/', '', $out) ?? $out;
    if (mb_strlen($out) > $max) {
        // cortar no meio de uma tag quebraria o bloco: nesse caso fica só o texto
        $text = html_entity_decode(strip_tags(str_replace('<br>', "\n", $out)), ENT_QUOTES, 'UTF-8');
        return nl2br(e(mb_substr($text, 0, (int) ($max * 0.8))), false);
    }
    return $out;
}

function sanitize_node(DOMNode $node): string
{
    if ($node instanceof DOMText) {
        return htmlspecialchars($node->nodeValue ?? '', ENT_NOQUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
    if (!$node instanceof DOMElement) {
        return '';
    }
    $tag = strtolower($node->tagName);
    $drop = ['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript',
        'textarea', 'select', 'button', 'input', 'head', 'title', 'meta', 'link', 'img', 'video', 'audio', 'form'];
    if (in_array($tag, $drop, true)) {
        return '';
    }
    $inner = '';
    foreach ($node->childNodes as $child) {
        $inner .= sanitize_node($child);
    }
    switch ($tag) {
        case 'b':
        case 'strong':
            return $inner === '' ? '' : '<b>' . $inner . '</b>';
        case 'i':
        case 'em':
            return $inner === '' ? '' : '<i>' . $inner . '</i>';
        case 'u':
            return $inner === '' ? '' : '<u>' . $inner . '</u>';
        case 's':
        case 'strike':
        case 'del':
            return $inner === '' ? '' : '<s>' . $inner . '</s>';
        case 'mark':
            return $inner === '' ? '' : '<mark>' . $inner . '</mark>';
        case 'br':
            return '<br>';
        case 'a':
            $href = trim($node->getAttribute('href'));
            if ($inner !== '' && preg_match('#^(https?://|mailto:)#i', $href)) {
                return '<a href="' . e($href) . '" target="_blank" rel="noopener noreferrer">' . $inner . '</a>';
            }
            return $inner;
        case 'span':
        case 'font':
            return wrap_styled_span($node, $tag, $inner);
        case 'div':
        case 'p':
            $prefix = $node->previousSibling ? '<br>' : '';
            return $prefix . $inner;
        default:
            return $inner;
    }
}

function wrap_styled_span(DOMElement $node, string $tag, string $inner): string
{
    if ($inner === '') {
        return '';
    }
    $styles = [];
    $classes = [];
    $colorRe = '/^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)|[a-z]{3,20})$/i';

    if ($tag === 'font') {
        $color = trim($node->getAttribute('color'));
        if ($color !== '' && preg_match($colorRe, $color)) {
            $styles[] = 'color: ' . $color;
        }
        $size = (int) $node->getAttribute('size');
        if ($size > 0) {
            $classes[] = $size <= 2 ? 't-sm' : ($size >= 6 ? 't-xl' : ($size >= 4 ? 't-lg' : ''));
        }
    }
    foreach (explode(';', $node->getAttribute('style')) as $decl) {
        if (!str_contains($decl, ':')) {
            continue;
        }
        [$prop, $value] = array_map('trim', explode(':', $decl, 2));
        $prop = strtolower($prop);
        $value = strtolower($value);
        if (in_array($prop, ['color', 'background-color'], true) && preg_match($colorRe, $value)) {
            $styles[] = $prop . ': ' . $value;
        } elseif ($prop === 'font-weight' && preg_match('/^(bold|normal|[1-9]00)$/', $value)) {
            $styles[] = $prop . ': ' . $value;
        } elseif ($prop === 'font-style' && in_array($value, ['italic', 'normal'], true)) {
            $styles[] = $prop . ': ' . $value;
        } elseif (in_array($prop, ['text-decoration', 'text-decoration-line'], true)
            && preg_match('/^(underline|line-through|none|underline line-through)$/', $value)) {
            $styles[] = 'text-decoration: ' . $value;
        }
    }
    foreach (preg_split('/\s+/', $node->getAttribute('class')) as $class) {
        // ff-<letra>: um trecho com outra letra da lista (ex.: ff-pacifico)
        if (in_array($class, ['t-sm', 't-lg', 't-xl'], true) || in_array($class, TEXT_FX_CLASSES, true)
            || (str_starts_with($class, 'ff-') && in_array(substr($class, 3), LETTER_FONTS, true))) {
            $classes[] = $class;
        }
    }
    $classes = array_values(array_unique(array_filter($classes)));
    if (!$styles && !$classes) {
        return $inner;
    }
    return '<span'
        . ($classes ? ' class="' . implode(' ', $classes) . '"' : '')
        . ($styles ? ' style="' . e(implode('; ', $styles)) . '"' : '')
        . '>' . $inner . '</span>';
}

// ---------- conteúdo da carta ----------

function sanitize_letter_content($raw): array
{
    $raw = is_array($raw) ? $raw : [];
    $p = is_array($raw['paper'] ?? null) ? $raw['paper'] : [];
    $env = is_array($raw['envelope'] ?? null) ? $raw['envelope'] : [];

    $content = [
        'v' => 1,
        'paper' => [
            'style' => pick($p['style'] ?? null, PAPER_STYLES, 'lined'),
            'color' => color_or($p['color'] ?? null, '#fffdf6'),
            'ink' => color_or($p['ink'] ?? null, '#3b3340'),
            'font' => pick($p['font'] ?? null, LETTER_FONTS, 'caveat'),
            'size' => pick($p['size'] ?? null, TEXT_SIZES, 'md'),
            // 1 = cartas antigas (projeto de 760 px); 2 = novas (600 px, letra maior no celular)
            'layout' => (int) pick((int) ($p['layout'] ?? 1), [1, 2], 1),
            'border' => pick($p['border'] ?? null, PAPER_BORDERS, 'none'),
            'scene' => pick($p['scene'] ?? null, PAPER_SCENES, 'desk'),
            'image' => media_or($p['image'] ?? ''),
            'imageFit' => pick($p['imageFit'] ?? null, IMAGE_FITS, 'cover'),
            'veil' => num($p['veil'] ?? 0.35, 0, 0.9, 0.35),
            'veilDark' => !empty($p['veilDark']),
            'sceneImage' => media_or($p['sceneImage'] ?? ''),
            'sceneBlur' => num($p['sceneBlur'] ?? 0, 0, 24, 0),
            'sceneDim' => num($p['sceneDim'] ?? 0, 0, 0.8, 0),
            'color2' => color_or($p['color2'] ?? null, '#f6d6e0'),
        ],
        'envelope' => [
            'color' => color_or($env['color'] ?? null, '#e9b8b0'),
            'liner' => pick($env['liner'] ?? null, ENVELOPE_LINERS, 'hearts'),
            'seal' => plain($env['seal'] ?? '❤', 8) ?: '❤',
            'sealColor' => color_or($env['sealColor'] ?? null, '#a8323e'),
            'stamp' => pick($env['stamp'] ?? '', array_merge([''], STAMP_NAMES), ''),
            'label' => plain($env['label'] ?? '', 80),
            // surpresa: quem recebe só vê o título depois de abrir
            'hideTitle' => !empty($env['hideTitle']),
        ] + (media_or($env['stampImage'] ?? '') !== '' ? ['stampImage' => media_or($env['stampImage'])] : []),
        'effect' => pick($raw['effect'] ?? 'none', EFFECT_NAMES, 'none'),
        'reveal' => pick($raw['reveal'] ?? 'fade', REVEAL_MODES, 'fade'),
        'bgm' => sanitize_bgm($raw['bgm'] ?? null),
        'blocks' => [],
        'stickers' => [],
    ];

    $ids = [];
    foreach (array_slice(is_array($raw['blocks'] ?? null) ? $raw['blocks'] : [], 0, 300) as $b) {
        if (!is_array($b)) {
            continue;
        }
        $block = sanitize_block($b);
        if ($block === null || isset($ids[$block['id']])) {
            continue;
        }
        $ids[$block['id']] = true;
        $content['blocks'][] = $block;
    }

    foreach (array_slice(is_array($raw['stickers'] ?? null) ? $raw['stickers'] : [], 0, 200) as $s) {
        if (!is_array($s)) {
            continue;
        }
        $sticker = sanitize_sticker($s, $ids);
        if ($sticker !== null) {
            $content['stickers'][] = $sticker;
        }
    }
    $effectOpts = sanitize_effect_opts($raw['effectOpts'] ?? null);
    if ($effectOpts) {
        $content['effectOpts'] = $effectOpts;
    }
    return $content;
}

/** Opções do efeito de abertura: até 3 emojis (chuva do seu jeito) e até 4 cores. Vazio = nada guardado. */
function sanitize_effect_opts($raw): array
{
    if (!is_array($raw)) {
        return [];
    }
    $out = [];
    $emojis = [];
    foreach (array_slice(is_array($raw['emojis'] ?? null) ? $raw['emojis'] : [], 0, 3) as $em) {
        $em = trim(plain($em, 16));
        if ($em === '' || preg_match('/[\s<>&"]/u', $em) || (function_exists('grapheme_strlen') && grapheme_strlen($em) > 3)) {
            continue;
        }
        $emojis[$em] = true;
    }
    if ($emojis) {
        $out['emojis'] = array_keys($emojis);
    }
    $colors = [];
    foreach (array_slice(is_array($raw['colors'] ?? null) ? $raw['colors'] : [], 0, 4) as $c) {
        $c = color_or($c, '');
        if ($c !== '') {
            $colors[$c] = true;
        }
    }
    if ($colors) {
        $out['colors'] = array_keys($colors);
    }
    return $out;
}

/** "Caixa" opcional de um bloco (vale para todos os tipos). Nada escolhido = sem caixa (null). */
function sanitize_block_box($raw): ?array
{
    if (!is_array($raw)) {
        return null;
    }
    $box = [
        'bg' => color_or($raw['bg'] ?? null, ''),
        'border' => pick($raw['border'] ?? 'none', BOX_BORDERS, 'none'),
        'bc' => color_or($raw['bc'] ?? null, '#3b3340'),
        'radius' => pick((string) ($raw['radius'] ?? '0'), BOX_RADII, '0'),
        'pad' => pick($raw['pad'] ?? 'none', BOX_PADS, 'none'),
        'shadow' => !empty($raw['shadow']),
        'tilt' => (int) round(num($raw['tilt'] ?? 0, -4, 4, 0)),
        'width' => pick($raw['width'] ?? 'full', BOX_WIDTHS, 'full'),
        'pos' => pick($raw['pos'] ?? 'center', BOX_POSITIONS, 'center'),
    ];
    $empty = $box['bg'] === '' && $box['border'] === 'none' && $box['radius'] === '0' && $box['pad'] === 'none'
        && !$box['shadow'] && $box['tilt'] === 0 && $box['width'] === 'full';
    return $empty ? null : $box;
}

function sanitize_block(array $b): ?array
{
    $type = $b['type'] ?? '';
    $block = [
        'id' => safe_id($b['id'] ?? null),
        'type' => $type,
        'align' => pick($b['align'] ?? null, ALIGNS, 'left'),
        'font' => pick($b['font'] ?? '', array_merge([''], LETTER_FONTS), ''),
        'size' => pick($b['size'] ?? '', BLOCK_SIZES, ''),
        'color' => color_or($b['color'] ?? null, ''),
    ];
    switch ($type) {
        case 'heading':
            $block['level'] = (int) pick((int) ($b['level'] ?? 1), [1, 2, 3], 1);
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            break;
        case 'paragraph':
        case 'quote':
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            break;
        case 'list':
            $block['style'] = pick($b['style'] ?? null, ['bullet', 'number'], 'bullet');
            $block['items'] = [];
            foreach (array_slice(is_array($b['items'] ?? null) ? $b['items'] : [], 0, 200) as $item) {
                $block['items'][] = sanitize_inline_html($item, 5000);
            }
            if (!$block['items']) {
                $block['items'] = [''];
            }
            break;
        case 'checklist':
            $block['items'] = [];
            foreach (array_slice(is_array($b['items'] ?? null) ? $b['items'] : [], 0, 200) as $item) {
                if (is_array($item)) {
                    $block['items'][] = ['checked' => !empty($item['checked']), 'html' => sanitize_inline_html($item['html'] ?? '', 5000)];
                }
            }
            if (!$block['items']) {
                $block['items'] = [['checked' => false, 'html' => '']];
            }
            break;
        case 'callout':
            $block['emoji'] = plain($b['emoji'] ?? '💌', 8) ?: '💌';
            $block['bg'] = color_or($b['bg'] ?? null, '#fde8e4');
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            break;
        case 'image':
            $src = $b['src'] ?? '';
            $block['src'] = is_string($src) && preg_match(MEDIA_RE, $src) ? $src : '';
            $block['caption'] = plain($b['caption'] ?? '', 300);
            $block['frame'] = pick($b['frame'] ?? null, IMAGE_FRAMES, 'polaroid');
            $block['width'] = pick($b['width'] ?? null, IMAGE_WIDTHS, 'md');
            $block['tilt'] = num($b['tilt'] ?? 0, -12, 12, 0);
            $block['filter'] = pick($b['filter'] ?? '', IMAGE_FILTERS, '');
            break;
        case 'divider':
            $block['style'] = pick($b['style'] ?? null, DIVIDER_STYLES, 'hearts');
            break;
        case 'secret':
            $block['label'] = plain($b['label'] ?? '', 120) ?: 'Toque para revelar um segredo';
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            break;
        case 'music':
            $provider = pick($b['provider'] ?? null, ['youtube', 'spotify'], '');
            $mid = is_string($b['mid'] ?? null) ? $b['mid'] : '';
            $block['provider'] = $provider;
            $block['kind'] = $provider === 'spotify' ? pick($b['kind'] ?? null, SPOTIFY_KINDS, 'track') : 'video';
            $valid = ($provider === 'youtube' && preg_match('/^[A-Za-z0-9_-]{11}$/', $mid))
                || ($provider === 'spotify' && preg_match('/^[A-Za-z0-9]{22}$/', $mid));
            $block['mid'] = $valid ? $mid : '';
            if (!$valid) {
                $block['provider'] = '';
            }
            break;
        case 'signature':
            $block['closing'] = plain($b['closing'] ?? '', 120);
            $block['name'] = plain($b['name'] ?? '', 80);
            $block['date'] = plain($b['date'] ?? '', 80);
            break;
        case 'spacer':
            $block['height'] = (int) num($b['height'] ?? 40, 8, 240, 40);
            break;
        case 'pagebreak':
            break;
        case 'scratch':
            $block['label'] = plain($b['label'] ?? '', 80) ?: 'Raspe aqui';
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            $block['src'] = media_or($b['src'] ?? '');
            $block['cover'] = pick($b['cover'] ?? null, SCRATCH_COVERS, 'silver');
            break;
        case 'gallery':
            $block['layout'] = pick($b['layout'] ?? null, GALLERY_LAYOUTS, 'scatter');
            $block['filter'] = pick($b['filter'] ?? '', IMAGE_FILTERS, '');
            $block['items'] = [];
            foreach (array_slice(is_array($b['items'] ?? null) ? $b['items'] : [], 0, 24) as $item) {
                $src = is_array($item) ? ($item['src'] ?? '') : '';
                if (is_string($src) && preg_match(MEDIA_RE, $src)) {
                    $block['items'][] = ['src' => $src, 'caption' => plain($item['caption'] ?? '', 120)];
                }
            }
            break;
        case 'phototext':
            $src = $b['src'] ?? '';
            $block['src'] = is_string($src) && preg_match(MEDIA_RE, $src) ? $src : '';
            $block['side'] = pick($b['side'] ?? null, ['left', 'right'], 'left');
            $block['filter'] = pick($b['filter'] ?? '', IMAGE_FILTERS, '');
            $block['frame'] = pick($b['frame'] ?? null, IMAGE_FRAMES, 'polaroid');
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            break;
        case 'audio':
            $src = $b['src'] ?? '';
            $block['src'] = is_string($src) && preg_match(AUDIO_RE, $src) ? $src : '';
            $block['label'] = plain($b['label'] ?? '', 80);
            $block['duration'] = num($b['duration'] ?? 0, 0, 3600, 0);
            $block['peaks'] = [];
            foreach (array_slice(is_array($b['peaks'] ?? null) ? $b['peaks'] : [], 0, 64) as $p) {
                $block['peaks'][] = num($p, 0, 1, 0.3);
            }
            break;
        case 'toggle':
            $block['title'] = plain($b['title'] ?? '', 120);
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            break;
        case 'timeline':
            $block['items'] = [];
            foreach (array_slice(is_array($b['items'] ?? null) ? $b['items'] : [], 0, 30) as $item) {
                if (is_array($item)) {
                    $block['items'][] = [
                        'date' => plain($item['date'] ?? '', 40),
                        'title' => plain($item['title'] ?? '', 120),
                        'html' => sanitize_inline_html($item['html'] ?? '', 5000),
                    ];
                }
            }
            if (!$block['items']) {
                $block['items'] = [['date' => '', 'title' => '', 'html' => '']];
            }
            break;
        case 'counter':
            $block['mode'] = pick($b['mode'] ?? null, ['since', 'until'], 'since');
            $block['date'] = counter_date_or($b['date'] ?? '');
            $block['label'] = plain($b['label'] ?? '', 120);
            break;
        case 'quiz':
            $block['question'] = plain($b['question'] ?? '', 200);
            $block['options'] = [];
            foreach (array_slice(is_array($b['options'] ?? null) ? $b['options'] : [], 0, 4) as $opt) {
                $block['options'][] = plain(is_string($opt) ? $opt : '', 100);
            }
            while (count($block['options']) < 2) {
                $block['options'][] = '';
            }
            $answer = is_numeric($b['answer'] ?? null) ? (int) $b['answer'] : -1;
            $block['answer'] = $answer >= 0 && $answer < count($block['options']) ? $answer : -1;
            $block['right'] = plain($b['right'] ?? '', 160);
            $block['wrong'] = plain($b['wrong'] ?? '', 160);
            break;
        case 'coupon':
            $block['title'] = plain($b['title'] ?? '', 80);
            $block['details'] = plain($b['details'] ?? '', 200);
            $block['bg'] = color_or($b['bg'] ?? null, '#f6d7c3');
            $block['emoji'] = plain($b['emoji'] ?? '🎟️', 8) ?: '🎟️';
            break;
        case 'poem':
            $block['html'] = sanitize_inline_html($b['html'] ?? '');
            $block['author'] = plain($b['author'] ?? '', 80);
            break;
        case 'place':
            $block['emoji'] = plain($b['emoji'] ?? '📍', 8) ?: '📍';
            $block['name'] = plain($b['name'] ?? '', 120);
            $block['caption'] = plain($b['caption'] ?? '', 160);
            $block['date'] = plain($b['date'] ?? '', 40);
            break;
        case 'columns':
            $block['left'] = sanitize_inline_html($b['left'] ?? '');
            $block['right'] = sanitize_inline_html($b['right'] ?? '');
            break;
        case 'button':
            $block['label'] = plain($b['label'] ?? '', 80);
            $block['url'] = safe_url($b['url'] ?? '');
            break;
        default:
            return null;
    }
    // opcionais de qualquer bloco: só entram quando escolhidos (cartas antigas ficam iguais)
    $spacing = pick($b['spacing'] ?? '', BLOCK_SPACING, '');
    $leading = pick($b['leading'] ?? '', BLOCK_LEADING, '');
    if ($spacing !== '') {
        $block['spacing'] = $spacing;
    }
    if ($leading !== '') {
        $block['leading'] = $leading;
    }
    $box = sanitize_block_box($b['box'] ?? null);
    if ($box) {
        $block['box'] = $box;
    }
    return $block;
}

function sanitize_sticker(array $s, array $blockIds): ?array
{
    $anchor = is_string($s['anchor'] ?? null) && isset($blockIds[$s['anchor']]) ? $s['anchor'] : '';
    $sticker = [
        'id' => safe_id($s['id'] ?? null),
        'kind' => $s['kind'] ?? '',
        'x' => num($s['x'] ?? 50, -20, 120, 50),
        'y' => num($s['y'] ?? 0, -50, 5000, 0),
        'anchor' => $anchor,
        'w' => num($s['w'] ?? 10, 2, 100, 10),
        'r' => num($s['r'] ?? 0, -180, 180, 0),
        'o' => num($s['o'] ?? 1, 0.1, 1, 1),
        'f' => !empty($s['f']),
        'lk' => !empty($s['lk']),
        'an' => pick($s['an'] ?? '', STICKER_ANIMS, ''),
        'ol' => pick($s['ol'] ?? '', STICKER_OUTLINES, ''),
    ];
    switch ($sticker['kind']) {
        case 'emoji':
            $sticker['char'] = plain($s['char'] ?? '', 16);
            if ($sticker['char'] === '') {
                return null;
            }
            break;
        case 'image':
            $src = $s['src'] ?? '';
            if (!is_string($src) || !preg_match(MEDIA_RE, $src)) {
                return null;
            }
            $sticker['src'] = $src;
            $sticker['fi'] = pick($s['fi'] ?? '', IMAGE_FILTERS, '');
            break;
        case 'text':
            $sticker['text'] = plain($s['text'] ?? '', 300);
            $sticker['font'] = pick($s['font'] ?? null, LETTER_FONTS, 'caveat');
            $sticker['color'] = color_or($s['color'] ?? null, '#3b3340');
            $sticker['style'] = pick($s['style'] ?? null, TEXT_STICKER_STYLES, 'none');
            break;
        case 'tape':
            $sticker['pattern'] = pick($s['pattern'] ?? null, TAPE_PATTERNS, 'pink');
            break;
        case 'doodle':
            $sticker['name'] = pick($s['name'] ?? null, DOODLE_NAMES, 'heart');
            $sticker['c'] = color_or($s['c'] ?? null, '#3b3340');
            break;
        case 'shape':
            $sticker['name'] = pick($s['name'] ?? null, SHAPE_NAMES, 'heart');
            $sticker['c'] = color_or($s['c'] ?? null, '#f4a3b5');
            $sticker['s'] = color_or($s['s'] ?? null, '');
            $sticker['sw'] = num($s['sw'] ?? 0, 0, 8, 0);
            break;
        case 'drawing':
            $sticker['vw'] = num($s['vw'] ?? 100, 1, 5000, 100);
            $sticker['vh'] = num($s['vh'] ?? 100, 1, 5000, 100);
            $sticker['paths'] = [];
            foreach (array_slice(is_array($s['paths'] ?? null) ? $s['paths'] : [], 0, 150) as $path) {
                $d = is_array($path) ? ($path['d'] ?? '') : '';
                if (is_string($d) && $d !== '' && strlen($d) <= 30000 && preg_match('/^[MLQCZmlqcz0-9.,\s-]+$/', $d)) {
                    $sticker['paths'][] = [
                        'd' => $d,
                        'c' => color_or($path['c'] ?? null, '#3b3340'),
                        's' => num($path['s'] ?? 3, 0.5, 40, 3),
                    ];
                }
            }
            if (!$sticker['paths']) {
                return null;
            }
            break;
        default:
            return null;
    }
    return $sticker;
}

/** Arquivos de mídia citados por um conteúdo. */
/** Música que toca enquanto a carta é lida: um arquivo de áudio seu ou um vídeo do YouTube. */
function sanitize_bgm($raw): array
{
    $raw = is_array($raw) ? $raw : [];
    $kind = pick($raw['kind'] ?? 'none', ['none', 'file', 'youtube', 'spotify'], 'none');
    $src = (string) ($raw['src'] ?? '');
    $mid = (string) ($raw['mid'] ?? '');
    if ($kind === 'file' && preg_match(AUDIO_RE, $src)) {
        return ['kind' => 'file', 'src' => $src, 'name' => plain($raw['name'] ?? '', 80), 'volume' => num($raw['volume'] ?? 0.6, 0.05, 1, 0.6)];
    }
    if ($kind === 'spotify' && preg_match('/^[A-Za-z0-9]{22}$/', $mid)) {
        // O Spotify não toca sozinho: vira um player pequeno que a pessoa toca
        return ['kind' => 'spotify', 'skind' => pick($raw['skind'] ?? null, SPOTIFY_KINDS, 'track'), 'mid' => $mid, 'name' => plain($raw['name'] ?? '', 80)];
    }
    if ($kind === 'youtube' && preg_match('/^[A-Za-z0-9_-]{11}$/', $mid)) {
        return ['kind' => 'youtube', 'mid' => $mid, 'name' => plain($raw['name'] ?? '', 80), 'start' => (int) num($raw['start'] ?? 0, 0, 36000, 0), 'volume' => num($raw['volume'] ?? 0.6, 0.05, 1, 0.6)];
    }
    return ['kind' => 'none'];
}

function content_media(array $content): array
{
    $files = [];
    if (!empty($content['envelope']['stampImage'])) {
        $files[] = $content['envelope']['stampImage'];
    }
    if (($content['bgm']['kind'] ?? '') === 'file' && !empty($content['bgm']['src'])) {
        $files[] = $content['bgm']['src'];
    }
    foreach (['image', 'sceneImage'] as $key) {
        if (!empty($content['paper'][$key])) {
            $files[] = $content['paper'][$key];
        }
    }
    foreach ($content['blocks'] ?? [] as $b) {
        if (in_array($b['type'] ?? '', ['image', 'phototext', 'audio', 'scratch'], true) && !empty($b['src'])) {
            $files[] = $b['src'];
        }
        if (($b['type'] ?? '') === 'gallery') {
            foreach ($b['items'] ?? [] as $item) {
                if (!empty($item['src'])) {
                    $files[] = $item['src'];
                }
            }
        }
    }
    foreach ($content['stickers'] ?? [] as $s) {
        if (($s['kind'] ?? '') === 'image' && !empty($s['src'])) {
            $files[] = $s['src'];
        }
    }
    return array_values(array_unique($files));
}

/** Um trecho de texto puro para pré-visualizações. */
function content_excerpt(array $content, int $max = 140): string
{
    $parts = [];
    foreach ($content['blocks'] ?? [] as $b) {
        $texts = [];
        if (isset($b['html'])) {
            $texts[] = $b['html'];
        }
        foreach ($b['items'] ?? [] as $item) {
            $texts[] = is_array($item) ? ($item['html'] ?? '') : $item;
        }
        if (in_array($b['type'] ?? '', ['secret', 'scratch'], true)) {
            $texts = [($b['label'] ?? '')];
        }
        switch ($b['type'] ?? '') {
            case 'toggle': // o conteúdo fica escondido até abrir: só o título
                $texts = [$b['title'] ?? ''];
                break;
            case 'timeline':
                $texts = [];
                foreach ($b['items'] ?? [] as $item) {
                    $texts[] = trim(($item['title'] ?? '') . ' ' . ($item['html'] ?? ''));
                }
                break;
            case 'quiz': // a pergunta, sem as opções nem a resposta
                $texts = [$b['question'] ?? ''];
                break;
            case 'coupon':
                $texts = [$b['title'] ?? ''];
                break;
            case 'poem':
                $texts = [$b['html'] ?? '', $b['author'] ?? ''];
                break;
            case 'place':
                $texts = [$b['name'] ?? ''];
                break;
            case 'columns':
                $texts = [$b['left'] ?? '', $b['right'] ?? ''];
                break;
            case 'counter':
            case 'button':
                $texts = [$b['label'] ?? ''];
                break;
        }
        foreach ($texts as $t) {
            $t = trim(html_entity_decode(strip_tags(str_replace('<br>', ' ', (string) $t)), ENT_QUOTES, 'UTF-8'));
            if ($t !== '') {
                $parts[] = $t;
            }
        }
        if (mb_strlen(implode(' ', $parts)) > $max) {
            break;
        }
    }
    $text = implode(' · ', $parts);
    return mb_strlen($text) > $max ? rtrim(mb_substr($text, 0, $max - 1)) . '…' : $text;
}

/** Colunas derivadas do conteúdo, gravadas a cada salvamento (listas e busca não precisam abrir a carta inteira). */
function letter_derived(string $title, array $content): array
{
    return [
        'search_text' => letter_search_text($title, $content),
        'meta' => json_encode([
            'envelope' => $content['envelope'] ?? [],
            'paper' => $content['paper']['color'] ?? '#fffdf6',
            'excerpt' => content_excerpt($content, 160),
            'bgm' => ($content['bgm']['kind'] ?? 'none') !== 'none',
        ], JSON_UNESCAPED_UNICODE),
    ];
}

/** Texto puro da carta usado na busca (segredos e raspadinhas ficam de fora). */
function letter_search_text(string $title, array $content): string
{
    $text = trim($title . ' ' . ($content['envelope']['label'] ?? '') . ' ' . content_excerpt($content, 20000));
    return mb_substr($text, 0, 20000);
}

/** Tira da carta os arquivos listados (apagados da biblioteca ou de outra pessoa). */
function strip_media(array $content, array $files): array
{
    $bad = array_flip($files);
    foreach (['image', 'sceneImage'] as $k) {
        if (isset($bad[$content['paper'][$k] ?? ''])) {
            $content['paper'][$k] = '';
        }
    }
    if (isset($bad[$content['envelope']['stampImage'] ?? ''])) {
        unset($content['envelope']['stampImage']);
    }
    if (isset($bad[$content['bgm']['src'] ?? ''])) {
        $content['bgm'] = ['kind' => 'none'];
    }
    foreach ($content['blocks'] as &$b) {
        if (isset($b['src']) && isset($bad[$b['src']])) {
            $b['src'] = '';
        }
        if (isset($b['items']) && ($b['type'] ?? '') === 'gallery') {
            $b['items'] = array_values(array_filter($b['items'], fn($i) => !isset($bad[$i['src'] ?? ''])));
        }
    }
    unset($b);
    $content['stickers'] = array_values(array_filter($content['stickers'], fn($s) => !(($s['kind'] ?? '') === 'image' && isset($bad[$s['src'] ?? '']))));
    return $content;
}

/** Link do YouTube ou do Spotify → provedor e identificador (null se não reconhecer). */
function parse_music_url(string $url): ?array
{
    $url = trim($url);
    if (preg_match('~(?:youtu\.be/|youtube(?:-nocookie)?\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/))([A-Za-z0-9_-]{11})~', $url, $m)) {
        $start = preg_match('~[?&](?:t|start)=(\d+)~', $url, $t) ? min(36000, (int) $t[1]) : 0;
        return ['provider' => 'youtube', 'kind' => 'video', 'mid' => $m[1], 'start' => $start];
    }
    if (preg_match('~open\.spotify\.com/(?:intl-[a-z-]+/)?(?:embed/)?(track|album|playlist|episode)/([A-Za-z0-9]{22})~', $url, $m)) {
        return ['provider' => 'spotify', 'kind' => $m[1], 'mid' => $m[2]];
    }
    return null;
}

