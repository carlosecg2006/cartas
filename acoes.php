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
        if (input('assistente') === '1') {
            redirect('editor.php?id=' . create_with_assistant($para, $user) . '&assistente=1');
        }
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

/**
 * Assistente de carta: relação, ocasião, tom, o que a pessoa sente e a trilha sonora.
 * O texto vem da IA (se ativada e pedida) ou das frases prontas, com trechos para completar.
 */
function create_with_assistant(?int $para, array $user): int
{
    $id = create_letter($para, $user, 'branco');
    $letter = find_letter($id);
    $recipientName = $letter['recipient_id'] ? name_for((int) $user['id'], ['id' => $letter['recipient_id'], 'name' => $letter['recipient_name']]) : '';
    $o = compose_options($_POST, $recipientName, (string) $user['name']);
    $ai = null;
    if (input('ia') === '1' && ai_available()) {
        try {
            $ai = ai_write_letter($o);
        } catch (RuntimeException $e) {
            flash($e->getMessage(), 'error');
        }
    }
    $content = apply_theme($letter['content'], compose_theme($o['tone'], $o['occasion']));
    $content['blocks'] = compose_blocks($o, $ai);
    $content['stickers'] = [];
    // Tons mais emotivos ficam lindos com o texto aparecendo como se estivesse sendo escrito
    $content['reveal'] = in_array($o['tone'], ['romantico', 'emocionante', 'poetico', 'nostalgico'], true) ? 'write' : 'fade';
    if ($o['occasion'] === 'abra_quando') {
        $content['envelope']['label'] = 'Abra quando [complete]';
    }
    $music = parse_music_url(input('trilha'));
    if ($music) {
        $content['bgm'] = $music['provider'] === 'youtube'
            ? ['kind' => 'youtube', 'mid' => $music['mid'], 'start' => $music['start'], 'volume' => 0.6]
            : ['kind' => 'spotify', 'skind' => $music['kind'], 'mid' => $music['mid']];
    } elseif (trim(input('trilha')) !== '') {
        flash('Não reconheci o link da trilha sonora. Dá para colar de novo na aba Envelope do editor.', 'error');
    }
    $content = sanitize_letter_content($content);
    $first = first_name($recipientName ?: 'você');
    $title = mb_substr(match ($o['occasion']) {
        'aniversario' => 'Feliz aniversário, ' . $first, 'saudade' => 'Saudade de você, ' . $first,
        'obrigado' => 'Obrigado(a), ' . $first, 'desculpa' => 'Me desculpa, ' . $first,
        'conquista' => 'Parabéns, ' . $first, 'despedida' => 'Até logo, ' . $first,
        'namoro' => 'Mais um ano com você', 'datas' => 'Boas festas, ' . $first,
        default => 'Para ' . $first,
    }, 0, 150);
    db_update('letters', $id, ['title' => $title, 'content' => json_encode($content, JSON_UNESCAPED_UNICODE), 'updated_at' => now()]
        + letter_derived($title, $content));
    sync_letter_media($id, $content);
    return $id;
}

