// Miniaturas dos modelos: renderiza a carta em tamanho real e reduz
(function () {
  'use strict';
  const data = JSON.parse(document.getElementById('tpl-data').textContent);
  const fit = () => {
    document.querySelectorAll('[data-tpl]').forEach((node) => {
      const box = node.parentElement.getBoundingClientRect();
      node.style.transform = 'scale(' + box.width / 760 + ')';
    });
  };
  document.querySelectorAll('[data-tpl]').forEach((node) => {
    Letter.renderLetter(node, data[node.dataset.tpl]);
  });
  fit();
  window.addEventListener('resize', fit);
})();

// Assistente: confere o link da trilha e mostra que está escrevendo
(function () {
  'use strict';
  const input = document.querySelector('[data-music-input]');
  const hint = document.querySelector('[data-music-hint]');
  if (input && hint) {
    const base = hint.textContent;
    input.addEventListener('input', () => {
      const v = input.value.trim();
      const parsed = v ? Letter.parseMusicUrl(v) : null;
      hint.classList.toggle('bad', !!v && !parsed);
      hint.textContent = !v ? base
        : !parsed ? 'Não reconheci esse link. Cole o endereço de uma música do YouTube ou do Spotify.'
          : parsed.provider === 'youtube' ? '✓ YouTube: toca sozinha quando a pessoa abrir o envelope.'
            : '✓ Spotify: aparece um player pequeno, e a pessoa toca no ▶ (o Spotify não deixa tocar sozinho).';
    });
  }
  const form = document.querySelector('[data-new-letter]');
  const btn = document.querySelector('[data-assistant-submit]');
  if (form && btn) {
    form.addEventListener('submit', (e) => {
      if (e.submitter !== btn) return;
      const ia = form.querySelector('input[name=ia]');
      btn.classList.add('is-busy');
      btn.lastChild.textContent = ia && ia.checked ? 'Escrevendo com carinho…' : 'Preparando sua carta…';
      setTimeout(() => { btn.disabled = true; }, 0); // depois do envio, para não mandar duas vezes
    });
  }
})();
