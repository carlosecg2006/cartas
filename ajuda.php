<?php
declare(strict_types=1);

// Perguntas frequentes
require __DIR__ . '/app/bootstrap.php';

$user = current_user();
$faq = [
    'Começando' => [
        ['Como chamo alguém para trocar cartas?', 'Em <b>Pessoas → Convidar alguém</b>, escreva o nome e toque em “Gerar link de convite”. Mande o link pelo WhatsApp. A pessoa cria a conta com a senha dela e vocês entram um na lista do outro na hora.'],
        ['Posso escrever para qualquer pessoa do site?', 'Não. Só para quem está na <b>sua</b> lista. E ninguém vê a lista de ninguém. Quem recebe uma carta sua ganha você na lista automaticamente, para poder responder.'],
        ['Como dou um apelido para alguém?', 'Em Pessoas, no menu “⋯” da pessoa, escolha <b>Apelido e anotações</b>. Só você vê. O envelope das suas cartas usa esse nome.'],
    ],
    'Escrevendo' => [
        ['Como coloco fotos, listas, música…?', 'Numa linha vazia, digite <kbd>/</kbd> e escolha o bloco. Ou use a aba <b>Blocos</b> do lado. Atalhos: <kbd>#</kbd> título, <kbd>-</kbd> lista, <kbd>[]</kbd> lista de desejos, <kbd>&gt;</kbd> citação, <kbd>---</kbd> divisória. <kbd>Ctrl</kbd>+<kbd>K</kbd> procura qualquer ação.'],
        ['Como uso adesivos e figurinhas?', 'Na aba <b>Adesivos</b>: emojis, rabiscos, fitas, bilhetes, desenho à mão ou uma imagem sua. Cole (<kbd>Ctrl</kbd>+<kbd>V</kbd>) qualquer imagem da internet: se ela tiver fundo liso, o site apaga o fundo sozinho. Arraste, gire e redimensione; no celular, toque para selecionar.'],
        ['Perdi o que escrevi?', 'Dificilmente: a carta salva sozinha a cada pausa (veja “Tudo salvo” no topo). Se a internet cair, o editor guarda uma cópia no aparelho e oferece recuperar. Em <b>Versões</b> (ícone de relógio) dá para voltar a qualquer ponto.'],
        ['Como faço uma carta que só abre numa data?', 'Ao enviar, marque <b>“Só pode ser aberta a partir de uma data”</b>. A pessoa vê o envelope lacrado com uma contagem regressiva, e o conteúdo nem chega ao aparelho dela antes da hora.'],
        ['O que é “Abra quando…”?', 'Um texto escrito no envelope (aba Envelope), como “Abra quando estiver com saudade”. Essas cartas ficam guardadas numa seção à parte até a pessoa decidir abrir.'],
        ['Como coloco uma música tocando enquanto a pessoa lê?', 'Aba <b>Envelope → Música enquanto lê</b>: cole um link do YouTube ou envie um mp3. Começa quando a pessoa quebra o selo. O Spotify não permite tocar sozinho, mas funciona como bloco de Música dentro da carta.'],
        ['Mudei de ideia depois de enviar. E agora?', 'Dá para editar a carta enviada (a pessoa vê a versão nova) ou, no menu da carta, <b>Voltar para rascunho</b>, que tira a carta da caixa da pessoa.'],
    ],
    'Recebendo' => [
        ['Como sei que chegou carta?', 'O número aparece em “Cartas” no topo. Para ser avisado(a) no celular, ative em <b>Conta → Avisos no celular</b>.'],
        ['Os avisos não funcionam no iPhone', 'No iPhone (iOS 16.4 ou mais novo) os avisos só funcionam com o site instalado: no Safari, toque em <b>Compartilhar → Adicionar à Tela de Início</b>, abra o site pelo ícone novo e ative os avisos em Conta.'],
        ['Como instalo o site como app?', 'Android/Chrome: menu ⋮ → <b>Instalar app</b> (ou “Adicionar à tela inicial”). iPhone/Safari: <b>Compartilhar → Adicionar à Tela de Início</b>.'],
        ['Posso guardar uma carta para sempre?', 'Toque na estrela para deixar nas <b>Favoritas</b>. E em <b>Conta → Baixar todas as minhas cartas</b> você leva tudo num arquivo que abre sem internet.'],
    ],
    'Conta e segurança' => [
        ['Esqueci minha senha', 'Use o <b>código de recuperação</b> em <a href="recuperar.php">Esqueci minha senha</a>. Se a sua conta foi criada por outra pessoa com senha, ela também pode gerar um link de senha nova para você. Sem nenhum dos dois, ninguém consegue entrar na conta, nem quem cuida do site.'],
        ['Alguém está me incomodando', 'Em Pessoas, menu “⋯” → <b>Bloquear</b>. A pessoa sai da sua lista e não consegue mais te mandar cartas. Ela não é avisada.'],
        ['Como apago minha conta?', 'Em <b>Conta → Privacidade → Apagar minha conta</b>. Antes, se quiser, baixe suas cartas. Leia também <a href="privacidade.php">como seus dados são guardados</a>.'],
    ],
];
page_head('Ajuda', ['nav' => (bool) $user]);
?>
<main class="container narrow">
    <section class="page-head">
        <div>
            <p class="eyebrow">Ajuda</p>
            <h1>Perguntas <em>frequentes</em></h1>
        </div>
    </section>
    <?php foreach ($faq as $group => $items): ?>
        <section class="faq">
            <h2><?= e($group) ?></h2>
            <?php foreach ($items as [$q, $a]): ?>
                <details class="faq-item">
                    <summary><?= e($q) ?></summary>
                    <div><?= $a ?></div>
                </details>
            <?php endforeach; ?>
        </section>
    <?php endforeach; ?>
</main>
<?php
page_foot();
