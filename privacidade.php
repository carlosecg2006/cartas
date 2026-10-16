<?php
declare(strict_types=1);

// Como os dados são guardados (LGPD), em linguagem simples
require __DIR__ . '/app/bootstrap.php';

$user = current_user();
$contact = site_contact();
page_head('Privacidade', ['nav' => (bool) $user]);
?>
<main class="container narrow prose">
    <section class="page-head">
        <div>
            <p class="eyebrow"><?= icon('shield', 'ic-sm') ?> Privacidade</p>
            <h1>Suas cartas, <em>seus dados</em></h1>
            <p>O que fica guardado, quem pode ver e o que você pode fazer. Sem letras miúdas.</p>
        </div>
    </section>

    <section class="card">
        <h2>O que é guardado</h2>
        <ul>
            <li><b>Sua conta:</b> nome, usuário, cor e inicial/emoji do perfil, aniversário (se você informar) e a senha, que é guardada embaralhada (ninguém consegue lê-la, nem quem cuida do site).</li>
            <li><b>Suas cartas:</b> o texto, as fotos, os áudios, a música escolhida, os adesivos e as versões anteriores de cada carta (até 40 por carta, para você poder voltar atrás).</li>
            <li><b>A conversa:</b> recados, reações, favoritas e quando cada carta foi aberta.</li>
            <li><b>Sua lista:</b> quem está nela, os apelidos e as anotações que você escreveu (só você vê).</li>
            <li><b>Segurança:</b> o endereço de internet (IP) de tentativas de login erradas, por 24 horas, para bloquear quem tenta adivinhar senhas.</li>
            <li><b>Avisos no celular:</b> se você ativar, o endereço que o seu navegador cria para receber avisos.</li>
            <li><b>No seu aparelho:</b> um cookie para manter você conectado (até 90 dias, se marcar “lembrar de mim”), e a escolha de tema claro/escuro.</li>
        </ul>
    </section>

    <section class="card">
        <h2>Quem vê o quê</h2>
        <ul>
            <li>Uma carta só aparece para quem escreveu e para quem recebeu. Cartas lacradas não chegam ao aparelho de quem recebe antes da data.</li>
            <li>Ninguém vê a lista de pessoas de ninguém, nem os apelidos e anotações.</li>
            <li>As cartas <b>não</b> têm criptografia de ponta a ponta: elas ficam no banco de dados da hospedagem. O site não tem nenhuma tela para alguém ler cartas alheias, mas quem administra a hospedagem tecnicamente consegue acessar o banco. Escreva sabendo disso.</li>
            <li>Não há anúncios, rastreadores nem estatísticas de visita. Nada é vendido ou repassado.</li>
        </ul>
    </section>

    <section class="card">
        <h2>Serviços de fora que o site usa</h2>
        <ul>
            <li><b>Hospedagem</b> (InfinityFree, com servidores fora do Brasil): guarda o site, o banco de dados e os arquivos.</li>
            <li><b>Google Fonts</b>: entrega as letras do site; o seu navegador baixa as fontes direto do Google.</li>
            <li><b>YouTube e Spotify</b>: só quando uma carta tem música desses serviços, e só ao abrir essa carta.</li>
            <li><b>Avisos no celular</b> (Google, Mozilla, Apple ou Microsoft, conforme o navegador): recebem apenas um “toque” vazio, sem nenhum conteúdo. O texto do aviso o seu celular busca direto aqui.</li>
            <li><b>cdnjs</b>: só quando você usa “Salvar imagem” em uma carta.</li>
            <li><b>Claude (Anthropic)</b>: só se quem cuida do site ativou a escrita com IA <i>e</i> você escolher “Escrever com IA” ao criar uma carta. Aí o nome da pessoa, a relação, a ocasião, o tom e o que você contou vão para a IA escrever o rascunho. Nada mais da sua conta é enviado.</li>
        </ul>
    </section>

    <section class="card">
        <h2>Seus direitos (LGPD)</h2>
        <p>Você pode, a qualquer momento:</p>
        <ul>
            <li><b>Ver e baixar</b> tudo: <a href="exportar.php">Baixar minhas cartas</a> gera um arquivo com suas cartas, fotos, áudios e recados.</li>
            <li><b>Corrigir</b> seus dados em <a href="conta.php">Conta</a>.</li>
            <li><b>Apagar sua conta</b> em <a href="conta.php#privacidade">Conta → Privacidade</a>. As cartas que outras pessoas escreveram para você voltam para elas; as que você escreveu são apagadas, ou ficam com quem recebeu, se você preferir.</li>
            <li><b>Sair de todos os aparelhos</b> e desativar os avisos quando quiser.</li>
        </ul>
        <p>Dúvidas ou pedidos sobre seus dados:
            <?php if ($contact['email']): ?>
                escreva para <a href="mailto:<?= e($contact['email']) ?>"><?= e($contact['email']) ?></a>.
            <?php else: ?>
                fale com <?= e($contact['name'] ?: 'quem cuida do site') ?>, que cuida deste site.
            <?php endif; ?>
        </p>
    </section>

    <section class="card">
        <h2>Quanto tempo fica guardado</h2>
        <p>Enquanto a sua conta existir. Quando você apaga uma carta, um arquivo da biblioteca ou a conta, eles são apagados na hora (não há lixeira). Tentativas de login ficam 24 horas. Este é um site pessoal, mantido sem fins lucrativos; se um dia ele for desligado, a ideia é avisar antes, para todo mundo poder baixar suas cartas.</p>
    </section>
</main>
<?php
page_foot();
