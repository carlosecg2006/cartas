<?php
// Copie este arquivo para config.php e preencha (ou use o instalador: /install.php).
return [
    'app_name' => 'Minhas Cartas',
    'timezone' => 'America/Sao_Paulo',
    'db' => [
        'driver' => 'mysql',          // 'mysql' (hospedagem) ou 'sqlite' (teste local)
        'host' => 'localhost',
        'port' => 3306,
        'name' => 'cartas',
        'user' => 'root',
        'pass' => '',
        'sqlite_path' => 'storage/cartas.sqlite',
    ],
    'max_upload_mb' => 8,
];
