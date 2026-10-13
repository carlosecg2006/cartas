<?php
declare(strict_types=1);

function db_connect(array $cfg): PDO
{
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    if (($cfg['driver'] ?? 'mysql') === 'sqlite') {
        $path = (string) ($cfg['sqlite_path'] ?? 'storage/cartas.sqlite');
        if ($path[0] !== '/' && !preg_match('/^[A-Za-z]:/', $path)) {
            $path = ROOT . '/' . $path;
        }
        $pdo = new PDO('sqlite:' . $path, null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA journal_mode = WAL');
        return $pdo;
    }
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $cfg['host'] ?? 'localhost',
        (int) ($cfg['port'] ?? 3306),
        $cfg['name'] ?? ''
    );
    return new PDO($dsn, (string) ($cfg['user'] ?? ''), (string) ($cfg['pass'] ?? ''), $options);
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $pdo = db_connect((array) config('db', []));
    }
    return $pdo;
}

function db_driver(): string
{
    return config('db.driver', 'mysql') === 'sqlite' ? 'sqlite' : 'mysql';
}

function q(string $sql, array $params = []): PDOStatement
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function q_one(string $sql, array $params = []): ?array
{
    $row = q($sql, $params)->fetch();
    return $row === false ? null : $row;
}

function q_all(string $sql, array $params = []): array
{
    return q($sql, $params)->fetchAll();
}

function q_val(string $sql, array $params = [])
{
    $value = q($sql, $params)->fetchColumn();
    return $value === false ? null : $value;
}

function db_insert(string $table, array $data): int
{
    $cols = array_keys($data);
    $sql = 'INSERT INTO ' . $table . ' (' . implode(', ', $cols) . ') VALUES ('
        . implode(', ', array_map(fn($c) => ':' . $c, $cols)) . ')';
    q($sql, $data);
    return (int) db()->lastInsertId();
}

function db_update(string $table, int $id, array $data): void
{
    $sets = implode(', ', array_map(fn($c) => $c . ' = :' . $c, array_keys($data)));
    $data['__id'] = $id;
    q('UPDATE ' . $table . ' SET ' . $sets . ' WHERE id = :__id', $data);
}

/**
 * O banco está instalado e já existe um administrador?
 * Só responde "não" quando a tabela não existe. Banco fora do ar (comum em hospedagem
 * gratuita) gera erro, para não mandar ninguém para o instalador por engano.
 */
function db_ready(): bool
{
    try {
        return (int) q_val("SELECT COUNT(*) FROM users WHERE role = 'admin'") > 0;
    } catch (PDOException $e) {
        if (preg_match('/no such table|doesn.t exist|42S02|Unknown database/i', $e->getMessage())) {
            return false;
        }
        throw $e;
    }
}

function db_schema(string $driver): array
{
    $sqlite = $driver === 'sqlite';
    $pk = $sqlite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'INT NOT NULL AUTO_INCREMENT PRIMARY KEY';
    $long = $sqlite ? 'TEXT' : 'LONGTEXT';
    $opts = $sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    return [
        "CREATE TABLE IF NOT EXISTS users (
            id $pk,
            name VARCHAR(80) NOT NULL,
            username VARCHAR(40) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(10) NOT NULL DEFAULT 'friend',
            avatar VARCHAR(16) NOT NULL DEFAULT '',
            color VARCHAR(9) NOT NULL DEFAULT '#e8a0a0',
            created_at DATETIME NOT NULL,
            last_login_at DATETIME NULL,
            last_seen_at DATETIME NULL,
            created_by INT NULL,
            birthday DATE NULL,
            managed INT NOT NULL DEFAULT 0,
            auth_version INT NOT NULL DEFAULT 0,
            pw_reset_at DATETIME NULL,
            reduce_motion INT NOT NULL DEFAULT 0,
            terms_at DATETIME NULL,
            welcome_done INT NOT NULL DEFAULT 0,
            recovery_hash VARCHAR(255) NULL
        )$opts",
        "CREATE TABLE IF NOT EXISTS letters (
            id $pk,
            recipient_id INT NULL,
            title VARCHAR(150) NOT NULL DEFAULT '',
            content $long NOT NULL,
            status VARCHAR(10) NOT NULL DEFAULT 'draft',
            open_at DATETIME NULL,
            sent_at DATETIME NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            first_opened_at DATETIME NULL,
            last_opened_at DATETIME NULL,
            open_count INT NOT NULL DEFAULT 0,
            sender_id INT NULL,
            delivered_at DATETIME NULL,
            reply_to INT NULL,
            FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
        )$opts",
        "CREATE INDEX idx_letters_recipient ON letters (recipient_id, status)",
        "CREATE TABLE IF NOT EXISTS media (
            id $pk,
            letter_id INT NULL,
            filename VARCHAR(80) NOT NULL UNIQUE,
            mime VARCHAR(40) NOT NULL,
            width INT NOT NULL DEFAULT 0,
            height INT NOT NULL DEFAULT 0,
            size INT NOT NULL DEFAULT 0,
            created_at DATETIME NOT NULL,
            user_id INT NULL,
            kind VARCHAR(10) NOT NULL DEFAULT 'image',
            in_library INT NOT NULL DEFAULT 1,
            FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE SET NULL
        )$opts",
        "CREATE TABLE IF NOT EXISTS reactions (
            id $pk,
            letter_id INT NOT NULL,
            user_id INT NOT NULL,
            emoji VARCHAR(16) " . ($sqlite ? '' : 'CHARACTER SET utf8mb4 COLLATE utf8mb4_bin ') . "NOT NULL,
            created_at DATETIME NOT NULL,
            UNIQUE (letter_id, user_id, emoji),
            FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS replies (
            id $pk,
            letter_id INT NOT NULL,
            user_id INT NOT NULL,
            message TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            read_at DATETIME NULL,
            FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS letter_versions (
            id $pk,
            letter_id INT NOT NULL,
            title VARCHAR(150) NOT NULL DEFAULT '',
            content $long NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS contacts (
            id $pk,
            owner_id INT NOT NULL,
            contact_id INT NOT NULL,
            nickname VARCHAR(80) NOT NULL DEFAULT '',
            created_at DATETIME NOT NULL,
            UNIQUE (owner_id, contact_id),
            FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (contact_id) REFERENCES users(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS letter_media (
            letter_id INT NOT NULL,
            filename VARCHAR(80) NOT NULL,
            PRIMARY KEY (letter_id, filename),
            FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
        )$opts",
        "CREATE INDEX idx_letter_media_file ON letter_media (filename)",
        "CREATE INDEX idx_letters_sender ON letters (sender_id, status)",
        "CREATE INDEX idx_media_user ON media (user_id)",
        "CREATE TABLE IF NOT EXISTS invites (
            id $pk,
            token_hash CHAR(64) NOT NULL UNIQUE,
            kind VARCHAR(10) NOT NULL DEFAULT 'invite',
            created_by INT NOT NULL,
            user_id INT NULL,
            name VARCHAR(80) NOT NULL DEFAULT '',
            expires_at DATETIME NOT NULL,
            used_at DATETIME NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS favorites (
            user_id INT NOT NULL,
            letter_id INT NOT NULL,
            created_at DATETIME NOT NULL,
            PRIMARY KEY (user_id, letter_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (letter_id) REFERENCES letters(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS push_subscriptions (
            id $pk,
            user_id INT NOT NULL,
            endpoint_hash CHAR(64) NOT NULL UNIQUE,
            endpoint TEXT NOT NULL,
            created_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS settings (
            name VARCHAR(40) NOT NULL PRIMARY KEY,
            value TEXT NOT NULL
        )$opts",
        "CREATE TABLE IF NOT EXISTS remember_tokens (
            id $pk,
            user_id INT NOT NULL,
            selector VARCHAR(24) NOT NULL UNIQUE,
            validator_hash VARCHAR(64) NOT NULL,
            expires_at DATETIME NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )$opts",
        "CREATE TABLE IF NOT EXISTS login_attempts (
            id $pk,
            ip VARCHAR(45) NOT NULL,
            username VARCHAR(40) NOT NULL,
            attempted_at DATETIME NOT NULL
        )$opts",
    ];
}

const SCHEMA_VERSION = 5;

/** Atualiza o banco de instalações antigas uma única vez, sem perder dados. */
function ensure_schema(): void
{
    $flag = ROOT . '/storage/.schema-' . SCHEMA_VERSION;
    if (is_file($flag)) {
        return;
    }
    // A versão também fica no banco: funciona mesmo se a pasta storage não aceitar escrita
    try {
        if ((int) setting('schema_version') >= SCHEMA_VERSION) {
            @file_put_contents($flag, date('c'));
            return;
        }
    } catch (PDOException $e) {
        // tabela settings ainda não existe
    }
    db_install();
    db_migrate();
    set_setting('schema_version', (string) SCHEMA_VERSION);
    @file_put_contents($flag, date('c'));
}

function setting(string $name): ?string
{
    $v = q_val('SELECT value FROM settings WHERE name = ?', [$name]);
    return $v === null ? null : (string) $v;
}

function set_setting(string $name, string $value): void
{
    q('DELETE FROM settings WHERE name = ?', [$name]);
    try {
        db_insert('settings', ['name' => $name, 'value' => $value]);
    } catch (PDOException $e) {
        // outro pedido gravou ao mesmo tempo: fica o valor dele
    }
}

/** Funciona em qualquer MySQL/MariaDB/SQLite: se a coluna não existe, a consulta falha. */
function column_exists(string $table, string $column): bool
{
    try {
        db()->query('SELECT ' . $column . ' FROM ' . $table . ' LIMIT 0');
        return true;
    } catch (PDOException $e) {
        return false;
    }
}

function add_column(string $table, string $column, string $definition): void
{
    if (column_exists($table, $column)) {
        return;
    }
    try {
        db()->exec('ALTER TABLE ' . $table . ' ADD COLUMN ' . $column . ' ' . $definition);
    } catch (PDOException $e) {
        // dois pedidos ao mesmo tempo: se a coluna já apareceu, está tudo certo
        if (!column_exists($table, $column)) {
            throw $e;
        }
    }
}

function try_exec(string $sql): void
{
    try {
        db()->exec($sql);
    } catch (PDOException $e) {
        // índice já existe, etc.
    }
}

function db_migrate(): void
{
    // Instalações de antes da versão 3 (um só remetente) ainda não têm sender_id
    $legacy = !column_exists('letters', 'sender_id');

    add_column('users', 'created_by', 'INT NULL');
    add_column('users', 'birthday', 'DATE NULL');
    add_column('letters', 'sender_id', 'INT NULL');
    add_column('letters', 'delivered_at', 'DATETIME NULL');
    add_column('letters', 'reply_to', 'INT NULL');
    add_column('media', 'user_id', 'INT NULL');
    add_column('media', 'kind', "VARCHAR(10) NOT NULL DEFAULT 'image'");
    add_column('media', 'in_library', 'INT NOT NULL DEFAULT 1');
    // versão 5
    add_column('users', 'managed', 'INT NOT NULL DEFAULT 0');
    add_column('users', 'auth_version', 'INT NOT NULL DEFAULT 0');
    add_column('users', 'pw_reset_at', 'DATETIME NULL');
    add_column('users', 'reduce_motion', 'INT NOT NULL DEFAULT 0');
    add_column('users', 'terms_at', 'DATETIME NULL');
    add_column('users', 'welcome_done', 'INT NOT NULL DEFAULT 0');
    add_column('users', 'recovery_hash', 'VARCHAR(255) NULL');
    add_column('contacts', 'blocked', 'INT NOT NULL DEFAULT 0');
    add_column('contacts', 'note', "VARCHAR(500) NOT NULL DEFAULT ''");
    add_column('letters', 'search_text', db_driver() === 'sqlite' ? 'TEXT NULL' : 'MEDIUMTEXT NULL');
    add_column('letters', 'meta', 'TEXT NULL');
    foreach (['CREATE INDEX idx_letter_media_file ON letter_media (filename)', 'CREATE INDEX idx_letters_sender ON letters (sender_id, status)',
        'CREATE INDEX idx_media_user ON media (user_id)', 'CREATE INDEX idx_replies_letter ON replies (letter_id, read_at)',
        'CREATE INDEX idx_login_attempts_time ON login_attempts (attempted_at)', 'CREATE INDEX idx_letters_recipient ON letters (recipient_id, status)'] as $sql) {
        try_exec($sql);
    }

    if ($legacy) {
        // Tudo o que existia antes foi escrito por quem instalou o site
        $admin = q_one("SELECT * FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
        if ($admin) {
            q('UPDATE letters SET sender_id = ? WHERE sender_id IS NULL', [(int) $admin['id']]);
            q('UPDATE users SET created_by = ? WHERE created_by IS NULL AND id <> ?', [(int) $admin['id'], (int) $admin['id']]);
            foreach (q_all('SELECT * FROM users WHERE id <> ?', [(int) $admin['id']]) as $u) {
                add_contact((int) $admin['id'], (int) $u['id']);
                add_contact((int) $u['id'], (int) $admin['id']);
            }
        }
        q('UPDATE media SET user_id = (SELECT sender_id FROM letters WHERE letters.id = media.letter_id) WHERE user_id IS NULL');
        q("UPDATE media SET kind = 'audio' WHERE mime LIKE 'audio/%'");
        foreach (q_all('SELECT id, content FROM letters') as $l) {
            sync_letter_media((int) $l['id'], json_decode((string) $l['content'], true) ?: []);
        }
    }

    if (setting('v5_done') === null) {
        // Só contas criadas com senha por outra pessoa ficam "gerenciadas" por ela.
        // Quem entrou por convite escolheu a própria senha: ninguém mais mexe na conta.
        q("UPDATE users SET managed = 1 WHERE created_by IS NOT NULL AND id NOT IN
            (SELECT user_id FROM invites WHERE kind = 'invite' AND user_id IS NOT NULL)");
        if (db_driver() === 'mysql') {
            // emojis diferentes eram considerados iguais pela comparação padrão
            try_exec('ALTER TABLE reactions MODIFY emoji VARCHAR(16) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL');
        }
        foreach (q_all('SELECT id FROM letters') as $row) {
            // uma por vez: cartas grandes não estouram a memória
            $l = q_one('SELECT id, title, content FROM letters WHERE id = ?', [(int) $row['id']]);
            $d = letter_derived((string) $l['title'], json_decode((string) $l['content'], true) ?: []);
            q('UPDATE letters SET search_text = ?, meta = ? WHERE id = ?', [$d['search_text'], $d['meta'], (int) $l['id']]);
        }
        set_setting('v5_done', date('c'));
    }
}

function db_install(): void
{
    foreach (db_schema(db_driver()) as $sql) {
        try {
            db()->exec($sql);
        } catch (PDOException $e) {
            // Índices já existentes não são erro
            if (!str_starts_with(ltrim($sql), 'CREATE INDEX')) {
                throw $e;
            }
        }
    }
}
