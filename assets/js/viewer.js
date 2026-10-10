(function () {
  'use strict';

  const data = JSON.parse(document.getElementById('letter-data').textContent);
  const stage = document.querySelector('[data-envelope-stage]');
  const holder = document.querySelector('[data-envelope]');
  const letterStage = document.querySelector('[data-letter-stage]');
  const after = document.querySelector('[data-after]');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const envelope = Letter.renderEnvelope(data.envelope, data.toName, {
    interactive: !data.locked,
    locked: data.locked,
    paperColor: data.paperColor,
    sentAt: data.sentAt,
  });
  holder.appendChild(envelope);

  if (data.locked) return; // contagem regressiva fica com o app.js

  let opened = false;
  let rendered = null;
  const seal = envelope.querySelector('.env-seal');
  seal.addEventListener('click', openLetter);
  envelope.addEventListener('click', (e) => {
    if (!e.target.closest('.env-seal')) seal.focus();
  });

  function openLetter() {
    if (opened) return;
    opened = true;
    if (!data.isAdmin) api('opened', { id: data.id }).catch(() => {});
    startMusic(); // precisa ser dentro do clique, senão o navegador bloqueia o som

    if (reduceMotion) {
      showLetter();
      return;
    }
    envelope.classList.add('seal-break');
    burst(seal);
    setTimeout(() => envelope.classList.add('flap-open'), 350);
    setTimeout(() => envelope.classList.add('letter-out'), 950);
    setTimeout(() => stage.classList.add('fade-away'), 1750);
    setTimeout(showLetter, 2200);
  }

  function showLetter() {
    stage.hidden = true;
    letterStage.hidden = false;
    const mode = reduceMotion ? 'none' : (data.content.reveal || 'fade');
    rendered = Letter.renderLetter(letterStage, data.content, {
      reveal: mode === 'fade',
      onPage: mode === 'write' ? (paper) => writeReveal(paper) : null,
    });
    letterStage.classList.add('appear');
    setTimeout(() => Letter.playEffect(data.content.effect), 250);
    setupProgress();
    after.hidden = false;
    renderReactions();
    renderReplies();
    window.scrollTo({ top: 0 });
    if (location.hash === '#respostas') {
      setTimeout(() => document.getElementById('respostas').scrollIntoView({ behavior: 'smooth' }), 400);
    }
  }

  // ---------- Música enquanto lê ----------
  function startMusic() {
    const bgm = data.content && data.content.bgm;
    if (!bgm || bgm.kind === 'none') return;
    const volume = Math.max(0.05, Math.min(1, bgm.volume ?? 0.6));
    const bar = Letter.el('div', 'bgm-player');
    const toggle = Letter.el('button', 'bgm-toggle', { type: 'button', 'aria-label': 'Pausar música' });
    const label = Letter.el('span', 'bgm-name', { text: bgm.name || 'Música da carta' });
    const eq = Letter.el('span', 'bgm-eq', { 'aria-hidden': 'true' });
    eq.append(Letter.el('i'), Letter.el('i'), Letter.el('i'));
    bar.append(toggle, eq, label);
    document.body.appendChild(bar);
    let playing = false;
    const show = (on) => {
      playing = on;
      bar.classList.toggle('is-playing', on);
      toggle.replaceChildren(Letter.icon(on ? 'pause' : 'play'));
      toggle.setAttribute('aria-label', on ? 'Pausar música' : 'Tocar música');
    };

    if (bgm.kind === 'file') {
      const audio = new Audio(Letter.mediaUrl(bgm.src));
      audio.loop = true;
      audio.volume = 0;
      const fadeIn = () => {
        let v = 0;
        const t = setInterval(() => {
          v = Math.min(volume, v + volume / 20);
          audio.volume = v;
          if (v >= volume) clearInterval(t);
        }, 100);
      };
      audio.addEventListener('play', () => show(true));
      audio.addEventListener('pause', () => show(false));
      audio.play().then(fadeIn).catch(() => { audio.volume = volume; show(false); bar.classList.add('needs-tap'); });
      toggle.addEventListener('click', () => {
        bar.classList.remove('needs-tap');
        if (audio.paused) { audio.volume = volume; audio.play().catch(() => {}); } else audio.pause();
      });
      show(false);
      return;
    }

    // YouTube: um player escondido, controlado por mensagens
    const params = new URLSearchParams({
      autoplay: '1', loop: '1', playlist: bgm.mid, controls: '0', enablejsapi: '1', playsinline: '1', rel: '0',
      start: String(bgm.start || 0), origin: location.origin,
    });
    const frame = Letter.el('iframe', 'bgm-frame', {
      src: 'https://www.youtube-nocookie.com/embed/' + bgm.mid + '?' + params,
      allow: 'autoplay; encrypted-media', title: 'Música da carta', tabindex: '-1',
    });
    bar.appendChild(frame);
    const send = (func, args) => {
      try { frame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: args || [] }), '*'); } catch (e) { /* ainda carregando */ }
    };
    frame.addEventListener('load', () => {
      try { frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'bgm' }), '*'); } catch (e) { /* ignora */ }
      send('setVolume', [Math.round(volume * 100)]);
      send('playVideo');
    });
    window.addEventListener('message', (e) => {
      if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
      let msg;
      try { msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data; } catch (err) { return; }
      const st = msg && msg.info && typeof msg.info === 'object' ? msg.info.playerState : (msg && msg.event === 'onStateChange' ? msg.info : undefined);
      if (st === 1) { show(true); bar.classList.remove('needs-tap'); }
      if (st === 2 || st === 0) show(false);
    });
    // alguns celulares não deixam tocar sozinho: mostra o vídeo pequeno para a pessoa tocar
    setTimeout(() => { if (!playing) bar.classList.add('needs-tap', 'show-frame'); }, 3500);
    toggle.addEventListener('click', () => {
      if (playing) { send('pauseVideo'); show(false); } else { send('setVolume', [Math.round(volume * 100)]); send('playVideo'); }
    });
    show(false);
  }

  /** Texto aparecendo como se estivesse sendo escrito na hora. */
  let skipWriting = null;
  function writeReveal(paper) {
    const blocks = Array.from(paper.querySelectorAll('.paper-inner > .lb'));
    const stickers = Array.from(paper.querySelectorAll('.sticker'));
    const jobs = blocks.map((block) => {
      const texts = [];
      const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement.closest('.secret-content, .scratch-content, .voice, .music-embed') || !n.nodeValue.trim()
          ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      while (walker.nextNode()) texts.push({ node: walker.currentNode, full: walker.currentNode.nodeValue });
      texts.forEach((t) => { t.node.nodeValue = ''; });
      block.classList.add('w-hidden');
      return { block, texts };
    });
    stickers.forEach((st) => st.classList.add('w-hidden'));

    let cancelled = false;
    const finishAll = () => {
      cancelled = true;
      jobs.forEach((j) => { j.block.classList.remove('w-hidden'); j.texts.forEach((t) => { t.node.nodeValue = t.full; }); });
      stickers.forEach((st) => st.classList.remove('w-hidden'));
      skipBtn.remove();
      rendered.relayout();
    };
    const skipBtn = Letter.el('button', 'btn btn-sm skip-writing', { type: 'button', text: 'Mostrar tudo' });
    skipBtn.addEventListener('click', finishAll);
    document.body.appendChild(skipBtn);
    skipWriting = finishAll;

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      await wait(500);
      for (const job of jobs) {
        if (cancelled) return;
        job.block.classList.remove('w-hidden');
        const total = job.texts.reduce((n, t) => n + t.full.length, 0);
        if (!total) {
          await wait(260);
          continue;
        }
        const perTick = Math.max(1, Math.ceil(total / 90)); // cada bloco leva no máximo ~2,5 s
        for (const t of job.texts) {
          for (let i = 0; i < t.full.length; i += perTick) {
            if (cancelled) return;
            t.node.nodeValue = t.full.slice(0, i + perTick);
            await wait(26);
          }
        }
        await wait(180);
      }
      if (cancelled) return;
      stickers.forEach((st, i) => setTimeout(() => st.classList.remove('w-hidden'), i * 120));
      skipBtn.remove();
      rendered.relayout();
    })();
  }

  /** Pedacinhos de cera voando quando o selo quebra. */
  function burst(origin) {
    const rect = origin.getBoundingClientRect();
    const color = data.envelope.sealColor || '#a8323e';
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('span');
      p.className = 'burst';
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.4;
      const dist = 50 + Math.random() * 70;
      const size = 5 + Math.random() * 9;
      p.style.left = rect.left + rect.width / 2 + 'px';
      p.style.top = rect.top + rect.height / 2 + 'px';
      p.style.width = size + 'px';
      p.style.height = size * (0.6 + Math.random() * 0.6) + 'px';
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 40 + 'px');
      p.style.background = color;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }

  /** Barrinha de leitura no topo. */
  function setupProgress() {
    const bar = document.querySelector('[data-progress]');
    const fill = bar.querySelector('span');
    bar.hidden = false;
    const update = () => {
      const paper = rendered.paper.getBoundingClientRect();
      const total = paper.height - window.innerHeight + 120;
      const ratio = total > 0 ? Math.min(1, Math.max(0, (120 - paper.top) / total)) : 1;
      fill.style.transform = 'scaleX(' + ratio + ')';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  // ---------- Reações ----------
  function renderReactions() {
    const row = document.querySelector('[data-reactions]');
    row.replaceChildren();
    if (data.isAdmin) {
      if (!data.reactions.length) {
        row.appendChild(Letter.el('span', 'muted small', { text: 'Nenhuma reação ainda.' }));
      }
      data.reactions.forEach((emoji) => row.appendChild(Letter.el('span', 'reaction active static', { text: emoji })));
      return;
    }
    data.reactionChoices.forEach((emoji) => {
      const btn = Letter.el('button', 'reaction' + (data.reactions.includes(emoji) ? ' active' : ''), {
        type: 'button', text: emoji, 'aria-pressed': data.reactions.includes(emoji) ? 'true' : 'false',
      });
      btn.addEventListener('click', async () => {
        btn.classList.add('pop');
        setTimeout(() => btn.classList.remove('pop'), 400);
        try {
          const res = await api('react', { id: data.id, emoji });
          data.reactions = res.reactions;
          renderReactions();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
      row.appendChild(btn);
    });
  }

  // ---------- Respostas ----------
  const replyList = document.querySelector('[data-replies]');
  const form = document.querySelector('[data-reply-form]');

  function replyEl(r) {
    const item = Letter.el('div', 'reply' + (r.mine ? ' mine' : ''));
    item.insertAdjacentHTML('afterbegin', r.avatar); // avatar_html já vem escapado do servidor
    const bubble = Letter.el('div', 'reply-bubble');
    const meta = Letter.el('div', 'reply-meta');
    meta.appendChild(Letter.el('b', '', { text: r.name }));
    meta.appendChild(Letter.el('span', 'muted', { text: ' · ' + r.when }));
    if (r.mine) {
      const del = Letter.el('button', 'reply-del', { type: 'button', title: 'Apagar', 'aria-label': 'Apagar' });
      del.appendChild(Letter.icon('x', 'ic-sm'));
      del.addEventListener('click', async () => {
        if (!confirm('Apagar esta mensagem?')) return;
        try {
          await api('delete_reply', { reply_id: r.id });
          data.replies = data.replies.filter((x) => x.id !== r.id);
          renderReplies();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
      meta.appendChild(del);
    }
    bubble.appendChild(meta);
    bubble.appendChild(Letter.el('p', '', { text: r.message }));
    item.appendChild(bubble);
    return item;
  }

  function renderReplies() {
    replyList.replaceChildren();
    if (!data.replies.length) {
      replyList.appendChild(Letter.el('p', 'muted small', {
        text: data.isAdmin ? 'Nenhuma resposta ainda.' : 'Sua resposta chega direto para quem escreveu.',
      }));
    }
    data.replies.forEach((r) => replyList.appendChild(replyEl(r)));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const textarea = form.elements.message;
    const message = textarea.value.trim();
    if (!message) return;
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const res = await api('reply', { id: data.id, message });
      data.replies.push(res.reply);
      textarea.value = '';
      renderReplies();
      toast('Resposta enviada.');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Favorita ----------
  const favBtn = document.querySelector('[data-favorite]');
  if (favBtn) {
    favBtn.addEventListener('click', async () => {
      favBtn.disabled = true;
      try {
        const res = await api('favorite', { id: data.id });
        favBtn.setAttribute('aria-pressed', res.favorite ? 'true' : 'false');
        favBtn.querySelector('use').setAttribute('href', 'assets/icons.svg#' + (res.favorite ? 'star-fill' : 'star'));
        favBtn.querySelector('span').textContent = res.favorite ? 'Favorita' : 'Favoritar';
        if (res.favorite) favBtn.classList.add('pop');
        toast(res.favorite ? 'Guardada nas favoritas.' : 'Saiu das favoritas.');
      } catch (err) {
        toast(err.message, 'error');
      } finally {
        favBtn.disabled = false;
      }
    });
  }

  // ---------- Exportar ----------
  document.querySelector('[data-print]').addEventListener('click', () => window.print());

  document.querySelector('[data-save-image]').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const label = btn.innerHTML;
    btn.textContent = 'Gerando…';
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const canvas = await window.html2canvas(rendered.paper, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = (data.title || 'carta').replace(/[^\p{L}\p{N} _-]/gu, '').trim() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      toast('Não consegui gerar a imagem. Tente "Salvar em PDF".', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  });

  function loadScript(src) {
    if (window.html2canvas) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
})();
