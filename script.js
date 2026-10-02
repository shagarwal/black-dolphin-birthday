/* Envelope card state machine.
   sealed -> opening (flap) -> out (card slides up) -> unfolded (cover folds back) -> revealed (dolphin, photos). */
(function () {
  'use strict';
  var body = document.body;
  var envelope = document.getElementById('envelope');
  var card = document.getElementById('card');
  var peek = document.getElementById('peek');
  var peekOpen = document.getElementById('peek-open');
  var peekClose = document.getElementById('peek-close');
  var replay = document.getElementById('replay');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var timers = [];
  var busy = false;

  function go(state) { body.dataset.state = state; }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function finish() {
    go('revealed');
    card.inert = false;
    envelope.setAttribute('aria-expanded', 'true');
    envelope.tabIndex = -1;
    card.focus({ preventScroll: true });
    busy = false;
  }

  function open() {
    if (busy || body.dataset.state !== 'sealed') return;
    busy = true;
    if (reduced.matches) { finish(); return; }
    go('opening');                       // seal fades, flap rotates open (700ms + 100ms)
    later(function () { go('out'); }, 500);        // card slides up (800ms)
    later(function () { go('unfolded'); }, 1250);  // envelope exits, card settles into flow and cover folds back (800ms)
    later(finish, 2050);                 // dolphin + photos
  }

  function seal() {
    if (busy) return;
    clearTimers();
    busy = true;
    if (!peek.hidden) closePeek();
    card.inert = true;
    envelope.setAttribute('aria-expanded', 'false');
    envelope.tabIndex = 0;
    go('sealed');
    envelope.focus({ preventScroll: true });
    busy = false;
  }

  var lastFocus = null;
  function openPeek() {
    lastFocus = document.activeElement;
    peek.hidden = false;
    peekOpen.setAttribute('aria-expanded', 'true');
    card.inert = true;
    document.querySelector('.scene').inert = true;
    peek.focus({ preventScroll: true });
    peek.scrollTop = 0;
  }
  function closePeek() {
    peek.hidden = true;
    peekOpen.setAttribute('aria-expanded', 'false');
    document.querySelector('.scene').inert = false;
    card.inert = false;
    (lastFocus || peekOpen).focus({ preventScroll: true });
  }

  envelope.addEventListener('click', open);
  replay.addEventListener('click', seal);
  peekOpen.addEventListener('click', openPeek);
  peekClose.addEventListener('click', closePeek);
  peek.addEventListener('click', function (e) { if (e.target === peek) closePeek(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !peek.hidden) { e.preventDefault(); closePeek(); }
  });

  card.inert = true;
  go('sealed');
})();
