<?php
declare(strict_types=1);

/*
 * Pessoas e listas de contatos.
 * Cada usuário tem a própria lista, com os próprios apelidos. Só dá para
 * escrever para quem está na sua lista. Alguém entra na lista quando:
 *  - você cria o acesso dessa pessoa (e você entra na lista dela);
 *  - essa pessoa te manda uma carta (para você poder responder).
 */

/** Pessoas que você bloqueou (não aparecem na lista e não conseguem te escrever). */
function blocked_contacts(int $ownerId): array
{
    return q_all('SELECT u.id, u.name, u.avatar, u.color, c.nickname FROM contacts c JOIN users u ON u.id = c.contact_id
        WHERE c.owner_id = ? AND c.blocked = 1 ORDER BY u.name', [$ownerId]);
}

function add_contact(int $ownerId, int $contactId, string $nickname = ''): void
{
    if ($ownerId === $contactId) {
        return;
    }
    if (q_val('SELECT id FROM contacts WHERE owner_id = ? AND contact_id = ?', [$ownerId, $contactId])) {
        return;
    }
    db_insert('contacts', [
        'owner_id' => $ownerId,
        'contact_id' => $contactId,
        'nickname' => mb_substr($nickname, 0, 80),
        'created_at' => now(),
    ]);
}

function is_contact(int $ownerId, int $contactId): bool
{
    return (bool) q_val('SELECT id FROM contacts WHERE owner_id = ? AND contact_id = ? AND blocked = 0', [$ownerId, $contactId]);
}

/** Lista de contatos de alguém, já com o nome que essa pessoa usa para cada um. */
function contacts_of(int $ownerId): array
{
    $rows = q_all(
        "SELECT u.id, u.name, u.username, u.avatar, u.color, u.birthday, u.created_by, u.managed, u.last_seen_at, u.last_login_at,
                c.nickname, c.note, c.id AS contact_row, c.created_at AS contact_since
         FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.owner_id = ? AND c.blocked = 0 AND u.role <> 'deleted'",
        [$ownerId]
    );
    foreach ($rows as &$r) {
        $r['display'] = $r['nickname'] !== '' ? $r['nickname'] : $r['name'];
    }
    unset($r);
    usort($rows, fn($a, $b) => strcasecmp($a['display'], $b['display']));
    return $rows;
}

/** O nome que $viewerId usa para a pessoa $person (apelido ou nome real). */
function name_for(int $viewerId, ?array $person): string
{
    if (!$person || empty($person['id'])) {
        return '';
    }
    static $nicks = [];
    if (!isset($nicks[$viewerId])) {
        $nicks[$viewerId] = array_column(q_all("SELECT contact_id, nickname FROM contacts WHERE owner_id = ? AND nickname <> ''", [$viewerId]), 'nickname', 'contact_id');
    }
    $nick = $nicks[$viewerId][(int) $person['id']] ?? '';
    return $nick !== '' ? (string) $nick : (string) $person['name'];
}

function find_user(int $id): ?array
{
    return q_one('SELECT * FROM users WHERE id = ?', [$id]);
}

/**
 * Cria o acesso de uma pessoa nova. Quem criou e quem foi criado entram um na lista do outro.
 * Retorna [id, senha gerada].
 */
function create_account(array $creator, string $name, string $username, string $avatar, string $color, ?string $birthday): array
{
    $password = random_password();
    $id = db_insert('users', [
        'name' => $name,
        'username' => $username,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
        'role' => 'friend',
        'managed' => 1,
        'avatar' => $avatar,
        'color' => $color,
        'created_at' => now(),
        'created_by' => (int) $creator['id'],
        'birthday' => $birthday,
    ]);
    add_contact((int) $creator['id'], $id);
    add_contact($id, (int) $creator['id']);
    return [$id, $password];
}

/**
 * Apaga uma conta.
 * - Cartas que outras pessoas escreveram para ela voltam para quem escreveu, como rascunho.
 * - Cartas que ela escreveu: são apagadas, ou ($keepSent) ficam com quem recebeu,
 *   e a conta vira um registro sem login, só para essas cartas continuarem abrindo.
 */
function delete_account(int $userId, bool $keepSent = false): void
{
    // O site precisa sempre de um "admin" (é como ele sabe que já foi instalado)
    if (q_val('SELECT role FROM users WHERE id = ?', [$userId]) === 'admin') {
        $heir = q_val("SELECT id FROM users WHERE id <> ? AND role = 'friend' ORDER BY id LIMIT 1", [$userId]);
        if ($heir) {
            q("UPDATE users SET role = 'admin' WHERE id = ?", [(int) $heir]);
        }
    }
    $received = array_map('intval', array_column(q_all('SELECT id FROM letters WHERE recipient_id = ?', [$userId]), 'id'));
    foreach ($received as $lid) {
        q('DELETE FROM replies WHERE letter_id = ?', [$lid]);
        q('DELETE FROM reactions WHERE letter_id = ?', [$lid]);
        q('DELETE FROM favorites WHERE letter_id = ? AND user_id = ?', [$lid, $userId]);
    }
    q("UPDATE letters SET recipient_id = NULL, status = 'draft', first_opened_at = NULL, last_opened_at = NULL, open_count = 0 WHERE recipient_id = ?", [$userId]);
    q('DELETE FROM replies WHERE user_id = ?', [$userId]);
    q('DELETE FROM reactions WHERE user_id = ?', [$userId]);

    if (!$keepSent) {
        foreach (q_all('SELECT id FROM letters WHERE sender_id = ?', [$userId]) as $l) {
            delete_letter((int) $l['id']);
        }
    } else {
        q("DELETE FROM letters WHERE sender_id = ? AND status <> 'sent'", [$userId]);
    }
    // Arquivos: apaga tudo o que nenhuma carta restante usa
    foreach (q_all('SELECT id, filename FROM media WHERE user_id = ?', [$userId]) as $m) {
        if ($keepSent && q_val('SELECT 1 FROM letter_media WHERE filename = ? LIMIT 1', [$m['filename']])) {
            q('UPDATE media SET in_library = 0 WHERE id = ?', [(int) $m['id']]);
            continue;
        }
        @unlink(UPLOAD_DIR . '/' . $m['filename']);
        q('DELETE FROM media WHERE id = ?', [(int) $m['id']]);
    }
    q('UPDATE users SET created_by = NULL, managed = 0 WHERE created_by = ?', [$userId]);
    q('DELETE FROM invites WHERE created_by = ? OR user_id = ?', [$userId, $userId]);
    q('DELETE FROM remember_tokens WHERE user_id = ?', [$userId]);
    q('DELETE FROM push_subscriptions WHERE user_id = ?', [$userId]);
    q('DELETE FROM favorites WHERE user_id = ?', [$userId]);
    q('DELETE FROM contacts WHERE owner_id = ? OR contact_id = ?', [$userId, $userId]);

    $stillSent = $keepSent && q_val("SELECT 1 FROM letters WHERE sender_id = ? AND status = 'sent' LIMIT 1", [$userId]);
    if ($stillSent) {
        db_update('users', $userId, [
            'username' => 'apagada-' . $userId . '-' . bin2hex(random_bytes(3)),
            'password_hash' => password_hash(bin2hex(random_bytes(24)), PASSWORD_DEFAULT),
            'birthday' => null, 'role' => 'deleted', 'auth_version' => random_int(1000, 999999),
            'last_seen_at' => null, 'managed' => 0,
        ]);
    } else {
        q('DELETE FROM users WHERE id = ?', [$userId]);
    }
}

function parse_birthday($value): ?string
{
    $value = trim((string) $value);
    if ($value === '' || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
        return null;
    }
    return $value;
}

/** Dias até o próximo aniversário (0 = hoje). */
function days_until_birthday(?string $birthday): ?int
{
    if (!$birthday) {
        return null;
    }
    [, $m, $d] = array_map('intval', explode('-', $birthday));
    $today = new DateTimeImmutable('today');
    $year = (int) $today->format('Y');
    if ($m === 2 && $d === 29 && !checkdate(2, 29, $year)) {
        $d = 28;
    }
    $next = $today->setDate($year, $m, $d);
    if ($next < $today) {
        $next = $next->setDate($year + 1, $m, $d);
    }
    return (int) $today->diff($next)->days;
}

function birthday_label(?string $birthday): string
{
    if (!$birthday) {
        return '';
    }
    [, $m, $d] = array_map('intval', explode('-', $birthday));
    return $d . ' de ' . MESES_LONGOS[$m - 1];
}

/** Contatos com aniversário nos próximos $days dias, do mais próximo ao mais distante. */
function upcoming_birthdays(int $ownerId, int $days = 30, ?array $contacts = null): array
{
    $list = [];
    foreach ($contacts ?? contacts_of($ownerId) as $c) {
        $left = days_until_birthday($c['birthday']);
        if ($left !== null && $left <= $days) {
            $c['days_left'] = $left;
            $list[] = $c;
        }
    }
    usort($list, fn($a, $b) => $a['days_left'] <=> $b['days_left']);
    return $list;
}
