<?php
declare(strict_types=1);

/*
 * Pessoas e listas de contatos.
 * Cada usuário tem a própria lista, com os próprios apelidos. Só dá para
 * escrever para quem está na sua lista. Alguém entra na lista quando:
 *  - você cria o acesso dessa pessoa (e você entra na lista dela);
 *  - essa pessoa te manda uma carta (para você poder responder).
 */

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
    return (bool) q_val('SELECT id FROM contacts WHERE owner_id = ? AND contact_id = ?', [$ownerId, $contactId]);
}

/** Lista de contatos de alguém, já com o nome que essa pessoa usa para cada um. */
function contacts_of(int $ownerId): array
{
    $rows = q_all(
        'SELECT u.id, u.name, u.username, u.avatar, u.color, u.birthday, u.created_by, u.last_seen_at, c.nickname, c.id AS contact_row
         FROM contacts c JOIN users u ON u.id = c.contact_id WHERE c.owner_id = ?',
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
    $nick = q_val('SELECT nickname FROM contacts WHERE owner_id = ? AND contact_id = ?', [$viewerId, (int) $person['id']]);
    return is_string($nick) && $nick !== '' ? $nick : (string) $person['name'];
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

/** Apaga uma conta: as cartas que ela escreveu, as que recebeu e a biblioteca dela. */
function delete_account(int $userId): void
{
    foreach (q_all('SELECT id FROM letters WHERE sender_id = ? OR recipient_id = ?', [$userId, $userId]) as $l) {
        delete_letter((int) $l['id']);
    }
    foreach (q_all('SELECT id, filename FROM media WHERE user_id = ?', [$userId]) as $m) {
        @unlink(UPLOAD_DIR . '/' . $m['filename']);
        q('DELETE FROM media WHERE id = ?', [(int) $m['id']]);
    }
    q('UPDATE users SET created_by = NULL WHERE created_by = ?', [$userId]);
    q("DELETE FROM invites WHERE kind = 'reset' AND user_id = ?", [$userId]);
    q('DELETE FROM users WHERE id = ?', [$userId]);
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
function upcoming_birthdays(int $ownerId, int $days = 30): array
{
    $list = [];
    foreach (contacts_of($ownerId) as $c) {
        $left = days_until_birthday($c['birthday']);
        if ($left !== null && $left <= $days) {
            $c['days_left'] = $left;
            $list[] = $c;
        }
    }
    usort($list, fn($a, $b) => $a['days_left'] <=> $b['days_left']);
    return $list;
}
