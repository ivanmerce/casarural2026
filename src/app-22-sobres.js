/* ===================== Los dos sobres del cumple =====================
   Desde las 9:00 del día del cumple todos ven dos sobres lacrados en Inicio. Nadie puede abrirlos
   hasta que el admin da la señal. El contenido lo escribe el admin (si lo deja vacío, el sobre de la app
   dice que toca abrir el sobre de verdad). Se guarda en app_config «sobres» (lo escribe el admin directamente).
   v0.7.56: apertura a pantalla completa (el sobre se abre y la carta sale) y ENSAYO completo para el admin:
   ve exactamente lo que verá la familia, paso a paso, sin guardar nada ni avisar a nadie. */

var SOBRES_DEF = { at: '2026-10-11T09:00:00+02:00', open: false, items: [{ title: '', text: '' }, { title: '', text: '' }] };
var SOBRES_NOPE = [
  'Ni lo intentes: está lacrado.',
  'Este sobre tiene más seguridad que el Camp Nou en un clásico.',
  'Paciencia, que así sabe mejor.',
  'El notario oficial de los sobres dice que no. Y tiene chupete.',
  'Mirar a contraluz también cuenta como trampa.',
  'Se aceptan teorías. No se aceptan trampas.',
  'Cuanto más lo tocas, más tarda. (Es mentira, pero por si acaso.)'
];
function sobresReal() {
  var s = S.sobres || {};
  var it = (s.items && s.items.length ? s.items : SOBRES_DEF.items).slice(0, 2);
  while (it.length < 2) it.push({ title: '', text: '' });
  return { at: s.at || SOBRES_DEF.at, open: !!s.open, openedAt: s.openedAt || null, items: it };
}
/* lo que se pinta: la realidad o, en el ensayo, la simulación (mismos textos, apertura simulada) */
function sobresState() {
  var r = sobresReal();
  if (ui.sobresSim) return { at: r.at, open: !!ui.sobresSim.open, openedAt: ui.sobresSim.openedAt || null, items: r.items, sim: true };
  return r;
}
function sobresAdmin() { return !!(me() && me().role === 'admin'); }
function sobresLive() {
  var st = sobresReal(), t = new Date(st.at).getTime(), end = t + 36 * 3600 * 1000;
  return Date.now() >= t && Date.now() < end;
}
function sobresSave(v) {
  S.sobres = v;
  return (typeof PHOTOS !== 'undefined' && PHOTOS.demo === false && window.CLOUD && CLOUD.sb)
    ? CLOUD.sb().from('app_config').upsert({ key: 'sobres', value: v }).then(function (r) { if (r.error) throw r.error; })
    : Promise.resolve();
}
function sobreSeal() { return S.trip && S.trip.eggs && S.trip.eggs.bdayAge ? esc(String(S.trip.eggs.bdayAge)) : '★'; }
function sobreTitle(x, i) { return x.title ? esc(x.title) : 'Sobre ' + (i + 1); }
function sobreBody(x) { return x.text ? esc(x.text).replace(/\n/g, '<br>') : '¡Ya podéis abrir el sobre de verdad!'; }

function sobresCard() {
  var adm = sobresAdmin(), live = sobresLive(), sim = !!ui.sobresSim;
  if (!live && !adm) return '';
  var st = sobresState(), who = esc(bdayName());
  if (!sim && st.open && ui.sobresSeen !== st.openedAt && live) {   /* la señal: todos se enteran a la vez */
    ui.sobresSeen = st.openedAt;
    setTimeout(function () { sobresSignalFx(false); }, 400);
  }
  var h = '<section class="card sobres-card' + (st.open ? ' is-open' : '') + (sim ? ' is-sim' : '') + '" id="sobres">';
  if (sim) h += '<div class="sobres-simbar"><b>' + icon('eye') + 'Ensayo: así lo ve la familia.</b><span>No se guarda nada y nadie más lo ve.</span><div class="row wrap">' +
    (st.open ? '<button class="btn ghost" data-act="sobresSimReset">' + icon('undo') + 'Volver a cerrarlos</button>'
      : '<button class="btn primary" data-act="sobresSimSignal">' + icon('gift') + 'Simular la señal</button>') +
    '<button class="btn ghost" data-act="sobresSimExit">' + icon('x') + 'Salir del ensayo</button></div>' +
    '<small class="muted">' + (st.open ? 'Paso 3: toca un sobre para abrirlo, como lo hará la familia.' : 'Paso 1: toca un sobre cerrado (verás el aviso de que no se puede). Paso 2: «Simular la señal».') + '</small></div>';
  h += '<div class="card-head"><span class="eyebrow">Cumple de ' + who + '</span><span class="pill ' + (st.open ? 'ok' : 'olive') + '">' + (st.open ? '¡Abiertos!' : 'Alto secreto') + '</span></div>' +
    '<h3>' + (st.open ? 'Dos sobres. Ya hay permiso.' : 'Dos sobres. Cero pistas.') + '</h3>' +
    '<p class="small muted">' + (st.open ? 'Toca un sobre para abrirlo.' : 'Nadie los abre hasta que el jefe dé la señal. Se aceptan teorías; trampas, no.') + '</p>' +
    '<div class="sobres">' + st.items.map(function (x, i) {
      return '<button class="sobre' + (st.open ? ' ready' : '') + '" data-act="sobreTap" data-i="' + i + '" aria-label="Sobre ' + (i + 1) + (st.open ? ': ábrelo' : ': cerrado') + '">' +
        '<span class="sobre-back"></span><span class="sobre-flap"></span><span class="sobre-seal">' + sobreSeal() + '</span>' +
        '<span class="sobre-n">' + sobreTitle(x, i) + '</span></button>';
    }).join('') + '</div>' +
    (st.open ? '' : '<p class="small sobres-lock">🔒 Cerrados hasta nueva orden</p>');
  if (adm && !sim) {
    var real = sobresReal(), empty = real.items.filter(function (x) { return !x.text; }).length;
    h += '<div class="sobres-adm"><span class="lbl">Solo tú ves esto' + (live ? '' : ' (los demás los verán a las ' + esc(real.at.slice(11, 16)) + ')') + '.' +
      (empty ? ' ' + (empty === 2 ? 'Los dos sobres están' : 'Un sobre está') + ' sin texto: al abrirlo saldrá «¡Ya podéis abrir el sobre de verdad!».' : '') + '</span><div class="row wrap">' +
      '<button class="btn primary" data-act="sobresSimStart">' + icon('play') + 'Ensayar todo el proceso</button>' +
      '<button class="btn ghost" data-act="sobresEdit">' + icon('edit') + 'Escribir los sobres</button>' +
      (real.open ? '<button class="btn ghost" data-act="sobresClose">' + icon('undo') + 'Volver a cerrarlos</button>'
        : '<button class="btn ghost" data-act="sobresOpen">' + icon('gift') + '¡Que se abran! (de verdad)</button>') +
      '</div></div>';
  }
  return h + '</section>';
}

/* ---------- La señal: a todos les salta a la vez (en el ensayo, solo a ti) ---------- */
function sobresSignalFx(sim) {
  var old = document.getElementById('sobre-stage'); if (old) old.remove();
  var v = document.createElement('div'); v.className = 'sobre-stage signal'; v.id = 'sobre-stage'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = '<div class="ss-in">' + (sim ? '<span class="ss-sim">Ensayo · solo lo ves tú</span>' : '') +
    '<div class="ss-mini" aria-hidden="true"><i></i><i></i></div>' +
    '<h2>¡Ya se pueden abrir los sobres!</h2><p>Que alguien avise a ' + esc(bdayName()) + '. Están en Inicio.</p>' +
    '<button class="btn primary big-btn" data-ss="go">¡Vamos!</button></div>';
  document.body.appendChild(v);
  try { confetti(2800); fanfare(); emojiFx(['✉️', '🎉', '✨'], 'rain', 200, 30); } catch (e) {}
  if (navigator.vibrate) try { navigator.vibrate([60, 40, 60, 40, 120]); } catch (e) {}
  v.addEventListener('click', function (e) {
    if (e.target.closest('[data-ss="go"]') || e.target === v) {
      v.remove();
      if (ui.tab !== 'inicio') go('inicio');
      setTimeout(function () { var c = document.getElementById('sobres'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120);
    }
  });
}

/* ---------- Abrir un sobre: pantalla completa, el sobre se abre y sale la carta ---------- */
function sobreStage(i, sim) {
  var st = sobresState(), x = st.items[i] || {};
  var old = document.getElementById('sobre-stage'); if (old) old.remove();
  var v = document.createElement('div'); v.className = 'sobre-stage'; v.id = 'sobre-stage'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Sobre ' + (i + 1));
  v.innerHTML = '<div class="ss-in">' + (sim ? '<span class="ss-sim">Ensayo · solo lo ves tú</span>' : '') +
    '<div class="ss-env" aria-hidden="true"><span class="ss-back"></span><span class="ss-paper"></span><span class="ss-front"></span><span class="ss-flap"></span><span class="ss-seal">' + sobreSeal() + '</span></div>' +
    '<div class="ss-card"><span class="eyebrow">' + sobreTitle(x, i) + '</span><p>' + sobreBody(x) + '</p></div>' +
    '<div class="ss-actions">' + (st.items.length > 1 ? '<button class="btn ghost" data-ss="other">Abrir el sobre ' + (2 - i) + '</button>' : '') + '<button class="btn primary" data-ss="close">Cerrar</button></div></div>';
  document.body.appendChild(v); document.body.style.overflow = 'hidden';
  setTimeout(function () { v.classList.add('open'); try { sfx && sfx('whoosh'); } catch (e) {} }, 350);
  setTimeout(function () { v.classList.add('out'); try { confetti(2200); applause(2.2); emojiFx(['🎉', '✨', '🥳'], 'rise', 0, 24); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate([30, 30, 60]); } catch (e) {} }, 1250);
  function close() { v.remove(); document.body.style.overflow = ''; }
  v.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ss]');
    if (b && b.dataset.ss === 'other') { close(); sobreStage(1 - i, sim); return; }
    if ((b && b.dataset.ss === 'close') || e.target === v) close();
  });
}
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var v = document.getElementById('sobre-stage'); if (v) { v.remove(); document.body.style.overflow = ''; } } });

Object.assign(A, {
  sobreTap: function (el) {
    var st = sobresState(), i = +el.dataset.i;
    if (!st.open) {
      el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
      if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) {}
      ui.sobreN = ((ui.sobreN || 0) + 1) % SOBRES_NOPE.length;
      toast(SOBRES_NOPE[ui.sobreN]);
      return;
    }
    el.classList.add('opening');
    setTimeout(function () { el.classList.remove('opening'); sobreStage(i, !!st.sim); }, 450);
  },
  /* ensayo completo (solo admin, nada se guarda) */
  sobresSimStart: function () { if (!sobresAdmin()) return; ui.sobresSim = { open: false }; if (ui.tab !== 'inicio') go('inicio'); else render(true); setTimeout(function () { var c = document.getElementById('sobres'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120); toast('Ensayo: ahora ves los sobres como la familia'); },
  sobresSimSignal: function () { if (!ui.sobresSim) return; ui.sobresSim = { open: true, openedAt: new Date().toISOString() }; render(true); sobresSignalFx(true); },
  sobresSimReset: function () { if (!ui.sobresSim) return; ui.sobresSim = { open: false }; render(true); },
  sobresSimExit: function () { ui.sobresSim = null; render(true); toast('Fin del ensayo. Todo sigue como estaba'); },
  sobresEdit: function () {
    if (!sobresAdmin()) return;
    var st = sobresReal();
    openSheet('<h2>Los dos sobres</h2><p class="small muted">Lo que escribas aquí sale al abrir cada sobre. Si lo dejas vacío, el sobre dirá que toca abrir el de verdad. Después, «Ensayar todo el proceso» para verlo como la familia.</p>' +
      st.items.map(function (x, i) {
        return '<label class="field"><span class="lbl">Sobre ' + (i + 1) + ' · nombre en el sobre</span><input id="sb-t' + i + '" maxlength="40" value="' + esc(x.title || '') + '" placeholder="Sobre ' + (i + 1) + '"></label>' +
          '<label class="field"><span class="lbl">Sobre ' + (i + 1) + ' · lo que hay dentro</span><textarea id="sb-x' + i + '" rows="4" maxlength="800">' + esc(x.text || '') + '</textarea></label>';
      }).join('') +
      '<button class="btn primary block" data-act="sobresSave">' + icon('check') + 'Guardar</button>');
  },
  sobresSave: function () {
    if (!sobresAdmin()) return;
    var st = sobresReal();
    var v = { at: st.at, open: st.open, openedAt: st.openedAt, items: [0, 1].map(function (i) {
      return { title: ((document.getElementById('sb-t' + i) || {}).value || '').trim(), text: ((document.getElementById('sb-x' + i) || {}).value || '').trim() };
    }) };
    sobresSave(v).then(function () { closeSheet(); render(true); toast('Sobres guardados. Siguen cerrados'); }, function () { toast('No he podido guardarlos'); });
  },
  sobresOpen: function (el) {
    if (!sobresAdmin()) return;
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Les salta a todos. Toca otra vez'; return; }
    var st = sobresReal();
    ui.sobresSim = null;
    sobresSave({ at: st.at, open: true, openedAt: new Date().toISOString(), items: st.items }).then(function () { render(true); }, function () { toast('No he podido abrirlos'); });
  },
  sobresClose: function () {
    if (!sobresAdmin()) return;
    var st = sobresReal();
    sobresSave({ at: st.at, open: false, openedAt: null, items: st.items }).then(function () { render(true); toast('Sobres cerrados otra vez'); }, function () { toast('No he podido cerrarlos'); });
  }
});
