/* ===================== Los dos sobres del cumple =====================
   Desde las 9:00 del día del cumple todos ven dos sobres lacrados en Inicio. Nadie puede abrirlos
   hasta que el admin da la señal. El contenido lo escribe el admin (si lo deja vacío, el sobre de la app
   dice que toca abrir el sobre de verdad). Se guarda en app_config «sobres» (lo escribe el admin directamente). */

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
  var st = sobresState(), t = new Date(st.at).getTime(), end = new Date(st.at).getTime() + 36 * 3600 * 1000;
  return Date.now() >= t && Date.now() < end;
}
function sobresSave(v) {
  S.sobres = v;
  var p = (typeof PHOTOS !== 'undefined' && PHOTOS.demo === false && window.CLOUD && CLOUD.sb)
    ? CLOUD.sb().from('app_config').upsert({ key: 'sobres', value: v }).then(function (r) { if (r.error) throw r.error; })
    : Promise.resolve();
  return p;
}

function sobresCard() {
  var adm = sobresAdmin(), live = sobresLive();
  if (!live && !adm) return '';
  var st = sobresState(), who = esc(bdayName());
  if (st.open && ui.sobresSeen !== st.openedAt && live) {   /* la señal: todos se enteran a la vez */
    ui.sobresSeen = st.openedAt;
    setTimeout(function () { confetti(2600); message('<div class="code-pop">✉️✉️</div><h2>¡Ya se pueden abrir los sobres!</h2><p>Que alguien avise a ' + who + '. Están en Inicio.</p>', 3200); }, 400);
  }
  var h = '<section class="card sobres-card' + (st.open ? ' is-open' : '') + '" id="sobres">' +
    '<div class="card-head"><span class="eyebrow">Cumple de ' + who + '</span><span class="pill ' + (st.open ? 'ok' : 'olive') + '">' + (st.open ? '¡Abiertos!' : 'Alto secreto') + '</span></div>' +
    '<h3>' + (st.open ? 'Dos sobres. Ya hay permiso.' : 'Dos sobres. Cero pistas.') + '</h3>' +
    '<p class="small muted">' + (st.open ? 'Toca un sobre para abrirlo.' : 'Nadie los abre hasta que el jefe dé la señal. Se aceptan teorías; trampas, no.') + '</p>' +
    '<div class="sobres">' + st.items.map(function (x, i) {
      return '<button class="sobre' + (st.open ? ' ready' : '') + '" data-act="sobreTap" data-i="' + i + '" aria-label="Sobre ' + (i + 1) + (st.open ? ': ábrelo' : ': cerrado') + '">' +
        '<span class="sobre-back"></span><span class="sobre-flap"></span><span class="sobre-seal">' + (S.trip && S.trip.eggs && S.trip.eggs.bdayAge ? esc(String(S.trip.eggs.bdayAge)) : '★') + '</span>' +
        '<span class="sobre-n">' + (x.title ? esc(x.title) : 'Sobre ' + (i + 1)) + '</span></button>';
    }).join('') + '</div>' +
    (st.open ? '' : '<p class="small sobres-lock">🔒 Cerrados hasta nueva orden</p>');
  if (adm) {
    h += '<div class="sobres-adm"><span class="lbl">Solo tú ves esto' + (live ? '' : ' (los demás los verán a las ' + esc(st.at.slice(11, 16)) + ')') + '. Si tocas un sobre cerrado, lo abres en modo revisión: nadie más lo ve.</span><div class="row wrap">' +
      '<button class="btn ghost" data-act="sobresReview">' + icon('eye') + 'Revisar por dentro</button>' +
      '<button class="btn ghost" data-act="sobresEdit">' + icon('edit') + 'Escribir los sobres</button>' +
      (st.open ? '<button class="btn ghost" data-act="sobresClose">' + icon('undo') + 'Volver a cerrarlos</button>'
        : '<button class="btn primary" data-act="sobresOpen">' + icon('gift') + '¡Que se abran!</button>') +
      '</div></div>';
  }
  return h + '</section>';
}

function sobrePreview(i) {
  var st = sobresState(), x = st.items[i] || {};
  var body = x.text ? esc(x.text).replace(/\n/g, '<br>') : '¡Ya podéis abrir el sobre de verdad!';
  openSheet('<p class="small sobre-review">' + icon('eye') + '<span><b>Vista de revisión: solo la ves tú.</b> Para los demás, el sobre sigue cerrado.</span></p>' +
    '<div class="sobre-open"><div class="sobre-letter"><span class="eyebrow">' + (x.title ? esc(x.title) : 'Sobre ' + (i + 1)) + '</span><p>' + body + '</p></div></div>' +
    (x.text ? '' : '<p class="small muted">Este sobre aún no tiene texto: al abrirlo, la familia verá «¡Ya podéis abrir el sobre de verdad!».</p>') +
    '<div class="row wrap">' + (st.items.length > 1 ? '<button class="btn ghost" data-act="sobrePrev" data-i="' + (1 - i) + '">Ver el sobre ' + (2 - i) + '</button>' : '') +
    '<button class="btn primary" data-act="sobresEdit">' + icon('edit') + 'Cambiar los sobres</button></div>');
}
Object.assign(A, {
  sobrePrev: function (el) { if (sobresAdmin()) sobrePreview(+el.dataset.i); },
  sobresReview: function () { if (sobresAdmin()) sobrePreview(0); },
  sobreTap: function (el) {
    var st = sobresState(), i = +el.dataset.i, x = st.items[i] || {};
    /* v0.7.55: el admin puede abrirlos por detrás para revisarlos (solo él lo ve; para los demás siguen cerrados) */
    if (!st.open && sobresAdmin()) { sobrePreview(i); return; }
    if (!st.open) {
      el.classList.remove('nope'); void el.offsetWidth; el.classList.add('nope');
      if (navigator.vibrate) try { navigator.vibrate([20, 40, 20]); } catch (e) {}
      ui.sobreN = ((ui.sobreN || 0) + 1) % SOBRES_NOPE.length;
      toast(SOBRES_NOPE[ui.sobreN]);
      return;
    }
    el.classList.add('opening');
    setTimeout(function () {
      el.classList.remove('opening');
      confetti(1800);
      var body = x.text ? esc(x.text).replace(/\n/g, '<br>') : '¡Ya podéis abrir el sobre de verdad!';
      openSheet('<div class="sobre-open"><div class="sobre-letter"><span class="eyebrow">' + (x.title ? esc(x.title) : 'Sobre ' + (i + 1)) + '</span><p>' + body + '</p></div></div>');
    }, 650);
  },
  sobresEdit: function () {
    if (!sobresAdmin()) return;
    var st = sobresState();
    openSheet('<h2>Los dos sobres</h2><p class="small muted">Lo que escribas aquí sale al abrir cada sobre. Si lo dejas vacío, el sobre dirá que toca abrir el de verdad.</p>' +
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
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Toca otra vez'; return; }
    var st = sobresState();
    var v = { at: st.at, open: true, openedAt: new Date().toISOString(), items: st.items };
    sobresSave(v).then(function () { render(true); }, function () { toast('No he podido abrirlos'); });
  },
  sobresClose: function () {
    if (!sobresAdmin()) return;
    var st = sobresState();
    sobresSave({ at: st.at, open: false, openedAt: null, items: st.items }).then(function () { render(true); toast('Sobres cerrados otra vez'); }, function () { toast('No he podido cerrarlos'); });
  }
});
