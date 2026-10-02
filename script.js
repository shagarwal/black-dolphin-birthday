(function () {
  var reveal = document.getElementById('reveal');
  var page = document.getElementById('page');
  var btn = document.getElementById('open-gift');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function finish() {
    reveal.classList.add('is-gone');
    reveal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-sealed');
    var h2 = document.getElementById('inn-title');
    if (h2) { h2.setAttribute('tabindex', '-1'); h2.focus({ preventScroll: true }); }
  }

  function open() {
    if (btn.disabled) return;
    btn.disabled = true;
    page.removeAttribute('aria-hidden');
    page.classList.add('is-open');
    if (reduced) {
      reveal.classList.add('is-leaving');
      finish();
      return;
    }
    reveal.classList.add('is-leaving');
    var done = false;
    function once() { if (!done) { done = true; finish(); } }
    reveal.addEventListener('transitionend', once, { once: true });
    setTimeout(once, 900);
  }

  btn.addEventListener('click', open);
  try { btn.focus({ preventScroll: true }); } catch (e) {}
})();
