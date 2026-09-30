// Verifica que los datos repetidos del sitio coincidan entre si.
// Uso: npm run check   (sin dependencias, solo Node)
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const problems = [];
const fail = (m) => problems.push(m);

// --- Datos del cuerpo (renderVals) ---
const grab = (re, label) => {
  const m = html.match(re);
  if (!m) { fail(`No pude leer ${label} en renderVals()`); return ''; }
  return m[1];
};
const number = grab(/const defaultNumber = '(\d+)'/, 'defaultNumber');
const streetFit = grab(/const numberStreetFit = '(\d+)'/, 'numberStreetFit');
const address = grab(/const addressText = '([^']+)'/, 'addressText');
const weekdays = grab(/const hoursWeekdaysText = '([^']+)'/, 'hoursWeekdaysText');
const weekend = grab(/const hoursWeekendText = '([^']+)'/, 'hoursWeekendText');
const times = (t) => (t.match(/\d{2}:\d{2}/g) || []);
const [wdOpen, wdClose] = times(weekdays);
const [weOpen, weClose] = times(weekend);

// --- JSON-LD ---
let ld = null;
try { ld = JSON.parse(html.match(/ld\+json">([\s\S]*?)<\/script>/)[1]); }
catch { fail('El JSON-LD del <head> no es JSON valido'); }

if (ld) {
  if (ld.telephone?.replace(/\D/g, '') !== number) fail(`Telefono: JSON-LD ${ld.telephone} vs cuerpo +${number}`);
  if (ld.address?.streetAddress !== address) fail(`Direccion: JSON-LD "${ld.address?.streetAddress}" vs cuerpo "${address}"`);
  const specs = ld.openingHoursSpecification || [];
  const find = (d) => specs.find((s) => s.dayOfWeek.includes(d));
  const wd = find('Monday'), we = find('Saturday');
  if (!wd || wd.opens !== wdOpen || wd.closes !== wdClose) fail(`Horario L-V: JSON-LD ${wd?.opens}-${wd?.closes} vs cuerpo ${wdOpen}-${wdClose}`);
  if (!we || we.opens !== weOpen || we.closes !== weClose) fail(`Horario S-D: JSON-LD ${we?.opens}-${we?.closes} vs cuerpo ${weOpen}-${weClose}`);
  const fix = (s) => s?.replace(/^https?:\/\//, '');
  if (!ld.url) fail('JSON-LD sin url');
}

// --- Descripciones (meta / OG / Twitter / JSON-LD) ---
const descs = [
  ...html.matchAll(/<meta (?:name|property)="(?:description|og:description|twitter:description)" content="([^"]*)"/g),
].map((m) => m[1]);
if (ld?.description) descs.push(ld.description);
for (const d of descs) {
  if (!d.includes(`${wdOpen} a ${wdClose}`)) fail(`Una descripcion no menciona el horario L-V ${wdOpen} a ${wdClose}: "${d.slice(-90)}"`);
  if (!d.includes(`${weOpen} a ${weClose}`)) fail(`Una descripcion no menciona el horario S-D ${weOpen} a ${weClose}: "${d.slice(-90)}"`);
}
if (new Set(descs).size > 1) fail('Las descripciones (meta, OG, Twitter, JSON-LD) no son identicas');

// --- Dominio: canonical, OG, JSON-LD, robots, sitemap ---
const origins = new Set();
const add = (u) => { try { origins.add(new URL(u).origin); } catch {} };
add(html.match(/rel="canonical" href="([^"]+)"/)?.[1]);
add(html.match(/property="og:url" content="([^"]+)"/)?.[1]);
add(html.match(/property="og:image" content="([^"]+)"/)?.[1]);
add(html.match(/name="twitter:image" content="([^"]+)"/)?.[1]);
if (ld) { add(ld.url); add(ld.image); add(ld.logo); }
for (const f of ['robots.txt', 'sitemap.xml']) {
  if (!existsSync(f)) { fail(`Falta ${f}`); continue; }
  for (const m of readFileSync(f, 'utf8').matchAll(/https?:\/\/[^\s<"]+/g)) if (!m[0].includes('sitemaps.org')) add(m[0]);
}
if (origins.size !== 1) fail(`Dominios distintos entre archivos: ${[...origins].join(', ')}`);

// --- 404.html (estatica, no usa las variables del script) ---
if (existsSync('404.html')) {
  const nf = readFileSync('404.html', 'utf8').match(/wa\.me\/(\d+)/)?.[1];
  if (nf !== number) fail(`404.html: WhatsApp ${nf} vs cuerpo ${number}`);
}

// --- Archivos referenciados existen ---
const refs = new Set([...html.matchAll(/(?:src|poster|href)="(images\/[^"]+)"/g)].map((m) => m[1]));
for (const r of refs) if (!existsSync(decodeURI(r))) fail(`Falta el archivo ${r}`);
for (const f of ['images/og-image.jpg', '404.html']) if (!existsSync(f)) fail(`Falta ${f}`);

// --- CSP: sin manejadores en linea, y la politica no debe permitirlos ---
const inline = html.match(/\son(?:click|scroll|mouseover|mouseout|load|error|focus|blur|change|submit|touchstart|touchend)="/g) || [];
if (inline.length) fail(`index.html tiene ${inline.length} manejador(es) en linea (onclick, onscroll...): la CSP los bloquea. Usa data-* y ui.js`);
if (/<script(?![^>]*\b(?:src|type)=)[^>]*>/i.test(html)) fail('index.html tiene un <script> en linea sin src: la CSP lo bloquea');
try {
  const vj = JSON.parse(readFileSync('vercel.json', 'utf8'));
  const all = vj.headers.flatMap((h) => h.headers);
  const csp = all.find((h) => h.key === 'Content-Security-Policy')?.value || '';
  if (!csp) fail('vercel.json no define Content-Security-Policy');
  const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) || '';
  if (scriptSrc.includes("'unsafe-inline'")) fail("La CSP permite 'unsafe-inline' en script-src");
  if (all.some((h) => h.key === 'X-XSS-Protection')) fail('X-XSS-Protection esta obsoleta: quitala de vercel.json');
} catch { fail('vercel.json no es JSON valido'); }
for (const f of ['ui.js', 'analytics.js']) if (!existsSync(f)) fail(`Falta ${f}`);

// --- Marcadores pendientes ---
for (const f of ['index.html', 'robots.txt', 'sitemap.xml', '404.html']) {
  if (existsSync(f) && /DOMINIO_FINAL|TODO|XXXXXXXX/.test(readFileSync(f, 'utf8'))) fail(`${f} contiene un marcador pendiente`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} problema(s):\n` + problems.map((p) => '  - ' + p).join('\n'));
  process.exit(1);
}
console.log(`✓ Todo coincide: tel +${number}, "${address}", L-V ${wdOpen}-${wdClose}, S-D ${weOpen}-${weClose}, dominio ${[...origins][0]}, ${refs.size} archivos referenciados.`);
