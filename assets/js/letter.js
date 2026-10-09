/*
 * Renderizador compartilhado das cartas (leitura e editor).
 * As listas de opções espelham app/content.php — mantenha as duas em sincronia.
 */
(function () {
  'use strict';

  const FONTS = {
    caveat: { label: 'Caveat', css: "'Caveat', cursive", scale: 1.3 },
    dancing: { label: 'Dancing Script', css: "'Dancing Script', cursive", scale: 1.2 },
    indie: { label: 'Indie Flower', css: "'Indie Flower', cursive", scale: 1.05 },
    patrick: { label: 'Patrick Hand', css: "'Patrick Hand', cursive", scale: 1.12 },
    shadows: { label: 'Shadows Into Light', css: "'Shadows Into Light', cursive", scale: 1.15 },
    homemade: { label: 'Homemade Apple', css: "'Homemade Apple', cursive", scale: 0.85 },
    gloria: { label: 'Gloria Hallelujah', css: "'Gloria Hallelujah', cursive", scale: 0.92 },
    special: { label: 'Máquina de escrever', css: "'Special Elite', monospace", scale: 0.95 },
    playfair: { label: 'Playfair (elegante)', css: "'Playfair Display', serif", scale: 1 },
    lora: { label: 'Lora (livro)', css: "'Lora', serif", scale: 1 },
    nunito: { label: 'Nunito (simples)', css: "'Nunito', sans-serif", scale: 1 },
    quicksand: { label: 'Quicksand (redonda)', css: "'Quicksand', sans-serif", scale: 1 },
  };

  const PAPERS = {
    plain: 'Liso', lined: 'Pautado', grid: 'Quadriculado', dots: 'Pontilhado',
    kraft: 'Kraft', vintage: 'Antigo', parchment: 'Pergaminho',
  };
  const BORDERS = {
    none: 'Sem borda', simple: 'Simples', double: 'Dupla', dashed: 'Tracejada',
    stamp: 'Selo postal', hearts: 'Corações', flowers: 'Flores',
  };
  const SCENES = {
    desk: 'Mesa de madeira', pink: 'Rosa suave', sky: 'Céu', night: 'Noite estrelada', garden: 'Jardim', plain: 'Neutro',
  };
  const LINERS = { plain: 'Liso', stripes: 'Listras', dots: 'Bolinhas', hearts: 'Corações', stars: 'Estrelas' };
  const DIVIDERS = {
    line: 'Linha', dashed: 'Tracejado', dots: 'Pontinhos', hearts: 'Corações',
    stars: 'Estrelas', flowers: 'Flores', wave: 'Onda',
  };
  const DIVIDER_TEXT = { dots: '• • •', hearts: '♡  ♥  ♡', stars: '✦  ✧  ✦', flowers: '✿  ❀  ✿' };
  const FRAMES = { plain: 'Simples', polaroid: 'Polaroid', rounded: 'Arredondada', tape: 'Com fita', circle: 'Círculo' };
  const TAPES = ['pink', 'mint', 'yellow', 'lilac', 'dots', 'stripes', 'grid', 'hearts'];
  const TEXT_STYLES = { none: 'Só texto', label: 'Etiqueta', note: 'Post-it', bubble: 'Balão' };

  const PAPER_COLORS = ['#fffdf6', '#ffffff', '#fdf1e6', '#fce8ec', '#eaf4ec', '#e8f0fb', '#f3ecfb', '#fff6cc', '#2d2a35'];
  const INK_COLORS = ['#3b3340', '#1f2a44', '#7a2e3a', '#2f5d50', '#5b3f8c', '#8a5a2b', '#000000', '#fdf6e9'];
  const ACCENT_COLORS = ['#e86a7e', '#f29e4c', '#e8c547', '#6bbf8a', '#5aa9e6', '#9b7be0', '#d16ba5', '#3b3340'];
  const SIZE_MUL = { '': 1, sm: 0.85, md: 1, lg: 1.3, xl: 1.75 };

  function uid() {
    return 'b' + Math.random().toString(36).slice(2, 10);
  }

  function mediaUrl(src) {
    return 'media.php?f=' + encodeURIComponent(src);
  }

  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false) continue;
        if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    return node;
  }

  function parseMusicUrl(url) {
    url = (url || '').trim();
    let m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
    if (m) return { provider: 'youtube', kind: 'video', mid: m[1] };
    m = url.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{22})/);
    if (m) return { provider: 'spotify', kind: m[1], mid: m[2] };
    m = url.match(/^spotify:(track|album|playlist|episode):([A-Za-z0-9]{22})$/);
    if (m) return { provider: 'spotify', kind: m[1], mid: m[2] };
    return null;
  }

  function musicEmbed(b) {
    if (!b.provider || !b.mid) return null;
    const wrap = el('div', 'music-embed music-' + b.provider);
    const src = b.provider === 'youtube'
      ? 'https://www.youtube-nocookie.com/embed/' + b.mid + '?rel=0'
      : 'https://open.spotify.com/embed/' + b.kind + '/' + b.mid;
    wrap.appendChild(el('iframe', '', {
      src, loading: 'lazy', title: 'Música',
      allow: 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture',
      allowfullscreen: true, frameborder: '0',
    }));
    return wrap;
  }

  /** Aplica estilos de papel e cena. */
  function applyPaper(scene, paper, p) {
    if (scene) {
      scene.className = scene.className.replace(/\bscene-\S+/g, '').trim() + ' scene-' + (p.scene || 'desk');
    }
    paper.className = 'paper paper-' + (p.style || 'lined') + ' border-' + (p.border || 'none') + ' size-' + (p.size || 'md')
      + (isDark(p.color) ? ' paper-dark' : '');
    const font = FONTS[p.font] || FONTS.caveat;
    paper.style.setProperty('--paper', p.color || '#fffdf6');
    paper.style.setProperty('--ink', p.ink || '#3b3340');
    paper.style.setProperty('--font', font.css);
    paper.style.setProperty('--font-scale', font.scale);
  }

  function isDark(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return false;
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum < 0.45;
  }

  /** Estilos comuns do bloco (alinhamento, fonte, tamanho, cor). */
  function applyBlockStyle(node, b, paper) {
    node.dataset.id = b.id;
    node.classList.add('lb', 'lb-' + b.type);
    node.style.textAlign = b.align && b.align !== 'left' ? b.align : '';
    let mul = SIZE_MUL[b.size || ''] || 1;
    if (b.font && FONTS[b.font]) {
      node.style.fontFamily = FONTS[b.font].css;
      mul *= FONTS[b.font].scale / (FONTS[paper.font] || FONTS.caveat).scale;
    } else {
      node.style.fontFamily = '';
    }
    node.style.fontSize = mul !== 1 ? mul.toFixed(3) + 'em' : '';
    node.style.color = b.color || '';
  }

  /** Renderiza um bloco para leitura. */
  function renderBlock(b, paper) {
    const node = el('div');
    applyBlockStyle(node, b, paper);
    switch (b.type) {
      case 'heading':
        node.appendChild(el('h' + (b.level || 1), 'lb-text', { html: b.html || '' }));
        break;
      case 'paragraph':
        node.appendChild(el('p', 'lb-text', { html: b.html || '' }));
        break;
      case 'quote':
        node.appendChild(el('blockquote', 'lb-text', { html: b.html || '' }));
        break;
      case 'list': {
        const list = el(b.style === 'number' ? 'ol' : 'ul', 'lb-list');
        (b.items || []).forEach((item) => list.appendChild(el('li', '', { html: item })));
        node.appendChild(list);
        break;
      }
      case 'checklist': {
        const list = el('ul', 'lb-checklist');
        (b.items || []).forEach((item) => {
          const li = el('li', item.checked ? 'checked' : '');
          li.appendChild(el('span', 'check-box', { 'aria-hidden': 'true', text: item.checked ? '✓' : '' }));
          li.appendChild(el('span', 'check-text', { html: item.html }));
          list.appendChild(li);
        });
        node.appendChild(list);
        break;
      }
      case 'callout': {
        const box = el('div', 'callout');
        box.style.setProperty('--callout', b.bg || '#fde8e4');
        box.appendChild(el('span', 'callout-icon', { text: b.emoji || '💌' }));
        box.appendChild(el('div', 'lb-text', { html: b.html || '' }));
        node.appendChild(box);
        break;
      }
      case 'image':
        node.appendChild(renderImageFigure(b));
        break;
      case 'divider':
        node.appendChild(renderDivider(b));
        break;
      case 'secret': {
        const box = el('div', 'secret');
        const btn = el('button', 'secret-cover', { type: 'button' });
        btn.appendChild(el('span', 'secret-lock', { text: '🔒', 'aria-hidden': 'true' }));
        btn.appendChild(el('span', '', { text: b.label || 'Toque para revelar um segredo' }));
        btn.addEventListener('click', () => box.classList.add('revealed'));
        box.appendChild(btn);
        box.appendChild(el('div', 'secret-content lb-text', { html: b.html || '' }));
        node.appendChild(box);
        break;
      }
      case 'music': {
        const embed = musicEmbed(b);
        if (embed) node.appendChild(embed);
        break;
      }
      case 'signature':
        node.appendChild(renderSignature(b));
        break;
      case 'spacer':
        node.style.height = (b.height || 40) + 'px';
        break;
    }
    return node;
  }

  function renderImageFigure(b) {
    const fig = el('figure', 'lb-figure frame-' + (b.frame || 'polaroid') + ' w-' + (b.width || 'md'));
    fig.style.setProperty('--tilt', (b.tilt || 0) + 'deg');
    if (b.src) {
      fig.appendChild(el('img', '', { src: mediaUrl(b.src), alt: b.caption || '', loading: 'lazy' }));
    } else {
      fig.appendChild(el('div', 'img-placeholder', { text: '🖼️' }));
    }
    if (b.caption || b.frame === 'polaroid') {
      fig.appendChild(el('figcaption', '', { text: b.caption || '' }));
    }
    return fig;
  }

  function renderDivider(b) {
    const div = el('div', 'divider divider-' + (b.style || 'hearts'), { role: 'separator' });
    if (DIVIDER_TEXT[b.style]) div.appendChild(el('span', '', { text: DIVIDER_TEXT[b.style] }));
    return div;
  }

  function renderSignature(b) {
    const wrap = el('div', 'signature');
    if (b.closing) wrap.appendChild(el('p', 'sig-closing', { text: b.closing }));
    if (b.name) wrap.appendChild(el('p', 'sig-name', { text: b.name }));
    if (b.date) wrap.appendChild(el('p', 'sig-date', { text: b.date }));
    return wrap;
  }

  // ---------- Adesivos ----------

  function stickerEl(s) {
    const node = el('div', 'sticker sticker-' + s.kind);
    node.dataset.id = s.id;
    updateStickerBox(node, s);
    fillSticker(node, s);
    return node;
  }

  function updateStickerBox(node, s) {
    node.style.setProperty('--x', s.x);
    node.style.setProperty('--w', s.w);
    node.style.setProperty('--r', (s.r || 0) + 'deg');
  }

  function fillSticker(node, s) {
    node.replaceChildren();
    switch (s.kind) {
      case 'emoji':
        node.appendChild(el('span', 'st-emoji', { text: s.char }));
        break;
      case 'image':
        node.appendChild(el('img', '', { src: mediaUrl(s.src), alt: '', draggable: 'false' }));
        break;
      case 'text': {
        const t = el('div', 'st-text st-' + (s.style || 'none'), { text: s.text || '' });
        t.style.fontFamily = (FONTS[s.font] || FONTS.caveat).css;
        t.style.setProperty('--st-scale', (FONTS[s.font] || FONTS.caveat).scale);
        t.style.color = s.color || '#3b3340';
        node.appendChild(t);
        break;
      }
      case 'tape':
        node.appendChild(el('div', 'st-tape tape-' + (s.pattern || 'pink')));
        break;
      case 'drawing': {
        const ns = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 ' + s.vw + ' ' + s.vh);
        svg.setAttribute('class', 'st-drawing');
        (s.paths || []).forEach((p) => {
          const path = document.createElementNS(ns, 'path');
          path.setAttribute('d', p.d);
          path.setAttribute('stroke', p.c);
          path.setAttribute('stroke-width', p.s);
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          svg.appendChild(path);
        });
        node.appendChild(svg);
        break;
      }
    }
  }

  /** Posiciona cada adesivo verticalmente a partir do bloco ao qual está preso. */
  function layoutStickers(paper, stickers) {
    const layer = paper.querySelector('.sticker-layer');
    if (!layer) return;
    const paperRect = paper.getBoundingClientRect();
    const width = paperRect.width || 1;
    let maxBottom = 0;
    stickers.forEach((s) => {
      const node = layer.querySelector('.sticker[data-id="' + s.id + '"]');
      if (!node) return;
      const top = anchorTop(paper, s.anchor, paperRect) + (s.y * width) / 100;
      node.style.top = top + 'px';
      const h = node.offsetHeight || 0;
      maxBottom = Math.max(maxBottom, top + h / 2);
    });
    const blocks = paper.querySelector('.paper-inner');
    const contentBottom = blocks ? blocks.offsetTop + blocks.offsetHeight : 0;
    paper.style.minHeight = maxBottom > contentBottom ? Math.ceil(maxBottom + 24) + 'px' : '';
  }

  function anchorTop(paper, anchor, paperRect) {
    if (!anchor) return 0;
    const block = paper.querySelector('.lb[data-id="' + anchor + '"]');
    if (!block) return 0;
    return block.getBoundingClientRect().top - (paperRect || paper.getBoundingClientRect()).top;
  }

  /** Monta a carta completa para leitura. */
  function renderLetter(container, content) {
    const scene = el('div', 'letter-scene');
    const paper = el('div', 'paper');
    applyPaper(scene, paper, content.paper || {});
    const inner = el('div', 'paper-inner');
    (content.blocks || []).forEach((b) => inner.appendChild(renderBlock(b, content.paper || {})));
    paper.appendChild(inner);
    const layer = el('div', 'sticker-layer');
    (content.stickers || []).forEach((s) => layer.appendChild(stickerEl(s)));
    paper.appendChild(layer);
    scene.appendChild(paper);
    container.replaceChildren(scene);

    const relayout = () => layoutStickers(paper, content.stickers || []);
    relayout();
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(inner);
    if (document.fonts) document.fonts.ready.then(relayout);
    paper.querySelectorAll('img').forEach((img) => img.addEventListener('load', relayout));
    return { scene, paper, relayout };
  }

  // ---------- Envelope ----------

  function renderEnvelope(env, toName, opts) {
    opts = opts || {};
    const wrap = el('div', 'envelope' + (opts.locked ? ' locked' : ''));
    wrap.style.setProperty('--env', env.color || '#e9b8b0');
    wrap.style.setProperty('--seal', env.sealColor || '#a8323e');
    wrap.appendChild(el('div', 'env-back'));
    wrap.appendChild(el('div', 'env-liner liner-' + (env.liner || 'plain')));
    const letter = el('div', 'env-letter');
    if (opts.paperColor) letter.style.background = opts.paperColor;
    letter.appendChild(el('span', 'env-letter-lines'));
    wrap.appendChild(letter);
    wrap.appendChild(el('div', 'env-front'));
    const flap = el('div', 'env-flap');
    flap.appendChild(el('div', 'env-flap-inner liner-' + (env.liner || 'plain')));
    wrap.appendChild(flap);
    const seal = el(opts.interactive ? 'button' : 'span', 'env-seal', opts.interactive ? { type: 'button', 'aria-label': 'Abrir a carta' } : null);
    seal.appendChild(el('span', 'env-seal-face', { text: opts.locked ? '🔒' : (env.seal || '❤') }));
    wrap.appendChild(seal);
    if (toName) wrap.appendChild(el('div', 'env-label', { text: 'Para ' + toName }));
    return wrap;
  }

  window.Letter = {
    FONTS, PAPERS, BORDERS, SCENES, LINERS, DIVIDERS, FRAMES, TAPES, TEXT_STYLES,
    PAPER_COLORS, INK_COLORS, ACCENT_COLORS, SIZE_MUL,
    uid, el, mediaUrl, parseMusicUrl, musicEmbed, isDark,
    applyPaper, applyBlockStyle, renderBlock, renderImageFigure, renderDivider, renderSignature,
    stickerEl, updateStickerBox, fillSticker, layoutStickers, anchorTop,
    renderLetter, renderEnvelope,
  };
})();
