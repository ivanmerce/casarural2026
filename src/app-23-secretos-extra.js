/* ===================== 10 secretos nuevos (v0.7.54) =====================
   Se suman a la lista sin tocar los de siempre: palabras mágicas (buscador de Compra o buzón de ideas),
   gestos del móvil (girarlo, hacer zoom, quedarse sin cobertura, mantener pulsada una foto) y un paseo por toda la app. */

var EGGS_EXTRA = [
  { k: 'montserrat', name: 'Vistas de diez', how: 'Buscar «Montserrat» en la compra', hint: 'Desde la barbacoa se ve una montaña con forma de sierra. Nómbrala', more: 'En el buscador de Compra, el nombre de la montaña que se ve desde La Barbacoa' },
  { k: 'piedras', name: 'Operación Piscina', how: 'Buscar «piedras» en la compra', hint: 'Alguien tiró algo a la piscina y alguien se mojó por rescatarlo', more: 'En el buscador de Compra: lo que Marc tiró a la piscina' },
  { k: 'gracias', name: 'Bien nacido', how: 'Escribir «gracias» en el buscador o en el buzón de ideas', hint: 'De bien nacido es ser agradecido. Díselo a la app', more: 'Escribe la palabra mágica de la buena educación en el buscador de Compra (o en el buzón)' },
  { k: 'abuelos', name: '151 años de sabiduría', how: 'Buscar «abuelos» en la compra', hint: 'Suma la edad de los que más saben. Pero antes, nómbralos', more: 'Escribe en el buscador de Compra cómo llamamos a Nenuca y Carlos' },
  { k: 'visca', name: 'Visca el Cónclave', how: 'Escribir «visca» en el buscador', hint: 'Estamos en Catalunya. Grita algo bonito en catalán… en el buscador', more: 'En el buscador de Compra: la palabra catalana que va antes de «el Barça»' },
  { k: 'offline', name: 'Turismo rural auténtico', how: 'Quedarse sin conexión con la app abierta', hint: 'En el campo, a veces lo mejor es no tener cobertura. Pruébalo con la app abierta', more: 'Activa el modo avión unos segundos con la app abierta (y luego quítalo, que si no no cuenta en el ranking)' },
  { k: 'cine', name: 'Modo panorámico', how: 'Girar el móvil en horizontal', hint: 'Esta app también sabe verse en pantalla ancha. Gira la cabeza… o el móvil', more: 'Pon el móvil en horizontal con la app abierta (con el giro automático activado)' },
  { k: 'lupa', name: 'Ojo de lince', how: 'Hacer zoom con dos dedos', hint: 'Hay detalles que solo se ven de cerca. Pellizca la pantalla… al revés', more: 'Separa dos dedos sobre la pantalla para hacer zoom' },
  { k: 'turista', name: 'Turista de la finca', how: 'Pasar por las 8 pestañas de abajo en la misma visita', hint: 'Quien no se mueve no conoce. Pasa por todas las secciones de abajo', more: 'Toca una a una las 8 pestañas de la barra de abajo, de Inicio a Cuentas' },
  { k: 'abrazo', name: 'Abrazo largo', how: 'Mantener pulsada 2 segundos la foto de alguien', hint: 'Hay fotos que se tocan una vez. Y hay fotos a las que se abraza', more: 'Mantén el dedo 2 segundos sobre la foto de cualquiera de la familia' }
];
var EGG_STYLE_EXTRA = {
  montserrat: { emo: '⛰️', fx: ['emoji:⛰️ 🌄 📸', 'stars'], quip: 'Montaña a la vista, barbacoa encendida y nadie con ganas de subirla. Turismo rural en estado puro.' },
  piedras:    { emo: '🪨', fx: ['rise:🫧 🪨 🏊', 'cannons'], quip: 'Las piedras están a salvo. La dignidad tras un baño en octubre, no tanto.' },
  gracias:    { emo: '🙏', fx: ['rise:💖 🙏 ✨', 'stars'], quip: 'Gracias a ti. Y a los abuelos, que pagan la casa. Y a quien friegue.' },
  abuelos:    { emo: '👵', fx: ['emoji:👵 👴 ❤️ 🏠', 'fireworks'], quip: 'Más sabe el diablo por viejo que por diablo. Y estos dos saben un montón.' },
  visca:      { emo: '💛', fx: ['emoji:💛 ❤️ 🎉', 'cannons'], quip: 'Bon dia, bona tarda i bona nit: ja ets de la casa.' },
  offline:    { emo: '📵', fx: ['stars', 'emoji:📵 🌳 🌄'], quip: 'La app funciona sin internet. La familia, también.' },
  cine:       { emo: '🍿', fx: ['emoji:🍿 🎬 📽️', 'stars'], quip: 'Lo mejor del cine en casa rural: aquí nadie te manda callar.' },
  lupa:       { emo: '🦅', fx: ['emoji:🔎 🦅 👀', 'stars'], quip: 'Si lo ves todo tan grande, igual necesitas las gafas del abuelo.' },
  turista:    { emo: '🧭', fx: ['emoji:🧭 🗺️ 📍', 'fireworks'], quip: 'Turista oficial: solo te faltan la gorra y la riñonera.' },
  abrazo:     { emo: '🤗', fx: ['rise:🤗 💞 ✨', 'cannons'], quip: 'Abrazo enviado. Devolución garantizada.' }
};
var _buildEggs0 = buildEggs;
buildEggs = function () {
  _buildEggs0();
  EGGS_EXTRA.forEach(function (e) { if (!EGGS.some(function (x) { return x.k === e.k; })) EGGS.push(e); });
};
var _secretStyle0 = secretStyle;
secretStyle = function (k) { return EGG_STYLE_EXTRA[k] || _secretStyle0(k); };
function eggsReady() { return !!S && EGGS.length > 0; }
function extraEgg(k, text) { if (eggsReady() && !hasEgg(k)) eggToast(k, text); }

/* ---------- Palabras mágicas: buscador de Compra y buzón de ideas ---------- */
var MAGIC_WORDS = [
  { re: /\bmontserrat\b/i, k: 'montserrat', text: 'Desde La Barbacoa se ve Montserrat. Dicen que sus rocas parecen una sierra; esta familia jura que parecen una fila de croquetas.' },
  { re: /\bpiedras?\b/i, k: 'piedras', text: 'Marc tiró las piedras a la piscina. Hugo se tiró a por ellas. En octubre. Marc ya está preparando la segunda tanda.' },
  { re: /\bgracias\b/i, k: 'gracias', text: 'La app no come ni bebe, pero se ha emocionado. Ahora dilo también en voz alta a quien ha cocinado hoy.' },
  { re: /\babuel[oa]s\b/i, k: 'abuelos', text: 'Nenuca (75) y Carlos (76): 151 años entre los dos de sabiduría, paciencia y tápers. Y encima pagan la casa.' },
  { re: /\bvisca\b/i, k: 'visca', text: 'Visca la família, visca la finca i visca el Cónclave! Si alguien grita «i el Barça», también vale.' }
];
function magicWords(v) {
  if (!eggsReady() || !v) return;
  MAGIC_WORDS.forEach(function (m) {
    if (!m.re.test(v) || hasEgg(m.k) || ui['_mw_' + m.k]) return;
    ui['_mw_' + m.k] = true; setTimeout(function () { ui['_mw_' + m.k] = false; }, 4000);
    eggToast(m.k, m.text);
  });
}
document.addEventListener('input', function (e) { var t = e.target; if (t && t.dataset && t.dataset.input === 'search') magicWords(t.value); });
if (A.ideaAdd) {
  var _ideaAdd0 = A.ideaAdd;
  A.ideaAdd = function (el, e) {
    var t = document.getElementById('idea-text'), v = t ? t.value : '';
    _ideaAdd0(el, e);
    if (v.trim().length >= 3) setTimeout(function () { magicWords(v); }, 900);
  };
}

/* ---------- Sin cobertura ---------- */
window.addEventListener('offline', function () {
  extraEgg('offline', 'Sin cobertura. Enhorabuena: has llegado al nivel máximo de casa rural. Mira por la ventana: eso de ahí fuera se llama paisaje.');
});

/* ---------- Móvil en horizontal ---------- */
try {
  var mqCine = window.matchMedia('(orientation: landscape) and (max-height: 520px)');
  var onCine = function () { if (mqCine.matches) extraEgg('cine', 'Pantalla panorámica activada: la finca en 16:9 y sin anuncios. Solo faltan las palomitas.'); };
  if (mqCine.addEventListener) mqCine.addEventListener('change', onCine); else if (mqCine.addListener) mqCine.addListener(onCine);
} catch (e) {}

/* ---------- Zoom con dos dedos ---------- */
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', function () {
    if (window.visualViewport.scale >= 1.6) extraEgg('lupa', 'Ojo de lince: ahora ves hasta las migas de la barbacoa. Para volver, junta los dedos.');
  });
}

/* ---------- Pasar por las 8 pestañas ---------- */
var _secretsOnView0 = typeof secretsOnView === 'function' ? secretsOnView : null;
secretsOnView = function () {
  if (_secretsOnView0) _secretsOnView0();
  try {
    if (!eggsReady() || hasEgg('turista')) return;
    ui._seenTabs = ui._seenTabs || {}; ui._seenTabs[ui.tab] = 1;
    if (TABS.every(function (t) { return ui._seenTabs[t.k]; })) extraEgg('turista', 'Has pasado por todas las secciones. Ya conoces la app mejor que quien la hizo. Bueno, casi.');
  } catch (e) {}
};

/* ---------- Mantener pulsada una foto ---------- */
var hugT = null, hugXY = null;
function hugStop() { clearTimeout(hugT); hugT = null; hugXY = null; }
document.addEventListener('pointerdown', function (e) {
  var a = e.target && e.target.closest && e.target.closest('.av');
  if (!a || a.closest('.sobre') || !eggsReady() || hasEgg('abrazo')) return;
  hugStop(); hugXY = [e.clientX, e.clientY];
  hugT = setTimeout(function () {
    hugT = null;
    var n = a.getAttribute('title') || 'alguien de la familia';
    extraEgg('abrazo', 'Abrazo virtual de dos segundos para ' + esc(n) + '. Los de verdad duran más y no gastan batería: ve a por uno.');
  }, 2000);
}, { passive: true });
document.addEventListener('pointermove', function (e) {
  if (hugT && hugXY && Math.abs(e.clientX - hugXY[0]) + Math.abs(e.clientY - hugXY[1]) > 14) hugStop();
}, { passive: true });
['pointerup', 'pointercancel'].forEach(function (ev) { document.addEventListener(ev, hugStop, { passive: true }); });
window.addEventListener('scroll', hugStop, { passive: true });
