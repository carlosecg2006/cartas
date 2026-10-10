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

  // ---------- Tema (claro / escuro / automático) ----------
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* ignora */ } },
  };
  document.querySelectorAll('[data-theme-choice]').forEach((radio) => {
    radio.checked = (store.get('theme') || 'auto') === radio.value;
    radio.addEventListener('change', () => {
      if (!radio.checked) return;
      store.set('theme', radio.value === 'auto' ? null : radio.value);
      if (radio.value === 'auto') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', radio.value);
    });
  });

  // ---------- Lembrete gentil (some por um mês quando dispensado) ----------
  const reminder = document.querySelector('[data-reminder]');
  if (reminder) {
    const key = 'lembrete-' + reminder.dataset.reminder;
    if (!store.get(key)) reminder.hidden = false;
    reminder.querySelector('[data-reminder-dismiss]').addEventListener('click', () => {
      store.set(key, '1');
      reminder.hidden = true;
    });
  }

  // ---------- Avisos no celular ----------
  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  function b64ToBytes(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }
  async function pushRegistration() {
    return navigator.serviceWorker.register('sw.js');
  }
  async function currentSubscription() {
    if (!pushSupported) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg ? reg.pushManager.getSubscription() : null;
  }
  async function enablePush() {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Os avisos foram bloqueados. Libere nas configurações do navegador para este site.');
    const reg = await pushRegistration();
    await navigator.serviceWorker.ready;
    const { key } = await api('push_key', {});
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(key) });
    await api('push_subscribe', { endpoint: sub.endpoint });
    return sub;
  }
  // mantém o aparelho cadastrado (o endereço pode mudar com o tempo)
  if (pushSupported && Notification.permission === 'granted' && csrf) {
    currentSubscription().then((sub) => { if (sub) api('push_subscribe', { endpoint: sub.endpoint }).catch(() => {}); }).catch(() => {});
  }

  const panel = document.querySelector('[data-push-panel]');
  if (panel) {
    const status = panel.querySelector('[data-push-status]');
    const btnOn = panel.querySelector('[data-push-enable]');
    const btnTest = panel.querySelector('[data-push-test]');
    const btnOff = panel.querySelector('[data-push-disable]');
    const refresh = async () => {
      btnOn.hidden = btnTest.hidden = btnOff.hidden = true;
      if (!pushSupported) {
        status.textContent = isIos && !standalone
          ? 'No iPhone, os avisos só funcionam com o site instalado na tela de início.'
          : 'Este navegador não aceita avisos.';
        panel.querySelector('[data-push-ios]').hidden = !isIos;
        return;
      }
      if (Notification.permission === 'denied') {
        status.textContent = 'Os avisos estão bloqueados para este site. Libere nas configurações do navegador.';
        return;
      }
      const sub = await currentSubscription().catch(() => null);
      if (sub && Notification.permission === 'granted') {
        status.textContent = 'Ativados neste aparelho.';
        btnTest.hidden = btnOff.hidden = false;
      } else {
        status.textContent = 'Desativados neste aparelho.';
        btnOn.hidden = false;
      }
    };
    btnOn.addEventListener('click', async () => {
      btnOn.disabled = true;
      try {
        await enablePush();
        toast('Avisos ativados.');
      } catch (err) {
        toast(err.message || 'Não consegui ativar os avisos.', 'error');
      }
      btnOn.disabled = false;
      refresh();
    });
    btnTest.addEventListener('click', async () => {
      btnTest.disabled = true;
      try {
        const res = await api('push_test', {});
        if (res.sent) toast('Aviso enviado. Deve chegar em alguns segundos.');
        else toast('O aviso não saiu: ' + (res.error || 'motivo desconhecido') + ' Algumas hospedagens gratuitas bloqueiam isso.', 'error');
      } catch (err) {
        toast(err.message, 'error');
      }
      btnTest.disabled = false;
    });
    btnOff.addEventListener('click', async () => {
      const sub = await currentSubscription().catch(() => null);
      if (sub) {
        await api('push_unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      toast('Avisos desativados neste aparelho.');
      refresh();
    });
    refresh();
  }

  // Convite discreto na caixa de cartas
  const prompt = document.querySelector('[data-push-prompt]');
  if (prompt && pushSupported && Notification.permission === 'default' && !store.get('push-prompt-off')) {
    prompt.hidden = false;
    prompt.querySelector('[data-push-enable]').addEventListener('click', async () => {
      try {
        await enablePush();
        toast('Pronto! Você vai ser avisado(a) quando chegar carta.');
        prompt.hidden = true;
      } catch (err) {
        toast(err.message || 'Não consegui ativar os avisos.', 'error');
        if (Notification.permission === 'denied') prompt.hidden = true;
      }
    });
    prompt.querySelector('[data-push-dismiss]').addEventListener('click', () => {
      store.set('push-prompt-off', '1');
      prompt.hidden = true;
    });
  }
})();
