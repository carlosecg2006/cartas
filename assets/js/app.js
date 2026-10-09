(function () {
  'use strict';

  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

  /** Chamada à API: api('save', {...}) ou api('upload', formData) */
  window.api = async function (action, body) {
    const isForm = body instanceof FormData;
    const res = await fetch('api.php?action=' + encodeURIComponent(action), {
      method: 'POST',
      credentials: 'same-origin',
      headers: isForm ? { 'X-CSRF-Token': csrf } : { 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' },
      body: isForm ? body : JSON.stringify(body || {}),
    });
    let json = null;
    try {
      json = await res.json();
    } catch (e) {
      throw new Error('O servidor respondeu de um jeito estranho. Tente de novo.');
    }
    if (!res.ok || !json.ok) throw new Error(json.error || 'Algo deu errado.');
    return json;
  };

  window.toast = function (message, type) {
    let box = document.querySelector('.toasts');
    if (!box) {
      box = document.createElement('div');
      box.className = 'toasts';
      box.setAttribute('role', 'status');
      document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = 'toast' + (type === 'error' ? ' toast-error' : '');
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3200);
    setTimeout(() => t.remove(), 3700);
  };

  // Envelopes desenhados (painel, caixa de cartas, login)
  document.addEventListener('DOMContentLoaded', () => {
    if (!window.Letter) return;
    document.querySelectorAll('[data-envelope]').forEach((node) => {
      try {
        const d = JSON.parse(node.dataset.envelope);
        node.prepend(Letter.renderEnvelope(d.env || {}, d.to || '', {
          paperColor: d.paper, locked: !!d.locked, sentAt: d.sentAt === undefined ? null : d.sentAt,
        }));
      } catch (e) { /* ignora */ }
    });
  });

  // Mensagens de sessão viram toasts
  document.querySelectorAll('.flash').forEach((f) => {
    toast(f.textContent.trim(), f.classList.contains('flash-error') ? 'error' : '');
    f.remove();
  });

  // Confirmação em botões perigosos
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-confirm]');
    if (btn && !confirm(btn.dataset.confirm)) {
      e.preventDefault();
    }
  });

  // Fecha menus "⋯" ao clicar fora
  document.addEventListener('click', (e) => {
    document.querySelectorAll('details.menu[open]').forEach((d) => {
      if (!d.contains(e.target)) d.removeAttribute('open');
    });
  });

  // Copiar mensagem de acesso
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const source = document.querySelector('[data-copy-source]');
      try {
        await navigator.clipboard.writeText(source.value);
      } catch (e) {
        source.select();
        document.execCommand('copy');
      }
      toast('Mensagem copiada.');
    });
  });

  // Contagens regressivas
  const countdowns = document.querySelectorAll('[data-countdown]');
  if (countdowns.length) {
    const tick = () => {
      countdowns.forEach((node) => {
        const target = new Date(node.dataset.countdown).getTime();
        let diff = Math.max(0, Math.floor((target - Date.now()) / 1000));
        if (diff === 0) {
          node.textContent = 'agora';
          if (node.hasAttribute('data-reload') && !node.dataset.reloading) {
            node.dataset.reloading = '1';
            setTimeout(() => location.reload(), 1500);
          }
          return;
        }
        const d = Math.floor(diff / 86400);
        diff %= 86400;
        const h = Math.floor(diff / 3600);
        diff %= 3600;
        const m = Math.floor(diff / 60);
        const s = diff % 60;
        const pad = (n) => String(n).padStart(2, '0');
        node.textContent = (d ? d + (d === 1 ? ' dia ' : ' dias ') : '') + pad(h) + ':' + pad(m) + ':' + pad(s);
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  // Caixa de cartas: verifica se chegou carta nova a cada minuto
  const mailbox = document.querySelector('[data-mailbox]');
  if (mailbox) {
    const known = Number(mailbox.dataset.count);
    setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await api('mailbox');
        if (res.count > known) {
          document.querySelector('[data-new-banner]').hidden = false;
          document.title = '(1) ' + document.title.replace(/^\(1\) /, '');
        }
      } catch (e) { /* silencioso */ }
    }, 60000);
  }

  // Instalador: mostra campos do MySQL só quando necessário
  const driver = document.querySelector('[data-driver]');
  if (driver) {
    const fields = document.querySelector('[data-mysql-fields]');
    const sync = () => { fields.hidden = driver.value === 'sqlite'; };
    driver.addEventListener('change', sync);
    sync();
  }

  // Formulário de amigos: sugere o usuário a partir do nome
  const nameInput = document.querySelector('[data-name-input]');
  const userInput = document.querySelector('[data-username-input]');
  if (nameInput && userInput) {
    let touched = userInput.value !== '';
    userInput.addEventListener('input', () => { touched = true; });
    nameInput.addEventListener('input', () => {
      if (touched) return;
      userInput.value = nameInput.value.trim().split(/\s+/)[0]
        .normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    });
  }
})();
