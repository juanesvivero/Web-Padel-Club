/*
 * Analítica de Ambato Pádel Center
 *
 * - Vercel Analytics y Speed Insights se cargan desde index.html (sin cookies); aqui se definen
 *   sus colas de eventos para que funcionen aunque su script cargue despues.
 * - Google Analytics 4 es opcional: pega tu ID de medición en GA_MEASUREMENT_ID
 *   (formato G-XXXXXXXXXX). Mientras esté vacío, GA4 no se carga.
 *
 * Eventos que se envían:
 *   whatsapp_click  { section, link_text }   cualquier enlace a wa.me
 *   social_click    { network, section }     Instagram, Facebook o TikTok
 *   map_click       { section }              enlaces a Google Maps
 *   review_click    { section }              boton "Déjanos tu reseña" (g.page/r/...)
 *
 * `section` indica desde dónde se hizo clic (inicio, clases, torneos, ubicacion,
 * footer, boton-flotante, menu...).
 */
(function () {
  // Vercel Analytics / Speed Insights: colas hasta que carguen sus scripts (van despues de este archivo)
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function () { (window.siq = window.siq || []).push(arguments); };

  var GA_MEASUREMENT_ID = '';

  // ---- Google Analytics 4 (solo si hay ID) ----
  if (GA_MEASUREMENT_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
    document.head.appendChild(s);
  }

  function track(name, params) {
    try {
      // Vercel Analytics (eventos personalizados: plan Pro)
      if (typeof window.va === 'function') window.va('event', { name: name, data: params });
      // GA4
      if (typeof window.gtag === 'function') window.gtag('event', name, params);
    } catch (e) { /* la analítica nunca debe romper la página */ }
  }

  function sectionOf(el) {
    if (el.closest('.apc-wa-float')) return 'boton-flotante';
    var sec = el.closest('section[id]');
    if (sec) return sec.id;
    if (el.closest('footer')) return 'footer';
    if (el.closest('nav, header')) return 'menu';
    return 'otro';
  }

  function networkOf(href) {
    if (href.indexOf('instagram.com') !== -1) return 'instagram';
    if (href.indexOf('facebook.com') !== -1) return 'facebook';
    if (href.indexOf('tiktok.com') !== -1) return 'tiktok';
    return '';
  }

  // Un solo listener delegado: también cubre los enlaces que React renderiza después
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.href || '';
    var section = sectionOf(a);

    if (href.indexOf('https://wa.me/') === 0) {
      var text = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      track('whatsapp_click', { section: section, link_text: text });
      return;
    }
    if (href.indexOf('g.page/r/') !== -1) {
      track('review_click', { section: section });
      return;
    }
    var net = networkOf(href);
    if (net) {
      track('social_click', { network: net, section: section });
      return;
    }
    if (href.indexOf('google.com/maps') !== -1 || href.indexOf('maps.app.goo.gl') !== -1) {
      track('map_click', { section: section });
    }
  }, true);
})();
