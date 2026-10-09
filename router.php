<?php
// Roteador para testar no computador: php -S localhost:8000 router.php
// (Na hospedagem quem faz esse papel são os arquivos .htaccess.)
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/(app|storage)(/|$)#', $path) || preg_match('#/(config|config\.example)\.php$|/\.#', $path)) {
    http_response_code(403);
    exit('Acesso negado');
}
return false;
