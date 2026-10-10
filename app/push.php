<?php
declare(strict_types=1);

/*
 * Avisos no celular (Web Push).
 * O servidor manda só um "toque" vazio para o serviço de push do navegador
 * (Google, Mozilla, Apple). Nenhum conteúdo da carta passa por eles: quando o
 * toque chega, o próprio celular pergunta ao site o que chegou (avisos.php).
 * Assinatura VAPID (ES256) feita com a extensão openssl do PHP.
 */

function b64url(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/** Par de chaves VAPID do site (criado na primeira vez e guardado no banco). */
function vapid_keys(): ?array
{
    $pem = setting('vapid_private');
    $pub = setting('vapid_public');
    if ($pem && $pub) {
        return ['private' => $pem, 'public' => $pub];
    }
    if (!function_exists('openssl_pkey_new')) {
        return null;
    }
    $key = @openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
    if (!$key) {
        return null;
    }
    openssl_pkey_export($key, $pem);
    $d = openssl_pkey_get_details($key)['ec'];
    $raw = "\x04" . str_pad($d['x'], 32, "\0", STR_PAD_LEFT) . str_pad($d['y'], 32, "\0", STR_PAD_LEFT);
    set_setting('vapid_private', $pem);
    set_setting('vapid_public', b64url($raw));
    return ['private' => $pem, 'public' => b64url($raw)];
}

/** Assinatura DER do openssl → 64 bytes (R||S), como o JWT ES256 exige. */
function der_to_raw(string $der): string
{
    $offset = 3;
    $rLen = ord($der[$offset]);
    $r = substr($der, $offset + 1, $rLen);
    $offset += 1 + $rLen + 1;
    $sLen = ord($der[$offset]);
    $s = substr($der, $offset + 1, $sLen);
    $r = str_pad(ltrim($r, "\0"), 32, "\0", STR_PAD_LEFT);
    $s = str_pad(ltrim($s, "\0"), 32, "\0", STR_PAD_LEFT);
    return $r . $s;
}

function vapid_header(string $endpoint, array $keys): ?string
{
    $parts = parse_url($endpoint);
    $aud = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
    $header = b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
    $claims = b64url(json_encode(['aud' => $aud, 'exp' => time() + 12 * 3600, 'sub' => 'mailto:avisos@cartasdaalma.invalid']));
    $signed = '';
    if (!openssl_sign($header . '.' . $claims, $signed, $keys['private'], OPENSSL_ALGO_SHA256)) {
        return null;
    }
    return 'vapid t=' . $header . '.' . $claims . '.' . b64url(der_to_raw($signed)) . ', k=' . $keys['public'];
}

/** Envia o toque. Retorna o código HTTP (201 = entregue ao serviço de push) ou 0 se não conseguiu conectar. */
function push_ping(string $endpoint, array $keys, string &$error = ''): int
{
    $auth = vapid_header($endpoint, $keys);
    if (!$auth) {
        $error = 'Não consegui assinar o aviso.';
        return 0;
    }
    $headers = ['Authorization: ' . $auth, 'TTL: 86400', 'Urgency: normal', 'Content-Length: 0'];
    if (function_exists('curl_init')) {
        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST => true, CURLOPT_POSTFIELDS => '', CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 6, CURLOPT_CONNECTTIMEOUT => 4,
        ]);
        curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if (!$code) {
            $error = curl_error($ch);
        }
        curl_close($ch);
        return $code;
    }
    $ctx = stream_context_create(['http' => ['method' => 'POST', 'header' => implode("\r\n", $headers), 'content' => '', 'timeout' => 6, 'ignore_errors' => true]]);
    $res = @file_get_contents($endpoint, false, $ctx);
    if ($res === false && empty($http_response_header)) {
        $error = 'Sem conexão com o serviço de avisos.';
        return 0;
    }
    preg_match('#HTTP/\S+ (\d+)#', $http_response_header[0] ?? '', $m);
    return (int) ($m[1] ?? 0);
}

/** Avisa todos os aparelhos de uma pessoa. Retorna [entregues, erro]. Assinaturas vencidas são apagadas. */
function notify_user(int $userId): array
{
    $subs = q_all('SELECT * FROM push_subscriptions WHERE user_id = ?', [$userId]);
    if (!$subs) {
        return [0, 'Nenhum aparelho com avisos ativados.'];
    }
    $keys = vapid_keys();
    if (!$keys) {
        return [0, 'Esta hospedagem não tem suporte a criptografia (openssl).'];
    }
    $ok = 0;
    $lastError = '';
    foreach ($subs as $sub) {
        $err = '';
        $code = push_ping($sub['endpoint'], $keys, $err);
        if ($code >= 200 && $code < 300) {
            $ok++;
        } elseif ($code === 404 || $code === 410) {
            q('DELETE FROM push_subscriptions WHERE id = ?', [(int) $sub['id']]);
            $lastError = $lastError ?: 'Este aparelho não está mais cadastrado. Ative os avisos de novo.';
        } else {
            $lastError = $code ? 'O serviço de avisos respondeu ' . $code . '.' : ($err ?: 'Sem conexão com o serviço de avisos.');
        }
    }
    return [$ok, $lastError];
}

/** Não deixa um aviso com problema atrapalhar o envio da carta. */
function notify_quietly(int $userId): void
{
    try {
        notify_user($userId);
    } catch (Throwable $e) {
        // ignora: o aviso é um bônus
    }
}
