/* ===================== Confirmación de asistencia por día ===================== */
var CONF = { si: ['✓', 'Voy'], no: ['✕', 'No voy'], pend: ['?', 'Sin confirmar'] };
function confBtn(pid, day, sm) {
  var st = L.dayStatus(S, pid, day), d = dayOf(day);
  return '<button class="conf ' + st + (sm ? ' sm' : '') + '" data-act="conf" data-p="' + pid + '" data-day="' + day + '" aria-label="' + esc(person(pid).name) + ', ' + esc(d.long) + ': ' + CONF[st][1] + '">' +
    (sm ? '' : '<small>' + esc(d.short) + '</small>') + '<b>' + CONF[st][0] + '</b>' + (sm ? '' : '<span>' + CONF[st][1] + '</span>') + '</button>';
}
function daySummary() {
  return '<div class="daysum">' + S.days.map(function (d) {
    var c = L.dayCount(S, d.k);
    return '<div' + (d.star ? ' class="star"' : '') + '><small>' + esc(d.short) + '</small><b class="num">' + c.expected + '</b><span class="num">' + c.si + ' ✓ · ' + c.pend + ' ? · ' + c.no + ' ✕</span></div>';
  }).join('') + '</div>';
}
function pendingConfirmations() {
  var n = 0; S.people.forEach(function (p) { S.days.forEach(function (d) { if (L.dayStatus(S, p.id, d.k) === 'pend') n++; }); }); return n;
}
function confirmCard() {
  var p = me(), pend = pendingConfirmations();
  return '<section class="card" id="confirmCard"><div class="card-head"><h3>¿Vienes? Confirma por día</h3><button class="link" data-act="tab" data-tab="asistencia">Todos ' + icon('arrow') + '</button></div>' +
    '<p class="small muted">' + pname(p.id) + ', toca cada día hasta que quede como es. Con esto salen los comensales y las cantidades de la compra.</p>' +
    '<div class="conf-row">' + S.days.map(function (d) { return confBtn(p.id, d.k); }).join('') + '</div>' +
    '<div class="divider"></div><span class="eyebrow">Previstos por día</span>' + daySummary() +
    (pend ? '<p class="small"><span class="pill warn">' + pend + ' confirmaciones pendientes</span> Mientras tanto contamos a los habituales.</p>' : '<p class="small"><span class="pill ok">Todo confirmado</span> Planning y cantidades cerrados.</p>') +
    '</section>';
}
VIEWS.asistencia = function () {
  var h = '<div class="view-head"><div><h2>Asistencia por día</h2><p class="muted small">Quién viene cada día. Manda sobre los comensales de cada comida y las cantidades de la compra.</p></div></div>';
  h += '<section class="card"><span class="eyebrow">Previstos · confirmados · pendientes · no vienen</span>' + daySummary() +
    '<div class="stack small">' + S.days.map(function (d) {
      var ms = S.meals.filter(function (m) { return m.day === d.k && m.mode === 'comun'; });
      if (!ms.length) return '';
      return '<div class="row wrap"><b style="min-width:58px">' + esc(d.short) + '</b>' + ms.map(function (m) { return '<span class="pill">' + slotName(m.slot) + ' · ' + L.diners(S, m.id).length + '</span>'; }).join('') + '</div>';
    }).join('') + '</div></section>';
  h += '<div class="conf-legend small muted"><span><b class="conf-dot si">✓</b> Voy</span><span><b class="conf-dot no">✕</b> No voy</span><span><b class="conf-dot pend">?</b> Sin confirmar (contamos a los habituales)</span></div>';
  S.families.forEach(function (f) {
    var ps = S.people.filter(function (p) { return p.family === f.id; });
    h += '<section class="card" style="gap:6px"><div class="card-head"><h3 class="row" style="gap:8px"><i class="fam-dot ' + f.color + '"></i>' + esc(f.name) + '</h3>' +
      (can('edit') ? '<button class="link" data-act="confFam" data-fam="' + f.id + '">Todos, los 4 días ✓</button>' : '') + '</div>' +
      '<div class="conf-grid head"><span></span>' + S.days.map(function (d) { return '<small>' + esc(d.short) + '</small>'; }).join('') + '</div>' +
      ps.map(function (p) {
        return '<div class="conf-grid"><span class="row" style="gap:8px;min-width:0">' + av(p.id, 'sm') + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + pname(p.id) + '</span></span>' +
          S.days.map(function (d) { return confBtn(p.id, d.k, true); }).join('') + '</div>';
      }).join('') + '</section>';
  });
  h += '<p class="small muted">Si alguien viene un día pero no a una comida concreta, cámbialo en Comidas tocando los comensales de esa comida.' + (can('edit') ? '' : ' Como lector solo puedes confirmar lo tuyo.') + '</p>';
  return h;
};
function applySuggestion(i) {
  var s = L.suggestQty(S, i); if (!s) return false;
  if (i.est != null) i.est = L.r2(i.est * s.qty / i.qty);
  i.qty = s.qty; i.per = s.n; return true;
}
