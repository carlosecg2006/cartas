# 💌 Cartas da Alma

Um site para trocar cartas digitais. Cada pessoa tem o próprio login, a própria lista de pessoas e vê **apenas** as cartas que escreveu ou recebeu.

## Como funcionam as pessoas

- Quem instala o site cria a primeira conta. A partir daí, **qualquer pessoa pode criar o acesso de alguém novo** (em **Pessoas**). Quem cria e quem foi criado entram um na lista do outro.
- Você só escreve para quem está na **sua** lista, com o apelido que quiser dar (o apelido é só seu).
- Quem recebe uma carta ganha automaticamente quem escreveu na lista, e pode **responder com outra carta**.
- Ninguém vê cartas de outras pessoas, nem quem instalou o site.

Feito com **PHP + MySQL + HTML + CSS + JavaScript**, sem frameworks e sem instalar nada além de uma hospedagem PHP comum.

## O que dá para fazer

**Escrevendo**
- Painel com todas as cartas desenhadas como envelopes de verdade (com selo e carimbo), filtros por pessoa e por situação
- Cadastro de amigos: o site gera a senha e monta a mensagem pronta para o WhatsApp
- **8 modelos prontos** para começar (aniversário, saudade, obrigado, "abra quando…", fim de ano, desculpa, bilhete, em branco)
- **Editor com blocos (como no Notion)**
  - Texto, títulos, citação, listas, lista de desejos, destaque, foto, **galeria** (espalhada, grade ou filme), **foto e texto lado a lado**, **mensagem de voz gravada no navegador**, música do YouTube/Spotify, segredo, divisórias, assinatura e espaçamento
  - `/` numa linha vazia abre o menu de blocos; atalhos `#`, `-`, `[]`, `>`, `---`
  - Barra de formatação ao selecionar texto, blocos arrastáveis pela alça
  - **`Ctrl+K`**: busca qualquer ação
  - **Histórico de versões** com prévia e restauração, desfazer/refazer, salvamento automático e contagem de palavras
- **Adesivos livres (como no Canva)**
  - Emojis, rabiscos desenhados à mão (com troca de cor), fitas washi, bilhetes, desenho livre e imagens próprias
  - **Guias de alinhamento que grudam** ao arrastar (segure `Alt` para soltar livre), girar, redimensionar, espelhar, transparência
  - **Travar posição**, menu do botão direito, **painel de camadas** e atalhos (`Ctrl+D`, `[`, `]`, `Ctrl+L`, `Delete`)
- Papel, cor, tinta, 12 letras, bordas e cenário
- **Envelope**: cor, forro, selo de cera, **selo postal ilustrado**, **carimbo com a data de envio** e o texto **"Abra quando…"**
- **Efeito ao abrir**: corações, confete, pétalas, estrelas ou neve
- Data mínima para abrir, confirmação de leitura, reações e respostas
- **Sua própria imagem como papel** (com véu claro/escuro para o texto aparecer) e **como fundo** (com desfoque e escurecer)
- **Várias páginas** (bloco "Nova página"), **raspadinha** e **texto aparecendo como se estivesse sendo escrito**
- **Figurinhas da internet**: envie ou cole (Ctrl+V) qualquer imagem; se tiver fundo liso, ele é apagado automaticamente
- **Biblioteca pessoal**: tudo o que você enviou fica guardado para usar em outras cartas
- **Correio lento**: a carta chega só depois de 1 hora, 6 horas, 1 dia ou 3 dias
- **Aniversários**: avisos no painel dias antes do aniversário de quem está na sua lista

**Recebendo**
- Entram quando quiserem ("lembrar de mim") e veem só as cartas deles; as "abra quando…" ficam numa seção própria
- Dá para instalar o site na tela inicial do celular, como um app
- Abertura animada: o selo se parte, a aba abre, a carta sai e os blocos aparecem um a um
- Cartas agendadas aparecem lacradas com contagem regressiva (o conteúdo nem chega ao navegador antes da hora)
- Reagem, respondem, ouvem a mensagem de voz e salvam a carta em PDF ou imagem

## Publicar de graça (InfinityFree)

1. Crie uma conta em [infinityfree.com](https://www.infinityfree.com) e crie uma hospedagem com um **subdomínio gratuito** (ex.: `minhascartas.infinityfreeapp.com`).
2. No painel (**Control Panel → MySQL Databases**), crie um banco de dados. Anote **host**, **nome do banco**, **usuário** e **senha**.
3. Envie **todos os arquivos deste repositório** para a pasta `htdocs` (pelo **File Manager** do painel ou por FTP com o FileZilla).
4. Acesse o seu site. O **instalador** abre sozinho:
   - Passo 1: escolha *MySQL* e preencha os dados do banco
   - Passo 2: crie a sua conta de remetente
5. Pronto! Vá em **Amigos**, adicione as pessoas e escreva a primeira carta.

> Faça a instalação logo depois de subir os arquivos: enquanto ela não é feita, qualquer pessoa que abrir o site vê o instalador.

Requisitos: PHP 8.1 ou mais novo com PDO MySQL, GD e DOM (todas as hospedagens comuns têm).

## Atualizar um site que já está no ar

1. Baixe o ZIP novo e envie os arquivos para `htdocs`, **substituindo** os antigos.
2. **Não apague** o `config.php` nem a pasta `storage` (é lá que ficam as fotos e os áudios). O ZIP não traz esses arquivos, então substituir tudo é seguro.
3. Abra o site: o banco se atualiza sozinho na primeira visita, sem perder cartas.

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
carta.php        leitura da carta (envelope, reações, respostas)
amigos.php       pessoas: criar acessos, apelidos, aniversários
conta.php        perfil, aniversário e senha
api.php          salvar, enviar, enviar imagem/áudio, versões, reagir, responder
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
- Só dá para enviar carta para quem está na sua lista (conferido no servidor, não só na tela)
- Imagens são recodificadas no envio (remove dados escondidos e reduz o tamanho)
