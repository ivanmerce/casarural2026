/* node build.js
   → site/index.html : web pública (GitHub Pages). SIN datos personales: todo llega de Supabase tras entrar.
   → dist/app.html y dist/index.html : demo con datos locales (solo si existe src/seed.js, que es privado). */
var fs = require('fs'), path = require('path');
var src = function (f) { return fs.readFileSync(path.join(__dirname, 'src', f), 'utf8'); };
var has = function (f) { return fs.existsSync(path.join(__dirname, 'src', f)); };
var css = src('styles.css');
var APP = ['app-1-core.js', 'app-2-views.js', 'app-2b-asistencia.js', 'app-2c-presence.js', 'app-3-views.js', 'app-4-actions.js', 'app-6-juegos.js', 'app-7-album.js', 'app-8-manual.js'];
var icon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E3304A"/><stop offset="1" stop-color="#9E0D25"/></linearGradient></defs><rect width="40" height="40" rx="10" fill="url(#g)"/><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9.5 11 30.5M20 9.5 29 30.5M11 20.5 29 20.5" stroke-width="1.1" stroke-opacity=".4"/><path d="M6.5 20.5 20 9.5 33.5 20.5M11 18v12.5h18V18" stroke-width="2.1"/><path d="M17.4 30.5v-5.2a2.6 2.6 0 0 1 5.2 0v5.2" stroke-width="1.8"/></g><g fill="#fff"><circle cx="20" cy="9.5" r="2.6"/><circle cx="6.5" cy="20.5" r="2.3"/><circle cx="33.5" cy="20.5" r="2.3"/><circle cx="11" cy="30.5" r="2.3"/><circle cx="29" cy="30.5" r="2.3"/></g><rect x="18.2" y="15.4" width="3.6" height="3.6" rx=".9" fill="#F6CD62"/></svg>');
var head = '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Casa Rural">\n<link rel="icon" href="' + icon + '">\n<link rel="apple-touch-icon" href="' + icon + '">\n';
function page(body) { return head + body.replace(/<div class="ambient"/, '</head>\n<body>\n<div class="ambient"') + '\n</body>\n</html>\n'; }
function bundle(files, pre) { return (pre || '') + src('logic.js') + '\n' + src('games.js') + '\n(function () {\n"use strict";\n' + files.map(src).join('\n') + '\n})();'; }

/* ---- Web pública ---- */
var pubJs = bundle(APP.concat('app-5-cloud.js'));
var pubBody = src('shell.html').replace('/*__CSS__*/', function () { return css; })
  .replace('<script>\n/*__JS__*/', function () { return '<script src="config.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n<script>\n' + pubJs; });
var pub = page(pubBody);
fs.mkdirSync(path.join(__dirname, 'site'), { recursive: true });

/* ---- Demo local (privada) + control: la web pública no puede contener ningún dato de la semilla ---- */
if (has('seed.js')) {
  var SEED = require('./src/seed.js');
  var words = [SEED.trip.place, SEED.trip.town, SEED.trip.address].concat(SEED.people.map(function (p) { return p.name; }), SEED.people.map(function (p) { return p.email; })).filter(function (w) { return w && w.length > 3; });
  var bad = words.filter(function (w) { return new RegExp('(^|[^\\p{L}])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '($|[^\\p{L}])', 'u').test(pub); });
  if (bad.length) { console.error('ERROR: la web pública contiene datos personales: ' + bad.join(' · ')); process.exit(1); }
  var body = src('shell.html').replace('/*__CSS__*/', function () { return css; }).replace('/*__JS__*/', function () { return bundle(APP, src('seed.js') + '\n' + (has('avatars.js') ? src('avatars.js') + '\n' : '')); });
  fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'dist', 'app.html'), body);
  fs.writeFileSync(path.join(__dirname, 'dist', 'index.html'), page(body));
  console.log('dist/app.html ' + (body.length / 1024).toFixed(1) + ' KB (demo con datos)');
}
fs.writeFileSync(path.join(__dirname, 'site', 'index.html'), pub);
if (!fs.existsSync(path.join(__dirname, 'site', 'config.js'))) fs.writeFileSync(path.join(__dirname, 'site', 'config.js'), "/* Configuración pública: la clave 'anon' de Supabase es pública por diseño; los permisos los pone RLS */\nwindow.CONCLAVE_CONFIG = { supabaseUrl: '', supabaseKey: '', siteUrl: '' };\n");
fs.writeFileSync(path.join(__dirname, 'site', '.nojekyll'), '');
console.log('site/index.html ' + (pub.length / 1024).toFixed(1) + ' KB (sin datos personales)');
