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
    { key: 'paragraph', icon: '¶', label: 'Texto', desc: 'Um parágrafo simples', words: 'texto paragrafo', make: () => ({ type: 'paragraph', html: '' }) },
    { key: 'h1', icon: 'H1', label: 'Título', desc: 'Título grande', words: 'titulo heading h1', make: () => ({ type: 'heading', level: 1, html: '' }) },
    { key: 'h2', icon: 'H2', label: 'Subtítulo', desc: 'Título médio', words: 'subtitulo h2', make: () => ({ type: 'heading', level: 2, html: '' }) },
    { key: 'h3', icon: 'H3', label: 'Título pequeno', desc: 'Para separar partes', words: 'titulo pequeno h3', make: () => ({ type: 'heading', level: 3, html: '' }) },
    { key: 'quote', icon: '❝', label: 'Citação', desc: 'Uma frase em destaque', words: 'citacao quote frase', make: () => ({ type: 'quote', html: '' }) },
    { key: 'list', icon: '•', label: 'Lista', desc: 'Lista com marcadores', words: 'lista bullet marcadores', make: () => ({ type: 'list', style: 'bullet', items: [''] }) },
    { key: 'numbered', icon: '1.', label: 'Lista numerada', desc: 'Lista com números', words: 'lista numerada numeros', make: () => ({ type: 'list', style: 'number', items: [''] }) },
    { key: 'checklist', icon: '☑', label: 'Lista de desejos', desc: 'Coisas para fazermos juntos', words: 'checklist tarefas desejos', make: () => ({ type: 'checklist', items: [{ checked: false, html: '' }] }) },
    { key: 'callout', icon: '💡', label: 'Destaque', desc: 'Caixinha colorida com emoji', words: 'destaque callout caixa', make: () => ({ type: 'callout', emoji: '💌', bg: '#fde8e4', html: '' }) },
    { key: 'image', icon: '🖼️', label: 'Foto', desc: 'Polaroid, moldura ou simples', words: 'foto imagem image polaroid', make: () => ({ type: 'image', src: '', caption: '', frame: 'polaroid', width: 'md', tilt: -2 }) },
    { key: 'divider', icon: '〰', label: 'Divisória', desc: 'Separador decorado', words: 'divisoria separador linha', make: () => ({ type: 'divider', style: 'hearts' }) },
    { key: 'secret', icon: '🔒', label: 'Segredo', desc: 'Texto escondido até tocar', words: 'segredo secreto surpresa', make: () => ({ type: 'secret', label: 'Toque para revelar um segredo', html: '' }) },
    { key: 'music', icon: '🎵', label: 'Música', desc: 'YouTube ou Spotify', words: 'musica youtube spotify som', make: () => ({ type: 'music', provider: '', kind: '', mid: '' }) },
    { key: 'signature', icon: '✍️', label: 'Assinatura', desc: 'Despedida com seu nome', words: 'assinatura despedida nome', make: () => ({ type: 'signature', closing: 'Com carinho,', name: DATA.sender, date: DATA.today }) },
    { key: 'spacer', icon: '↕', label: 'Espaço', desc: 'Um respiro entre blocos', words: 'espaco espacamento', make: () => ({ type: 'spacer', height: 40 }) },
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
      const empty = L.el('button', 'eb-empty', { type: 'button', text: '＋ Clique para começar a escrever' });
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
    const add = L.el('button', 'eb-add', { type: 'button', title: 'Adicionar bloco abaixo', text: '+' });
    const handle = L.el('button', 'eb-handle', { type: 'button', title: 'Arraste para mover · clique para opções', text: '⋮⋮' });
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
        pick.innerHTML = '<span class="img-upload-icon">📷</span><span>Escolher foto</span><small>ou arraste uma imagem aqui</small>';
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
      head.append(L.el('span', 'secret-lock', { text: '🔒' }), label);
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
        const change = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: '🎵 Trocar música' });
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
      form.innerHTML = '<span class="music-icon">🎵</span>';
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
    } else if (nb.type === 'music') {
      $('input', blockNode(nb.id))?.focus();
    } else if (nb.type === 'secret') {
      focusEditable($('.secret-content', blockNode(nb.id)), 'start');
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
        L.el('span', 'block-icon', { text: d.icon }),
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
    const row = L.el('div', 'opt-row' + (opts.wrap ? ' wrap' : ''));
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
      }, { titles: Object.fromEntries(keys.map((k) => [k, BLOCKS.find((d) => d.key === k).label])) }));
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
      const replace = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: '📷 Trocar foto' });
      replace.addEventListener('click', async () => {
        closePopover();
        const file = await pickFile();
        if (file) setBlockImage(b, file);
      });
      s.appendChild(replace);
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

    if (!['image', 'divider', 'music', 'spacer'].includes(b.type)) {
      const s = section('Alinhamento');
      s.appendChild(optionRow({ left: '⇤ Esq.', center: '↔ Centro', right: 'Dir. ⇥' }, b.align, (v) => update(() => { b.align = v; })));
      s.appendChild(L.el('p', 'menu-label', { text: 'Tamanho do texto' }));
      s.appendChild(optionRow({ '': 'Auto', sm: 'P', md: 'M', lg: 'G', xl: 'GG' }, b.size || '', (v) => update(() => { b.size = v; })));
      s.appendChild(L.el('p', 'menu-label', { text: 'Fonte' }));
      s.appendChild(fontSelect(b.font, (v) => update(() => { b.font = v; }), true));
      s.appendChild(L.el('p', 'menu-label', { text: 'Cor do texto' }));
      s.appendChild(swatchRow(L.ACCENT_COLORS, b.color, (c) => update(() => { b.color = c; }), { allowNone: true, noneLabel: 'Cor da tinta' }));
      menu.appendChild(s);
    } else if (b.type === 'image') {
      const s = section('Posição');
      s.appendChild(optionRow({ left: '⇤', center: '↔', right: '⇥' }, b.align, (v) => update(() => { b.align = v; })));
      menu.appendChild(s);
    }

    const actions = section();
    actions.classList.add('menu-actions');
    const act = (label, fn, cls) => {
      const btn = L.el('button', 'menu-action ' + (cls || ''), { type: 'button', text: label });
      btn.addEventListener('click', () => {
        closePopover();
        fn();
      });
      actions.appendChild(btn);
    };
    act('↑ Subir', () => moveBlock(b.id, -1));
    act('↓ Descer', () => moveBlock(b.id, 1));
    act('⧉ Duplicar', () => duplicateBlock(b));
    act('🗑 Excluir', () => { removeBlock(b.id); commit(); }, 'danger');
    menu.appendChild(actions);

    openPopover(anchor, menu, { className: 'block-menu-popover' });
  }

  // ---------------------------------------------------------------- barra de formatação

  const HIGHLIGHTS = ['#fff3a3', '#ffd6e0', '#d4f5dd', '#d6ecff', '#eadcff', '#ffe2c7'];
  const fmtBar = L.el('div', 'format-bar', { role: 'toolbar', 'aria-label': 'Formatação' });
  const FMT = [
    ['bold', '<b>B</b>', 'Negrito (Ctrl+B)'],
    ['italic', '<i>I</i>', 'Itálico (Ctrl+I)'],
    ['underline', '<u>U</u>', 'Sublinhado (Ctrl+U)'],
    ['strikeThrough', '<s>S</s>', 'Riscado'],
    ['color', '<span class="fmt-color">A</span>', 'Cor do texto'],
    ['highlight', '<span class="fmt-hl">🖍</span>', 'Marca-texto'],
    ['size', '<span class="fmt-size">aA</span>', 'Tamanho'],
    ['link', '🔗', 'Link'],
    ['removeFormat', '⌫', 'Limpar formatação'],
  ];
  FMT.forEach(([cmd, html, title]) => {
    const btn = L.el('button', 'fmt-btn', { type: 'button', title, 'data-cmd': cmd, html });
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
  function pickFile() {
    return new Promise((resolve) => {
      fileInput.value = '';
      const done = () => {
        fileInput.removeEventListener('change', done);
        resolve(fileInput.files[0] || null);
      };
      fileInput.addEventListener('change', done);
      fileInput.click();
    });
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('id', letterId);
    fd.append('image', file);
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
    node.addEventListener('dblclick', () => editStickerText(s));
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
      if (on) addHandles(n, stickers().find((s) => s.id === n.dataset.id));
    });
    buildStickerBar();
    positionStickerBar();
  }

  function addHandles(node, s) {
    const rot = L.el('span', 'sh sh-rotate', { title: 'Girar' });
    const res = L.el('span', 'sh sh-resize', { title: 'Redimensionar' });
    rot.addEventListener('pointerdown', (e) => handleDrag(e, s, node, 'rotate'));
    res.addEventListener('pointerdown', (e) => handleDrag(e, s, node, 'resize'));
    node.append(rot, res);
  }

  function stickerPointerDown(e, s, node) {
    if (e.button !== 0 || node.querySelector('[contenteditable="true"], [contenteditable="plaintext-only"]')) return;
    e.preventDefault();
    e.stopPropagation();
    if (document.activeElement && document.activeElement.isContentEditable) document.activeElement.blur();
    const wasSelected = selectedSticker === s.id;
    selectSticker(s.id);
    const pr = paper.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const cx0 = (s.x * pr.width) / 100;
    const cy0 = parseFloat(node.style.top) || 0;
    let moved = false;
    node.setPointerCapture(e.pointerId);
    node.classList.add('moving');

    const move = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.hypot(dx, dy) < 3) return;
      moved = true;
      s.x = round(((cx0 + dx) / pr.width) * 100);
      node.style.setProperty('--x', s.x);
      node.style.top = cy0 + dy + 'px';
      positionStickerBar();
    };
    const up = () => {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
      node.classList.remove('moving');
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

  function buildStickerBar() {
    stickerBar.replaceChildren();
    const s = stickers().find((x) => x.id === selectedSticker);
    stickerBar.classList.toggle('show', !!s);
    if (!s) return;
    const btn = (label, title, fn, cls) => {
      const b = L.el('button', 'sb-btn ' + (cls || ''), { type: 'button', title, text: label });
      b.addEventListener('click', fn);
      stickerBar.appendChild(b);
      return b;
    };
    if (s.kind === 'text') {
      btn('✏️', 'Editar texto', () => editStickerText(s));
      const font = fontSelect(s.font, (v) => {
        s.font = v;
        refreshStickerNode(s);
        commit();
      });
      stickerBar.appendChild(font);
      btn('🎨', 'Cor e estilo', (e) => {
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
    }
    if (s.kind === 'tape') {
      btn('🎀', 'Trocar estampa', () => {
        s.pattern = L.TAPES[(L.TAPES.indexOf(s.pattern) + 1) % L.TAPES.length];
        refreshStickerNode(s);
        commit();
      });
    }
    btn('⧉', 'Duplicar', () => {
      const copy = JSON.parse(JSON.stringify(s));
      copy.id = L.uid();
      copy.x = Math.min(100, s.x + 4);
      copy.y = s.y + 3;
      stickers().push(copy);
      layer.appendChild(buildSticker(copy));
      selectSticker(copy.id);
      layout();
      commit();
    });
    btn('⬆', 'Trazer para frente', () => {
      state.content.stickers = stickers().filter((x) => x !== s).concat([s]);
      renderStickers();
      commit();
    });
    btn('⬇', 'Enviar para trás', () => {
      state.content.stickers = [s].concat(stickers().filter((x) => x !== s));
      renderStickers();
      commit();
    });
    btn('🗑', 'Excluir (Delete)', () => deleteSticker(s.id), 'danger');
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
    if (e.key === 'Delete' || e.key === 'Backspace') {
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
    bar.appendChild(L.el('span', 'draw-title', { text: '✏️ Desenhe no papel' }));
    bar.appendChild(swatchRow(L.ACCENT_COLORS.concat(['#ffffff']), drawing.color, (c) => { drawing.color = c; }));
    bar.appendChild(optionRow({ 2: 'Fino', 4: 'Médio', 9: 'Grosso' }, 4, (v) => { drawing.size = Number(v); }));
    const undo = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: '↶ Traço' });
    undo.addEventListener('click', () => {
      drawing.strokes.pop();
      redrawCanvas();
    });
    const cancel = L.el('button', 'btn btn-sm btn-ghost', { type: 'button', text: 'Cancelar' });
    cancel.addEventListener('click', () => stopDrawing(false));
    const done = L.el('button', 'btn btn-sm btn-primary', { type: 'button', text: 'Concluir ✓' });
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
    ({ blocks: panelBlocks, stickers: panelStickers, paper: panelPaper, envelope: panelEnvelope })[activeTab]();
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
      t.append(L.el('span', 'tile-icon', { text: d.icon }), L.el('span', 'tile-label', { text: d.label }));
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
      t.append(L.el('span', 'tile-icon', { text: { none: 'Aa', label: '🏷️', note: '🗒️', bubble: '💬' }[style] }), L.el('span', 'tile-label', { text: label }));
      t.addEventListener('click', () => {
        const s = addSticker({ kind: 'text', text: style === 'note' ? 'Lembra disso?' : 'Escreva aqui', font: state.content.paper.font, color: state.content.paper.ink, style, w: style === 'note' ? 26 : 30 });
        setTimeout(() => editStickerText(s), 50);
      });
      grid.appendChild(t);
    });
    s3.appendChild(grid);

    const s4 = panelSection('Desenho e imagens');
    const draw = L.el('button', 'btn btn-block', { type: 'button', text: '✏️ Desenhar à mão livre' });
    draw.addEventListener('click', startDrawing);
    const img = L.el('button', 'btn btn-block btn-ghost', { type: 'button', text: '📷 Imagem como adesivo' });
    img.addEventListener('click', async () => {
      const file = await pickFile();
      if (!file) return;
      const res = await uploadFile(file);
      if (res) addSticker({ kind: 'image', src: res.src, w: 30 });
    });
    s4.append(draw, img, L.el('p', 'panel-hint', { text: 'PNG com fundo transparente fica com cara de adesivo de verdade.' }));
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
      btn.append(sample, L.el('span', '', { text: label }));
      btn.addEventListener('click', () => {
        $$('.paper-tile', grid).forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        set('style', key);
      });
      grid.appendChild(btn);
    });
    s1.appendChild(grid);
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
      btn.appendChild(L.el('span', '', { text: label }));
      btn.addEventListener('click', () => {
        $$('.scene-tile', scenes).forEach((t) => t.classList.remove('active'));
        btn.classList.add('active');
        set('scene', key);
      });
      scenes.appendChild(btn);
    });
    s4.appendChild(scenes);
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
      error: 'Não salvou — tentar de novo',
    }[kind];
    statusEl.title = kind === 'error' && text ? text : '';
  }

  function markDirty() {
    dirty = true;
    setStatus('pending');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 1200);
  }

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
      const res = await api('save', { id: letterId, title: state.title, content: state.content });
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
      $('[data-open-send]').innerHTML = '✉<span class="hide-sm"> Envio</span>';
      $('[data-sent-title]').textContent = res.firstSend ? 'Carta enviada para ' + res.recipient + '! 💌' : 'Envio atualizado ✓';
      $('[data-sent-text]').textContent = when
        ? res.recipient + ' já vê o envelope, mas só vai conseguir abrir na data escolhida.'
        : res.recipient + ' vai encontrar a carta na caixinha da próxima vez que entrar no site.';
      $('[data-sent-view]').textContent = '👁 Ver como ' + res.recipient + ' vai ver';
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
  setStatus('saved', 'Tudo salvo');

  // Foca o primeiro texto vazio para já sair escrevendo
  const firstEmpty = blocks().find((b) => TEXT_TYPES.includes(b.type) && !b.html);
  if (firstEmpty && !isMobile()) focusBlock(firstEmpty.id, 'start');
})();
