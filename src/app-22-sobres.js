/* ===================== Los dos sobres del cumple =====================
   Desde las 9:00 del día del cumple todos ven dos sobres lacrados en Inicio. Nadie puede abrirlos
   hasta que el admin da la señal. El contenido lo escribe el admin (si lo deja vacío, el sobre de la app
   dice que toca abrir el sobre de verdad). Se guarda en app_config «sobres» (lo escribe el admin directamente).
   v0.7.58: apertura a pantalla completa (tiembla, se rompe el lacre, se abre la solapa y sale la carta) y
   ENSAYO guiado en 3 pasos para el admin (antes de la señal · la señal · abrir los sobres), sin guardar nada. */

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
function sobresState() {
  var s = S.sobres || {};
  var it = (s.items && s.items.length ? s.items : SOBRES_DEF.items).slice(0, 2);
  while (it.length < 2) it.push({ title: '', text: '' });
  return { at: s.at || SOBRES_DEF.at, open: !!s.open, openedAt: s.openedAt || null, items: it };
}
function sobresAdmin() { return !!(me() && me().role === 'admin'); }
function sobresLive() {
  var st = sobresState(), t = new Date(st.at).getTime(), end = t + 36 * 3600 * 1000;
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
function sobreBtn(x, i, ready) {
  return '<button class="sobre' + (ready ? ' ready' : '') + '" data-i="' + i + '" aria-label="Sobre ' + (i + 1) + (ready ? ': ábrelo' : ': cerrado') + '">' +
    '<span class="sobre-back"></span><span class="sobre-flap"></span><span class="sobre-seal">' + sobreSeal() + '</span>' +
    '<span class="sobre-n">' + sobreTitle(x, i) + '</span></button>';
}
function sobreNope(el, sayEl) {
  el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
  if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) {}
  ui.sobreN = ((ui.sobreN || 0) + 1) % SOBRES_NOPE.length;
  if (sayEl) { sayEl.textContent = SOBRES_NOPE[ui.sobreN]; sayEl.classList.remove('pop'); void sayEl.offsetWidth; sayEl.classList.add('pop'); }
  else toast(SOBRES_NOPE[ui.sobreN]);
}

function sobresCard() {
  var adm = sobresAdmin(), live = sobresLive();
  if (!live && !adm) return '';
  var st = sobresState(), who = esc(bdayName());
  if (st.open && ui.sobresSeen !== st.openedAt && live) {   /* la señal: todos se enteran a la vez */
    ui.sobresSeen = st.openedAt;
    setTimeout(function () { sobresSignalFx(); }, 400);
  }
  var h = '<section class="card sobres-card' + (st.open ? ' is-open' : '') + '" id="sobres">' +
    '<div class="card-head"><span class="eyebrow">Cumple de ' + who + '</span><span class="pill ' + (st.open ? 'ok' : 'olive') + '">' + (st.open ? '¡Abiertos!' : 'Alto secreto') + '</span></div>' +
    '<h3>' + (st.open ? 'Dos sobres. Ya hay permiso.' : 'Dos sobres. Cero pistas.') + '</h3>' +
    '<p class="small muted">' + (st.open ? 'Toca un sobre para abrirlo.' : 'Nadie los abre hasta que el jefe dé la señal. Se aceptan teorías; trampas, no.') + '</p>' +
    '<div class="sobres">' + st.items.map(function (x, i) { return sobreBtn(x, i, st.open).replace('<button class="sobre', '<button data-act="sobreTap" class="sobre'); }).join('') + '</div>' +
    (st.open ? '' : '<p class="small sobres-lock">🔒 Cerrados hasta nueva orden</p>');
  if (adm) {
    var empty = st.items.filter(function (x) { return !x.text; }).length;
    h += '<div class="sobres-adm"><span class="lbl">Solo tú ves esto' + (live ? '' : ' (los demás los verán a las ' + esc(st.at.slice(11, 16)) + ')') + '.' +
      (empty ? ' ' + (empty === 2 ? 'Los dos sobres están' : 'Un sobre está') + ' sin texto: al abrirlo saldrá «¡Ya podéis abrir el sobre de verdad!».' : '') + '</span><div class="row wrap">' +
      '<button class="btn primary" data-act="sobresSimStart">' + icon('play') + 'Ensayar todo el proceso</button>' +
      '<button class="btn ghost" data-act="sobresEdit">' + icon('edit') + 'Escribir los sobres</button>' +
      (st.open ? '<button class="btn ghost" data-act="sobresClose">' + icon('undo') + 'Volver a cerrarlos</button>'
        : '<button class="btn ghost" data-act="sobresOpen">' + icon('gift') + '¡Que se abran! (de verdad)</button>') +
      '</div></div>';
  }
  return h + '</section>';
}

/* ---------- La señal (de verdad): a todos les salta a la vez ---------- */
function sobresSignalHtml(fake) {
  return '<div class="ss-mini" aria-hidden="true"><i></i><i></i></div>' +
    '<h2>¡Ya se pueden abrir los sobres!</h2><p>Que alguien avise a ' + esc(bdayName()) + '. Están en Inicio.</p>' +
    '<button class="btn primary big-btn"' + (fake ? ' data-se="next"' : ' data-ss="go"') + '>¡Vamos!</button>';
}
function sobresSignalFx() {
  var old = document.getElementById('sobre-stage'); if (old) old.remove();
  var v = document.createElement('div'); v.className = 'sobre-stage signal'; v.id = 'sobre-stage'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true');
  v.innerHTML = '<div class="ss-in">' + sobresSignalHtml(false) + '</div>';
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

/* ---------- Abrir un sobre: tiembla, se rompe el lacre, se abre la solapa y sale la carta ---------- */
function sobreStage(i, sim) {
  var st = sobresState(), x = st.items[i] || {};
  var old = document.getElementById('sobre-stage'); if (old) old.remove();
  var v = document.createElement('div'); v.className = 'sobre-stage'; v.id = 'sobre-stage'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Sobre ' + (i + 1));
  v.innerHTML = '<div class="ss-in">' + (sim ? '<span class="ss-sim">Ensayo · así lo verá la familia</span>' : '') +
    '<div class="ss-env" aria-hidden="true"><span class="ss-back"></span><span class="ss-paper"></span><span class="ss-front"></span><span class="ss-flap"></span>' +
    '<span class="ss-seal"><i class="l"></i><i class="r"></i><b>' + sobreSeal() + '</b></span></div>' +
    '<p class="ss-hint">Rompiendo el lacre…</p>' +
    '<div class="ss-card"><span class="eyebrow">' + sobreTitle(x, i) + '</span><p>' + sobreBody(x) + '</p>' +
    (sim && !x.text ? '<small class="ss-warn">Aún no has escrito este sobre: esto es lo que saldría.</small>' : '') + '</div>' +
    '<div class="ss-actions">' + (st.items.length > 1 ? '<button class="btn ghost" data-ss="other">Abrir el sobre ' + (2 - i) + '</button>' : '') +
    (sim && !x.text ? '<button class="btn ghost" data-ss="edit">' + icon('edit') + 'Escribirlo</button>' : '') +
    '<button class="btn primary" data-ss="close">Cerrar</button></div></div>';
  document.body.appendChild(v); document.body.style.overflow = 'hidden';
  var T = [];
  T.push(setTimeout(function () { v.classList.add('crack'); try { sfx('boom'); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate(40); } catch (e) {} }, 700));
  T.push(setTimeout(function () { v.classList.add('open'); try { sfx('whoosh'); } catch (e) {} }, 1250));
  T.push(setTimeout(function () { v.classList.add('out'); try { confetti(2200); applause(2.2); emojiFx(['🎉', '✨', '🥳'], 'rise', 0, 24); } catch (e) {} if (navigator.vibrate) try { navigator.vibrate([30, 30, 60]); } catch (e) {} }, 1950));
  function close() { T.forEach(clearTimeout); v.remove(); if (!document.getElementById('sobres-ensayo')) document.body.style.overflow = ''; }
  v.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ss]');
    if (b && b.dataset.ss === 'other') { close(); sobreStage(1 - i, sim); return; }
    if (b && b.dataset.ss === 'edit') { close(); var en = document.getElementById('sobres-ensayo'); if (en) en.remove(); document.body.style.overflow = ''; A.sobresEdit(); return; }
    if ((b && b.dataset.ss === 'close') || e.target === v) close();
  });
}

/* ---------- Ensayo guiado (solo admin, nada se guarda, nadie más lo ve) ---------- */
var SE_STEPS = ['Antes de la señal', 'La señal', 'Abrir los sobres'];
function sobresEnsayo(step) {
  var st = sobresState(), v = document.getElementById('sobres-ensayo');
  if (!v) {
    v = document.createElement('div'); v.id = 'sobres-ensayo'; v.className = 'sobres-ensayo'; v.setAttribute('role', 'dialog'); v.setAttribute('aria-modal', 'true'); v.setAttribute('aria-label', 'Ensayo de los sobres');
    document.body.appendChild(v); document.body.style.overflow = 'hidden';
    v.addEventListener('click', function (e) {
      var b = e.target.closest('[data-se]'), s = +v.dataset.step;
      if (b) {
        var a = b.dataset.se;
        if (a === 'exit') { v.remove(); document.body.style.overflow = ''; toast('Fin del ensayo. Todo sigue como estaba'); return; }
        if (a === 'next') { sobresEnsayo(Math.min(3, s + 1)); return; }
        if (a === 'prev') { sobresEnsayo(Math.max(1, s - 1)); return; }
        if (a === 'go') { sobresEnsayo(+b.dataset.n); return; }
        if (a === 'edit') { v.remove(); document.body.style.overflow = ''; A.sobresEdit(); return; }
      }
      var env = e.target.closest('.sobre');
      if (env) { if (s === 3) { env.classList.add('opening'); setTimeout(function () { env.classList.remove('opening'); sobreStage(+env.dataset.i, true); }, 400); } else sobreNope(env, v.querySelector('.se-say')); }
    });
  }
  v.dataset.step = step;
  var empty = st.items.filter(function (x) { return !x.text; }).length, body = '';
  if (step === 1) body = '<h2>1 · Así los ve la familia hasta que des la señal</h2>' +
    '<p>Dos sobres lacrados en Inicio. Prueba a tocar uno: no se deja, y suelta una frase.</p>' +
    '<div class="sobres">' + st.items.map(function (x, i) { return sobreBtn(x, i, false); }).join('') + '</div>' +
    '<p class="se-say" aria-live="polite">Toca un sobre…</p>';
  else if (step === 2) body = '<h2>2 · Tocas «¡Que se abran!» y a todos les salta esto</h2>' +
    '<p>A la vez, en todos los móviles, con confeti y fanfarria.</p>' +
    '<div class="se-signal">' + sobresSignalHtml(true) + '</div>';
  else body = '<h2>3 · Cada uno toca un sobre y lo abre</h2>' +
    '<p>Toca un sobre: tiembla, se rompe el lacre, se abre la solapa y sale la carta.</p>' +
    '<div class="sobres">' + st.items.map(function (x, i) { return sobreBtn(x, i, true); }).join('') + '</div>' +
    (empty ? '<p class="se-warn">' + (empty === 2 ? 'Los dos sobres están' : 'Un sobre está') + ' sin escribir: saldrá «¡Ya podéis abrir el sobre de verdad!». <button class="link" data-se="edit">Escribirlos ahora</button></p>' : '');
  v.innerHTML = '<div class="se-in">' +
    '<div class="se-top"><span class="ss-sim">Ensayo · solo lo ves tú · no se guarda nada</span><button class="icon-btn se-x" data-se="exit" aria-label="Salir del ensayo">' + icon('x') + '</button></div>' +
    '<ol class="se-steps">' + SE_STEPS.map(function (t, k) { var n = k + 1; return '<li><button data-se="go" data-n="' + n + '" class="' + (n === step ? 'on' : n < step ? 'done' : '') + '"><b>' + n + '</b><span>' + t + '</span></button></li>'; }).join('') + '</ol>' +
    '<div class="se-body">' + body + '</div>' +
    '<div class="se-nav">' + (step > 1 ? '<button class="btn ghost" data-se="prev">‹ Anterior</button>' : '<span></span>') +
    (step < 3 ? '<button class="btn primary" data-se="next">Siguiente: ' + SE_STEPS[step].toLowerCase() + ' ›</button>' : '<button class="btn primary" data-se="exit">Terminar el ensayo</button>') + '</div></div>';
  if (step === 2) try { confetti(2400); fanfare(); } catch (e) {}
}
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  var v = document.getElementById('sobre-stage'); if (v) { v.remove(); if (!document.getElementById('sobres-ensayo')) document.body.style.overflow = ''; return; }
  var en = document.getElementById('sobres-ensayo'); if (en) { en.remove(); document.body.style.overflow = ''; }
});

Object.assign(A, {
  sobreTap: function (el) {
    var st = sobresState(), i = +el.dataset.i;
    if (!st.open) { sobreNope(el); return; }
    el.classList.add('opening');
    setTimeout(function () { el.classList.remove('opening'); sobreStage(i, false); }, 400);
  },
  sobresSimStart: function () { if (sobresAdmin()) sobresEnsayo(1); },
  sobresEdit: function () {
    if (!sobresAdmin()) return;
    var st = sobresState();
    openSheet('<h2>Los dos sobres</h2><p class="small muted">Lo que escribas aquí sale al abrir cada sobre. Si lo dejas vacío, el sobre dirá que toca abrir el de verdad. Después, «Ensayar todo el proceso» para verlo como la familia.</p>' +
      st.items.map(function (x, i) {
        return '<label class="field"><span class="lbl">Sobre ' + (i + 1) + ' · nombre en el sobre</span><input id="sb-t' + i + '" maxlength="40" value="' + esc(x.title || '') + '" placeholder="Sobre ' + (i + 1) + '"></label>' +
          '<label class="field"><span class="lbl">Sobre ' + (i + 1) + ' · lo que hay dentro</span><textarea id="sb-x' + i + '" rows="4" maxlength="800">' + esc(x.text || '') + '</textarea></label>';
      }).join('') +
      '<button class="btn primary block" data-act="sobresSave">' + icon('check') + 'Guardar</button>');
  },
  sobresSave: function () {
    if (!sobresAdmin()) return;
    var st = sobresState();
    var v = { at: st.at, open: st.open, openedAt: st.openedAt, items: [0, 1].map(function (i) {
      return { title: ((document.getElementById('sb-t' + i) || {}).value || '').trim(), text: ((document.getElementById('sb-x' + i) || {}).value || '').trim() };
    }) };
    sobresSave(v).then(function () { closeSheet(); render(true); toast('Sobres guardados. Siguen cerrados'); }, function () { toast('No he podido guardarlos'); });
  },
  sobresOpen: function (el) {
    if (!sobresAdmin()) return;
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Les salta a todos. Toca otra vez'; return; }
    var st = sobresState();
    sobresSave({ at: st.at, open: true, openedAt: new Date().toISOString(), items: st.items }).then(function () { render(true); }, function () { toast('No he podido abrirlos'); });
  },
  sobresClose: function () {
    if (!sobresAdmin()) return;
    var st = sobresState();
    sobresSave({ at: st.at, open: false, openedAt: null, items: st.items }).then(function () { render(true); toast('Sobres cerrados otra vez'); }, function () { toast('No he podido cerrarlos'); });
  }
});
