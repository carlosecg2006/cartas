# 💌 Cartas da Alma

Um site para trocar cartas digitais. Cada pessoa tem o próprio login, a própria lista de pessoas e vê **apenas** as cartas que escreveu ou recebeu.

## Como funcionam as pessoas

- Quem instala o site cria a primeira conta. A partir daí, **qualquer pessoa pode convidar alguém** (em **Pessoas**): o site gera um **link de convite**, a pessoa abre, cria a própria conta com a senha que quiser e vocês entram um na lista do outro. Se ela já tem conta, o mesmo link só conecta vocês dois.
- Para quem não consegue abrir o link, ainda dá para criar o acesso direto (o site gera a senha). Quem criou esse acesso pode editar ou apagar **só até a pessoa entrar pela primeira vez**; depois, pode no máximo mandar um **link para a pessoa escolher a própria senha nova**, e a pessoa pode desligar até isso em Conta.
- Quem entra por convite escolhe a própria senha e ganha um **código de recuperação**: ninguém mais mexe na conta, nem quem convidou, nem quem instalou o site.
- Dá para **bloquear** alguém: a pessoa sai da lista e não consegue mais mandar cartas.
- Você só escreve para quem está na **sua** lista, com o apelido que quiser dar (o apelido é só seu).
- Quem recebe uma carta ganha automaticamente quem escreveu na lista, e pode **responder com outra carta**.
- Ninguém vê cartas de outras pessoas, nem quem instalou o site.

Feito com **PHP + MySQL + HTML + CSS + JavaScript**, sem frameworks e sem instalar nada além de uma hospedagem PHP comum.

## O que dá para fazer

**Escrevendo**
- Painel com todas as cartas desenhadas como envelopes de verdade (com selo e carimbo), filtros por pessoa e por situação
- **Convite por link** (vale 14 dias, funciona uma vez), com mensagem pronta para o WhatsApp
- **Página de amizade**: todas as cartas trocadas com uma pessoa numa linha do tempo, "trocando cartas desde…", contagens e aniversário
- **Busca** em todas as suas cartas (cartas lacradas só entram depois de abertas) e **favoritas**
- **Lembrete gentil**: avisa quando faz tempo que você não escreve para alguém da sua lista
- **Neste dia**: cartas trocadas na mesma data em anos anteriores aparecem na caixa
- **Primeiros passos** para quem acabou de entrar, e **ideias para começar** a escrever no editor
- **Anotações privadas** sobre cada pessoa da lista
- **Assistente "Me ajuda a escrever"**: escolha a relação (amor, melhor amigo, mãe…), a ocasião e o tom (romântico, divertido, poético…), conte com suas palavras o que quer dizer e cole o link da trilha sonora; sai um rascunho com estilo combinando e trechos `[destacados]` para você completar
- **Escrever com IA (opcional)**: com uma chave do Claude em **Conta → Sobre o site**, a IA escreve a carta inteira a partir das suas respostas (se ela falhar, cai no rascunho com frases prontas)
- **8 modelos prontos** para começar (aniversário, saudade, obrigado, "abra quando…", fim de ano, desculpa, bilhete, em branco) e **13 estilos prontos** (papel + envelope + efeito de uma vez)
- **Editor com blocos (como no Notion)**
  - Texto, títulos, citação, listas, lista de desejos, destaque, foto, **galeria** (espalhada, grade ou filme), **foto e texto lado a lado**, **mensagem de voz gravada no navegador**, música do YouTube/Spotify, segredo, divisórias, assinatura e espaçamento
  - **Blocos interativos**: sanfona (abre ao tocar), linha do tempo, **contador** ("juntos há…" / "faltam…", ao vivo), **quiz** (quem recebe responde e você vê a resposta), **vale/cupom** (quem recebe usa e ganha carimbo), poema, lugar, duas colunas e botão com link
  - **Efeitos de texto**: marca-texto em qualquer cor, sublinhado ondulado, brilho, contorno, **degradês** (pôr do sol, oceano, arco-íris) e sombra; **letra diferente em cada trecho**; filtros de foto (P&B, sépia, vintage, sonho…)
  - **Caixa em qualquer bloco**: fundo, borda (linha, tracejada, pontilhada, dupla), cantos, espaço interno, sombra, inclinação e largura; espaçamento de letras e de linhas; texto justificado
  - `/` numa linha vazia abre o menu de blocos; atalhos `#`, `-`, `[]`, `>`, `---`
  - Barra de formatação ao selecionar texto, blocos arrastáveis pela alça
  - **`Ctrl+K`**: busca qualquer ação
  - **Histórico de versões** com prévia e restauração, desfazer/refazer, salvamento automático e contagem de palavras
- **Adesivos livres (como no Canva)**
  - Emojis, rabiscos desenhados à mão (com troca de cor), **formas** (coração, estrela, balão de fala, selo…), fitas washi, bilhetes, desenho livre e imagens próprias
  - **Animações** (flutuar, pulsar, balançar, girar, brilhar, quicar), contorno de figurinha e filtros nas imagens
  - **Caixas de texto livres**: qualquer letra e cor, fundo, negrito, itálico, alinhamento, tamanho e **texto curvo**
  - **Fotos com moldura**: círculo, coração, estrela, arco, mancha, cantos redondos, polaroid ou selo
  - **Desenho** com caneta, marcador, lápis, giz e neon, tamanho e cor livres, borracha e desfazer
  - **Emojis à vontade**: busca em português, recentes e "cole qualquer emoji"
  - **Vários itens de uma vez** (Shift+clique ou toque longo): mover, alinhar, distribuir, duplicar, travar e apagar
  - **Guias de alinhamento que grudam** ao arrastar (segure `Alt` para soltar livre), girar, redimensionar, espelhar, transparência
  - **Travar posição**, menu do botão direito, **painel de camadas** e atalhos (`Ctrl+D`, `[`, `]`, `Ctrl+L`, `Delete`)
- Papel (inclui aquarela, linho, caderno, partitura e degradê), cor, tinta, **24 letras**, bordas e cenário, e **formato**: carta, quadrado, cartão-postal, bilhete ou Story
- **Envelope**: cor, forro, selo de cera, **selo postal ilustrado**, **carimbo com a data de envio** e o texto **"Abra quando…"**
- **Efeito ao abrir**: corações, confete (nas suas cores), pétalas, estrelas, neve ou **chuva com os seus emojis**; selo do envelope com **uma foto sua**
- **Meus modelos**: salve qualquer carta como modelo seu (até 30) e duplique cartas
- Data mínima para abrir, confirmação de leitura, reações e respostas
- **Sua própria imagem como papel** (com véu claro/escuro para o texto aparecer) e **como fundo** (com desfoque e escurecer)
- **Várias páginas** (bloco "Nova página"), **raspadinha** e **texto aparecendo como se estivesse sendo escrito**
- **Figurinhas da internet**: envie ou cole (Ctrl+V) qualquer imagem; se tiver fundo liso, ele é apagado automaticamente
- **Biblioteca pessoal**: tudo o que você enviou fica guardado para usar em outras cartas
- **Trilha sonora**: um link do YouTube ou um arquivo de música seu começa a tocar quando a pessoa abre o envelope; link do Spotify mostra o player para ela tocar
- **Sem spoiler**: antes de abrir, quem recebe não vê o resumo da carta (nem na busca) e, se você quiser, nem o título
- **Aniversários**: avisos no painel dias antes do aniversário de quem está na sua lista

**Recebendo**
- Entram quando quiserem ("lembrar de mim") e veem só as cartas deles; as "abra quando…" ficam numa seção própria
- Dá para instalar o site na tela inicial do celular, como um app
- **Avisos no celular** quando chega carta ou recado (ative em **Conta**; no iPhone, só com o site instalado na tela de início)
- **Modo escuro**: automático (segue o celular) ou escolhido em **Conta**, e opção de **reduzir animações**
- Abertura animada só na primeira leitura (dá para pular tocando na tela); releituras são rápidas

**Seus dados (LGPD)**
- **Baixar todas as minhas cartas**: um ZIP com as cartas, fotos, áudios e recados, que abre em qualquer navegador sem internet
- **Apagar a conta** sozinho(a), escolhendo se as cartas enviadas ficam com quem recebeu
- Páginas de **Privacidade** e **Ajuda**, **sair de todos os aparelhos**, **código de recuperação** para quando esquecer a senha
- Abertura animada: o selo se parte, a aba abre, a carta sai e os blocos aparecem um a um
- Cartas agendadas aparecem lacradas com contagem regressiva (o conteúdo nem chega ao navegador antes da hora)
- Reagem, respondem, ouvem a mensagem de voz e salvam a carta em PDF ou imagem

## Publicar de graça (InfinityFree)

1. Crie uma conta em [infinityfree.com](https://www.infinityfree.com) e crie uma hospedagem com um **subdomínio gratuito** (ex.: `minhascartas.infinityfreeapp.com`).
2. No painel (**Control Panel → MySQL Databases**), crie um banco de dados. Anote **host**, **nome do banco**, **usuário** e **senha**.
3. Envie **todos os arquivos deste repositório** para a pasta `htdocs` (pelo **File Manager** do painel ou por FTP com o FileZilla).
   - Pelo File Manager com o ZIP: **primeiro entre na pasta `htdocs`** (dois cliques nela), e só então use *Upload → Upload ZIP and extract* (ou envie o ZIP e clique com o botão direito → *Extract*). Se você enviar o ZIP na raiz (`/`), aparece o erro *"extract path must be within an htdocs folder"*.
   - Depois de extrair, os arquivos (`index.php`, `app/`, `assets/`…) precisam estar **direto** dentro de `htdocs`, não numa subpasta. O ZIP pode ser apagado.
4. Acesse o seu site. O **instalador** abre sozinho:
   - Passo 1: escolha *MySQL* e preencha os dados do banco
   - Passo 2: crie a sua conta de remetente
5. Pronto! Vá em **Pessoas**, convide quem você quer e escreva a primeira carta.

> Faça a instalação logo depois de subir os arquivos: enquanto ela não é feita, qualquer pessoa que abrir o site vê o instalador.

Requisitos: PHP 8.1 ou mais novo com PDO MySQL, GD e DOM (todas as hospedagens comuns têm).

## Atualizar um site que já está no ar

1. Baixe o ZIP novo, **entre na pasta `htdocs`** no File Manager e extraia o ZIP lá dentro, **substituindo** os arquivos antigos (veja o passo 3 acima).
2. **Não apague** o `config.php` nem a pasta `storage` (é lá que ficam as fotos e os áudios). O ZIP não traz esses arquivos, então substituir tudo é seguro.
3. Abra o site: o banco se atualiza sozinho na primeira visita, sem perder cartas.
   (Se a hospedagem estiver lenta nessa primeira visita, é normal demorar alguns segundos uma única vez.)
4. Envie também o arquivo `app/vendor-anthropic.phar` (3,5 MB): é a biblioteca oficial do Claude usada pela escrita com IA. Para ativar a IA, crie uma chave em [console.anthropic.com](https://console.anthropic.com) e cole em **Conta → Sobre o site** (cada carta custa alguns centavos, cobrados na sua conta da Anthropic). Sem chave, o assistente funciona com frases prontas.
5. Para conferir os avisos no celular, vá em **Conta → Avisos no celular → Mandar um aviso de teste**. Algumas hospedagens gratuitas bloqueiam conexões de saída; se for o caso, o botão mostra o erro e o resto do site continua funcionando normalmente.

## Rodar no seu computador

```bash
php -S localhost:8000 router.php
```

Abra `http://localhost:8000` e, no instalador, escolha **SQLite**: não precisa de MySQL para testar.

## Estrutura

```
index.php        painel do remetente / caixa do amigo
nova.php         escolha do modelo
editor.php       editor de cartas
carta.php        leitura da carta (envelope, música, reações, respostas, favorita)
amigos.php       pessoas: convites, apelidos, aniversários
pessoa.php       página de amizade (linha do tempo com uma pessoa)
convite.php      abre o link de convite ou de senha nova
conta.php        perfil, aparência, avisos, senha, código de recuperação, privacidade, apagar conta
exportar.php     baixar todas as cartas (ZIP que abre sem internet)
recuperar.php    esqueci minha senha (com o código de recuperação)
privacidade.php  como os dados são guardados (LGPD)
ajuda.php        perguntas frequentes
api.php          salvar, enviar, enviar imagem/áudio, versões, reagir, responder, favoritar, avisos
avisos.php       diz ao celular o que chegou quando um aviso é recebido
sw.js            service worker que mostra os avisos
media.php        entrega imagens e áudios só para quem pode ver a carta
manifest.php     permite instalar o site no celular
install.php      instalador
app/             código PHP (banco, login, validação) — bloqueado para o navegador
assets/          CSS e JavaScript
storage/         imagens enviadas (e o banco SQLite, se usado) — bloqueado para o navegador
```

## Segurança

- Senhas com `password_hash`; login com limite de tentativas; "lembrar de mim" com token rotativo
- Proteção CSRF em todos os formulários e chamadas da API
- Todas as consultas usam *prepared statements*
- O conteúdo das cartas passa por uma lista branca no servidor (só formatação de texto é aceita)
- Cada carta e cada arquivo é conferido no servidor: ninguém abre carta, foto ou áudio de outra pessoa mudando o endereço
- Links de convite guardam só o *hash* do código, expiram e funcionam uma única vez
- Os avisos no celular não levam conteúdo: o serviço de push só recebe um "toque" vazio, e o celular pergunta ao próprio site o que chegou
- Limite de tentativas de login por usuário e por aparelho; trocar a senha desconecta os outros aparelhos
- Senhas com no mínimo 8 caracteres; código de recuperação guardado embaralhado, de uso único
- Imagens são recodificadas e conferidas antes de abrir (imagens gigantes são recusadas); cota de 400 MB por pessoa
- Erros técnicos nunca aparecem na tela; se o banco da hospedagem cair por um instante, aparece um aviso amigável
- Depois que o site responde uma vez por HTTPS, todo acesso por http:// passa a ir para https:// automaticamente
- Só dá para enviar carta para quem está na sua lista (conferido no servidor, não só na tela)
- Imagens são recodificadas no envio (remove dados escondidos e reduz o tamanho)
