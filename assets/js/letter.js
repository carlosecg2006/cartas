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
  function renderLetter(container, content, opts) {
    opts = opts || {};
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
    if (opts.reveal) {
      // Os blocos aparecem um a um, como se a carta estivesse sendo desdobrada
      paper.classList.add('reveal');
      Array.from(inner.children).forEach((n, i) => n.style.setProperty('--i', Math.min(i, 14)));
      Array.from(layer.children).forEach((n, i) => n.style.setProperty('--i', Math.min(inner.children.length, 14) + i * 0.5));
    }

    const relayout = () => layoutStickers(paper, content.stickers || []);
    relayout();
    if (window.ResizeObserver) new ResizeObserver(relayout).observe(inner);
    if (document.fonts) document.fonts.ready.then(relayout);
    paper.querySelectorAll('img').forEach((img) => img.addEventListener('load', relayout));
    return { scene, paper, relayout };
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
      + '<text font-size="7.5" letter-spacing="1.5" fill="currentColor" font-family="Georgia, serif"><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">CORREIO DO CORAÇÃO</textPath></text>'
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

  function playEffect(kind, duration) {
    if (!kind || kind === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const cv = el('canvas', 'effect-canvas');
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    const W = () => innerWidth;
    const H = () => innerHeight;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const palettes = {
      hearts: ['#e05a6d', '#f08ca0', '#c43b52', '#f7b6c2'],
      confetti: ['#e05a6d', '#f2b84b', '#4f9d8a', '#5b8fd9', '#9b7be0', '#f08c4a'],
      petals: ['#f5b8c6', '#f9d3dc', '#ee9fb1', '#fbe3e8'],
      stars: ['#f5d77a', '#fff3c4', '#f2b84b'],
      snow: ['#ffffff', '#eef4fb'],
    };
    const colors = palettes[kind] || palettes.confetti;
    const count = kind === 'snow' ? 90 : kind === 'stars' ? 46 : 70;
    const parts = Array.from({ length: count }, () => ({
      x: rnd(0, W()), y: kind === 'stars' ? rnd(0, H()) : rnd(-H(), -10),
      vx: rnd(-0.6, 0.6), vy: kind === 'snow' ? rnd(0.6, 1.6) : rnd(1.4, 3.2),
      size: kind === 'snow' ? rnd(2, 5) : rnd(7, 15), rot: rnd(0, Math.PI * 2), vr: rnd(-0.08, 0.08),
      color: colors[Math.floor(Math.random() * colors.length)], phase: rnd(0, Math.PI * 2),
    }));
    const start = performance.now();
    const total = duration || 5200;
    const heart = (x, y, s) => {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.3);
      ctx.bezierCurveTo(x, y, x - s / 2, y, x - s / 2, y + s * 0.3);
      ctx.bezierCurveTo(x - s / 2, y + s * 0.6, x, y + s * 0.8, x, y + s);
      ctx.bezierCurveTo(x, y + s * 0.8, x + s / 2, y + s * 0.6, x + s / 2, y + s * 0.3);
      ctx.bezierCurveTo(x + s / 2, y, x, y, x, y + s * 0.3);
      ctx.fill();
    };
    const star = (x, y, s) => {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const r = i % 2 ? s * 0.22 : s * 0.6;
        const a = (Math.PI / 4) * i;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    };
    const frame = (now) => {
      const t = now - start;
      ctx.clearRect(0, 0, W(), H());
      const fade = t > total - 1200 ? Math.max(0, (total - t) / 1200) : 1;
      parts.forEach((p) => {
        p.phase += 0.03;
        p.rot += p.vr;
        if (kind !== 'stars') {
          p.x += p.vx + Math.sin(p.phase) * (kind === 'petals' || kind === 'snow' ? 0.9 : 0.4);
          p.y += p.vy;
          if (p.y > H() + 20 && t < total - 1600) { p.y = -20; p.x = rnd(0, W()); }
        }
        ctx.save();
        ctx.globalAlpha = fade * (kind === 'stars' ? 0.35 + 0.65 * Math.abs(Math.sin(p.phase * 2)) : 0.95);
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (kind === 'hearts') heart(0, -p.size / 2, p.size);
        else if (kind === 'confetti') ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2.2);
        else if (kind === 'petals') { ctx.beginPath(); ctx.ellipse(0, 0, p.size / 2, p.size / 3.4, 0, 0, Math.PI * 2); ctx.fill(); }
        else if (kind === 'stars') star(0, 0, p.size);
        else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
      });
      if (t < total) requestAnimationFrame(frame);
      else { cv.remove(); window.removeEventListener('resize', resize); }
    };
    requestAnimationFrame(frame);
  }

  window.Letter = {
    FONTS, PAPERS, BORDERS, SCENES, LINERS, DIVIDERS, FRAMES, TAPES, TEXT_STYLES,
    DOODLES, STAMPS, EFFECTS, GALLERY_LAYOUTS,
    PAPER_COLORS, INK_COLORS, ACCENT_COLORS, SIZE_MUL,
    uid, el, icon, mediaUrl, parseMusicUrl, musicEmbed, isDark, fmtTime,
    renderGallery, renderAudio, doodleSvg, stampEl, postmarkEl, playEffect,
    applyPaper, applyBlockStyle, renderBlock, renderImageFigure, renderDivider, renderSignature,
    stickerEl, updateStickerBox, fillSticker, layoutStickers, anchorTop,
    renderLetter, renderEnvelope,
  };
})();
