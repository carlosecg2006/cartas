<?php
declare(strict_types=1);

/*
 * Assistente de carta: a pessoa diz a relação, a ocasião, o tom e (se quiser) o que sente.
 * Sem IA, o rascunho é montado com frases prontas e trechos [destacados] para completar.
 * Com IA (app/ai.php), o texto inteiro é escrito a partir dessas respostas.
 */

const COMPOSE_RELATIONS = [
    'amor' => 'Meu amor (namoro, casamento)', 'crush' => 'Crush', 'melhor_amigo' => 'Melhor amigo(a)', 'amigo' => 'Amigo(a)',
    'mae' => 'Mãe', 'pai' => 'Pai', 'avos' => 'Avó / avô', 'irmaos' => 'Irmão / irmã', 'filho' => 'Filho(a)',
    'mestre' => 'Professor(a) / mentor(a)', 'trabalho' => 'Colega de trabalho', 'outro' => 'Outra relação',
];
const COMPOSE_OCCASIONS = [
    'nada' => 'Sem motivo, só porque sim', 'aniversario' => 'Aniversário', 'saudade' => 'Saudade', 'obrigado' => 'Agradecimento',
    'desculpa' => 'Pedido de desculpas', 'conquista' => 'Parabéns por uma conquista', 'despedida' => 'Despedida / mudança',
    'namoro' => 'Aniversário de namoro / casamento', 'datas' => 'Natal e Ano Novo', 'abra_quando' => '"Abra quando…"',
];
const COMPOSE_TONES = [
    'romantico' => ['Romântico', '🌹'], 'divertido' => ['Divertido', '😄'], 'emocionante' => ['Emocionante', '🥹'],
    'nostalgico' => ['Nostálgico', '📷'], 'poetico' => ['Poético', '🌙'], 'fofo' => ['Fofo', '🧸'], 'sincero' => ['Simples e sincero', '🤍'],
];

/** Estilo pronto sugerido para cada tom (a ocasião pode mudar). */
function compose_theme(string $tone, string $occasion): string
{
    $byOccasion = ['aniversario' => 'festa', 'datas' => 'natal', 'namoro' => 'romantico', 'conquista' => 'festa'];
    $byTone = ['romantico' => 'romantico', 'divertido' => 'festa', 'emocionante' => 'noite', 'nostalgico' => 'vintage',
        'poetico' => 'jardim', 'fofo' => 'fofo', 'sincero' => 'minimalista'];
    return $byOccasion[$occasion] ?? ($byTone[$tone] ?? 'minimalista');
}

/** Saudação conforme a relação e o tom. */
function compose_greeting(string $name, string $relation, string $tone): string
{
    $first = first_name($name ?: 'você');
    $map = [
        'amor' => $tone === 'divertido' ? "Oi, meu bem!" : "Meu amor, $first,",
        'mae' => "Mãe querida,", 'pai' => "Pai,", 'avos' => "Minha querida $first,",
        'filho' => "Meu(minha) querido(a) $first,", 'mestre' => "Querido(a) $first,", 'trabalho' => "Oi, $first!",
    ];
    if (isset($map[$relation])) {
        return $map[$relation];
    }
    return match ($tone) {
        'divertido' => "E aí, $first!", 'poetico' => "$first,", 'fofo' => "Oiii, $first! 💛",
        default => "Querido(a) $first,",
    };
}

/** Parágrafo de abertura conforme a ocasião (com o tom ajustando a frase). */
function compose_opening(string $occasion, string $tone): string
{
    $o = [
        'nada' => [
            'default' => 'Não tem data especial nem motivo certo: só senti vontade de parar tudo e te escrever.',
            'divertido' => 'Não tem motivo nenhum pra esta carta. Ou melhor, tem: você. Então senta que lá vem textão.',
            'poetico' => 'Hoje o dia passou devagar, e no meio dele encontrei uma vontade enorme de te escrever.',
        ],
        'aniversario' => [
            'default' => 'Hoje é o seu dia, e eu não podia deixar passar sem te dizer algumas coisas que guardo aqui dentro.',
            'divertido' => 'Mais um ano de vida! Parabéns por continuar sendo essa pessoa incrível (e um pouquinho mais velha 😜).',
            'emocionante' => 'Hoje o mundo comemora o dia em que você chegou, e eu comemoro junto o quanto a sua vida faz diferença na minha.',
        ],
        'saudade' => [
            'default' => 'A saudade apertou de um jeito que só escrevendo pra aliviar um pouquinho.',
            'nostalgico' => 'Tem dias em que a saudade vem com cheiro, com música, com lembrança. Hoje veio com tudo.',
            'divertido' => 'Alerta de saudade nível máximo! Precisei escrever antes que eu explodisse.',
        ],
        'obrigado' => [
            'default' => 'Eu queria te agradecer de um jeito que ficasse guardado, não só num "valeu" corrido.',
            'emocionante' => 'Algumas pessoas passam pela nossa vida e mudam tudo. Você é uma delas, e eu nunca te agradeci do jeito certo.',
        ],
        'desculpa' => [
            'default' => 'Eu sei que errei, e quis escrever com calma, olhando pra dentro, pra te pedir desculpas de verdade.',
        ],
        'conquista' => [
            'default' => 'Parabéns! Eu vi o quanto você se dedicou, e ver você chegar lá me encheu de orgulho.',
            'divertido' => 'CONSEGUIU!!! Eu sabia, eu sempre soube (e agora vou me gabar disso pra todo mundo).',
        ],
        'despedida' => [
            'default' => 'Despedidas nunca são fáceis, então resolvi transformar essa em palavras pra você levar junto.',
        ],
        'namoro' => [
            'default' => 'Mais um ano ao seu lado, e eu continuo descobrindo motivos novos pra escolher você todos os dias.',
            'divertido' => 'Mais um ano me aguentando! Você merece uma medalha, mas por enquanto aceita essa carta.',
        ],
        'datas' => [
            'default' => 'Fim de ano é tempo de olhar pra trás, e quando eu olho, você está em tantas partes boas do meu ano.',
        ],
        'abra_quando' => [
            'default' => 'Se você abriu esta carta, é porque chegou o momento certo. Então respira fundo e lê devagar.',
        ],
    ];
    $set = $o[$occasion] ?? $o['nada'];
    return $set[$tone] ?? $set['default'];
}

/** Trechos guiados: frases com [espaços] para a pessoa completar. */
function compose_middle(string $occasion, string $relation, string $tone): array
{
    $memory = $tone === 'divertido'
        ? 'Lembra quando a gente [conte uma história engraçada de vocês]? Até hoje eu rio sozinho(a) lembrando disso.'
        : 'Lembra quando a gente [conte uma lembrança especial de vocês]? Esse momento ficou guardado comigo.';
    $admire = 'Eu admiro tanto o jeito que você [algo que você admira nessa pessoa].';
    $wish = match ($occasion) {
        'aniversario' => 'Eu desejo que esse novo ano te traga [seus desejos para ela].',
        'conquista' => 'Que essa seja só a primeira de muitas conquistas. Você merece [o que ela merece].',
        'despedida' => 'Onde quer que você esteja, saiba que [o que você quer que ela nunca esqueça].',
        'desculpa' => 'O que eu mais quero é [o que você quer consertar ou prometer].',
        'datas' => 'Pro ano que vem, eu desejo pra gente [seus desejos para o próximo ano].',
        default => 'O que eu mais queria que você soubesse é que [o que você sente].',
    };
    $relationLine = match ($relation) {
        'amor', 'crush' => 'Quando eu estou com você, [como você se sente ao lado dessa pessoa].',
        'mae', 'pai', 'avos' => 'Tudo o que eu sou tem um pouco de você, principalmente [algo que você aprendeu com ela].',
        'irmaos' => 'Crescer com você foi [como foi crescer juntos], e eu não trocaria por nada.',
        'filho' => 'Ver você crescer é [o que você sente vendo essa pessoa crescer].',
        'mestre' => 'Graças a você, eu aprendi [o que você aprendeu].',
        'trabalho' => 'Trabalhar com você deixou os dias mais [como ficaram os dias].',
        default => 'Ter você por perto faz [a diferença que essa pessoa faz].',
    };
    return $occasion === 'desculpa' ? [$relationLine, $wish] : [$memory, $relationLine, $admire, $wish];
}

function compose_closing(string $tone, string $relation): string
{
    if (in_array($relation, ['amor', 'crush'], true)) {
        return $tone === 'divertido' ? 'Te amo mais que pão de queijo,' : 'Com todo o meu amor,';
    }
    return match ($tone) {
        'divertido' => 'Um abraço de urso,', 'emocionante' => 'Com o coração cheio,', 'nostalgico' => 'Com saudade e carinho,',
        'poetico' => 'Sempre seu(sua),', 'fofo' => 'Beijinhos e abraços apertados,', default => 'Com carinho,',
    };
}

/** Destaca os [trechos] que a pessoa ainda precisa completar. */
function compose_marks(string $text): string
{
    return preg_replace('/\[([^\]]+)\]/', '<mark>[$1]</mark>', e($text)) ?? e($text);
}

/**
 * Monta os blocos do rascunho. $paragraphs (texto puro) vem da IA, quando usada;
 * sem IA, usa as frases prontas.
 */
function compose_blocks(array $o, ?array $ai = null): array
{
    $id = fn() => 'b' . bin2hex(random_bytes(4));
    $blocks = [];
    $greeting = $ai['greeting'] ?? compose_greeting($o['name'], $o['relation'], $o['tone']);
    $blocks[] = ['id' => $id(), 'type' => 'heading', 'level' => 1, 'html' => e($greeting)];
    if ($ai) {
        foreach ($ai['paragraphs'] as $p) {
            $blocks[] = ['id' => $id(), 'type' => 'paragraph', 'html' => nl2br(e($p), false)];
        }
    } else {
        $blocks[] = ['id' => $id(), 'type' => 'paragraph', 'html' => e(compose_opening($o['occasion'], $o['tone']))];
        if ($o['feeling'] !== '') {
            $blocks[] = ['id' => $id(), 'type' => 'paragraph', 'html' => e($o['feeling'])];
        }
        foreach (compose_middle($o['occasion'], $o['relation'], $o['tone']) as $line) {
            $blocks[] = ['id' => $id(), 'type' => 'paragraph', 'html' => compose_marks($line)];
        }
    }
    $blocks[] = ['id' => $id(), 'type' => 'signature', 'closing' => $ai['closing'] ?? compose_closing($o['tone'], $o['relation']),
        'name' => first_name($o['sender']), 'date' => fmt_date_long(now())];
    return $blocks;
}

/** Lê e valida as respostas do assistente vindas do formulário. */
function compose_options(array $in, string $recipientName, string $senderName): array
{
    $pick = fn($v, array $list, string $def) => is_string($v) && isset($list[$v]) ? $v : $def;
    return [
        'name' => $recipientName,
        'sender' => $senderName,
        'relation' => $pick($in['relacao'] ?? null, COMPOSE_RELATIONS, 'amigo'),
        'occasion' => $pick($in['ocasiao'] ?? null, COMPOSE_OCCASIONS, 'nada'),
        'tone' => $pick($in['tom'] ?? null, COMPOSE_TONES, 'sincero'),
        'feeling' => trim(mb_substr(is_string($in['sinto'] ?? null) ? $in['sinto'] : '', 0, 800)),
    ];
}
