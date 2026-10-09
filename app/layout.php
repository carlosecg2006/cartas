<?php
declare(strict_types=1);

const LETTER_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700'
    . '&family=Gloria+Hallelujah&family=Homemade+Apple&family=Indie+Flower&family=Lora:ital,wght@0,400;0,700;1,400'
    . '&family=Nunito:ital,wght@0,400;0,700;1,400&family=Patrick+Hand&family=Playfair+Display:ital,wght@0,400;0,700;1,400'
    . '&family=Quicksand:wght@400;700&family=Shadows+Into+Light&family=Special+Elite&display=swap';

/**
 * Opções: css (lista), body (classe do body), letter_fonts (bool), nav (bool), title_suffix (bool)
 */
function page_head(string $title, array $opts = []): void
{
    $user = current_user_safe();
    $css = array_merge(['assets/css/app.css'], $opts['css'] ?? []);
    ?>
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="csrf-token" content="<?= e(csrf_token()) ?>">
<meta name="robots" content="noindex, nofollow">
<title><?= e($title) ?> · <?= e(app_name()) ?></title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💌</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Fraunces:opsz,wght@9..144,500;9..144,700&family=Nunito:wght@400;600;700;800&display=swap">
<?php if (!empty($opts['letter_fonts'])): ?>
<link rel="stylesheet" href="<?= e(LETTER_FONTS_URL) ?>">
<?php endif; ?>
<?php foreach ($css as $file): ?>
<link rel="stylesheet" href="<?= asset($file) ?>">
<?php endforeach; ?>
</head>
<body class="<?= e($opts['body'] ?? '') ?>">
<?php if (($opts['nav'] ?? true) && $user): ?>
<header class="topbar">
    <a class="brand" href="index.php"><span class="brand-icon">💌</span><span><?= e(app_name()) ?></span></a>
    <nav class="nav">
        <?php if ($user['role'] === 'admin'): ?>
            <a href="index.php" class="<?= nav_active('index.php') ?>">Cartas</a>
            <a href="amigos.php" class="<?= nav_active('amigos.php') ?>">Amigos</a>
        <?php else: ?>
            <a href="index.php" class="<?= nav_active('index.php') ?>">Minhas cartas</a>
        <?php endif; ?>
        <a href="conta.php" class="<?= nav_active('conta.php') ?>" title="Minha conta"><?= avatar_html($user, 'sm') ?></a>
    </nav>
</header>
<?php endif; ?>
<?php foreach (take_flashes() as $f): ?>
<div class="flash flash-<?= e($f['type']) ?>" role="status"><?= e($f['message']) ?></div>
<?php endforeach; ?>
<?php
}

function page_foot(array $js = []): void
{
    $js = array_merge(['assets/js/app.js'], $js);
    foreach ($js as $file) {
        if (str_starts_with($file, 'https://')) {
            echo '<script src="' . e($file) . '" defer></script>' . "\n";
        } else {
            echo '<script src="' . asset($file) . '" defer></script>' . "\n";
        }
    }
    echo "</body>\n</html>\n";
}

function nav_active(string $page): string
{
    return basename($_SERVER['SCRIPT_NAME'] ?? '') === $page ? 'active' : '';
}

/** current_user() sem quebrar quando o banco ainda não existe (instalador). */
function current_user_safe(): ?array
{
    try {
        return $GLOBALS['config'] !== null ? current_user() : null;
    } catch (Throwable $e) {
        return null;
    }
}
