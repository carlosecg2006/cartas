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
    'special', 'playfair', 'lora', 'nunito', 'quicksand'];
const PAPER_STYLES = ['plain', 'lined', 'grid', 'dots', 'kraft', 'vintage', 'parchment', 'image'];
const PAPER_BORDERS = ['none', 'simple', 'double', 'dashed', 'stamp', 'hearts', 'flowers'];
const PAPER_SCENES = ['desk', 'pink', 'sky', 'night', 'garden', 'plain', 'image'];
const REVEAL_MODES = ['fade', 'write', 'none'];
const SCRATCH_COVERS = ['silver', 'gold', 'pink', 'mint'];
const IMAGE_FITS = ['cover', 'contain', 'tile'];
const TEXT_SIZES = ['sm', 'md', 'lg'];
const BLOCK_SIZES = ['', 'sm', 'md', 'lg', 'xl'];
const ALIGNS = ['left', 'center', 'right'];
const ENVELOPE_LINERS = ['plain', 'stripes', 'dots', 'hearts', 'stars'];
const DIVIDER_STYLES = ['line', 'dashed', 'dots', 'hearts', 'stars', 'flowers', 'wave'];
const IMAGE_FRAMES = ['plain', 'polaroid', 'rounded', 'tape', 'circle'];
const IMAGE_WIDTHS = ['sm', 'md', 'lg'];
const TAPE_PATTERNS = ['pink', 'mint', 'yellow', 'lilac', 'dots', 'stripes', 'grid', 'hearts'];
const TEXT_STICKER_STYLES = ['none', 'label', 'note', 'bubble'];
const SPOTIFY_KINDS = ['track', 'album', 'playlist', 'episode'];
const DOODLE_NAMES = ['heart', 'heart-fill', 'star', 'sparkle', 'arrow', 'arrow-loop', 'swirl', 'squiggle', 'circle',
    'underline', 'flower', 'leaf', 'cloud', 'sun', 'moon', 'smile', 'xo', 'crown', 'bow', 'note'];
const STAMP_NAMES = ['heart', 'flower', 'bird', 'moon', 'coffee', 'mountain', 'wave', 'plane', 'cat', 'sun'];
const EFFECT_NAMES = ['none', 'hearts', 'confetti', 'petals', 'stars', 'snow'];
const GALLERY_LAYOUTS = ['scatter', 'grid', 'strip'];
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
            'size' => 'md', 'border' => 'none', 'scene' => 'desk',
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
    return mb_substr($out, 0, $max);
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
        if (in_array($class, ['t-sm', 't-lg', 't-xl'], true)) {
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
            'border' => pick($p['border'] ?? null, PAPER_BORDERS, 'none'),
            'scene' => pick($p['scene'] ?? null, PAPER_SCENES, 'desk'),
            'image' => media_or($p['image'] ?? ''),
            'imageFit' => pick($p['imageFit'] ?? null, IMAGE_FITS, 'cover'),
            'veil' => num($p['veil'] ?? 0.35, 0, 0.9, 0.35),
            'veilDark' => !empty($p['veilDark']),
            'sceneImage' => media_or($p['sceneImage'] ?? ''),
            'sceneBlur' => num($p['sceneBlur'] ?? 0, 0, 24, 0),
            'sceneDim' => num($p['sceneDim'] ?? 0, 0, 0.8, 0),
        ],
        'envelope' => [
            'color' => color_or($env['color'] ?? null, '#e9b8b0'),
            'liner' => pick($env['liner'] ?? null, ENVELOPE_LINERS, 'hearts'),
            'seal' => plain($env['seal'] ?? '❤', 8) ?: '❤',
            'sealColor' => color_or($env['sealColor'] ?? null, '#a8323e'),
            'stamp' => pick($env['stamp'] ?? '', array_merge([''], STAMP_NAMES), ''),
            'label' => plain($env['label'] ?? '', 80),
        ],
        'effect' => pick($raw['effect'] ?? 'none', EFFECT_NAMES, 'none'),
        'reveal' => pick($raw['reveal'] ?? 'fade', REVEAL_MODES, 'fade'),
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
    return $content;
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
        default:
            return null;
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
function content_media(array $content): array
{
    $files = [];
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
