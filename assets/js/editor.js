/*
 * Editor de cartas: blocos estilo Notion + adesivos livres estilo Canva.
 * O estado (state.content) é a fonte da verdade; o DOM é reconstruído a partir dele
 * nas mudanças estruturais e lido de volta enquanto você digita.
 */
(function () {
  'use strict';

  const L = window.Letter;
  const DATA = JSON.parse(document.getElementById('editor-data').textContent);
  const letterId = DATA.letter.id;
  const state = { title: DATA.letter.title, content: DATA.letter.content };
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const blocks = () => state.content.blocks;
  const stickers = () => state.content.stickers;

  document.execCommand('styleWithCSS', false, true);

  // ---------------------------------------------------------------- tipos de bloco

  const BLOCKS = [
    { key: 'paragraph', icon: 'type', label: 'Texto', desc: 'Um parágrafo simples', words: 'texto paragrafo', make: () => ({ type: 'paragraph', html: '' }) },
    { key: 'h1', icon: 'h1', label: 'Título', desc: 'Título grande', words: 'titulo heading h1', make: () => ({ type: 'heading', level: 1, html: '' }) },
    { key: 'h2', icon: 'h2', label: 'Subtítulo', desc: 'Título médio', words: 'subtitulo h2', make: () => ({ type: 'heading', level: 2, html: '' }) },
    { key: 'h3', icon: 'h3', label: 'Título pequeno', desc: 'Para separar partes', words: 'titulo pequeno h3', make: () => ({ type: 'heading', level: 3, html: '' }) },
    { key: 'quote', icon: 'quote', label: 'Citação', desc: 'Uma frase em destaque', words: 'citacao quote frase', make: () => ({ type: 'quote', html: '' }) },
    { key: 'list', icon: 'list', label: 'Lista', desc: 'Lista com marcadores', words: 'lista bullet marcadores', make: () => ({ type: 'list', style: 'bullet', items: [''] }) },
    { key: 'numbered', icon: 'list-ordered', label: 'Lista numerada', desc: 'Lista com números', words: 'lista numerada numeros', make: () => ({ type: 'list', style: 'number', items: [''] }) },
    { key: 'checklist', icon: 'list-check', label: 'Lista de desejos', desc: 'Coisas para fazermos juntos', words: 'checklist tarefas desejos', make: () => ({ type: 'checklist', items: [{ checked: false, html: '' }] }) },
    { key: 'callout', icon: 'sparkle', label: 'Destaque', desc: 'Caixinha colorida com emoji', words: 'destaque callout caixa', make: () => ({ type: 'callout', emoji: '💌', bg: '#fde8e4', html: '' }) },
    { key: 'image', icon: 'image', label: 'Foto', desc: 'Polaroid, moldura ou simples', words: 'foto imagem image polaroid', make: () => ({ type: 'image', src: '', caption: '', frame: 'polaroid', width: 'md', tilt: -2 }) },
    { key: 'gallery', icon: 'images', label: 'Galeria', desc: 'Várias fotos: espalhadas, grade ou filme', words: 'galeria fotos varias album', make: () => ({ type: 'gallery', layout: 'scatter', items: [] }) },
    { key: 'phototext', icon: 'photo-text', label: 'Foto e texto', desc: 'Foto de um lado, texto do outro', words: 'foto texto lado colunas', make: () => ({ type: 'phototext', src: '', side: 'left', frame: 'polaroid', html: '' }) },
    { key: 'audio', icon: 'mic', label: 'Mensagem de voz', desc: 'Grave sua voz ou envie um áudio', words: 'audio voz gravar mensagem microfone', make: () => ({ type: 'audio', src: '', label: '', duration: 0, peaks: [] }) },
    { key: 'music', icon: 'music', label: 'Música', desc: 'YouTube ou Spotify', words: 'musica youtube spotify som', make: () => ({ type: 'music', provider: '', kind: '', mid: '' }) },
    { key: 'secret', icon: 'eye-off', label: 'Segredo', desc: 'Texto escondido até tocar', words: 'segredo secreto surpresa', make: () => ({ type: 'secret', label: 'Toque para revelar um segredo', html: '' }) },
    { key: 'scratch', icon: 'eraser', label: 'Raspadinha', desc: 'A pessoa raspa para revelar', words: 'raspadinha raspar surpresa revelar', make: () => ({ type: 'scratch', label: 'Raspe aqui', html: '', src: '', cover: 'silver' }) },
    { key: 'pagebreak', icon: 'copy', label: 'Nova página', desc: 'A carta continua na próxima folha', words: 'pagina quebra folha virar', make: () => ({ type: 'pagebreak' }) },
    { key: 'divider', icon: 'minus', label: 'Divisória', desc: 'Separador decorado', words: 'divisoria separador linha', make: () => ({ type: 'divider', style: 'hearts' }) },
    { key: 'signature', icon: 'signature', label: 'Assinatura', desc: 'Despedida com seu nome', words: 'assinatura despedida nome', make: () => ({ type: 'signature', closing: 'Com carinho,', name: DATA.sender, date: DATA.today }) },
    { key: 'spacer', icon: 'move-v', label: 'Espaço', desc: 'Um respiro entre blocos', words: 'espaco espacamento', make: () => ({ type: 'spacer', height: 40 }) },
  ];
  const TEXT_TYPES = ['paragraph', 'heading', 'quote'];
  const CONVERTIBLE = ['paragraph', 'heading', 'quote', 'list', 'checklist', 'callout'];

  function newBlock(key) {
    const def = BLOCKS.find((b) => b.key === key) || BLOCKS[0];
    return Object.assign({ id: L.uid(), align: 'left', font: '', size: '', color: '' }, def.make());
  }

  function blockKey(b) {
    if (b.type === 'heading') return 'h' + (b.level || 1);
    if (b.type === 'list') return b.style === 'number' ? 'numbered' : 'list';
    return b.type;
  }

  function blockText(b) {
    if (typeof b.html === 'string') return b.html;
    if (Array.isArray(b.items)) {
      return b.items.map((i) => (typeof i === 'string' ? i : i.html)).filter(Boolean).join('<br>');
    }
    return '';
  }

  function convertBlock(b, key) {
    const nb = newBlock(key);
    const text = blockText(b);
    Object.assign(nb, { id: b.id, align: b.align, font: b.font, size: b.size, color: b.color });
    if ('html' in nb) nb.html = text;
    if (nb.type === 'list') nb.items = text ? text.split('<br>') : [''];
    if (nb.type === 'checklist') nb.items = (text ? text.split('<br>') : ['']).map((h) => ({ checked: false, html: h }));
    return nb;
  }

  const findBlock = (id) => blocks().find((b) => b.id === id);
  const blockIndex = (id) => blocks().findIndex((b) => b.id === id);
  const blockNode = (id) => inner.querySelector(':scope > .eb[data-id="' + id + '"]');

  // ---------------------------------------------------------------- estrutura da tela

  const canvas = $('[data-canvas]');
  const scene = L.el('div', 'letter-scene editing');
  const paper = L.el('div', 'paper');
  const inner = L.el('div', 'paper-inner');
  const layer = L.el('div', 'sticker-layer');
  paper.append(inner, layer);
  scene.appendChild(paper);
  canvas.appendChild(scene);

  const titleInput = $('[data-title]');
  titleInput.value = state.title;
  titleInput.addEventListener('input', () => {
    state.title = titleInput.value;
    typed();
  });

  function paperOpts() {
    return state.content.paper;
  }

  function renderAll(focus) {
    L.applyPaper(scene, paper, paperOpts());
    renderBlocks();
    renderStickers();
    if (focus) focusBlock(focus.id, focus.where);
  }

  function renderBlocks() {
    inner.replaceChildren(...blocks().map(buildBlock));
    if (!blocks().length) {
      const empty = L.el('button', 'eb-empty', { type: 'button', text: 'Clique para começar a escrever' });
      empty.addEventListener('click', () => {
        const b = newBlock('paragraph');
        blocks().push(b);
        renderBlocks();
        focusBlock(b.id, 'start');
        commit();
      });
      inner.appendChild(empty);
    }
    layout();
  }

  function rerenderBlock(b, focusWhere) {
    const old = blockNode(b.id);
    const node = buildBlock(b);
    if (old) old.replaceWith(node);
    layout();
    if (focusWhere) focusBlock(b.id, focusWhere);
    return node;
  }

  let layoutQueued = false;
  function layout() {
    if (layoutQueued) return;
    layoutQueued = true;
    requestAnimationFrame(() => {
      layoutQueued = false;
      L.layoutStickers(paper, stickers());
      positionStickerBar();
      $$('.pagebreak-label', inner).forEach((n, i) => { n.textContent = 'Página ' + (i + 2); });
    });
  }
  new ResizeObserver(layout).observe(inner);
  window.addEventListener('resize', layout);
  if (document.fonts) document.fonts.ready.then(layout);

  // ---------------------------------------------------------------- construção dos blocos

  function buildBlock(b) {
    const wrap = L.el('div', 'eb');
    L.applyBlockStyle(wrap, b, paperOpts());
    wrap.tabIndex = -1;

    const gutter = L.el('div', 'eb-gutter', { contenteditable: 'false' });
    const add = L.el('button', 'eb-add', { type: 'button', title: 'Adicionar bloco abaixo' });
    add.appendChild(L.icon('plus'));
    const handle = L.el('button', 'eb-handle', { type: 'button', title: 'Arraste para mover · clique para opções' });
    handle.appendChild(L.icon('grip'));
    gutter.append(add, handle);
    add.addEventListener('click', () => openInsertMenu(add, b.id));
    setupHandle(handle, b);

    const body = L.el('div', 'eb-body');
    (BUILDERS[b.type] || (() => {}))(body, b, wrap);
    wrap.append(gutter, body);
    wrap.addEventListener('focusin', () => { lastFocusedId = b.id; });
    wrap.addEventListener('keydown', (e) => navKeydown(e, b));
    return wrap;
  }

  function editable(tag, cls, html, placeholder, onChange) {
    const node = L.el(tag, cls, { contenteditable: 'true', 'data-placeholder': placeholder, 'data-rich': '1', spellcheck: 'true' });
    node.innerHTML = html || '';
    node.addEventListener('input', () => {
      onChange(node);
      updateEmpty(node);
      typed();
    });
    node.addEventListener('paste', pastePlain);
    updateEmpty(node);
    return node;
  }

  function plainEditable(tag, cls, text, placeholder, onChange) {
    const node = L.el(tag, cls, { contenteditable: 'plaintext-only', 'data-placeholder': placeholder, spellcheck: 'true' });
    if (node.contentEditable !== 'plaintext-only') node.contentEditable = 'true';
    node.textContent = text || '';
    node.addEventListener('input', () => {
      onChange(node.textContent.replace(/\n/g, ' '));
      updateEmpty(node);
      typed();
    });
    node.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault();
    });
    node.addEventListener('paste', pastePlain);
    updateEmpty(node);
    return node;
  }

  function updateEmpty(node) {
    node.classList.toggle('is-empty', node.textContent.trim() === '' && !node.querySelector('img'));
  }

  function pastePlain(e) {
    const files = Array.from(e.clipboardData?.files || []).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      e.preventDefault();
      const host = e.currentTarget.closest('.eb');
      insertImageFromFile(files[0], host ? host.dataset.id : null);
      return;
    }
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  const BUILDERS = {
    heading(body, b) {
      const node = editable('h' + (b.level || 1), 'lb-text', b.html, 'Título', (n) => { b.html = n.innerHTML; });
      textBehavior(node, b);
      body.appendChild(node);
    },
    paragraph(body, b) {
      const node = editable('p', 'lb-text', b.html, 'Escreva aqui… ou digite / para inserir blocos', (n) => {
        b.html = n.innerHTML;
        markdownShortcut(n, b);
      });
      textBehavior(node, b);
      body.appendChild(node);
    },
    quote(body, b) {
      const node = editable('blockquote', 'lb-text', b.html, 'Uma frase especial…', (n) => { b.html = n.innerHTML; });
      textBehavior(node, b);
      body.appendChild(node);
    },
    list(body, b) {
      const list = L.el(b.style === 'number' ? 'ol' : 'ul', 'lb-list', { contenteditable: 'true', 'data-rich': '1' });
      (b.items.length ? b.items : ['']).forEach((h) => list.appendChild(L.el('li', '', { html: h || '<br>' })));
      const sync = () => {
        if (!list.querySelector('li')) list.innerHTML = '<li><br></li>';
        b.items = $$('li', list).map((li) => cleanTrailingBr(li.innerHTML));
      };
      list.addEventListener('input', () => { sync(); typed(); });
      list.addEventListener('paste', pastePlain);
      list.addEventListener('keydown', (e) => {
        const li = closestLi(list);
        if (e.key === 'Enter' && !e.shiftKey && li && li.textContent.trim() === '' && !li.nextElementSibling) {
          // Enter em item vazio no fim: sai da lista
          e.preventDefault();
          li.remove();
          sync();
          exitToParagraph(b);
        } else if (e.key === 'Backspace' && li && li.textContent.trim() === '' && list.children.length === 1) {
          e.preventDefault();
          replaceBlock(b, convertBlock(b, 'paragraph'), 'start');
        }
      });
      body.appendChild(list);
    },
    checklist(body, b) {
      const list = L.el('ul', 'lb-checklist');
      b.items.forEach((item, i) => {
        const li = L.el('li', item.checked ? 'checked' : '');
        const box = L.el('button', 'check-box', { type: 'button', contenteditable: 'false', text: item.checked ? '✓' : '', 'aria-label': 'Marcar' });
        box.addEventListener('click', () => {
          item.checked = !item.checked;
          li.classList.toggle('checked', item.checked);
          box.textContent = item.checked ? '✓' : '';
          commit();
        });
        const text = editable('span', 'check-text', item.html, 'Algo para fazermos juntos', (n) => { item.html = n.innerHTML; });
        text.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (text.textContent.trim() === '' && i === b.items.length - 1) {
              b.items.splice(i, 1);
              if (!b.items.length) return replaceBlock(b, convertBlock(b, 'paragraph'), 'start');
              rerenderBlock(b);
              exitToParagraph(b);
              return;
            }
            const rest = splitAtCaret(text);
            item.html = text.innerHTML;
            b.items.splice(i + 1, 0, { checked: false, html: rest });
            rerenderBlock(b);
            focusEditable($$('.check-text', blockNode(b.id))[i + 1], 'start');
            commit();
          } else if (e.key === 'Backspace' && caretAtStart(text) && text.textContent === '') {
            e.preventDefault();
            if (b.items.length === 1) return replaceBlock(b, convertBlock(b, 'paragraph'), 'start');
            b.items.splice(i, 1);
            rerenderBlock(b);
            focusEditable($$('.check-text', blockNode(b.id))[Math.max(0, i - 1)], 'end');
            commit();
          }
        });
        li.append(box, text);
        list.appendChild(li);
      });
      body.appendChild(list);
    },
    callout(body, b) {
      const box = L.el('div', 'callout');
      box.style.setProperty('--callout', b.bg);
      const icon = L.el('button', 'callout-icon', { type: 'button', contenteditable: 'false', text: b.emoji, title: 'Trocar emoji' });
      icon.addEventListener('click', () => openEmojiPicker(icon, (emoji) => {
        b.emoji = emoji;
        icon.textContent = emoji;
        commit();
      }));
      const text = editable('div', 'lb-text', b.html, 'Escreva algo em destaque…', (n) => { b.html = n.innerHTML; });
      textBehavior(text, b);
      box.append(icon, text);
      body.appendChild(box);
    },
    image(body, b) {
      const fig = L.renderImageFigure(Object.assign({}, b, { caption: '' }));
      fig.querySelector('figcaption')?.remove();
      if (!b.src) {
        fig.replaceChildren();
        const pick = L.el('button', 'img-upload', { type: 'button' });
        pick.innerHTML = '<span>Escolher foto</span><small>ou arraste uma imagem aqui</small>';
        pick.prepend(L.icon('image', 'ic-lg'));
        pick.addEventListener('click', async () => {
          const file = await pickFile();
          if (file) setBlockImage(b, file);
        });
        fig.appendChild(pick);
      } else {
        const img = fig.querySelector('img');
        if (img) img.addEventListener('load', layout);
      }
      fig.addEventListener('dragover', (e) => { e.preventDefault(); fig.classList.add('drop-hover'); });
      fig.addEventListener('dragleave', () => fig.classList.remove('drop-hover'));
      fig.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        fig.classList.remove('drop-hover');
        const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
        if (file) setBlockImage(b, file);
      });
      if (b.src || b.frame === 'polaroid') {
        const cap = plainEditable('figcaption', '', b.caption, b.frame === 'polaroid' ? 'Legenda…' : 'Legenda (opcional)', (t) => { b.caption = t; });
        fig.appendChild(cap);
      }
      body.appendChild(fig);
    },
    divider(body, b) {
      const div = L.renderDivider(b);
      div.title = 'Clique para trocar o estilo';
      div.addEventListener('click', () => {
        const styles = Object.keys(L.DIVIDERS);
        b.style = styles[(styles.indexOf(b.style) + 1) % styles.length];
        rerenderBlock(b);
        commit();
      });
      body.appendChild(div);
    },
    secret(body, b) {
      const box = L.el('div', 'secret editing');
      const label = plainEditable('div', 'secret-label', b.label, 'Texto do botão', (t) => { b.label = t; });
      const head = L.el('div', 'secret-head');
      const lock = L.el('span', 'secret-lock');
      lock.appendChild(L.icon('eye-off', 'ic-sm'));
      head.append(lock, label);
      const text = editable('div', 'secret-content lb-text', b.html, 'O segredo… (só aparece quando tocarem)', (n) => { b.html = n.innerHTML; });
      textBehavior(text, b);
      box.append(head, text);
      body.appendChild(box);
    },
    music(body, b) {
      if (b.provider && b.mid) {
        const embed = L.musicEmbed(b);
        const wrap = L.el('div', 'music-edit');
        wrap.appendChild(embed);
        const change = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Trocar música' });
        change.addEventListener('click', () => {
          b.provider = '';
          b.mid = '';
          rerenderBlock(b);
          commit();
          $('input', blockNode(b.id))?.focus();
        });
        wrap.appendChild(change);
        body.appendChild(wrap);
        return;
      }
      const form = L.el('form', 'music-form');
      form.appendChild(L.icon('music', 'music-icon'));
      const input = L.el('input', '', { type: 'url', placeholder: 'Cole o link do YouTube ou Spotify', 'aria-label': 'Link da música' });
      const btn = L.el('button', 'btn btn-sm btn-primary', { type: 'submit', text: 'Adicionar' });
      form.append(input, btn);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const parsed = L.parseMusicUrl(input.value);
        if (!parsed) {
          toast('Não reconheci esse link. Use um link do YouTube ou do Spotify.', 'error');
          return;
        }
        Object.assign(b, parsed);
        rerenderBlock(b);
        commit();
      });
      body.appendChild(form);
    },
    signature(body, b) {
      const wrap = L.el('div', 'signature');
      wrap.append(
        plainEditable('p', 'sig-closing', b.closing, 'Com carinho,', (t) => { b.closing = t; }),
        plainEditable('p', 'sig-name', b.name, 'Seu nome', (t) => { b.name = t; }),
        plainEditable('p', 'sig-date', b.date, 'Data (opcional)', (t) => { b.date = t; }),
      );
      body.appendChild(wrap);
    },
    gallery(body, b) {
      const gal = L.renderGallery(b);
      Array.from(gal.children).forEach((fig, i) => {
        const del = L.el('button', 'gal-del', { type: 'button', title: 'Tirar foto', contenteditable: 'false' });
        del.appendChild(L.icon('x', 'ic-sm'));
        del.addEventListener('click', () => {
          b.items.splice(i, 1);
          rerenderBlock(b);
          commit();
        });
        fig.appendChild(del);
        const cap = fig.querySelector('figcaption');
        if (cap) {
          const ed = plainEditable('figcaption', '', b.items[i].caption, 'Legenda', (t) => { b.items[i].caption = t; });
          cap.replaceWith(ed);
        }
      });
      const add = L.el('button', 'gal-add', { type: 'button' });
      add.append(L.icon('plus'), L.el('span', '', { text: b.items.length ? 'Mais fotos' : 'Escolher fotos' }));
      add.addEventListener('click', async () => {
        const files = await pickFile(true);
        if (files.length) addGalleryFiles(b, files);
      });
      gal.appendChild(add);
      gal.addEventListener('dragover', (e) => { e.preventDefault(); gal.classList.add('drop-hover'); });
      gal.addEventListener('dragleave', () => gal.classList.remove('drop-hover'));
      gal.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        gal.classList.remove('drop-hover');
        const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
        if (files.length) addGalleryFiles(b, files);
      });
      gal.querySelectorAll('img').forEach((img) => img.addEventListener('load', layout));
      body.appendChild(gal);
    },
    phototext(body, b) {
      const row = L.el('div', 'phototext side-' + b.side);
      let fig;
      if (b.src) {
        fig = L.renderImageFigure({ src: b.src, frame: b.frame, width: 'lg', tilt: b.side === 'right' ? 2 : -2 });
        fig.querySelector('figcaption')?.remove();
        fig.querySelector('img')?.addEventListener('load', layout);
      } else {
        fig = L.el('figure', 'lb-figure frame-plain w-lg');
        const pick = L.el('button', 'img-upload', { type: 'button' });
        pick.append(L.icon('image', 'ic-lg'), L.el('span', '', { text: 'Foto' }));
        pick.addEventListener('click', async () => {
          const file = await pickFile();
          if (file) setBlockImage(b, file);
        });
        fig.appendChild(pick);
      }
      const text = editable('div', 'phototext-text lb-text', b.html, 'Conte a história dessa foto…', (n) => { b.html = n.innerHTML; });
      textBehavior(text, b);
      row.append(fig, text);
      body.appendChild(row);
    },
    pagebreak(body) {
      const sep = L.el('div', 'pagebreak-mark', { contenteditable: 'false' });
      sep.append(L.el('span', 'pagebreak-label', { text: 'Nova página' }));
      body.appendChild(sep);
    },
    scratch(body, b) {
      const box = L.el('div', 'scratch-edit');
      const head = L.el('div', 'scratch-head');
      head.appendChild(L.icon('eraser', 'ic-sm'));
      head.appendChild(plainEditable('span', 'scratch-label', b.label, 'Raspe aqui', (t) => { b.label = t; }));
      head.appendChild(L.el('span', 'scratch-hint', { text: 'quem recebe raspa para ver' }));
      box.appendChild(head);
      if (b.src) {
        const img = L.el('img', 'scratch-img', { src: L.mediaUrl(b.src), alt: '' });
        img.addEventListener('load', layout);
        box.appendChild(img);
      }
      const text = editable('div', 'lb-text scratch-text', b.html, 'A surpresa escondida…', (n) => { b.html = n.innerHTML; });
      textBehavior(text, b);
      box.appendChild(text);
      body.appendChild(box);
    },
    audio(body, b) {
      if (b.src) {
        const wrap = L.el('div', 'audio-edit');
        wrap.appendChild(L.renderAudio(b));
        const label = plainEditable('div', 'audio-label', b.label, 'Mensagem de voz', (t) => { b.label = t; });
        wrap.appendChild(label);
        body.appendChild(wrap);
        return;
      }
      body.appendChild(buildRecorder(b));
    },
    spacer(body, b, wrap) {
      wrap.style.height = b.height + 'px';
      const grip = L.el('div', 'spacer-grip', { title: 'Arraste para ajustar o espaço' });
      grip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        grip.setPointerCapture(e.pointerId);
        const startY = e.clientY;
        const startH = b.height;
        const move = (ev) => {
          b.height = Math.max(8, Math.min(240, Math.round(startH + ev.clientY - startY)));
          wrap.style.height = b.height + 'px';
          layout();
        };
        const up = () => {
          grip.removeEventListener('pointermove', move);
          grip.removeEventListener('pointerup', up);
          commit();
        };
        grip.addEventListener('pointermove', move);
        grip.addEventListener('pointerup', up);
      });
      body.appendChild(grip);
    },
  };

  function cleanTrailingBr(html) {
    return html.replace(/(<br\s*\/?>)+$/i, '');
  }

  function closestLi(root) {
    const sel = getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.anchorNode;
    while (node && node !== root) {
      if (node.nodeName === 'LI') return node;
      node = node.parentNode;
    }
    return null;
  }

  // ---------------------------------------------------------------- comportamento de texto

  function textBehavior(node, b) {
    node.addEventListener('keydown', (e) => {
      if (slash.open && slash.blockId === b.id && slashKeydown(e)) return;
      if (e.isComposing) return;

      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const rest = splitAtCaret(node);
        node.dispatchEvent(new Event('input'));
        const nb = newBlock('paragraph');
        nb.html = rest;
        if (b.type === 'paragraph') {
          Object.assign(nb, { align: b.align, font: b.font, size: b.size, color: b.color });
        }
        insertBlockAfter(nb, b.id);
        focusBlock(nb.id, 'start');
        commit();
        return;
      }

      if (e.key === 'Backspace' && caretAtStart(node) && getSelection().isCollapsed) {
        if (b.type !== 'paragraph') {
          e.preventDefault();
          replaceBlock(b, convertBlock(b, 'paragraph'), 'start');
          return;
        }
        const idx = blockIndex(b.id);
        const prev = blocks()[idx - 1];
        if (node.textContent === '' && !node.querySelector('img')) {
          e.preventDefault();
          removeBlock(b.id);
          if (prev) focusBlock(prev.id, 'end');
          commit();
        } else if (prev && TEXT_TYPES.includes(prev.type)) {
          e.preventDefault();
          const prevNode = $('[data-rich]', blockNode(prev.id));
          prevNode.innerHTML = cleanTrailingBr(prevNode.innerHTML) + '<span data-caret></span>' + node.innerHTML;
          const marker = $('[data-caret]', prevNode);
          const range = document.createRange();
          range.setStartBefore(marker);
          range.collapse(true);
          marker.remove();
          prevNode.focus();
          const sel = getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          prev.html = prevNode.innerHTML;
          updateEmpty(prevNode);
          removeBlock(b.id);
          commit();
        }
      }
    });

    node.addEventListener('input', () => slashCheck(node, b));
    node.addEventListener('blur', () => setTimeout(() => {
      if (slash.open && slash.blockId === b.id && !slash.menu.contains(document.activeElement)) closeSlash();
    }, 150));
  }

  /** Setas para cima/baixo atravessam blocos, como no Notion. */
  function navKeydown(e, b) {
    const idx = blockIndex(b.id);
    // Bloco sem texto (foto, divisória…) selecionado com o teclado
    if (e.target === blockNode(b.id)) {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const other = blocks()[idx + (e.key === 'ArrowUp' ? -1 : 1)];
        if (other) {
          e.preventDefault();
          focusBlock(other.id, e.key === 'ArrowUp' ? 'end' : 'start');
        }
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        const neighbor = blocks()[idx - 1] || blocks()[idx + 1];
        removeBlock(b.id);
        if (neighbor) focusBlock(neighbor.id, 'end');
        commit();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertNewBlock('paragraph', b.id);
      }
      return;
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    if (slash.open || e.shiftKey) return;
    const target = e.target;
    if (!target.isContentEditable) return;
    const wrap = blockNode(b.id);
    const eds = editablesIn(wrap);
    const pos = eds.indexOf(target.closest('[contenteditable="true"], [contenteditable="plaintext-only"]'));
    if (e.key === 'ArrowUp' && pos <= 0 && isOnFirstLine(target)) {
      const prev = blocks()[blockIndex(b.id) - 1];
      if (prev) {
        e.preventDefault();
        focusBlock(prev.id, 'end');
      }
    } else if (e.key === 'ArrowDown' && pos === eds.length - 1 && isOnLastLine(target)) {
      const next = blocks()[blockIndex(b.id) + 1];
      if (next) {
        e.preventDefault();
        focusBlock(next.id, 'start');
      }
    }
  }

  function markdownShortcut(node, b) {
    const text = node.textContent.replace(/ /g, ' ');
    const rules = [
      [/^### $/, 'h3'], [/^## $/, 'h2'], [/^# $/, 'h1'], [/^> $/, 'quote'],
      [/^[-*] $/, 'list'], [/^1[.)] $/, 'numbered'], [/^\[ ?\] $/, 'checklist'],
    ];
    for (const [re, key] of rules) {
      if (re.test(text)) {
        const nb = convertBlock(Object.assign({}, b, { html: '' }), key);
        replaceBlock(b, nb, 'start');
        return;
      }
    }
    if (text === '---') {
      const nb = newBlock('divider');
      nb.id = b.id;
      replaceBlock(b, nb);
      const p = newBlock('paragraph');
      insertBlockAfter(p, nb.id);
      focusBlock(p.id, 'start');
      commit();
    }
  }

  function exitToParagraph(b) {
    const p = newBlock('paragraph');
    insertBlockAfter(p, b.id);
    focusBlock(p.id, 'start');
    commit();
  }

  // ---------------------------------------------------------------- operações de blocos

  function insertBlockAfter(nb, afterId) {
    const idx = afterId ? blockIndex(afterId) : blocks().length - 1;
    blocks().splice(idx + 1, 0, nb);
    const node = buildBlock(nb);
    const ref = afterId ? blockNode(afterId) : null;
    $('.eb-empty', inner)?.remove();
    if (ref) ref.after(node);
    else inner.appendChild(node);
    layout();
    return node;
  }

  function replaceBlock(oldB, nb, focusWhere) {
    const idx = blockIndex(oldB.id);
    if (idx < 0) return;
    blocks()[idx] = nb;
    const old = blockNode(oldB.id);
    const node = buildBlock(nb);
    old.replaceWith(node);
    layout();
    if (focusWhere) focusBlock(nb.id, focusWhere);
    commit();
  }

  function removeBlock(id) {
    const idx = blockIndex(id);
    if (idx < 0) return;
    const node = blockNode(id);
    // Adesivos presos a este bloco passam para o bloco anterior, sem sair do lugar
    const prev = blocks()[idx - 1];
    const width = paper.getBoundingClientRect().width || 1;
    const top = L.anchorTop(paper, id);
    const prevTop = prev ? L.anchorTop(paper, prev.id) : 0;
    stickers().forEach((s) => {
      if (s.anchor === id) {
        s.anchor = prev ? prev.id : '';
        s.y += ((top - prevTop) / width) * 100;
      }
    });
    blocks().splice(idx, 1);
    node?.remove();
    if (!blocks().length) renderBlocks();
    layout();
  }

  function moveBlock(id, delta) {
    const idx = blockIndex(id);
    const to = idx + delta;
    if (idx < 0 || to < 0 || to >= blocks().length) return;
    const [b] = blocks().splice(idx, 1);
    blocks().splice(to, 0, b);
    renderBlocks();
    commit();
  }

  function duplicateBlock(b) {
    const copy = JSON.parse(JSON.stringify(b));
    copy.id = L.uid();
    insertBlockAfter(copy, b.id);
    commit();
  }

  function insertNewBlock(key, afterId) {
    const nb = newBlock(key);
    insertBlockAfter(nb, afterId);
    focusBlock(nb.id, 'start');
    commit();
    afterInsert(nb);
    return nb;
  }

  function afterInsert(nb) {
    if (nb.type === 'image') {
      pickFile().then((file) => { if (file) setBlockImage(nb, file); });
    } else if (nb.type === 'gallery') {
      pickFile(true).then((files) => { if (files.length) addGalleryFiles(nb, files); });
    } else if (nb.type === 'music') {
      $('input', blockNode(nb.id))?.focus();
    } else if (nb.type === 'secret') {
      focusEditable($('.secret-content', blockNode(nb.id)), 'start');
    } else if (nb.type === 'scratch') {
      focusEditable($('.scratch-text', blockNode(nb.id)), 'start');
    }
  }

  // ---------------------------------------------------------------- cursor

  function editablesIn(root) {
    return $$('[contenteditable="true"], [contenteditable="plaintext-only"]', root)
      .filter((n) => !n.parentElement.closest('[contenteditable="true"], [contenteditable="plaintext-only"]'));
  }

  function focusBlock(id, where) {
    const wrap = blockNode(id);
    if (!wrap) return;
    const eds = editablesIn(wrap);
    if (!eds.length) {
      wrap.focus({ preventScroll: false });
      return;
    }
    focusEditable(where === 'end' ? eds[eds.length - 1] : eds[0], where);
  }

  function focusEditable(node, where) {
    if (!node) return;
    node.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(where !== 'end');
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    const rect = node.getBoundingClientRect();
    if (rect.top < 70 || rect.bottom > window.innerHeight - 20) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function caretAtStart(node) {
    const sel = getSelection();
    if (!sel.rangeCount) return false;
    const range = sel.getRangeAt(0);
    const pre = document.createRange();
    pre.selectNodeContents(node);
    try {
      pre.setEnd(range.startContainer, range.startOffset);
    } catch (e) {
      return false;
    }
    return pre.toString().length === 0 && !pre.cloneContents().querySelector('br, img');
  }

  function splitAtCaret(node) {
    const sel = getSelection();
    if (!sel.rangeCount) return '';
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const after = document.createRange();
    after.selectNodeContents(node);
    after.setStart(range.endContainer, range.endOffset);
    const frag = after.extractContents();
    const tmp = document.createElement('div');
    tmp.appendChild(frag);
    node.innerHTML = cleanTrailingBr(node.innerHTML);
    updateEmpty(node);
    const html = cleanTrailingBr(tmp.innerHTML);
    return tmp.textContent === '' && !tmp.querySelector('img') ? '' : html;
  }

  function caretRect() {
    const sel = getSelection();
    if (!sel.rangeCount) return null;
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rects = range.getClientRects();
    return rects.length ? rects[0] : null;
  }

  function isOnFirstLine(node) {
    const r = caretRect();
    if (!r) return true;
    const lh = parseFloat(getComputedStyle(node).lineHeight) || 24;
    return r.top - node.getBoundingClientRect().top < lh * 0.9;
  }

  function isOnLastLine(node) {
    const r = caretRect();
    if (!r) return true;
    const lh = parseFloat(getComputedStyle(node).lineHeight) || 24;
    return node.getBoundingClientRect().bottom - r.bottom < lh * 0.9;
  }

  // ---------------------------------------------------------------- popovers e menus

  let popover = null;
  function openPopover(anchor, content, opts) {
    closePopover();
    opts = opts || {};
    popover = L.el('div', 'popover ' + (opts.className || ''));
    popover.appendChild(content);
    document.body.appendChild(popover);
    const rect = anchor.getBoundingClientRect();
    const pw = popover.offsetWidth;
    const ph = popover.offsetHeight;
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 6;
    if (left + pw > window.scrollX + document.documentElement.clientWidth - 8) {
      left = window.scrollX + document.documentElement.clientWidth - pw - 8;
    }
    if (rect.bottom + ph + 12 > window.innerHeight && rect.top - ph - 6 > 0) {
      top = rect.top + window.scrollY - ph - 6;
    }
    popover.style.left = Math.max(8, left) + 'px';
    popover.style.top = Math.max(8, top) + 'px';
    popover._anchor = anchor;
    popover.addEventListener('pointerdown', (e) => e.stopPropagation());
    return popover;
  }

  function closePopover() {
    if (popover) {
      popover.remove();
      popover = null;
    }
  }

  document.addEventListener('pointerdown', (e) => {
    if (popover && !popover.contains(e.target) && !(popover._anchor && popover._anchor.contains(e.target))) closePopover();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePopover();
      closeSlash();
    }
  });

  function blockList(onChoose, filter) {
    const list = L.el('div', 'block-list');
    BLOCKS.filter((d) => !filter || filter(d)).forEach((d) => {
      const item = L.el('button', 'block-item', { type: 'button', 'data-key': d.key });
      item.append(
        (() => { const ic = L.el('span', 'block-icon'); ic.appendChild(L.icon(d.icon)); return ic; })(),
        L.el('span', 'block-label', { html: '<b></b><small></small>' }),
      );
      item.querySelector('b').textContent = d.label;
      item.querySelector('small').textContent = d.desc;
      item.addEventListener('mousedown', (e) => e.preventDefault());
      item.addEventListener('click', () => onChoose(d.key));
      list.appendChild(item);
    });
    return list;
  }

  function openInsertMenu(anchor, afterId) {
    const content = L.el('div');
    content.appendChild(L.el('p', 'popover-title', { text: 'Adicionar abaixo' }));
    content.appendChild(blockList((key) => {
      closePopover();
      insertNewBlock(key, afterId);
    }));
    openPopover(anchor, content, { className: 'insert-popover' });
  }

  // ----- menu "/" -----
  const slash = { open: false, blockId: null, menu: null, index: 0, items: [] };

  function slashCheck(node, b) {
    if (b.type !== 'paragraph') return;
    const text = node.textContent;
    if (text.startsWith('/') && !/\s/.test(text.slice(1)) && text.length < 25) {
      openSlash(node, b, normalize(text.slice(1)));
    } else if (slash.open && slash.blockId === b.id) {
      closeSlash();
    }
  }

  function normalize(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }

  function openSlash(node, b, query) {
    if (!slash.menu) {
      slash.menu = L.el('div', 'popover slash-menu');
      slash.menu.addEventListener('pointerdown', (e) => e.stopPropagation());
      document.body.appendChild(slash.menu);
    }
    slash.open = true;
    slash.blockId = b.id;
    const matches = BLOCKS.filter((d) => !query || normalize(d.label + ' ' + d.words).includes(query));
    slash.menu.replaceChildren();
    if (!matches.length) {
      slash.menu.appendChild(L.el('p', 'popover-title', { text: 'Nada encontrado' }));
      slash.items = [];
    } else {
      slash.menu.appendChild(L.el('p', 'popover-title', { text: 'Inserir bloco' }));
      const list = blockList((key) => chooseSlash(key), (d) => matches.includes(d));
      slash.menu.appendChild(list);
      slash.items = $$('.block-item', list);
    }
    slash.index = Math.min(slash.index, Math.max(0, slash.items.length - 1));
    highlightSlash();
    const rect = node.getBoundingClientRect();
    slash.menu.hidden = false;
    let top = rect.bottom + window.scrollY + 4;
    if (rect.bottom + slash.menu.offsetHeight > window.innerHeight - 10) {
      top = Math.max(window.scrollY + 8, rect.top + window.scrollY - slash.menu.offsetHeight - 4);
    }
    slash.menu.style.top = top + 'px';
    slash.menu.style.left = Math.min(rect.left + window.scrollX, window.scrollX + document.documentElement.clientWidth - slash.menu.offsetWidth - 8) + 'px';
  }

  function highlightSlash() {
    slash.items.forEach((it, i) => it.classList.toggle('active', i === slash.index));
    slash.items[slash.index]?.scrollIntoView({ block: 'nearest' });
  }

  function slashKeydown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!slash.items.length) return true;
      slash.index = (slash.index + (e.key === 'ArrowDown' ? 1 : -1) + slash.items.length) % slash.items.length;
      highlightSlash();
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (!slash.items.length) return false;
      e.preventDefault();
      chooseSlash(slash.items[slash.index].dataset.key);
      return true;
    }
    return false;
  }

  function chooseSlash(key) {
    const b = findBlock(slash.blockId);
    closeSlash();
    if (!b) return;
    const nb = newBlock(key);
    nb.id = b.id;
    replaceBlock(b, nb, 'start');
    afterInsert(nb);
  }

  function closeSlash() {
    slash.open = false;
    slash.index = 0;
    if (slash.menu) slash.menu.hidden = true;
  }

  // ----- menu do bloco -----
  function setupHandle(handle, b) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startY = e.clientY;
      let dragging = false;
      let indicator = null;
      let dropIndex = -1;
      const wrap = blockNode(b.id);
      handle.setPointerCapture(e.pointerId);

      const move = (ev) => {
        if (!dragging && Math.abs(ev.clientY - startY) > 5) {
          dragging = true;
          wrap.classList.add('dragging');
          indicator = L.el('div', 'drop-indicator');
          inner.appendChild(indicator);
        }
        if (!dragging) return;
        const nodes = $$(':scope > .eb', inner);
        dropIndex = nodes.length;
        for (let i = 0; i < nodes.length; i++) {
          const r = nodes[i].getBoundingClientRect();
          if (ev.clientY < r.top + r.height / 2) {
            dropIndex = i;
            break;
          }
        }
        const ref = nodes[dropIndex];
        const innerRect = inner.getBoundingClientRect();
        const y = ref ? ref.getBoundingClientRect().top - innerRect.top - 3
          : nodes[nodes.length - 1].getBoundingClientRect().bottom - innerRect.top + 1;
        indicator.style.top = y + 'px';
        if (ev.clientY < 80) window.scrollBy(0, -12);
        if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
      };
      const up = () => {
        handle.removeEventListener('pointermove', move);
        handle.removeEventListener('pointerup', up);
        handle.removeEventListener('pointercancel', up);
        if (!dragging) {
          openBlockMenu(handle, b);
          return;
        }
        indicator?.remove();
        wrap.classList.remove('dragging');
        const from = blockIndex(b.id);
        let to = dropIndex > from ? dropIndex - 1 : dropIndex;
        if (to !== from && to >= 0) {
          const [moved] = blocks().splice(from, 1);
          blocks().splice(to, 0, moved);
          renderBlocks();
          commit();
        }
      };
      handle.addEventListener('pointermove', move);
      handle.addEventListener('pointerup', up);
      handle.addEventListener('pointercancel', up);
    });
  }

  function section(title) {
    const s = L.el('div', 'menu-section');
    if (title) s.appendChild(L.el('p', 'menu-label', { text: title }));
    return s;
  }

  function optionRow(options, current, onPick, opts) {
    opts = opts || {};
    const row = L.el('div', 'opt-row' + (opts.wrap ? ' wrap' : '') + (opts.className ? ' ' + opts.className : ''));
    Object.entries(options).forEach(([value, label]) => {
      const btn = L.el('button', 'opt' + (String(current) === String(value) ? ' active' : ''), { type: 'button', title: opts.titles ? opts.titles[value] : null });
      if (opts.render) opts.render(btn, value, label);
      else btn.textContent = label;
      btn.addEventListener('click', () => {
        $$('.opt', row).forEach((o) => o.classList.remove('active'));
        btn.classList.add('active');
        onPick(value);
      });
      row.appendChild(btn);
    });
    return row;
  }

  function swatchRow(colors, current, onPick, opts) {
    opts = opts || {};
    const row = L.el('div', 'swatch-row');
    if (opts.allowNone) {
      const none = L.el('button', 'sw sw-none' + (!current ? ' active' : ''), { type: 'button', title: opts.noneLabel || 'Padrão' });
      none.addEventListener('click', () => {
        $$('.sw', row).forEach((o) => o.classList.remove('active'));
        none.classList.add('active');
        onPick('');
      });
      row.appendChild(none);
    }
    colors.forEach((c) => {
      const sw = L.el('button', 'sw' + (current === c ? ' active' : ''), { type: 'button', title: c });
      sw.style.setProperty('--c', c);
      sw.addEventListener('mousedown', (e) => e.preventDefault());
      sw.addEventListener('click', () => {
        $$('.sw', row).forEach((o) => o.classList.remove('active'));
        sw.classList.add('active');
        onPick(c);
      });
      row.appendChild(sw);
    });
    if (opts.custom !== false) {
      const custom = L.el('label', 'sw sw-custom', { title: 'Outra cor' });
      const input = L.el('input', '', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(current || '') ? current : '#ff8fa3' });
      input.addEventListener('input', () => onPick(input.value));
      custom.appendChild(input);
      row.appendChild(custom);
    }
    return row;
  }

  function fontSelect(current, onPick, allowDefault) {
    const select = L.el('select', 'font-select');
    if (allowDefault) select.appendChild(L.el('option', '', { value: '', text: 'Mesma do papel' }));
    Object.entries(L.FONTS).forEach(([key, f]) => {
      const opt = L.el('option', '', { value: key, text: f.label });
      opt.style.fontFamily = f.css;
      if (key === current) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => onPick(select.value));
    return select;
  }

  function openBlockMenu(anchor, b) {
    const menu = L.el('div', 'block-menu');
    const update = (fn, focus) => {
      fn();
      rerenderBlock(b, focus);
      commit();
    };

    if (CONVERTIBLE.includes(b.type)) {
      const s = section('Transformar em');
      const keys = ['paragraph', 'h1', 'h2', 'h3', 'quote', 'list', 'numbered', 'checklist', 'callout'];
      const opts = {};
      keys.forEach((k) => { opts[k] = BLOCKS.find((d) => d.key === k).icon; });
      s.appendChild(optionRow(opts, blockKey(b), (key) => {
        closePopover();
        replaceBlock(b, convertBlock(b, key), 'end');
      }, {
        titles: Object.fromEntries(keys.map((k) => [k, BLOCKS.find((d) => d.key === k).label])),
        render: (btn, value, label) => btn.appendChild(L.icon(label)),
        className: 'opt-icons',
      }));
      menu.appendChild(s);
    }

    if (b.type === 'image') {
      const s = section('Moldura');
      s.appendChild(optionRow(L.FRAMES, b.frame, (v) => update(() => { b.frame = v; }), { wrap: true }));
      s.appendChild(L.el('p', 'menu-label', { text: 'Tamanho' }));
      s.appendChild(optionRow({ sm: 'Pequena', md: 'Média', lg: 'Grande' }, b.width, (v) => update(() => { b.width = v; })));
      s.appendChild(L.el('p', 'menu-label', { text: 'Inclinação' }));
      const tilt = L.el('input', '', { type: 'range', min: '-12', max: '12', step: '1', value: String(b.tilt) });
      tilt.addEventListener('input', () => {
        b.tilt = Number(tilt.value);
        $('.lb-figure', blockNode(b.id))?.style.setProperty('--tilt', b.tilt + 'deg');
        layout();
      });
      tilt.addEventListener('change', commit);
      s.appendChild(tilt);
      const replace = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Trocar foto' });
      replace.addEventListener('click', async () => {
        closePopover();
        const file = await pickFile();
        if (file) setBlockImage(b, file);
      });
      s.appendChild(replace);
      menu.appendChild(s);
    }

    if (b.type === 'gallery') {
      const s = section('Arrumação');
      s.appendChild(optionRow(L.GALLERY_LAYOUTS, b.layout, (v) => update(() => { b.layout = v; })));
      menu.appendChild(s);
    }

    if (b.type === 'phototext') {
      const s = section('Lado da foto');
      s.appendChild(optionRow({ left: 'Esquerda', right: 'Direita' }, b.side, (v) => update(() => { b.side = v; })));
      s.appendChild(L.el('p', 'menu-label', { text: 'Moldura' }));
      s.appendChild(optionRow(L.FRAMES, b.frame, (v) => update(() => { b.frame = v; }), { wrap: true }));
      if (b.src) {
        const replace = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Trocar foto' });
        replace.addEventListener('click', async () => {
          closePopover();
          const file = await pickFile();
          if (file) setBlockImage(b, file);
        });
        s.appendChild(replace);
      }
      menu.appendChild(s);
    }

    if (b.type === 'scratch') {
      const s = section('Cor da raspadinha');
      s.appendChild(optionRow(Object.fromEntries(Object.entries(L.SCRATCH_COVERS).map(([k, v]) => [k, v.label])), b.cover, (v) => update(() => { b.cover = v; })));
      const img = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: b.src ? 'Trocar foto escondida' : 'Esconder uma foto também' });
      img.addEventListener('click', async () => {
        closePopover();
        const file = await pickFile();
        if (file) setBlockImage(b, file);
      });
      s.appendChild(img);
      if (b.src) {
        const rm = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Tirar a foto' });
        rm.addEventListener('click', () => { closePopover(); update(() => { b.src = ''; }); });
        s.appendChild(rm);
      }
      menu.appendChild(s);
    }

    if (b.type === 'audio' && b.src) {
      const s = section('Áudio');
      const redo = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Gravar de novo' });
      redo.addEventListener('click', () => {
        closePopover();
        update(() => { b.src = ''; b.peaks = []; b.duration = 0; });
      });
      s.appendChild(redo);
      menu.appendChild(s);
    }

    if (b.type === 'divider') {
      const s = section('Estilo');
      s.appendChild(optionRow(L.DIVIDERS, b.style, (v) => update(() => { b.style = v; }), { wrap: true }));
      menu.appendChild(s);
    }

    if (b.type === 'callout') {
      const s = section('Cor da caixinha');
      s.appendChild(swatchRow(['#fde8e4', '#fff1c9', '#e2f5e5', '#e1efff', '#efe6ff', '#fbe3f1', '#f1ece4'], b.bg, (c) => {
        b.bg = c;
        $('.callout', blockNode(b.id)).style.setProperty('--callout', c);
        commit();
      }));
      menu.appendChild(s);
    }

    if (b.type === 'spacer') {
      const s = section('Altura');
      s.appendChild(optionRow({ 16: 'P', 40: 'M', 80: 'G', 140: 'GG' }, b.height, (v) => update(() => { b.height = Number(v); })));
      menu.appendChild(s);
    }

    if (!['image', 'divider', 'music', 'spacer', 'gallery', 'audio', 'pagebreak'].includes(b.type)) {
      const s = section('Alinhamento');
      s.appendChild(optionRow({ left: 'align-left', center: 'align-center', right: 'align-right' }, b.align, (v) => update(() => { b.align = v; }), {
        titles: { left: 'Esquerda', center: 'Centro', right: 'Direita' }, render: (btn, v, ic) => btn.appendChild(L.icon(ic)), className: 'opt-icons',
      }));
      s.appendChild(L.el('p', 'menu-label', { text: 'Tamanho do texto' }));
      s.appendChild(optionRow({ '': 'Auto', sm: 'P', md: 'M', lg: 'G', xl: 'GG' }, b.size || '', (v) => update(() => { b.size = v; })));
      s.appendChild(L.el('p', 'menu-label', { text: 'Fonte' }));
      s.appendChild(fontSelect(b.font, (v) => update(() => { b.font = v; }), true));
      s.appendChild(L.el('p', 'menu-label', { text: 'Cor do texto' }));
      s.appendChild(swatchRow(L.ACCENT_COLORS, b.color, (c) => update(() => { b.color = c; }), { allowNone: true, noneLabel: 'Cor da tinta' }));
      menu.appendChild(s);
    } else if (b.type === 'image') {
      const s = section('Posição');
      s.appendChild(optionRow({ left: 'align-left', center: 'align-center', right: 'align-right' }, b.align, (v) => update(() => { b.align = v; }), {
        titles: { left: 'Esquerda', center: 'Centro', right: 'Direita' }, render: (btn, v, ic) => btn.appendChild(L.icon(ic)), className: 'opt-icons',
      }));
      menu.appendChild(s);
    }

    const actions = section();
    actions.classList.add('menu-actions');
    const act = (ic, label, fn, cls) => {
      const btn = L.el('button', 'menu-action ' + (cls || ''), { type: 'button' });
      btn.append(L.icon(ic, 'ic-sm'), L.el('span', '', { text: label }));
      btn.addEventListener('click', () => {
        closePopover();
        fn();
      });
      actions.appendChild(btn);
    };
    act('chevron-up', 'Subir', () => moveBlock(b.id, -1));
    act('chevron-down', 'Descer', () => moveBlock(b.id, 1));
    act('copy', 'Duplicar', () => duplicateBlock(b));
    act('trash', 'Excluir', () => { removeBlock(b.id); commit(); }, 'danger');
    menu.appendChild(actions);

    openPopover(anchor, menu, { className: 'block-menu-popover' });
  }

  // ---------------------------------------------------------------- barra de formatação

  const HIGHLIGHTS = ['#fff3a3', '#ffd6e0', '#d4f5dd', '#d6ecff', '#eadcff', '#ffe2c7'];
  const fmtBar = L.el('div', 'format-bar', { role: 'toolbar', 'aria-label': 'Formatação' });
  const FMT = [
    ['bold', 'bold', 'Negrito (Ctrl+B)'],
    ['italic', 'italic', 'Itálico (Ctrl+I)'],
    ['underline', 'underline', 'Sublinhado (Ctrl+U)'],
    ['strikeThrough', 'strike', 'Riscado'],
    null,
    ['color', 'text-color', 'Cor do texto'],
    ['highlight', 'highlighter', 'Marca-texto'],
    ['size', 'text-size', 'Tamanho'],
    null,
    ['link', 'link', 'Link'],
    ['removeFormat', 'eraser', 'Limpar formatação'],
  ];
  FMT.forEach((item) => {
    if (!item) {
      fmtBar.appendChild(L.el('span', 'sb-sep'));
      return;
    }
    const [cmd, ic, title] = item;
    const btn = L.el('button', 'fmt-btn', { type: 'button', title, 'aria-label': title, 'data-cmd': cmd });
    btn.appendChild(L.icon(ic));
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => formatCommand(cmd, btn));
    fmtBar.appendChild(btn);
  });
  document.body.appendChild(fmtBar);

  let savedRange = null;

  function richHost() {
    const sel = getSelection();
    if (!sel.rangeCount) return null;
    let node = sel.getRangeAt(0).commonAncestorContainer;
    if (node.nodeType === 3) node = node.parentNode;
    return node.closest ? node.closest('[data-rich]') : null;
  }

  function restoreRange() {
    if (!savedRange) return;
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function afterFormat(host) {
    if (!host) return;
    normalizeFonts(host);
    host.dispatchEvent(new Event('input'));
    commit();
  }

  function formatCommand(cmd, btn) {
    const host = richHost();
    if (!host) return;
    savedRange = getSelection().getRangeAt(0).cloneRange();
    if (cmd === 'color' || cmd === 'highlight') {
      const colors = cmd === 'color' ? L.ACCENT_COLORS.concat([state.content.paper.ink]) : HIGHLIGHTS;
      const box = L.el('div', 'fmt-pop');
      box.appendChild(swatchRow(colors, null, (c) => {
        restoreRange();
        if (cmd === 'color') document.execCommand('foreColor', false, c || state.content.paper.ink);
        else document.execCommand('hiliteColor', false, c || 'transparent');
        afterFormat(host);
        closePopover();
      }, { allowNone: true, noneLabel: cmd === 'color' ? 'Cor da tinta' : 'Sem marca-texto', custom: cmd === 'color' }));
      openPopover(btn, box);
      return;
    }
    if (cmd === 'size') {
      const box = L.el('div', 'fmt-pop');
      box.appendChild(optionRow({ 2: 'Pequeno', 3: 'Normal', 5: 'Grande', 6: 'Enorme' }, '', (v) => {
        restoreRange();
        document.execCommand('styleWithCSS', false, false);
        document.execCommand('fontSize', false, v);
        document.execCommand('styleWithCSS', false, true);
        afterFormat(host);
        closePopover();
      }));
      openPopover(btn, box);
      return;
    }
    if (cmd === 'link') {
      const url = prompt('Endereço do link (https://…)', 'https://');
      restoreRange();
      if (url && /^(https?:\/\/|mailto:)/i.test(url.trim())) document.execCommand('createLink', false, url.trim());
      afterFormat(host);
      return;
    }
    document.execCommand(cmd, false, null);
    afterFormat(host);
  }

  function normalizeFonts(host) {
    $$('font[size], span[style*="font-size"]', host).forEach((f) => {
      let cls = '';
      if (f.tagName === 'FONT') {
        const s = Number(f.getAttribute('size'));
        cls = s <= 2 ? 't-sm' : s >= 6 ? 't-xl' : s >= 4 ? 't-lg' : '';
      } else {
        const fs = f.style.fontSize;
        cls = /xx-large|xxx-large/.test(fs) ? 't-xl' : /large/.test(fs) ? 't-lg' : /small/.test(fs) ? 't-sm' : '';
        f.style.fontSize = '';
      }
      const span = document.createElement('span');
      if (f.tagName === 'SPAN') {
        if (f.getAttribute('style')) span.setAttribute('style', f.getAttribute('style'));
        f.classList.remove('t-sm', 't-lg', 't-xl');
        if (f.className) span.className = f.className;
      } else if (f.getAttribute('color')) {
        span.style.color = f.getAttribute('color');
      }
      if (cls) span.classList.add(cls);
      while (f.firstChild) span.appendChild(f.firstChild);
      f.replaceWith(span);
      $$('.t-sm, .t-lg, .t-xl', span).forEach((child) => {
        if (child !== span && child.tagName === 'SPAN') child.classList.remove('t-sm', 't-lg', 't-xl');
      });
    });
  }

  document.addEventListener('selectionchange', positionFormatBar);
  window.addEventListener('scroll', positionFormatBar, { passive: true });

  function positionFormatBar() {
    const sel = getSelection();
    const host = sel.rangeCount && !sel.isCollapsed ? richHost() : null;
    if (!host || !paper.contains(host)) {
      if (!(popover && fmtBar.contains(popover._anchor))) fmtBar.classList.remove('show');
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    fmtBar.classList.add('show');
    const w = fmtBar.offsetWidth;
    const vw = document.documentElement.clientWidth;
    let left = rect.left + rect.width / 2 - w / 2;
    left = Math.max(8, Math.min(vw - w - 8, left));
    let top = rect.top - fmtBar.offsetHeight - 10;
    if (top < 60) top = rect.bottom + 10;
    fmtBar.style.left = left + 'px';
    fmtBar.style.top = top + 'px';
  }

  // ---------------------------------------------------------------- emojis

  const EMOJI_SETS = {
    'Amor': ['❤️', '🩷', '🧡', '💛', '💚', '🩵', '💜', '🤍', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💌', '😍', '🥰', '😘', '🫶', '💋', '🌹'],
    'Natureza': ['🌸', '🌷', '🌻', '🌼', '🌺', '🪻', '🍀', '🌿', '🍃', '🍂', '🌙', '⭐', '🌟', '✨', '☀️', '🌈', '☁️', '🦋', '🐝', '🐞', '🌊', '❄️'],
    'Festa': ['🎉', '🎊', '🎈', '🎂', '🍰', '🧁', '🎁', '🥂', '🍾', '🪩', '🎀', '🏆', '🎵', '🎶', '📸', '🎬'],
    'Carinhas': ['😊', '😄', '😂', '🥹', '😭', '🥺', '😎', '🤗', '🤭', '😴', '🤩', '😇', '🙈', '👀', '🫠', '🤪'],
    'Coisinhas': ['☕', '🍵', '🍓', '🍒', '🍑', '🍕', '🍦', '🍫', '📚', '✏️', '📝', '🧸', '🪴', '🕯️', '🧩', '🎨', '✈️', '🏠', '🐶', '🐱', '🐰', '🐻'],
  };

  function openEmojiPicker(anchor, onPick) {
    const box = L.el('div', 'emoji-picker');
    Object.entries(EMOJI_SETS).forEach(([name, list]) => {
      box.appendChild(L.el('p', 'menu-label', { text: name }));
      const grid = L.el('div', 'emoji-grid');
      list.forEach((em) => {
        const btn = L.el('button', 'emoji-btn', { type: 'button', text: em });
        btn.addEventListener('click', () => {
          closePopover();
          onPick(em);
        });
        grid.appendChild(btn);
      });
      box.appendChild(grid);
    });
    openPopover(anchor, box, { className: 'emoji-popover' });
  }

  // ---------------------------------------------------------------- imagens

  const fileInput = $('[data-file]');
  function pickFile(multiple, accept) {
    return new Promise((resolve) => {
      fileInput.value = '';
      fileInput.multiple = !!multiple;
      fileInput.accept = accept || 'image/jpeg,image/png,image/gif,image/webp';
      const done = () => {
        fileInput.removeEventListener('change', done);
        const files = Array.from(fileInput.files);
        resolve(multiple ? files : files[0] || null);
      };
      fileInput.addEventListener('change', done);
      fileInput.click();
    });
  }

  async function addGalleryFiles(b, files) {
    for (const file of files.slice(0, 24 - b.items.length)) {
      const res = await uploadFile(file);
      if (res) {
        b.items.push({ src: res.src, caption: '' });
        rerenderBlock(b);
      }
    }
    commit();
  }

  // ----- gravação de voz -----

  async function audioPeaks(blob, count) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      const data = buf.getChannelData(0);
      const step = Math.floor(data.length / count) || 1;
      const peaks = [];
      for (let i = 0; i < count; i++) {
        let max = 0;
        for (let j = i * step; j < Math.min(data.length, (i + 1) * step); j += 16) max = Math.max(max, Math.abs(data[j]));
        peaks.push(max);
      }
      const top = Math.max(...peaks) || 1;
      ctx.close();
      return { peaks: peaks.map((p) => Math.round((0.12 + 0.88 * (p / top)) * 100) / 100), duration: buf.duration };
    } catch (e) {
      return { peaks: [], duration: 0 };
    }
  }

  async function saveAudio(b, blob, filename) {
    const fd = new FormData();
    fd.append('id', letterId);
    fd.append('audio', blob, filename);
    setStatus('saving', 'Enviando áudio…');
    const info = await audioPeaks(blob, 48);
    try {
      const res = await api('upload', fd);
      Object.assign(b, { src: res.src, peaks: info.peaks, duration: Math.round(info.duration * 10) / 10 });
      rerenderBlock(b);
      commit();
    } catch (err) {
      setStatus('error');
      toast(err.message, 'error');
    }
  }

  function buildRecorder(b) {
    const box = L.el('div', 'recorder');
    const rec = L.el('button', 'rec-btn', { type: 'button' });
    rec.append(L.icon('mic'), L.el('span', '', { text: 'Gravar' }));
    const time = L.el('span', 'rec-time', { text: '0:00' });
    const hint = L.el('span', 'rec-hint', { text: 'Até 3 minutos. Fale como se a pessoa estivesse do lado.' });
    const upload = L.el('button', 'btn btn-sm btn-ghost', { type: 'button' });
    upload.append(L.icon('upload', 'ic-sm'), L.el('span', '', { text: 'Enviar arquivo de áudio' }));
    const info = L.el('div', 'rec-info');
    info.append(time, hint);
    box.append(rec, info, upload);

    let recorder = null;
    let timer = null;
    upload.addEventListener('click', async () => {
      const file = await pickFile(false, 'audio/*');
      if (file) saveAudio(b, file, file.name);
    });
    rec.addEventListener('click', async () => {
      if (recorder) {
        recorder.stop();
        return;
      }
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        toast('Seu navegador não grava áudio. Envie um arquivo.', 'error');
        return;
      }
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        toast('Não tive permissão para usar o microfone.', 'error');
        return;
      }
      const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
      recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      const started = Date.now();
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = () => {
        clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        box.classList.remove('recording');
        const mime = recorder.mimeType || type || 'audio/webm';
        recorder = null;
        const blob = new Blob(chunks, { type: mime });
        const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
        if (blob.size) saveAudio(b, blob, 'voz.' + ext);
      };
      recorder.start(250);
      box.classList.add('recording');
      rec.querySelector('span').textContent = 'Parar';
      timer = setInterval(() => {
        const sec = (Date.now() - started) / 1000;
        time.textContent = L.fmtTime(sec);
        if (sec >= 180 && recorder) recorder.stop();
      }, 250);
    });
    return box;
  }

  async function uploadFile(file, kind) {
    const fd = new FormData();
    fd.append('id', letterId);
    fd.append('image', file, file.name || 'imagem.png');
    if (kind) fd.append('kind', kind);
    libraryCache = null;
    setStatus('saving', 'Enviando imagem…');
    try {
      const res = await api('upload', fd);
      setStatus(dirty ? 'pending' : 'saved');
      return res;
    } catch (err) {
      setStatus('error', err.message);
      toast(err.message, 'error');
      return null;
    }
  }

  // ----- figurinhas: remover o fundo da imagem automaticamente -----

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  /** Imagem → canvas (no máximo 900px), pronto para processar. */
  function toCanvas(img) {
    const scale = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.naturalWidth * scale));
    cv.height = Math.max(1, Math.round(img.naturalHeight * scale));
    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  }

  /**
   * Apaga o fundo: parte das bordas da imagem e "inunda" os pixels parecidos com a cor do fundo,
   * sem atravessar o desenho. Depois suaviza a borda para não ficar serrilhado.
   */
  function removeBackground(source, tolerance) {
    const w = source.width;
    const h = source.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    ctx.drawImage(source, 0, 0);
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    // cor de fundo = média dos pixels das bordas
    let r = 0, g = 0, b = 0, n = 0;
    const sample = (x, y) => { const i = (y * w + x) * 4; if (d[i + 3] > 10) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; } };
    for (let x = 0; x < w; x += 2) { sample(x, 0); sample(x, h - 1); }
    for (let y = 0; y < h; y += 2) { sample(0, y); sample(w - 1, y); }
    if (!n) return out; // já é transparente
    r /= n; g /= n; b /= n;
    const tol = tolerance * tolerance * 3;
    const dist = (i) => (d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2;
    const removed = new Uint8Array(w * h);
    const stack = [];
    const push = (x, y) => {
      const p = y * w + x;
      if (removed[p]) return;
      const i = p * 4;
      if (d[i + 3] < 10 || dist(i) <= tol) { removed[p] = 1; stack.push(p); }
    };
    for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
    for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0) push(x - 1, y);
      if (x < w - 1) push(x + 1, y);
      if (y > 0) push(x, y - 1);
      if (y < h - 1) push(x, y + 1);
    }
    for (let p = 0; p < w * h; p++) {
      if (removed[p]) { d[p * 4 + 3] = 0; continue; }
      // borda suave: pixel encostado no fundo removido fica meio transparente se for parecido com ele
      const x = p % w;
      const y = (p - x) / w;
      const touches = (x > 0 && removed[p - 1]) || (x < w - 1 && removed[p + 1]) || (y > 0 && removed[p - w]) || (y < h - 1 && removed[p + w]);
      if (touches) {
        const k = Math.min(1, Math.sqrt(dist(p * 4)) / (tolerance * 2.2));
        d[p * 4 + 3] = Math.round(d[p * 4 + 3] * Math.max(0.25, k));
      }
    }
    ctx.putImageData(img, 0, 0);
    return out;
  }

  function canvasToFile(cv, name) {
    return new Promise((resolve) => cv.toBlob((blob) => resolve(new File([blob], name, { type: 'image/png' })), 'image/png'));
  }

  /** Janela "Figurinha": mostra antes/depois e deixa ajustar a tolerância. Resolve com o arquivo final ou null. */
  function stickerDialog(file) {
    return new Promise(async (resolve) => {
      let img;
      const url = typeof file === 'string' ? file : URL.createObjectURL(file);
      try {
        img = await loadImage(url);
      } catch (e) {
        toast('Não consegui abrir essa imagem.', 'error');
        resolve(null);
        return;
      }
      const base = toCanvas(img);
      const dlg = L.el('dialog', 'sticker-dialog');
      dlg.innerHTML = '<h2>Transformar em figurinha</h2>'
        + '<p class="muted small">Se a imagem tem um fundo liso (branco, por exemplo), dá para apagar automaticamente.</p>';
      const previews = L.el('div', 'sd-previews');
      const before = L.el('figure', 'sd-fig');
      before.append(base, L.el('figcaption', '', { text: 'Original' }));
      const after = L.el('figure', 'sd-fig checker');
      const afterCap = L.el('figcaption', '', { text: 'Sem fundo' });
      after.appendChild(afterCap);
      previews.append(before, after);
      const tolLabel = L.el('label', 'sd-tol', { text: 'Quanto do fundo apagar' });
      const tol = L.el('input', '', { type: 'range', min: '6', max: '90', value: '34' });
      tolLabel.appendChild(tol);
      const row = L.el('div', 'row end wrap');
      const cancel = L.el('button', 'btn btn-ghost', { type: 'button', text: 'Cancelar' });
      const keep = L.el('button', 'btn', { type: 'button', text: 'Usar com o fundo' });
      const use = L.el('button', 'btn btn-primary', { type: 'button', text: 'Usar sem fundo' });
      row.append(cancel, keep, use);
      dlg.append(previews, tolLabel, row);
      document.body.appendChild(dlg);
      let result = null;
      const render = () => {
        result = removeBackground(base, Number(tol.value));
        after.querySelector('canvas')?.remove();
        after.insertBefore(result, afterCap);
      };
      render();
      tol.addEventListener('input', render);
      const close = (value) => {
        dlg.close();
        dlg.remove();
        if (typeof file !== 'string') URL.revokeObjectURL(url);
        resolve(value);
      };
      cancel.addEventListener('click', () => close(null));
      keep.addEventListener('click', async () => close(typeof file === 'string' ? await canvasToFile(base, 'figurinha.png') : file));
      use.addEventListener('click', async () => close(await canvasToFile(result, 'figurinha.png')));
      dlg.addEventListener('cancel', () => close(null));
      dlg.showModal();
    });
  }

  async function addStickerFromFile(file) {
    const final = await stickerDialog(file);
    if (!final) return;
    const res = await uploadFile(final, 'sticker');
    if (res) addSticker({ kind: 'image', src: res.src, w: 24 });
  }

  // Colar uma imagem (Ctrl+V) fora de um texto vira figurinha
  document.addEventListener('paste', (e) => {
    if (document.activeElement && (document.activeElement.isContentEditable || ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName))) return;
    const file = Array.from(e.clipboardData?.files || []).find((f) => f.type.startsWith('image/'));
    if (file) {
      e.preventDefault();
      addStickerFromFile(file);
    }
  });

  async function setBlockImage(b, file) {
    const res = await uploadFile(file);
    if (!res) return;
    b.src = res.src;
    rerenderBlock(b);
    commit();
  }

  async function insertImageFromFile(file, afterId) {
    const nb = newBlock('image');
    insertBlockAfter(nb, afterId || (blocks().length ? blocks()[blocks().length - 1].id : null));
    await setBlockImage(nb, file);
  }

  paper.addEventListener('dragover', (e) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) e.preventDefault();
  });
  paper.addEventListener('drop', (e) => {
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    const target = e.target.closest('.eb');
    insertImageFromFile(file, target ? target.dataset.id : null);
  });

  // ---------------------------------------------------------------- adesivos

  let selectedSticker = null;
  const stickerBar = L.el('div', 'sticker-bar');
  stickerBar.addEventListener('pointerdown', (e) => e.stopPropagation());
  document.body.appendChild(stickerBar);

  function renderStickers() {
    layer.replaceChildren(...stickers().map(buildSticker));
    if (selectedSticker && !stickers().some((s) => s.id === selectedSticker)) selectedSticker = null;
    refreshSelection();
    layout();
  }

  function stickerNode(id) {
    return layer.querySelector('.sticker[data-id="' + id + '"]');
  }

  function buildSticker(s) {
    const node = L.stickerEl(s);
    node.tabIndex = 0;
    node.addEventListener('pointerdown', (e) => stickerPointerDown(e, s, node));
    node.addEventListener('dblclick', () => { if (!s.lk) editStickerText(s); });
    node.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      selectSticker(s.id);
      openStickerContext(e, s);
    });
    if (s.kind === 'image') node.querySelector('img')?.addEventListener('load', layout);
    return node;
  }

  function selectSticker(id) {
    selectedSticker = id;
    refreshSelection();
  }

  function refreshSelection() {
    $$('.sticker', layer).forEach((n) => {
      const on = n.dataset.id === selectedSticker;
      n.classList.toggle('selected', on);
      $$('.sh', n).forEach((h) => h.remove());
      const st = stickers().find((x) => x.id === n.dataset.id);
      if (on && st && !st.lk) addHandles(n, st);
    });
    buildStickerBar();
    positionStickerBar();
    if (typeof activeTab !== 'undefined' && activeTab === 'layers') renderPanel();
  }

  function addHandles(node, s) {
    const rot = L.el('span', 'sh sh-rotate', { title: 'Girar' });
    const res = L.el('span', 'sh sh-resize', { title: 'Redimensionar' });
    rot.addEventListener('pointerdown', (e) => handleDrag(e, s, node, 'rotate'));
    res.addEventListener('pointerdown', (e) => handleDrag(e, s, node, 'resize'));
    node.append(rot, res);
  }

  // ----- guias de alinhamento -----
  const guides = { v: L.el('div', 'guide guide-v'), h: L.el('div', 'guide guide-h') };

  function snapTargets(s) {
    const pr = paper.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(inner).paddingLeft) || 0;
    const xs = [pr.width / 2, pad, pr.width - pad];
    const ys = [];
    stickers().forEach((o) => {
      if (o.id === s.id) return;
      const r = stickerNode(o.id)?.getBoundingClientRect();
      if (!r) return;
      xs.push(r.left - pr.left, r.left - pr.left + r.width / 2, r.right - pr.left);
      ys.push(r.top - pr.top, r.top - pr.top + r.height / 2, r.bottom - pr.top);
    });
    return { xs, ys };
  }

  /** Ajusta a posição para grudar nas guias próximas (como no Canva). */
  function snap(cx, cy, hw, hh, targets) {
    const T = 6;
    let gx = null;
    let gy = null;
    for (const [off, val] of [[0, cx], [-hw, cx - hw], [hw, cx + hw]]) {
      const hit = targets.xs.find((t) => Math.abs(t - val) < T);
      if (hit !== undefined) { cx = hit - off; gx = hit; break; }
    }
    for (const [off, val] of [[0, cy], [-hh, cy - hh], [hh, cy + hh]]) {
      const hit = targets.ys.find((t) => Math.abs(t - val) < T);
      if (hit !== undefined) { cy = hit - off; gy = hit; break; }
    }
    return { cx, cy, gx, gy };
  }

  function showGuides(gx, gy) {
    if (gx !== null) {
      guides.v.style.left = gx + 'px';
      paper.appendChild(guides.v);
    } else guides.v.remove();
    if (gy !== null) {
      guides.h.style.top = gy + 'px';
      paper.appendChild(guides.h);
    } else guides.h.remove();
  }

  function stickerPointerDown(e, s, node) {
    if (e.button !== 0 || node.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"]')) return;
    e.preventDefault();
    e.stopPropagation();
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    const wasSelected = selectedSticker === s.id;
    selectSticker(s.id);
    if (s.lk) return; // travado: só seleciona
    const pr = paper.getBoundingClientRect();
    const own = node.getBoundingClientRect();
    const hw = own.width / 2;
    const hh = own.height / 2;
    const startX = e.clientX;
    const startY = e.clientY;
    const cx0 = (s.x * pr.width) / 100;
    const cy0 = parseFloat(node.style.top) || 0;
    const targets = snapTargets(s);
    let moved = false;
    node.setPointerCapture(e.pointerId);
    node.classList.add('moving');

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      let cx = cx0 + dx;
      let cy = cy0 + dy;
      let gx = null;
      let gy = null;
      if (!ev.altKey) ({ cx, cy, gx, gy } = snap(cx, cy, hw, hh, targets));
      showGuides(gx, gy);
      s.x = round((cx / pr.width) * 100);
      node.style.setProperty('--x', s.x);
      node.style.top = cy + 'px';
      positionStickerBar();
    };
    const up = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
      node.classList.remove('moving');
      showGuides(null, null);
      if (moved) {
        reanchor(s, parseFloat(node.style.top) || 0);
        layout();
        commit();
      } else if (wasSelected && s.kind === 'text') {
        editStickerText(s);
      }
    };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
  }

  function handleDrag(e, s, node, mode) {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const d0 = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx);
    const w0 = s.w;
    const r0 = s.r || 0;

    const move = (ev) => {
      if (mode === 'resize') {
        const d = Math.hypot(ev.clientX - cx, ev.clientY - cy);
        s.w = round(Math.max(2, Math.min(100, (w0 * d) / d0)));
      } else {
        let r = r0 + ((Math.atan2(ev.clientY - cy, ev.clientX - cx) - a0) * 180) / Math.PI;
        r = ((r + 540) % 360) - 180;
        for (const snap of [-90, 0, 90, 180, -180]) {
          if (Math.abs(r - snap) < 4) r = snap;
        }
        s.r = round(r);
      }
      L.updateStickerBox(node, s);
      positionStickerBar();
    };
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      layout();
      commit();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  /** Prende o adesivo ao bloco que está logo acima do seu centro. */
  function reanchor(s, centerY) {
    const pr = paper.getBoundingClientRect();
    let anchor = '';
    let top = 0;
    $$(':scope > .eb', inner).forEach((blk) => {
      const t = blk.getBoundingClientRect().top - pr.top;
      if (t <= centerY) {
        anchor = blk.dataset.id;
        top = t;
      }
    });
    s.anchor = anchor;
    s.y = round(((centerY - top) / (pr.width || 1)) * 100);
  }

  /** Centro vertical visível do papel, para onde vão os adesivos novos. */
  function visibleCenterY() {
    const pr = paper.getBoundingClientRect();
    const viewTop = Math.max(pr.top, 60);
    const viewBottom = Math.min(pr.bottom, window.innerHeight);
    const mid = viewBottom > viewTop ? (viewTop + viewBottom) / 2 : pr.top + 120;
    return mid - pr.top;
  }

  function addSticker(props) {
    const s = Object.assign({ id: L.uid(), x: 50 + (Math.random() * 30 - 15), y: 0, anchor: '', w: 12, r: Math.round(Math.random() * 16 - 8) }, props);
    s.x = round(s.x);
    reanchor(s, props._cy !== undefined ? props._cy : visibleCenterY() + (Math.random() * 60 - 30));
    delete s._cy;
    stickers().push(s);
    layer.appendChild(buildSticker(s));
    selectSticker(s.id);
    layout();
    commit();
    closeSheetOnMobile();
    return s;
  }

  function deleteSticker(id) {
    state.content.stickers = stickers().filter((s) => s.id !== id);
    stickerNode(id)?.remove();
    selectedSticker = null;
    refreshSelection();
    layout();
    commit();
  }

  function editStickerText(s) {
    if (s.kind !== 'text') return;
    const node = stickerNode(s.id);
    const t = $('.st-text', node);
    if (!t || t.isContentEditable) return;
    t.contentEditable = 'plaintext-only';
    if (t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
    node.classList.add('editing-text');
    focusEditable(t, 'end');
    const finish = () => {
      t.removeEventListener('blur', finish);
      t.contentEditable = 'false';
      node.classList.remove('editing-text');
      s.text = t.innerText.replace(/\n{3,}/g, '\n\n').trim().slice(0, 300);
      if (!s.text) {
        deleteSticker(s.id);
        return;
      }
      layout();
      commit();
    };
    t.addEventListener('blur', finish);
    t.addEventListener('input', layout);
  }

  // ----- ações dos adesivos (barra, menu de contexto, atalhos e camadas) -----
  function duplicateSticker(s) {
    const copy = JSON.parse(JSON.stringify(s));
    copy.id = L.uid();
    copy.x = Math.min(100, s.x + 4);
    copy.y = s.y + 3;
    copy.lk = false;
    stickers().push(copy);
    layer.appendChild(buildSticker(copy));
    selectSticker(copy.id);
    layout();
    commit();
  }

  function restack(s, where) {
    const rest = stickers().filter((x) => x !== s);
    const idx = stickers().indexOf(s);
    if (where === 'front') state.content.stickers = rest.concat([s]);
    else if (where === 'back') state.content.stickers = [s].concat(rest);
    else {
      const to = Math.max(0, Math.min(rest.length, idx + (where === 'up' ? 1 : -1)));
      rest.splice(to, 0, s);
      state.content.stickers = rest;
    }
    renderStickers();
    commit();
  }

  function toggleLock(s) {
    s.lk = !s.lk;
    L.updateStickerBox(stickerNode(s.id), s);
    refreshSelection();
    commit();
  }

  function flipSticker(s) {
    s.f = !s.f;
    L.updateStickerBox(stickerNode(s.id), s);
    commit();
  }

  function stickerMenuItems(s) {
    return [
      ['copy', 'Duplicar', 'Ctrl+D', () => duplicateSticker(s)],
      ['chevron-up', 'Trazer para frente', ']', () => restack(s, 'front')],
      ['chevron-down', 'Enviar para trás', '[', () => restack(s, 'back')],
      ['flip', 'Espelhar', '', () => flipSticker(s)],
      [s.lk ? 'unlock' : 'lock', s.lk ? 'Destravar' : 'Travar posição', 'Ctrl+L', () => toggleLock(s)],
      ['trash', 'Excluir', 'Del', () => deleteSticker(s.id), 'danger'],
    ];
  }

  function openStickerContext(e, s) {
    const anchor = L.el('span', 'ctx-anchor');
    anchor.style.left = e.pageX + 'px';
    anchor.style.top = e.pageY + 'px';
    document.body.appendChild(anchor);
    const list = L.el('div', 'ctx-menu');
    stickerMenuItems(s).forEach(([ic, label, key, fn, cls]) => {
      const item = L.el('button', 'ctx-item ' + (cls || ''), { type: 'button' });
      item.append(L.icon(ic, 'ic-sm'), L.el('span', '', { text: label }), L.el('kbd', '', { text: key }));
      if (!key) item.lastChild.remove();
      item.addEventListener('click', () => {
        closePopover();
        fn();
      });
      list.appendChild(item);
    });
    openPopover(anchor, list, { className: 'ctx-popover' });
    anchor.remove();
  }

  function buildStickerBar() {
    stickerBar.replaceChildren();
    const s = stickers().find((x) => x.id === selectedSticker);
    stickerBar.classList.toggle('show', !!s);
    if (!s) return;
    const btn = (ic, title, fn, cls) => {
      const b = L.el('button', 'sb-btn ' + (cls || ''), { type: 'button', title, 'aria-label': title });
      b.appendChild(L.icon(ic));
      b.addEventListener('click', fn);
      stickerBar.appendChild(b);
      return b;
    };
    const sep = () => stickerBar.appendChild(L.el('span', 'sb-sep'));
    if (s.lk) {
      btn('unlock', 'Destravar', () => toggleLock(s));
      return;
    }
    if (s.kind === 'text') {
      btn('pen', 'Editar texto', () => editStickerText(s));
      const font = fontSelect(s.font, (v) => {
        s.font = v;
        refreshStickerNode(s);
        commit();
      });
      stickerBar.appendChild(font);
      btn('text-color', 'Cor e estilo', (e) => {
        const box = L.el('div', 'fmt-pop');
        box.appendChild(L.el('p', 'menu-label', { text: 'Cor' }));
        box.appendChild(swatchRow(L.ACCENT_COLORS.concat(['#ffffff']), s.color, (c) => {
          s.color = c;
          refreshStickerNode(s);
          commit();
        }));
        box.appendChild(L.el('p', 'menu-label', { text: 'Estilo' }));
        box.appendChild(optionRow(L.TEXT_STYLES, s.style, (v) => {
          s.style = v;
          refreshStickerNode(s);
          commit();
        }, { wrap: true }));
        openPopover(e.currentTarget, box);
      });
      sep();
    }
    if (s.kind === 'doodle') {
      btn('text-color', 'Cor', (e) => {
        const box = L.el('div', 'fmt-pop');
        box.appendChild(swatchRow(L.ACCENT_COLORS.concat(['#ffffff', '#a3322a', '#c9a227']), s.c, (c) => {
          s.c = c;
          refreshStickerNode(s);
          commit();
        }));
        openPopover(e.currentTarget, box);
      });
      sep();
    }
    if (s.kind === 'image') {
      btn('eraser', 'Remover o fundo', async () => {
        const file = await stickerDialog(L.mediaUrl(s.src));
        if (!file) return;
        const res = await uploadFile(file, 'sticker');
        if (!res) return;
        s.src = res.src;
        refreshStickerNode(s);
        commit();
      });
      sep();
    }
    if (s.kind === 'tape') {
      btn('sparkle', 'Trocar estampa', () => {
        s.pattern = L.TAPES[(L.TAPES.indexOf(s.pattern) + 1) % L.TAPES.length];
        refreshStickerNode(s);
        commit();
      });
      sep();
    }
    btn('wand', 'Transparência', (e) => {
      const box = L.el('div', 'fmt-pop');
      box.appendChild(L.el('p', 'menu-label', { text: 'Transparência' }));
      const range = L.el('input', '', { type: 'range', min: '10', max: '100', step: '5', value: String(Math.round((s.o ?? 1) * 100)) });
      range.addEventListener('input', () => {
        s.o = Number(range.value) / 100;
        L.updateStickerBox(stickerNode(s.id), s);
      });
      range.addEventListener('change', commit);
      box.appendChild(range);
      openPopover(e.currentTarget, box);
    });
    btn('flip', 'Espelhar', () => flipSticker(s));
    btn('copy', 'Duplicar (Ctrl+D)', () => duplicateSticker(s));
    btn('layers', 'Ordem', (e) => {
      const box = L.el('div', 'ctx-menu');
      [['chevron-up', 'Para a frente', 'front'], ['chevron-up', 'Subir uma camada', 'up'], ['chevron-down', 'Descer uma camada', 'down'], ['chevron-down', 'Para trás', 'back']].forEach(([ic, label, where]) => {
        const item = L.el('button', 'ctx-item', { type: 'button' });
        item.append(L.icon(ic, 'ic-sm'), L.el('span', '', { text: label }));
        item.addEventListener('click', () => { closePopover(); restack(s, where); });
        box.appendChild(item);
      });
      openPopover(e.currentTarget, box);
    });
    btn('lock', 'Travar posição (Ctrl+L)', () => toggleLock(s));
    sep();
    btn('trash', 'Excluir (Delete)', () => deleteSticker(s.id), 'danger');
  }

  function refreshStickerNode(s) {
    const node = stickerNode(s.id);
    if (!node) return;
    L.fillSticker(node, s);
    refreshSelection();
    layout();
  }

  function positionStickerBar() {
    const node = selectedSticker ? stickerNode(selectedSticker) : null;
    if (!node) {
      stickerBar.classList.remove('show');
      return;
    }
    const rect = node.getBoundingClientRect();
    const w = stickerBar.offsetWidth;
    const vw = document.documentElement.clientWidth;
    let top = rect.bottom + 14;
    if (top + 50 > window.innerHeight) top = rect.top - 60;
    stickerBar.style.left = Math.max(8, Math.min(vw - w - 8, rect.left + rect.width / 2 - w / 2)) + 'px';
    stickerBar.style.top = Math.max(60, top) + 'px';
  }
  window.addEventListener('scroll', positionStickerBar, { passive: true });

  document.addEventListener('pointerdown', (e) => {
    if (selectedSticker && !e.target.closest('.sticker') && !stickerBar.contains(e.target) && !(popover && popover.contains(e.target))) {
      selectedSticker = null;
      refreshSelection();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!selectedSticker || (document.activeElement && document.activeElement.isContentEditable)) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const s = stickers().find((x) => x.id === selectedSticker);
    if (!s) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      toggleLock(s);
      return;
    }
    if (s.lk) return;
    if (mod && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateSticker(s);
    } else if (e.key === ']' || e.key === '[') {
      e.preventDefault();
      restack(s, e.key === ']' ? 'front' : 'back');
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      deleteSticker(s.id);
    } else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = e.shiftKey ? 2 : 0.5;
      if (e.key === 'ArrowLeft') s.x = round(s.x - step);
      if (e.key === 'ArrowRight') s.x = round(s.x + step);
      if (e.key === 'ArrowUp') s.y = round(s.y - step);
      if (e.key === 'ArrowDown') s.y = round(s.y + step);
      L.updateStickerBox(stickerNode(s.id), s);
      layout();
      typed();
    } else if (e.key === 'Escape') {
      selectedSticker = null;
      refreshSelection();
    }
  });

  // ----- desenho à mão livre -----
  let drawing = null;

  function startDrawing() {
    if (drawing) return;
    closeSheetOnMobile();
    selectedSticker = null;
    refreshSelection();
    const pr = paper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cv = L.el('canvas', 'draw-canvas');
    cv.width = Math.round(pr.width * dpr);
    cv.height = Math.round(paper.offsetHeight * dpr);
    cv.style.height = paper.offsetHeight + 'px';
    paper.appendChild(cv);
    const ctx = cv.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawing = { cv, ctx, strokes: [], color: state.content.paper.ink, size: 4 };
    scene.classList.add('drawing-mode');

    const bar = L.el('div', 'draw-bar');
    bar.appendChild(L.el('span', 'draw-title', { text: 'Desenhe no papel' }));
    bar.appendChild(swatchRow(L.ACCENT_COLORS.concat(['#ffffff']), drawing.color, (c) => { drawing.color = c; }));
    bar.appendChild(optionRow({ 2: 'Fino', 4: 'Médio', 9: 'Grosso' }, 4, (v) => { drawing.size = Number(v); }));
    const undo = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Desfazer traço' });
    undo.addEventListener('click', () => {
      drawing.strokes.pop();
      redrawCanvas();
    });
    const cancel = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Cancelar' });
    cancel.addEventListener('click', () => stopDrawing(false));
    const done = L.el('button', 'btn btn-sm btn-primary', { type: 'button', text: 'Concluir' });
    done.addEventListener('click', () => stopDrawing(true));
    bar.append(undo, cancel, done);
    document.body.appendChild(bar);
    drawing.bar = bar;

    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      const r = cv.getBoundingClientRect();
      const stroke = { c: drawing.color, s: drawing.size, pts: [[e.clientX - r.left, e.clientY - r.top]] };
      drawing.strokes.push(stroke);
      const move = (ev) => {
        const p = [ev.clientX - r.left, ev.clientY - r.top];
        const last = stroke.pts[stroke.pts.length - 1];
        if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
        stroke.pts.push(p);
        ctx.strokeStyle = stroke.c;
        ctx.lineWidth = stroke.s;
        ctx.beginPath();
        ctx.moveTo(last[0], last[1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      };
      const up = () => {
        cv.removeEventListener('pointermove', move);
        cv.removeEventListener('pointerup', up);
        cv.removeEventListener('pointercancel', up);
        redrawCanvas();
      };
      cv.addEventListener('pointermove', move);
      cv.addEventListener('pointerup', up);
      cv.addEventListener('pointercancel', up);
    });
  }

  function redrawCanvas() {
    const { cv, ctx } = drawing;
    ctx.clearRect(0, 0, cv.width, cv.height);
    drawing.strokes.forEach((st) => {
      ctx.strokeStyle = st.c;
      ctx.lineWidth = st.s;
      ctx.stroke(new Path2D(smoothPath(st.pts, 0, 0)));
    });
  }

  function smoothPath(pts, ox, oy) {
    const f = (n) => Math.round(n * 10) / 10;
    const P = pts.map((p) => [p[0] - ox, p[1] - oy]);
    if (P.length === 1) return 'M' + f(P[0][0]) + ' ' + f(P[0][1]) + ' L' + f(P[0][0] + 0.1) + ' ' + f(P[0][1] + 0.1);
    let d = 'M' + f(P[0][0]) + ' ' + f(P[0][1]);
    for (let i = 1; i < P.length - 1; i++) {
      const mx = (P[i][0] + P[i + 1][0]) / 2;
      const my = (P[i][1] + P[i + 1][1]) / 2;
      d += ' Q' + f(P[i][0]) + ' ' + f(P[i][1]) + ' ' + f(mx) + ' ' + f(my);
    }
    const last = P[P.length - 1];
    return d + ' L' + f(last[0]) + ' ' + f(last[1]);
  }

  function stopDrawing(keep) {
    if (!drawing) return;
    const { strokes, cv, bar } = drawing;
    drawing = null;
    cv.remove();
    bar.remove();
    scene.classList.remove('drawing-mode');
    if (!keep || !strokes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, maxS = 0;
    strokes.forEach((st) => {
      maxS = Math.max(maxS, st.s);
      st.pts.forEach(([x, y]) => {
        minX = Math.min(minX, x); minY = Math.min(minY, y);
        maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      });
    });
    const pad = maxS / 2 + 2;
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;
    const bw = maxX - minX;
    const bh = maxY - minY;
    const width = paper.getBoundingClientRect().width;
    addSticker({
      kind: 'drawing',
      vw: round(bw), vh: round(bh),
      paths: strokes.map((st) => ({ d: smoothPath(st.pts, minX, minY), c: st.c, s: st.s })),
      w: round((bw / width) * 100),
      x: round(((minX + bw / 2) / width) * 100),
      r: 0,
      _cy: minY + bh / 2,
    });
  }

  // ---------------------------------------------------------------- painel lateral

  const panel = $('[data-panel]');
  const panelBody = $('[data-panel-body]');
  let activeTab = 'blocks';

  $$('[data-tab]', panel).forEach((tab) => {
    tab.addEventListener('click', () => {
      const same = activeTab === tab.dataset.tab;
      activeTab = tab.dataset.tab;
      $$('[data-tab]', panel).forEach((t) => t.classList.toggle('active', t === tab));
      if (isMobile()) panel.classList.toggle('sheet-open', !(same && panel.classList.contains('sheet-open')));
      renderPanel();
    });
  });

  function isMobile() {
    return window.matchMedia('(max-width: 860px)').matches;
  }

  function closeSheetOnMobile() {
    if (isMobile()) panel.classList.remove('sheet-open');
  }

  function renderPanel() {
    panelBody.replaceChildren();
    ({ blocks: panelBlocks, stickers: panelStickers, paper: panelPaper, envelope: panelEnvelope, layers: panelLayers, library: panelLibrary })[activeTab]();
  }

  function panelSection(title, hint) {
    const s = L.el('section', 'panel-section');
    s.appendChild(L.el('h3', '', { text: title }));
    if (hint) s.appendChild(L.el('p', 'panel-hint', { text: hint }));
    panelBody.appendChild(s);
    return s;
  }

  function panelBlocks() {
    const s = panelSection('Inserir bloco', 'Entra logo depois do bloco onde está o cursor.');
    const grid = L.el('div', 'tile-grid');
    BLOCKS.forEach((d) => {
      const t = L.el('button', 'tile', { type: 'button', title: d.desc });
      const ti = L.el('span', 'tile-icon');
      ti.appendChild(L.icon(d.icon));
      t.append(ti, L.el('span', 'tile-label', { text: d.label }));
      t.addEventListener('mousedown', (e) => e.preventDefault());
      t.addEventListener('click', () => {
        closeSheetOnMobile();
        const after = lastFocusedId && findBlock(lastFocusedId) ? lastFocusedId : (blocks().length ? blocks()[blocks().length - 1].id : null);
        insertNewBlock(d.key, after);
      });
      grid.appendChild(t);
    });
    s.appendChild(grid);

    const tips = panelSection('Atalhos');
    tips.appendChild(L.el('ul', 'tips', {
      html: '<li><kbd>/</kbd> menu de blocos</li><li><kbd>#</kbd> + espaço = título</li><li><kbd>-</kbd> + espaço = lista</li>'
        + '<li><kbd>[]</kbd> + espaço = lista de desejos</li><li><kbd>&gt;</kbd> + espaço = citação</li><li><kbd>---</kbd> = divisória</li>'
        + '<li><kbd>Shift</kbd>+<kbd>Enter</kbd> quebra de linha</li><li><kbd>Ctrl</kbd>+<kbd>Z</kbd> desfazer</li>',
    }));
  }

  function panelStickers() {
    const s1 = panelSection('Emojis', 'Toque para colocar no papel e depois arraste, gire e redimensione.');
    Object.entries(EMOJI_SETS).forEach(([name, list]) => {
      s1.appendChild(L.el('p', 'menu-label', { text: name }));
      const grid = L.el('div', 'emoji-grid');
      list.forEach((em) => {
        const btn = L.el('button', 'emoji-btn', { type: 'button', text: em });
        btn.addEventListener('click', () => addSticker({ kind: 'emoji', char: em, w: 11 }));
        grid.appendChild(btn);
      });
      s1.appendChild(grid);
    });

    const sd = panelSection('Rabiscos', 'Desenhos feitos à mão. Depois dá para trocar a cor.');
    const dgrid = L.el('div', 'doodle-grid');
    Object.entries(L.DOODLES).forEach(([name, def]) => {
      const btn = L.el('button', 'doodle-btn', { type: 'button', title: def.label });
      btn.appendChild(L.doodleSvg(name, state.content.paper.ink));
      btn.addEventListener('click', () => addSticker({ kind: 'doodle', name, c: state.content.paper.ink, w: 12, r: 0 }));
      dgrid.appendChild(btn);
    });
    sd.appendChild(dgrid);

    const s2 = panelSection('Fitas washi');
    const tapes = L.el('div', 'tape-grid');
    L.TAPES.forEach((p) => {
      const btn = L.el('button', 'tape-btn', { type: 'button', title: p });
      btn.appendChild(L.el('span', 'st-tape tape-' + p));
      btn.addEventListener('click', () => addSticker({ kind: 'tape', pattern: p, w: 24, r: Math.round(Math.random() * 30 - 15) }));
      tapes.appendChild(btn);
    });
    s2.appendChild(tapes);

    const s3 = panelSection('Textos soltos', 'Bilhetinhos que você posiciona em qualquer lugar.');
    const grid = L.el('div', 'tile-grid');
    Object.entries(L.TEXT_STYLES).forEach(([style, label]) => {
      const t = L.el('button', 'tile', { type: 'button' });
      const sample = L.el('span', 'tile-icon tile-text-sample');
      sample.appendChild(L.el('span', 'st-text st-' + style, { text: 'Aa' }));
      t.append(sample, L.el('span', 'tile-label', { text: label }));
      t.addEventListener('click', () => {
        const s = addSticker({ kind: 'text', text: style === 'note' ? 'Lembra disso?' : 'Escreva aqui', font: state.content.paper.font, color: state.content.paper.ink, style, w: style === 'note' ? 26 : 30 });
        setTimeout(() => editStickerText(s), 50);
      });
      grid.appendChild(t);
    });
    s3.appendChild(grid);

    const s4 = panelSection('Desenho e imagens');
    const draw = L.el('button', 'btn btn-block', { type: 'button', text: 'Desenhar à mão livre' });
    draw.prepend(L.icon('brush'));
    draw.addEventListener('click', startDrawing);
    const img = L.el('button', 'btn btn-block btn-ghost', { type: 'button', text: 'Figurinha da internet' });
    img.prepend(L.icon('image'));
    img.addEventListener('click', async () => {
      const file = await pickFile();
      if (file) addStickerFromFile(file);
    });
    s4.append(draw, img, L.el('p', 'panel-hint', {
      text: 'Baixe qualquer imagem (Pinterest, Google…) e envie aqui. Se tiver fundo, eu apago para virar figurinha. Também dá para colar com Ctrl+V.',
    }));
  }

  function panelPaper() {
    const p = state.content.paper;
    const set = (key, value, full) => {
      p[key] = value;
      if (full) renderAll();
      else {
        L.applyPaper(scene, paper, p);
        layout();
      }
      commit();
    };

    const s1 = panelSection('Papel');
    const grid = L.el('div', 'paper-grid');
    Object.entries(L.PAPERS).forEach(([key, label]) => {
      const btn = L.el('button', 'paper-tile' + (p.style === key ? ' active' : ''), { type: 'button' });
      const sample = L.el('span', 'paper-sample paper paper-' + key);
      sample.style.setProperty('--paper', p.color);
      sample.style.setProperty('--ink', p.ink);
      if (key === 'image') {
        if (p.image) sample.style.backgroundImage = 'url("' + L.mediaUrl(p.image) + '")';
        else sample.appendChild(L.icon('upload'));
      }
      btn.append(sample, L.el('span', '', { text: label }));
      btn.addEventListener('click', async () => {
        if (key === 'image' && !p.image) {
          const src = await pickFromLibrary('Imagem para o papel');
          if (!src) return;
          p.image = src;
        }
        set('style', key);
        renderPanel();
      });
      grid.appendChild(btn);
    });
    s1.appendChild(grid);
    if (p.style === 'image' && p.image) {
      const box = L.el('div', 'image-controls');
      const change = L.el('button', 'btn btn-sm', { type: 'button', text: 'Trocar imagem' });
      change.addEventListener('click', async () => {
        const src = await pickFromLibrary('Imagem para o papel');
        if (src) { p.image = src; set('style', 'image'); renderPanel(); }
      });
      box.appendChild(change);
      box.appendChild(L.el('p', 'menu-label', { text: 'Encaixe' }));
      box.appendChild(optionRow({ cover: 'Preencher', contain: 'Inteira', tile: 'Repetir' }, p.imageFit || 'cover', (v) => set('imageFit', v)));
      box.appendChild(L.el('p', 'menu-label', { text: 'Véu para o texto aparecer' }));
      const veil = L.el('input', '', { type: 'range', min: '0', max: '90', step: '5', value: String(Math.round((p.veil ?? 0.35) * 100)) });
      veil.addEventListener('input', () => { p.veil = Number(veil.value) / 100; L.applyPaper(scene, paper, p); });
      veil.addEventListener('change', commit);
      box.appendChild(veil);
      box.appendChild(optionRow({ light: 'Véu claro', dark: 'Véu escuro' }, p.veilDark ? 'dark' : 'light', (v) => {
        p.veilDark = v === 'dark';
        if (p.veilDark && L.isDark(p.ink)) p.ink = '#fdf6e9';
        if (!p.veilDark && !L.isDark(p.ink)) p.ink = '#3b3340';
        set('veilDark', p.veilDark, true);
      }));
      box.appendChild(L.el('p', 'panel-hint', { text: 'Com véu escuro, use uma tinta clara (em "Cor da tinta").' }));
      s1.appendChild(box);
    }
    s1.appendChild(L.el('p', 'menu-label', { text: 'Cor do papel' }));
    s1.appendChild(swatchRow(L.PAPER_COLORS, p.color, (c) => set('color', c)));
    s1.appendChild(L.el('p', 'menu-label', { text: 'Cor da tinta' }));
    s1.appendChild(swatchRow(L.INK_COLORS, p.ink, (c) => set('ink', c)));

    const s2 = panelSection('Letra');
    const fonts = L.el('div', 'font-list');
    Object.entries(L.FONTS).forEach(([key, f]) => {
      const btn = L.el('button', 'font-tile' + (p.font === key ? ' active' : ''), { type: 'button' });
      const sample = L.el('span', 'font-sample', { text: 'Querida amiga,' });
      sample.style.fontFamily = f.css;
      sample.style.fontSize = (18 * f.scale) + 'px';
      btn.append(sample, L.el('small', '', { text: f.label }));
      btn.addEventListener('click', () => {
        $$('.font-tile', fonts).forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        set('font', key, true);
      });
      fonts.appendChild(btn);
    });
    s2.appendChild(fonts);
    s2.appendChild(L.el('p', 'menu-label', { text: 'Tamanho da letra' }));
    s2.appendChild(optionRow({ sm: 'Pequena', md: 'Média', lg: 'Grande' }, p.size, (v) => set('size', v)));

    const s3 = panelSection('Borda');
    s3.appendChild(optionRow(L.BORDERS, p.border, (v) => set('border', v), { wrap: true }));

    const s4 = panelSection('Cenário', 'O fundo em volta da carta.');
    const scenes = L.el('div', 'scene-grid');
    Object.entries(L.SCENES).forEach(([key, label]) => {
      const btn = L.el('button', 'scene-tile scene-' + key + (p.scene === key ? ' active' : ''), { type: 'button' });
      if (key === 'image' && p.sceneImage) btn.style.backgroundImage = 'url("' + L.mediaUrl(p.sceneImage) + '")';
      btn.appendChild(L.el('span', '', { text: label }));
      btn.addEventListener('click', async () => {
        if (key === 'image' && !p.sceneImage) {
          const src = await pickFromLibrary('Imagem para o fundo');
          if (!src) return;
          p.sceneImage = src;
        }
        set('scene', key);
        renderPanel();
      });
      scenes.appendChild(btn);
    });
    s4.appendChild(scenes);
    if (p.scene === 'image' && p.sceneImage) {
      const box = L.el('div', 'image-controls');
      const change = L.el('button', 'btn btn-sm', { type: 'button', text: 'Trocar imagem do fundo' });
      change.addEventListener('click', async () => {
        const src = await pickFromLibrary('Imagem para o fundo');
        if (src) { p.sceneImage = src; set('scene', 'image'); renderPanel(); }
      });
      box.appendChild(change);
      const slider = (label, key, max, unit) => {
        box.appendChild(L.el('p', 'menu-label', { text: label }));
        const r = L.el('input', '', { type: 'range', min: '0', max: String(max), step: '1', value: String(Math.round((p[key] || 0) * unit)) });
        r.addEventListener('input', () => { p[key] = Number(r.value) / unit; L.applyPaper(scene, paper, p); });
        r.addEventListener('change', commit);
        box.appendChild(r);
      };
      slider('Desfoque', 'sceneBlur', 24, 1);
      slider('Escurecer', 'sceneDim', 80, 100);
      s4.appendChild(box);
    }
  }

  function panelEnvelope() {
    const env = state.content.envelope;
    const preview = L.el('div', 'env-preview');
    const s0 = panelSection('Como a carta chega', 'É isso que a pessoa vê antes de abrir.');
    s0.appendChild(preview);
    const refresh = () => {
      preview.replaceChildren(L.renderEnvelope(env, recipientName() || 'Você', { paperColor: state.content.paper.color }));
    };
    const set = (key, value) => {
      env[key] = value;
      refresh();
      commit();
    };
    refresh();

    const s1 = panelSection('Envelope');
    s1.appendChild(L.el('p', 'menu-label', { text: 'Cor' }));
    s1.appendChild(swatchRow(['#e9b8b0', '#f3d9a4', '#b9d8c2', '#b7cfe8', '#cdbfe6', '#f1e6d2', '#d9c2a3', '#8c2f39', '#2d3a5a'], env.color, (c) => set('color', c)));
    s1.appendChild(L.el('p', 'menu-label', { text: 'Forro (aparece ao abrir)' }));
    s1.appendChild(optionRow(L.LINERS, env.liner, (v) => set('liner', v), { wrap: true }));

    const s2 = panelSection('Selo de cera');
    s2.appendChild(optionRow(
      Object.fromEntries(['❤', '✿', '★', '☾', '✉', '♛', '❀', '☀', '🦋', '🌷'].map((x) => [x, x])),
      env.seal, (v) => set('seal', v), { wrap: true },
    ));
    const custom = L.el('input', 'seal-input', { maxlength: '2', placeholder: 'Ou uma inicial', value: '' });
    custom.addEventListener('input', () => { if (custom.value.trim()) set('seal', custom.value.trim().toUpperCase()); });
    s2.appendChild(custom);
    s2.appendChild(L.el('p', 'menu-label', { text: 'Cor do selo' }));
    s2.appendChild(swatchRow(['#a8323e', '#7b2d8b', '#1f4e79', '#2f6b4f', '#b8862b', '#333333', '#d4708a'], env.sealColor, (c) => set('sealColor', c)));

    const s3 = panelSection('Selo postal');
    const stamps = L.el('div', 'stamp-grid');
    const none = L.el('button', 'stamp-btn stamp-none' + (!env.stamp ? ' active' : ''), { type: 'button', title: 'Sem selo', text: 'Sem' });
    none.addEventListener('click', () => { $$('.stamp-btn', stamps).forEach((b) => b.classList.remove('active')); none.classList.add('active'); set('stamp', ''); });
    stamps.appendChild(none);
    Object.entries(L.STAMPS).forEach(([key, def]) => {
      const btn = L.el('button', 'stamp-btn' + (env.stamp === key ? ' active' : ''), { type: 'button', title: def.label });
      btn.appendChild(L.stampEl(key));
      btn.addEventListener('click', () => {
        $$('.stamp-btn', stamps).forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        set('stamp', key);
      });
      stamps.appendChild(btn);
    });
    s3.appendChild(stamps);

    const s4 = panelSection('Abra quando…', 'Escrito no envelope. Na caixa da pessoa, essas cartas ficam guardadas numa seção à parte até ela abrir.');
    const label = L.el('input', '', { maxlength: '80', placeholder: 'Ex.: Abra quando estiver com saudade', value: env.label || '' });
    label.addEventListener('input', () => {
      env.label = label.value;
      refresh();
      typed();
    });
    s4.appendChild(label);
    const ideas = L.el('div', 'idea-chips');
    ['estiver com saudade', 'precisar rir', 'estiver triste', 'não conseguir dormir', 'for seu aniversário', 'estiver com medo', 'conquistar algo grande', 'brigarmos'].forEach((t) => {
      const chip = L.el('button', 'idea-chip', { type: 'button', text: t });
      chip.addEventListener('click', () => {
        label.value = 'Abra quando ' + t;
        env.label = label.value;
        refresh();
        commit();
      });
      ideas.appendChild(chip);
    });
    s4.appendChild(ideas);

    const s5 = panelSection('Efeito ao abrir', 'O que acontece na tela quando a carta sai do envelope.');
    s5.appendChild(optionRow(L.EFFECTS, state.content.effect || 'none', (v) => {
      state.content.effect = v;
      commit();
      L.playEffect(v, 3000);
    }, { wrap: true }));

    const s6 = panelSection('Como o texto aparece');
    s6.appendChild(optionRow({ fade: 'Bloco a bloco', write: 'Escrevendo', none: 'Tudo de uma vez' }, state.content.reveal || 'fade', (v) => {
      state.content.reveal = v;
      commit();
    }, { wrap: true }));
    s6.appendChild(L.el('p', 'panel-hint', { text: '"Escrevendo" faz o texto surgir letra por letra, como se você estivesse escrevendo naquela hora.' }));

    panelMusic();
  }

  // ----- música de fundo enquanto a pessoa lê -----
  function panelMusic() {
    const s = panelSection('Música enquanto lê', 'Começa a tocar quando a pessoa abre o envelope e continua baixinho durante a leitura.');
    const body = L.el('div', 'bgm-box');
    s.appendChild(body);
    const bgm = () => state.content.bgm || { kind: 'none' };
    const setBgm = (value) => {
      state.content.bgm = value;
      commit();
      draw();
    };

    function draw() {
      const cur = bgm();
      body.replaceChildren();
      if (cur.kind !== 'none') {
        const card = L.el('div', 'bgm-current');
        card.appendChild(L.icon(cur.kind === 'youtube' ? 'play' : 'music'));
        const info = L.el('div', 'bgm-info');
        info.appendChild(L.el('strong', '', { text: cur.name || (cur.kind === 'youtube' ? 'Vídeo do YouTube' : 'Sua música') }));
        info.appendChild(L.el('span', 'small muted', { text: cur.kind === 'youtube' ? 'YouTube' + (cur.start ? ' · começa em ' + L.fmtTime(cur.start) : '') : 'Arquivo de áudio' }));
        card.appendChild(info);
        const remove = L.el('button', 'icon-btn', { type: 'button', title: 'Tirar música', 'aria-label': 'Tirar música' });
        remove.appendChild(L.icon('x'));
        remove.addEventListener('click', () => setBgm({ kind: 'none' }));
        card.appendChild(remove);
        body.appendChild(card);

        if (cur.kind === 'file') {
          const audio = L.el('audio', 'bgm-test', { controls: true, preload: 'none', src: L.mediaUrl(cur.src) });
          body.appendChild(audio);
        }
        body.appendChild(L.el('p', 'menu-label', { text: 'Volume' }));
        const range = L.el('input', '', { type: 'range', min: '5', max: '100', value: String(Math.round((cur.volume ?? 0.6) * 100)), 'aria-label': 'Volume' });
        range.addEventListener('change', () => { cur.volume = Number(range.value) / 100; commit(); });
        body.appendChild(range);
        if (cur.kind === 'youtube') {
          const startRow = L.el('label', 'bgm-start');
          startRow.appendChild(L.el('span', '', { text: 'Começar em (min:seg)' }));
          const start = L.el('input', '', { value: cur.start ? L.fmtTime(cur.start) : '', placeholder: '0:00', inputmode: 'numeric', maxlength: '6' });
          start.addEventListener('change', () => {
            const m = start.value.trim().match(/^(\d{1,3})(?::(\d{1,2}))?$/);
            cur.start = m ? (m[2] !== undefined ? Number(m[1]) * 60 + Number(m[2]) : Number(m[1])) : 0;
            commit();
          });
          startRow.appendChild(start);
          body.appendChild(startRow);
        }
        return;
      }

      // nenhuma música: link do YouTube ou arquivo
      const linkRow = L.el('form', 'bgm-link');
      const input = L.el('input', '', { placeholder: 'Cole um link do YouTube', inputmode: 'url', 'aria-label': 'Link do YouTube' });
      const ok = L.el('button', 'btn btn-sm', { type: 'submit', text: 'Usar' });
      linkRow.append(input, ok);
      linkRow.addEventListener('submit', (e) => {
        e.preventDefault();
        const parsed = L.parseMusicUrl(input.value);
        if (!parsed || parsed.provider !== 'youtube') {
          toast(parsed && parsed.provider === 'spotify'
            ? 'O Spotify não deixa tocar sozinho. Use um link do YouTube ou envie o arquivo da música.'
            : 'Não reconheci esse link do YouTube.', 'error');
          return;
        }
        const t = input.value.match(/[?&](?:t|start)=(\d+)/);
        setBgm({ kind: 'youtube', mid: parsed.mid, name: '', start: t ? Number(t[1]) : 0, volume: 0.6 });
      });
      body.appendChild(linkRow);

      body.appendChild(L.el('p', 'or-line', { text: 'ou' }));
      const fileBtn = L.el('label', 'btn btn-sm btn-block');
      fileBtn.appendChild(L.icon('upload'));
      fileBtn.appendChild(document.createTextNode('Enviar um arquivo de música (mp3, m4a)'));
      const file = L.el('input', 'visually-hidden', { type: 'file', accept: 'audio/mpeg,audio/mp3,audio/mp4,audio/x-m4a,audio/ogg,.mp3,.m4a,.ogg' });
      fileBtn.appendChild(file);
      file.addEventListener('change', async () => {
        const f = file.files[0];
        if (!f) return;
        if (f.size > 12 * 1024 * 1024) {
          toast('A música passa de 12 MB. Tente uma versão menor.', 'error');
          return;
        }
        const fd = new FormData();
        fd.append('id', letterId);
        fd.append('audio', f, f.name);
        libraryCache = null;
        setStatus('saving', 'Enviando música…');
        try {
          const res = await api('upload', fd);
          setBgm({ kind: 'file', src: res.src, name: f.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 80), volume: 0.6 });
        } catch (err) {
          setStatus('error', err.message);
          toast(err.message, 'error');
        }
      });
      body.appendChild(fileBtn);
      body.appendChild(L.el('p', 'panel-hint', { text: 'Spotify não pode tocar sozinho, por isso aqui só vale YouTube ou arquivo. Um bloco de Música dentro da carta continua aceitando Spotify.' }));
    }
    draw();
  }

  // ----- biblioteca pessoal -----
  let libraryCache = null;
  let libraryFilter = 'all';

  async function fetchLibrary() {
    if (!libraryCache) {
      try {
        libraryCache = (await api('library', {})).items;
      } catch (err) {
        toast(err.message, 'error');
        libraryCache = [];
      }
    }
    return libraryCache;
  }

  function libraryGrid(items, onPick) {
    const grid = L.el('div', 'library-grid');
    items.forEach((item) => {
      const btn = L.el('button', 'library-item' + (item.kind === 'sticker' ? ' is-sticker' : ''), { type: 'button' });
      btn.appendChild(L.el('img', '', { src: L.mediaUrl(item.src), alt: '', loading: 'lazy' }));
      btn.addEventListener('click', (e) => onPick(item, e.currentTarget));
      grid.appendChild(btn);
    });
    return grid;
  }

  async function panelLibrary() {
    const sec = panelSection('Sua biblioteca', 'Tudo o que você já enviou fica aqui para usar de novo, em qualquer carta.');
    const actions = L.el('div', 'row wrap');
    const up = L.el('button', 'btn btn-sm', { type: 'button' });
    up.append(L.icon('upload', 'ic-sm'), L.el('span', '', { text: 'Enviar fotos' }));
    up.addEventListener('click', async () => {
      const files = await pickFile(true);
      for (const f of files) await uploadFile(f);
      renderPanel();
    });
    const st = L.el('button', 'btn btn-sm', { type: 'button' });
    st.append(L.icon('sticker', 'ic-sm'), L.el('span', '', { text: 'Figurinha' }));
    st.addEventListener('click', async () => {
      const file = await pickFile();
      if (!file) return;
      const final = await stickerDialog(file);
      if (final && await uploadFile(final, 'sticker')) renderPanel();
    });
    actions.append(up, st);
    sec.appendChild(actions);
    sec.appendChild(optionRow({ all: 'Tudo', sticker: 'Figurinhas', image: 'Fotos' }, libraryFilter, (v) => { libraryFilter = v; renderPanel(); }));
    const holder = L.el('div', '');
    holder.appendChild(L.el('p', 'panel-hint', { text: 'Carregando…' }));
    sec.appendChild(holder);
    const items = (await fetchLibrary()).filter((i) => libraryFilter === 'all' || i.kind === libraryFilter);
    if (activeTab !== 'library') return;
    holder.replaceChildren();
    if (!items.length) {
      holder.appendChild(L.el('p', 'panel-hint', { text: 'Nada por aqui ainda.' }));
      return;
    }
    holder.appendChild(libraryGrid(items, (item, anchor) => {
      const menu = L.el('div', 'ctx-menu');
      const act = (ic, label, fn, cls) => {
        const b = L.el('button', 'ctx-item ' + (cls || ''), { type: 'button' });
        b.append(L.icon(ic, 'ic-sm'), L.el('span', '', { text: label }));
        b.addEventListener('click', () => { closePopover(); fn(); });
        menu.appendChild(b);
      };
      const after = () => (lastFocusedId && findBlock(lastFocusedId) ? lastFocusedId : (blocks().length ? blocks()[blocks().length - 1].id : null));
      act('sticker', 'Colar como adesivo', () => addSticker({ kind: 'image', src: item.src, w: item.kind === 'sticker' ? 22 : 30 }));
      act('image', 'Inserir como foto', () => {
        const nb = newBlock('image');
        nb.src = item.src;
        insertBlockAfter(nb, after());
        commit();
      });
      act('paper', 'Usar como papel', () => {
        Object.assign(state.content.paper, { style: 'image', image: item.src });
        renderAll();
        commit();
      });
      act('template', 'Usar como fundo', () => {
        Object.assign(state.content.paper, { scene: 'image', sceneImage: item.src });
        L.applyPaper(scene, paper, state.content.paper);
        commit();
      });
      act('trash', 'Tirar da biblioteca', async () => {
        await api('library_remove', { src: item.src }).catch(() => {});
        libraryCache = null;
        renderPanel();
      }, 'danger');
      openPopover(anchor, menu);
    }));
  }

  /** Janela para escolher uma imagem da biblioteca (ou enviar uma nova). */
  function pickFromLibrary(title) {
    return new Promise(async (resolve) => {
      const dlg = L.el('dialog', 'pick-dialog');
      dlg.appendChild(L.el('h2', '', { text: title }));
      const up = L.el('button', 'btn btn-primary', { type: 'button' });
      up.append(L.icon('upload', 'ic-sm'), L.el('span', '', { text: 'Enviar uma imagem' }));
      const cancel = L.el('button', 'btn btn-ghost', { type: 'button', text: 'Cancelar' });
      const row = L.el('div', 'row wrap');
      row.append(up, cancel);
      dlg.appendChild(row);
      dlg.appendChild(L.el('p', 'menu-label', { text: 'Ou escolha da sua biblioteca' }));
      const holder = L.el('div', 'pick-grid');
      dlg.appendChild(holder);
      document.body.appendChild(dlg);
      const done = (v) => { dlg.close(); dlg.remove(); resolve(v); };
      cancel.addEventListener('click', () => done(null));
      dlg.addEventListener('cancel', () => done(null));
      up.addEventListener('click', async () => {
        const file = await pickFile();
        if (!file) return;
        const res = await uploadFile(file);
        if (res) done(res.src);
      });
      dlg.showModal();
      const items = (await fetchLibrary()).filter((i) => i.kind !== 'sticker');
      if (!items.length) holder.appendChild(L.el('p', 'panel-hint', { text: 'Sua biblioteca ainda está vazia.' }));
      else holder.appendChild(libraryGrid(items, (item) => done(item.src)));
    });
  }

  const KIND_LABEL = { emoji: 'Emoji', image: 'Imagem', text: 'Texto', tape: 'Fita', drawing: 'Desenho', doodle: 'Rabisco' };

  function panelLayers() {
    const sec = panelSection('Camadas', 'De cima para baixo: o primeiro fica na frente de todos.');
    if (!stickers().length) {
      sec.appendChild(L.el('p', 'panel-hint', { text: 'Nenhum adesivo ainda. Eles aparecem aqui conforme você adiciona.' }));
      return;
    }
    const list = L.el('div', 'layer-list');
    stickers().slice().reverse().forEach((s) => {
      const row = L.el('div', 'layer-row' + (s.id === selectedSticker ? ' active' : ''));
      const thumb = L.el('span', 'layer-thumb');
      const mini = L.stickerEl(Object.assign({}, s, { x: 50, w: 100, r: 0, o: 1 }));
      mini.classList.add('mini');
      thumb.appendChild(mini);
      const name = L.el('button', 'layer-name', { type: 'button' });
      name.textContent = s.kind === 'text' ? '“' + (s.text || '').slice(0, 18) + '”' : s.kind === 'emoji' ? s.char + ' ' + KIND_LABEL.emoji : (s.kind === 'doodle' ? (L.DOODLES[s.name] || {}).label || 'Rabisco' : KIND_LABEL[s.kind]);
      name.addEventListener('click', () => {
        selectSticker(s.id);
        stickerNode(s.id)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      const tools = L.el('span', 'layer-tools');
      const tb = (ic, title, fn) => {
        const b = L.el('button', 'layer-btn', { type: 'button', title, 'aria-label': title });
        b.appendChild(L.icon(ic, 'ic-sm'));
        b.addEventListener('click', fn);
        tools.appendChild(b);
      };
      tb('chevron-up', 'Subir', () => restack(s, 'up'));
      tb('chevron-down', 'Descer', () => restack(s, 'down'));
      tb(s.lk ? 'lock' : 'unlock', s.lk ? 'Destravar' : 'Travar', () => toggleLock(s));
      tb('trash', 'Excluir', () => deleteSticker(s.id));
      row.append(thumb, name, tools);
      if (s.lk) row.classList.add('locked');
      list.appendChild(row);
    });
    sec.appendChild(list);
  }

  function recipientName() {
    const checked = $('input[name="recipient"]:checked');
    const id = checked ? Number(checked.value) : DATA.letter.recipientId;
    const f = DATA.friends.find((x) => x.id === id);
    return f ? f.name : '';
  }

  // ---------------------------------------------------------------- histórico (desfazer/refazer)

  const history = { stack: [], index: -1 };
  let typingTimer = null;

  function snapshot() {
    return JSON.stringify({ title: state.title, content: state.content });
  }

  function pushHistory() {
    clearTimeout(typingTimer);
    typingTimer = null;
    const snap = snapshot();
    if (history.stack[history.index] === snap) return;
    history.stack = history.stack.slice(0, history.index + 1);
    history.stack.push(snap);
    if (history.stack.length > 120) history.stack.shift();
    history.index = history.stack.length - 1;
    updateUndoButtons();
  }

  function restore(delta) {
    if (typingTimer) pushHistory();
    const to = history.index + delta;
    if (to < 0 || to >= history.stack.length) return;
    history.index = to;
    const snap = JSON.parse(history.stack[to]);
    state.title = snap.title;
    state.content = snap.content;
    titleInput.value = state.title;
    closePopover();
    closeSlash();
    renderAll();
    renderPanel();
    updateUndoButtons();
    updateWordCount();
    markDirty();
  }

  function updateUndoButtons() {
    $('[data-undo]').disabled = history.index <= 0;
    $('[data-redo]').disabled = history.index >= history.stack.length - 1;
  }

  $('[data-undo]').addEventListener('click', () => restore(-1));
  $('[data-redo]').addEventListener('click', () => restore(1));

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === 'z' && document.activeElement !== titleInput) {
      e.preventDefault();
      restore(e.shiftKey ? 1 : -1);
    } else if (key === 'y' && document.activeElement !== titleInput) {
      e.preventDefault();
      restore(1);
    } else if (key === 's') {
      e.preventDefault();
      save();
    }
  });

  /** Mudança estrutural: entra no histórico na hora. */
  function commit() {
    pushHistory();
    markDirty();
  }

  /** Digitação: agrupa no histórico depois de uma pausa. */
  function typed() {
    markDirty();
    clearTimeout(typingTimer);
    typingTimer = setTimeout(pushHistory, 700);
  }

  // ---------------------------------------------------------------- salvamento automático

  const statusEl = $('[data-save-status]');
  let dirty = false;
  let saving = false;
  let saveTimer = null;
  let lastSavedAt = '';

  function setStatus(kind, text) {
    statusEl.dataset.state = kind;
    statusEl.textContent = text || {
      pending: 'Editando…',
      saving: 'Salvando…',
      saved: lastSavedAt ? 'Salvo às ' + lastSavedAt : 'Salvo',
      error: 'Não salvou. Tentar de novo',
    }[kind];
    statusEl.title = kind === 'error' && text ? text : '';
  }

  function markDirty() {
    dirty = true;
    setStatus('pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1200);
  }

  let checkpointNext = false;

  async function save() {
    clearTimeout(saveTimer);
    if (saving) {
      saveTimer = setTimeout(save, 400);
      return;
    }
    if (!dirty) return;
    saving = true;
    dirty = false;
    setStatus('saving');
    try {
      const res = await api('save', { id: letterId, title: state.title, content: state.content, checkpoint: checkpointNext });
      checkpointNext = false;
      lastSavedAt = res.savedAt;
      if (!dirty) setStatus('saved');
    } catch (err) {
      dirty = true;
      setStatus('error');
      statusEl.title = err.message;
    } finally {
      saving = false;
    }
  }

  async function flushSave() {
    while (dirty || saving) {
      if (!saving) await save();
      else await new Promise((r) => setTimeout(r, 150));
      if (statusEl.dataset.state === 'error') throw new Error('Não consegui salvar a carta.');
    }
  }

  statusEl.addEventListener('click', () => {
    if (statusEl.dataset.state === 'error') save();
  });
  window.addEventListener('beforeunload', (e) => {
    if (dirty || saving) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dirty) save();
  });

  // ---------------------------------------------------------------- contagem de palavras

  const wordsEl = $('[data-words]');
  function updateWordCount() {
    if (!wordsEl) return;
    const text = inner.innerText || '';
    const words = (text.match(/[\p{L}\p{N}]+/gu) || []).length;
    const minutes = Math.max(1, Math.round(words / 180));
    wordsEl.textContent = words + (words === 1 ? ' palavra' : ' palavras') + ' · ' + minutes + ' min de leitura';
  }
  let wordTimer = null;
  inner.addEventListener('input', () => {
    clearTimeout(wordTimer);
    wordTimer = setTimeout(updateWordCount, 400);
  });

  // ---------------------------------------------------------------- histórico de versões

  const versionsDialog = $('[data-versions]');

  async function openVersions() {
    closePopover();
    const list = $('[data-versions-list]', versionsDialog);
    const preview = $('[data-versions-preview]', versionsDialog);
    const restoreBtn = $('[data-versions-restore]', versionsDialog);
    list.replaceChildren(L.el('p', 'muted small', { text: 'Carregando…' }));
    preview.replaceChildren(L.el('p', 'muted small versions-empty', { text: 'Escolha uma versão para ver como estava.' }));
    restoreBtn.hidden = true;
    versionsDialog.showModal();
    // garante que o estado atual também fique guardado
    if (dirty || saving) {
      checkpointNext = true;
      await flushSave().catch(() => {});
    }
    let res;
    try {
      res = await api('versions', { id: letterId });
    } catch (err) {
      list.replaceChildren(L.el('p', 'muted small', { text: err.message }));
      return;
    }
    list.replaceChildren();
    if (!res.versions.length) {
      list.appendChild(L.el('p', 'muted small', { text: 'Ainda não há versões guardadas. Elas são criadas enquanto você escreve, a cada 10 minutos.' }));
      return;
    }
    res.versions.forEach((v, i) => {
      const item = L.el('button', 'version-item', { type: 'button' });
      item.append(L.el('strong', '', { text: i === 0 ? 'Mais recente' : v.ago }), L.el('span', '', { text: v.when }));
      item.addEventListener('click', async () => {
        $$('.version-item', list).forEach((x) => x.classList.remove('active'));
        item.classList.add('active');
        const data = await api('version', { id: letterId, version_id: v.id });
        const holder = L.el('div', 'versions-render');
        preview.replaceChildren(holder);
        L.renderLetter(holder, data.content);
        holder.style.transform = 'scale(' + Math.min(1, preview.clientWidth / 760) + ')';
        restoreBtn.hidden = false;
        restoreBtn.onclick = () => {
          state.title = data.title;
          state.content = data.content;
          titleInput.value = state.title;
          versionsDialog.close();
          renderAll();
          renderPanel();
          commit();
          toast('Versão restaurada. Se mudar de ideia, use desfazer.');
        };
      });
      list.appendChild(item);
    });
  }
  $('[data-open-versions]')?.addEventListener('click', openVersions);
  $('[data-close-versions]')?.addEventListener('click', () => versionsDialog.close());
  versionsDialog?.addEventListener('click', (e) => { if (e.target === versionsDialog) versionsDialog.close(); });

  // ---------------------------------------------------------------- paleta de comandos (Ctrl+K)

  const palette = $('[data-palette]');
  const paletteInput = $('[data-palette-input]');
  const paletteList = $('[data-palette-list]');
  let paletteItems = [];
  let paletteIndex = 0;

  function paletteCommands() {
    const after = () => (lastFocusedId && findBlock(lastFocusedId) ? lastFocusedId : (blocks().length ? blocks()[blocks().length - 1].id : null));
    const tab = (key) => () => { $('[data-tab="' + key + '"]').click(); if (isMobile()) panel.classList.add('sheet-open'); };
    return [
      ...BLOCKS.map((d) => ({ icon: d.icon, label: 'Inserir ' + d.label.toLowerCase(), hint: d.desc, words: d.words, run: () => insertNewBlock(d.key, after()) })),
      { icon: 'brush', label: 'Desenhar à mão livre', words: 'desenho rabisco caneta', run: startDrawing },
      { icon: 'sticker', label: 'Abrir adesivos', words: 'emoji fita rabisco', run: tab('stickers') },
      { icon: 'paper', label: 'Trocar papel e letra', words: 'papel fonte letra cor cenario borda', run: tab('paper') },
      { icon: 'mail', label: 'Personalizar envelope', words: 'envelope selo carimbo efeito abra quando', run: tab('envelope') },
      { icon: 'layers', label: 'Ver camadas', words: 'camadas ordem adesivos', run: tab('layers') },
      { icon: 'sparkle', label: 'Testar efeito de abertura', words: 'efeito confete coracoes', run: () => L.playEffect(state.content.effect || 'hearts', 3000) },
      { icon: 'history', label: 'Histórico de versões', words: 'versoes restaurar voltar', run: openVersions },
      { icon: 'eye', label: 'Abrir prévia', words: 'previa visualizar ver', run: () => window.open('carta.php?id=' + letterId, '_blank') },
      { icon: 'send', label: 'Enviar carta', words: 'enviar destinatario mandar', run: () => $('[data-open-send]').click() },
      { icon: 'undo', label: 'Desfazer', words: 'voltar', run: () => restore(-1) },
      { icon: 'redo', label: 'Refazer', words: '', run: () => restore(1) },
    ];
  }

  function openPalette() {
    closePopover();
    paletteInput.value = '';
    paletteIndex = 0;
    renderPalette();
    palette.showModal();
    paletteInput.focus();
  }

  function renderPalette() {
    const q = normalize(paletteInput.value.trim());
    paletteItems = paletteCommands().filter((c) => !q || normalize(c.label + ' ' + (c.words || '')).includes(q)).slice(0, 40);
    paletteIndex = Math.min(paletteIndex, Math.max(0, paletteItems.length - 1));
    paletteList.replaceChildren();
    if (!paletteItems.length) paletteList.appendChild(L.el('p', 'muted small palette-empty', { text: 'Nada encontrado.' }));
    paletteItems.forEach((c, i) => {
      const item = L.el('button', 'palette-item' + (i === paletteIndex ? ' active' : ''), { type: 'button' });
      const ic = L.el('span', 'palette-icon');
      ic.appendChild(L.icon(c.icon));
      item.append(ic, L.el('span', 'palette-label', { text: c.label }));
      if (c.hint) item.appendChild(L.el('span', 'palette-hint', { text: c.hint }));
      item.addEventListener('mousemove', () => {
        if (paletteIndex !== i) { paletteIndex = i; highlightPalette(); }
      });
      item.addEventListener('click', () => runPalette(i));
      paletteList.appendChild(item);
    });
  }

  function highlightPalette() {
    $$('.palette-item', paletteList).forEach((n, i) => n.classList.toggle('active', i === paletteIndex));
    $$('.palette-item', paletteList)[paletteIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function runPalette(i) {
    const c = paletteItems[i];
    palette.close();
    if (c) setTimeout(c.run, 30);
  }

  paletteInput.addEventListener('input', () => { paletteIndex = 0; renderPalette(); });
  paletteInput.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!paletteItems.length) return;
      paletteIndex = (paletteIndex + (e.key === 'ArrowDown' ? 1 : -1) + paletteItems.length) % paletteItems.length;
      highlightPalette();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runPalette(paletteIndex);
    }
  });
  palette.addEventListener('click', (e) => { if (e.target === palette) palette.close(); });
  $('[data-open-palette]')?.addEventListener('click', openPalette);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (palette.open) palette.close();
      else openPalette();
    }
  });

  // ---------------------------------------------------------------- envio

  const dialog = $('[data-send-dialog]');
  const sendForm = $('[data-send-form]');
  const scheduleToggle = $('[data-schedule-toggle]');
  const schedule = $('[data-schedule]');
  const openAt = $('[data-open-at]');
  const sendPreview = $('[data-send-preview]');

  function refreshSendPreview() {
    sendPreview.replaceChildren(L.renderEnvelope(state.content.envelope, recipientName() || '…', {
      paperColor: state.content.paper.color,
      locked: scheduleToggle.checked && !!openAt.value,
    }));
  }

  $('[data-open-send]').addEventListener('click', () => {
    $$('[data-send-step]', dialog).forEach((s) => { s.hidden = s.dataset.sendStep !== 'choose'; });
    scheduleToggle.checked = !!DATA.letter.openAt;
    openAt.value = DATA.letter.openAt || '';
    schedule.hidden = !scheduleToggle.checked;
    refreshSendPreview();
    dialog.showModal();
  });
  $('[data-close-send]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  $$('input[name="recipient"]', dialog).forEach((r) => r.addEventListener('change', refreshSendPreview));
  scheduleToggle.addEventListener('change', () => {
    schedule.hidden = !scheduleToggle.checked;
    if (scheduleToggle.checked && !openAt.value) {
      const d = new Date(Date.now() + 86400000);
      d.setHours(9, 0, 0, 0);
      openAt.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + 'T09:00';
    }
    refreshSendPreview();
  });
  openAt.addEventListener('change', refreshSendPreview);

  sendForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const checked = $('input[name="recipient"]:checked', dialog);
    if (!checked) {
      toast('Escolha para quem vai a carta.', 'error');
      return;
    }
    const btn = $('[data-send-submit]');
    btn.disabled = true;
    try {
      await flushSave();
      const when = scheduleToggle.checked && openAt.value ? openAt.value : '';
      const res = await api('send', { id: letterId, recipient_id: Number(checked.value), open_at: when });
      DATA.letter.recipientId = Number(checked.value);
      DATA.letter.openAt = when;
      DATA.letter.status = 'sent';
      $('[data-open-send] .send-label').textContent = 'Envio';
      $('[data-sent-title]').textContent = res.firstSend ? 'A caminho de ' + res.recipient : 'Envio atualizado';
      $('[data-sent-text]').textContent = when
        ? res.recipient + ' já vê o envelope lacrado. Ele só abre na data que você escolheu.'
        : res.recipient + ' vai encontrar a carta na caixa da próxima vez que entrar.';
      $('[data-sent-view]').textContent = 'Ver como ' + res.recipient + ' vai ver';
      if (DATA.letter.sentBefore !== true) L.playEffect(state.content.effect, 2600);
      DATA.letter.sentBefore = true;
      $$('[data-send-step]', dialog).forEach((s) => { s.hidden = s.dataset.sendStep !== 'done'; });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // ---------------------------------------------------------------- início

  let lastFocusedId = null;
  renderAll();
  renderPanel();
  pushHistory();
  updateWordCount();
  setStatus('saved', 'Tudo salvo');

  // Foca o primeiro texto vazio para já sair escrevendo
  const firstEmpty = blocks().find((b) => TEXT_TYPES.includes(b.type) && !b.html);
  if (firstEmpty && !isMobile()) focusBlock(firstEmpty.id, 'start');
})();
