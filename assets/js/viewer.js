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
    rendered = Letter.renderLetter(letterStage, data.content);
    letterStage.classList.add('appear');
    after.hidden = false;
    renderReactions();
    renderReplies();
    window.scrollTo({ top: 0 });
    if (location.hash === '#respostas') {
      setTimeout(() => document.getElementById('respostas').scrollIntoView({ behavior: 'smooth' }), 400);
    }
  }

  function burst(origin) {
    const rect = origin.getBoundingClientRect();
    const symbols = ['❤', '✨', '♡', '✦', '💌'];
    for (let i = 0; i < 14; i++) {
      const p = document.createElement('span');
      p.className = 'burst';
      p.textContent = symbols[i % symbols.length];
      const angle = (Math.PI * 2 * i) / 14;
      const dist = 70 + Math.random() * 60;
      p.style.left = rect.left + rect.width / 2 + 'px';
      p.style.top = rect.top + rect.height / 2 + 'px';
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
      p.style.color = data.envelope.sealColor || '#a8323e';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
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
    if (r.mine || data.isAdmin) {
      const del = Letter.el('button', 'reply-del', { type: 'button', title: 'Apagar', text: '×' });
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
        text: data.isAdmin ? 'Nenhuma resposta ainda.' : 'Que tal mandar uma resposta? Ela chega direto para quem te escreveu.',
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
      toast(data.isAdmin ? 'Resposta enviada.' : 'Resposta enviada! 💌');
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
    const label = btn.textContent;
    btn.textContent = '⏳ Gerando…';
    try {
      await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const canvas = await window.html2canvas(rendered.paper, { scale: 2, backgroundColor: null, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = (data.title || 'carta').replace(/[^\p{L}\p{N} _-]/gu, '').trim() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      toast('Não consegui gerar a imagem. Tente "Baixar PDF".', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
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
