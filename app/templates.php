<?php
declare(strict_types=1);

/*
 * Modelos prontos para começar uma carta.
 * {nome} é trocado pelo primeiro nome de quem vai receber e {eu} pelo seu.
 */

function letter_templates(): array
{
    return [
        'branco' => [
            'title' => '',
            'name' => 'Em branco',
            'hint' => 'Papel pautado e nada mais',
            'content' => [
                'paper' => ['style' => 'lined', 'color' => '#fffdf6', 'ink' => '#3b3340', 'font' => 'caveat', 'size' => 'md', 'border' => 'none', 'scene' => 'desk'],
                'envelope' => ['color' => '#e9d8c4', 'liner' => 'plain', 'seal' => '❤', 'sealColor' => '#a8323e', 'stamp' => 'heart', 'label' => ''],
                'effect' => 'none',
                'blocks' => [
                    ['id' => 't1', 'type' => 'heading', 'level' => 1, 'html' => '{nome},'],
                    ['id' => 't2', 'type' => 'paragraph', 'html' => ''],
                    ['id' => 't3', 'type' => 'signature', 'closing' => 'Com carinho,', 'name' => '{eu}', 'date' => '{data}'],
                ],
                'stickers' => [],
            ],
        ],
        'aniversario' => [
            'title' => 'Feliz aniversário',
            'name' => 'Aniversário',
            'hint' => 'Confete, fita e um desejo',
            'content' => [
                'paper' => ['style' => 'dots', 'color' => '#fff6cc', 'ink' => '#3b2f45', 'font' => 'patrick', 'size' => 'md', 'border' => 'dashed', 'scene' => 'pink'],
                'envelope' => ['color' => '#f3d9a4', 'liner' => 'dots', 'seal' => '★', 'sealColor' => '#b8862b', 'stamp' => 'sun', 'label' => 'Abra no seu aniversário'],
                'effect' => 'confetti',
                'blocks' => [
                    ['id' => 't1', 'type' => 'heading', 'level' => 1, 'html' => 'Feliz aniversário, {nome}!', 'align' => 'center'],
                    ['id' => 't2', 'type' => 'divider', 'style' => 'stars'],
                    ['id' => 't3', 'type' => 'paragraph', 'html' => 'Mais um ano seu no mundo, e o mundo ficou melhor por isso.'],
                    ['id' => 't4', 'type' => 'paragraph', 'html' => ''],
                    ['id' => 't5', 'type' => 'checklist', 'items' => [
                        ['checked' => false, 'html' => 'Comer bolo sem culpa'],
                        ['checked' => false, 'html' => 'Ser muito mimado(a) hoje'],
                        ['checked' => false, 'html' => ''],
                    ]],
                    ['id' => 't6', 'type' => 'signature', 'closing' => 'Um abraço apertado,', 'name' => '{eu}', 'date' => '{data}'],
                ],
                'stickers' => [
                    ['id' => 's1', 'kind' => 'tape', 'pattern' => 'stripes', 'x' => 14, 'y' => -2, 'anchor' => '', 'w' => 22, 'r' => -28],
                    ['id' => 's2', 'kind' => 'emoji', 'char' => '🎂', 'x' => 88, 'y' => 3, 'anchor' => 't1', 'w' => 10, 'r' => 8],
                    ['id' => 's3', 'kind' => 'doodle', 'name' => 'sparkle', 'c' => '#f2b84b', 'x' => 8, 'y' => 4, 'anchor' => 't1', 'w' => 6, 'r' => 0],
                    ['id' => 's4', 'kind' => 'emoji', 'char' => '🎈', 'x' => 90, 'y' => 0, 'anchor' => 't5', 'w' => 9, 'r' => -6],
                ],
            ],
        ],
        'saudade' => [
            'title' => 'Saudade',
            'name' => 'Saudade',
            'hint' => 'Noite estrelada, letra delicada',
            'content' => [
                'paper' => ['style' => 'plain', 'color' => '#fdf1e6', 'ink' => '#2d3a5a', 'font' => 'dancing', 'size' => 'md', 'border' => 'simple', 'scene' => 'night'],
                'envelope' => ['color' => '#b7cfe8', 'liner' => 'stars', 'seal' => '☾', 'sealColor' => '#1f4e79', 'stamp' => 'moon', 'label' => 'Abra quando sentir saudade'],
                'effect' => 'stars',
                'blocks' => [
                    ['id' => 't1', 'type' => 'heading', 'level' => 2, 'html' => '{nome},'],
                    ['id' => 't2', 'type' => 'paragraph', 'html' => 'Hoje lembrei de você do nada, no meio de uma tarde comum. Aí resolvi escrever.'],
                    ['id' => 't3', 'type' => 'paragraph', 'html' => ''],
                    ['id' => 't4', 'type' => 'quote', 'html' => 'A distância é só um detalhe.', 'align' => 'center'],
                    ['id' => 't5', 'type' => 'signature', 'closing' => 'Com saudade,', 'name' => '{eu}', 'date' => '{data}'],
                ],
                'stickers' => [
                    ['id' => 's1', 'kind' => 'doodle', 'name' => 'moon', 'c' => '#2d3a5a', 'x' => 88, 'y' => 2, 'anchor' => 't1', 'w' => 9, 'r' => -10],
                    ['id' => 's2', 'kind' => 'doodle', 'name' => 'sparkle', 'c' => '#c9a227', 'x' => 79, 'y' => 0, 'anchor' => 't1', 'w' => 4, 'r' => 0],
                    ['id' => 's3', 'kind' => 'doodle', 'name' => 'heart', 'c' => '#2d3a5a', 'x' => 18, 'y' => 6, 'anchor' => 't5', 'w' => 8, 'r' => -12],
                ],
            ],
        ],
        'obrigado' => [
            'title' => 'Obrigado',
            'name' => 'Obrigado',
            'hint' => 'Kraft, flores e gratidão',
            'content' => [
                'paper' => ['style' => 'kraft', 'color' => '#fdf1e6', 'ink' => '#3d2b1f', 'font' => 'indie', 'size' => 'md', 'border' => 'none', 'scene' => 'garden'],
                'envelope' => ['color' => '#d9c2a3', 'liner' => 'stripes', 'seal' => '✿', 'sealColor' => '#2f6b4f', 'stamp' => 'flower', 'label' => ''],
                'effect' => 'petals',
                'blocks' => [
                    ['id' => 't1', 'type' => 'heading', 'level' => 1, 'html' => 'Obrigado, {nome}.'],
                    ['id' => 't2', 'type' => 'paragraph', 'html' => 'Tem coisa que a gente não agradece na hora e fica devendo. Essa é a minha forma de pagar.'],
                    ['id' => 't3', 'type' => 'callout', 'emoji' => '🌿', 'bg' => '#e2f5e5', 'html' => 'Obrigado por '],
                    ['id' => 't4', 'type' => 'paragraph', 'html' => ''],
                    ['id' => 't5', 'type' => 'signature', 'closing' => 'De coração,', 'name' => '{eu}', 'date' => '{data}'],
                ],
                'stickers' => [
                    ['id' => 's1', 'kind' => 'doodle', 'name' => 'flower', 'c' => '#2f6b4f', 'x' => 90, 'y' => 0, 'anchor' => 't1', 'w' => 11, 'r' => 10],
                    ['id' => 's2', 'kind' => 'doodle', 'name' => 'leaf', 'c' => '#5c7d3a', 'x' => 8, 'y' => 4, 'anchor' => 't5', 'w' => 9, 'r' => -20],
                    ['id' => 's3', 'kind' => 'tape', 'pattern' => 'mint', 'x' => 50, 'y' => -1.5, 'anchor' => '', 'w' => 20, 'r' => 2],
                ],
            ],
        ],
        'abra-quando' => [
            'title' => 'Para os dias difíceis',
            'name' => 'Abra quando…',
            'hint' => 'Para um momento específico',
            'content' => [
                'paper' => ['style' => 'grid', 'color' => '#ffffff', 'ink' => '#1f2a44', 'font' => 'shadows', 'size' => 'md', 'border' => 'none', 'scene' => 'sky'],
                'envelope' => ['color' => '#cdbfe6', 'liner' => 'hearts', 'seal' => '✉', 'sealColor' => '#7b2d8b', 'stamp' => 'plane', 'label' => 'Abra quando estiver triste'],
                'effect' => 'hearts',
                'blocks' => [
                    ['id' => 't1', 'type' => 'heading', 'level' => 2, 'html' => 'Ei, {nome}. Respira.'],
                    ['id' => 't2', 'type' => 'paragraph', 'html' => 'Se você abriu essa, o dia não foi fácil. Tudo bem. Não precisa resolver nada agora.'],
                    ['id' => 't3', 'type' => 'list', 'style' => 'bullet', 'items' => [
                        'Bebe uma água',
                        'Coloca aquela música',
                        'Lembra que eu tô aqui',
                    ]],
                    ['id' => 't4', 'type' => 'secret', 'label' => 'Toque quando precisar de um sorriso', 'html' => ''],
                    ['id' => 't5', 'type' => 'signature', 'closing' => 'Sempre com você,', 'name' => '{eu}', 'date' => ''],
                ],
                'stickers' => [
                    ['id' => 's1', 'kind' => 'text', 'text' => 'vai passar', 'font' => 'shadows', 'color' => '#7b2d8b', 'style' => 'note', 'x' => 84, 'y' => 4, 'anchor' => 't3', 'w' => 20, 'r' => 6],
                    ['id' => 's2', 'kind' => 'doodle', 'name' => 'arrow-loop', 'c' => '#7b2d8b', 'x' => 68, 'y' => 8, 'anchor' => 't3', 'w' => 12, 'r' => 160],
                ],
            ],
        ],
        'fim-de-ano' => [
            'title' => 'Fim de ano',
            'name' => 'Fim de ano',
            'hint' => 'Neve, laço e retrospectiva',
            'content' => [
                'paper' => ['style' => 'vintage', 'color' => '#fffdf6', 'ink' => '#7a2e3a', 'font' => 'playfair', 'size' => 'md', 'border' => 'double', 'scene' => 'night'],
                'envelope' => ['color' => '#8c2f39', 'liner' => 'stripes', 'seal' => '❀', 'sealColor' => '#b8862b', 'stamp' => 'mountain', 'label' => ''],
                'effect' => 'snow',
                'blocks' => [
                    ['id' => 't1', 'type' => 'heading', 'level' => 1, 'html' => 'Feliz fim de ano, {nome}', 'align' => 'center'],
                    ['id' => 't2', 'type' => 'divider', 'style' => 'flowers'],
                    ['id' => 't3', 'type' => 'heading', 'level' => 3, 'html' => 'O que esse ano teve de melhor'],
                    ['id' => 't4', 'type' => 'list', 'style' => 'number', 'items' => ['']],
                    ['id' => 't5', 'type' => 'heading', 'level' => 3, 'html' => 'O que eu desejo pra você'],
                    ['id' => 't6', 'type' => 'paragraph', 'html' => ''],
                    ['id' => 't7', 'type' => 'signature', 'closing' => 'Com todo o carinho,', 'name' => '{eu}', 'date' => '{data}'],
                ],
                'stickers' => [
                    ['id' => 's1', 'kind' => 'doodle', 'name' => 'bow', 'c' => '#8c2f39', 'x' => 50, 'y' => -3, 'anchor' => '', 'w' => 14, 'r' => 0],
                    ['id' => 's2', 'kind' => 'emoji', 'char' => '🎄', 'x' => 90, 'y' => 0, 'anchor' => 't5', 'w' => 8, 'r' => 4],
                ],
            ],
        ],
        'desculpa' => [
            'title' => 'Desculpa',
            'name' => 'Desculpa',
            'hint' => 'Simples, direto e sincero',
            'content' => [
                'paper' => ['style' => 'plain', 'color' => '#ffffff', 'ink' => '#1f2a44', 'font' => 'lora', 'size' => 'md', 'border' => 'none', 'scene' => 'plain'],
                'envelope' => ['color' => '#f1e6d2', 'liner' => 'plain', 'seal' => '♡', 'sealColor' => '#333333', 'stamp' => 'bird', 'label' => ''],
                'effect' => 'none',
                'blocks' => [
                    ['id' => 't1', 'type' => 'paragraph', 'html' => '{nome},'],
                    ['id' => 't2', 'type' => 'paragraph', 'html' => 'Eu errei, e fiquei pensando nisso mais do que deixei transparecer.'],
                    ['id' => 't3', 'type' => 'paragraph', 'html' => ''],
                    ['id' => 't4', 'type' => 'signature', 'closing' => 'Me desculpa.', 'name' => '{eu}', 'date' => '{data}'],
                ],
                'stickers' => [
                    ['id' => 's1', 'kind' => 'doodle', 'name' => 'heart', 'c' => '#b8323b', 'x' => 86, 'y' => 2, 'anchor' => 't4', 'w' => 6, 'r' => -8],
                ],
            ],
        ],
        'bilhete' => [
            'title' => 'Bilhete',
            'name' => 'Bilhete',
            'hint' => 'Post-it rápido e fofo',
            'content' => [
                'paper' => ['style' => 'plain', 'color' => '#fff6cc', 'ink' => '#3b3340', 'font' => 'gloria', 'size' => 'lg', 'border' => 'none', 'scene' => 'desk'],
                'envelope' => ['color' => '#f3d9a4', 'liner' => 'dots', 'seal' => '☀', 'sealColor' => '#b8862b', 'stamp' => 'coffee', 'label' => ''],
                'effect' => 'none',
                'blocks' => [
                    ['id' => 't1', 'type' => 'paragraph', 'html' => 'Oi, {nome}!'],
                    ['id' => 't2', 'type' => 'paragraph', 'html' => ''],
                    ['id' => 't3', 'type' => 'paragraph', 'html' => '— {eu}', 'align' => 'right'],
                ],
                'stickers' => [
                    ['id' => 's1', 'kind' => 'tape', 'pattern' => 'yellow', 'x' => 50, 'y' => -1.5, 'anchor' => '', 'w' => 24, 'r' => -3],
                    ['id' => 's2', 'kind' => 'doodle', 'name' => 'smile', 'c' => '#3b3340', 'x' => 88, 'y' => 0, 'anchor' => 't1', 'w' => 8, 'r' => 6],
                ],
            ],
        ],
    ];
}

/** Monta o conteúdo de um modelo, preenchendo nomes e trocando ids fixos por únicos. */
function build_template(string $key, string $recipientName, string $senderName): array
{
    $templates = letter_templates();
    $content = ($templates[$key] ?? $templates['branco'])['content'];
    $plainVars = [
        '{nome}' => $recipientName !== '' ? first_name($recipientName) : 'Você',
        '{eu}' => first_name($senderName),
        '{data}' => fmt_date_long(now()),
    ];
    $htmlVars = array_map('e', $plainVars);
    $ids = [];
    foreach ($content['blocks'] as &$b) {
        $new = 'b' . bin2hex(random_bytes(4));
        $ids[$b['id']] = $new;
        $b['id'] = $new;
        if (isset($b['items'])) {
            foreach ($b['items'] as &$item) {
                if (is_string($item)) {
                    $item = strtr($item, $htmlVars);
                }
            }
            unset($item);
        }
        foreach (['html', 'name', 'date', 'closing'] as $field) {
            if (isset($b[$field])) {
                // html recebe os nomes escapados; campos de texto puro recebem os nomes crus
                $b[$field] = strtr($b[$field], $field === 'html' ? $htmlVars : $plainVars);
            }
        }
    }
    unset($b);
    foreach ($content['stickers'] as &$s) {
        $s['id'] = 's' . bin2hex(random_bytes(4));
        $s['anchor'] = $ids[$s['anchor']] ?? '';
    }
    unset($s);
    return sanitize_letter_content($content);
}
