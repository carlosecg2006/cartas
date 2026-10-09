<?php
declare(strict_types=1);

// Permite instalar o site na tela inicial do celular, como um app
require __DIR__ . '/app/bootstrap.php';

header('Content-Type: application/manifest+json; charset=utf-8');
echo json_encode([
    'name' => app_name(),
    'short_name' => mb_substr(app_name(), 0, 12),
    'start_url' => './index.php',
    'scope' => './',
    'display' => 'standalone',
    'background_color' => '#f6f1ea',
    'theme_color' => '#f6f1ea',
    'lang' => 'pt-BR',
    'icons' => [
        ['src' => 'assets/icon-192.png', 'sizes' => '192x192', 'type' => 'image/png'],
        ['src' => 'assets/icon-512.png', 'sizes' => '512x512', 'type' => 'image/png'],
        ['src' => 'assets/icon.svg', 'sizes' => 'any', 'type' => 'image/svg+xml'],
    ],
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
