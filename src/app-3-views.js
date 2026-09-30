/* ===================== Vistas: Planes, Torneo, Cuentas, Tiempo, Personas ===================== */

VIEWS.planes = function () {
  if (!ui.day) ui.day = tripDayDefault();
  var sub = ui.sub || 'plan';
  var h = '<div class="view-head"><div><h2>Planes</h2><p class="muted small">Sencillos y sin gastos extra</p></div></div>' +
    '<div class="seg" role="group" aria-label="Sección"><button data-act="sub" data-sub="plan" aria-pressed="' + (sub === 'plan') + '">Planning</button><button data-act="sub" data-sub="coste" aria-pressed="' + (sub === 'coste') + '">Con coste</button></div>';
  if (sub === 'torneo') { ui.sub = 'plan'; sub = 'plan'; }
  if (sub === 'coste') return h + costeView();

  h += daySelector('day');
  var w = S.weather.days.find(function (x) { return x.k === ui.day; });
  if (w) {
    var a = L.advice(w);
    h += '<div class="card wood" style="padding:12px 14px"><div class="row">' + wxIcon(w.code) + '<span class="grow small"><b>' + L.wmo(w.code)[0] + ', ' + Math.round(w.tmin) + '–' + Math.round(w.tmax) + ' °C.</b> ' + esc(a.planB.t) + '.</span></div></div>';
  }
  var acts = S.activities.filter(function (x) { return x.day === ui.day; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
  if (!acts.length) h += '<div class="empty">' + icon('plans') + '<b>Día libre</b><span>Nada planeado. Siesta oficial del Cónclave.</span></div>';
  h += '<div class="tl">' + acts.map(actCard).join('') + '</div>';
  if (can('edit')) h += '<button class="fab" data-act="newAct" aria-label="Añadir actividad">' + icon('plus') + '</button>';
  return h;
};
function marcLabel(v) { var b = babyName(); return v === 'si' ? 'Apta para ' + b : v === 'adulto' ? b + ' con un adulto' : 'No es para ' + b; }
function actCard(a) {
  var votes = (S.votes && S.votes[a.id]) || [];
  var mine = votes.indexOf(me().id) >= 0;
  return '<div class="tl-item' + (a.star ? ' star' : '') + '"><span class="tl-time">' + a.start + '</span>' +
    '<article class="card' + (a.star ? ' star' : '') + '" style="gap:10px">' +
      '<div class="row"><h3 class="grow">' + esc(a.title) + '</h3>' + (can('edit') ? '<button class="icon-btn" data-act="editAct" data-id="' + a.id + '" aria-label="Editar actividad">' + icon('edit') + '</button>' : '') + '</div>' +
      (a.where ? '<p class="small muted row" style="gap:6px">' + icon('pin') + esc(a.where) + '</p>' : '') +
      (a.desc ? '<p class="small">' + esc(a.desc) + '</p>' : '') +
      '<div class="facts"><span class="fact">' + icon('clock') + a.dur + ' min</span>' +
        '<span class="fact">' + icon('car') + esc(a.travel || 'En la finca') + '</span>' +
        '<span class="fact">' + icon('users') + esc(a.age) + '</span>' +
        '<span class="fact"' + (a.marc === 'no' ? ' style="opacity:.7"' : '') + '>' + icon('baby') + '<span data-egg="baby">' + marcLabel(a.marc) + '</span></span>' +
        '<span class="fact" style="color:var(--ok)">0 €</span></div>' +
      (a.planB ? '<p class="planb">' + icon('umbrella') + '<span><b>Plan B:</b> ' + esc(a.planB) + '</span></p>' : '') +
      '<div class="row"><span class="small muted grow">Responsable: <b style="color:var(--ink)">' + (a.owner && person(a.owner) ? pname(a.owner) : esc(ownerLabel(a.owner))) + '</b></span>' +
        (function () { var gm = (S.games || []).find(function (g) { return g.act === a.id; }) || (a.tournament ? (S.games || []).find(function (g) { return g.format === 'bracket'; }) : null); return gm ? '<button class="link" data-act="gOpen" data-id="' + gm.id + '">Marcador ' + icon('arrow') + '</button>' : ''; })() +
        '<button class="vote" data-act="vote" data-id="' + a.id + '" aria-pressed="' + mine + '" aria-label="Me apunto">' + icon('heart') + '<span class="num">' + votes.length + '</span></button></div>' +
    '</article></div>';
}

function torneoView() {
  var T = S.tournament;
  var champ = L.advance(T);
  var names = ['Cuartos', 'Semifinal', 'Final'];
  var h = '<section class="card"><div class="card-head"><h3>' + esc(T.name) + '</h3><span class="pill olive">Nave deportiva</span></div>' +
    '<p class="small muted">Sábado 17:00 cuartos y semis · domingo 19:30 la final. Toca un nombre para darle la victoria y apunta el marcador.</p>' +
    '<div class="bracket-wrap"><div class="bracket">' + T.rounds.map(function (r, ri) {
      return '<div class="round"><h4>' + names[ri] + '</h4>' + r.map(function (m, mi) {
        return '<div class="match">' + ['a', 'b'].map(function (side) {
          var pid = m[side];
          var win = m.w === side;
          return '<div class="slotp' + (win ? ' win' : '') + (pid ? '' : ' tbd') + '">' +
            (pid ? av(pid, 'sm') : '') +
            '<button class="nm" style="background:none;border:0;text-align:left;font:inherit;color:inherit;padding:0;min-height:34px" data-act="win" data-r="' + ri + '" data-m="' + mi + '" data-side="' + side + '"' + (pid ? '' : ' disabled') + '>' + (pid ? esc(person(pid).name) : 'Por decidir') + '</button>' +
            '<input inputmode="numeric" aria-label="Puntos" data-change="score" data-r="' + ri + '" data-m="' + mi + '" data-side="' + side + '" value="' + (m['s' + side] != null ? m['s' + side] : '') + '"' + (pid && can('edit') ? '' : ' disabled') + '>' +
          '</div>';
        }).join('') + '</div>';
      }).join('') + '</div>';
    }).join('') + '</div></div>';
  if (champ) h += '<div class="champ card" style="box-shadow:none">' + icon('trophy') + '<div class="grow"><span class="eyebrow">Campeón del Cónclave</span><h3>' + pname(champ) + '</h3></div><button class="btn" data-act="trophy">Ver trofeo</button></div>';
  if (can('edit')) h += '<div class="row wrap"><button class="btn" data-act="editPlayers">' + icon('users') + 'Cambiar jugadores</button><button class="btn ghost" data-act="resetBracket">Reiniciar cuadro</button></div>';
  h += '</section>';
  h += '<section class="card wood"><h3>Reglas de la casa</h3><ul class="small" style="margin:0;padding-left:18px"><li>Partidos a 11 puntos, cambio de saque cada 2.</li><li>La final, al mejor de 3.</li><li>Los abuelos son árbitros inapelables.</li><li>El campeón elige la película de la noche de cine del próximo Cónclave.</li></ul></section>';
  return h;
}

function costeView() {
  return '<section class="card wood"><h3>Fuera del plan</h3><p class="small">Pediste planes sin gastos extra, así que estas opciones no están en el planning. Quedan aquí solo por si alguien quiere ir por su cuenta o hay un día de lluvia.</p></section>' +
    S.paidOptions.map(function (o) {
      return '<article class="card" style="gap:8px"><div class="row"><h3 class="grow">' + esc(o.name) + '</h3><span class="pill ' + (/CERRADO/.test(o.hours) ? 'red' : 'warn') + '">' + (/CERRADO/.test(o.hours) ? 'Cerrado' : 'Con coste') + '</span></div>' +
        '<div class="facts"><span class="fact">' + icon('car') + esc(o.travel) + '</span><span class="fact">' + icon('baby') + esc(babyName()) + ': ' + esc(o.marc) + '</span></div>' +
        '<p class="small"><b>Precio:</b> ' + esc(o.price) + '</p><p class="small muted">' + esc(o.hours) + '</p></article>';
    }).join('') + '<p class="small muted">Distancias y tiempos en coche calculados desde la finca (OSRM). Precios y horarios de las webs oficiales; confirmar antes de ir.</p>';
}

/* ---------- CUENTAS ---------- */
VIEWS.cuentas = function () {
  var useEst = ui.costView === 'est';
  var lg = L.ledger(S, useEst);
  var mode = S.split.mode;
  var tx = L.tax(S);
  var house = S.house;
  var paidH = house.payments.filter(function (p) { return p.paid; }).reduce(function (a, p) { return a + p.amount; }, 0);
  var h = '<div class="view-head"><div><h2>Cuentas</h2><p class="muted small">Quién ha puesto qué y quién paga a quién</p></div></div>';

  /* La casa */
  h += '<section class="card wood"><div class="card-head"><span class="eyebrow">La casa · fuera del reparto</span><span class="pill olive">Invitan ' + esc(fam(house.payer).name) + '</span></div>' +
    '<div class="row"><span class="big">' + L.money(house.total) + '</span><span class="grow small muted">' + S.tax.nights + ' noches · pagado ' + L.money(paidH) + '</span></div>' +
    house.payments.map(function (p) {
      return '<div class="pay"><span class="when">' + L.ddmm(p.paid ? (p.date || p.due) : p.due) + '</span><span class="grow">' + esc(p.label) + ' · <b class="num">' + L.money(p.amount) + '</b></span>' + (p.paid ? '<span class="pill ok">Pagado</span>' : '<span class="pill warn">Vence ' + L.ddmm(p.due) + '</span>') + '</div>';
    }).join('') +
    '<details><summary>Política de cancelación</summary><ul class="small">' + house.cancel.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></details></section>';

  /* Tasa turística */
  var exNames = tx.rows.filter(function (r) { return !r.pays; }).map(function (r) { return pname(r.id); });
  h += '<section class="card"><div class="card-head"><h3>Tasa turística</h3>' + (S.tax.payer ? '<span class="pill olive">Invitan ' + esc(fam(S.tax.payer).name) + '</span>' : '<span class="pill pend">Quién paga: PENDIENTE</span>') + '</div>' +
    '<div class="row"><span class="big">' + L.money(tx.withExemption) + '</span><span class="grow small muted">' + tx.stays + ' noches-persona × ' + L.money(S.tax.perNight) + ' · ' + tx.adults + ' pagan</span></div>' +
    '<div class="tax-list">' + tx.rows.filter(function (r) { return r.pays; }).map(function (r) { return '<span class="online-chip">' + av(r.id, 'xs') + pname(r.id) + ' <small class="muted">' + r.nights + (r.nights === 1 ? ' noche' : ' noches') + '</small></span>'; }).join('') + '</div>' +
    (exNames.length ? '<p class="small"><b>Exentos por edad (16 o menos):</b> ' + exNames.join(', ') + '</p>' : '') +
    '<p class="small muted">' + esc(S.tax.note) + '. Se recalcula sola con la asistencia por día. No entra en el reparto.</p></section>';

  /* Reparto */
  h += '<section class="card"><div class="card-head"><h3>Reparto entre familias</h3></div>' +
    '<div class="seg" role="group" aria-label="Datos"><button data-act="costView" data-v="real" aria-pressed="' + !useEst + '">Real</button><button data-act="costView" data-v="est" aria-pressed="' + useEst + '">Previsión estimada</button></div>' +
    '<div class="field"><span class="lbl">Criterio' + (mode === 'ponderado' ? ' (por defecto)' : '') + '</span><div class="seg" role="group" aria-label="Criterio de reparto"><button data-act="mode" data-v="ponderado" aria-pressed="' + (mode === 'ponderado') + '">Ponderado</button><button data-act="mode" data-v="persona" aria-pressed="' + (mode === 'persona') + '">Por persona</button><button data-act="mode" data-v="familia" aria-pressed="' + (mode === 'familia') + '">Por familia</button></div></div>' +
    '<p class="small muted">' + modeText(mode) + '</p>';
  if (mode === 'ponderado') {
    h += '<div class="grid2" style="grid-template-columns:repeat(3,1fr)">' + ['adulto', 'menor', 'bebe'].map(function (k) {
      return '<div class="field"><label for="w-' + k + '">' + KIND[k] + (k === 'bebe' ? ' (' + esc(babyName()) + ')' : '') + '</label><input id="w-' + k + '" inputmode="decimal" value="' + L.n(S.split.w[k]) + '" data-change="weight" data-k="' + k + '"' + (can('edit') ? '' : ' disabled') + '></div>';
    }).join('') + '</div>';
  }
  if (useEst) h += '<p class="small"><span class="pill est">ESTIMADO</span> Simulación: cada familia compra lo que tiene asignado a precio estimado.</p>';
  h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Familia</th><th>Ha puesto</th><th>Le toca</th><th>Saldo</th></tr></thead><tbody>' +
    lg.rows.map(function (r) {
      var f = fam(r.id);
      return '<tr><td><span class="row" style="gap:6px"><i class="fam-dot ' + f.color + '"></i>' + esc(f.name) + '</span><span class="small muted">' + Math.round(r.share * 100) + ' %</span>' + (r.gift ? '<span class="small" style="display:block;color:var(--olive)">incluye aportación de ' + L.money(r.gift) + '</span>' : '') + '</td><td>' + L.money(r.paid) + '</td><td>' + L.money(r.owe) + '</td><td class="' + (r.bal > 0.004 ? 'pos' : r.bal < -0.004 ? 'neg' : '') + '">' + (r.bal > 0 ? '+' : '') + L.money(r.bal) + '</td></tr>';
    }).join('') + '<tr><td><b>Total</b></td><td><b>' + L.money(lg.total) + '</b></td><td></td><td></td></tr></tbody></table></div>' +
    (lg.gifts ? '<p class="small"><span class="pill olive">Aportaciones</span> ' + L.money(lg.gifts) + ' puestos de regalo: se reparten ' + L.money(lg.toShare) + ' en vez de ' + L.money(lg.total) + '.</p>' : '');

  if (lg.total === 0) {
    h += '<div class="empty" style="padding:12px">' + icon('coins') + '<b>Todavía no hay gastos</b><span>Cuando marquéis ingredientes como comprados con su precio o añadáis gastos, aparecerá aquí quién paga a quién. Mientras, mira la previsión estimada.</span></div>';
  } else if (!lg.tx.length) {
    h += '<span class="stamp">Cuentas claras, familia unida</span>';
  } else {
    h += '<span class="eyebrow">Liquidación · ' + lg.tx.length + (lg.tx.length === 1 ? ' transferencia' : ' transferencias') + '</span>' + lg.tx.map(function (t) {
      return '<div class="tx"><span class="row" style="gap:6px"><i class="fam-dot ' + fam(t.from).color + '"></i><b>' + esc(fam(t.from).name) + '</b></span><span class="arrow">' + icon('arrow') + '</span><span class="row" style="gap:6px"><i class="fam-dot ' + fam(t.to).color + '"></i><b>' + esc(fam(t.to).name) + '</b></span><span class="amt">' + L.money(t.amount) + '</span></div>';
    }).join('');
  }
  h += '</section>';

  /* Gastos extra */
  var ingPaid = S.ingredients.filter(function (i) { return i.status === 'comprado' && i.cost; });
  h += '<section class="card"><div class="card-head"><h3>Gastos</h3>' + (can('edit') ? '<button class="btn primary" data-act="newExp">' + icon('plus') + 'Añadir</button>' : '') + '</div>' +
    '<div class="row small"><span class="grow">Ingredientes comprados con precio (' + ingPaid.length + ')</span><b class="num">' + L.money(ingPaid.reduce(function (a, i) { return a + i.cost; }, 0)) + '</b></div><div class="divider"></div>' +
    (S.expenses.length ? S.expenses.map(function (e) {
      return '<button class="row" data-act="editExp" data-id="' + e.id + '" style="background:none;border:0;text-align:left;font:inherit;color:inherit;padding:6px 0;min-height:44px"><i class="fam-dot ' + fam(e.payer).color + '"></i><span class="grow"><b>' + esc(e.concept) + '</b><span class="small muted"> · ' + esc(fam(e.payer).name) + (e.kind === 'aportacion' ? ' · aportación de regalo' : e.split === 'propio' ? ' · propio' : '') + '</span></span><b class="num">' + L.money(e.amount) + '</b></button>';
    }).join('') : '<p class="small muted">Carbón, gasolina, tarta, decoración, regalos… Todo lo que no sea un ingrediente va aquí, con quién lo pagó. Si alguien quiere poner algo extra de regalo para el bote, apúntalo como aportación.</p>') +
    '</section>';
  return h;
};
function modeText(m) {
  if (m === 'familia') return 'Cada familia que asiste paga lo mismo, venga quien venga.';
  if (m === 'persona') return 'Cada persona cuenta 1 por cada comida a la que asiste, sea de la edad que sea.';
  return 'Cada persona cuenta según su edad (adulto ' + L.n(S.split.w.adulto) + ' · menor ' + L.n(S.split.w.menor) + ' · ' + esc(babyName()) + ' ' + L.n(S.split.w.bebe) + ') multiplicado por las comidas a las que asiste de verdad.';
}

/* ---------- TIEMPO ---------- */
VIEWS.tiempo = function () {
  var h = '<div class="view-head"><div><h2>El tiempo</h2><p class="muted small">' + esc(S.trip.place) + ' · ' + L.n(S.trip.lat) + ' N ' + L.n(S.trip.lon) + ' E</p></div><button class="icon-btn" data-act="wxRefresh" aria-label="Actualizar previsión">' + icon('refresh') + '</button></div>';
  h += '<section class="card"><div class="wx">' + S.weather.days.map(function (d) {
    return '<div class="wx-day"><small>' + esc(dayOf(d.k).short) + '</small>' + wxIcon(d.code) + '<b>' + Math.round(d.tmax) + '°</b><small>mín ' + Math.round(d.tmin) + '°</small><small>lluvia ' + d.prob + '%</small></div>';
  }).join('') + '</div><p class="small muted">' + esc(S.weather.source) + ' · actualizado ' + L.ddmm(S.weather.fetched) + '. A más de 7 días la previsión es orientativa: mírala otra vez el miércoles 7.</p></section>';
  S.weather.days.forEach(function (d) {
    var a = L.advice(d), dd = dayOf(d.k);
    h += '<section class="card" style="gap:10px"><div class="card-head"><h3>' + esc(dd.long) + '</h3><span class="pill">' + L.wmo(d.code)[0] + '</span></div>' +
      '<div class="adv"><span class="mark ' + (a.pool.ok ? 'y' : 'n') + '">' + (a.pool.ok ? '✓' : '✕') + '</span><span>' + esc(a.pool.t) + '</span></div>' +
      '<div class="adv"><span class="mark ' + (a.bbq.ok ? 'y' : 'n') + '">' + (a.bbq.ok ? '✓' : '✕') + '</span><span>' + esc(a.bbq.t) + (dd.star ? ' · es el día de la barbacoa del cumple' : '') + '</span></div>' +
      '<div class="adv"><span class="mark i">i</span><span>' + esc(a.clothes) + '</span></div>' +
      '<div class="adv"><span class="mark ' + (a.planB.on ? 'n' : 'i') + '">' + (a.planB.on ? '!' : '·') + '</span><span>' + esc(a.planB.t) + '</span></div></section>';
  });
  var c = S.weather.climate;
  h += '<section class="card wood"><h3>Lo normal estos días</h3><p class="small">' + esc(S.days[0].long) + ' a ' + esc(S.days[S.days.length - 1].long.toLowerCase()) + ' (' + c.years + ') en la zona: máximas de ' + L.n(c.tmax) + ' °C y mínimas de ' + L.n(c.tmin) + ' °C de media. Llovió al menos 1 mm en el ' + c.rainyShare + ' % de esos días, así que los planes B se quedan preparados.</p><p class="small muted">Fuente: archivo histórico de Open-Meteo.</p></section>';
  return h;
};

/* ---------- PERSONAS ---------- */
VIEWS.personas = function () {
  var adm = can('access');
  var h = '<div class="view-head"><div><h2>Personas y accesos</h2><p class="muted small">' + S.people.length + ' en la lista · ' + S.families.length + ' familias · ' + S.homes.reduce(function (a, x) { return a + x.beds; }, 0) + ' camas</p></div></div>';
  h += window.CLOUD ? '' : '<section class="card wood small"><p><b>Demo:</b> arriba a la derecha eliges quién eres para probar cómo se ve con cada rol. En la versión online cada uno entra con su email o con un código, y los permisos los aplica la base de datos.</p></section>';
  S.families.forEach(function (f) {
    var ps = S.people.filter(function (p) { return p.family === f.id; });
    h += '<section class="card"><div class="card-head"><h3 class="row" style="gap:8px"><i class="fam-dot ' + f.color + '"></i>' + esc(f.name) + '</h3>' + (f.note ? '<span class="pill">' + esc(f.note) + '</span>' : '') + '</div><div>' +
      ps.map(function (p) {
        var ma = L.mealsAttended(S, p.id);
        return '<div class="person">' + av(p.id, 'lg') + '<div class="grow"><b>' + pname(p.id) + '</b>' + (p.pend ? ' <span class="pill pend">por confirmar</span>' : '') +
          '<div class="small muted">' + (p.age != null ? (p.approx ? '≈' : '') + p.age + ' años · ' : '') + KIND[p.kind] + ' · ' + ma + '/' + S.meals.length + ' comidas</div>' +
          (p.note ? '<div class="small muted">' + esc(p.note) + '</div>' : '') +
          (adm ? '<button class="link small" data-act="access" data-id="' + p.id + '" style="min-height:34px;padding:2px 0">' + (p.email ? esc(p.email) : 'Sin email · dar acceso') + '</button>' : '') + '</div>' +
          (adm ? '<select aria-label="Rol de ' + esc(p.name) + '" data-change="role" data-id="' + p.id + '">' + Object.keys(ROLE).map(function (r) { return '<option value="' + r + '"' + (p.role === r ? ' selected' : '') + '>' + ROLE[r] + '</option>'; }).join('') + '</select>' : '<span class="pill role-pill ' + p.role + '">' + ROLE[p.role] + '</span>') +
          '</div>';
      }).join('') + '</div>' +
      (can('edit') ? '<button class="btn ghost" data-act="famAttend" data-fam="' + f.id + '">' + icon('users') + 'Asistencia de la familia</button>' : '') + '</section>';
  });
  S.pendingPeople.forEach(function (p) {
    h += '<section class="card" style="border-style:dashed"><div class="person"><span class="av lg" style="background:var(--surface-2);color:var(--muted)">?</span><div class="grow"><b>' + esc(p.name) + '</b> <span class="pill pend">PENDIENTE</span><div class="small muted">' + esc(p.note) + '</div></div></div></section>';
  });
  h += '<section class="card"><h3>Qué puede hacer cada rol</h3><div class="stack small">' +
    '<div class="row"><span class="pill role-pill admin">Admin</span><span class="grow">Todo, incluidos los accesos y los roles.</span></div>' +
    '<div class="row"><span class="pill role-pill editor">Editor</span><span class="grow">Edita ingredientes, asignaciones, costes, comidas y actividades.</span></div>' +
    '<div class="row"><span class="pill">Lector</span><span class="grow">Lo ve todo, marca su propia asistencia y vota planes.</span></div></div></section>';
  h += '<section class="card"><div class="card-head"><h3>Las tres casas</h3><span class="pill pend">PROPUESTA</span></div>' +
    S.homes.map(function (x) {
      return '<div class="stack" style="gap:6px"><div class="row"><b class="grow">' + esc(x.name) + '</b><span class="beds">' + Array.from({ length: x.beds }, function (_, i) { return '<i' + (i >= x.beds - x.free ? ' class="free"' : '') + '></i>'; }).join('') + '</span><span class="small muted num">' + (x.beds - x.free) + '/' + x.beds + '</span></div>' +
        '<div class="small muted">' + esc(x.rooms) + '</div><div class="avs">' + x.proposal.map(function (id) { return av(id, 'sm'); }).join('') + '</div><div class="small">' + esc(x.note) + '</div></div>';
    }).join('<div class="divider"></div>') + '<p class="small muted">Quedan ' + S.homes.reduce(function (a, x) { return a + x.free; }, 0) + ' camas libres' + (function () { var pp = S.people.filter(function (p) { return p.pend; }).map(function (p) { return p.name; }); return pp.length ? ' para ' + esc(pp.join(' y ')) : ''; })() + '.</p></section>';
  return h;
};
