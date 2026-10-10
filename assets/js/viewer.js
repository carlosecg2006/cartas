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
