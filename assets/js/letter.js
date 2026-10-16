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
    kraft: 'Kraft', vintage: 'Antigo', parchment: 'Pergaminho', image: 'Sua imagem',
  };
  const BORDERS = {
    none: 'Sem borda', simple: 'Simples', double: 'Dupla', dashed: 'Tracejada',
    stamp: 'Selo postal', hearts: 'Corações', flowers: 'Flores',
  };
  const SCENES = {
    desk: 'Mesa de madeira', pink: 'Rosa suave', sky: 'Céu', night: 'Noite estrelada', garden: 'Jardim', plain: 'Neutro', image: 'Sua imagem',
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

  // Rabiscos desenhados à mão (viewBox 0 0 100 100). "fill" = preenchido.
  const DOODLES = {
    heart: { label: 'Coração', d: 'M50 83C22 63 9 47 13 31 17 16 37 12 50 31 63 12 83 15 87 31 91 47 78 63 50 83Z' },
    'heart-fill': { label: 'Coração cheio', fill: true, d: 'M50 83C22 63 9 47 13 31 17 16 37 12 50 31 63 12 83 15 87 31 91 47 78 63 50 83Z' },
    star: { label: 'Estrela', d: 'M50 9 61 37 91 39 67 58 76 89 50 72 24 89 33 58 9 39 39 37Z' },
    sparkle: { label: 'Brilho', fill: true, d: 'M50 6C53 38 62 47 94 50 62 53 53 62 50 94 47 62 38 53 6 50 38 47 47 38 50 6Z' },
    arrow: { label: 'Seta', d: 'M10 72C28 32 58 22 86 34M86 34 70 22M86 34 73 49' },
    'arrow-loop': { label: 'Seta com laço', d: 'M8 64C24 42 46 40 46 56 46 71 25 69 30 52 36 33 62 29 90 44M90 44 75 33M90 44 77 58' },
    swirl: { label: 'Espiral', d: 'M50 50C50 44 58 44 58 50 58 58 46 60 42 52 36 42 48 32 58 36 72 41 70 62 56 68 38 76 23 60 27 43 31 26 52 18 68 24' },
    squiggle: { label: 'Rabisco', d: 'M5 55C13 39 22 39 28 55 34 71 42 71 48 55 54 39 62 39 68 55 74 71 83 71 95 51' },
    circle: { label: 'Círculo', d: 'M50 13C77 11 93 32 89 55 85 79 58 91 35 85 13 79 5 54 13 33 21 17 44 9 68 18' },
    underline: { label: 'Sublinhado', d: 'M5 48C30 42 61 57 95 44M14 60C40 55 62 64 87 57' },
    flower: { label: 'Flor', d: 'M50 43C37 22 63 22 50 43M57 48C76 36 83 61 58 54M55 58C66 79 43 82 50 60M45 58C33 78 17 63 42 53M43 48C20 44 29 21 50 43M50 60V93M50 80C58 72 66 72 70 74' },
    leaf: { label: 'Folha', d: 'M18 82C18 42 48 18 86 15 84 53 60 82 18 82ZM18 82C38 62 55 45 70 30' },
    cloud: { label: 'Nuvem', d: 'M27 71C13 71 11 52 25 50 23 35 42 29 50 40 56 25 79 27 79 46 93 46 93 71 76 71Z' },
    sun: { label: 'Sol', d: 'M50 34A16 16 0 1 0 50.1 34ZM50 7V19M50 81V93M7 50H19M81 50H93M20 20 28 28M72 72 80 80M80 20 72 28M28 72 20 80' },
    moon: { label: 'Lua', d: 'M62 13C39 18 27 40 33 61 40 81 65 90 85 77 60 78 45 60 49 39 51 27 56 19 62 13Z' },
    smile: { label: 'Carinha', d: 'M50 12A38 38 0 1 0 50.1 12ZM37 39V45M63 39V45M31 59C40 73 60 73 69 59' },
    xo: { label: 'XO', d: 'M10 33 36 63M36 33 10 63M67 33C51 33 49 63 67 63 84 63 82 33 67 33Z' },
    crown: { label: 'Coroa', d: 'M13 72 19 31 36 52 50 23 64 52 81 31 87 72ZM13 81H87' },
    bow: { label: 'Laço', d: 'M50 48C36 28 13 32 17 49 21 64 40 60 50 48 60 60 79 64 83 49 87 32 64 28 50 48ZM50 48 39 82M50 48 62 82' },
    note: { label: 'Nota musical', d: 'M27 74A10 8 0 1 0 47 74 10 8 0 1 0 27 74ZM47 74V22L79 15V65M59 65A10 8 0 1 0 79 65 10 8 0 1 0 59 65Z' },
  };

  // Selos postais ilustrados (viewBox 0 0 60 72)
  const STAMPS = {
    heart: { label: 'Coração', bg: '#f4d6d1', svg: '<path d="M30 52C14 41 9 32 12 24c3-7 12-8 18 1 6-9 15-8 18-1 3 8-2 17-18 28z" fill="#b8323b"/>' },
    flower: { label: 'Flor', bg: '#e6edd4', svg: '<path d="M30 40v20" stroke="#5c7d3a" stroke-width="2.5"/><path d="M30 52c5-6 10-6 12-5" stroke="#5c7d3a" stroke-width="2.5" fill="none"/><g fill="#e48aa0"><circle cx="30" cy="20" r="6.5"/><circle cx="39" cy="27" r="6.5"/><circle cx="36" cy="37" r="6.5"/><circle cx="24" cy="37" r="6.5"/><circle cx="21" cy="27" r="6.5"/></g><circle cx="30" cy="29" r="5" fill="#f2c14e"/>' },
    bird: { label: 'Passarinho', bg: '#d9e7ef', svg: '<path d="M14 40c4-12 16-17 26-12l8-4-3 7c2 9-6 19-19 18-5 0-9-3-12-9z" fill="#3f6f95"/><path d="M22 36c5 1 11-1 15-6" stroke="#d9e7ef" stroke-width="2" fill="none"/><circle cx="41" cy="29" r="1.4" fill="#fff"/><path d="M10 56h40" stroke="#7a5a3a" stroke-width="2"/>' },
    moon: { label: 'Lua', bg: '#262b4d', svg: '<path d="M36 14c-10 2-16 12-13 22 3 11 15 16 25 10-12 0-19-10-17-20 1-5 3-9 5-12z" fill="#f5d77a"/><g fill="#fff"><circle cx="16" cy="18" r="1.2"/><circle cx="46" cy="52" r="1.2"/><circle cx="14" cy="48" r="1"/><circle cx="48" cy="20" r="1"/></g>' },
    coffee: { label: 'Café', bg: '#f0e1cc', svg: '<path d="M15 32h26v9c0 8-6 13-13 13s-13-5-13-13z" fill="#8a5a3c"/><path d="M41 35c6 0 6 9 0 9" stroke="#8a5a3c" stroke-width="3" fill="none"/><path d="M22 26c-3-4 3-6 0-10M30 26c-3-4 3-6 0-10" stroke="#b08a6a" stroke-width="2" fill="none"/><path d="M12 58h34" stroke="#8a5a3c" stroke-width="2.5"/>' },
    mountain: { label: 'Montanhas', bg: '#dce9f2', svg: '<circle cx="42" cy="20" r="6" fill="#f2b84b"/><path d="M4 58l18-26 10 13 8-9 16 22z" fill="#4c7a5a"/><path d="M22 32l5 7-5-2-4 3z" fill="#fff"/>' },
    wave: { label: 'Mar', bg: '#e1f0f2', svg: '<path d="M4 38c6-6 12-6 18 0s12 6 18 0 12-6 16 0v22H4z" fill="#3d8fa6"/><path d="M4 46c6-6 12-6 18 0s12 6 18 0 12-6 16 0" stroke="#bfe3ea" stroke-width="2" fill="none"/><circle cx="18" cy="20" r="6" fill="#f2b84b"/>' },
    plane: { label: 'Aviãozinho', bg: '#f8e5cf', svg: '<path d="M10 34l40-16-12 34-8-12z" fill="#fff" stroke="#c4683a" stroke-width="2" stroke-linejoin="round"/><path d="M30 40l20-22" stroke="#c4683a" stroke-width="2"/><path d="M8 52c6 4 10-4 16 0" stroke="#c4683a" stroke-width="2" stroke-dasharray="3 3" fill="none"/>' },
    cat: { label: 'Gatinho', bg: '#efe2f1', svg: '<path d="M14 50V26l8 7h16l8-7v24c0 6-7 9-16 9s-16-3-16-9z" fill="#5a4a5e"/><circle cx="24" cy="41" r="2.2" fill="#f2d16b"/><circle cx="36" cy="41" r="2.2" fill="#f2d16b"/><path d="M28 47h4l-2 2z" fill="#f4a3b5"/>' },
    sun: { label: 'Sol', bg: '#fff0bf', svg: '<circle cx="30" cy="34" r="11" fill="#f0a531"/><g stroke="#f0a531" stroke-width="2.5" stroke-linecap="round"><path d="M30 13v6M30 49v6M9 34h6M45 34h6M15 19l4 4M41 45l4 4M45 19l-4 4M19 45l-4 4"/></g>' },
  };

  const EFFECTS = { none: 'Nenhum', hearts: 'Corações', confetti: 'Confete', petals: 'Pétalas', stars: 'Estrelas', snow: 'Neve' };
  const GALLERY_LAYOUTS = { scatter: 'Espalhadas', grid: 'Grade', strip: 'Filme' };

  const PAPER_COLORS = ['#fffdf6', '#ffffff', '#fdf1e6', '#fce8ec', '#eaf4ec', '#e8f0fb', '#f3ecfb', '#fff6cc', '#2d2a35'];
  const INK_COLORS = ['#3b3340', '#1f2a44', '#7a2e3a', '#2f5d50', '#5b3f8c', '#8a5a2b', '#000000', '#fdf6e9'];
  const ACCENT_COLORS = ['#e86a7e', '#f29e4c', '#e8c547', '#6bbf8a', '#5aa9e6', '#9b7be0', '#d16ba5', '#3b3340'];
  const SIZE_MUL = { '': 1, sm: 0.85, md: 1, lg: 1.3, xl: 1.75 };

  function uid() {
    return 'b' + Math.random().toString(36).slice(2, 10);
  }

  /** Ícone do arquivo assets/icons.svg */
  function icon(name, cls) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'ic' + (cls ? ' ' + cls : ''));
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', 'assets/icons.svg#' + name);
    svg.appendChild(use);
    return svg;
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
      // O YouTube recusa vídeos embutidos sem saber de qual site vêm (erro 153).
      // Só o endereço do site é enviado, nunca a página da carta.
      referrerpolicy: 'strict-origin-when-cross-origin',
    }));
    if (b.provider === 'youtube') {
      const link = el('a', 'music-open', { href: 'https://www.youtube.com/watch?v=' + b.mid, target: '_blank', rel: 'noopener', text: 'Abrir no YouTube' });
      wrap.appendChild(link);
    }
    return wrap;
  }

  /** Aplica estilos de papel e cena. */
  function applyPaper(scene, paper, p) {
    if (scene) {
      const sceneKey = p.scene === 'image' && !p.sceneImage ? 'plain' : (p.scene || 'desk');
      scene.className = scene.className.replace(/\bscene-\S+/g, '').trim() + ' scene-' + sceneKey;
      if (sceneKey === 'image') {
        // endereço absoluto: dentro de uma variável CSS, url() relativo seria resolvido a partir do arquivo .css
        scene.style.setProperty('--scene-img', 'url("' + new URL(mediaUrl(p.sceneImage), location.href).href + '")');
        scene.style.setProperty('--scene-blur', (p.sceneBlur || 0) + 'px');
        scene.style.setProperty('--scene-dim', p.sceneDim || 0);
      } else {
        scene.style.removeProperty('--scene-img');
      }
    }
    const usesImage = p.style === 'image' && p.image;
    paper.className = 'paper paper-' + (usesImage ? 'image' : (p.style === 'image' ? 'plain' : (p.style || 'lined')))
      + ' border-' + (p.border || 'none') + ' size-' + (p.size || 'md') + (p.layout === 2 ? ' layout-2' : '')
      + (paper.dataset.fluid === '1' ? ' paper-fluid' : '')
      + ((usesImage ? p.veilDark : isDark(p.color)) ? ' paper-dark' : '');
    const font = FONTS[p.font] || FONTS.caveat;
    paper.style.setProperty('--paper', p.color || '#fffdf6');
    paper.style.setProperty('--ink', p.ink || '#3b3340');
    paper.style.setProperty('--font', font.css);
    paper.style.setProperty('--font-scale', font.scale);
    if (usesImage) {
      // Véu por cima da imagem, para o texto continuar legível
      const v = p.veil === undefined ? 0.35 : p.veil;
      const c = p.veilDark ? 'rgba(18, 14, 12, ' + v + ')' : 'rgba(255, 253, 248, ' + v + ')';
      const tile = p.imageFit === 'tile';
      paper.style.backgroundImage = 'linear-gradient(' + c + ', ' + c + '), url("' + mediaUrl(p.image) + '")';
      paper.style.backgroundSize = '100% 100%, ' + (tile ? '360px auto' : (p.imageFit === 'contain' ? 'contain' : 'cover'));
      paper.style.backgroundRepeat = 'no-repeat, ' + (tile ? 'repeat' : 'no-repeat');
      paper.style.backgroundPosition = 'center, center';
    } else {
      paper.style.backgroundImage = '';
      paper.style.backgroundSize = '';
      paper.style.backgroundRepeat = '';
      paper.style.backgroundPosition = '';
    }
  }

  function isDark(hex) {
    if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return false;
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    return lum < 0.45;
  }

  function isBlank(html) {
    return !html || html.replace(/<br\s*\/?>|&nbsp;|\s/g, '') === '';
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

  /**
   * Renderiza um bloco para leitura.
   * ctx (opcional): { interaction, onInteract(blockId, value) → Promise, sender, otherName }
   * — usado pelos blocos interativos (pergunta, vale).
   */
  function renderBlock(b, paper, ctx) {
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
        (b.items || []).filter((item) => !isBlank(item)).forEach((item) => list.appendChild(el('li', '', { html: item })));
        node.appendChild(list);
        break;
      }
      case 'checklist': {
        const list = el('ul', 'lb-checklist');
        (b.items || []).filter((item) => !isBlank(item.html)).forEach((item) => {
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
      case 'gallery':
        node.appendChild(renderGallery(b));
        break;
      case 'phototext': {
        const row = el('div', 'phototext side-' + (b.side || 'left'));
        row.appendChild(renderImageFigure({ src: b.src, frame: b.frame || 'polaroid', width: 'lg', tilt: b.side === 'right' ? 2 : -2, caption: '' }));
        row.appendChild(el('div', 'phototext-text lb-text', { html: b.html || '' }));
        node.appendChild(row);
        break;
      }
      case 'audio':
        if (b.src) node.appendChild(renderAudio(b));
        break;
      case 'scratch':
        node.appendChild(renderScratch(b, true));
        break;
      case 'pagebreak':
        break;
      case 'spacer':
        node.style.height = 'calc(' + (b.height || 40) + ' * var(--u))';
        break;
      default:
        if (EXTRA_RENDERERS[b.type]) node.appendChild(EXTRA_RENDERERS[b.type](b, ctx || {}));
    }
    return node;
  }

  // ---------- Blocos: sanfona, linha do tempo, contador, pergunta, vale, poema, lugar, colunas, botão ----------
  // Cada um recebe (b, ctx). No editor, ctx.editing = true e ctx.field cria os campos editáveis:
  // a estrutura (e o tamanho) do bloco é a mesma na leitura e na edição.

  /** Põe um campo de texto: na leitura, só se tiver conteúdo (ou se always); na edição, sempre. */
  function putField(ctx, parent, tag, cls, value, kind, placeholder, onChange, always) {
    let node;
    if (ctx.editing && ctx.field) node = ctx.field(tag, cls, value, kind, placeholder, onChange);
    else if (!always && (kind === 'html' ? isBlank(value) : !String(value || '').trim())) return null;
    else node = el(tag, cls, kind === 'html' ? { html: value || '' } : { text: value || '' });
    parent.appendChild(node);
    return node;
  }

  const PREVIEW_HINT = 'Quem receber vai poder responder';

  /** Quem está vendo um bloco interativo: 'edit', 'sender' (só lê o resultado), 'recipient' ou 'preview'. */
  function interactiveState(ctx) {
    if (ctx.editing) return 'edit';
    if (ctx.sender) return 'sender';
    return ctx.onInteract ? 'recipient' : 'preview';
  }

  function fmtShortDate(iso) {
    const d = iso ? new Date(iso) : new Date();
    if (isNaN(d)) return '';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function renderToggle(b, ctx) {
    const box = el('div', 'toggle');
    const chev = el('span', 'toggle-chev', { 'aria-hidden': 'true' });
    chev.appendChild(icon('chevron-down'));
    if (ctx.editing) {
      box.classList.add('editing', 'open');
      const head = el('div', 'toggle-head');
      head.appendChild(chev);
      putField(ctx, head, 'span', 'toggle-title', b.title, 'plain', 'Título da sanfona', (v) => { b.title = v; });
      box.appendChild(head);
      putField(ctx, box, 'div', 'toggle-body toggle-inner lb-text', b.html, 'html', 'O que aparece quando abrir…', (v) => { b.html = v; });
      return box;
    }
    const bodyId = 'tg-' + b.id + '-' + Math.random().toString(36).slice(2, 6);
    const head = el('button', 'toggle-head', { type: 'button', 'aria-expanded': 'false', 'aria-controls': bodyId });
    head.append(chev, el('span', 'toggle-title', { text: b.title || 'Toque para abrir' }));
    const body = el('div', 'toggle-body', { id: bodyId, hidden: true });
    body.appendChild(el('div', 'toggle-inner lb-text', { html: b.html || '' }));
    box.append(head, body);
    let anim = 0;
    const quiet = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.reduceMotion === '1';
    head.addEventListener('click', () => {
      const open = head.getAttribute('aria-expanded') !== 'true';
      head.setAttribute('aria-expanded', String(open));
      box.classList.toggle('open', open);
      clearTimeout(anim);
      if (quiet()) {
        body.hidden = !open;
        body.style.height = '';
        return;
      }
      body.hidden = false;
      const full = body.scrollHeight;
      body.style.height = (open ? 0 : full) + 'px';
      void body.offsetHeight; // aplica a altura inicial antes da transição
      body.style.height = (open ? full : 0) + 'px';
      anim = setTimeout(() => {
        body.style.height = '';
        if (!open) body.hidden = true;
      }, 320);
    });
    return box;
  }

  function renderTimeline(b, ctx) {
    const list = el('ol', 'story-line');
    (b.items || []).forEach((it, i) => {
      const li = el('li', 'story-item');
      li.appendChild(el('span', 'story-dot', { 'aria-hidden': 'true' }));
      putField(ctx, li, 'div', 'story-date', it.date, 'plain', 'Quando? (ex.: março de 2021)', (v) => { it.date = v; });
      putField(ctx, li, 'div', 'story-title', it.title, 'plain', 'O que aconteceu', (v) => { it.title = v; });
      putField(ctx, li, 'div', 'story-text lb-text', it.html, 'html', 'Conte um pouco…', (v) => { it.html = v; });
      if (ctx.itemTools) ctx.itemTools(li, i);
      list.appendChild(li);
    });
    return list;
  }

  const COUNTER_UNITS = {
    anos: ['ano', 'anos'], meses: ['mês', 'meses'], dias: ['dia', 'dias'],
    horas: ['hora', 'horas'], min: ['minuto', 'minutos'], seg: ['segundo', 'segundos'],
  };
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  function parseCounterDate(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/.exec(s || '');
    if (!m) return null;
    const d = new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0);
    return isNaN(d) ? null : d;
  }

  function fmtCounterDate(s) {
    const d = parseCounterDate(s);
    if (!d) return '';
    let t = d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear();
    if (s.indexOf('T') > 0) t += ' às ' + String(d.getHours()).padStart(2, '0') + 'h' + String(d.getMinutes()).padStart(2, '0');
    return t;
  }

  /** Partes do contador: desde (anos, meses, dias) ou até (dias, horas, minutos, segundos). */
  function counterParts(b, now) {
    const d = parseCounterDate(b.date);
    if (!d) return null;
    if (b.mode === 'until') {
      const s = Math.max(0, Math.floor((d - now) / 1000));
      return { done: s === 0, parts: [[Math.floor(s / 86400), 'dias'], [Math.floor((s % 86400) / 3600), 'horas'], [Math.floor((s % 3600) / 60), 'min'], [s % 60, 'seg']] };
    }
    if (now < d) return { parts: [[0, 'anos'], [0, 'meses'], [0, 'dias']] };
    let y = now.getFullYear() - d.getFullYear();
    let mo = now.getMonth() - d.getMonth();
    let day = now.getDate() - d.getDate();
    if (now.getHours() * 60 + now.getMinutes() < d.getHours() * 60 + d.getMinutes()) day--;
    if (day < 0) {
      mo--;
      day += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    }
    if (mo < 0) {
      y--;
      mo += 12;
    }
    return { parts: [[y, 'anos'], [mo, 'meses'], [day, 'dias']] };
  }

  function renderCounter(b, ctx) {
    const box = el('div', 'counter counter-' + (b.mode === 'until' ? 'until' : 'since'));
    putField(ctx, box, 'p', 'counter-label', b.label, 'plain', b.mode === 'until' ? 'Faltam' : 'Juntos há', (v) => { b.label = v; });
    const nums = el('div', 'counter-nums');
    const foot = el('p', 'counter-date');
    box.append(nums, foot);
    let shape = '';
    const paint = () => {
      const r = counterParts(b, new Date());
      const key = !r ? 'none' : r.done ? 'done' : r.parts.map((p) => p[1]).join();
      if (key !== shape) {
        shape = key;
        box.classList.toggle('counter-done', key === 'done');
        if (!r) nums.replaceChildren(el('span', 'counter-empty', { text: ctx.editing ? 'Escolha a data no menu do bloco' : '—' }));
        else if (r.done) nums.replaceChildren(el('span', 'counter-party', { text: 'Chegou o dia! 🎉' }));
        else {
          nums.replaceChildren(...r.parts.map(() => {
            const cell = el('span', 'counter-cell');
            cell.append(el('b'), el('small'));
            return cell;
          }));
        }
      }
      if (r && !r.done) {
        r.parts.forEach(([n, unit], i) => {
          const cell = nums.children[i];
          const txt = String(n);
          if (cell.firstChild.textContent !== txt) cell.firstChild.textContent = txt;
          cell.lastChild.textContent = n === 1 ? COUNTER_UNITS[unit][0] : COUNTER_UNITS[unit][1];
        });
      }
      foot.textContent = r ? (b.mode === 'until' ? 'até ' : 'desde ') + fmtCounterDate(b.date) : '';
    };
    paint();
    // Atualiza a cada segundo só enquanto aparece na tela
    if (window.IntersectionObserver) {
      let timer = 0;
      const stop = () => {
        clearInterval(timer);
        timer = 0;
        box.dataset.live = '0';
      };
      const io = new IntersectionObserver((entries) => {
        const visible = entries[entries.length - 1].isIntersecting;
        if (visible && !timer) {
          paint();
          box.dataset.live = '1';
          timer = setInterval(() => {
            if (!box.isConnected) {
              stop();
              io.disconnect();
              return;
            }
            paint();
          }, 1000);
        } else if (!visible && timer) stop();
      });
      io.observe(box);
    }
    return box;
  }

  function renderQuiz(b, ctx) {
    const box = el('div', 'quiz');
    const mode = interactiveState(ctx);
    putField(ctx, box, 'p', 'quiz-q', b.question, 'plain', 'Sua pergunta…', (v) => { b.question = v; }, true);
    const list = el('div', 'quiz-options', { role: 'group', 'aria-label': b.question || 'Opções' });
    const foot = el('p', 'quiz-foot', { 'aria-live': 'polite' });
    const LETTERS = 'ABCD';
    const options = b.options || [];
    const opts = options.map((o, i) => {
      const btn = el(mode === 'edit' ? 'div' : 'button', 'quiz-opt', mode === 'edit' ? null : { type: 'button' });
      btn.appendChild(el('span', 'quiz-letter', { text: LETTERS[i], 'aria-hidden': 'true', contenteditable: mode === 'edit' ? 'false' : null }));
      putField(ctx, btn, 'span', 'quiz-text', o, 'plain', 'Opção ' + LETTERS[i], (v) => { options[i] = v; }, true);
      if (mode === 'edit' && b.answer === i) {
        btn.classList.add('is-answer');
        btn.appendChild(el('span', 'quiz-badge', { text: '✓ certa', contenteditable: 'false' }));
      }
      list.appendChild(btn);
      return btn;
    });
    box.append(list, foot);

    const chosen = ctx.interaction && /^\d$/.test(ctx.interaction.value) ? Number(ctx.interaction.value) : -1;
    const showResult = (choice) => {
      box.classList.add('answered');
      opts.forEach((btn, i) => {
        btn.disabled = true;
        btn.classList.toggle('chosen', i === choice);
        btn.classList.toggle('correct', b.answer >= 0 && i === b.answer);
        btn.classList.toggle('wrong', b.answer >= 0 && i === choice && choice !== b.answer);
        if (i === choice) btn.setAttribute('aria-pressed', 'true');
      });
      if (mode === 'sender') {
        const verdict = b.answer < 0 ? '' : choice === b.answer ? ' ✓' : ' ✗';
        foot.textContent = (ctx.otherName || 'Quem recebeu') + ' respondeu: ' + (options[choice] || LETTERS[choice]) + verdict;
      } else if (b.answer < 0) {
        foot.textContent = b.right || 'Resposta guardada! 💌';
      } else {
        foot.textContent = choice === b.answer ? (b.right || 'Acertou! 🎉') : (b.wrong || 'Quase! A resposta certa está marcada.');
      }
      foot.classList.toggle('is-right', b.answer < 0 || choice === b.answer);
    };

    if (mode === 'edit' || mode === 'preview') {
      foot.textContent = PREVIEW_HINT;
      foot.classList.add('quiz-hint');
      if (mode === 'edit') foot.contentEditable = 'false';
      else opts.forEach((btn) => { btn.disabled = true; });
    } else if (chosen >= 0 && chosen < options.length) {
      showResult(chosen);
    } else if (mode === 'sender') {
      opts.forEach((btn) => { btn.disabled = true; });
      foot.textContent = 'Ainda sem resposta.';
      foot.classList.add('quiz-hint');
    } else {
      foot.textContent = 'Toque numa opção';
      foot.classList.add('quiz-hint');
      let busy = false;
      opts.forEach((btn, i) => btn.addEventListener('click', async () => {
        if (busy || box.classList.contains('answered')) return;
        busy = true;
        box.classList.add('busy');
        try {
          await ctx.onInteract(b.id, String(i));
          foot.classList.remove('quiz-hint');
          showResult(i);
        } catch (err) {
          foot.textContent = (err && err.message) || 'Não deu para guardar sua resposta. Tente de novo.';
        } finally {
          busy = false;
          box.classList.remove('busy');
        }
      }));
    }
    return box;
  }

  function renderCoupon(b, ctx) {
    const wrap = el('div', 'coupon');
    wrap.style.setProperty('--coupon', b.bg || '#f6d7c3');
    const ticket = el('div', 'coupon-ticket');
    const stub = el('div', 'coupon-stub');
    stub.appendChild(el(ctx.editing ? 'button' : 'span', 'coupon-emoji', ctx.editing
      ? { type: 'button', contenteditable: 'false', title: 'Trocar emoji', text: b.emoji || '🎟️' }
      : { text: b.emoji || '🎟️', 'aria-hidden': 'true' }));
    const main = el('div', 'coupon-main');
    main.appendChild(el('span', 'coupon-kicker', { text: 'Vale', contenteditable: ctx.editing ? 'false' : null }));
    putField(ctx, main, 'p', 'coupon-title', b.title, 'plain', 'Vale um abraço apertado', (v) => { b.title = v; }, true);
    putField(ctx, main, 'p', 'coupon-details', b.details, 'plain', 'Detalhes (opcional): validade, regras…', (v) => { b.details = v; });
    const foot = el('div', 'coupon-foot', { 'aria-live': 'polite', contenteditable: ctx.editing ? 'false' : null });
    main.appendChild(foot);
    ticket.append(stub, main);
    wrap.appendChild(ticket);

    const mode = interactiveState(ctx);
    const used = ctx.interaction && ctx.interaction.value === 'used' ? ctx.interaction : null;
    const markUsed = (at) => {
      wrap.classList.add('used');
      const when = fmtShortDate(at);
      if (!wrap.querySelector('.coupon-stamp')) wrap.appendChild(el('span', 'coupon-stamp', { text: 'Usado em ' + when, 'aria-hidden': 'true' }));
      foot.replaceChildren(el('span', 'coupon-note', {
        text: mode === 'sender' ? (ctx.otherName || 'Quem recebeu') + ' usou em ' + when : 'Vale usado em ' + when + ' 💛',
      }));
    };
    if (mode === 'edit' || mode === 'preview') {
      foot.appendChild(el('span', 'coupon-note', { text: 'Quem receber vai poder usar o vale' }));
    } else if (used) {
      markUsed(used.at);
    } else if (mode === 'sender') {
      foot.appendChild(el('span', 'coupon-note', { text: 'Ainda não foi usado' }));
    } else {
      const ask = () => {
        const use = el('button', 'coupon-btn', { type: 'button', text: 'Usar vale' });
        use.addEventListener('click', () => {
          const q = el('span', 'coupon-note', { text: 'Usar agora?' });
          const yes = el('button', 'coupon-btn', { type: 'button', text: 'Sim, usar' });
          const no = el('button', 'coupon-btn coupon-btn-ghost', { type: 'button', text: 'Agora não' });
          no.addEventListener('click', () => {
            ask();
            foot.querySelector('button').focus();
          });
          yes.addEventListener('click', async () => {
            yes.disabled = true;
            no.disabled = true;
            try {
              const res = await ctx.onInteract(b.id, 'used');
              markUsed(res && res.at);
            } catch (err) {
              foot.replaceChildren(el('span', 'coupon-note', { text: (err && err.message) || 'Não deu para usar agora. Tente de novo.' }));
              setTimeout(ask, 2500);
            }
          });
          foot.replaceChildren(q, yes, no);
          yes.focus();
        });
        foot.replaceChildren(use);
      };
      ask();
    }
    return wrap;
  }

  function renderPoem(b, ctx) {
    const box = el('div', 'poem');
    putField(ctx, box, 'div', 'poem-text lb-text', b.html, 'html', 'Escreva seu poema…', (v) => { b.html = v; }, true);
    putField(ctx, box, 'p', 'poem-author', b.author, 'plain', 'Autor (opcional)', (v) => { b.author = v; });
    return box;
  }

  function renderPlace(b, ctx) {
    const box = el('div', 'place');
    const card = el('div', 'place-card');
    card.appendChild(el(ctx.editing ? 'button' : 'span', 'place-emoji', ctx.editing
      ? { type: 'button', contenteditable: 'false', title: 'Trocar emoji', text: b.emoji || '📍' }
      : { text: b.emoji || '📍', 'aria-hidden': 'true' }));
    putField(ctx, card, 'p', 'place-name', b.name, 'plain', 'Nome do lugar', (v) => { b.name = v; }, true);
    putField(ctx, card, 'p', 'place-caption', b.caption, 'plain', 'Uma lembrança (opcional)', (v) => { b.caption = v; });
    putField(ctx, card, 'p', 'place-date', b.date, 'plain', 'Data (opcional)', (v) => { b.date = v; });
    box.appendChild(card);
    return box;
  }

  function renderColumns(b, ctx) {
    const row = el('div', 'columns');
    putField(ctx, row, 'div', 'col lb-text', b.left, 'html', 'Coluna da esquerda…', (v) => { b.left = v; }, true);
    putField(ctx, row, 'div', 'col lb-text', b.right, 'html', 'Coluna da direita…', (v) => { b.right = v; }, true);
    return row;
  }

  function renderButton(b, ctx) {
    const wrap = el('div', 'lb-btn-wrap');
    if (ctx.editing) {
      const pill = el('span', 'lb-button' + (b.url ? '' : ' no-url'));
      putField(ctx, pill, 'span', 'lb-button-label', b.label, 'plain', 'Texto do botão', (v) => { b.label = v; });
      pill.appendChild(icon('link', 'lb-button-ic'));
      wrap.appendChild(pill);
      return wrap;
    }
    const pill = b.url
      ? el('a', 'lb-button', { href: b.url, target: '_blank', rel: 'noopener noreferrer' })
      : el('span', 'lb-button no-url');
    pill.appendChild(el('span', 'lb-button-label', { text: b.label || b.url || 'Link' }));
    pill.appendChild(icon('link', 'lb-button-ic'));
    wrap.appendChild(pill);
    return wrap;
  }

  const EXTRA_RENDERERS = {
    toggle: renderToggle, timeline: renderTimeline, counter: renderCounter, quiz: renderQuiz, coupon: renderCoupon,
    poem: renderPoem, place: renderPlace, columns: renderColumns, button: renderButton,
  };

  /** Normaliza um link de botão como o servidor faz (só http/https; "site.com" vira "https://site.com"). */
  function normalizeUrl(url) {
    url = (url || '').trim();
    if (!url || /[\s<>"]/.test(url)) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol) || !u.hostname || (!u.hostname.includes('.') && u.hostname !== 'localhost')) return '';
      return url;
    } catch (e) {
      return '';
    }
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

  const SCRATCH_COVERS = {
    silver: { label: 'Prata', stops: ['#b9bec6', '#eef0f3', '#a9aeb7', '#dfe2e7'], ink: '#4a4f57' },
    gold: { label: 'Dourada', stops: ['#c99a3b', '#f6dd8f', '#b8862b', '#ecca6c'], ink: '#5a3d0a' },
    pink: { label: 'Rosa', stops: ['#e59bb0', '#fbd7e1', '#d77f99', '#f4bdcc'], ink: '#6b2338' },
    mint: { label: 'Menta', stops: ['#8fcab3', '#d6f1e6', '#79b79f', '#bfe6d6'], ink: '#1f5240' },
  };

  /** Raspadinha: quem recebe raspa com o dedo (ou o mouse) para revelar. */
  function renderScratch(b, interactive) {
    const wrap = el('div', 'scratch');
    const inner = el('div', 'scratch-content');
    if (b.src) inner.appendChild(el('img', '', { src: mediaUrl(b.src), alt: '', loading: 'lazy' }));
    if (b.html) inner.appendChild(el('div', 'lb-text', { html: b.html }));
    wrap.appendChild(inner);
    if (!interactive) return wrap;

    const cv = el('canvas', 'scratch-cover', { 'aria-label': b.label || 'Raspe aqui' });
    wrap.appendChild(cv);
    const cover = SCRATCH_COVERS[b.cover] || SCRATCH_COVERS.silver;
    let ready = false;
    let strokes = 0;
    let done = false;
    const paint = () => {
      const r = wrap.getBoundingClientRect();
      if (!r.width || !r.height || ready) return;
      ready = true;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      const ctx = cv.getContext('2d');
      ctx.scale(dpr, dpr);
      const g = ctx.createLinearGradient(0, 0, r.width, r.height);
      cover.stops.forEach((c, i) => g.addColorStop(i / (cover.stops.length - 1), c));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, r.width, r.height);
      // brilho e granulado
      for (let i = 0; i < r.width * r.height / 60; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + Math.random() * 0.35 + ')';
        ctx.fillRect(Math.random() * r.width, Math.random() * r.height, 1, 1);
      }
      ctx.fillStyle = cover.ink;
      ctx.font = '600 15px Geist, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((b.label || 'Raspe aqui').toUpperCase(), r.width / 2, r.height / 2);
      ctx.globalCompositeOperation = 'destination-out';
    };
    // mede numa cópia reduzida (64×64): ler a tela inteira travaria celulares
    let probe = null;
    const progress = () => {
      if (!cv.width || !cv.height) return 0;
      if (!probe) {
        probe = document.createElement('canvas');
        probe.width = probe.height = 64;
      }
      const pctx = probe.getContext('2d', { willReadFrequently: true });
      pctx.clearRect(0, 0, 64, 64);
      pctx.drawImage(cv, 0, 0, 64, 64);
      const data = pctx.getImageData(0, 0, 64, 64).data;
      let clear = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 40) clear++;
      }
      return clear / (64 * 64);
    };
    const scratchAt = (e) => {
      const r = cv.getBoundingClientRect();
      const ctx = cv.getContext('2d');
      ctx.beginPath();
      ctx.arc(e.clientX - r.left, e.clientY - r.top, Math.max(16, r.width / 18), 0, Math.PI * 2);
      ctx.fill();
      if (++strokes % 12 === 0 && progress() > 0.55) finish();
    };
    const finish = () => {
      if (done) return;
      done = true;
      wrap.classList.add('scratched');
      reveal.remove();
      setTimeout(() => cv.remove(), 700);
    };
    // quem não consegue raspar (teclado, leitor de tela) revela com um botão
    const reveal = el('button', 'visually-hidden', { type: 'button', text: 'Revelar: ' + (b.label || 'Raspe aqui') });
    reveal.addEventListener('click', finish);
    wrap.appendChild(reveal);
    let down = false;
    cv.addEventListener('pointerdown', (e) => { down = true; cv.setPointerCapture(e.pointerId); scratchAt(e); });
    cv.addEventListener('pointermove', (e) => { if (down) scratchAt(e); });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('pointercancel', () => { down = false; });
    if (window.ResizeObserver) new ResizeObserver(paint).observe(wrap);
    requestAnimationFrame(paint);
    wrap.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => { ready = false; paint(); }));
    return wrap;
  }

  const SCATTER_TILT = [-6, 4, -3, 7, -5, 3, -2, 6];

  function renderGallery(b) {
    const wrap = el('div', 'gallery gallery-' + (b.layout || 'scatter'));
    (b.items || []).forEach((item, i) => {
      const fig = el('figure', 'gallery-item');
      if (b.layout !== 'grid') fig.style.setProperty('--tilt', (b.layout === 'strip' ? 0 : SCATTER_TILT[i % SCATTER_TILT.length]) + 'deg');
      if (item.src) fig.appendChild(el('img', '', { src: mediaUrl(item.src), alt: item.caption || '', loading: 'lazy' }));
      if (b.layout === 'scatter' || item.caption) fig.appendChild(el('figcaption', '', { text: item.caption || '' }));
      wrap.appendChild(fig);
    });
    return wrap;
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  /** Player de mensagem de voz com forma de onda. */
  function renderAudio(b) {
    const wrap = el('div', 'voice');
    const audio = el('audio', '', { src: mediaUrl(b.src), preload: 'metadata' });
    const btn = el('button', 'voice-play', { type: 'button', 'aria-label': 'Ouvir mensagem' });
    btn.appendChild(icon('play'));
    const wave = el('div', 'voice-wave');
    const peaks = b.peaks && b.peaks.length ? b.peaks : Array.from({ length: 48 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)));
    peaks.forEach((p) => {
      const bar = el('span');
      bar.style.height = Math.max(22, Math.round(p * 100)) + '%';
      wave.appendChild(bar);
    });
    const meta = el('div', 'voice-meta');
    meta.appendChild(el('span', 'voice-label', { text: b.label || 'Mensagem de voz' }));
    const time = el('span', 'voice-time', { text: fmtTime(b.duration) });
    meta.appendChild(time);
    const body = el('div', 'voice-body');
    body.append(wave, meta);
    wrap.append(btn, body, audio);

    const bars = Array.from(wave.children);
    const paint = () => {
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : b.duration || 1;
      const ratio = audio.currentTime / dur;
      bars.forEach((bar, i) => bar.classList.toggle('on', i / bars.length < ratio));
      time.textContent = audio.paused && audio.currentTime === 0 ? fmtTime(b.duration) : fmtTime(audio.currentTime);
    };
    btn.addEventListener('click', () => {
      document.querySelectorAll('.voice audio').forEach((a) => { if (a !== audio) a.pause(); });
      if (audio.paused) audio.play();
      else audio.pause();
    });
    audio.addEventListener('play', () => { btn.replaceChildren(icon('pause')); wrap.classList.add('playing'); });
    audio.addEventListener('pause', () => { btn.replaceChildren(icon('play')); wrap.classList.remove('playing'); });
    audio.addEventListener('ended', () => { audio.currentTime = 0; paint(); });
    audio.addEventListener('timeupdate', paint);
    wave.addEventListener('click', (e) => {
      const r = wave.getBoundingClientRect();
      const dur = audio.duration && isFinite(audio.duration) ? audio.duration : b.duration;
      if (dur) {
        audio.currentTime = ((e.clientX - r.left) / r.width) * dur;
        if (audio.paused) audio.play();
      }
    });
    return wrap;
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
    node.style.setProperty('--flip', s.f ? -1 : 1);
    node.style.opacity = s.o !== undefined && s.o < 1 ? s.o : '';
    node.classList.toggle('locked', !!s.lk);
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
      case 'doodle':
        node.appendChild(doodleSvg(s.name, s.c));
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

  function doodleSvg(name, color) {
    const ns = 'http://www.w3.org/2000/svg';
    const def = DOODLES[name] || DOODLES.heart;
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('class', 'st-doodle');
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', def.d);
    path.setAttribute('stroke', color || '#3b3340');
    path.setAttribute('fill', def.fill ? (color || '#3b3340') : 'none');
    path.setAttribute('stroke-width', '4.5');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  }

  /** Posiciona cada adesivo verticalmente a partir do bloco ao qual está preso. */
  function layoutStickers(paper, stickers) {
    const layer = paper.querySelector('.sticker-layer');
    if (!layer) return;
    // primeiro só lê, depois só escreve: evita recalcular o layout a cada adesivo
    // medidas de layout (offset*), que ignoram animações e transformações em andamento:
    // assim a posição não depende do momento em que a carta foi medida
    const width = paper.clientWidth || 1;
    const blocks = paper.querySelector('.paper-inner');
    const contentBottom = blocks ? blocks.offsetTop + blocks.offsetHeight : 0;
    const items = [];
    stickers.forEach((s) => {
      const node = layer.querySelector('.sticker[data-id="' + s.id + '"]');
      if (!node) return;
      items.push({ node, top: anchorTop(paper, s.anchor) + (s.y * width) / 100, h: node.offsetHeight || 0 });
    });
    let maxBottom = 0;
    items.forEach((it) => {
      const top = Math.round(it.top * 10) / 10 + 'px';
      if (it.node.style.top !== top) it.node.style.top = top;
      maxBottom = Math.max(maxBottom, it.top + it.h / 2);
    });
    const minH = maxBottom > contentBottom ? Math.ceil(maxBottom + 24) + 'px' : '';
    if (paper.style.minHeight !== minH) paper.style.minHeight = minH;
  }

  /** Distância (em px de layout) do topo do papel até o topo do bloco. */
  function anchorTop(paper, anchor) {
    if (!anchor) return 0;
    const block = paper.querySelector('.lb[data-id="' + anchor + '"]');
    if (!block) return 0;
    let y = 0;
    let node = block;
    while (node && node !== paper) {
      y += node.offsetTop;
      node = node.offsetParent;
    }
    if (node === paper) return y;
    // fora da cadeia esperada (raro): volta para a medida visual
    return block.getBoundingClientRect().top - paper.getBoundingClientRect().top;
  }

  /** Quantos px de tela vale 1 unidade de projeto neste papel. */
  function unitPx(paper) {
    if (paper.classList.contains('paper-fluid')) return 1;
    const dw = paper.classList.contains('layout-2') ? 600 : 760;
    return (paper.clientWidth || dw) / dw;
  }

  /** Divide os blocos em páginas nas quebras de página; adesivos vão com o bloco ao qual estão presos. */
  function splitPages(content) {
    const pages = [{ blocks: [], stickers: [] }];
    const where = {};
    (content.blocks || []).forEach((b) => {
      if (b.type === 'pagebreak') {
        pages.push({ blocks: [], stickers: [] });
        return;
      }
      pages[pages.length - 1].blocks.push(b);
      where[b.id] = pages.length - 1;
    });
    (content.stickers || []).forEach((s) => {
      pages[s.anchor && where[s.anchor] !== undefined ? where[s.anchor] : 0].stickers.push(s);
    });
    return pages.filter((pg, i) => i === 0 || pg.blocks.length || pg.stickers.length);
  }

  /**
   * Sem adesivos, a posição exata não importa: o texto se ajusta à tela (letra grande no celular).
   * Com adesivos, o papel inteiro muda só de escala, para cada adesivo continuar em cima da palavra certa.
   */
  function setFluid(paper, fluid) {
    paper.dataset.fluid = fluid ? '1' : '';
    paper.classList.toggle('paper-fluid', fluid);
  }

  function buildPaper(scene, page, p, fluid, opts) {
    const paper = el('div', 'paper');
    paper.dataset.fluid = fluid ? '1' : '';
    applyPaper(scene, paper, p);
    const inner = el('div', 'paper-inner');
    opts = opts || {};
    const interactions = opts.interactions || {};
    page.blocks.forEach((b) => inner.appendChild(renderBlock(b, p, {
      interaction: interactions[b.id] || null, onInteract: opts.onInteract || null, sender: !!opts.sender, otherName: opts.otherName || '',
    })));
    paper.appendChild(inner);
    const layer = el('div', 'sticker-layer');
    page.stickers.forEach((s) => layer.appendChild(stickerEl(s)));
    paper.appendChild(layer);
    return paper;
  }

  /**
   * Monta a carta completa para leitura.
   * opts.reveal: blocos aparecem um a um · opts.onPage(paper, index): chamado quando uma página aparece pela 1ª vez
   * opts.interactions: {blockId: {value, at}} · opts.onInteract(blockId, value) → Promise (quem recebe responde/usa)
   * opts.sender: quem escreveu está vendo (resultados só para ler) · opts.otherName: nome de quem recebeu
   */
  function renderLetter(container, content, opts) {
    opts = opts || {};
    const p = content.paper || {};
    const scene = el('div', 'letter-scene');
    const pages = splitPages(content);
    const fluid = !(content.stickers || []).length;
    const papers = pages.map((pg) => buildPaper(scene, pg, p, fluid, opts));
    let current = 0;
    const seen = new Set();
    const cleanups = [];
    const observers = [];

    const relayoutOne = (i) => layoutStickers(papers[i], pages[i].stickers);
    const relayout = () => relayoutOne(current);
    /** Todas as páginas (para imprimir): as escondidas aparecem só durante a medida. */
    const relayoutAll = () => {
      papers.forEach((paper, i) => {
        const wasHidden = paper.hidden;
        paper.hidden = false;
        relayoutOne(i);
        paper.hidden = wasHidden;
      });
    };
    // Enquanto o texto está sendo "escrito" (aria-busy), os adesivos se ajustam no máximo a cada 250 ms
    const timers = [];
    const lastRun = [];
    const scheduleRelayout = (i) => {
      if (timers[i]) return;
      const busy = papers[i].getAttribute('aria-busy') === 'true';
      const wait = busy ? Math.max(0, 250 - (performance.now() - (lastRun[i] || 0))) : 0;
      timers[i] = setTimeout(() => requestAnimationFrame(() => {
        timers[i] = 0;
        lastRun[i] = performance.now();
        relayoutOne(i);
      }), wait);
    };

    if (papers.length === 1) {
      scene.appendChild(papers[0]);
    } else {
      // Várias páginas: uma de cada vez, com setas e animação de folha virando
      const book = el('div', 'book');
      papers.forEach((paper, i) => {
        paper.classList.add('page');
        paper.hidden = i !== 0;
        book.appendChild(paper);
      });
      const nav = el('div', 'page-nav');
      const prev = el('button', 'page-btn', { type: 'button', 'aria-label': 'Página anterior' });
      prev.appendChild(icon('arrow-left'));
      const next = el('button', 'page-btn page-next', { type: 'button', 'aria-label': 'Próxima página' });
      next.appendChild(icon('arrow-left'));
      const count = el('span', 'page-count');
      nav.append(prev, count, next);
      scene.append(book, nav);
      const go = (to, dir) => {
        if (to < 0 || to >= papers.length || to === current) return;
        const from = papers[current];
        const target = papers[to];
        from.classList.add(dir > 0 ? 'turn-out-left' : 'turn-out-right');
        setTimeout(() => {
          from.hidden = true;
          from.classList.remove('turn-out-left', 'turn-out-right');
          target.hidden = false;
          target.classList.add(dir > 0 ? 'turn-in-right' : 'turn-in-left');
          setTimeout(() => target.classList.remove('turn-in-right', 'turn-in-left'), 450);
          current = to;
          update();
          relayout();
          const top = scene.getBoundingClientRect().top + window.scrollY - 70;
          if (window.scrollY > top) window.scrollTo({ top, behavior: 'smooth' });
        }, 260);
      };
      const update = () => {
        count.textContent = (current + 1) + ' / ' + papers.length;
        prev.disabled = current === 0;
        next.disabled = current === papers.length - 1;
        if (!seen.has(current)) {
          seen.add(current);
          if (opts.onPage) opts.onPage(papers[current], current);
        }
      };
      prev.addEventListener('click', () => go(current - 1, -1));
      next.addEventListener('click', () => go(current + 1, 1));
      // Deslizar o dedo para os lados também vira a página (um dedo só, gesto mais horizontal que vertical)
      let sx = null;
      let sy = null;
      book.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) { sx = null; return; }
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
      }, { passive: true });
      book.addEventListener('touchmove', (e) => { if (e.touches.length > 1) sx = null; }, { passive: true });
      book.addEventListener('touchend', (e) => {
        if (sx === null || e.touches.length) return;
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        sx = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy) && !e.target.closest('.scratch, .gallery-strip')) go(current + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      });
      const onKey = (e) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        if (!scene.isConnected || !scene.getClientRects().length) return;
        const t = e.target;
        if (t && (t.isContentEditable || (t.closest && t.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')))) return;
        if (e.key === 'ArrowRight') go(current + 1, 1);
        else go(current - 1, -1);
      };
      document.addEventListener('keydown', onKey);
      cleanups.push(() => document.removeEventListener('keydown', onKey));
      container.replaceChildren(scene);
      update();
    }
    if (papers.length === 1) {
      container.replaceChildren(scene);
      seen.add(0);
      if (opts.onPage) opts.onPage(papers[0], 0);
    }

    if (opts.reveal) {
      // Os blocos aparecem um a um, como se a carta estivesse sendo desdobrada
      papers.forEach((paper) => {
        paper.classList.add('reveal');
        const blocksEls = paper.querySelectorAll('.paper-inner > .lb');
        blocksEls.forEach((n, i) => n.style.setProperty('--i', Math.min(i, 14)));
        paper.querySelectorAll('.sticker').forEach((n, i) => n.style.setProperty('--i', Math.min(blocksEls.length, 14) + i * 0.5));
      });
    }

    papers.forEach((paper, i) => {
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => scheduleRelayout(i));
        ro.observe(paper.querySelector('.paper-inner'));
        observers.push(ro);
      }
      paper.querySelectorAll('img').forEach((img) => img.addEventListener('load', () => scheduleRelayout(i)));
    });
    relayout();
    if (document.fonts) document.fonts.ready.then(() => { if (scene.isConnected) relayout(); });
    return {
      scene, papers, relayout, relayoutAll,
      get paper() { return papers[current]; },
      /** Solta ouvintes e observadores (o editor recria a prévia várias vezes). */
      destroy() {
        cleanups.splice(0).forEach((fn) => fn());
        observers.splice(0).forEach((ro) => ro.disconnect());
        timers.forEach((t) => clearTimeout(t));
      },
    };
  }

  // ---------- Envelope ----------

  const MESES_CURTOS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

  function stampEl(key) {
    const def = STAMPS[key];
    if (!def) return null;
    const wrap = el('span', 'stamp');
    wrap.innerHTML = '<svg viewBox="0 0 60 72" aria-hidden="true"><rect width="60" height="72" fill="' + def.bg + '"/>'
      + def.svg + '<text x="5" y="68" font-size="6" font-family="Georgia, serif" fill="rgba(0,0,0,.55)">CORREIO</text></svg>';
    return wrap;
  }

  /** Carimbo postal com a data de envio. */
  function postmarkEl(date) {
    const d = date ? new Date(date) : new Date();
    const text = String(d.getDate()).padStart(2, '0') + ' ' + MESES_CURTOS[d.getMonth()] + ' ' + d.getFullYear();
    const id = 'pm' + Math.random().toString(36).slice(2, 7);
    const wrap = el('span', 'postmark');
    wrap.innerHTML = '<svg viewBox="0 0 150 70" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">'
      + '<path d="M2 22c10-5 20 5 30 0s20-5 30 0M2 34c10-5 20 5 30 0s20-5 30 0M2 46c10-5 20 5 30 0s20-5 30 0"/>'
      + '<circle cx="110" cy="35" r="30"/><circle cx="110" cy="35" r="23"/></g>'
      + '<path id="' + id + '" d="M84 35a26 26 0 1 1 52 0" fill="none"/>'
      + '<text font-size="7.5" letter-spacing="1.5" fill="currentColor" font-family="Georgia, serif"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">CARTAS DA ALMA</textPath></text>'
      + '<text x="110" y="38" font-size="8.5" text-anchor="middle" fill="currentColor" font-family="Georgia, serif">' + text + '</text></svg>';
    return wrap;
  }

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
    const front = el('div', 'env-front');
    wrap.appendChild(front);
    const flap = el('div', 'env-flap');
    flap.appendChild(el('div', 'env-flap-inner liner-' + (env.liner || 'plain')));
    wrap.appendChild(flap);

    const seal = el(opts.interactive ? 'button' : 'span', 'env-seal', opts.interactive ? { type: 'button', 'aria-label': 'Abrir a carta' } : null);
    const face = el('span', 'env-seal-face');
    if (opts.locked) face.appendChild(icon('lock'));
    else face.textContent = env.seal || '❤';
    seal.appendChild(face);
    wrap.appendChild(seal);

    const address = el('div', 'env-address');
    if (env.label) address.appendChild(el('span', 'env-open-when', { text: env.label }));
    if (toName) address.appendChild(el('span', 'env-label', { text: 'Para ' + toName }));
    wrap.appendChild(address);

    const stamp = stampEl(env.stamp);
    if (stamp) {
      const corner = el('div', 'env-stamp');
      corner.appendChild(stamp);
      if (opts.sentAt !== null) corner.appendChild(postmarkEl(opts.sentAt));
      wrap.appendChild(corner);
    }
    return wrap;
  }

  // ---------- Efeitos ao abrir ----------

  /**
   * Efeito de abertura (corações, confete, pétalas, estrelas, neve).
   * Feito com animações CSS de transform/opacity: o celular executa direto na placa de vídeo,
   * separado da página, então o efeito nunca deixa a rolagem engasgar.
   */
  function playEffect(kind, duration) {
    if (!kind || kind === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || document.documentElement.dataset.reduceMotion === '1') return;
    const palettes = {
      hearts: ['#e05a6d', '#f08ca0', '#c43b52', '#f7b6c2'],
      confetti: ['#e05a6d', '#f2b84b', '#4f9d8a', '#5b8fd9', '#9b7be0', '#f08c4a'],
      petals: ['#f5b8c6', '#f9d3dc', '#ee9fb1', '#fbe3e8'],
      stars: ['#f5d77a', '#fff3c4', '#f2b84b'],
      snow: ['#ffffff', '#eef4fb'],
    };
    const colors = palettes[kind] || palettes.confetti;
    const total = duration || 5200;
    const rnd = (x, y) => x + Math.random() * (y - x);
    // menos partículas em telas pequenas: o efeito continua cheio, com metade do trabalho
    const area = Math.min(1, Math.max(0.5, (innerWidth * innerHeight) / (1280 * 800)));
    const count = Math.round((kind === 'stars' ? 40 : 56) * area);
    const shape = (color) => {
      if (kind === 'hearts') {
        return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 18"><path d="M10 17S1 11.5 1 5.6A4.6 4.6 0 0 1 10 3.4 4.6 4.6 0 0 1 19 5.6C19 11.5 10 17 10 17z" fill="' + color + '"/></svg>') + '") center / contain no-repeat';
      }
      if (kind === 'stars') {
        return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 20 20"><path d="M0-10L2.2-2.2 10 0 2.2 2.2 0 10-2.2 2.2-10 0-2.2-2.2z" fill="' + color + '"/></svg>') + '") center / contain no-repeat';
      }
      return color;
    };
    const layer = el('div', 'fx-layer fx-' + kind, { 'aria-hidden': 'true' });
    for (let i = 0; i < count; i++) {
      const size = kind === 'snow' ? rnd(4, 9) : kind === 'stars' ? rnd(10, 20) : rnd(9, 17);
      const fall = kind === 'snow' ? rnd(5500, 9000) : rnd(3200, 5400);
      const node = el('i', 'fx');
      node.style.cssText = '--x:' + rnd(0, 100).toFixed(1) + 'vw;--y:' + rnd(0, 100).toFixed(1) + 'vh;--dx:' + rnd(-12, 12).toFixed(1) + 'vw;'
        + '--r0:' + rnd(0, 360).toFixed(0) + 'deg;--r1:' + rnd(-540, 540).toFixed(0) + 'deg;--s:' + size.toFixed(1) + 'px;'
        + '--d:' + fall.toFixed(0) + 'ms;--delay:' + (kind === 'stars' ? rnd(0, 1600) : rnd(-fall * 0.6, Math.max(0, total - fall - 400))).toFixed(0) + 'ms;'
        + 'background:' + shape(colors[i % colors.length]);
      layer.appendChild(node);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.classList.add('fx-out'), Math.max(0, total - 1100));
    setTimeout(() => layer.remove(), total + 200);
  }

  window.Letter = {
    FONTS, PAPERS, BORDERS, SCENES, LINERS, DIVIDERS, FRAMES, TAPES, TEXT_STYLES,
    DOODLES, STAMPS, EFFECTS, GALLERY_LAYOUTS,
    PAPER_COLORS, INK_COLORS, ACCENT_COLORS, SIZE_MUL,
    uid, el, icon, mediaUrl, unitPx, setFluid, parseMusicUrl, musicEmbed, isDark, fmtTime,
    renderGallery, renderAudio, renderScratch, SCRATCH_COVERS, doodleSvg, stampEl, postmarkEl, playEffect, splitPages,
    applyPaper, applyBlockStyle, renderBlock, renderImageFigure, renderDivider, renderSignature,
    EXTRA_RENDERERS, normalizeUrl, parseCounterDate, counterParts,
    stickerEl, updateStickerBox, fillSticker, layoutStickers, anchorTop,
    renderLetter, renderEnvelope,
  };
})();
