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
