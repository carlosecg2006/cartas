<?php
declare(strict_types=1);

/*
 * Links de convite e de nova senha.
 * O link carrega um código aleatório; no banco fica só o hash dele.
 *  - 'invite': quem abre cria a própria conta (ou, se já tem conta, se conecta com quem convidou)
 *  - 'reset':  quem abre escolhe uma senha nova para a conta indicada
 */

const INVITE_DAYS = 14;
const RESET_DAYS = 3;

function create_invite(array $creator, string $name, string $kind = 'invite', ?int $userId = null): string
{
    $token = bin2hex(random_bytes(20));
    $days = $kind === 'reset' ? RESET_DAYS : INVITE_DAYS;
    db_insert('invites', [
        'token_hash' => hash('sha256', $token),
        'kind' => $kind,
        'created_by' => (int) $creator['id'],
        'user_id' => $userId,
        'name' => mb_substr($name, 0, 80),
        'expires_at' => date('Y-m-d H:i:s', time() + $days * 86400),
        'created_at' => now(),
    ]);
    return $token;
}

function find_invite(string $token): ?array
{
    if (!preg_match('/^[a-f0-9]{40}$/', $token)) {
        return null;
    }
    $inv = q_one('SELECT i.*, u.name AS creator_name, u.avatar AS creator_avatar, u.color AS creator_color
        FROM invites i JOIN users u ON u.id = i.created_by WHERE i.token_hash = ?', [hash('sha256', $token)]);
    if (!$inv || $inv['used_at'] || strtotime($inv['expires_at']) < time()) {
        return null;
    }
    if ($inv['kind'] === 'reset' && !find_user((int) $inv['user_id'])) {
        return null;
    }
    return $inv;
}

function invite_url(string $token): string
{
    return base_url() . 'convite.php?t=' . $token;
}

function pending_invites(int $creatorId): array
{
    return q_all("SELECT * FROM invites WHERE created_by = ? AND kind = 'invite' AND used_at IS NULL AND expires_at > ? ORDER BY id DESC", [$creatorId, now()]);
}
