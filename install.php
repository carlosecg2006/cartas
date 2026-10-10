<?php
declare(strict_types=1);

require __DIR__ . '/app/bootstrap.php';

$errors = [];
$step = $GLOBALS['config'] === null ? 'config' : (db_ready() ? 'done' : 'admin');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();

    if ($step === 'config') {
        $driver = ($_POST['driver'] ?? 'mysql') === 'sqlite' ? 'sqlite' : 'mysql';
        $cfg = [
            'app_name' => trim((string) ($_POST['app_name'] ?? '')) ?: 'Cartas da Alma',
            'timezone' => 'America/Sao_Paulo',
            'db' => [
                'driver' => $driver,
                'host' => trim((string) ($_POST['host'] ?? 'localhost')),
                'port' => (int) ($_POST['port'] ?? 3306) ?: 3306,
                'name' => trim((string) ($_POST['name'] ?? '')),
                'user' => trim((string) ($_POST['user'] ?? '')),
                'pass' => (string) ($_POST['pass'] ?? ''),
                'sqlite_path' => 'storage/cartas.sqlite',
            ],
            'max_upload_mb' => 8,
        ];
        try {
            db_connect($cfg['db']);
            $php = "<?php\n// Gerado pelo instalador. Não compartilhe este arquivo.\nreturn " . var_export($cfg, true) . ";\n";
            if (@file_put_contents(ROOT . '/config.php', $php) === false) {
                $errors[] = 'Não consegui criar o arquivo config.php. Crie-o manualmente a partir de config.example.php.';
            } else {
                redirect('install.php');
            }
        } catch (Throwable $e) {
            $errors[] = 'Não consegui conectar ao banco: ' . $e->getMessage();
        }
    } elseif ($step === 'admin') {
        $name = trim((string) ($_POST['admin_name'] ?? ''));
        $username = mb_strtolower(trim((string) ($_POST['username'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');
        if ($name === '' || mb_strlen($name) > 80) {
            $errors[] = 'Diga seu nome.';
        }
        if (!preg_match('/^[a-z0-9._-]{3,40}$/', $username)) {
            $errors[] = 'O usuário deve ter de 3 a 40 letras minúsculas, números, ponto, hífen ou _.';
        }
        if (mb_strlen($password) < 8) {
            $errors[] = 'A senha precisa de pelo menos 8 caracteres.';
        }
        if (!$errors) {
            try {
                db_install();
                if (!db_ready()) {
                    $id = db_insert('users', [
                        'name' => $name,
                        'username' => $username,
                        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                        'role' => 'admin',
                        'avatar' => '✍️',
                        'color' => '#c97b84',
                        'created_at' => now(),
                    ]);
                    login_user(q_one('SELECT * FROM users WHERE id = ?', [$id]), true);
                    flash('Pronto. Agora adicione seus amigos e escreva a primeira carta.');
                }
                redirect('index.php');
            } catch (Throwable $e) {
                $errors[] = 'Erro ao criar as tabelas: ' . $e->getMessage();
            }
        }
    }
}

page_head('Instalação', ['body' => 'auth-page', 'nav' => false]);
?>
<main class="auth-wrap">
    <div class="auth-card card wide">
        <h1>Instalação</h1>

        <?php foreach ($errors as $error): ?>
            <div class="alert alert-error"><?= e($error) ?></div>
        <?php endforeach; ?>

        <?php if ($step === 'config'): ?>
            <p class="muted">Passo 1 de 2 · Conecte o banco de dados. Na hospedagem (InfinityFree) os dados aparecem no painel em <b>MySQL Databases</b>.</p>
            <form method="post" class="form" data-install>
                <?= csrf_field() ?>
                <label>Nome do site
                    <input name="app_name" value="<?= e($_POST['app_name'] ?? 'Cartas da Alma') ?>" maxlength="40">
                </label>
                <label>Banco de dados
                    <select name="driver" data-driver>
                        <option value="mysql">MySQL (hospedagem)</option>
                        <option value="sqlite" <?= ($_POST['driver'] ?? '') === 'sqlite' ? 'selected' : '' ?>>SQLite (teste no computador)</option>
                    </select>
                </label>
                <div data-mysql-fields class="grid-2">
                    <label>Servidor (host) <input name="host" value="<?= e($_POST['host'] ?? 'localhost') ?>"></label>
                    <label>Porta <input name="port" type="number" value="<?= e($_POST['port'] ?? '3306') ?>"></label>
                    <label>Nome do banco <input name="name" value="<?= e($_POST['name'] ?? '') ?>"></label>
                    <label>Usuário <input name="user" value="<?= e($_POST['user'] ?? '') ?>" autocomplete="off"></label>
                    <label class="span-2">Senha do banco <input name="pass" type="password" autocomplete="new-password"></label>
                </div>
                <button class="btn btn-primary btn-block">Conectar</button>
            </form>
        <?php elseif ($step === 'admin'): ?>
            <p class="muted">Passo 2 de 2 · Crie a sua conta de remetente. Só ela pode escrever cartas e ver tudo.</p>
            <form method="post" class="form">
                <?= csrf_field() ?>
                <label>Seu nome <input name="admin_name" required maxlength="80" value="<?= e($_POST['admin_name'] ?? '') ?>"></label>
                <label>Usuário para entrar <input name="username" required pattern="[a-z0-9._\-]{3,40}" value="<?= e($_POST['username'] ?? '') ?>" autocapitalize="none"></label>
                <label>Senha (mínimo 8 caracteres) <input name="password" type="password" required minlength="8" autocomplete="new-password"></label>
                <button class="btn btn-primary btn-block">Criar conta e começar</button>
            </form>
        <?php else: ?>
            <p class="center">O site já está instalado.</p>
            <a class="btn btn-primary btn-block" href="login.php">Ir para o login</a>
        <?php endif; ?>
    </div>
</main>
<?php
page_foot();
