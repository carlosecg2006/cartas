// Aplica o tema escolhido antes da página aparecer (evita piscar claro → escuro)
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) { /* sem localStorage: segue o sistema */ }
})();
