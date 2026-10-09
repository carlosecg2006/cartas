<?php
declare(strict_types=1);

// Ações rápidas do painel (formulários simples, sem JavaScript)
require __DIR__ . '/app/bootstrap.php';

$admin = require_admin();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('index.php');
}
csrf_check();

$action = (string) ($_POST['acao'] ?? '');
$letter = !empty($_POST['id']) ? find_letter((int) $_POST['id']) : null;

switch ($action) {
    case 'criar':
        $id = create_letter(!empty($_POST['para']) ? (int) $_POST['para'] : null, $admin, (string) ($_POST['modelo'] ?? 'branco'));
        redirect('editor.php?id=' . $id);

    case 'duplicar':
        if ($letter) {
            $id = duplicate_letter($letter);
            flash('Carta duplicada. Escolha para quem ela vai quando terminar.');
            redirect('editor.php?id=' . $id);
        }
        break;

    case 'desenviar':
        if ($letter) {
            db_update('letters', (int) $letter['id'], ['status' => 'draft', 'updated_at' => now()]);
            flash('A carta voltou para os rascunhos.');
        }
        break;

    case 'excluir':
        if ($letter) {
            delete_letter((int) $letter['id']);
            flash('Carta excluída.');
        }
        break;
}
redirect('index.php');
