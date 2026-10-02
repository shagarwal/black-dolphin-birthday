(function () {
  var body = document.body;
  var reveal = document.getElementById('reveal');
  var button = document.getElementById('open-gift');
  var page = document.getElementById('gift');
  if (!reveal || !button || !page) return;

  function open() {
    if (!body.classList.contains('is-sealed')) return;
    body.classList.remove('is-sealed');
    reveal.setAttribute('aria-hidden', 'true');
    button.disabled = true;
    window.scrollTo(0, 0);
    page.focus({ preventScroll: true });
  }

  button.addEventListener('click', open);

  // Hash deep-link (e.g. shared later) skips the seal.
  if (location.hash === '#gift') open();
})();
