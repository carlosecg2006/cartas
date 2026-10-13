<?php
declare(strict_types=1);

// Ações rápidas (formulários simples, sem JavaScript)
require __DIR__ . '/app/bootstrap.php';

$user = require_login();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    redirect('index.php');
}
csrf_check();

$action = input('acao');
$letter = !empty($_POST['id']) ? find_letter((int) $_POST['id']) : null;
$mine = $letter && letter_role($letter, $user) === 'sender';

// Limite generoso de cartas novas por dia (protege a hospedagem gratuita de abusos)
if (in_array($action, ['criar', 'responder', 'duplicar'], true)
    && (int) q_val('SELECT COUNT(*) FROM letters WHERE sender_id = ? AND created_at > ?', [(int) $user['id'], date('Y-m-d H:i:s', time() - 86400)]) >= 100) {
    flash('Você já começou 100 cartas hoje. Continue amanhã, ou termine as que estão nos rascunhos.', 'error');
    redirect('index.php?aba=escritas&status=draft');
}

switch ($action) {
    case 'criar':
        $para = !empty($_POST['para']) ? (int) $_POST['para'] : null;
        $id = create_letter($para, $user, input('modelo', 'branco'));
        redirect('editor.php?id=' . $id);

    case 'responder':
        // Responder com uma carta: quem escreveu já está na lista de quem recebeu
        if ($letter && letter_role($letter, $user) === 'recipient') {
            add_contact((int) $user['id'], (int) $letter['sender_id']);
            $id = create_letter((int) $letter['sender_id'], $user, input('modelo', 'branco'), (int) $letter['id']);
            redirect('editor.php?id=' . $id);
        }
        break;

    case 'duplicar':
        if ($mine) {
            $id = duplicate_letter($letter);
            flash('Carta duplicada. Escolha para quem ela vai quando terminar.');
            redirect('editor.php?id=' . $id);
        }
        break;

    case 'desenviar':
        if ($mine) {
            db_update('letters', (int) $letter['id'], ['status' => 'draft', 'updated_at' => now()]);
            flash('A carta voltou para os rascunhos.');
        }
        break;

    case 'excluir':
        if ($mine) {
            delete_letter((int) $letter['id']);
            flash('Carta excluída.');
        }
        break;
}
redirect('index.php' . ($action === 'excluir' || $action === 'desenviar' ? '?aba=escritas' : ''));
