/* ===================== Vistas: Inicio, Comidas, Compra ===================== */

/* ---------- INICIO ---------- */
function nextEvents(limit) {
  var ev = [];
  S.activities.forEach(function (a) { ev.push({ day: a.day, time: a.start, title: a.title, kind: 'plan', star: a.star, where: a.where }); });
  S.meals.forEach(function (m) { ev.push({ day: m.day, time: mealTime(m), title: slotName(m.slot) + ': ' + m.title, kind: 'meal', star: m.star }); });
  ev.sort(function (a, b) { return (a.day + a.time).localeCompare(b.day + b.time); });
  var now = new Date();
  var fut = ev.filter(function (e) { return dt(e.day, e.time).getTime() + 45 * 60000 > now.getTime(); });
  return (fut.length ? fut : []).slice(0, limit);
}
function countdownParts() {
  var start = dt(S.days[0].k, S.trip.arrival || '15:00').getTime(), end = dt(S.days[S.days.length - 1].k, S.trip.departure || '11:00').getTime(), now = Date.now();
  if (now >= end) return { phase: 'after' };
  if (now >= start) return { phase: 'during' };
  var s = Math.floor((start - now) / 1000);
  return { phase: 'before', d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
}
VIEWS.inicio = function () {
  var c = countdownParts();
  var cov = L.coverage(S.ingredients);
  var lgR = L.ledger(S, false), lgE = L.ledger(S, true);
  var pend = S.house.payments.filter(function (p) { return !p.paid; });
  var att = S.people.filter(function (p) { return L.mealsAttended(S, p.id) > 0; });
  var maybe = S.people.filter(function (p) { return L.mealsAttended(S, p.id) === 0; });
  var ev = nextEvents(3);
  afterRender.push(startHero, startCountdown);

  var h = '<section class="hero glass" aria-label="Cuenta atrás"><canvas id="heroNet" aria-hidden="true"></canvas>' +
    '<div class="kicker">' + esc(S.trip.dateLabel || '') + '</div>' +
    '<h1>' + (function () { var w = S.trip.name.split(' '); var last = w.pop(); return esc(w.shift() || '') + '<br>' + esc(w.join(' ')) + ' <span>' + esc(last) + '</span>'; })() + '</h1>' +
    '<p class="place">' + icon('pin') + esc(S.trip.place) + (S.trip.town ? ' · ' + esc(S.trip.town) : '') + '</p>';
  if (c.phase === 'before') {
    h += '<div class="count" id="count" data-egg="disco"><div><b id="cd-d">' + c.d + '</b><span>días</span></div><div><b id="cd-h">' + c.h + '</b><span>horas</span></div><div><b id="cd-m">' + c.m + '</b><span>min</span></div><div><b id="cd-s">' + c.s + '</b><span>seg</span></div></div>' +
      '<p class="small muted" style="margin-top:10px">Para la llegada del ' + esc(S.days[0].long.toLowerCase()) + ' a las ' + esc(S.trip.arrival) + '</p>';
  } else if (c.phase === 'during') {
    h += '<p class="live">Habemus Cónclave. Estamos en la finca.</p>';
  } else {
    h += '<p class="live">' + esc(S.trip.name) + ' clausurado. Habemus recuerdos.</p>';
  }
  h += '</section>';

  /* Avisos */
  pend.forEach(function (p) {
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var days = Math.round((new Date(p.due + 'T00:00:00') - t0) / 86400000);
    h += '<section class="card alert"><div class="row"><span class="pill warn">Aviso</span><span class="small muted">Casa · lo pagan ' + esc(fam(S.house.payer).name) + '</span></div>' +
      '<h3>' + esc(p.label) + ' de la casa: ' + L.money(p.amount) + '</h3>' +
      '<p>Vence el <b>' + L.ddmm(p.due) + '</b>' + (days >= 0 ? ' · quedan ' + days + (days === 1 ? ' día' : ' días') : ' · <b>vencido</b>') + '. ' + esc(p.note || '') + '</p>' +
      (can('access') ? '<button class="btn" data-act="payHouse" data-id="' + p.id + '">' + icon('check') + 'Marcar como pagado</button>' : '') + '</section>';
  });

  /* Confirmación por día */
  h += confirmCard();
  h += presenceCard();

  /* Tiempo */
  h += '<section class="card"><div class="card-head"><h3 data-egg="sun">El tiempo en la finca</h3><button class="link" data-act="tab" data-tab="tiempo">Detalle ' + icon('arrow') + '</button></div><div class="wx">' +
    S.weather.days.map(function (d) {
      var dd = dayOf(d.k);
      return '<div class="wx-day">' + '<small>' + esc(dd ? dd.short : L.ddmm(d.k)) + '</small>' + wxIcon(d.code) + '<b>' + Math.round(d.tmax) + '°</b><small>' + Math.round(d.tmin) + '° · ' + d.prob + '%</small></div>';
    }).join('') + '</div><p class="small muted">' + weatherSummary() + '</p></section>';

  /* Lo próximo */
  h += '<section class="card"><div class="card-head"><h3>' + (c.phase === 'before' ? 'Así empieza' : 'Lo próximo') + '</h3><button class="link" data-act="tab" data-tab="planes">Planning ' + icon('arrow') + '</button></div><div class="stack">' +
    (ev.length ? ev.map(function (e) {
      return '<div class="row"><span class="pill ' + (e.star ? 'red' : '') + ' num">' + esc(dayOf(e.day).short) + ' · ' + e.time + '</span><span class="grow">' + esc(e.title) + '</span></div>';
    }).join('') : '<p class="muted">Se acabó lo que se daba. Hasta el Cónclave 2027.</p>') + '</div></section>';

  /* Compra + costes */
  h += '<div class="grid2">' +
    '<button class="card" data-act="tab" data-tab="compra" style="text-align:left;color:inherit;font:inherit">' +
      '<span class="eyebrow">Compra</span>' + ring(cov.pct) + '<span class="small muted">' + cov.done + ' de ' + cov.tot + ' cubiertos</span></button>' +
    '<button class="card" data-act="tab" data-tab="cuentas" style="text-align:left;color:inherit;font:inherit">' +
      '<span class="eyebrow">Cuentas</span><span class="big">' + L.money(lgR.total) + '</span><span class="small muted">gastado de momento<br>Previsión a repartir ≈ ' + L.money(lgE.total) + ' <span class="pill est">ESTIMADO</span></span></button>' +
    '</div>';

  /* Familia */
  h += '<section class="card"><div class="card-head"><h3>Quién viene</h3><button class="link" data-act="tab" data-tab="personas">Personas ' + icon('arrow') + '</button></div>' +
    '<div class="avs">' + att.map(function (p) { return av(p.id); }).join('') + '</div>' +
    '<p class="small"><b>' + att.length + ' en la lista</b>' + (maybe.length ? ' · ' + maybe.map(function (p) { return esc(p.name); }).join(' y ') + ' vendrán algún día suelto' : '') + '</p></section>';

  /* La casa */
  h += '<section class="card wood"><div class="card-head"><h3>La finca</h3><span class="pill olive">15 plazas</span></div>' +
    '<div class="stack small">' +
      '<div class="row">' + icon('clock') + '<span class="grow">Llegamos el ' + esc(S.days[0].short.toLowerCase()) + ' a las <b>' + esc(S.trip.arrival) + '</b> · salimos el ' + esc(S.days[S.days.length - 1].short.toLowerCase()) + ' a las <b>' + esc(S.trip.departure) + '</b>' + (S.trip.official ? '<span class="small muted" style="display:block">Horario de la finca: entrada desde las ' + esc(S.trip.official.arrival) + ', salida hasta las ' + esc(S.trip.official.departure) + '</span>' : '') + L.offHours(S).map(function (w) { return '<span class="pill warn" style="white-space:normal;margin-top:4px">' + esc(w) + '</span>'; }).join('') + '</span>' + (can('edit') ? '<button class="btn" data-act="hours" style="min-height:40px;padding:0 12px">' + icon('edit') + 'Cambiar</button>' : '') + '</div>' +
      '<div class="row">' + icon('pin') + '<span class="grow" style="user-select:all">' + esc(S.trip.address) + '</span></div>' +
      '<div class="row">' + icon('users') + '<span class="grow">Teléfono de la finca: <b style="user-select:all">' + esc(S.trip.phone) + '</b></span></div>' +
      '<div class="row">' + icon('house') + '<span class="grow">Incluye ropa de cama, toallas, limpieza final, piscina, La Barbacoa (con horno de leña), nave deportiva, WiFi y aparcamiento</span></div>' +
    '</div><div class="row wrap"><a class="btn" href="' + S.trip.maps + '" target="_blank" rel="noopener">' + icon('pin') + 'Cómo llegar</a><a class="btn ghost" href="' + S.trip.web + '" target="_blank" rel="noopener">Web de la finca</a></div></section>';

  h += '<button class="btn ghost block" data-act="secrets">' + icon('trophy') + 'Secretos del Cónclave · ' + foundCount() + '/' + EGGS.length + '</button>';
  return h;
};
function ring(pct) {
  var r = 30, C = 2 * Math.PI * r, off = C * (1 - pct / 100);
  return '<span class="row" style="gap:12px"><svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="8"/><circle cx="36" cy="36" r="' + r + '" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 36 36)" style="transition:stroke-dashoffset .6s"/></svg><span class="big">' + pct + '%</span></span>';
}
function weatherSummary() {
  var ds = S.weather.days;
  var tmax = Math.max.apply(null, ds.map(function (d) { return d.tmax; })), tmin = Math.min.apply(null, ds.map(function (d) { return d.tmin; }));
  var wet = ds.some(function (d) { return d.prob >= 50 || d.rain >= 2; });
  return 'Entre ' + Math.round(tmin) + ' y ' + Math.round(tmax) + ' °C. ' + (wet ? 'Hay riesgo de lluvia: planes B listos.' : 'Sin lluvia prevista de momento. Barbacoa sí, piscina no.') + ' Actualizado ' + L.ddmm(S.weather.fetched) + '.';
}

/* Red de nodos del hero: un nodo por persona del Cónclave */
var heroRAF = null;
function stopHero() { if (heroRAF) cancelAnimationFrame(heroRAF); heroRAF = null; }
function startHero() {
  var cv = document.getElementById('heroNet'); if (!cv) return;
  var ctx = cv.getContext('2d'); var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W, H;
  function size() { var r = cv.getBoundingClientRect(); W = r.width; H = r.height; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size();
  var accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#C4112F';
  var names = S ? S.people : Array.from({ length: 12 }, function (_, i) { return { kind: i % 4 ? 'adulto' : 'menor' }; });
  /* cada nodo es una persona del Cónclave: si hay foto, su cara */
  var withFaces = names.some(function (p) { return p.avatar; });
  var X0 = withFaces ? 0.56 : 0.45;
  var nodes = names.map(function (p, i) {
    var n = { x: W * (X0 + (1 - X0) * Math.random()), y: H * (withFaces ? 0.08 + 0.46 * Math.random() : Math.random()), vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22, r: p.kind === 'bebe' ? 2.4 : p.kind === 'menor' ? 3 : 3.6 };
    if (p.avatar) { n.img = new Image(); n.img.src = p.avatar; n.R = p.kind === 'bebe' ? 12 : p.kind === 'menor' ? 14 : 16; }
    return n;
  });
  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame() {
    ctx.clearRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (!still) { var sp = Math.sqrt(a.vx * a.vx + a.vy * a.vy); if (sp > .3) { a.vx *= .3 / sp; a.vy *= .3 / sp; } a.x += a.vx; a.y += a.vy; var m = a.R || 0; if (a.x < W * (withFaces ? X0 : .3) || a.x > W - m) a.vx *= -1; if (a.y < m || a.y > (withFaces ? H * 0.56 : H) - m) a.vy *= -1; }
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j], dx = a.x - b.x, dy = a.y - b.y, d = Math.sqrt(dx * dx + dy * dy);
        if (a.R && b.R && d > 0.1) { var gap = a.R + b.R + 6; if (d < gap) { var f = (gap - d) / d * 0.04; a.vx += dx * f; a.vy += dy * f; b.vx -= dx * f; b.vy -= dy * f; } }
        if (d < 150) { ctx.strokeStyle = accent; ctx.globalAlpha = (1 - d / 150) * .35; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
    }
    ctx.globalAlpha = .85; ctx.fillStyle = accent;
    nodes.forEach(function (n) {
      if (n.img && n.img.complete && n.img.naturalWidth) {
        ctx.save(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(n.x, n.y, n.R, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
        ctx.drawImage(n.img, n.x - n.R, n.y - n.R, n.R * 2, n.R * 2); ctx.restore();
        ctx.globalAlpha = .9; ctx.lineWidth = 2; ctx.strokeStyle = accent; ctx.beginPath(); ctx.arc(n.x, n.y, n.R + 1, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = .85;
      } else { ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill(); }
    });
    if (!still) heroRAF = requestAnimationFrame(frame);
  }
  frame();
}
var cdTimer = null;
function startCountdown() {
  clearInterval(cdTimer);
  if (!document.getElementById('count')) return;
  cdTimer = setInterval(function () {
    var c = countdownParts();
    if (c.phase !== 'before') { clearInterval(cdTimer); if (ui.tab === 'inicio') { render(); egg('zero'); confetti(); } return; }
    ['d', 'h', 'm', 's'].forEach(function (k) { var el = document.getElementById('cd-' + k); if (el && el.textContent != c[k]) el.textContent = c[k]; });
  }, 1000);
}

/* ---------- COMIDAS ---------- */
VIEWS.comidas = function () {
  if (!ui.day) ui.day = tripDayDefault();
  var d = dayOf(ui.day);
  var ms = S.meals.filter(function (m) { return m.day === ui.day; }).sort(function (a, b) { return mealTime(a).localeCompare(mealTime(b)); });
  var h = '<div class="view-head"><div><h2>Comidas</h2><p class="muted small">Del ' + esc(S.days[0].long.toLowerCase()) + ' al ' + esc(S.days[S.days.length - 1].long.toLowerCase()) + '. Toca los comensales para cambiar quién come</p></div></div>' + daySelector('day');
  var dc = L.dayCount(S, ui.day);
  h += '<div class="row wrap"><span class="pill ' + (d.star ? 'red' : 'olive') + '">' + (d.star ? icon('cake', 'ico') : '') + esc(d.tag) + '</span>' +
    '<button class="chip" data-act="tab" data-tab="asistencia">' + icon('users') + '<b class="num">' + dc.expected + '</b>&nbsp;previstos · ' + dc.si + ' ✓ · ' + dc.pend + ' ?</button></div>';
  ms.forEach(function (m) {
    var din = L.diners(S, m.id);
    var ings = S.ingredients.filter(function (i) { return i.meals.indexOf(m.id) >= 0; });
    var cov = L.coverage(ings);
    var marcIn = L.attends(S, 'marc', m.id);
    h += '<article class="card meal' + (m.star ? ' star' : '') + '">' +
      '<div class="slot"><span class="eyebrow">' + slotName(m.slot) + ' · ' + mealTime(m) + '</span>' + (m.mode === 'cada' ? '<span class="pill">Cada familia lo suyo</span>' : '<span class="pill olive">Cocina ' + esc(fam(m.cook) ? fam(m.cook).name : 'sin asignar') + '</span>') + '</div>' +
      '<h3>' + (m.star ? '<span class="accent">' + icon('cake') + '</span> ' : '') + esc(m.title) + '</h3>' +
      '<ul class="dishes">' + m.dishes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' +
      (marcIn ? '<div class="marc-line"><b data-egg="baby">Menú ' + esc(babyName()) + '</b><span>' + esc(m.marc || 'Lo mismo que los demás') + '</span></div>' : '') +
      (function () { var cf = L.mealConflict(S, m, mealTime(m)); return cf ? '<button class="card alert" data-act="hours" style="padding:10px 12px;text-align:left;font:inherit;color:inherit"><span class="small"><span class="pill warn">Fuera de horario</span> ' + esc(cf) + '. Cambiad la hora de la comida o vuestro horario de llegada y salida.</span></button>' : ''; })() +
      (m.notes ? '<p class="small muted">' + esc(m.notes) + '</p>' : '') +
      (function () { var k = ings.filter(function (i) { return i.status === 'pendiente' && L.suggestQty(S, i); }).length; return k ? '<button class="card alert" data-act="mealItems" data-id="' + m.id + '" style="padding:10px 12px;text-align:left;font:inherit;color:inherit"><span class="small">Cantidades de la hoja pensadas para 14 y ahora sois <b>' + din.length + '</b>: ' + k + (k === 1 ? ' ingrediente' : ' ingredientes') + ' con ajuste sugerido ' + icon('arrow') + '</span></button>' : ''; })() +
      '<div class="meal-foot"><button class="diners chip" data-act="attendance" data-id="' + m.id + '" aria-label="Cambiar asistencia">' + icon('users') + din.length + ' comensales</button>' +
      (ings.length ? '<button class="chip" data-act="mealItems" data-id="' + m.id + '">' + icon('basket') + cov.done + '/' + cov.tot + ' ingredientes</button>' : '') +
      '<span class="grow"></span>' + (can('edit') ? '<button class="icon-btn" data-act="editMeal" data-id="' + m.id + '" aria-label="Editar comida">' + icon('edit') + '</button>' : '') + '</div>' +
      '</article>';
  });
  if (ui.day === S.days[S.days.length - 1].k) h += '<section class="card wood"><h3>Horario de salida</h3><p class="small">Salís a las <b>' + esc(S.trip.departure) + '</b>. Si alguna comida queda fuera, la app lo avisa: cambiad su hora o vuestro horario.</p>' + (can('edit') ? '<button class="btn" data-act="hours">' + icon('clock') + 'Cambiar horarios</button>' : '') + '</section>';
  return h;
};

/* ---------- COMPRA ---------- */
VIEWS.compra = function () {
  var f = ui.fam || 'all', st = ui.st || 'pendiente', q = (ui.q || '').toLowerCase();
  var all = S.ingredients;
  var list = all.filter(function (i) {
    if (f !== 'all' && i.family !== f) return false;
    if (ui.mealFilter && i.meals.indexOf(ui.mealFilter) < 0) return false;
    if (st === 'pendiente' && i.status !== 'pendiente') return false;
    if (st === 'hecho' && i.status === 'pendiente') return false;
    if (q && i.name.toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
  var scope = all.filter(function (i) { return (f === 'all' || i.family === f) && (!ui.mealFilter || i.meals.indexOf(ui.mealFilter) >= 0); });
  var cov = L.coverage(scope);
  var est = scope.reduce(function (a, i) { return a + (i.status === 'casa' ? 0 : (i.est || 0)); }, 0);
  var real = scope.reduce(function (a, i) { return a + (i.status === 'comprado' && i.cost ? i.cost : 0); }, 0);
  var myF = me().family;

  var h = '<div class="view-head"><div><h2>Lista de la compra</h2><p class="muted small">Marca lo que compras desde el súper</p></div>' +
    '<button class="chip" data-act="superMode" aria-pressed="' + !!ui.superMode + '">' + icon('cart') + 'Modo súper</button></div>';
  h += '<section class="card"><div class="row"><span class="big">' + cov.pct + '%</span><span class="grow small muted">' + cov.done + ' de ' + cov.tot + ' cubiertos' + (f !== 'all' ? ' en ' + esc(fam(f).name) : '') + '</span></div>' +
    '<div class="progress" role="progressbar" aria-valuenow="' + cov.pct + '" aria-valuemin="0" aria-valuemax="100"><i id="covbar" style="width:' + cov.pct + '%"></i></div>' +
    '<div class="row small"><span class="grow">Gastado: <b class="num">' + L.money(real) + '</b></span><span>Previsión de la lista ≈ <b class="num">' + L.money(est) + '</b> <span class="pill est">ESTIMADO</span></span></div></section>';

  var nSug = S.ingredients.filter(function (i) { return i.status === 'pendiente' && L.suggestQty(S, i); }).length;
  if (nSug) h += '<section class="card alert" style="gap:8px"><p class="small"><b>' + nSug + ' cantidades</b> vienen de la hoja (pensadas para 14) y no cuadran con los comensales previstos según la asistencia.</p><div class="row wrap">' + (can('edit') ? '<button class="btn" data-act="applyAllQty">Ajustar todas</button>' : '') + '<button class="btn ghost" data-act="tab" data-tab="asistencia">Ver asistencia</button></div></section>';
  h += '<div class="chips" role="group" aria-label="Familia">' +
    '<button class="chip" data-act="fam" data-fam="' + myF + '" aria-pressed="' + (f === myF) + '">' + icon('heart') + 'Mi lista</button>' +
    '<button class="chip" data-act="fam" data-fam="all" aria-pressed="' + (f === 'all') + '">Todas</button>' +
    S.families.map(function (x) { return x.id === myF ? '' : '<button class="chip" data-act="fam" data-fam="' + x.id + '" aria-pressed="' + (f === x.id) + '"><i class="fam-dot ' + x.color + '"></i>' + esc(x.name) + '</button>'; }).join('') + '</div>';
  h += '<div class="seg" role="group" aria-label="Estado"><button data-act="st" data-st="pendiente" aria-pressed="' + (st === 'pendiente') + '">Pendiente</button><button data-act="st" data-st="hecho" aria-pressed="' + (st === 'hecho') + '">Hecho</button><button data-act="st" data-st="todo" aria-pressed="' + (st === 'todo') + '">Todo</button></div>';
  h += '<input class="search" id="q" type="search" placeholder="Buscar ingrediente…" value="' + esc(ui.q || '') + '" data-input="search" aria-label="Buscar ingrediente">';
  if (ui.mealFilter) h += '<div class="row"><span class="chip" aria-pressed="true">Solo: ' + esc(meal(ui.mealFilter).title) + '</span><button class="link" data-act="clearMeal">Quitar filtro ' + icon('x') + '</button></div>';

  if (!list.length) {
    h += '<div class="empty">' + icon('basket') + (st === 'pendiente' && cov.tot ? '<b>Nada pendiente por aquí</b><span>Esta familia es una máquina. Mira en "Hecho" o echa una mano a otra.</span>' : '<b>La lista está vacía</b><span>Añade el primer ingrediente con el botón +</span>') + '</div>';
  } else {
    var groups = {};
    list.forEach(function (i) { (groups[i.cat] = groups[i.cat] || []).push(i); });
    Object.keys(CATS).forEach(function (c) {
      if (!groups[c]) return;
      var gAll = scope.filter(function (i) { return i.cat === c; }), gc = L.coverage(gAll);
      h += '<div class="cat-head"><span class="eyebrow">' + CATS[c] + '</span><span class="small muted num">' + gc.done + '/' + gc.tot + '</span></div>';
      h += '<div class="items' + (ui.superMode ? ' super' : '') + '">' + groups[c].map(itemRow).join('') + '</div>';
    });
  }
  if (can('edit')) h += '<button class="fab" data-act="newItem" aria-label="Añadir ingrediente">' + icon('plus') + '</button>';
  return h;
};
function itemRow(i) {
  var f = fam(i.family);
  var cls = i.status === 'comprado' ? ' done' : i.status === 'casa' ? ' casa' : '';
  var chk = i.status === 'comprado' ? ' on' : i.status === 'casa' ? ' home' : '';
  var mealNames = i.meals.map(function (id) { var m = meal(id); return m ? dayOf(m.day).short + ' ' + slotName(m.slot).toLowerCase() : ''; }).filter(Boolean);
  var price = i.status === 'casa' ? '<span class="muted">0 €</span><small>DE CASA</small>' : i.cost != null ? L.money(i.cost) : (i.est != null ? '<span class="muted">≈ ' + L.money(i.est) + '</span><small>ESTIMADO</small>' : '');
  return '<div class="item' + cls + '" id="it-' + i.id + '">' +
    '<button class="check' + chk + '" data-act="tick" data-id="' + i.id + '" aria-label="' + (i.status === 'pendiente' ? 'Marcar comprado: ' : 'Marcar pendiente: ') + esc(i.name) + '"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button>' +
    '<button class="body" data-act="editItem" data-id="' + i.id + '"><span class="name">' + esc(i.name) + '</span><span class="meta"><span class="num">' + L.n(i.qty) + ' ' + esc(i.unit) + '</span>' + (i.qtyEst ? '<span class="pill est">cant. estimada</span>' : '') +
      (f ? '<span class="row" style="gap:4px;display:inline-flex"><i class="fam-dot ' + f.color + '"></i>' + esc(f.short) + '</span>' : '') +
      (mealNames.length ? '<span>· ' + esc(mealNames.slice(0, 2).join(', ')) + (mealNames.length > 2 ? ' +' + (mealNames.length - 2) : '') + '</span>' : '') +
      (i.split === 'propio' ? '<span class="pill olive">propio</span>' : '') + (i.sug ? '<span class="pill">sugerido</span>' : '') +
      (function () { var sg = i.status === 'pendiente' && L.suggestQty(S, i); return sg ? '<span class="pill warn">Para ' + sg.n + ': ' + L.n(sg.qty) + ' ' + esc(i.unit) + '</span>' : ''; })() + '</span></button>' +
    '<div class="price">' + price + '</div></div>';
}
