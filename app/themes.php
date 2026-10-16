<?php
declare(strict_types=1);

/*
 * Estilos prontos: um clique muda papel, letra, tinta, cenário, envelope e efeito juntos.
 * Usados no editor (aba Papel) e no assistente de carta (o tom escolhido sugere um estilo).
 * Só usam valores que o sanitizador de conteúdo aceita.
 */

function letter_themes(): array
{
    return [
        'romantico' => ['label' => 'Romântico', 'emoji' => '🌹',
            'paper' => ['style' => 'plain', 'color' => '#fff5f5', 'ink' => '#7a1f2b', 'font' => 'dancing', 'border' => 'hearts', 'scene' => 'pink'],
            'envelope' => ['color' => '#e9b8b0', 'liner' => 'hearts', 'seal' => '❤', 'sealColor' => '#a8323e', 'stamp' => 'heart'],
            'effect' => 'petals'],
        'vintage' => ['label' => 'Vintage', 'emoji' => '📜',
            'paper' => ['style' => 'vintage', 'color' => '#f6ead2', 'ink' => '#4a3424', 'font' => 'special', 'border' => 'double', 'scene' => 'desk'],
            'envelope' => ['color' => '#d9c2a3', 'liner' => 'stripes', 'seal' => '✉', 'sealColor' => '#7a4a2a', 'stamp' => 'bird'],
            'effect' => 'none'],
        'fofo' => ['label' => 'Fofo', 'emoji' => '🧸',
            'paper' => ['style' => 'dots', 'color' => '#fff6cc', 'ink' => '#5a3a6b', 'font' => 'patrick', 'border' => 'dashed', 'scene' => 'pink'],
            'envelope' => ['color' => '#f3d9a4', 'liner' => 'dots', 'seal' => '✿', 'sealColor' => '#d4708a', 'stamp' => 'cat'],
            'effect' => 'hearts'],
        'minimalista' => ['label' => 'Minimalista', 'emoji' => '🤍',
            'paper' => ['style' => 'plain', 'color' => '#ffffff', 'ink' => '#222222', 'font' => 'lora', 'border' => 'none', 'scene' => 'plain'],
            'envelope' => ['color' => '#f1e6d2', 'liner' => 'plain', 'seal' => '✉', 'sealColor' => '#333333', 'stamp' => ''],
            'effect' => 'none'],
        'noite' => ['label' => 'Noite estrelada', 'emoji' => '🌙',
            'paper' => ['style' => 'plain', 'color' => '#fdf1e6', 'ink' => '#2d3a5a', 'font' => 'dancing', 'border' => 'simple', 'scene' => 'night'],
            'envelope' => ['color' => '#2d3a5a', 'liner' => 'stars', 'seal' => '☾', 'sealColor' => '#b8862b', 'stamp' => 'moon'],
            'effect' => 'stars'],
        'jardim' => ['label' => 'Jardim', 'emoji' => '🌷',
            'paper' => ['style' => 'lined', 'color' => '#fbfff4', 'ink' => '#2f5a3a', 'font' => 'indie', 'border' => 'flowers', 'scene' => 'garden'],
            'envelope' => ['color' => '#b9d8c2', 'liner' => 'dots', 'seal' => '❀', 'sealColor' => '#2f6b4f', 'stamp' => 'flower'],
            'effect' => 'petals'],
        'ceu' => ['label' => 'Céu leve', 'emoji' => '☁️',
            'paper' => ['style' => 'grid', 'color' => '#ffffff', 'ink' => '#1f2a44', 'font' => 'shadows', 'border' => 'none', 'scene' => 'sky'],
            'envelope' => ['color' => '#b7cfe8', 'liner' => 'stripes', 'seal' => '★', 'sealColor' => '#1f4e79', 'stamp' => 'plane'],
            'effect' => 'confetti'],
        'festa' => ['label' => 'Festa', 'emoji' => '🎉',
            'paper' => ['style' => 'dots', 'color' => '#fffdf6', 'ink' => '#3b2f45', 'font' => 'gloria', 'border' => 'dashed', 'scene' => 'pink'],
            'envelope' => ['color' => '#cdbfe6', 'liner' => 'stars', 'seal' => '★', 'sealColor' => '#7b2d8b', 'stamp' => 'sun'],
            'effect' => 'confetti'],
        'kraft' => ['label' => 'Papel de pão', 'emoji' => '🥐',
            'paper' => ['style' => 'kraft', 'color' => '#fdf1e6', 'ink' => '#3d2b1f', 'font' => 'indie', 'border' => 'none', 'scene' => 'desk'],
            'envelope' => ['color' => '#d9c2a3', 'liner' => 'plain', 'seal' => '☀', 'sealColor' => '#b8862b', 'stamp' => 'coffee'],
            'effect' => 'none'],
        'natal' => ['label' => 'Fim de ano', 'emoji' => '🎄',
            'paper' => ['style' => 'plain', 'color' => '#fffaf0', 'ink' => '#1e4d2b', 'font' => 'dancing', 'border' => 'double', 'scene' => 'night'],
            'envelope' => ['color' => '#8c2f39', 'liner' => 'stars', 'seal' => '★', 'sealColor' => '#b8862b', 'stamp' => 'mountain'],
            'effect' => 'snow'],
        'aquarela' => ['label' => 'Aquarela', 'emoji' => '🎨',
            'paper' => ['style' => 'watercolor', 'color' => '#fffdf8', 'ink' => '#4a3a5c', 'font' => 'satisfy', 'border' => 'none', 'scene' => 'lavender'],
            'envelope' => ['color' => '#cdbfe6', 'liner' => 'flowers', 'seal' => '✿', 'sealColor' => '#7b2d8b', 'stamp' => 'rose'],
            'effect' => 'petals'],
        'caderno' => ['label' => 'Caderno', 'emoji' => '📓',
            'paper' => ['style' => 'notebook', 'color' => '#ffffff', 'ink' => '#1f2a44', 'font' => 'kalam', 'border' => 'none', 'scene' => 'wood'],
            'envelope' => ['color' => '#b7cfe8', 'liner' => 'checks', 'seal' => '★', 'sealColor' => '#1f4e79', 'stamp' => 'star'],
            'effect' => 'confetti'],
        'praia' => ['label' => 'Praia', 'emoji' => '🏖️',
            'paper' => ['style' => 'plain', 'color' => '#fffaf0', 'ink' => '#1f4e79', 'font' => 'pacifico', 'border' => 'polaroid', 'scene' => 'beach'],
            'envelope' => ['color' => '#f3d9a4', 'liner' => 'stripes', 'seal' => '☀', 'sealColor' => '#b8862b', 'stamp' => 'beach'],
            'effect' => 'confetti'],
    ];
}

/** Aplica um estilo pronto a um conteúdo de carta (mantém blocos e adesivos). */
function apply_theme(array $content, string $key): array
{
    $t = letter_themes()[$key] ?? null;
    if (!$t) {
        return $content;
    }
    $content['paper'] = array_merge($content['paper'] ?? [], $t['paper']);
    $content['envelope'] = array_merge($content['envelope'] ?? [], $t['envelope']);
    $content['effect'] = $t['effect'];
    return $content;
}
