/* ===================== La finca: todo lo práctico =====================
   El contenido (Wi-Fi, normas, tiendas…) vive en los datos (S.finca, en la BD), nunca en el código público.
   Registro de huéspedes: cada persona de 14 años o más marca que ya ha rellenado el formulario (S.guestReg). */
function fincaMd(t) { return esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); }
function regPeople() {
  var F = S.finca || {}, min = (F.register && F.register.minAge) || 14;
  return S.people.filter(function (p) { return (p.age != null ? p.age >= min : p.kind === 'adulto') && L.mealsAttended(S, p.id) > 0; });
}
function regDone(pid) { return !!(S.guestReg && S.guestReg[pid]); }
function fincaHomeCard() {
  var F = S.finca; if (!F) return '';
  var rp = regPeople(), done = rp.filter(function (p) { return regDone(p.id); }).length;
  var mine = rp.filter(function (p) { return canAttendFor(p.id) && (p.family === me().family || p.id === me().id); });
  var h = '<section class="card finca-card"><div class="card-head"><h3>La finca</h3><button class="link" data-act="tab" data-tab="finca">Todo lo práctico ' + icon('arrow') + '</button></div>';
  if (F.wifi) h += '<button class="wifi" data-act="wifiCopy"><span class="aw-ico sm">' + icon('bolt') + '</span><span class="grow"><small class="muted">Wi-Fi</small><b>' + esc(F.wifi.net) + '</b></span><span class="wifi-pass"><small class="muted">Contraseña</small><b>' + esc(F.wifi.pass) + '</b></span>' + icon('copy') + '</button>';
  if (F.register && rp.length) {
    h += '<div class="reg"><div class="row"><span class="grow small"><b>Registro de huéspedes</b> · obligatorio por ley desde ' + F.register.minAge + ' años</span><span class="pill ' + (done === rp.length ? 'ok' : 'warn') + '">' + done + '/' + rp.length + '</span></div>' +
      (mine.length ? '<div class="reg-list">' + mine.map(function (p) {
        var ok = regDone(p.id);
        return '<button class="toggle-p reg-p" data-act="greg" data-id="' + p.id + '" aria-pressed="' + ok + '">' + av(p.id, 'sm') + esc(p.name) + '<span class="small">' + (ok ? '✓ Hecho' : 'Pendiente') + '</span></button>';
      }).join('') + '</div>' : '') +
      '<a class="btn block" href="' + esc(F.register.url) + '" target="_blank" rel="noopener">' + icon('edit') + 'Rellenar el formulario de la finca</a><p class="small muted">Uno por persona. Cuando lo hagas, marca tu nombre aquí arriba.</p></div>';
  }
  return h + '</section>';
}
VIEWS.finca = function () {
  var F = S.finca || {}, T = S.trip || {};
  var h = '<div class="view-head"><div><h2>La finca</h2><p class="muted small">' + esc(T.place || '') + ' · todo lo práctico, de la guía de ' + esc(F.host || 'la finca') + '</p></div></div>';
  if (!S.finca) return h + '<div class="empty">' + icon('house') + '<b>Aún no hay información de la finca</b></div>';
  if (can('access') && F.todo && F.todo.length) h += '<section class="card alert"><div class="card-head"><h3>Pendiente con la finca</h3><span class="pill">Solo lo ves tú</span></div><ul class="small finca-ul">' + F.todo.map(function (t) { return '<li>' + fincaMd(t) + '</li>'; }).join('') + '</ul></section>';
  h += fincaHomeCard().replace('<div class="card-head"><h3>La finca</h3><button class="link" data-act="tab" data-tab="finca">Todo lo práctico ' + icon('arrow') + '</button></div>', '<div class="card-head"><h3>Wi-Fi y registro</h3></div>');
  h += '<section class="card wood"><div class="facts">' +
    '<span class="fact">' + icon('clock') + 'Llegada desde las ' + esc(F.checkin || T.arrival) + '</span>' +
    '<span class="fact">' + icon('arrow') + 'Salida antes de las ' + esc(F.checkout || T.departure) + '</span>' +
    (F.phone ? '<a class="fact" href="tel:' + esc(F.phone.replace(/\s/g, '')) + '">' + icon('phone') + esc(F.contact || '') + ' · ' + esc(F.phone) + '</a>' : '') + '</div>' +
    (F.booking ? '<p class="small">' + fincaMd(F.booking) + '</p>' : '') +
    '<div class="row wrap">' + (T.maps ? '<a class="btn" href="' + esc(T.maps) + '" target="_blank" rel="noopener">' + icon('pin') + 'Cómo llegar</a>' : '') + (F.phone ? '<a class="btn ghost" href="https://wa.me/' + esc(F.phone.replace(/[^\d]/g, '')) + '" target="_blank" rel="noopener">' + icon('phone') + 'WhatsApp a ' + esc(F.contact || 'la finca') + '</a>' : '') + '</div></section>';
  (F.sections || []).forEach(function (sec) {
    h += '<section class="card"><div class="row" style="gap:10px"><span class="aw-ico sm">' + icon(sec.icon || 'house') + '</span><h3 class="grow">' + esc(sec.title) + '</h3></div><ul class="finca-ul">' + sec.items.map(function (t) { return '<li>' + fincaMd(t) + '</li>'; }).join('') + '</ul></section>';
  });
  if (F.shops && F.shops.length) h += '<section class="card"><div class="row" style="gap:10px"><span class="aw-ico sm">' + icon('cart') + '</span><h3 class="grow">Comprar en ' + esc(T.town || 'el pueblo') + '</h3></div><div class="stack" style="gap:2px">' + F.shops.map(function (x) {
    return '<a class="row shop" href="' + esc(x.url) + '" target="_blank" rel="noopener"><span class="grow"><b>' + esc(x.name) + '</b><small class="muted" style="display:block">' + esc(x.note || '') + '</small></span>' + icon('pin') + '</a>';
  }).join('') + '</div>' + (F.near ? '<p class="small muted">' + fincaMd(F.near) + '</p>' : '') + '</section>';
  return h;
};
Object.assign(A, {
  greg: function (el) {
    var pid = el.dataset.id; if (!guard('attend', pid)) return;
    S.guestReg = S.guestReg || {}; if (S.guestReg[pid]) delete S.guestReg[pid]; else S.guestReg[pid] = true;
    save(); render(true);
    var rp = regPeople(), done = rp.filter(function (p) { return regDone(p.id); }).length;
    toast(S.guestReg[pid] ? (done === rp.length ? '¡Registro completo! La finca y la ley, contentas' : esc(person(pid).name) + ' registrado. Quedan ' + (rp.length - done)) : 'Desmarcado');
  },
  wifiCopy: function () {
    var F = S.finca || {}; if (!F.wifi) return;
    try { navigator.clipboard.writeText(F.wifi.pass).then(function () { toast('Contraseña copiada. Red: ' + esc(F.wifi.net)); }, function () { toast('Contraseña: ' + esc(F.wifi.pass)); }); } catch (e) { toast('Contraseña: ' + esc(F.wifi.pass)); }
    if (typeof egg === 'function') setTimeout(function () { egg('wifi'); }, 900);
  }
});
