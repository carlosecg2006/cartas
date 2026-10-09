# 💌 Cartas

Um site para escrever cartas digitais para os amigos. Só você (o remetente) cria as cartas; cada amigo tem o próprio login e vê **apenas** as cartas escritas para ele.

Feito com **PHP + MySQL + HTML + CSS + JavaScript**, sem frameworks e sem instalar nada além de uma hospedagem PHP comum.

## O que dá para fazer

**Você (remetente)**
- Painel com todas as cartas, filtros por amigo e por situação (rascunho, enviada, ainda não lida)
- Cadastro de amigos: o site gera a senha e monta a mensagem pronta para mandar pelo WhatsApp
- **Editor estilo Canva + Notion**
  - Blocos: texto, títulos, citação, listas, lista de desejos, destaque com emoji, foto (polaroid, fita, círculo…), divisórias decoradas, **segredo** (texto escondido até tocar), música do YouTube/Spotify, assinatura e espaçamento
  - Digite `/` numa linha vazia para abrir o menu de blocos; atalhos `#`, `-`, `[]`, `>`, `---`
  - Selecione um texto para negrito, itálico, cor, marca-texto, tamanho e link
  - Arraste os blocos pela alça `⋮⋮` para reorganizar
  - **Adesivos livres**: emojis, fitas washi, bilhetinhos, desenho à mão livre e imagens próprias. Arraste, gire e redimensione
  - Papel (pautado, quadriculado, kraft, antigo, pergaminho…), cor do papel e da tinta, 12 letras (várias manuscritas), bordas e cenário de fundo
  - Envelope personalizável: cor, forro e selo de cera
  - Salvamento automático, desfazer/refazer (`Ctrl+Z`/`Ctrl+Shift+Z`) e prévia de como o amigo vai ver
- Ao terminar, você escolhe **para quem** vai a carta e, se quiser, **a partir de quando** ela pode ser aberta
- Confirmação de leitura (quando abriu e quantas vezes), reações e respostas dos amigos

**Seus amigos**
- Entram quando quiserem (com "lembrar de mim") e veem a caixinha só com as cartas deles, com aviso de carta nova
- Abrem a carta com animação: o selo quebra, o envelope abre e a carta sai
- Cartas agendadas aparecem lacradas com contagem regressiva (o conteúdo nem chega ao navegador antes da hora)
- Reagem com emojis, respondem e podem baixar a carta em PDF ou imagem

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

## Rodar no seu computador

```bash
php -S localhost:8000 router.php
```

Abra `http://localhost:8000` e, no instalador, escolha **SQLite**: não precisa de MySQL para testar.

## Estrutura

```
index.php        painel do remetente / caixinha do amigo
editor.php       editor de cartas
carta.php        leitura da carta (envelope, reações, respostas)
amigos.php       cadastro de amigos
conta.php        trocar senha
api.php          salvar, enviar, enviar imagem, reagir, responder
media.php        entrega as imagens só para quem pode ver a carta
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
- Cada carta e cada imagem é conferida no servidor: um amigo não consegue abrir a carta de outro mudando o número na URL
- Imagens são recodificadas no envio (remove dados escondidos e reduz o tamanho)
