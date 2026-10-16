<?php
declare(strict_types=1);

/*
 * Escrever com IA (opcional): quem cuida do site cola uma chave da API do Claude em
 * Conta → Sobre o site. Sem chave, o assistente monta o rascunho com frases prontas.
 * Usa o SDK oficial da Anthropic, empacotado em app/vendor-anthropic.phar.
 */

const AI_MODEL = 'claude-opus-5-5';

function ai_key(): string
{
    try {
        return (string) (setting('anthropic_api_key') ?? '');
    } catch (Throwable $e) {
        return '';
    }
}

/** A IA está pronta para uso nesta hospedagem? */
function ai_available(): bool
{
    return ai_key() !== '' && extension_loaded('phar') && extension_loaded('curl') && is_file(APP_DIR . '/vendor-anthropic.phar');
}

function ai_client(): \Anthropic\Client
{
    static $loaded = false;
    if (!$loaded) {
        require_once APP_DIR . '/vendor-anthropic.phar';
        $loaded = true;
    }
    // A hospedagem gratuita corta pedidos longos: o tempo máximo fica bem abaixo do limite dela
    return new \Anthropic\Client(
        apiKey: ai_key(),
        requestOptions: [
            'maxRetries' => 1,
            'transporter' => new \GuzzleHttp\Client(['timeout' => 40, 'connect_timeout' => 6]),
        ],
    );
}

/**
 * Escreve o texto da carta. Retorna ['greeting' => ..., 'paragraphs' => [...], 'closing' => ...]
 * ou lança RuntimeException com uma mensagem amigável.
 */
function ai_write_letter(array $o): array
{
    if (!ai_available()) {
        throw new RuntimeException('A escrita com IA não está ativada neste site.');
    }
    @set_time_limit(90);
    $relations = COMPOSE_RELATIONS;
    $occasions = COMPOSE_OCCASIONS;
    $tones = COMPOSE_TONES;
    $brief = "Quem escreve: {$o['sender']}\n"
        . 'Para quem: ' . ($o['name'] !== '' ? $o['name'] : '(sem nome)') . "\n"
        . 'Relação: ' . $relations[$o['relation']] . "\n"
        . 'Ocasião: ' . $occasions[$o['occasion']] . "\n"
        . 'Tom: ' . $tones[$o['tone']][0] . "\n"
        . 'O que a pessoa quer dizer (com as palavras dela): ' . ($o['feeling'] !== '' ? $o['feeling'] : '(não contou; escreva algo carinhoso e geral)');

    $system = 'Você escreve cartas pessoais em português do Brasil, para alguém mandar a uma pessoa querida pelo site "Cartas da Alma". '
        . 'A carta é de quem escreve, em primeira pessoa, com a voz dela: natural, calorosa, específica e sem clichês de cartão comercial. '
        . 'Use as informações que a pessoa contou e não invente fatos concretos (nomes, lugares, datas, acontecimentos) que ela não mencionou; '
        . 'quando faltar um detalhe que deixaria a carta mais pessoal, deixe um trecho entre colchetes para ela completar, como [conte aqui uma lembrança de vocês]. '
        . 'Respeite o tom pedido e a relação (nada romântico para família, amizade ou trabalho). '
        . 'Escreva de 3 a 6 parágrafos curtos, sem título e sem assinatura no texto.';

    try {
        $client = ai_client();
        $message = $client->beta->messages->create(
            model: AI_MODEL,
            maxTokens: 16000,
            system: $system,
            messages: [['role' => 'user', 'content' => $brief]],
            outputConfig: [
                'effort' => 'low',
                'format' => [
                    'type' => 'json_schema',
                    'schema' => [
                        'type' => 'object',
                        'properties' => [
                            'greeting' => ['type' => 'string', 'description' => 'Saudação curta da primeira linha, ex.: "Meu amor," ou "Oi, Bia!"'],
                            'paragraphs' => ['type' => 'array', 'items' => ['type' => 'string']],
                            'closing' => ['type' => 'string', 'description' => 'Despedida curta antes da assinatura, ex.: "Com carinho,"'],
                        ],
                        'required' => ['greeting', 'paragraphs', 'closing'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
            // Se o modelo recusar por política, o servidor tenta o substituto padrão
            fallbacks: 'default',
            betas: ['server-side-fallback-2026-07-01'],
        );
    } catch (\Anthropic\Core\Exceptions\AuthenticationException $e) {
        throw new RuntimeException('A chave da IA não foi aceita. Confira em Conta → Sobre o site.');
    } catch (\Anthropic\Core\Exceptions\RateLimitException $e) {
        throw new RuntimeException('A IA está ocupada agora. Tente de novo em um minuto.');
    } catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
        error_log('[cartas] IA: ' . $e->getMessage());
        throw new RuntimeException('A IA não conseguiu escrever agora. Montei um rascunho para você completar.');
    } catch (\Anthropic\Core\Exceptions\APIConnectionException $e) {
        error_log('[cartas] IA sem conexão: ' . $e->getMessage());
        throw new RuntimeException('Não consegui falar com a IA (a hospedagem pode estar bloqueando). Montei um rascunho para você completar.');
    } catch (\Throwable $e) {
        // pacote da IA corrompido ou que não carrega nesta hospedagem: o assistente segue sem IA
        error_log('[cartas] IA indisponível: ' . get_class($e) . ': ' . $e->getMessage());
        throw new RuntimeException('A escrita com IA não está funcionando nesta hospedagem agora. Montei um rascunho para você completar.');
    }

    if ($message->stopReason === 'refusal') {
        throw new RuntimeException('A IA preferiu não escrever esse texto. Montei um rascunho para você completar.');
    }
    $text = '';
    foreach ($message->content as $block) {
        if ($block->type === 'text') {
            $text .= $block->text;
        }
    }
    $data = json_decode($text, true);
    if (!is_array($data) || !is_array($data['paragraphs'] ?? null) || !$data['paragraphs']) {
        throw new RuntimeException('A IA respondeu de um jeito inesperado. Montei um rascunho para você completar.');
    }
    $clean = fn($s, int $max) => trim(mb_substr(is_string($s) ? $s : '', 0, $max));
    return [
        'greeting' => $clean($data['greeting'] ?? '', 120) ?: compose_greeting($o['name'], $o['relation'], $o['tone']),
        'paragraphs' => array_values(array_filter(array_map(fn($p) => $clean($p, 2000), array_slice($data['paragraphs'], 0, 8)))),
        'closing' => $clean($data['closing'] ?? '', 120) ?: compose_closing($o['tone'], $o['relation']),
    ];
}
