/*
 * Interacciones de la pagina (carruseles de entrenadores y planes).
 *
 * Antes vivian como onclick/onscroll en linea dentro de index.html. Aqui usan
 * atributos data-*, lo que permite una Content-Security-Policy sin 'unsafe-inline'
 * para scripts y mantiene el HTML legible.
 *
 *   data-carousel-root="trainers|programs"   contenedor con scroll horizontal
 *   data-carousel="trainers|programs"        boton que controla ese contenedor
 *     data-index="N"                         punto: ir a la tarjeta N
 *     data-step="-1|1"                       flecha: anterior / siguiente
 */
(function () {
  function reduceMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function behavior() { return reduceMotion() ? 'auto' : 'smooth'; }

  function rootFor(kind) { return document.querySelector('[data-carousel-root="' + kind + '"]'); }
  function dotsFor(kind) {
    return Array.prototype.slice.call(document.querySelectorAll('[data-carousel="' + kind + '"][data-index]'));
  }

  function activeIndex(root) {
    var kind = root.getAttribute('data-carousel-root');
    var max = root.scrollWidth - root.clientWidth;
    if (kind === 'trainers') return root.scrollLeft > max / 3 ? 1 : 0;
    if (max <= 0) return 0;
    var r = root.scrollLeft / max;
    return r < 0.33 ? 0 : (r < 0.67 ? 1 : 2);
  }

  function updateDots(root) {
    var idx = activeIndex(root);
    dotsFor(root.getAttribute('data-carousel-root')).forEach(function (d, i) {
      var on = i === idx;
      d.classList.toggle('is-active', on);
      if (on) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
  }

  // 'scroll' no burbujea: se escucha en la fase de captura sobre el documento
  document.addEventListener('scroll', function (e) {
    var t = e.target;
    if (t && t.nodeType === 1 && t.hasAttribute('data-carousel-root')) updateDots(t);
  }, { capture: true, passive: true });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('[data-carousel]');
    if (!btn) return;
    var kind = btn.getAttribute('data-carousel');
    var root = rootFor(kind);
    if (!root) return;

    var step = btn.getAttribute('data-step');
    if (step !== null) {
      root.scrollBy({ left: root.clientWidth * 0.85 * Number(step), behavior: behavior() });
      return;
    }
    var idx = btn.getAttribute('data-index');
    if (idx === null) return;
    var i = Number(idx), left = 0;
    if (kind === 'trainers') {
      left = i === 0 ? 0 : root.scrollWidth;
    } else if (i > 0 && root.children[i]) {
      left = root.children[i].offsetLeft - root.offsetLeft;
    }
    root.scrollTo({ left: left, behavior: behavior() });
  });

  // Si el carrusel tiene scroll (movil/tablet) se puede enfocar y mover con las flechas del teclado.
  // En escritorio es una cuadricula: no debe ser una parada de tabulador.
  function syncScrollable() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-carousel-root]'), function (root) {
      if (root.scrollWidth > root.clientWidth + 1) root.setAttribute('tabindex', '0');
      else root.removeAttribute('tabindex');
      updateDots(root);
    });
  }

  // El contenido lo pinta el runtime despues de cargar: reintenta hasta que exista
  var tries = 0;
  (function init() {
    if (document.querySelector('[data-carousel-root]')) syncScrollable();
    else if (tries++ < 60) setTimeout(init, 150);
  })();

  // El maquetado puede terminar despues del primer intento (imagenes, fuentes): volver a medir
  window.addEventListener('load', syncScrollable);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncScrollable);
  setTimeout(syncScrollable, 1500);

  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(syncScrollable, 150);
  });
})();
