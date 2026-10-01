/* ===================== Inicio (v0.7): lo justo y lo importante =====================
   Cuenta atrás · aviso de pago · el tiempo · tus primeros pasos · manual · secretos · ranking de juegos · buzón de ideas.
   Todo lo demás vive en su pestaña. */
function homeWeather() {
  if (!S.weather || !S.weather.days || !S.weather.days.length) return '';
  return '<section class="card"><div class="card-head"><h3 data-egg="sun">El tiempo en la finca</h3><button class="link" data-act="tab" data-tab="tiempo">Detalle ' + icon('arrow') + '</button></div><div class="wx">' +
    S.weather.days.map(function (d) {
      var dd = dayOf(d.k);
      return '<div class="wx-day"><small>' + esc(dd ? dd.short : L.ddmm(d.k)) + '</small>' + wxIcon(d.code) + '<b>' + Math.round(d.tmax) + '°</b><small>' + Math.round(d.tmin) + '° · ' + d.prob + '%</small></div>';
    }).join('') + '</div><p class="small muted">' + weatherSummary() + '</p></section>';
}
function homePayments() {
  return S.house.payments.filter(function (p) { return !p.paid; }).map(function (p) {
    var t0 = new Date(); t0.setHours(0, 0, 0, 0);
    var days = Math.round((new Date(p.due + 'T00:00:00') - t0) / 86400000);
    return '<section class="card alert"><div class="row"><span class="pill warn">Aviso</span><span class="small muted">Casa · lo pagan ' + esc(fam(S.house.payer).name) + '</span></div>' +
      '<h3>' + esc(p.label) + ' de la casa: ' + L.money(p.amount) + '</h3>' +
      '<p>Vence el <b>' + L.ddmm(p.due) + '</b>' + (days >= 0 ? ' · quedan ' + days + (days === 1 ? ' día' : ' días') : ' · <b>vencido</b>') + '.</p>' +
      (p.note ? '<p class="small muted" style="user-select:all">' + esc(p.note) + '</p>' : '') +
      (can('access') ? '<button class="btn" data-act="payHouse" data-id="' + p.id + '">' + icon('check') + 'Marcar como pagado</button>' : '') + '</section>';
  }).join('');
}
/* Tus primeros pasos: lo que cada uno tiene que hacer en el momento cero */
function firstSteps() {
  var m = me(), steps = [];
  var F = S.finca || {}, minAge = (F.register && F.register.minAge) || 14;
  var needsReg = F.register && (m.age != null ? m.age >= minAge : m.kind === 'adulto');
  if (needsReg) steps.push({ ok: typeof regDone === 'function' && regDone(m.id), t: 'Regístrate en la web de la finca', s: 'Obligatorio por ley desde los ' + minAge + ' años', tab: 'finca', sub: 'info' });
  if (S.rooms) steps.push({ ok: !!(typeof roomOf === 'function' && roomOf(m.id)), t: 'Mira dónde duermes', s: roomOf(m.id) ? roomLabel(roomOf(m.id)) : 'Aún sin habitación: elige una', tab: 'finca', sub: 'dormir' });
  var ids = famAttendIds(), allSet = ids.every(function (pid) { return S.days.every(function (d) { return S.dayConfirm[pid] && S.dayConfirm[pid][d.k]; }); });
  steps.push({ ok: allSet, t: ids.length > 1 ? 'Revisa los días de tu familia' : 'Revisa tus días', s: 'Si cambia algo, toca el día', tab: 'familia', sub: 'dias' });
  if (can('edit') && fam(m.family)) steps.push({ ok: S.ingredients.some(function (i) { return i.family === m.family; }), t: 'Pídete algo de la compra', s: 'Y luego apunta lo que te ha costado', tab: 'compra' });
  steps.push({ ok: (S.ideas || []).some(function (x) { return x.by === m.id; }), t: 'Deja una idea en el buzón', s: 'Opcional, pero hace ilusión', act: 'ideaNew' });
  var done = steps.filter(function (x) { return x.ok; }).length;
  if (done === steps.length) return '<section class="card steps-done"><div class="row"><span class="aw-ico sm">' + icon('check') + '</span><span class="grow"><b>Lo tienes todo listo.</b><small class="muted" style="display:block">Ahora solo falta que llegue el viernes.</small></span></div></section>';
  return '<section class="card first-steps"><div class="card-head"><h3>Tus primeros pasos</h3><span class="pill ' + (done ? 'warn' : '') + '">' + done + '/' + steps.length + '</span></div><div class="stack" style="gap:4px">' +
    steps.map(function (x) {
      return '<button class="row step-row' + (x.ok ? ' ok' : '') + '" ' + (x.act ? 'data-act="' + x.act + '"' : 'data-act="tab" data-tab="' + x.tab + '"' + (x.sub ? (x.tab === 'finca' ? ' data-fsub="' : ' data-msub="') + x.sub + '"' : '')) + '>' +
        '<span class="step-dot">' + (x.ok ? '✓' : '') + '</span><span class="grow"><b>' + esc(x.t) + '</b><small class="muted" style="display:block">' + esc(x.s) + '</small></span>' + (x.ok ? '' : icon('arrow')) + '</button>';
    }).join('') + '</div></section>';
}
function homeSecrets() {
  if (typeof secretsRanking !== 'function') return '';
  var rk = secretsRanking().filter(function (r) { return r.n > 0; }).slice(0, 3), n = foundCount();
  return '<section class="card home-secrets"><div class="card-head"><h3 class="row" style="gap:8px">' + icon('search') + 'Secretos de la casa</h3><button class="link" data-act="secrets">Ver ' + icon('arrow') + '</button></div>' +
    '<div class="row"><span class="big num">' + n + '<small>/' + EGGS.length + '</small></span><span class="grow small muted">' + (n ? 'Vas bien. Chitón.' : 'Hay ' + EGGS.length + ' escondidos por la app. Nadie te va a decir dónde.') + '<br>El ranking se cierra el ' + esc(fmtClose()) + '.</span></div>' +
    '<div class="bar sec-bar"><i style="width:' + Math.round(n / EGGS.length * 100) + '%"></i></div>' +
    (rk.length ? '<div class="mini-rank">' + rk.map(function (r) { return '<span class="mr">' + medal(r.pos) + av(r.id, 'xs') + '<b>' + esc(person(r.id).name) + '</b><small class="num">' + r.n + '</small></span>'; }).join('') + '</div>' : '') +
    (typeof secretsWho === 'function' ? foldBtn('secwho', '<span class="grow"><b class="fold-title">Quién lleva cuáles</b><small class="muted">Sin spoilers: solo ves los que tú también tienes</small></span>', 'fold-sub') + (fold('secwho') ? '<div class="fold-body">' + secretsWho() + '</div>' : '') : '') + '</section>';
}
function homeGames() {
  var rank = G.ranking(S).filter(function (r) { return r.pts > 0; }).slice(0, 3);
  var done = G.doneGames(S).length, tot = (S.games || []).length;
  return '<section class="card home-games"><div class="card-head"><h3 class="row" style="gap:8px">' + icon('trophy') + 'Ranking de juegos</h3><button class="link" data-act="jsub" data-v="ranking">Ranking ' + icon('arrow') + '</button></div>' +
    (rank.length ? '<div class="mini-rank">' + rank.map(function (r) { return '<span class="mr">' + medal(r.pos) + eAv(r.id, 'xs') + '<b>' + eName(r.id) + '</b><small class="num">' + r.pts + ' pts</small></span>'; }).join('') + '</div>'
      : '<p class="small muted">Aún no ha puntuado nadie. El trono está libre y el sábado empieza el hockey.</p>') +
    '<div class="progress" aria-label="Juegos terminados"><i style="width:' + (tot ? Math.round(done / tot * 100) : 0) + '%"></i></div><p class="small muted">' + done + ' de ' + tot + ' juegos terminados</p></section>';
}
VIEWS.inicio = function () {
  var c = countdownParts();
  afterRender.push(startHero, startCountdown);
  var h = (typeof secretsHomeBanner === 'function' ? secretsHomeBanner() : '') + '<section class="hero glass" aria-label="Cuenta atrás"><canvas id="heroNet" aria-hidden="true"></canvas>' +
    '<div class="kicker">' + esc(S.trip.dateLabel || '') + '</div>' +
    '<h1 data-egg="logo">' + (function () { var r = splitLast(S.trip.name); return esc(r[0]) + (r[0] ? '<br>' : '') + '<span>' + esc(r[1]) + '</span>'; })() + '</h1>' +
    '<p class="place">' + icon('pin') + esc(S.trip.place) + (S.trip.town ? ' · ' + esc(S.trip.town) : '') + '</p>';
  if (c.phase === 'before') {
    h += '<div class="count" id="count" data-egg="disco"><div><b id="cd-d">' + c.d + '</b><span>días</span></div><div><b id="cd-h">' + c.h + '</b><span>horas</span></div><div><b id="cd-m">' + c.m + '</b><span>min</span></div><div><b id="cd-s">' + c.s + '</b><span>seg</span></div></div>' +
      '<p class="small muted" style="margin-top:10px">Para la llegada del ' + esc(S.days[0].long.toLowerCase()) + ' a las ' + esc(S.trip.arrival) + '</p>';
  } else if (c.phase === 'during') h += '<p class="live">¡Ya estamos en la finca!</p>';
  else h += '<p class="live">' + esc(S.trip.name) + ' clausurado. Habemus recuerdos.</p>';
  h += '</section>';
  h += homePayments();
  h += '<div class="home-flow">';
  h += homeWeather();
  h += firstSteps();
  if (typeof regCardHome === 'function') h += regCardHome();
  h += manualCardHome();
  h += homeSecrets();
  h += homeGames();
  if (typeof ideasCard === 'function') h += ideasCard();
  h += '</div>';
  return h;
};
