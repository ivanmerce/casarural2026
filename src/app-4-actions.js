/* ===================== Hojas de edición, acciones, easter eggs y arranque ===================== */
var draft = null;

function segHtml(name, opts, cur, dis) {
  return '<div class="seg" role="group">' + opts.map(function (o) {
    return '<button type="button" data-act="dseg" data-k="' + name + '" data-v="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '"' + (dis ? ' disabled' : '') + '>' + o[1] + '</button>';
  }).join('') + '</div>';
}
function roNote() { return can('edit') ? '' : '<p class="small pill pend" style="white-space:normal">Modo lector: puedes verlo pero no cambiarlo</p>'; }
function famOptions(cur, allowNone) {
  return (allowNone ? '<option value="">Sin asignar</option>' : '') + S.families.map(function (f) { return '<option value="' + f.id + '"' + (cur === f.id ? ' selected' : '') + '>' + esc(f.name) + '</option>'; }).join('');
}

/* ---------- Ingrediente ---------- */
function itemSheet(id) {
  var i = id ? S.ingredients.find(function (x) { return x.id === id; }) : { id: null, name: '', cat: 'fresco', qty: 1, unit: 'u', meals: ui.mealFilter ? [ui.mealFilter] : [], family: ui.fam && ui.fam !== 'all' ? ui.fam : me().family, status: 'pendiente', cost: null, split: 'comun', note: '' };
  draft = { id: i.id, status: i.status, split: i.split || 'comun', meals: i.meals.slice() };
  var dis = can('edit') ? '' : ' disabled';
  openSheet(
    '<h2>' + (id ? 'Ingrediente' : 'Nuevo ingrediente') + '</h2>' + roNote() +
    '<div class="field"><label for="f-name">Nombre</label><input id="f-name" value="' + esc(i.name) + '"' + dis + ' placeholder="Ej.: Butifarras"></div>' +
    '<div class="grid2"><div class="field"><label for="f-qty">Cantidad</label><input id="f-qty" inputmode="decimal" value="' + L.n(i.qty) + '"' + dis + '></div><div class="field"><label for="f-unit">Unidad</label><input id="f-unit" value="' + esc(i.unit) + '"' + dis + '></div></div>' +
    '<div class="grid2"><div class="field"><label for="f-cat">Categoría</label><select id="f-cat"' + dis + '>' + Object.keys(CATS).map(function (c) { return '<option value="' + c + '"' + (i.cat === c ? ' selected' : '') + '>' + CATS[c] + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="f-fam">Lo compra</label><select id="f-fam"' + dis + '>' + famOptions(i.family, true) + '</select></div></div>' +
    '<div class="field"><span class="lbl">¿Lo traéis de casa?</span>' + segHtml('status', [['pendiente', 'No, se compra'], ['casa', 'Sí, de casa (0 €)']], draft.status === 'casa' ? 'casa' : 'pendiente', !can('edit')) + '</div>' +
    '<div class="grid2"><div class="field"><label for="f-cost">Precio real (opcional)</label><input id="f-cost" inputmode="decimal" placeholder="' + (i.est != null ? '≈ ' + L.n(i.est) + ' estimado' : '0,00') + '" value="' + (i.cost != null ? L.n(i.cost) : '') + '"' + dis + '></div>' +
    '<div class="field"><span class="lbl">Reparto</span>' + segHtml('split', [['comun', 'Común'], ['propio', 'Propio']], draft.split, !can('edit')) + '</div></div>' +
    '<div class="field"><span class="lbl">Para qué comidas</span><div class="att-fam">' + S.meals.map(function (m) {
      return '<button type="button" class="chip" data-act="dmeal" data-id="' + m.id + '" aria-pressed="' + (draft.meals.indexOf(m.id) >= 0) + '"' + dis + '>' + esc(dayOf(m.day).short) + ' · ' + slotName(m.slot) + '</button>';
    }).join('') + '</div></div>' +
    '<div class="field"><label for="f-note">Nota</label><input id="f-note" value="' + esc(i.note || '') + '"' + dis + '></div>' +
    (function () { var sg = id && L.suggestQty(S, i); return sg ? '<div class="card alert" style="padding:12px;gap:8px"><p class="small">La cantidad está pensada para <b>' + i.per + '</b> comensales y ahora sois <b>' + sg.n + '</b>. Sugerido: <b>' + L.n(sg.qty) + ' ' + esc(i.unit) + '</b>.</p>' + (can('edit') ? '<button class="btn" data-act="applyQty" data-id="' + i.id + '">Ajustar a ' + L.n(sg.qty) + ' ' + esc(i.unit) + '</button>' : '') + '</div>' : ''; })() +
    (i.sug ? '<p class="small"><span class="pill">sugerido</span> No estaba en la planificación original: es una sugerencia.</p>' : '') +
    (i.est != null ? '<p class="small muted">Precio orientativo: ' + L.money(i.est) + ' <span class="pill est">ESTIMADO</span></p>' : '') +
    (can('edit') ? '<div class="sheet-actions"><button class="btn primary" data-act="saveItem">Guardar</button>' + (id ? '<button class="btn" data-act="dupItem" data-id="' + id + '">' + icon('copy') + 'Duplicar</button><button class="btn danger" data-act="delItem" data-id="' + id + '">' + icon('trash') + 'Borrar</button>' : '') + '</div>' : '<button class="btn block" data-act="close">Cerrar</button>')
  );
}
function saveItem() {
  var name = val('f-name').trim(); if (!name) { toast('Ponle nombre al ingrediente'); return; }
  var o = draft.id ? S.ingredients.find(function (x) { return x.id === draft.id; }) : { id: uid('i'), est: null };
  o.name = name; o.qty = numVal('f-qty') || 1; o.unit = val('f-unit').trim() || 'u'; o.cat = val('f-cat'); o.family = val('f-fam') || null;
  o.status = draft.status; o.split = draft.split; o.meals = draft.meals; o.note = val('f-note').trim();
  o.cost = o.status === 'casa' ? 0 : numVal('f-cost');
  if (!draft.id) S.ingredients.push(o);
  save(); closeSheet(); render(true); toast(draft.id ? 'Guardado' : 'Añadido a la lista'); checkFumata();
}

/* ---------- Comida ---------- */
function mealSheet(id) {
  var m = meal(id);
  draft = { id: id, mode: m.mode };
  openSheet('<h2>' + esc(dayOf(m.day).long) + ' · ' + slotName(m.slot) + '</h2>' +
    '<div class="field"><label for="m-title">Título</label><input id="m-title" value="' + esc(m.title) + '"></div>' +
    '<div class="field"><span class="lbl">Tipo</span>' + segHtml('mode', [['comun', 'Comida común'], ['cada', 'Cada familia lo suyo']], m.mode) + '</div>' +
    '<div class="field"><label for="m-dishes">Platos (uno por línea)</label><textarea id="m-dishes">' + esc(m.dishes.join('\n')) + '</textarea></div>' +
    '<div class="field"><label for="m-time">Hora</label><input id="m-time" type="time" value="' + mealTime(m) + '"></div>' +
    '<div class="field"><label for="m-cook">Quién cocina (opcional, se decide sobre la marcha)</label><select id="m-cook">' + famOptions(m.cook, true) + '</select></div>' +
    '<div class="field"><label for="m-marc">Menú ' + esc(babyName()) + '</label><input id="m-marc" value="' + esc(m.marc || '') + '"></div>' +
    '<div class="field"><label for="m-notes">Notas</label><textarea id="m-notes">' + esc(m.notes || '') + '</textarea></div>' +
    '<div class="sheet-actions"><button class="btn primary" data-act="saveMeal">Guardar</button><button class="btn" data-act="close">Cancelar</button></div>');
}
function saveMeal() {
  var m = meal(draft.id);
  m.title = val('m-title').trim() || m.title; m.mode = draft.mode; m.dishes = val('m-dishes').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  m.cook = val('m-cook') || null; var tm = val('m-time'); m.time = tm && tm !== SLOT_T[m.slot] ? tm : null; m.marc = val('m-marc').trim(); m.notes = val('m-notes').trim();
  save(); closeSheet(); render(true); toast('Comida actualizada');
}

/* ---------- Asistencia ---------- */
function attendanceSheet(mealId, famId) {
  var m = mealId ? meal(mealId) : null;
  var title = m ? esc(dayOf(m.day).short) + ' · ' + slotName(m.slot) : 'Asistencia de ' + esc(fam(famId).name);
  var body = '';
  if (m) {
    body = S.families.map(function (f) {
      return '<div class="field"><span class="lbl row" style="gap:6px"><i class="fam-dot ' + f.color + '"></i>' + esc(f.name) + '</span><div class="att-fam">' +
        S.people.filter(function (p) { return p.family === f.id; }).map(function (p) {
          return '<button type="button" class="toggle-p" data-act="togAtt" data-m="' + m.id + '" data-p="' + p.id + '" aria-pressed="' + L.attends(S, p.id, m.id) + '">' + av(p.id, 'sm') + esc(p.name) + '</button>';
        }).join('') + '</div></div>';
    }).join('');
  } else {
    var ps = S.people.filter(function (p) { return p.family === famId; });
    body = S.days.map(function (d) {
      var ms = S.meals.filter(function (x) { return x.day === d.k; });
      return '<div class="field"><span class="lbl">' + esc(d.long) + '</span>' + ms.map(function (x) {
        return '<div class="att-fam" style="align-items:center"><span class="small muted" style="width:76px">' + slotName(x.slot) + '</span>' + ps.map(function (p) {
          return '<button type="button" class="toggle-p" data-act="togAtt" data-m="' + x.id + '" data-p="' + p.id + '" aria-pressed="' + L.attends(S, p.id, x.id) + '">' + av(p.id, 'sm') + esc(p.name) + '</button>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }).join('');
  }
  openSheet('<h2>' + title + '</h2><p class="small muted">Toca a cada persona para marcar si come. Los comensales y el reparto se recalculan solos.' + (can('edit') ? '' : ' Como lector solo puedes cambiar tu propia asistencia.') + '</p><div class="stack" id="attBody">' + body + '</div>' +
    '<button class="btn primary block" data-act="close">Listo</button>');
}
function togAtt(mId, pId, el) {
  if (!guard('attend', pId)) return;
  S.attendance[mId] = S.attendance[mId] || {};
  var now = !L.attends(S, pId, mId);
  S.attendance[mId][pId] = now;
  if (el) el.setAttribute('aria-pressed', now);
  save(); render(true);
}

/* ---------- Actividad ---------- */
function actSheet(id) {
  var a = id ? S.activities.find(function (x) { return x.id === id; }) : { day: ui.day || S.days[0].k, start: '17:00', dur: 60, title: '', place: 'finca', where: '', travel: '', age: 'Todos', marc: 'si', owner: null, planB: '', desc: '' };
  draft = { id: id || null, marc: a.marc };
  openSheet('<h2>' + (id ? 'Actividad' : 'Nueva actividad') + '</h2>' +
    '<div class="field"><label for="a-title">Título</label><input id="a-title" value="' + esc(a.title) + '" placeholder="Ej.: Torneo de futbolín"></div>' +
    '<div class="grid2"><div class="field"><label for="a-day">Día</label><select id="a-day">' + S.days.map(function (d) { return '<option value="' + d.k + '"' + (a.day === d.k ? ' selected' : '') + '>' + esc(d.long) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="a-start">Hora</label><input id="a-start" type="time" value="' + a.start + '"></div></div>' +
    '<div class="grid2"><div class="field"><label for="a-dur">Duración (min)</label><input id="a-dur" inputmode="numeric" value="' + a.dur + '"></div><div class="field"><label for="a-age">Edad</label><input id="a-age" value="' + esc(a.age) + '"></div></div>' +
    '<div class="field"><label for="a-where">Dónde</label><input id="a-where" value="' + esc(a.where) + '"></div>' +
    '<div class="field"><label for="a-travel">Desplazamiento</label><input id="a-travel" value="' + esc(a.travel) + '" placeholder="En la finca"></div>' +
    '<div class="field"><span class="lbl">¿Apta para ' + esc(babyName()) + '?</span>' + segHtml('marc', [['si', 'Sí'], ['adulto', 'Con adulto'], ['no', 'No']], a.marc) + '</div>' +
    '<div class="field"><label for="a-owner">Responsable</label><select id="a-owner"><option value="">Libre</option>' + S.people.map(function (p) { return '<option value="' + p.id + '"' + (a.owner === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="a-planb">Plan B si llueve</label><input id="a-planb" value="' + esc(a.planB) + '"></div>' +
    '<div class="field"><label for="a-desc">Descripción</label><textarea id="a-desc">' + esc(a.desc) + '</textarea></div>' +
    '<div class="sheet-actions"><button class="btn primary" data-act="saveAct">Guardar</button>' + (id ? '<button class="btn danger" data-act="delAct" data-id="' + id + '">' + icon('trash') + 'Borrar</button>' : '<button class="btn" data-act="close">Cancelar</button>') + '</div>');
}
function saveAct() {
  var t = val('a-title').trim(); if (!t) { toast('Ponle un título'); return; }
  var a = draft.id ? S.activities.find(function (x) { return x.id === draft.id; }) : { id: uid('a'), place: 'finca' };
  a.title = t; a.day = val('a-day'); a.start = val('a-start') || '12:00'; a.dur = parseInt(val('a-dur'), 10) || 60; a.age = val('a-age').trim() || 'Todos';
  a.where = val('a-where').trim(); a.travel = val('a-travel').trim(); a.marc = draft.marc; a.owner = val('a-owner') || null; a.planB = val('a-planb').trim(); a.desc = val('a-desc').trim();
  if (!draft.id) S.activities.push(a);
  ui.day = a.day; save(); closeSheet(); render(true); toast('Plan guardado');
}

/* ---------- Gasto ---------- */
function expSheet(id) {
  var e = id ? S.expenses.find(function (x) { return x.id === id; }) : { concept: '', amount: null, payer: me().family, split: 'comun', kind: 'gasto' };
  draft = { id: id || null, split: e.split, kind: e.kind || 'gasto' };
  openSheet('<h2>' + (id ? 'Gasto' : 'Nuevo gasto') + '</h2>' +
    '<div class="field"><span class="lbl">Tipo</span>' + segHtml('kind', [['gasto', 'Gasto'], ['aportacion', 'Aportación de regalo']], draft.kind) + '<span class="small muted">Aportación: dinero extra que alguien pone para el bote sin esperar que se lo devuelvan.</span></div>' +
    '<div class="field"><label for="e-concept">Concepto</label><input id="e-concept" value="' + esc(e.concept) + '" placeholder="Carbón, gasolina, decoración…"></div>' +
    '<div class="grid2"><div class="field"><label for="e-amount">Importe (€)</label><input id="e-amount" inputmode="decimal" value="' + (e.amount != null ? L.n(e.amount) : '') + '"></div>' +
    '<div class="field"><label for="e-payer">Lo pagó / lo pone</label><select id="e-payer">' + famOptions(e.payer) + '</select></div></div>' +
    '<div class="field"><span class="lbl">Reparto</span>' + segHtml('split', [['comun', 'Entre todos'], ['propio', 'Solo esa familia']], e.split) + '</div>' +
    '<div class="sheet-actions"><button class="btn primary" data-act="saveExp">Guardar</button>' + (id ? '<button class="btn danger" data-act="delExp" data-id="' + id + '">' + icon('trash') + 'Borrar</button>' : '<button class="btn" data-act="close">Cancelar</button>') + '</div>');
}
function saveExp() {
  var c = val('e-concept').trim(), a = numVal('e-amount');
  if (!c || a == null) { toast('Falta el concepto o el importe'); return; }
  var e = draft.id ? S.expenses.find(function (x) { return x.id === draft.id; }) : { id: uid('e') };
  e.concept = c; e.amount = a; e.payer = val('e-payer'); e.split = draft.kind === 'aportacion' ? 'comun' : draft.split; e.kind = draft.kind; e.date = new Date().toISOString().slice(0, 10);
  if (!draft.id) S.expenses.push(e);
  save(); closeSheet(); render(true); toast(e.kind === 'aportacion' ? '¡Gracias! Aportación apuntada' : 'Gasto apuntado'); checkClaras();
}

/* ---------- Menú: quién soy + personalizar ---------- */
var ACCENTS = [['#C4112F', 'Carmesí'], ['#55663F', 'Verde finca'], ['#94643F', 'Madera'], ['#3F5A7A', 'Pizarra'], ['#7B2D5B', 'Ciruela'], ['#CF5B24', 'Atardecer']];
function menuSheet() {
  var P = ui.prefs;
  openSheet((window.CLOUD ? '<h2>' + esc(me().name) + '</h2><p class="small muted">Has entrado como <b>' + esc(me().name) + '</b> · ' + ROLE[me().role] + '</p><div class="stack"><button class="btn block" data-act="myCode">' + icon('edit') + 'Cambiar mi código</button><button class="btn block ghost" data-act="logout">Salir de esta cuenta</button></div>' : '<h2>¿Quién eres?</h2><p class="small muted">Solo en la demo: sirve para probar los permisos de cada rol.</p>' +
    S.families.map(function (f) {
      return '<div class="att-fam">' + S.people.filter(function (p) { return p.family === f.id; }).map(function (p) {
        return '<button class="toggle-p" data-act="setMe" data-id="' + p.id + '" aria-pressed="true" style="' + (ui.me === p.id ? 'border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)' : '') + '">' + av(p.id, 'sm') + esc(p.name) + '<span class="small muted">' + ROLE[p.role] + '</span></button>';
      }).join('') + '</div>';
    }).join('')) +
    '<div class="divider"></div><h2>Personaliza tu app</h2><p class="small muted">Se guarda en este dispositivo. Cada uno lo pone a su gusto.</p>' +
    '<div class="field"><span class="lbl">Tema</span><div class="seg" role="group"><button data-act="pref" data-k="theme" data-v="light" aria-pressed="' + (P.theme === 'light') + '">Claro</button><button data-act="pref" data-k="theme" data-v="auto" aria-pressed="' + (P.theme === 'auto') + '">Automático</button><button data-act="pref" data-k="theme" data-v="dark" aria-pressed="' + (P.theme === 'dark') + '">Oscuro</button></div></div>' +
    '<div class="field"><span class="lbl">Color</span><div class="swatches">' + ACCENTS.map(function (a) { return '<button class="swatch" style="background:' + a[0] + '" data-act="pref" data-k="accent" data-v="' + a[0] + '" aria-pressed="' + (P.accent === a[0]) + '" aria-label="' + a[1] + '" title="' + a[1] + '"></button>'; }).join('') + '</div></div>' +
    '<div class="field"><span class="lbl">Fondo</span><div class="seg" role="group"><button data-act="pref" data-k="bg" data-v="net" aria-pressed="' + (P.bg === 'net') + '">Cristal + red</button><button data-act="pref" data-k="bg" data-v="glass" aria-pressed="' + (P.bg === 'glass') + '">Cristal</button><button data-act="pref" data-k="bg" data-v="plain" aria-pressed="' + (P.bg === 'plain') + '">Liso</button></div></div>' +
    '<div class="field"><label for="p-glass">Transparencia del cristal</label><input class="range" id="p-glass" type="range" min="35" max="92" value="' + Math.round(P.glass * 100) + '" data-input="glass"></div>' +
    '<div class="field"><span class="lbl">Tamaño de letra</span><div class="seg" role="group"><button data-act="pref" data-k="size" data-v="m" aria-pressed="' + (P.size === 'm') + '">Normal</button><button data-act="pref" data-k="size" data-v="l" aria-pressed="' + (P.size === 'l') + '">Grande</button><button data-act="pref" data-k="size" data-v="xl" aria-pressed="' + (P.size === 'xl') + '">Muy grande</button></div></div>' +
    '<div class="divider"></div>' +
    '<div class="stack"><button class="btn block" data-act="goSheet" data-tab="manual">' + icon('bulb') + 'Manual de uso</button><button class="btn block" data-act="goSheet" data-tab="casas">' + icon('bed') + '¿Dónde dormimos?</button><button class="btn block" data-act="goSheet" data-tab="finca">' + icon('house') + 'La finca: Wi-Fi, normas y compras</button><button class="btn block" data-act="goSheet" data-tab="asistencia">' + icon('plans') + 'Asistencia por día</button><button class="btn block" data-act="goSheet" data-tab="personas">' + icon('users') + 'Personas y accesos</button><button class="btn block" data-act="goSheet" data-tab="tiempo">' + icon('partly') + 'El tiempo</button><button class="btn block" data-act="secrets">' + icon('trophy') + 'Secretos de la casa · ' + foundCount() + '/' + EGGS.length + '</button>' +
    (can('access') ? '<button class="btn danger block" data-act="resetData">' + icon('refresh') + 'Restablecer datos de la demo</button>' : '') + '</div>');
}
function defaultPrefs() { return { theme: 'light', accent: '#C4112F', bg: 'net', glass: 0.62, size: 'm' }; }
function applyPrefs() {
  var P = ui.prefs, r = document.documentElement;
  if (P.theme === 'light' || P.theme === 'dark') r.setAttribute('data-theme', P.theme); else r.removeAttribute('data-theme');
  r.style.setProperty('--accent-base', P.accent);
  r.style.setProperty('--glass-a', P.glass);
  r.style.setProperty('--blur', Math.round(8 + (1 - P.glass) * 34) + 'px');
  r.setAttribute('data-bg', P.bg);
  if (P.size === 'm') r.removeAttribute('data-size'); else r.setAttribute('data-size', P.size);
  var mt = document.querySelector('meta[name="theme-color"]'); if (mt) mt.setAttribute('content', P.accent);
  startAmbient();
}
function savePrefs() { try { localStorage.setItem(KEY + '-prefs', JSON.stringify(ui.prefs)); } catch (e) {} }
function loadPrefs() { try { return Object.assign(defaultPrefs(), JSON.parse(localStorage.getItem(KEY + '-prefs')) || {}); } catch (e) { return defaultPrefs(); } }

/* Fondo ambiental: red de nodos muy suave */
var ambRAF = null, ambLast = 0;
function startAmbient() {
  if (ambRAF) cancelAnimationFrame(ambRAF); ambRAF = null;
  var cv = document.getElementById('ambNet'); if (!cv || ui.prefs.bg !== 'net') return;
  var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W, H;
  function size() { W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); window.onresize = size;
  var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C4112F';
  var N = Math.round(Math.min(34, W * H / 26000));
  var nodes = Array.from({ length: N }, function () { return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .18, vy: (Math.random() - .5) * .18 }; });
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(t) {
    if (t - ambLast > 40 || still) {
      ambLast = t; ctx.clearRect(0, 0, W, H); ctx.strokeStyle = accent; ctx.fillStyle = accent;
      for (var i = 0; i < N; i++) {
        var a = nodes[i]; if (!still) { a.x += a.vx; a.y += a.vy; if (a.x < 0 || a.x > W) a.vx *= -1; if (a.y < 0 || a.y > H) a.vy *= -1; }
        for (var j = i + 1; j < N; j++) { var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 170) { ctx.globalAlpha = (1 - d / 170) * .16; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); } }
        ctx.globalAlpha = .28; ctx.beginPath(); ctx.arc(a.x, a.y, 2.4, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (!still) ambRAF = requestAnimationFrame(frame);
  }
  ambRAF = requestAnimationFrame(frame);
}

/* ---------- Easter eggs: la lista, el marcador y el ranking viven en app-9-secretos.js ---------- */
var fxBusy = false;
function fxLayer(veil) {
  var l = document.createElement('div'); l.className = 'fx'; l.innerHTML = '<canvas></canvas>';
  if (veil) { var v = document.createElement('div'); v.className = 'egg-veil'; document.body.appendChild(v); l._veil = v; }
  document.body.appendChild(l);
  var cv = l.querySelector('canvas'), dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
  var ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { el: l, ctx: ctx, W: window.innerWidth, H: window.innerHeight, done: function () { l.remove(); if (l._veil) l._veil.remove(); } };
}
function message(html, ms) {
  document.querySelectorAll('.egg-msg').forEach(function (x) { x.remove(); });
  var m = document.createElement('div'); m.className = 'egg-msg'; m.setAttribute('role', 'status');
  m.innerHTML = '<div class="inner">' + html + '<span class="egg-tap">Toca para cerrar</span></div>';
  var gone = false, close = function () { if (gone) return; gone = true; m.style.transition = 'opacity .35s'; m.style.opacity = 0; setTimeout(function () { m.remove(); }, 350); };
  m.addEventListener('click', function (e) { e.stopPropagation(); close(); });
  document.body.appendChild(m); setTimeout(close, ms || 4200);
}
function confetti(ms) {
  var fx = fxLayer(false), cols = ['#C4112F', '#1C1614', '#FFFFFF', '#E8B64A', getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()];
  var P = Array.from({ length: 180 }, function () { return { x: fx.W / 2 + (Math.random() - .5) * 80, y: fx.H * .55, vx: (Math.random() - .5) * 16, vy: -Math.random() * 18 - 6, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - .5) * .4, c: cols[Math.floor(Math.random() * cols.length)] }; });
  var t0 = performance.now(), D = ms || 3800;
  (function f(t) {
    fx.ctx.clearRect(0, 0, fx.W, fx.H);
    P.forEach(function (p) { p.vy += .42; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va; fx.ctx.save(); fx.ctx.translate(p.x, p.y); fx.ctx.rotate(p.a); fx.ctx.fillStyle = p.c; fx.ctx.globalAlpha = Math.max(0, 1 - (t - t0) / D); fx.ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); fx.ctx.restore(); });
    if (t - t0 < D) requestAnimationFrame(f); else fx.done();
  })(t0);
}
/* Fuegos artificiales: cohetes que suben con estela y estallan en palmeras de colores */
function fireworks(ms, rockets) {
  var fx = fxLayer(false), W = fx.W, H = fx.H, ctx = fx.ctx, D = ms || 4200, t0 = performance.now();
  var cols = ['#FF3B5C', '#FFD166', '#06D6A0', '#4CC9F0', '#F72585', '#7B2FF7', '#FF9F1C', getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C4112F'];
  var R = [], P = [], n = rockets || 6;
  for (var i = 0; i < n; i++) R.push({ at: t0 + i * (D * .55 / n) + Math.random() * 120, x: W * (.15 + Math.random() * .7), y: H + 10, tx: W * (.12 + Math.random() * .76), ty: H * (.12 + Math.random() * .32), c: cols[i % cols.length], launched: false, done: false, trail: [] });
  function boom(r) {
    var k = 70 + Math.floor(Math.random() * 40), c2 = cols[Math.floor(Math.random() * cols.length)];
    for (var j = 0; j < k; j++) { var a = Math.PI * 2 * j / k, sp = 2.6 + Math.random() * 4.4; P.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: j % 3 ? r.c : c2, s: 2.4 + Math.random() * 2.4 }); }
    pop();
  }
  function pop() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var len = actx.sampleRate * .35, b = actx.createBuffer(1, len, actx.sampleRate), d = b.getChannelData(0); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); var src = actx.createBufferSource(), g = actx.createGain(); src.buffer = b; g.gain.value = .12; src.connect(g); g.connect(actx.destination); src.start(); } catch (e) {} }
  (function f(t) {
    ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, W, H);
    R.forEach(function (r) {
      if (r.done || t < r.at) return;
      var k = Math.min(1, (t - r.at) / 650), e = 1 - Math.pow(1 - k, 3);
      var x = r.x + (r.tx - r.x) * e, y = H + 10 + (r.ty - H - 10) * e;
      r.trail.push([x, y]); if (r.trail.length > 12) r.trail.shift();
      r.trail.forEach(function (p, i) { ctx.globalAlpha = i / r.trail.length; ctx.fillStyle = '#FF9F1C'; ctx.beginPath(); ctx.arc(p[0] + (Math.random() - .5) * 1.5, p[1], 1.6 + i / 6, 0, Math.PI * 2); ctx.fill(); });
      if (k >= 1) { r.done = true; r.x = x; r.y = y; boom(r); }
    });
    P.forEach(function (p) { p.vx *= .985; p.vy = p.vy * .985 + .045; p.x += p.vx; p.y += p.vy; p.life -= .012; if (p.life <= 0) return; ctx.globalAlpha = Math.max(0, p.life) * (Math.random() < .12 ? .4 : 1); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); });
    P = P.filter(function (p) { return p.life > 0; });
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (t - t0 < D || P.length) requestAnimationFrame(f); else fx.done();
  })(t0);
}
function bdayParty() {
  if (fxBusy) return; fxBusy = true; setTimeout(function () { fxBusy = false; }, 4200);
  confetti(4200);
  var e = S.trip.eggs || {};
  eggCard('bday', '¡Felicidades, ' + esc(bdayName()) + '!', (e.bdayAge ? e.bdayAge + ' años' : 'Un año más') + ' y un finde entero para celebrarlo. Por cierto: tanto toque ya cuenta como abrazo.', '<div class="eleven">' + (e.bdayAge || '') + '</div>', 4200);
}
function fumata() {
  var fx = fxLayer(true);
  var puffs = []; var t0 = performance.now(), D = 5200;
  (function f(t) {
    if (t - t0 < D - 1200) for (var k = 0; k < 3; k++) puffs.push({ x: fx.W / 2 + (Math.random() - .5) * 40, y: fx.H + 20, r: 18 + Math.random() * 16, vx: (Math.random() - .5) * 1.4, vy: -2.2 - Math.random() * 1.8, a: .6 });
    fx.ctx.clearRect(0, 0, fx.W, fx.H);
    puffs.forEach(function (p) { p.x += p.vx + Math.sin((t + p.y) / 400) * .5; p.y += p.vy; p.r += .55; p.a *= .993; var g = fx.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(255,255,255,' + p.a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); fx.ctx.fillStyle = g; fx.ctx.beginPath(); fx.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fx.ctx.fill(); });
    puffs = puffs.filter(function (p) { return p.y + p.r > -40 && p.a > .02; });
    if (t - t0 < D) requestAnimationFrame(f); else fx.done();
  })(t0);
  setTimeout(function () { eggCard('fumata', '¡Lista completa!', 'Todos los productos de la compra tienen dueño. Fumata blanca: esta familia no pasará hambre.'); }, 700);
}
function checkFumata() {
  var c = L.coverage(S.ingredients);
  if (c.tot && c.done === c.tot && !S.fumataShown) { S.fumataShown = true; save(); setTimeout(fumata, 450); }
  if (c.done < c.tot && S.fumataShown) { S.fumataShown = false; save(); }
}
function checkClaras() {
  var lg = L.ledger(S, false);
  if (lg.total > 0 && !lg.tx.length) { if (!hasEgg('claras')) setTimeout(function () { eggCard('claras', 'Cuentas claras', 'Nadie le debe nada a nadie. Haz captura, que esto no vuelve a pasar.'); }, 300); }
}
var marcOn = false, popped = 0;
function marcMode() {
  if (marcOn) return; marcOn = true; popped = 0;
  eggToast('baby', 'Modo ' + esc(babyName()) + ': ¡explota las burbujas antes de que se escapen! (Hay premio si llegas a 15)');
  var end = Date.now() + 14000;
  var iv = setInterval(function () {
    if (Date.now() > end) { clearInterval(iv); marcOn = false; return; }
    var b = document.createElement('button'); b.className = 'bubble'; b.setAttribute('aria-label', 'Burbuja');
    var s = 34 + Math.random() * 60; b.style.width = b.style.height = s + 'px';
    b.style.left = Math.random() * (window.innerWidth - s) + 'px'; b.style.top = window.innerHeight + 'px';
    b.style.setProperty('--dx', (Math.random() - .5) * 120 + 'px'); b.style.animationDuration = (6 + Math.random() * 5) + 's';
    b.onclick = function (e) { e.stopPropagation(); b.classList.add('popped'); plop(); popped++; if (popped === 15) { eggToast('pop', '¡15 burbujas! ' + esc(babyName()) + ' te ficha como canguro oficial'); } setTimeout(function () { b.remove(); }, 260); };
    b.addEventListener('animationend', function (ev) { if (ev.animationName === 'rise') b.remove(); });
    document.body.appendChild(b);
  }, 420);
}
var actx = null;
function plop() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    var o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(700 + Math.random() * 300, actx.currentTime); o.frequency.exponentialRampToValueAtTime(180, actx.currentTime + .12);
    g.gain.setValueAtTime(.18, actx.currentTime); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + .14);
    o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + .15);
  } catch (e) {}
}
function trophy(pid) {
  var v = document.createElement('div'); v.className = 'egg-veil'; document.body.appendChild(v);
  confetti(3600);
  eggCard('trophy', esc(person(pid).name), 'Campeón de la ' + esc(S.tournament.name) + '. Ya puede presumir hasta el año que viene.', '<div class="trophy">' + icon('trophy') + '</div>');
  setTimeout(function () { v.remove(); }, 4400);
}
function cheers(name, viaSearch) {
  var fx = fxLayer(false), P = [], t0 = performance.now(), D = 3200;
  for (var i = 0; i < 90; i++) P.push({ x: Math.random() * fx.W, y: fx.H + Math.random() * 200, r: 3 + Math.random() * 9, v: 2 + Math.random() * 4, w: Math.random() * 6 });
  (function f(t) {
    fx.ctx.clearRect(0, 0, fx.W, fx.H);
    P.forEach(function (p) { p.y -= p.v; p.x += Math.sin((t / 300) + p.w) * .8; fx.ctx.globalAlpha = Math.max(0, 1 - (t - t0) / D); fx.ctx.fillStyle = 'rgba(232,182,74,.75)'; fx.ctx.strokeStyle = 'rgba(255,255,255,.8)'; fx.ctx.beginPath(); fx.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fx.ctx.fill(); fx.ctx.stroke(); });
    if (t - t0 < D) requestAnimationFrame(f); else fx.done();
  })(t0);
  eggCard('salud', '¡Salud!', viaSearch ? 'Has dicho la palabra mágica. Chin chin por ' + esc(bdayName()) + ' y por quien friegue los vasos.' : esc(name) + ' ya tiene dueño. Que no falte para brindar por ' + esc(bdayName()) + '.');
}
function sunDance() {
  var v = document.createElement('div'); v.className = 'sun-overlay'; v.innerHTML = '<div class="sun-core">' + icon('sun') + '</div>'; document.body.appendChild(v);
  eggCard('sol', 'Invocando al sol…', 'Petición enviada al cielo. Si aun así llueve, la culpa es del hombre del tiempo, no nuestra.');
  setTimeout(function () { v.remove(); }, 3200);
}
function wish1111() {
  confetti(3000);
  eggCard('deseo', '¡Pide un deseo!', 'Son las 11:11, la hora de ' + esc(bdayName()) + ' (cumple 11). Que no sea «que no llueva», que ya lo ha pedido todo el mundo.', '<div class="eleven" style="font-size:min(34vw,180px)">11:11</div>');
}
function habemusQuorum(n) {
  if (hasEgg('quorum')) { toast(n + ' personas conectadas a la vez. ¡Reunión familiar!'); return; }
  fumataRaw('¡Reunión familiar!', n + ' personas de la familia con la app abierta a la vez. Ya se puede votar hasta el color de las servilletas.', 'quorum');
}
function habemusPapam() {
  if (hasEgg('papa')) return;
  fumataRaw('¡Fumata blanca!', '«Habemus papam» es lo que se dice cuando hay Papa nuevo. Aquí no hay Papa, pero hay lista de la compra. Casi lo mismo.', 'papa');
}
function himno() {
  fanfare(); confetti(2600);
  var top = G.ranking(S).filter(function (r) { return r.pos === 1 && r.pts > 0; });
  eggCard('himno', top.length ? top.map(function (r) { return esc(eText(r.id)); }).join(' y ') : 'Trono vacante', top.length ? 'Va primero en el ranking y le has puesto el himno. Todos en pie… o por lo menos dejad el móvil.' : 'Aún no manda nadie en el ranking. Plaza libre para quien la quiera.', '<div class="trophy">' + icon('trophy') + '</div>');
}
var discoOn = false;
function discoMode() {
  if (discoOn) return; discoOn = true;
  document.documentElement.classList.add('disco');
  var fx = document.createElement('div'); fx.className = 'disco-fx'; fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = '<div class="beams"></div><div class="beams b2"></div><div class="ball"></div>';
  document.body.appendChild(fx);
  if (navigator.vibrate) try { navigator.vibrate([60, 60, 60, 60, 120]); } catch (e) {}
  eggToast('disco', '¡Modo discoteca! 9 segundos de fiesta. Si alguien te mira raro, di que es la app.');
  setTimeout(function () { document.documentElement.classList.remove('disco'); fx.classList.add('out'); setTimeout(function () { fx.remove(); }, 500); discoOn = false; }, 9000);
}
function fumataRaw(title, text, k) {
  var fx = fxLayer(true), puffs = [], t0 = performance.now(), D = 5000;
  (function f(t) {
    if (t - t0 < D - 1200) for (var k = 0; k < 3; k++) puffs.push({ x: fx.W / 2 + (Math.random() - .5) * 40, y: fx.H + 20, r: 18 + Math.random() * 16, vx: (Math.random() - .5) * 1.4, vy: -2.2 - Math.random() * 1.8, a: .6 });
    fx.ctx.clearRect(0, 0, fx.W, fx.H);
    puffs.forEach(function (p) { p.x += p.vx + Math.sin((t + p.y) / 400) * .5; p.y += p.vy; p.r += .55; p.a *= .993; var g = fx.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(255,255,255,' + p.a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); fx.ctx.fillStyle = g; fx.ctx.beginPath(); fx.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fx.ctx.fill(); });
    puffs = puffs.filter(function (p) { return p.y + p.r > -40 && p.a > .02; });
    if (t - t0 < D) requestAnimationFrame(f); else fx.done();
  })(t0);
  setTimeout(function () { if (k) eggCard(k, title, text); else message('<h2>' + title + '</h2><p>' + text + '</p>', 4200); }, 600);
}
function extraOmnes() {
  var v = document.createElement('div'); v.className = 'egg-veil'; document.body.appendChild(v);
  eggCard('omnes', 'Toc, toc…', 'Has llamado 5 veces a la puerta de la casita. No abre nadie: están todos en la nave jugando al ping-pong.');
  setTimeout(function () { v.remove(); }, 4400);
}
function abueloMode() {
  ui.prefs.size = ui.prefs.size === 'xl' ? 'm' : 'xl'; savePrefs(); applyPrefs(); render(true);
  eggToast('abuelo', ui.prefs.size === 'xl' ? 'Letra de abuelo: todo en grande, sin gafas. Toca 3 veces otra vez para volver.' : 'Letra normal. ¿Alguien ha visto mis gafas?');
}
var tapCount = {}, tapTimer = {};
var EGG_TAPS = { bday: 5, baby: 3, grand: 3, logo: 5, sun: 5, disco: 3, podio: 3, abumeter: 3 };
function eggTap(k, el) {
  var need = EGG_TAPS[k]; if (!need) return false;
  tapCount[k] = (tapCount[k] || 0) + 1; clearTimeout(tapTimer[k]);
  tapTimer[k] = setTimeout(function () { tapCount[k] = 0; }, 2400);
  if (el && tapCount[k] >= 2 && tapCount[k] < need) { el.classList.remove('egg-poke'); void el.offsetWidth; el.classList.add('egg-poke'); if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {} }
  if (tapCount[k] >= need) {
    tapCount[k] = 0;
    if (k === 'bday') bdayParty(); else if (k === 'baby') marcMode(); else if (k === 'logo') extraOmnes(); else if (k === 'sun') sunDance(); else if (k === 'disco') discoMode(); else if (k === 'podio') himno(); else if (k === 'abumeter') abuMeterFx(); else abueloMode();
    return true;
  }
  return false;
}

/* ---------- Acciones ---------- */
var A = {
  tab: function (el) { ui.mealFilter = null; if (el.dataset.tab === 'juegos') { ui.game = null; ui.jsub = null; } go(el.dataset.tab); },
  goSheet: function (el) { closeSheet(); go(el.dataset.tab); },
  logo: function (el) { if (!eggTap('logo', el)) { if (ui.tab !== 'inicio') go('inicio'); } },
  menu: function () { menuSheet(); },
  close: function () { closeSheet(); },
  day: function (el) { ui.day = el.dataset.day; render(true); },
  sub: function (el) { ui.sub = el.dataset.sub; if (ui.tab !== 'planes') ui.tab = 'planes'; render(true); navPush(); },
  fam: function (el) { ui.fam = el.dataset.fam; saveUi(); render(true); },
  st: function (el) { ui.st = el.dataset.st; render(true); },
  superMode: function () { ui.superMode = !ui.superMode; saveUi(); render(true); if (ui.superMode) { ui.st = 'pendiente'; ui.fam = me().family; render(true); toast('Modo súper: tu lista, letra grande y solo lo pendiente'); } },
  clearMeal: function () { ui.mealFilter = null; render(true); },
  mealItems: function (el) { ui.mealFilter = el.dataset.id; ui.fam = 'all'; ui.st = 'todo'; go('compra', {}); },
  tick: function (el) {
    if (!guard('edit')) return;
    var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; });
    if (!i.family && fam(me().family)) i.family = me().family;
    var was = i.status;
    i.status = was === 'pendiente' ? 'comprado' : 'pendiente';
    if (i.status === 'pendiente') i.cost = null;
    save();
    el.classList.remove('home'); el.classList.toggle('on', i.status === 'comprado');
    var row = document.getElementById('it-' + i.id); if (row) { row.classList.toggle('done', i.status === 'comprado'); row.classList.remove('casa'); }
    if (i.status === 'comprado') {
      el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
      var b = document.createElement('span'); b.className = 'burst'; el.appendChild(b); setTimeout(function () { b.remove(); }, 520);
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
      toast('¡Al carro! ' + esc(i.name), 'Añadir precio', function () { costSheet(i.id); });
      if (/cerve|vino|cava|refresc/i.test(i.name)) setTimeout(function () { cheers(i.name); }, 300);
    }
    var cov = L.coverage(S.ingredients); var bar = document.getElementById('covbar');
    setTimeout(function () { if (!document.getElementById('scrim')) render(true); }, 700);
    if (bar) bar.style.width = cov.pct + '%';
    checkFumata();
  },
  editItem: function (el) { itemSheet(el.dataset.id); },
  claim: function (el) {
    if (!guard('edit')) return; var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; }), f = fam(me().family); if (!i || !f) return;
    if (i.family) { toast('Ya se lo ha pedido ' + esc(fam(i.family).name)); render(true); return; }
    i.family = f.id; save();
    var row = document.getElementById('it-' + i.id); if (row) { row.classList.add('claimed'); }
    if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
    toast(esc(i.name) + ' → ' + esc(f.name) + (i.est != null ? ' · ≈ ' + L.money(i.est) : ''), 'Deshacer', function () { i.family = null; save(); render(true); });
    checkFumata();
    setTimeout(function () { if (!document.getElementById('scrim')) render(true); }, 380);
    if (!L.unassigned(S).length) setTimeout(function () { confetti(2200); toast('¡Todo repartido! Ahora, al súper'); }, 500);
  },
  unclaim: function (el) {
    if (!guard('edit')) return; var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; }); if (!i) return;
    var prev = { family: i.family, status: i.status, cost: i.cost };
    i.family = null; i.status = 'pendiente'; i.cost = null; save();
    var row = document.getElementById('it-' + i.id); if (row) row.classList.add('claimed');
    toast(esc(i.name) + ' vuelve a «Sin dueño»', 'Deshacer', function () { i.family = prev.family; i.status = prev.status; i.cost = prev.cost; save(); render(true); });
    setTimeout(function () { if (!document.getElementById('scrim')) render(true); }, 380); checkFumata();
  },
  claimMeal: function (el) {
    if (!guard('edit')) return; var f = fam(me().family); if (!f) return;
    var its = S.ingredients.filter(function (i) { return !i.family && i.meals.indexOf(el.dataset.id) >= 0; });
    its.forEach(function (i) { i.family = f.id; }); save(); render(true);
    toast(its.length + ' ingredientes para ' + esc(f.name), 'Deshacer', function () { its.forEach(function (i) { i.family = null; }); save(); render(true); });
  },
  owner: function (el) {
    var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; }); if (!i) return;
    var cur = fam(i.family);
    openSheet('<h2>' + esc(i.name) + '</h2><p class="small muted">Ahora lo compra <b>' + (cur ? esc(cur.name) : 'nadie') + '</b>' + (i.status === 'casa' ? ' · viene de casa' : '') + '.</p>' +
      (can('edit') ? '<div class="stack">' + S.families.map(function (x) { return '<button class="btn block' + (x.id === i.family ? ' primary' : '') + '" data-act="setOwner" data-id="' + i.id + '" data-fam="' + x.id + '"><i class="fam-dot ' + x.color + '"></i>' + esc(x.name) + (x.id === me().family ? ' (nosotros)' : '') + '</button>'; }).join('') +
        '<button class="btn ghost block" data-act="setOwner" data-id="' + i.id + '" data-fam="">Soltar: que vuelva a «Sin dueño»</button></div>' : '<p class="small">Solo los editores cambian quién compra cada cosa.</p>') +
      '<button class="btn block" data-act="close">Cerrar</button>');
  },
  setOwner: function (el) {
    if (!guard('edit')) return; var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; }); if (!i) return;
    i.family = el.dataset.fam || null; if (!i.family && i.status !== 'pendiente') { i.status = 'pendiente'; i.cost = null; }
    save(); closeSheet(); render(true); toast(i.family ? esc(i.name) + ' → ' + esc(fam(i.family).name) : esc(i.name) + ' vuelve a «Sin dueño»');
  },
  howToggle: function () { ui.howClosed = !ui.howClosed; saveUi(); render(true); },
  newItem: function () { if (guard('edit')) itemSheet(null); },
  saveItem: saveItem,
  dupItem: function (el) {
    var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; });
    var c = clone(i); c.id = uid('i'); c.name = i.name + ' (copia)'; c.status = 'pendiente'; c.cost = null;
    S.ingredients.splice(S.ingredients.indexOf(i) + 1, 0, c); save(); closeSheet(); render(true); toast('Duplicado'); itemSheet(c.id);
  },
  delItem: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Toca otra vez'; return; }
    var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; });
    var idx = S.ingredients.indexOf(i); S.ingredients.splice(idx, 1); save(); closeSheet(); render(true);
    toast('Borrado: ' + esc(i.name), 'Deshacer', function () { S.ingredients.splice(idx, 0, i); save(); render(true); });
  },
  dseg: function (el) { draft[el.dataset.k] = el.dataset.v; el.parentNode.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b === el); }); },
  dmeal: function (el) { var id = el.dataset.id, k = draft.meals.indexOf(id); if (k >= 0) draft.meals.splice(k, 1); else draft.meals.push(id); el.setAttribute('aria-pressed', k < 0); },
  saveCost: function (el) {
    var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; }); i.cost = numVal('c-cost'); save(); closeSheet(); render(true); toast('Precio guardado'); checkClaras();
  },
  attendance: function (el) { attendanceSheet(el.dataset.id); },
  famAttend: function (el) { attendanceSheet(null, el.dataset.fam); },
  togAtt: function (el) { togAtt(el.dataset.m, el.dataset.p, el); },
  conf: function (el) {
    var pid = el.dataset.p, day = el.dataset.day;
    if (!guard('attend', pid)) return;
    var next = { pend: 'si', si: 'no', no: 'pend' }[L.dayStatus(S, pid, day)];
    egg('dias');
    S.dayConfirm[pid] = S.dayConfirm[pid] || {};
    if (next === 'pend') delete S.dayConfirm[pid][day]; else S.dayConfirm[pid][day] = next;
    /* la confirmación del día manda: se quitan las excepciones de sus comidas */
    S.meals.forEach(function (m) { if (m.day === day && S.attendance[m.id]) delete S.attendance[m.id][pid]; });
    save(); render(true);
    var b = document.querySelector('.conf[data-p="' + pid + '"][data-day="' + day + '"]'); if (b) { b.classList.add('pop'); }
    if (!pendingConfirmations()) setTimeout(function () { confetti(2400); toast('¡Asistencia cerrada! Planning y cantidades listos'); }, 250);
  },
  confFam: function (el) {
    var fp = S.people.filter(function (p) { return p.family === el.dataset.fam; });
    if (!fp.every(function (p) { return canAttendFor(p.id); })) { toast('Solo puedes confirmar a tu familia'); return; }
    S.people.filter(function (p) { return p.family === el.dataset.fam; }).forEach(function (p) {
      S.dayConfirm[p.id] = {}; S.days.forEach(function (d) { S.dayConfirm[p.id][d.k] = 'si'; });
      S.meals.forEach(function (m) { if (S.attendance[m.id]) delete S.attendance[m.id][p.id]; });
    });
    save(); render(true); toast(esc(fam(el.dataset.fam).name) + ': confirmados los 4 días');
  },
  applyQty: function (el) {
    if (!guard('edit')) return;
    var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; });
    if (applySuggestion(i)) { save(); closeSheet(); render(true); toast('Cantidad ajustada: ' + L.n(i.qty) + ' ' + esc(i.unit)); }
  },
  applyAllQty: function () {
    if (!guard('edit')) return;
    var n = 0; S.ingredients.forEach(function (i) { if (i.status === 'pendiente' && applySuggestion(i)) n++; });
    save(); render(true); toast(n ? n + ' cantidades ajustadas a los comensales previstos' : 'Nada que ajustar');
  },
  editMeal: function (el) { if (guard('edit')) mealSheet(el.dataset.id); },
  saveMeal: saveMeal,
  vote: function (el) {
    S.votes = S.votes || {}; var v = S.votes[el.dataset.id] = S.votes[el.dataset.id] || [];
    var k = v.indexOf(me().id); if (k >= 0) v.splice(k, 1); else v.push(me().id);
    save(); el.setAttribute('aria-pressed', k < 0); el.querySelector('.num').textContent = v.length;
    if (k < 0) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); egg('apunto'); }
  },
  editAct: function (el) { if (guard('edit')) actSheet(el.dataset.id); },
  newAct: function () { if (guard('edit')) actSheet(null); },
  saveAct: saveAct,
  delAct: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Toca otra vez'; return; }
    var a = S.activities.find(function (x) { return x.id === el.dataset.id; }), idx = S.activities.indexOf(a);
    S.activities.splice(idx, 1); save(); closeSheet(); render(true);
    toast('Plan borrado', 'Deshacer', function () { S.activities.splice(idx, 0, a); save(); render(true); });
  },
  win: function (el) {
    if (!guard('edit')) return;
    var m = S.tournament.rounds[+el.dataset.r][+el.dataset.m];
    var before = L.advance(S.tournament);
    m.w = m.w === el.dataset.side ? null : el.dataset.side;
    var champ = L.advance(S.tournament); save(); render(true);
    if (champ && champ !== before) setTimeout(function () { trophy(champ); }, 200);
  },
  trophy: function () { var c = L.advance(S.tournament); if (c) trophy(c); },
  editPlayers: function () {
    var R = S.tournament.rounds[0];
    openSheet('<h2>Jugadores</h2><p class="small muted">8 plazas en cuartos. Mezcla edades para que haya emoción.</p>' + R.map(function (m, i) {
      return '<div class="grid2">' + ['a', 'b'].map(function (s) { return '<div class="field"><label for="pl-' + i + s + '">Partido ' + (i + 1) + (s === 'a' ? ' · jugador 1' : ' · jugador 2') + '</label><select id="pl-' + i + s + '">' + S.people.filter(function (p) { return p.kind !== 'bebe'; }).map(function (p) { return '<option value="' + p.id + '"' + (m[s] === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div>'; }).join('') + '</div>';
    }).join('') + '<div class="sheet-actions"><button class="btn primary" data-act="savePlayers">Guardar cuadro</button><button class="btn" data-act="close">Cancelar</button></div>');
  },
  savePlayers: function () {
    S.tournament.rounds[0].forEach(function (m, i) { m.a = val('pl-' + i + 'a'); m.b = val('pl-' + i + 'b'); m.w = null; m.sa = m.sb = null; });
    L.advance(S.tournament); save(); closeSheet(); render(true); toast('Cuadro actualizado');
  },
  resetBracket: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = '¿Seguro? Toca otra vez'; return; }
    S.tournament.rounds.forEach(function (r) { r.forEach(function (m) { m.w = null; m.sa = m.sb = null; }); }); L.advance(S.tournament); save(); render(true);
  },
  costView: function (el) { ui.costView = el.dataset.v; render(true); },
  mode: function (el) { if (!guard('edit')) return; S.split.mode = el.dataset.v; save(); render(true); toast('Criterio: ' + el.textContent); },
  newExp: function () { if (guard('edit')) expSheet(null); },
  editExp: function (el) { if (guard('edit')) expSheet(el.dataset.id); },
  saveExp: saveExp,
  abuC: function (el) { var f = document.getElementById('abu-amt'); if (f && f.value) ui.abuA = numVal('abu-amt'); ui.abuC = ui.abuC === el.dataset.v ? '' : el.dataset.v; render(); },
  abuA: function (el) { var n = +el.dataset.v; ui.abuA = ui.abuA === n ? null : n; var f = document.getElementById('abu-amt'); if (f) f.value = ''; render(); },
  abuGo: function () {
    if (!guard('edit')) return;
    var ex = L.excluded(S); if (!ex.length) return;
    var typed = numVal('abu-amt'), amt = typed != null ? typed : ui.abuA;
    if (!amt || amt <= 0) { toast('¿Cuánto? Toca un importe o escríbelo'); return; }
    var before = abuLevel(L.ledger(S, false).rows.filter(function (r) { return r.id === ex[0]; }).reduce(function (a, r) { return a + r.paid; }, 0) + S.expenses.filter(function (e) { return e.payer === ex[0] && e.kind === 'aportacion'; }).reduce(function (a, e) { return a + e.amount; }, 0));
    S.expenses.push({ id: uid('e'), concept: ui.abuC || 'Invitación de los abuelos', amount: amt, payer: ex[0], split: 'comun', kind: 'aportacion', date: new Date().toISOString().slice(0, 10) });
    ui.abuC = ''; ui.abuA = null; save(); render(true);
    var tot = S.expenses.filter(function (e) { return e.payer === ex[0] && e.kind === 'aportacion'; }).reduce(function (a, e) { return a + e.amount; }, 0) + (L.ledger(S, false).rows.find(function (r) { return r.id === ex[0]; }) || { paid: 0 }).paid;
    var after = abuLevel(tot);
    confetti(1600);
    if (after.l[1] !== before.l[1]) setTimeout(function () { message('<h2 style="font-size:clamp(1.8rem,9vw,3rem)">¡Nivel nuevo!<br>' + esc(after.l[1]) + '</h2>', 2600); }, 250);
    else toast('¡Gracias, abuelos! ' + L.money(amt) + ' menos en el bote');
    checkClaras();
  },
  delExp: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Toca otra vez'; return; }
    S.expenses = S.expenses.filter(function (x) { return x.id !== el.dataset.id; }); save(); closeSheet(); render(true); toast('Gasto borrado');
  },
  payHouse: function (el) { if (!guard('access')) return; var p = S.house.payments.find(function (x) { return x.id === el.dataset.id; }); p.paid = true; p.date = new Date().toISOString().slice(0, 10); save(); render(true); toast('Segundo pago marcado. Gracias, abuelos'); },
  wxRefresh: function () { refreshWeather(true); },
  setMe: function (el) { ui.me = el.dataset.id; saveUi(); closeSheet(); render(true); toast('Ahora eres ' + esc(me().name) + ' (' + ROLE[me().role] + ')'); },
  pref: function (el) {
    ui.prefs[el.dataset.k] = el.dataset.v; savePrefs(); applyPrefs();
    if (el.dataset.k === 'theme' && el.dataset.v === 'dark') egg('noche');
    el.parentNode.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b === el); });
    if (el.dataset.k === 'accent' || el.dataset.k === 'theme') { stopHero(); if (ui.tab === 'inicio') startHero(); }
  },
  resetData: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Se pierden los cambios. Toca otra vez'; return; }
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = load(); closeSheet(); render(); toast('Datos de la demo restablecidos');
  },
  secrets: function () { secretsSheet(); },
  whoOnline: function () { openSheet('<h2>Quién está conectado</h2><div id="whoSheet">' + whoList() + '</div><button class="btn primary block" data-act="close">Cerrar</button>'); },
  hours: function () {
    if (!guard('edit')) return;
    var o = S.trip.official || {};
    openSheet('<h2>Horarios del viaje</h2><p class="small muted">Lo decidimos nosotros. La finca tiene entrada desde las ' + esc(o.arrival || '—') + ' y salida hasta las ' + esc(o.departure || '—') + '; si os salís de ahí, hay que pedírselo a la finca.</p>' +
      '<div class="grid2"><div class="field"><label for="h-arr">Llegada (' + esc(S.days[0].long) + ')</label><input id="h-arr" type="time" value="' + esc(S.trip.arrival) + '"></div>' +
      '<div class="field"><label for="h-dep">Salida (' + esc(S.days[S.days.length - 1].long) + ')</label><input id="h-dep" type="time" value="' + esc(S.trip.departure) + '"></div></div>' +
      '<p class="small muted">La hora de cada comida se cambia en su ficha (Comidas → lápiz). La app avisa si una comida cae fuera de vuestro horario.</p>' +
      '<div class="sheet-actions"><button class="btn primary" data-act="saveHours">Guardar horarios</button><button class="btn" data-act="close">Cancelar</button></div>');
  },
  saveHours: function () {
    var a = val('h-arr'), d = val('h-dep'); if (!a || !d) { toast('Pon las dos horas'); return; }
    S.trip.arrival = a; S.trip.departure = d; save(); closeSheet(); render(true);
    var w = L.offHours(S); toast(w.length ? 'Guardado. Ojo: ' + esc(w[0]) : 'Horarios guardados');
  },
  access: function (el) { if (guard('access')) accessSheet(el.dataset.id); },
  rmPhoto: function (el) { var p = person(el.dataset.id); p.avatar = null; save(); render(true); accessSheet(p.id); toast('Foto quitada'); },
  saveAccess: function (el) {
    var p = person(el.dataset.id), em = val('x-email').trim().toLowerCase(), lg = val('x-login').trim().toLowerCase();
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Ese email no parece válido'); return; }
    if (lg && !/^[a-z0-9._-]{3,30}$/.test(lg)) { toast('El usuario: solo letras, números y . _ - (mínimo 3)'); return; }
    if (lg && S.people.some(function (x) { return x.id !== p.id && ((x.login || '') === lg || (x.email || '') === lg); })) { toast('Ese usuario ya lo tiene otra persona'); return; }
    p.email = em || null; p.login = lg || null; save(); closeSheet(); render(true); toast('Acceso de ' + esc(p.name) + ' guardado');
  },
  resetCode: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = '¿Seguro?'; return; }
    var pid = el.dataset.id; ACCESS.reset(pid).then(function () { accessSheet(pid); toast('Código reiniciado: entrará con el de la familia y elegirá otro'); }, function () { toast('No he podido reiniciarlo'); });
  },
  sharedCode: function () {
    openSheet('<h2>Código de la familia</h2><p class="small muted">6 cifras. Sirve para entrar la primera vez, junto al email. Quien ya tenga su código propio no lo necesita.</p>' +
      '<div class="field"><label for="sc-new">Código nuevo</label><input id="sc-new" inputmode="numeric" maxlength="6" style="font-size:1.6rem;letter-spacing:.2em;font-weight:800"></div>' +
      '<div class="sheet-actions"><button class="btn primary" data-act="saveShared">Guardar</button><button class="btn" data-act="close">Cancelar</button></div>');
  },
  saveShared: function () {
    var c = val('sc-new').replace(/\D/g, ''); if (c.length !== 6) { toast('Tiene que tener 6 cifras'); return; }
    ACCESS.setShared(c).then(function () { closeSheet(); render(true); toast('Código de la familia cambiado'); }, function () { toast('No he podido guardarlo'); });
  },
  copyInvite: function (el) {
    var t = el.dataset.text;
    try { navigator.clipboard.writeText(t).then(function () { toast('Mensaje copiado. Pégalo en WhatsApp'); }, function () { selectText('invite-text'); toast('Selecciona y copia el mensaje'); }); } catch (e) { selectText('invite-text'); }
  }
};
function selectText(id) { var n = document.getElementById(id); if (!n) return; var r = document.createRange(); r.selectNodeContents(n); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
/* Acceso: cada persona entra con su email (o un usuario) + código. La primera vez, el código de la familia; luego elige el suyo.
   El admin ve si cada uno tiene ya código propio (nunca cuál es) y puede reiniciarlo. En la demo todo vive en el navegador. */
var ACCESS = {
  status: function () { var o = {}; Object.keys(S.codes || {}).forEach(function (k) { o[k] = { has: true, at: null }; }); return Promise.resolve(o); },
  reset: function (pid) { if (S.codes) delete S.codes[pid]; save(); return Promise.resolve(); },
  getShared: function () { return Promise.resolve(S.sharedCode || null); },
  setShared: function (c) { S.sharedCode = c; save(); return Promise.resolve(); }
};
function siteUrl() { return (window.CLOUD && CLOUD.siteUrl) || location.href.split('#')[0]; }
function loginOf(p) { return p.email || p.login || ''; }
function inviteText(p, code, has) {
  var id = loginOf(p);
  if (has) return 'Hola ' + p.name + '! La web de la ' + S.trip.name + ': ' + siteUrl() + ' · Entra con ' + (p.email ? 'tu email ' : 'tu usuario ') + id + ' y tu código personal.';
  return 'Hola ' + p.name + '! Ya tienes acceso a la web de la ' + S.trip.name + ': ' + siteUrl() + ' · Entra con ' + (id ? (p.email ? 'tu email ' : 'tu usuario ') + id : 'tu email') + ' y el código de la familia ' + (code || '(pídemelo)') + '. La primera vez te pedirá que elijas tu propio código.';
}
function groupText(code) {
  return '¡Familia! Ya está lista la web de la ' + S.trip.name + ': ' + siteUrl() + ' · Entrad con vuestro email y el código ' + (code || '(pídemelo)') + '. Lo primero que os pedirá es que elijáis vuestro propio código. Después: confirmad qué días venís y pedíos productos de la compra. Os paso el manual en PDF.';
}
function slug(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
function accessSheet(pid) {
  var p = person(pid);
  Promise.all([ACCESS.status(), ACCESS.getShared()]).then(function (r) {
    var st = r[0][pid] || { has: false }, code = r[1];
    var msg = inviteText(p, code, st.has);
    openSheet('<h2>Acceso de ' + esc(p.name) + '</h2><p class="small muted">Rol: <b>' + ROLE[p.role] + '</b> (se cambia en la lista).</p>' +
      '<div class="field"><span class="lbl">Foto</span><div class="row">' + av(pid, 'lg') + '<label class="btn" for="x-photo" style="cursor:pointer">' + icon('edit') + 'Cambiar foto</label><input id="x-photo" type="file" accept="image/*" hidden data-change="photo" data-id="' + pid + '">' + (p.avatar ? '<button class="btn ghost" data-act="rmPhoto" data-id="' + pid + '">Quitar</button>' : '') + '</div></div>' +
      '<div class="field"><label for="x-email">Email</label><input id="x-email" type="email" inputmode="email" autocomplete="off" value="' + esc(p.email || '') + '" placeholder="nombre@correo.com"></div>' +
      '<div class="field"><label for="x-login">Usuario (solo si no tiene email)</label><input id="x-login" autocapitalize="off" autocomplete="off" value="' + esc(p.login || '') + '" placeholder="por ejemplo: ' + esc(slug(p.name)) + '"></div>' +
      '<div class="field"><span class="lbl">Su código</span><div class="row code-st ' + (st.has ? 'ok' : '') + '">' + icon(st.has ? 'check' : 'clock') + '<span class="grow">' + (st.has ? 'Ya tiene su código propio' + (st.at ? ' (desde el ' + L.ddmm(String(st.at).slice(0, 10)) + ')' : '') + '. Nadie más lo ve.' : 'Aún no. Entrará con el código de la familia y elegirá el suyo.') + '</span>' +
        (st.has ? '<button class="btn ghost" data-act="resetCode" data-id="' + pid + '">Reiniciar</button>' : '') + '</div></div>' +
      '<div class="field"><span class="lbl">Mensaje para enviarle</span><p class="small card wood" id="invite-text" style="user-select:all">' + esc(msg) + '</p><button class="btn" data-act="copyInvite" data-text="' + esc(msg) + '">' + icon('copy') + 'Copiar mensaje</button></div>' +
      '<div class="sheet-actions"><button class="btn primary" data-act="saveAccess" data-id="' + pid + '">Guardar</button><button class="btn" data-act="close">Cerrar</button></div>');
  });
}
/* tarjeta de admin en Personas: código de la familia y quién tiene ya el suyo */
function familyAccessCard() {
  return '<section class="card access-card" id="accessCard"><div class="card-head"><h3>Acceso de la familia</h3><span class="pill red">Solo tú</span></div><p class="small muted">Cargando…</p></section>';
}
function fillFamilyAccess() {
  var el = document.getElementById('accessCard'); if (!el) return;
  Promise.all([ACCESS.status(), ACCESS.getShared()]).then(function (r) {
    var st = r[0], code = r[1], n = S.people.filter(function (p) { return st[p.id] && st[p.id].has; }).length;
    var noId = S.people.filter(function (p) { return !loginOf(p) && p.kind !== 'bebe'; });
    el.innerHTML = '<div class="card-head"><h3>Acceso de la familia</h3><span class="pill red">Solo tú</span></div>' +
      '<p class="small">Todos entran con <b>su email</b> y este <b>código de la familia</b>. Nada más entrar, cada uno elige el suyo.</p>' +
      '<div class="row shared-code"><b class="big num" style="letter-spacing:.14em">' + (code ? esc(code) : '——————') + '</b><span class="grow"></span><button class="btn" data-act="sharedCode">' + icon('edit') + (code ? 'Cambiar' : 'Crear') + '</button></div>' +
      '<button class="btn primary block" data-act="copyInvite" data-text="' + esc(groupText(code)) + '">' + icon('copy') + 'Copiar mensaje para el grupo de WhatsApp</button>' +
      '<div class="progress" aria-label="Con código propio"><i style="width:' + Math.round(n / S.people.length * 100) + '%"></i></div><p class="small muted">' + n + ' de ' + S.people.length + ' ya tienen su código propio.' +
      (noId.length ? ' Sin email ni usuario (todavía no pueden entrar): <b>' + noId.map(function (p) { return esc(p.name); }).join(', ') + '</b>. Tócales en la lista para ponérselo.' : '') + '</p>';
  }, function () { var q = el.querySelector('p'); if (q) q.textContent = 'No he podido cargar los accesos.'; });
}
function costSheet(id) {
  var i = S.ingredients.find(function (x) { return x.id === id; });
  openSheet('<h2>¿Cuánto costó?</h2><p class="muted">' + esc(i.name) + (i.est != null ? ' · estimado ≈ ' + L.money(i.est) : '') + '</p>' +
    '<div class="field"><label for="c-cost">Importe en euros</label><input id="c-cost" inputmode="decimal" style="font-size:1.6rem;font-weight:800" placeholder="0,00" value="' + (i.cost != null ? L.n(i.cost) : '') + '"></div>' +
    '<div class="sheet-actions"><button class="btn primary" data-act="saveCost" data-id="' + id + '">Guardar precio</button><button class="btn" data-act="close">Luego</button></div>');
}
var C = {
  itemCost: function (el) {
    if (!guard('edit')) return; var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; }); if (!i) return;
    var v = el.value.replace(/[€\s]/g, '').replace(',', '.').trim();
    if (v === '') i.cost = null; else { var n = parseFloat(v); if (isNaN(n) || n < 0) { toast('Escribe un precio, por ejemplo 4,50'); el.value = i.cost != null ? L.n(i.cost) : ''; return; } i.cost = Math.round(n * 100) / 100; el.value = L.n(i.cost); }
    save();
    var lab = el.closest('.price-in'); if (lab) lab.classList.toggle('ok', i.cost != null);
    var row = document.getElementById('it-' + i.id); if (row) row.classList.toggle('noprice', L.needsPrice(i));
    var sum = document.getElementById('mineSum'); if (sum) sum.innerHTML = mineSumHtml(S.ingredients.filter(function (x) { return x.family === me().family; }));
    if (i.cost != null) { if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {} if (!S.ingredients.some(function (x) { return x.family === me().family && L.needsPrice(x); })) { confetti(1600); toast('¡Todo con precio! Ya cuenta en Cuentas'); } }
  },
  score: function (el) { var m = S.tournament.rounds[+el.dataset.r][+el.dataset.m]; var v = parseInt(el.value, 10); m['s' + el.dataset.side] = isNaN(v) ? null : v; save(); },
  weight: function (el) { var v = parseFloat(el.value.replace(',', '.')); if (!isNaN(v) && v >= 0) { S.split.w[el.dataset.k] = v; save(); render(true); } },
  photo: function (el) {
    if (!guard('access')) return;
    var f = el.files && el.files[0]; if (!f) return;
    var pid = el.dataset.id, url = URL.createObjectURL(f), img = new Image();
    img.onload = function () {
      var s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas'); c.width = c.height = 192;
      var cx = c.getContext('2d'); cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, (img.naturalWidth - s) / 2, Math.max(0, (img.naturalHeight - s) * 0.3), s, s, 0, 0, 192, 192);
      var d = c.toDataURL('image/webp', 0.82); if (d.indexOf('data:image/webp') !== 0) d = c.toDataURL('image/jpeg', 0.85);
      person(pid).avatar = d; URL.revokeObjectURL(url); save(); render(true); accessSheet(pid); toast('Foto actualizada');
    };
    img.onerror = function () { toast('No he podido leer esa imagen'); };
    img.src = url;
  },
  role: function (el) { if (!guard('access')) return; var p = person(el.dataset.id); p.role = el.value; save(); render(true); toast(esc(p.name) + ' ahora es ' + ROLE[p.role]); }
};

/* ---------- Tiempo en directo (en GitHub Pages funciona; dentro de un visor restringido se queda la foto del 30/09) ---------- */
function refreshWeather(manual) {
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + S.trip.lat + '&longitude=' + S.trip.lon + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Europe%2FMadrid&start_date=' + S.days[0].k + '&end_date=' + S.days[S.days.length - 1].k;
  var ctl = window.AbortController ? new AbortController() : null; var to = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
  fetch(url, ctl ? { signal: ctl.signal } : {}).then(function (r) { return r.json(); }).then(function (j) {
    clearTimeout(to); var d = j.daily; if (!d || !d.time) throw new Error('sin datos');
    S.weather.days = d.time.map(function (k, i) { return { k: k, code: d.weather_code[i], tmin: d.temperature_2m_min[i], tmax: d.temperature_2m_max[i], rain: d.precipitation_sum[i] || 0, prob: d.precipitation_probability_max[i] || 0, wind: d.wind_speed_10m_max[i] || 0 }; });
    S.weather.fetched = new Date().toISOString(); S.weather.source = 'Open-Meteo (en directo)'; save();
    if (ui.tab === 'inicio' || ui.tab === 'tiempo' || ui.tab === 'planes') render(true);
    if (manual) toast('Previsión actualizada');
  }).catch(function () { clearTimeout(to); if (manual) toast('No he podido actualizar. Se queda la previsión del ' + L.ddmm(S.weather.fetched)); });
}

/* ---------- Arranque ---------- */
function bindEvents() {
  document.addEventListener('click', function (e) {
    var eg = e.target.closest('[data-egg]');
    if (eg && S && eggTap(eg.dataset.egg, eg)) { e.preventDefault(); return; }
    var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
    var fn = A[t.dataset.act]; if (fn) { e.preventDefault(); fn(t, e); }
  });
  document.addEventListener('change', function (e) { var t = e.target.closest('[data-change]'); if (t && C[t.dataset.change]) C[t.dataset.change](t); });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.input === 'search' && /habemus/i.test(t.value)) habemusPapam();
    if (t.dataset.input === 'search' && /^(salud|chin ?ch[ií]n)$/i.test(t.value.trim()) && !hasEgg('salud')) cheers('', true);
    if (t.dataset.input === 'search') { ui.q = t.value; var pos = t.selectionStart; render(true); var n = document.getElementById('q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }
    if (t.dataset.input === 'glass') { ui.prefs.glass = t.value / 100; savePrefs(); applyPrefs(); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Enter' && e.target && e.target.classList && e.target.classList.contains('price-field')) {
      e.preventDefault(); var all = Array.prototype.slice.call(document.querySelectorAll('.price-field')), k = all.indexOf(e.target);
      if (all[k + 1]) all[k + 1].focus(); else e.target.blur();
    }
  });
}
/* Se llama cuando S ya está cargado (demo local o nube) */
function startApp() {
  S.dayConfirm = S.dayConfirm || {}; S.attendance = S.attendance || {}; S.expenses = S.expenses || [];
  if (!ui.me || !person(ui.me)) { var ad = S.people.find(function (p) { return p.role === 'admin'; }) || S.people[0]; ui.me = ad.id; }
  document.title = S.trip.name; CATS.marc = 'Menú ' + babyName();
  buildEggs(); applyPrefs(); render(); navInit();
  refreshWeather(false);
  var h = new Date().getHours(); if (h < 5) setTimeout(function () { if (!hasEgg('buho')) eggToast('buho', '¿Despierto a estas horas? Mañana hay hockey. A dormir, búho.'); }, 1500);
  var today = new Date().toISOString().slice(0, 10);
  var bd = S.trip.eggs && S.trip.eggs.bdayDate;
  if (bd && today === bd && ui.bdaySeen !== today) { ui.bdaySeen = today; saveUi(); setTimeout(bdayParty, 900); }
  if (countdownParts().phase === 'during') egg('zero');
  secretsWatch();
  setInterval(function () { var d = new Date(); if (d.getHours() % 12 === 11 && d.getMinutes() === 11 && ui.lastWish !== d.toDateString() + d.getHours()) { ui.lastWish = d.toDateString() + d.getHours(); wish1111(); } }, 20000);
}
function boot() {
  var u = loadUi();
  ui = { tab: u.tab || 'inicio', me: u.me || null, fam: null, st: 'pendiente', howClosed: !!u.howClosed, superMode: !!u.superMode, day: null, sub: 'plan', costView: 'real', bdaySeen: u.bdaySeen, prefs: loadPrefs() };
  if (['personas', 'tiempo', 'asistencia', 'manual', 'finca', 'casas'].indexOf(ui.tab) >= 0) ui.tab = 'inicio';
  $main = document.getElementById('main'); $nav = document.getElementById('nav'); $top = document.getElementById('top');
  applyPrefs(); bindEvents();
  if (typeof SEED !== 'undefined') { S = load(); startApp(); }
  else if (window.CLOUD) CLOUD.boot();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
