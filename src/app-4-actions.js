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
    '<div class="field"><span class="lbl">Estado</span>' + segHtml('status', [['pendiente', 'Pendiente'], ['comprado', 'Comprado'], ['casa', 'De casa']], draft.status, !can('edit')) + '</div>' +
    '<div class="grid2"><div class="field"><label for="f-cost">Coste real (€)</label><input id="f-cost" inputmode="decimal" placeholder="' + (i.est != null ? '≈ ' + L.n(i.est) + ' estimado' : '0,00') + '" value="' + (i.cost != null ? L.n(i.cost) : '') + '"' + dis + '></div>' +
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
    '<div class="field"><label for="m-cook">Cocina</label><select id="m-cook">' + famOptions(m.cook, true) + '</select></div>' +
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
  openSheet((window.CLOUD ? '<h2>' + esc(me().name) + '</h2><p class="small muted">Has entrado como <b>' + esc(me().name) + '</b> · ' + ROLE[me().role] + '</p><button class="btn block" data-act="logout">Salir de esta cuenta</button>' : '<h2>¿Quién eres?</h2><p class="small muted">Solo en la demo: sirve para probar los permisos de cada rol.</p>' +
    S.families.map(function (f) {
      return '<div class="att-fam">' + S.people.filter(function (p) { return p.family === f.id; }).map(function (p) {
        return '<button class="toggle-p" data-act="setMe" data-id="' + p.id + '" aria-pressed="true" style="' + (ui.me === p.id ? 'border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)' : '') + '">' + av(p.id, 'sm') + esc(p.name) + '<span class="small muted">' + ROLE[p.role] + '</span></button>';
      }).join('') + '</div>';
    }).join('')) +
    '<div class="divider"></div><h2>Personaliza tu Cónclave</h2><p class="small muted">Se guarda en este dispositivo. Cada uno lo pone a su gusto.</p>' +
    '<div class="field"><span class="lbl">Tema</span><div class="seg" role="group"><button data-act="pref" data-k="theme" data-v="light" aria-pressed="' + (P.theme === 'light') + '">Claro</button><button data-act="pref" data-k="theme" data-v="auto" aria-pressed="' + (P.theme === 'auto') + '">Automático</button><button data-act="pref" data-k="theme" data-v="dark" aria-pressed="' + (P.theme === 'dark') + '">Oscuro</button></div></div>' +
    '<div class="field"><span class="lbl">Color</span><div class="swatches">' + ACCENTS.map(function (a) { return '<button class="swatch" style="background:' + a[0] + '" data-act="pref" data-k="accent" data-v="' + a[0] + '" aria-pressed="' + (P.accent === a[0]) + '" aria-label="' + a[1] + '" title="' + a[1] + '"></button>'; }).join('') + '</div></div>' +
    '<div class="field"><span class="lbl">Fondo</span><div class="seg" role="group"><button data-act="pref" data-k="bg" data-v="net" aria-pressed="' + (P.bg === 'net') + '">Cristal + red</button><button data-act="pref" data-k="bg" data-v="glass" aria-pressed="' + (P.bg === 'glass') + '">Cristal</button><button data-act="pref" data-k="bg" data-v="plain" aria-pressed="' + (P.bg === 'plain') + '">Liso</button></div></div>' +
    '<div class="field"><label for="p-glass">Transparencia del cristal</label><input class="range" id="p-glass" type="range" min="35" max="92" value="' + Math.round(P.glass * 100) + '" data-input="glass"></div>' +
    '<div class="field"><span class="lbl">Tamaño de letra</span><div class="seg" role="group"><button data-act="pref" data-k="size" data-v="m" aria-pressed="' + (P.size === 'm') + '">Normal</button><button data-act="pref" data-k="size" data-v="l" aria-pressed="' + (P.size === 'l') + '">Grande</button><button data-act="pref" data-k="size" data-v="xl" aria-pressed="' + (P.size === 'xl') + '">Muy grande</button></div></div>' +
    '<div class="divider"></div>' +
    '<div class="stack"><button class="btn block" data-act="goSheet" data-tab="asistencia">' + icon('plans') + 'Asistencia por día</button><button class="btn block" data-act="goSheet" data-tab="personas">' + icon('users') + 'Personas y accesos</button><button class="btn block" data-act="goSheet" data-tab="tiempo">' + icon('partly') + 'El tiempo</button><button class="btn block" data-act="secrets">' + icon('trophy') + 'Secretos del Cónclave · ' + foundCount() + '/' + EGGS.length + '</button>' +
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

/* ---------- Easter eggs ---------- */
var EGGS = [];
function buildEggs() {
  var g = ((S.trip.eggs && S.trip.eggs.grand) || []).map(function (id) { return nameOf(id); }).filter(Boolean).join(' o a ');
  EGGS = [
    { k: 'fumata', name: 'Habemus compra', how: 'Completar toda la lista de la compra', hint: 'Cuando no quede nada pendiente…' },
    { k: 'bday', name: 'Cumpleañero', how: 'Tocar 5 veces a ' + bdayName() + ' (o abrir la app el día de la fiesta)', hint: 'Alguien cumple años' },
    { k: 'baby', name: 'Modo ' + babyName(), how: 'Tocar 3 veces a ' + babyName(), hint: 'El más pequeño esconde algo' },
    { k: 'pop', name: 'Explotaburbujas', how: 'Explotar 15 burbujas en modo ' + babyName(), hint: 'Ploc, ploc, ploc' },
    { k: 'trophy', name: 'Campeón', how: 'Coronar al campeón del ping-pong', hint: 'Solo puede quedar uno' },
    { k: 'omnes', name: 'Extra omnes', how: 'Tocar 7 veces el logo', hint: 'El logo guarda un secreto de cónclave' },
    { k: 'abuelo', name: 'Letra de abuelo', how: 'Tocar 3 veces a ' + (g || 'los abuelos'), hint: 'Los abuelos ven de maravilla… con ayuda' },
    { k: 'claras', name: 'Cuentas claras', how: 'Dejar la liquidación a cero con gastos apuntados', hint: 'Nadie debe nada a nadie' },
    { k: 'buho', name: 'Noctámbulo', how: 'Abrir la app entre las 00:00 y las 05:00', hint: 'A deshoras' },
    { k: 'zero', name: 'Habemus Cónclave', how: 'Estar en la app cuando llega la hora de entrada', hint: 'Cuando la cuenta atrás llega a cero' },
    { k: 'salud', name: '¡Salud!', how: 'Marcar como comprada la cerveza, el vino o los refrescos', hint: 'Algo para brindar' },
    { k: 'sol', name: 'Invocar al sol', how: 'Tocar 5 veces el título del tiempo', hint: 'Si llueve, pídeselo al cielo' },
    { k: 'deseo', name: '11:11', how: 'Tener la app abierta a las 11:11', hint: 'Una hora con los números del cumpleañero' },
    { k: 'quorum', name: 'Habemus quórum', how: 'Coincidir 6 o más personas conectadas a la vez', hint: 'Cuanta más familia, mejor' },
    { k: 'papa', name: 'Habemus papam', how: 'Buscar «habemus» en la lista de la compra', hint: 'Una palabra en latín, en el buscador' },
    { k: 'disco', name: 'Modo fiesta', how: 'Tocar 3 veces la cuenta atrás', hint: 'La cuenta atrás también sabe bailar' }
  ];
}
function foundMap() { try { return JSON.parse(localStorage.getItem(KEY + '-eggs')) || {}; } catch (e) { return ui._eggs || {}; } }
function foundCount() { var f = foundMap(); return EGGS.filter(function (e) { return f[e.k]; }).length; }
function egg(k) {
  var f = foundMap(); if (f[k]) return false;
  f[k] = new Date().toISOString(); ui._eggs = f;
  try { localStorage.setItem(KEY + '-eggs', JSON.stringify(f)); } catch (e) {}
  var e = EGGS.find(function (x) { return x.k === k; });
  setTimeout(function () { toast('Secreto descubierto: <b>' + esc(e.name) + '</b> · ' + foundCount() + '/' + EGGS.length, 'Ver', secretsSheet); }, 2600);
  return true;
}
function secretsSheet() {
  var f = foundMap();
  openSheet('<h2>Secretos del Cónclave</h2><p class="small muted">' + foundCount() + ' de ' + EGGS.length + ' descubiertos en este dispositivo. ¿Quién de la familia los encuentra todos?</p><div class="stack">' +
    EGGS.map(function (e) {
      var ok = f[e.k];
      return '<div class="row"><span class="av sm" style="background:' + (ok ? 'var(--accent)' : 'var(--surface-2)') + ';color:' + (ok ? '#fff' : 'var(--muted)') + '">' + (ok ? '✓' : '?') + '</span><span class="grow"><b>' + (ok ? esc(e.name) : '???') + '</b><span class="small muted" style="display:block">' + esc(ok ? e.how : 'Pista: ' + e.hint) + '</span></span></div>';
    }).join('') + '</div><button class="btn primary block" data-act="close">Seguir buscando</button>');
}

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
  var m = document.createElement('div'); m.className = 'egg-msg'; m.innerHTML = '<div class="inner">' + html + '</div>';
  document.body.appendChild(m); setTimeout(function () { m.style.transition = 'opacity .5s'; m.style.opacity = 0; setTimeout(function () { m.remove(); }, 500); }, ms || 3200);
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
function bdayParty() {
  if (fxBusy) return; fxBusy = true; setTimeout(function () { fxBusy = false; }, 4200);
  confetti(4200);
  var e = S.trip.eggs || {};
  message('<div class="eleven">' + (e.bdayAge || '') + '</div><h2 style="font-size:clamp(1.8rem,8vw,3rem)">¡Felicidades, ' + esc(bdayName()) + '!</h2><p>' + (e.bdayAge || '') + ' años y un ' + esc(S.trip.name.split(' ')[0]) + ' entero para celebrarlo.</p>', 3800);
  egg('bday');
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
  setTimeout(function () { message('<h2>HABEMUS<br>COMPRA</h2><p>Fumata blanca: la lista está completa. El Cónclave puede comer en paz.</p>', 3600); }, 900);
  egg('fumata');
}
function checkFumata() {
  var c = L.coverage(S.ingredients);
  if (c.tot && c.done === c.tot && !S.fumataShown) { S.fumataShown = true; save(); setTimeout(fumata, 450); }
  if (c.done < c.tot && S.fumataShown) { S.fumataShown = false; save(); }
}
function checkClaras() {
  var lg = L.ledger(S, false);
  if (lg.total > 0 && !lg.tx.length) { if (egg('claras')) setTimeout(function () { message('<h2 style="font-size:clamp(2rem,10vw,3.4rem)">Cuentas claras,<br>familia unida</h2>', 2800); }, 300); }
}
var marcOn = false, popped = 0;
function marcMode() {
  if (marcOn) return; marcOn = true; popped = 0; egg('baby');
  toast('Modo ' + esc(babyName()) + ': ¡explota las burbujas!');
  var end = Date.now() + 14000;
  var iv = setInterval(function () {
    if (Date.now() > end) { clearInterval(iv); marcOn = false; return; }
    var b = document.createElement('button'); b.className = 'bubble'; b.setAttribute('aria-label', 'Burbuja');
    var s = 34 + Math.random() * 60; b.style.width = b.style.height = s + 'px';
    b.style.left = Math.random() * (window.innerWidth - s) + 'px'; b.style.top = window.innerHeight + 'px';
    b.style.setProperty('--dx', (Math.random() - .5) * 120 + 'px'); b.style.animationDuration = (6 + Math.random() * 5) + 's';
    b.onclick = function (e) { e.stopPropagation(); b.classList.add('popped'); plop(); popped++; if (popped === 15) { egg('pop'); toast('¡15 burbujas! ' + esc(babyName()) + ' estaría orgulloso'); } setTimeout(function () { b.remove(); }, 260); };
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
  message('<div class="trophy">' + icon('trophy') + '</div><h2 style="font-size:clamp(2rem,10vw,3.6rem)">' + esc(person(pid).name) + '</h2><p>Campeón: ' + esc(S.tournament.name) + '</p>', 3600);
  setTimeout(function () { v.remove(); }, 3700);
  egg('trophy');
}
function cheers(name) {
  var fx = fxLayer(false), P = [], t0 = performance.now(), D = 3200;
  for (var i = 0; i < 90; i++) P.push({ x: Math.random() * fx.W, y: fx.H + Math.random() * 200, r: 3 + Math.random() * 9, v: 2 + Math.random() * 4, w: Math.random() * 6 });
  (function f(t) {
    fx.ctx.clearRect(0, 0, fx.W, fx.H);
    P.forEach(function (p) { p.y -= p.v; p.x += Math.sin((t / 300) + p.w) * .8; fx.ctx.globalAlpha = Math.max(0, 1 - (t - t0) / D); fx.ctx.fillStyle = 'rgba(232,182,74,.75)'; fx.ctx.strokeStyle = 'rgba(255,255,255,.8)'; fx.ctx.beginPath(); fx.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fx.ctx.fill(); fx.ctx.stroke(); });
    if (t - t0 < D) requestAnimationFrame(f); else fx.done();
  })(t0);
  message('<h2 style="font-size:clamp(2.4rem,12vw,4rem)">¡Salud!</h2><p>' + esc(name) + ' ya está en el carro. Que no falte para brindar por ' + esc(bdayName()) + '.</p>', 2600);
  egg('salud');
}
function sunDance() {
  var v = document.createElement('div'); v.className = 'sun-overlay'; v.innerHTML = '<div class="sun-core">' + icon('sun') + '</div>'; document.body.appendChild(v);
  message('<h2 style="font-size:clamp(2rem,10vw,3.4rem)">Invocando al sol…</h2><p>Petición enviada al cielo de ' + esc(S.trip.town || 'la finca') + '. No garantizamos resultados.</p>', 3000);
  setTimeout(function () { v.remove(); }, 3200); egg('sol');
}
function wish1111() {
  confetti(3000);
  message('<div class="eleven" style="font-size:min(40vw,220px)">11:11</div><h2 style="font-size:clamp(1.6rem,7vw,2.6rem)">¡Pide un deseo!</h2><p>Hora oficial de ' + esc(bdayName()) + '.</p>', 3400);
  egg('deseo');
}
function habemusQuorum(n) {
  if (!egg('quorum')) { toast(n + ' personas conectadas a la vez. ¡Esto es un cónclave!'); return; }
  fumataRaw('HABEMUS<br>QUÓRUM', n + ' miembros del Cónclave conectados a la vez. La familia está reunida.');
}
function habemusPapam() {
  if (!egg('papa')) return;
  fumataRaw('HABEMUS<br>PAPAM', 'Bueno… en realidad lo que tenemos es una lista de la compra. Pero casi.');
}
var discoOn = false;
function discoMode() {
  if (discoOn) return; discoOn = true; egg('disco');
  document.documentElement.classList.add('disco');
  var fx = document.createElement('div'); fx.className = 'disco-fx'; fx.setAttribute('aria-hidden', 'true');
  fx.innerHTML = '<div class="beams"></div><div class="beams b2"></div><div class="ball"></div>';
  document.body.appendChild(fx);
  if (navigator.vibrate) try { navigator.vibrate([60, 60, 60, 60, 120]); } catch (e) {}
  toast('¡Que empiece la fiesta! Modo discoteca 9 segundos');
  setTimeout(function () { document.documentElement.classList.remove('disco'); fx.classList.add('out'); setTimeout(function () { fx.remove(); }, 500); discoOn = false; }, 9000);
}
function fumataRaw(title, text) {
  var fx = fxLayer(true), puffs = [], t0 = performance.now(), D = 5000;
  (function f(t) {
    if (t - t0 < D - 1200) for (var k = 0; k < 3; k++) puffs.push({ x: fx.W / 2 + (Math.random() - .5) * 40, y: fx.H + 20, r: 18 + Math.random() * 16, vx: (Math.random() - .5) * 1.4, vy: -2.2 - Math.random() * 1.8, a: .6 });
    fx.ctx.clearRect(0, 0, fx.W, fx.H);
    puffs.forEach(function (p) { p.x += p.vx + Math.sin((t + p.y) / 400) * .5; p.y += p.vy; p.r += .55; p.a *= .993; var g = fx.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(255,255,255,' + p.a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); fx.ctx.fillStyle = g; fx.ctx.beginPath(); fx.ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); fx.ctx.fill(); });
    puffs = puffs.filter(function (p) { return p.y + p.r > -40 && p.a > .02; });
    if (t - t0 < D) requestAnimationFrame(f); else fx.done();
  })(t0);
  setTimeout(function () { message('<h2>' + title + '</h2><p>' + text + '</p>', 3400); }, 800);
}
function extraOmnes() {
  var v = document.createElement('div'); v.className = 'egg-veil'; document.body.appendChild(v);
  message('<h2>EXTRA<br>OMNES</h2><p>Que salgan todos… a la nave. A la piscina no, que hace frío.</p>', 3400);
  setTimeout(function () { v.remove(); }, 3500);
  egg('omnes');
}
function abueloMode() {
  ui.prefs.size = ui.prefs.size === 'xl' ? 'm' : 'xl'; savePrefs(); applyPrefs(); render(true);
  toast(ui.prefs.size === 'xl' ? 'Letra de abuelo activada. Así sí.' : 'Letra normal. Gafas, ¿dónde estáis?');
  egg('abuelo');
}
var tapCount = {}, tapTimer = {};
function eggTap(k) {
  tapCount[k] = (tapCount[k] || 0) + 1; clearTimeout(tapTimer[k]);
  tapTimer[k] = setTimeout(function () { tapCount[k] = 0; }, 2200);
  var need = { bday: 5, baby: 3, grand: 3, logo: 7, sun: 5, disco: 3 }[k];
  if (tapCount[k] >= need) {
    tapCount[k] = 0;
    if (k === 'bday') bdayParty(); else if (k === 'baby') marcMode(); else if (k === 'logo') extraOmnes(); else if (k === 'sun') sunDance(); else if (k === 'disco') discoMode(); else abueloMode();
    return true;
  }
  return false;
}

/* ---------- Acciones ---------- */
var A = {
  tab: function (el) { ui.mealFilter = null; go(el.dataset.tab); },
  goSheet: function (el) { closeSheet(); go(el.dataset.tab); },
  logo: function () { if (!eggTap('logo')) { if (ui.tab !== 'inicio') go('inicio'); } },
  menu: function () { menuSheet(); },
  close: function () { closeSheet(); },
  day: function (el) { ui.day = el.dataset.day; render(true); },
  sub: function (el) { ui.sub = el.dataset.sub; if (ui.tab !== 'planes') ui.tab = 'planes'; render(true); },
  fam: function (el) { ui.fam = el.dataset.fam; saveUi(); render(true); },
  st: function (el) { ui.st = el.dataset.st; render(true); },
  superMode: function () { ui.superMode = !ui.superMode; saveUi(); render(true); if (ui.superMode) { ui.st = 'pendiente'; ui.fam = me().family; render(true); toast('Modo súper: tu lista, letra grande y solo lo pendiente'); } },
  clearMeal: function () { ui.mealFilter = null; render(true); },
  mealItems: function (el) { ui.mealFilter = el.dataset.id; ui.fam = 'all'; ui.st = 'todo'; go('compra', {}); },
  tick: function (el) {
    if (!guard('edit')) return;
    var i = S.ingredients.find(function (x) { return x.id === el.dataset.id; });
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
    S.dayConfirm[pid] = S.dayConfirm[pid] || {};
    if (next === 'pend') delete S.dayConfirm[pid][day]; else S.dayConfirm[pid][day] = next;
    /* la confirmación del día manda: se quitan las excepciones de sus comidas */
    S.meals.forEach(function (m) { if (m.day === day && S.attendance[m.id]) delete S.attendance[m.id][pid]; });
    save(); render(true);
    var b = document.querySelector('.conf[data-p="' + pid + '"][data-day="' + day + '"]'); if (b) { b.classList.add('pop'); }
    if (!pendingConfirmations()) setTimeout(function () { confetti(2400); toast('¡Asistencia cerrada! Planning y cantidades listos'); }, 250);
  },
  confFam: function (el) {
    if (!guard('edit')) return;
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
    if (k < 0) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
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
  delExp: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Toca otra vez'; return; }
    S.expenses = S.expenses.filter(function (x) { return x.id !== el.dataset.id; }); save(); closeSheet(); render(true); toast('Gasto borrado');
  },
  payHouse: function (el) { if (!guard('access')) return; var p = S.house.payments.find(function (x) { return x.id === el.dataset.id; }); p.paid = true; p.date = new Date().toISOString().slice(0, 10); save(); render(true); toast('Segundo pago marcado. Gracias, abuelos'); },
  wxRefresh: function () { refreshWeather(true); },
  setMe: function (el) { ui.me = el.dataset.id; saveUi(); closeSheet(); render(true); toast('Ahora eres ' + esc(me().name) + ' (' + ROLE[me().role] + ')'); },
  pref: function (el) {
    ui.prefs[el.dataset.k] = el.dataset.v; savePrefs(); applyPrefs();
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
    var p = person(el.dataset.id), em = val('x-email').trim().toLowerCase();
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Ese email no parece válido'); return; }
    p.email = em || null; save(); closeSheet(); render(true); toast('Acceso de ' + esc(p.name) + ' guardado');
  },
  newCode: function (el) {
    var pid = el.dataset.id, code = String(Math.floor(100000 + Math.random() * 900000));
    ACCESS.setCode(pid, code).then(function () { accessSheet(pid); toast('Código nuevo para ' + esc(person(pid).name)); }, function () { toast('No he podido guardar el código'); });
  },
  copyInvite: function (el) {
    var t = el.dataset.text;
    try { navigator.clipboard.writeText(t).then(function () { toast('Mensaje copiado. Pégalo en WhatsApp'); }, function () { selectText('invite-text'); toast('Selecciona y copia el mensaje'); }); } catch (e) { selectText('invite-text'); }
  }
};
function selectText(id) { var n = document.getElementById(id); if (!n) return; var r = document.createRange(); r.selectNodeContents(n); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
/* Códigos de acceso personales: en la demo se guardan en el navegador; en la nube, en una tabla que solo ve el admin */
var ACCESS = {
  getCode: function (pid) { S.codes = S.codes || {}; return Promise.resolve(S.codes[pid] || null); },
  setCode: function (pid, code) { S.codes = S.codes || {}; S.codes[pid] = code; save(); return Promise.resolve(); }
};
function siteUrl() { return (window.CLOUD && CLOUD.siteUrl) || location.href.split('#')[0]; }
function accessSheet(pid) {
  var p = person(pid);
  ACCESS.getCode(pid).then(function (code) {
    var msg = 'Hola ' + p.name + '! Ya tienes acceso a la web del ' + S.trip.name + ': ' + siteUrl() + (p.email ? ' · Entra con tu email (' + p.email + ') y te llegará un enlace' : '') + (code ? (p.email ? ', o' : ' · Pulsa') + ' "Tengo un código" y escribe ' + code : '') + '.';
    openSheet('<h2>Acceso de ' + esc(p.name) + '</h2><p class="small muted">Rol: <b>' + ROLE[p.role] + '</b> (se cambia en la lista). Puede entrar con su email, con un código de 6 cifras o con los dos.</p>' +
      '<div class="field"><span class="lbl">Foto</span><div class="row">' + av(pid, 'lg') + '<label class="btn" for="x-photo" style="cursor:pointer">' + icon('edit') + 'Cambiar foto</label><input id="x-photo" type="file" accept="image/*" hidden data-change="photo" data-id="' + pid + '">' + (p.avatar ? '<button class="btn ghost" data-act="rmPhoto" data-id="' + pid + '">Quitar</button>' : '') + '</div><span class="small muted">Se recorta en cuadrado y se reduce a 192 px. Ocupa unos 10 KB.</span></div>' +
      '<div class="field"><label for="x-email">Email</label><input id="x-email" type="email" inputmode="email" autocomplete="off" value="' + esc(p.email || '') + '" placeholder="nombre@correo.com"></div>' +
      '<div class="field"><span class="lbl">Código personal</span><div class="row"><b class="big" style="letter-spacing:.12em">' + (code ? esc(code) : '—') + '</b><span class="grow"></span><button class="btn" data-act="newCode" data-id="' + pid + '">' + icon('refresh') + (code ? 'Nuevo código' : 'Crear código') + '</button></div><span class="small muted">Ideal para quien no tenga email a mano o para los abuelos. Si creas uno nuevo, el anterior deja de valer.</span></div>' +
      '<div class="field"><span class="lbl">Mensaje para enviarle</span><p class="small card wood" id="invite-text" style="user-select:all">' + esc(msg) + '</p><button class="btn" data-act="copyInvite" data-text="' + esc(msg) + '">' + icon('copy') + 'Copiar mensaje</button></div>' +
      '<div class="sheet-actions"><button class="btn primary" data-act="saveAccess" data-id="' + pid + '">Guardar email</button><button class="btn" data-act="close">Cerrar</button></div>');
  });
}
function costSheet(id) {
  var i = S.ingredients.find(function (x) { return x.id === id; });
  openSheet('<h2>¿Cuánto costó?</h2><p class="muted">' + esc(i.name) + (i.est != null ? ' · estimado ≈ ' + L.money(i.est) : '') + '</p>' +
    '<div class="field"><label for="c-cost">Importe en euros</label><input id="c-cost" inputmode="decimal" style="font-size:1.6rem;font-weight:800" placeholder="0,00" value="' + (i.cost != null ? L.n(i.cost) : '') + '"></div>' +
    '<div class="sheet-actions"><button class="btn primary" data-act="saveCost" data-id="' + id + '">Guardar precio</button><button class="btn" data-act="close">Luego</button></div>');
}
var C = {
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
    if (eg && S && eggTap(eg.dataset.egg)) { e.preventDefault(); return; }
    var t = e.target.closest('[data-act]'); if (!t || t.disabled) return;
    var fn = A[t.dataset.act]; if (fn) { e.preventDefault(); fn(t, e); }
  });
  document.addEventListener('change', function (e) { var t = e.target.closest('[data-change]'); if (t && C[t.dataset.change]) C[t.dataset.change](t); });
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.dataset.input === 'search' && /habemus/i.test(t.value)) habemusPapam();
    if (t.dataset.input === 'search') { ui.q = t.value; var pos = t.selectionStart; render(true); var n = document.getElementById('q'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (x) {} } }
    if (t.dataset.input === 'glass') { ui.prefs.glass = t.value / 100; savePrefs(); applyPrefs(); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
}
/* Se llama cuando S ya está cargado (demo local o nube) */
function startApp() {
  S.dayConfirm = S.dayConfirm || {}; S.attendance = S.attendance || {}; S.expenses = S.expenses || [];
  if (!ui.me || !person(ui.me)) { var ad = S.people.find(function (p) { return p.role === 'admin'; }) || S.people[0]; ui.me = ad.id; }
  document.title = S.trip.name; CATS.marc = 'Menú ' + babyName();
  buildEggs(); applyPrefs(); render();
  refreshWeather(false);
  var h = new Date().getHours(); if (h < 5) setTimeout(function () { if (egg('buho')) toast('¿Todavía despiertos? El Cónclave recomienda dormir'); }, 1500);
  var today = new Date().toISOString().slice(0, 10);
  var bd = S.trip.eggs && S.trip.eggs.bdayDate;
  if (bd && today === bd && ui.bdaySeen !== today) { ui.bdaySeen = today; saveUi(); setTimeout(bdayParty, 900); }
  if (countdownParts().phase === 'during') egg('zero');
  setInterval(function () { var d = new Date(); if (d.getHours() % 12 === 11 && d.getMinutes() === 11 && ui.lastWish !== d.toDateString() + d.getHours()) { ui.lastWish = d.toDateString() + d.getHours(); wish1111(); } }, 20000);
}
function boot() {
  var u = loadUi();
  ui = { tab: u.tab || 'inicio', me: u.me || null, fam: u.fam || 'all', st: 'pendiente', superMode: !!u.superMode, day: null, sub: 'plan', costView: 'real', bdaySeen: u.bdaySeen, prefs: loadPrefs() };
  if (['personas', 'tiempo', 'asistencia'].indexOf(ui.tab) >= 0) ui.tab = 'inicio';
  $main = document.getElementById('main'); $nav = document.getElementById('nav'); $top = document.getElementById('top');
  applyPrefs(); bindEvents();
  if (typeof SEED !== 'undefined') { S = load(); startApp(); }
  else if (window.CLOUD) CLOUD.boot();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
