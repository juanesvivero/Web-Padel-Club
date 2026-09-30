# Ambato Pádel Center — sitio web

Sitio estático desplegado en Vercel.

- `npm run dev` — sirve el sitio en local.
- `npm run check` — verifica que teléfono, dirección, horarios, dominio y archivos coincidan, y que la CSP sea coherente.

Archivos principales: `index.html` (plantilla y datos), `ui.js` (interacciones), `analytics.js` (eventos), `vercel.json` (headers y CSP).
`support.js` y `vendor/` son el runtime que renderiza la plantilla; la CSP permite `'unsafe-eval'` por él.
Antes de cambiar de dominio, actualiza canonical, OG, JSON-LD, `robots.txt` y `sitemap.xml`.
