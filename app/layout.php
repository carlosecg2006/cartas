<?php
declare(strict_types=1);

const LETTER_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Dancing+Script:wght@400;700'
    . '&family=Gloria+Hallelujah&family=Homemade+Apple&family=Indie+Flower&family=Lora:ital,wght@0,400;0,700;1,400'
    . '&family=Nunito:ital,wght@0,400;0,700;1,400&family=Patrick+Hand&family=Playfair+Display:ital,wght@0,400;0,700;1,400'
    . '&family=Quicksand:wght@400;700&family=Shadows+Into+Light&family=Special+Elite&display=swap';

const UI_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700'
    . '&family=Instrument+Serif:ital@0;1&family=Caveat:wght@500;700&display=swap';

/**
 * Opções: css (lista), body (classe do body), letter_fonts (bool), nav (bool)
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
<meta name="theme-color" content="#f6f1ea" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171513" media="(prefers-color-scheme: dark)">
<meta name="color-scheme" content="light dark">
<script src="<?= asset('assets/js/theme.js') ?>"></script>
<title><?= e($title) ?> · <?= e(app_name()) ?></title>
<link rel="icon" href="assets/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="assets/icon-192.png">
<link rel="manifest" href="manifest.php">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="<?= e(UI_FONTS_URL) ?>">
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
    <a class="brand" href="index.php">
        <img class="brand-mark" src="assets/icon.svg" alt="" width="26" height="26">
        <span><?= e(app_name()) ?></span>
    </a>
    <nav class="nav">
        <?php $unread = unread_count((int) $user['id']); ?>
        <a href="index.php" class="<?= nav_active(['index.php', 'nova.php']) ?>"><?= icon('mail') ?><span>Cartas</span><?php if ($unread): ?><b class="nav-badge"><?= $unread ?></b><?php endif; ?></a>
        <a href="amigos.php" class="<?= nav_active(['amigos.php']) ?>"><?= icon('users') ?><span>Pessoas</span></a>
        <a href="conta.php" class="nav-me <?= nav_active(['conta.php']) ?>" title="Minha conta"><?= avatar_html($user, 'sm') ?></a>
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
        echo '<script src="' . (str_starts_with($file, 'https://') ? e($file) : asset($file)) . '" defer></script>' . "\n";
    }
    echo "</body>\n</html>\n";
}

/** Cartas recebidas, já entregues e destravadas, que ainda não foram abertas. */
function unread_count(int $userId): int
{
    return (int) q_val("SELECT COUNT(*) FROM letters l WHERE l.recipient_id = ? AND l.status = 'sent' AND l.first_opened_at IS NULL
        AND (l.open_at IS NULL OR l.open_at <= ?) AND " . sql_delivered(), [$userId, now()]);
}

function nav_active(array $pages): string
{
    return in_array(basename($_SERVER['SCRIPT_NAME'] ?? ''), $pages, true) ? 'active' : '';
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
