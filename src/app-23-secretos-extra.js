/* ===================== 10 secretos nuevos (v0.7.54) =====================
   Se suman a la lista sin tocar los de siempre: palabras mágicas (buscador de Compra o buzón de ideas),
   gestos del móvil (girarlo, hacer zoom, quedarse sin cobertura, mantener pulsada una foto) y un paseo por toda la app. */

/* v0.7.59: los nombres se leen de la familia al entrar (la web pública no lleva nombres escritos) */
function xN(id, fb) { try { return nameOf(id) || fb; } catch (e) { return fb; } }
function eggsExtraList() { return [
  { k: 'montserrat', name: 'Vistas de diez', how: 'Buscar «Montserrat» en la compra', hint: 'Desde la barbacoa se ve una montaña con forma de sierra. Nómbrala', more: 'En el buscador de Compra, el nombre de la montaña que se ve desde La Barbacoa' },
  { k: 'piedras', name: 'Operación Piscina', how: 'Buscar «piedras» en la compra', hint: 'Alguien tiró algo a la piscina y alguien se mojó por rescatarlo', more: 'En el buscador de Compra: lo que ' + xN('marc', 'el peque') + ' tiró a la piscina' },
  { k: 'gracias', name: 'Bien nacido', how: 'Escribir «gracias» en el buscador o en el buzón de ideas', hint: 'De bien nacido es ser agradecido. Díselo a la app', more: 'Escribe la palabra mágica de la buena educación en el buscador de Compra (o en el buzón)' },
  { k: 'abuelos', name: '151 años de sabiduría', how: 'Buscar «abuelos» en la compra', hint: 'Suma la edad de los que más saben. Pero antes, nómbralos', more: 'Escribe en el buscador de Compra cómo llamamos a ' + xN('nenuca', 'la abuela') + ' y ' + xN('carlos', 'el abuelo') + '' },
  { k: 'visca', name: 'Visca el Cónclave', how: 'Escribir «visca» en el buscador', hint: 'Estamos en Catalunya. Grita algo bonito en catalán… en el buscador', more: 'En el buscador de Compra: la palabra catalana que va antes de «el Barça»' },
  { k: 'offline', name: 'Turismo rural auténtico', how: 'Quedarse sin conexión con la app abierta', hint: 'En el campo, a veces lo mejor es no tener cobertura. Pruébalo con la app abierta', more: 'Activa el modo avión unos segundos con la app abierta (y luego quítalo, que si no no cuenta en el ranking)' },
  { k: 'cine', name: 'Modo panorámico', how: 'Girar el móvil en horizontal', hint: 'Esta app también sabe verse en pantalla ancha. Gira la cabeza… o el móvil', more: 'Pon el móvil en horizontal con la app abierta (con el giro automático activado)' },
  { k: 'lupa', name: 'Ojo de lince', how: 'Hacer zoom con dos dedos', hint: 'Hay detalles que solo se ven de cerca. Pellizca la pantalla… al revés', more: 'Separa dos dedos sobre la pantalla para hacer zoom' },
  { k: 'turista', name: 'Turista de la finca', how: 'Pasar por las 8 pestañas de abajo en la misma visita', hint: 'Quien no se mueve no conoce. Pasa por todas las secciones de abajo', more: 'Toca una a una las 8 pestañas de la barra de abajo, de Inicio a Cuentas' },
  { k: 'abrazo', name: 'Abrazo largo', how: 'Mantener pulsada 2 segundos la foto de alguien', hint: 'Hay fotos que se tocan una vez. Y hay fotos a las que se abraza', more: 'Mantén el dedo 2 segundos sobre la foto de cualquiera de la familia' },
  { k: 'fisgon', name: 'Pesado y fisgón', how: 'Insistir con los sobres lacrados', hint: 'La curiosidad mató al gato. A ti solo te dará un secreto: insiste con lo que no es tuyo', more: 'Abre los sobres lacrados del Inicio una y otra vez (4 veces), o intenta romper el lacre sin tener la llave' }
]; }
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
  fisgon:     { emo: '🕵️', fx: ['emoji:🕵️ ✉️ 👀', 'stars'], quip: 'Pesado, fisgón y cotilla: triplete. Los sobres siguen cerrados, pero tú ya tienes un secreto más.' },
  abrazo:     { emo: '🤗', fx: ['rise:🤗 💞 ✨', 'cannons'], quip: 'Abrazo enviado. Devolución garantizada.' }
};
var _buildEggs0 = buildEggs;
buildEggs = function () {
  _buildEggs0();
  eggsExtraList().forEach(function (e) { if (!EGGS.some(function (x) { return x.k === e.k; })) EGGS.push(e); });
};
var _secretStyle0 = secretStyle;
secretStyle = function (k) { return EGG_STYLE_EXTRA[k] || _secretStyle0(k); };
function eggsReady() { return !!S && EGGS.length > 0; }
function extraEgg(k, text) { if (eggsReady() && !hasEgg(k)) eggToast(k, text); }

/* ---------- Palabras mágicas: buscador de Compra y buzón de ideas ---------- */
var MAGIC_WORDS = [
  { re: /\bmontserrat\b/i, k: 'montserrat', text: 'Desde La Barbacoa se ve Montserrat. Dicen que sus rocas parecen una sierra; esta familia jura que parecen una fila de croquetas.' },
  { re: /\bpiedras?\b/i, k: 'piedras', text: function () { return xN('marc', 'El peque') + ' tiró las piedras a la piscina. ' + xN('hugo', 'Alguien') + ' se tiró a por ellas. En octubre. ' + xN('marc', 'El peque') + ' ya está preparando la segunda tanda.'; } },
  { re: /\bgracias\b/i, k: 'gracias', text: 'La app no come ni bebe, pero se ha emocionado. Ahora dilo también en voz alta a quien ha cocinado hoy.' },
  { re: /\babuel[oa]s\b/i, k: 'abuelos', text: function () { return xN('nenuca', 'La abuela') + ' (75) y ' + xN('carlos', 'el abuelo') + ' (76): 151 años entre los dos de sabiduría, paciencia y tápers. Y encima pagan la casa.'; } },
  { re: /\bvisca\b/i, k: 'visca', text: 'Visca la família, visca la finca i visca el Cónclave! Si alguien grita «i el Barça», también vale.' }
];
function magicWords(v) {
  if (!eggsReady() || !v) return;
  MAGIC_WORDS.forEach(function (m) {
    if (!m.re.test(v) || hasEgg(m.k) || ui['_mw_' + m.k]) return;
    ui['_mw_' + m.k] = true; setTimeout(function () { ui['_mw_' + m.k] = false; }, 4000);
    eggToast(m.k, typeof m.text === 'function' ? m.text() : m.text);
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
function offlineEgg() { extraEgg('offline', 'Sin cobertura. Enhorabuena: has llegado al nivel máximo de casa rural. Mira por la ventana: eso de ahí fuera se llama paisaje.'); }
window.addEventListener('offline', offlineEgg);
/* v0.7.63: en el iPhone el aviso de «sin conexión» a veces no llega (sobre todo con la app en la pantalla de inicio).
   Por eso también se comprueba al volver a la app y cada pocos segundos. */
function offlineCheck() { try { if (navigator.onLine === false) offlineEgg(); } catch (e) {} }
document.addEventListener('visibilitychange', function () { if (!document.hidden) { offlineCheck(); setTimeout(offlineCheck, 1200); } });
window.addEventListener('focus', function () { setTimeout(offlineCheck, 300); });
window.addEventListener('pageshow', function () { setTimeout(offlineCheck, 300); });
setInterval(offlineCheck, 3000);

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

/* ---------- v0.7.62 · Pesado y fisgón: insistir con los sobres lacrados ---------- */
var FISGON_TXT = 'Eres un pesado y un fisgón. Los sobres siguen lacrados y la llave no la tienes tú. Cuando el jefe dé la señal, te enteras como todos. Mientras tanto, toma: un secreto por cotilla.';
if (A.sbOpen) {
  var _sbOpen0 = A.sbOpen;
  A.sbOpen = function (el, e) {
    ui._sbPeek = (ui._sbPeek || 0) + 1;
    if (ui._sbPeek >= 4 && eggsReady() && !hasEgg('fisgon')) { extraEgg('fisgon', FISGON_TXT); return; }   /* esta vez, en vez del sobre, el secreto */
    return _sbOpen0(el, e);
  };
}
if (typeof sbNope === 'function') {
  var _sbNope0 = sbNope;
  sbNope = function (l) {
    _sbNope0(l);
    ui._sbNope = (ui._sbNope || 0) + 1;
    if (ui._sbNope >= 3 && eggsReady() && !hasEgg('fisgon')) setTimeout(function () { sobreClose(); setTimeout(function () { extraEgg('fisgon', FISGON_TXT); }, 350); }, 900);
  };
}

/* ---------- v0.7.63/64 · «La Matriarca»: segunda oportunidad para los que duermen ----------
   El «Noctámbulo» (abrir la app de madrugada) ya no se puede conseguir: con el cierre a las 18:00 no queda ninguna madrugada.
   Quien no lo tiene lo cambia por «La Matriarca» (mismo hueco, el total sigue igual para todos).
   Quien ya lo tiene no nota nada. Lista sacada del ranking el domingo a las 09:45 (nadie más puede conseguirlo ya). */
var MATRIARCA_PID = 'nenuca';
var BUHO_HAVE = ['clara', 'hugo', 'ivan', 'lucas', 'marta', 'sergi'];
function eggMatriarca() { return { k: 'matriarca', name: 'La Matriarca', how: 'Escribir «te quiero» (o «¿has comido?») en el buscador o en el buzón', hint: 'Las dos palabras que más repite una abuela… después de «¿has comido?». Escríbelas en el buscador de la compra', more: 'En el buscador de Compra (o en el buzón de ideas), escribe «te quiero»' }; }
EGG_STYLE_EXTRA.matriarca = { emo: '👑', fx: ['rise:❤️ 👑 🌹 ✨', 'fireworks'], quip: 'Dormir a su hora también tiene premio. La jefa lo aprueba.' };
var eggsWho = null, EGGS_BUHO = null;
function matriarcaSwap() {   /* ¿a esta persona le toca «La Matriarca» en lugar del «Noctámbulo»? */
  if (!ui.me || BUHO_HAVE.indexOf(ui.me) >= 0) return false;
  var f = {}; try { f = _foundMap0() || {}; } catch (e) {}
  return !f.buho;   /* si lo consiguió en este móvil, se lo queda */
}
function eggsPersonal() {
  if (!EGGS.length || eggsWho === (ui.me || '')) return;
  eggsWho = ui.me || '';
  var swap = matriarcaSwap(), iB = -1, iM = -1;
  EGGS.forEach(function (e, i) { if (e.k === 'buho') iB = i; if (e.k === 'matriarca') iM = i; });
  if (iB >= 0) EGGS_BUHO = EGGS[iB];
  if (swap && iB >= 0 && iM < 0) EGGS.splice(iB, 1, eggMatriarca());
  else if (!swap && iM >= 0 && EGGS_BUHO) EGGS.splice(iM, 1, EGGS_BUHO);
}
var _buildEggs1 = buildEggs;
buildEggs = function () { _buildEggs1(); eggsWho = null; eggsPersonal(); };
var _foundMap0 = foundMap;
foundMap = function () { try { eggsPersonal(); } catch (e) {} return _foundMap0(); };
var MATRIARCA_RE = /te\s*quiero|has\s+comido/i;
function matriarcaWords(v) {
  if (!v || !eggsReady() || !MATRIARCA_RE.test(v)) return;
  if (!EGGS.some(function (e) { return e.k === 'matriarca'; }) || hasEgg('matriarca') || ui._mwMat) return;
  ui._mwMat = true; setTimeout(function () { ui._mwMat = false; }, 4000);
  var ab = xN(MATRIARCA_PID, 'la abuela');
  eggToast('matriarca', ui.me === MATRIARCA_PID
    ? ab + ': 75 años, una tribu de nietos, tápers infinitos y la pregunta eterna: «¿has comido?». Este secreto es tuyo. Te queremos.'
    : '«¿Has comido?» y «te quiero»: las dos frases oficiales de ' + ab + '. El secreto ya es tuyo, pero solo vale de verdad si vas y se las dices en persona. Con abrazo incluido.');
}
document.addEventListener('input', function (e) { var t = e.target; if (t && t.dataset && t.dataset.input === 'search') matriarcaWords(t.value); });
if (A.ideaAdd) {
  var _ideaAdd1 = A.ideaAdd;
  A.ideaAdd = function (el, e) {
    var t = document.getElementById('idea-text'), v = t ? t.value : '';
    _ideaAdd1(el, e);
    if (v.trim().length >= 3) setTimeout(function () { matriarcaWords(v); }, 1100);
  };
}
/* Aviso (una vez por persona) para quien recibe el cambio. Usa las ventanitas de app-25-avisos */
var MAT_BORN = Date.now();
setInterval(function () {
  try {
    if (typeof avShow !== 'function' || typeof avBlocked !== 'function' || avBlocked() || Date.now() - MAT_BORN < 7000) return;
    if (!eggsReady() || avSeen('matriarca')) return;
    foundMap();
    if (!EGGS.some(function (e) { return e.k === 'matriarca'; }) || hasEgg('matriarca') || secretsClosed()) return;
    avMark('matriarca');
    avShow({
      cls: 'is-cierre', title: 'Segunda oportunidad para los que duermen',
      text: 'El secreto «Noctámbulo» pedía abrir la app de madrugada y ya no queda ninguna antes del cierre. Como dormir no es pecado, te lo hemos cambiado por uno nuevo: <b>«La Matriarca»</b>.<br><br>Pista: las dos palabras que más repite una abuela… después de «¿has comido?». Escríbelas en el buscador de la compra.',
      go: icon('search') + 'Ver mis secretos', ok: 'Vale',
      top: '<div class="aviso-clock" aria-hidden="true"><span>👑</span></div>',
      onGo: function () { if (A.secrets) A.secrets(); }
    });
  } catch (e) {}
}, 2000);
