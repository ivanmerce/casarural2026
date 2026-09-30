/* ===================== Vistas: Planes, Torneo, Cuentas, Tiempo, Personas ===================== */

VIEWS.planes = function () {
  if (!ui.day) ui.day = tripDayDefault();
  ui.sub = 'plan';
  var h = '<div class="view-head"><div><h2>Planes</h2><p class="muted small">Sencillos, en la finca y sin gastos extra. Los minijuegos de cada día, en Juegos</p></div></div>';

  h += daySelector('day');
  var w = S.weather.days.find(function (x) { return x.k === ui.day; });
  if (w) {
    var a = L.advice(w);
    h += '<div class="card wood" style="padding:12px 14px"><div class="row">' + wxIcon(w.code) + '<span class="grow small"><b>' + L.wmo(w.code)[0] + ', ' + Math.round(w.tmin) + '–' + Math.round(w.tmax) + ' °C.</b> ' + esc(a.planB.t) + '.</span></div></div>';
  }
  var acts = S.activities.filter(function (x) { return x.day === ui.day; }).sort(function (a, b) { return a.start.localeCompare(b.start); });
  if (!acts.length) h += '<div class="empty">' + icon('plans') + '<b>Día libre</b><span>Nada planeado. Siesta oficial de la casa rural.</span></div>';
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
    '<p class="small muted">Sábado desde las 17:00, todo el torneo de un tirón. Toca un nombre para darle la victoria y apunta el marcador.</p>' +
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
  if (champ) h += '<div class="champ card" style="box-shadow:none">' + icon('trophy') + '<div class="grow"><span class="eyebrow">Campeón del finde</span><h3>' + pname(champ) + '</h3></div><button class="btn" data-act="trophy">Ver trofeo</button></div>';
  if (can('edit')) h += '<div class="row wrap"><button class="btn" data-act="editPlayers">' + icon('users') + 'Cambiar jugadores</button><button class="btn ghost" data-act="resetBracket">Reiniciar cuadro</button></div>';
  h += '</section>';
  h += '<section class="card wood"><h3>Reglas de la casa</h3><ul class="small" style="margin:0;padding-left:18px"><li>Partidos a 11 puntos, cambio de saque cada 2.</li><li>La final, al mejor de 3.</li><li>Los abuelos son árbitros inapelables.</li><li>El campeón elige el primer juego de la noche de juegos de mesa.</li></ul></section>';
  return h;
}


/* ---------- CUENTAS ---------- */
VIEWS.cuentas = function () {
  var lg = L.ledger(S, false);
  var mode = S.split.mode;
  var tx = L.tax(S);
  var house = S.house;
  var paidH = house.payments.filter(function (p) { return p.paid; }).reduce(function (a, p) { return a + p.amount; }, 0);
  var h = '<div class="view-head"><div><h2>Cuentas</h2><p class="muted small">Quién ha puesto qué y quién paga a quién</p></div></div>';

  /* La casa */
  h += '<section class="card wood"><div class="card-head"><span class="eyebrow">La casa · fuera del reparto</span><span class="pill olive">Invitan ' + esc(fam(house.payer).name) + '</span></div>' +
    '<div class="row"><span class="big">' + L.money(house.total) + '</span><span class="grow small muted">' + S.tax.nights + ' noches · pagado ' + L.money(paidH) + '</span></div>' +
    house.payments.map(function (p) {
      return '<div class="pay"><span class="when">' + L.ddmm(p.paid ? (p.date || p.due) : p.due) + '</span><span class="grow">' + esc(p.label) + ' · <b class="num">' + L.money(p.amount) + '</b>' + (p.note && !p.paid ? '<small class="muted" style="display:block;user-select:all">' + esc(p.note) + '</small>' : '') + '</span>' + (p.paid ? '<span class="pill ok">Pagado</span>' : '<span class="pill warn">Vence ' + L.ddmm(p.due) + '</span>') + '</div>';
    }).join('') +
    '<details><summary>Política de cancelación</summary><ul class="small">' + house.cancel.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></details></section>';

  /* Tasa turística */
  var exNames = tx.rows.filter(function (r) { return !r.pays; }).map(function (r) { return pname(r.id); });
  h += '<section class="card"><div class="card-head"><h3>Tasa turística</h3>' + (S.tax.payer ? '<span class="pill olive">Invitan ' + esc(fam(S.tax.payer).name) + '</span>' : '<span class="pill pend">Quién paga: PENDIENTE</span>') + '</div>' +
    (tx.fixed ? '<div class="row"><span class="big">' + L.money(tx.withExemption) + '</span><span class="grow small muted">Lo que dice la finca: ' + S.tax.fixed.persons + ' personas × ' + (S.tax.fixed.nights || S.tax.nights) + ' noches × ' + L.money(S.tax.perNight) + '</span></div><p class="small muted">' + esc(S.tax.note) + '. No entra en el reparto.</p></section>' :
    '<div class="row"><span class="big">' + L.money(tx.withExemption) + '</span><span class="grow small muted">' + tx.stays + ' noches-persona × ' + L.money(S.tax.perNight) + ' · ' + tx.adults + ' pagan</span></div>' +
    '<div class="tax-list">' + tx.rows.filter(function (r) { return r.pays; }).map(function (r) { return '<span class="online-chip">' + av(r.id, 'xs') + pname(r.id) + ' <small class="muted">' + r.nights + (r.nights === 1 ? ' noche' : ' noches') + '</small></span>'; }).join('') + '</div>' +
    (exNames.length ? '<p class="small"><b>Exentos por edad (menores de ' + (S.tax.minAge || 16) + '):</b> ' + exNames.join(', ') + '</p>' : '') +
    '<p class="small muted">' + esc(S.tax.note) + '. Se recalcula sola con la asistencia por día. No entra en el reparto.</p></section>');

  /* Reparto */
  /* El rincón de los abuelos (anfitriones: fuera del reparto) */
  h += abuCard(lg, tx);

  var exF = lg.excluded || [], rowsR = lg.rows.filter(function (r) { return exF.indexOf(r.id) < 0; });
  var exNm = exF.map(function (k) { return fam(k).name; }).join(' y ');
  h += '<section class="card"><div class="card-head"><h3>Reparto entre hermanos y compañía</h3></div>' +
    (exF.length ? '<p class="small muted">' + esc(exNm) + ' no entran en el reparto: ya ponen la casa. Lo que ellos inviten se descuenta del bote.</p>' : '') +
    '<div class="split-how"><span class="aw-ico sm">' + icon('users') + '</span><p class="small"><b>Cómo se reparte:</b> a proporción de <b>quién viene y a cuántas comidas</b>. Adultos y peques cuentan igual (comen como un adulto, y lo sabemos); ' + esc(babyName()) + ' no cuenta: su comida la traen sus padres de casa. Así, una familia de 5 paga más que una de 3, y quien viene menos días paga menos.</p></div>';
  var noP = S.ingredients.filter(function (i) { return L.needsPrice(i) && (i.split || 'comun') === 'comun'; });
  h += '<p class="small muted">Aquí solo cuentan los productos de la compra <b>con precio real</b> (o que vienen de casa) y los gastos de abajo.</p>' +
    (noP.length ? '<div class="card alert" style="padding:10px 12px;gap:6px"><p class="small"><b>' + noP.length + ' productos pedidos aún sin precio</b> (≈ ' + L.money(noP.reduce(function (a, i) { return a + (i.est || 0); }, 0)) + '): ' +
      S.families.map(function (f) { var n = noP.filter(function (i) { return i.family === f.id; }).length; return n ? esc(f.short || f.name) + ' ' + n : ''; }).filter(Boolean).join(' · ') + '. Cuando cada familia apunte lo que le ha costado, entrarán en el reparto.</p><button class="btn" data-act="tab" data-tab="compra">Ir a la compra</button></div>' : '');
  h += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Familia</th><th>Ha puesto</th><th>Le toca</th><th>Saldo</th></tr></thead><tbody>' +
    rowsR.map(function (r) {
      var f = fam(r.id);
      return '<tr><td><span class="row" style="gap:6px"><i class="fam-dot ' + f.color + '"></i>' + esc(f.name) + '</span><span class="small muted">' + famHeads(r.id) + ' · ' + Math.round(r.share * 100) + ' %</span>' + (r.gift ? '<span class="small" style="display:block;color:var(--olive)">incluye aportación de ' + L.money(r.gift) + '</span>' : '') + '</td><td>' + L.money(r.paid) + '</td><td>' + L.money(r.owe) + '</td><td class="' + (r.bal > 0.004 ? 'pos' : r.bal < -0.004 ? 'neg' : '') + '">' + (r.bal > 0 ? '+' : '') + L.money(r.bal) + '</td></tr>';
    }).join('') + '</tbody></table></div>' +
    '<div class="pot"><div class="row"><span class="grow">Gasto total con precio real</span><b class="num">' + L.money(lg.total) + '</b></div>' +
    (lg.gifts ? '<div class="row olive-t"><span class="grow">Invitaciones' + (exF.length ? ' (abuelos y regalos)' : '') + '</span><b class="num">− ' + L.money(lg.gifts) + '</b></div>' : '') +
    '<div class="row pot-total"><span class="grow"><b>A repartir entre hermanos y compañía</b></span><b class="num">' + L.money(lg.toShare) + '</b></div></div>' +
    (lg.giftsPledged > lg.gifts + 0.004 ? '<p class="small muted">Hay ' + L.money(lg.giftsPledged - lg.gifts) + ' de invitación esperando: se aplicarán en cuanto haya más gastos.</p>' : '');

  if (lg.total === 0) {
    h += '<div class="empty" style="padding:12px">' + icon('coins') + '<b>Todavía no hay nada a cargo de nadie</b><span>Cuando las familias se pidan productos de la compra o añadáis gastos, aparecerá aquí quién paga a quién.</span></div>';
  } else if (!lg.tx.length) {
    h += '<span class="stamp">Cuentas claras, familia unida</span>';
  } else {
    h += '<span class="eyebrow">Liquidación · ' + lg.tx.length + (lg.tx.length === 1 ? ' transferencia' : ' transferencias') + '</span>' + lg.tx.map(function (t) {
      return '<div class="tx"><span class="row" style="gap:6px"><i class="fam-dot ' + fam(t.from).color + '"></i><b>' + esc(fam(t.from).name) + '</b></span><span class="arrow">' + icon('arrow') + '</span><span class="row" style="gap:6px"><i class="fam-dot ' + fam(t.to).color + '"></i><b>' + esc(fam(t.to).name) + '</b></span><span class="amt">' + L.money(t.amount) + '</span></div>';
    }).join('');
  }
  h += '</section>';

  /* Gastos extra */
  var ingPaid = S.ingredients.filter(function (i) { return i.family && (i.split || 'comun') === 'comun' && !L.needsPrice(i); });
  h += '<section class="card"><div class="card-head"><h3>Gastos</h3>' + (can('edit') ? '<button class="btn primary" data-act="newExp">' + icon('plus') + 'Añadir</button>' : '') + '</div>' +
    '<div class="row small"><span class="grow">Productos de la compra con precio real (' + ingPaid.length + ')</span><b class="num">' + L.money(ingPaid.reduce(function (a, i) { return a + L.realCost(i); }, 0)) + '</b></div><div class="divider"></div>' +
    (S.expenses.length ? S.expenses.map(function (e) {
      return '<button class="row" data-act="editExp" data-id="' + e.id + '" style="background:none;border:0;text-align:left;font:inherit;color:inherit;padding:6px 0;min-height:44px"><i class="fam-dot ' + fam(e.payer).color + '"></i><span class="grow"><b>' + esc(e.concept) + '</b><span class="small muted"> · ' + esc(fam(e.payer).name) + (e.kind === 'aportacion' ? ' · aportación de regalo' : e.split === 'propio' ? ' · propio' : '') + '</span></span><b class="num">' + L.money(e.amount) + '</b></button>';
    }).join('') : '<p class="small muted">Carbón, gasolina, tarta, decoración, regalos… Todo lo que no sea un ingrediente va aquí, con quién lo pagó. Si alguien quiere poner algo extra de regalo para el bote, apúntalo como aportación.</p>') +
    '</section>';
  return h;
};
/* ---------- Rincón de los abuelos ---------- */
function abuIdeas() { return ['El vermut del sábado', 'Los helados de los nietos', 'El carbón de la barbacoa', 'La tarta de ' + bdayName(), 'Una ronda de churros', 'Lo que haga falta']; }
var ABU_LEVELS = [
  [0, 'Modo jubilado zen', 'Ya han pagado la casa. Tienen derecho a tumbarse en la hamaca y no mover un dedo.'],
  [1, 'Abuelos enrollados', 'Primera invitación en el bote. Los nietos ya murmuran.'],
  [50, 'Abuelos de oro', 'A este ritmo les ponen una placa en la finca.'],
  [120, 'Mecenas del Finde', 'Lorenzo de Médici, pero con tortilla de patatas.'],
  [250, 'Leyenda familiar', 'Se contará en todas las sobremesas de aquí a 2040.']
];
function abuLevel(v) { var l = ABU_LEVELS[0], nx = null; ABU_LEVELS.forEach(function (x, i) { if (v >= x[0]) { l = x; nx = ABU_LEVELS[i + 1] || null; } }); return { l: l, next: nx }; }
function abuCard(lg, tx) {
  var ex = lg.excluded || []; if (!ex.length) return '';
  var k = ex[0], F = fam(k), house = S.house, fn = F.name.replace(/\s*&\s*/g, ' y ');
  var r = lg.rows.find(function (x) { return x.id === k; }) || { paid: 0 };
  var mine = S.expenses.filter(function (e) { return e.payer === k && e.kind === 'aportacion'; });
  var aport = L.r2(mine.reduce(function (a, e) { return a + (e.amount || 0); }, 0));
  var prods = S.ingredients.filter(function (i) { return i.family === k && (i.split || 'comun') === 'comun'; });
  var invited = L.r2(aport + (r.paid || 0));
  var base = (house && house.payer === k ? house.total : 0) + (S.tax.payer === k ? tx.withExemption : 0);
  var lv = abuLevel(invited), isAbu = me().family === k, canInv = can('edit') && (isAbu || can('access'));
  var pct = lv.next ? Math.max(4, Math.min(100, Math.round((invited - lv.l[0]) / (lv.next[0] - lv.l[0]) * 100))) : 100;
  var h = '<section class="card abu" id="abu"><div class="card-head"><span class="eyebrow">El rincón de los abuelos</span><span class="pill olive">Fuera del reparto</span></div>' +
    '<h3>' + (isAbu ? 'Abuelos, aquí nadie os pasa factura' : esc(fn) + ': aquí nadie les pasa factura') + '</h3>' +
    '<p class="small">' + (isAbu ? 'Ya ponéis' : 'Ya ponen') + ' <b>la casa</b>' + (S.tax.payer === k ? ' y <b>la tasa turística</b>' : '') + ': <b class="num">' + L.money(base) + '</b>. Con eso ' + (isAbu ? 'tenéis' : 'tienen') + ' barra libre de nietos, sofá y mando de la tele. No ' + (isAbu ? 'entráis' : 'entran') + ' en el reparto.</p>' +
    '<p class="small">' + (isAbu ? '¿Os apetece invitar a algo más?' : '¿Y si les apetece invitar a algo más?') + ' <b>Totalmente opcional.</b> Lo que ' + (isAbu ? 'pongáis' : 'pongan') + ' se <b>descuenta del bote</b> que se reparten los hermanos y compañía (que lo agradecerán con besos y fregando platos).</p>' +
    '<div class="abu-meter" data-egg="abumeter"><div class="row"><span class="aw-ico sm">' + icon('trophy') + '</span><span class="grow"><b>Abuelómetro:</b> ' + esc(lv.l[1]) + '<small class="muted" style="display:block">' + esc(lv.l[2]) + '</small></span><b class="num">' + L.money(invited) + '</b></div>' +
    '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
    (lv.next ? '<small class="muted">Faltan ' + L.money(L.r2(lv.next[0] - invited)) + ' para «' + esc(lv.next[1]) + '»</small>' : '<small class="gold">Nivel máximo. Ya no hay más medallas que darles.</small>') + '</div>';
  if (mine.length || prods.length) {
    h += '<div class="stack" style="gap:2px">' + mine.map(function (e) {
      var inner = '<span class="grow"><b>' + esc(e.concept) + '</b></span><b class="num">' + L.money(e.amount) + '</b>';
      return can('edit') ? '<button class="row abu-inv" data-act="editExp" data-id="' + e.id + '">' + inner + '</button>' : '<div class="row abu-inv">' + inner + '</div>';
    }).join('') + (prods.length ? '<div class="row small abu-inv"><span class="grow">Productos de la compra que se han pedido (' + prods.length + ')</span><b class="num">' + L.money(r.paid || 0) + '</b></div>' : '') + '</div>';
  }
  if (canInv) {
    var c = ui.abuC || '', a = ui.abuA || null;
    h += '<div class="abu-form"><span class="lbl">¿A qué invitáis?</span><div class="chips">' + abuIdeas().map(function (x) {
      return '<button class="chip" data-act="abuC" data-v="' + esc(x) + '" aria-pressed="' + (c === x) + '">' + esc(x) + '</button>';
    }).join('') + '</div>' +
      '<span class="lbl">¿Cuánto?</span><div class="chips">' + [10, 20, 50, 100].map(function (n) {
        return '<button class="chip" data-act="abuA" data-v="' + n + '" aria-pressed="' + (a === n) + '">' + n + ' €</button>';
      }).join('') + '<label class="price-in"><input class="price-field" id="abu-amt" inputmode="decimal" placeholder="Otro" value="' + (a && [10, 20, 50, 100].indexOf(a) < 0 ? L.n(a) : '') + '">€</label></div>' +
      '<button class="btn primary block" data-act="abuGo">' + icon('gift') + '¡Invitamos nosotros!</button>' +
      '<p class="small muted">Luego la app os dice a quién hacer el bizum. Si os arrepentís, tocad la invitación y se borra (sin rencores).</p></div>';
  } else {
    h += '<p class="small muted">Solo los abuelos pueden invitar desde aquí. Se admiten indirectas.</p>' +
      '<a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent('Abuelos, os echamos de menos en el Abuelómetro de la app de ' + (S.trip.short || 'la casa rural') + '. Ni una presión, eh. Bueno, un poco. ' + location.origin + location.pathname + ' ') + '">' + icon('megaphone') + 'Mandar una indirecta a los abuelos</a>';
  }
  return h + '</section>';
}
function famHeads(fid) {
  var ps = S.people.filter(function (p) { return p.family === fid && L.mealsAttended(S, p.id) > 0 && (S.split.w[p.kind] == null ? 1 : S.split.w[p.kind]) > 0; });
  var full = ps.filter(function (p) { return L.mealsAttended(S, p.id) === S.meals.length; }).length;
  return ps.length + (ps.length === 1 ? ' persona' : ' personas') + (full < ps.length ? ' (' + (ps.length - full) + ' no todos los días)' : '');
}
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
  if (adm) { h += familyAccessCard(); afterRender.push(fillFamilyAccess); }
  h += window.CLOUD ? '' : '<section class="card wood small"><p><b>Demo:</b> arriba a la derecha eliges quién eres para probar cómo se ve con cada rol. En la versión online cada uno entra con su email o con un código, y los permisos los aplica la base de datos.</p></section>';
  S.families.forEach(function (f) {
    var ps = S.people.filter(function (p) { return p.family === f.id; });
    h += '<section class="card"><div class="card-head"><h3 class="row" style="gap:8px"><i class="fam-dot ' + f.color + '"></i>' + esc(f.name) + '</h3>' + (f.note ? '<span class="pill">' + esc(f.note) + '</span>' : '') + '</div><div>' +
      ps.map(function (p) {
        var ma = L.mealsAttended(S, p.id);
        return '<div class="person">' + av(p.id, 'lg') + '<div class="grow"><b>' + pname(p.id) + '</b>' + (p.pend ? ' <span class="pill pend">por confirmar</span>' : '') +
          '<div class="small muted">' + (p.age != null ? (p.approx ? '≈' : '') + p.age + ' años · ' : '') + KIND[p.kind] + ' · ' + ma + '/' + S.meals.length + ' comidas</div>' +
          (p.note ? '<div class="small muted">' + esc(p.note) + '</div>' : '') +
          (adm ? '<button class="link small" data-act="access" data-id="' + p.id + '" style="min-height:34px;padding:2px 0">' + (p.email ? esc(p.email) : p.login ? 'Usuario: ' + esc(p.login) : 'Sin email · dar acceso') + '</button>' : '') + '</div>' +
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
  if (typeof myRoomCard === 'function' && S.rooms) h += myRoomCard();
  return h;
};
