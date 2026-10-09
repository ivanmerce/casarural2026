/* ===================== Sobres lacrados (v0.7.48 · v0.7.49: hora programada y guardado automático) =====================
   Una carta dentro de un sobre con lacre. Solo quien tiene la llave (keeper) puede abrirlo, y eso lo garantiza la base de
   datos (RLS), no la interfaz: a los demás la carta ni siquiera les llega. El texto vive en Supabase (letter_bodies),
   nunca en este código, que es público.
   Estados del sobre: secreto (solo lo ve quien tiene la llave) → a la vista (todos ven el sobre cerrado en Inicio)
   → guardado (el destinatario también puede abrirlo y releer la carta cuando quiera).
   La ceremonia: el sobre por delante → darle la vuelta → mantener pulsado el lacre → se rompe → se abre la solapa
   → sale la carta → la carta a pantalla completa, con confeti. */

IC.mail = '<path d="M3.5 6.5h17v11h-17z"/><path d="m3.5 7 8.5 6.5L20.5 7"/>';
IC.key = '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M16 7l3 3M14 9l2 2"/>';
var SB = { list: [], at: 0, loading: false, ch: false, bodies: {}, open: null, timers: [], tries: 0 };
var SB_HOLD = 1100;
function sbCloud() { return typeof PHOTOS !== 'undefined' && PHOTOS.demo === false && window.CLOUD && CLOUD.sb; }
function sbReduce() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
function sbLetter(id) { return SB.list.find(function (l) { return l.id === id; }); }
function sbIsKeeper(l) { return !!(l && l.keeper === ui.me); }
function sbAfter(ts) { return !!ts && Date.now() >= Date.parse(ts); }
function sbVisNow(l) { return !!(l && (l.visible || sbAfter(l.visible_from))); }
/* antes de share_after, abrirlo es un ensayo: no cuenta como primera vez ni se guarda para el destinatario */
function sbIsReal(l) { return !l.share_after || sbAfter(l.share_after); }
function sbCanRead(l) { return !!(l && (l.keeper === ui.me || (l.shared && l.to_person === ui.me))); }
function sbAv(pid, cls) { return av(pid, cls).replace(/ data-egg="[^"]*"/, ''); }   /* sin secretos aquí dentro: el sobre manda */
function sbVibe(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) {} }
function sbLater(fn, ms) { SB.timers.push(setTimeout(fn, ms)); }
function sbStarDay() { var d = (S.days || []).find(function (x) { return x.star; }); return d ? d.k : null; }
function sbMark(l) {
  var e = (S.trip && S.trip.eggs) || {};
  return l.to_person === e.bday && e.bdayAge ? String(e.bdayAge) : initial(nameOf(l.to_person, '?'));
}
function sbWhen(ts) {
  var d = new Date(ts); if (isNaN(d)) return '';
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' a las ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

/* ---------- Datos ---------- */
function sbLoad(force) {
  if (!sbCloud()) return Promise.resolve();
  if (SB.loading || (!force && Date.now() - SB.at < 20000)) return Promise.resolve();
  SB.loading = true;
  if (!SB.ch) {
    SB.ch = true;
    /* el sobre programado aparece solo a su hora: se repasa cada 5 min y al volver a la app */
    setInterval(function () { sbLoad(true); }, 300000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) sbLoad(true); });
    try { CLOUD.sb().channel('letters').on('postgres_changes', { event: '*', schema: 'public', table: 'letters' }, function () { sbLoad(true); }).subscribe(); } catch (e) {}
  }
  return CLOUD.sb().from('letters').select('id,to_person,keeper,visible,shared,opened_at,visible_from,share_after').order('created_at').then(function (r) {
    SB.loading = false; SB.at = Date.now(); if (r.error) return;
    var before = JSON.stringify(SB.list); SB.list = r.data || [];
    if (JSON.stringify(SB.list) === before) return;
    if (SB.open && !sbLetter(SB.open.id)) { sobreClose(); return; }   /* te lo han quitado de la vista */
    if (SB.open) sbPanelSync();
    if (ui.tab === 'inicio' && !document.getElementById('scrim') && !SB.open) render(true);
  }, function () { SB.loading = false; SB.at = Date.now(); });
}
function sbBody(l) {
  if (SB.bodies[l.id]) return Promise.resolve(SB.bodies[l.id]);
  return CLOUD.sb().from('letter_bodies').select('body').eq('letter_id', l.id).maybeSingle().then(function (r) {
    if (r.error || !r.data) throw r.error || new Error('sin carta');
    SB.bodies[l.id] = r.data.body; return r.data.body;
  });
}
function sbSet(l, patch) {
  var old = {}; Object.keys(patch).forEach(function (k) { old[k] = l[k]; });
  Object.assign(l, patch);
  return CLOUD.sb().from('letters').update(patch).match({ id: l.id }).then(function (r) { if (r.error) throw r.error; }, function (e) { throw e; })
    .catch(function (e) { Object.assign(l, old); throw e; });
}

/* ---------- Dibujos ---------- */
function sbMiniEnv(mark) {
  return '<svg class="sb-mini" viewBox="0 0 64 46" aria-hidden="true"><rect x="2" y="3" width="60" height="40" rx="4" fill="#F2E8D8" stroke="#C9B79C" stroke-width="1.2"/>' +
    '<path d="M2.6 4 32 27 61.4 4" fill="#E8DAC2" stroke="#C9B79C" stroke-width="1.2" stroke-linejoin="round"/>' +
    '<circle cx="32" cy="26" r="9.5" fill="#B0122C"/><circle cx="32" cy="26" r="6.6" fill="none" stroke="rgba(255,255,255,.22)"/>' +
    '<text x="32" y="29.4" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="9" fill="#FFE9EC">' + esc(mark) + '</text></svg>';
}
/* lacre: borde irregular (siempre el mismo), relieve y la marca en el centro */
function sbWax(mark, uid) {
  var pts = [], n = 28;
  for (var i = 0; i < n; i++) {
    var a = Math.PI * 2 * i / n, r = 52 + Math.sin(i * 2.7) * 2.6 + Math.cos(i * 5.1) * 1.8;
    pts.push((60 + Math.cos(a) * r).toFixed(1) + ' ' + (60 + Math.sin(a) * r).toFixed(1));
  }
  var dots = [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { var a = Math.PI * 2 * i / 8 - Math.PI / 2; return '<circle cx="' + (60 + Math.cos(a) * 33).toFixed(1) + '" cy="' + (60 + Math.sin(a) * 33).toFixed(1) + '" r="1.9" fill="rgba(70,0,12,.45)"/>'; }).join('');
  return '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><radialGradient id="sbW' + uid + '" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#E5344F"/><stop offset=".45" stop-color="#B0122C"/><stop offset="1" stop-color="#5E0614"/></radialGradient></defs>' +
    '<path d="M' + pts.join(' L') + 'Z" fill="url(#sbW' + uid + ')"/>' +
    '<circle cx="60" cy="60" r="40" fill="none" stroke="rgba(60,0,10,.4)" stroke-width="3"/><circle cx="60.8" cy="60.8" r="40" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="1.2"/>' + dots +
    '<text x="61.2" y="72.2" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="36" fill="rgba(255,255,255,.2)">' + esc(mark) + '</text>' +
    '<text x="60" y="71" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="800" font-size="36" fill="rgba(70,0,14,.62)">' + esc(mark) + '</text>' +
    '<path class="sb-crack" pathLength="1" d="M60 8 L55 30 L65 44 L54 62 L66 80 L57 96 L61 112" fill="none" stroke="#2A0208" stroke-width="2.4" stroke-linejoin="round"/></svg>';
}
/* matasellos con la fecha del día grande (si lo hay) */
function sbPostmark() {
  var k = sbStarDay(), t = k ? k.slice(8, 10) + '·' + k.slice(5, 7) + '·' + k.slice(2, 4) : '';
  return '<svg class="sb-postmark" viewBox="0 0 150 70" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6">' +
    '<circle cx="40" cy="35" r="27"/><circle cx="40" cy="35" r="20"/>' +
    '<path d="M72 22c9-5 17 5 26 0s17 5 26 0 17 5 24 0M72 35c9-5 17 5 26 0s17 5 26 0 17 5 24 0M72 48c9-5 17 5 26 0s17 5 26 0 17 5 24 0"/></g>' +
    '<text x="40" y="39" text-anchor="middle" font-family="Bricolage Grotesque, system-ui, sans-serif" font-weight="700" font-size="10" fill="currentColor">' + esc(t) + '</text></svg>';
}
/* el regalo: torre + pantalla, con la pantalla escribiéndose sola */
function sbComputer() {
  return '<svg class="sb-pc" viewBox="0 0 360 232" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Un ordenador de torre con su pantalla, teclado y ratón">' +
    '<rect x="8" y="8" width="234" height="152" rx="10"/><rect class="sb-scr" x="20" y="20" width="210" height="122" rx="4" stroke-width="1.5"/>' +
    '<text id="sbT0" x="32" y="50" stroke="none" fill="#F3ECE8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13"></text>' +
    '<text id="sbT1" x="32" y="72" stroke="none" fill="#F3ECE8" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13"></text>' +
    '<text x="32" y="94" stroke="none" fill="#F6CD62" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13">&gt;</text><rect class="sb-cur" x="46" y="83" width="8" height="14" stroke="none" fill="#F6CD62"/>' +
    '<circle cx="125" cy="151" r="2.5" fill="currentColor" stroke="none"/><path d="M112 160 104 188M138 160l8 28"/><rect x="84" y="188" width="82" height="8" rx="4"/>' +
    '<rect x="36" y="204" width="160" height="16" rx="4"/><path d="M48 212h136" stroke-width="1.5" stroke-dasharray="6 4"/>' +
    '<rect x="208" y="200" width="16" height="22" rx="8"/><path d="M216 200v8" stroke-width="1.5"/><path d="M216 200c0-14 34-4 46-14" stroke-width="1.5"/>' +
    '<rect x="262" y="24" width="88" height="196" rx="8"/><rect x="274" y="40" width="64" height="12" rx="2" stroke-width="1.5"/><rect x="274" y="60" width="64" height="12" rx="2" stroke-width="1.5"/>' +
    '<path d="M278 110h56M278 120h56M278 130h56M278 140h56" stroke-width="1.5"/><circle class="sb-pwr" cx="306" cy="190" r="9"/><path d="M306 184v7" stroke-width="2"/><path d="M0 228h360" stroke-width="1.5"/></svg>';
}
/* red de nodos de la casa: la firma de los tres */
function sbNet() {
  return '<svg class="sb-net-rule" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden="true"><path d="M0 8h300" stroke="currentColor" stroke-width="1.2" vector-effect="non-scaling-stroke"/>' +
    [0, 70, 150, 230, 300].map(function (x) { return '<circle cx="' + x + '" cy="8" r="3.4" fill="currentColor"/>'; }).join('') + '</svg>';
}

/* ---------- Tarjeta en Inicio ---------- */
function sobreCard() {
  if (!sbCloud()) return '';
  sbLoad();
  return SB.list.map(function (l) {
    var to = person(l.to_person); if (!to) return '';
    var k = nameOf(l.keeper, 'quien tiene la llave'), mine = sbIsKeeper(l), forMe = l.to_person === ui.me;
    var title, txt, btn, pill = '';
    if (mine) {
      title = 'El sobre de ' + to.name;
      var vis = sbVisNow(l), sched = !vis && l.visible_from;
      txt = vis ? 'Todos ven el sobre cerrado. La llave solo la tienes tú.' : sched ? 'Secreto hasta el ' + sbWhen(l.visible_from) + '. Desde entonces lo verán todos, cerrado.' : 'Ahora mismo solo lo ves tú. Nadie más sabe que existe.';
      if (l.share_after && !l.shared) txt += ' Si lo abres a partir del ' + sbWhen(l.share_after) + ', se guardará para ' + to.name + '.';
      btn = 'Ver el sobre'; pill = '<span class="pill ' + (vis ? 'ok' : '') + '">' + (vis ? 'A la vista' : sched ? 'Programado' : 'Secreto') + '</span>';
    } else if (forMe && l.shared) { title = 'Tu carta'; txt = 'Ya es tuya. Ábrela y reléela cuando quieras.'; btn = 'Abrir mi carta'; }
    else if (forMe) { title = 'Hay un sobre para ti'; txt = 'Lacrado. La llave la tiene ' + k + ', así que toca esperar.'; btn = 'Ver el sobre'; }
    else { title = 'Un sobre lacrado para ' + to.name; txt = 'Solo ' + k + ' puede abrirlo. Mirarlo sí se puede.'; btn = 'Ver el sobre'; }
    return '<section class="card sb-card"><div class="sb-card-in">' + sbMiniEnv(sbMark(l)) +
      '<div class="grow"><div class="card-head"><h3>' + esc(title) + '</h3>' + pill + '</div><p class="small muted">' + esc(txt) + '</p>' +
      (mine && l.opened_at ? '<p class="small muted">Abierto de verdad el ' + esc(sbWhen(l.opened_at)) + '.</p>' : '') + '</div></div>' +
      '<button class="btn primary block" data-act="sbOpen" data-id="' + esc(l.id) + '">' + icon('mail') + esc(btn) + '</button></section>';
  }).join('');
}

/* ---------- El escenario ---------- */
function sbStageHtml(l) {
  var to = person(l.to_person) || { name: '' }, mark = sbMark(l), k = sbStarDay();
  var sub = k ? 'Abrir el ' + L.ddmm(k) + '. Ni un minuto antes.' : 'Frágil: contiene cariño.';
  return '<div class="sb-sky" aria-hidden="true"></div>' +
    '<button type="button" class="sb-x" data-act="sbClose" aria-label="Cerrar el sobre">' + icon('x') + '</button>' +
    '<div class="sb-scene" id="sbScene">' +
      '<div class="sb-env" id="sbEnv">' +
        '<div class="sb-card3d" id="sbCard">' +
          '<div class="sb-face sb-front">' +
            '<div class="sb-stamp"><div class="sb-stamp-in">' + sbAv(l.to_person, 'sb-stamp-av') + '<b>' + esc(mark) + '</b></div></div>' +
            sbPostmark() +
            '<div class="sb-addr"><small>Para</small><b>' + esc(to.name) + '</b><svg class="sb-uline" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8c30-6 60 4 95-1s70-5 101 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span>' + esc(sub) + '</span></div>' +
            '<button type="button" class="sb-flip" data-act="sbFlip" aria-label="Darle la vuelta al sobre"></button>' +
          '</div>' +
          '<div class="sb-face sb-backf">' +
            '<div class="sb-inside"></div>' +
            '<div class="sb-letter" id="sbLetter"><small id="sbTeaseK"></small><b id="sbTeaseT"></b>' + sbNet() + '</div>' +
            '<div class="sb-pocket"></div>' +
            '<div class="sb-flap" id="sbFlap"><div class="sb-flap-out"></div><div class="sb-flap-in"></div></div>' +
            '<button type="button" class="sb-seal" id="sbSeal" aria-label="' + (sbCanRead(l) ? 'Mantén pulsado el lacre para abrir el sobre' : 'Lacre del sobre') + '">' +
              '<span class="sb-wax sb-wax-l">' + sbWax(mark, 'a') + '</span><span class="sb-wax sb-wax-r">' + sbWax(mark, 'b') + '</span>' +
              '<svg class="sb-ring" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="64" class="sb-ring-bg"/><circle cx="70" cy="70" r="64" class="sb-ring-fill" id="sbRing"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="sb-hint" id="sbHint" aria-live="polite">Toca el sobre para darle la vuelta</p>' +
    '</div>' +
    '<div class="sb-eleven" id="sbEleven" aria-hidden="true"></div>' +
    '<div class="sb-read" id="sbRead" hidden></div>';
}
function sobreOpen(id, replay) {
  var l = sbLetter(id); if (!l) return;
  sobreClose(true, replay);
  var st = document.createElement('div');
  st.id = 'sobre'; st.className = 'sobre' + (sbReduce() ? ' calm' : '');
  st.setAttribute('role', 'dialog'); st.setAttribute('aria-modal', 'true'); st.setAttribute('aria-label', 'Sobre para ' + nameOf(l.to_person));
  st.innerHTML = sbStageHtml(l);
  document.body.appendChild(st);
  document.body.classList.add('sobre-on'); document.body.style.overflow = 'hidden';
  if (!replay) overlayPush('sobre');
  SB.open = { id: l.id, phase: 'front' }; SB.tries = 0;
  sbBindSeal(st, l);
  document.addEventListener('keydown', sbKey);
  if (sbCanRead(l)) sbBody(l).then(sbTease, function () {});
  setTimeout(function () { var b = st.querySelector('.sb-flip'); if (b) b.focus(); }, 60);
}
function sbTease(b) {
  var k = document.getElementById('sbTeaseK'), t = document.getElementById('sbTeaseT');
  if (k) k.textContent = b.kicker || ''; if (t) t.textContent = b.title || '';
}
function sbKey(e) { if (e.key === 'Escape' && SB.open) sobreClose(); }
function sobreClose(fromPop, quiet) {
  var st = document.getElementById('sobre');
  SB.timers.forEach(clearTimeout); SB.timers = [];
  if (SB.typeT) { clearInterval(SB.typeT); SB.typeT = null; }
  if (SB.io) { SB.io.disconnect(); SB.io = null; }
  document.removeEventListener('keydown', sbKey);
  if (!st) { SB.open = null; return; }
  st.remove(); SB.open = null;
  document.body.classList.remove('sobre-on'); document.body.style.overflow = '';
  if (fromPop !== true) overlayDone();
  if (ui.tab === 'inicio' && !quiet) render(true);
}
function sbHint(t) { var h = document.getElementById('sbHint'); if (h) h.textContent = t; }

/* 1) darle la vuelta */
function sbFlip() {
  if (!SB.open || SB.open.phase !== 'front') return;
  var l = sbLetter(SB.open.id), env = document.getElementById('sbEnv'); if (!l || !env) return;
  SB.open.phase = 'flipping';
  env.classList.add('flipped'); sbVibe(10); sbRustle(.18);
  sbLater(function () {
    env.classList.add('is-back'); SB.open.phase = 'back';
    sbHint(sbCanRead(l) ? 'Mantén pulsado el lacre para romperlo' : l.to_person === ui.me ? 'Es para ti, pero la llave la tiene ' + nameOf(l.keeper) + '. Ya queda poco.' : 'Lacrado. Solo ' + nameOf(l.keeper) + ' tiene la llave.');
    var s = document.getElementById('sbSeal'); if (s) s.focus();
  }, sbReduce() ? 60 : 820);
}
/* 2) mantener pulsado el lacre */
function sbBindSeal(st, l) {
  var seal = st.querySelector('#sbSeal'), ring = st.querySelector('#sbRing'), C = 2 * Math.PI * 64, raf = 0, t0 = 0;
  var hold = sbReduce() ? 450 : SB_HOLD;
  ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C;
  function reset() { cancelAnimationFrame(raf); raf = 0; seal.classList.remove('holding'); ring.style.strokeDashoffset = C; seal.style.removeProperty('--k'); }
  function step() {
    var k = Math.min(1, (performance.now() - t0) / hold);
    ring.style.strokeDashoffset = C * (1 - k); seal.style.setProperty('--k', k.toFixed(3));
    if (k >= 1) { raf = 0; seal.classList.remove('holding'); sbBreak(l); return; }
    raf = requestAnimationFrame(step);
  }
  seal.addEventListener('pointerdown', function (e) {
    if (!SB.open || SB.open.phase !== 'back') return;
    e.preventDefault();
    if (!sbCanRead(l)) { sbNope(l); return; }
    try { seal.setPointerCapture(e.pointerId); } catch (x) {}
    t0 = performance.now(); seal.classList.add('holding'); sbVibe(8); raf = requestAnimationFrame(step);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { seal.addEventListener(ev, function () { if (raf) reset(); }); });
  seal.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  /* teclado y lectores de pantalla: Intro o Espacio abren directamente */
  seal.addEventListener('click', function (e) {
    if (e.detail !== 0 || !SB.open || SB.open.phase !== 'back') return;
    if (sbCanRead(l)) sbBreak(l); else sbNope(l);
  });
}
var SB_NOPE = [
  'Lacrado. Solo {k} tiene la llave.',
  'Que no. Que es lacre del bueno.',
  'Insistir no funciona. Lo han probado otros antes que tú.',
  'Tu intento ha quedado anotado. Es broma. O no.',
  'Ni con súplicas. Ni con croquetas. Bueno, con croquetas a lo mejor.'
];
function sbNope(l) {
  var s = document.getElementById('sbSeal'); if (!s) return;
  s.classList.remove('nope'); void s.offsetWidth; s.classList.add('nope');
  sbVibe([30, 40, 30]); sbThud();
  sbHint(SB_NOPE[Math.min(SB.tries++, SB_NOPE.length - 1)].replace('{k}', nameOf(l.keeper)));
}
/* 3) se rompe el lacre, se abre la solapa, sale la carta */
function sbBreak(l) {
  if (!SB.open || SB.open.phase !== 'back') return;
  SB.open.phase = 'opening';
  var env = document.getElementById('sbEnv'), seal = document.getElementById('sbSeal'), calm = sbReduce();
  seal.classList.add('cracking'); sbHint('');
  sbBody(l).then(function (b) {
    sbTease(b);
    sbCrack(); sbVibe([18, 30, 60]);
    seal.classList.add('broken');
    if (sbIsKeeper(l) && sbIsReal(l)) {
      var up = {};
      if (!l.opened_at) up.opened_at = new Date().toISOString();
      if (l.share_after && !l.shared) up.shared = true;   /* el momento de verdad: la carta pasa a ser suya */
      if (Object.keys(up).length) sbSet(l, up).then(sbPanelSync, function () {});
    }
    sbLater(function () { env.classList.add('open'); sbRustle(.35); }, calm ? 80 : 380);
    sbLater(function () { env.classList.add('flap-back'); }, calm ? 120 : 900);
    sbLater(function () { env.classList.add('rise'); sbRustle(.5); }, calm ? 160 : 1050);
    sbLater(function () { sbReveal(l, b); }, calm ? 500 : 2150);
  }, function () {
    seal.classList.remove('cracking'); SB.open.phase = 'back';
    sbHint('No se ha podido abrir. Revisa la conexión y vuelve a intentarlo.');
  });
}
/* 4) la carta, a lo grande */
function sbReveal(l, b) {
  var st = document.getElementById('sobre'), read = document.getElementById('sbRead'), env = document.getElementById('sbEnv');
  if (!st || !read) return;
  SB.open.phase = 'reading';
  env.classList.add('away'); st.classList.add('reading');
  read.innerHTML = sbReadHtml(l, b); read.hidden = false; read.scrollTop = 0;
  requestAnimationFrame(function () { read.classList.add('in'); });
  var el = document.getElementById('sbEleven');
  if (el && b.age && !sbReduce()) { el.textContent = b.age; el.classList.remove('go'); void el.offsetWidth; el.classList.add('go'); }
  try { tada(true); } catch (e) {}
  if (!sbReduce()) { try { cannonsFx(150); } catch (e) {} try { confetti(3200); } catch (e) {} }
  sbVibe([0, 40, 60, 40]);
  sbLater(function () { sbType(b.screen || []); }, sbReduce() ? 0 : 1100);
  sbObserve(read);
  var x = st.querySelector('.sb-x'); if (x) x.focus();
}
function sbReadHtml(l, b) {
  var v = b.voucher || null, keeper = sbIsKeeper(l), to = person(l.to_person) || { name: '' };
  var from = (b.from || []).filter(function (f) { return person(f.pid); });
  var h = '<article class="sb-paper">' +
    '<header class="sb-head">' + (b.age ? '<span class="sb-age" aria-hidden="true">' + esc(b.age) + '</span>' : '') +
      (b.kicker ? '<p class="sb-kicker">' + esc(b.kicker) + '</p>' : '') + '<h1>' + esc(b.title || '') + '</h1>' + sbNet() + '</header>' +
    '<figure class="sb-fig">' + sbComputer() + '</figure>' +
    '<div class="sb-text">' + (b.greeting ? '<p class="sb-greet">' + esc(b.greeting) + '</p>' : '') +
      (b.paragraphs || []).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      (b.closing ? '<p class="sb-close">' + esc(b.closing) + '</p>' : '') + '</div>';
  if (v) {
    h += '<section class="sb-ticket sb-reveal" aria-label="' + esc((v.label || '') + ' ' + (v.title || '')) + '">' +
      '<div class="sb-tk-top"><div class="sb-tk-meta"><span>' + esc(v.label || '') + '</span><span class="sb-tk-no">' + esc(v.number || '') + '</span></div><p class="sb-tk-title">' + esc(v.title || '') + '</p></div>' +
      '<dl class="sb-tk-rows">' + (v.rows || []).map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
      (v.stamp ? '<span class="sb-ink" aria-hidden="true">' + esc(v.stamp) + '</span>' : '') + '</section>';
  }
  if (b.fine && b.fine.length) h += '<section class="sb-fine"><h2>Letra pequeña</h2><ul>' + b.fine.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul></section>';
  if (from.length) {
    var n = from.length, xs = from.map(function (_, i) { return Math.round((i + .5) * 300 / n); });
    h += '<section class="sb-from sb-reveal">' + (b.signoff ? '<p class="sb-signoff">' + esc(b.signoff) + '</p>' : '') +
      '<div class="sb-trio" style="--n:' + n + '">' +
        '<svg class="sb-links" viewBox="0 0 300 120" preserveAspectRatio="none" aria-hidden="true">' +
          (n > 1 ? '<path d="M' + xs.map(function (x) { return x + ' 42'; }).join(' L') + '" pathLength="1"/>' : '') +
          (n > 2 ? '<path d="M' + xs[0] + ' 42 Q150 -26 ' + xs[n - 1] + ' 42" pathLength="1"/>' : '') + '</svg>' +
        from.map(function (f, i) {
          return '<div class="sb-who" style="--i:' + i + '">' + sbAv(f.pid, 'sb-who-av') + '<b>' + esc(f.label || nameOf(f.pid)) + '</b>' +
            (f.note ? '<svg class="sb-scribble" viewBox="0 0 120 34" aria-hidden="true"><path pathLength="1" d="M4 22c8-14 14-16 16-6s-6 14 2 8 12-20 18-12-4 18 6 10 10-18 16-10-2 14 8 8 12-14 18-8 4 10 14 4 10-8 14-6"/></svg><small>' + esc(f.note) + '</small>' : '') + '</div>';
        }).join('') +
      '</div></section>';
  }
  h += '</article>';
  if (keeper) {
    h += '<section class="sb-keeper"><h2>' + icon('key') + 'La llave la tienes tú</h2>' +
      '<button type="button" class="sb-sw" id="sbVis" data-act="sbVis" aria-pressed="' + sbVisNow(l) + '"><span class="grow"><b>Sobre a la vista de todos</b><small id="sbVisNote">' + esc(sbVisNote(l)) + '</small></span><i aria-hidden="true"></i></button>' +
      '<button type="button" class="sb-sw" id="sbShare" data-act="sbShare" aria-pressed="' + !!l.shared + '"><span class="grow"><b>Guardar la carta para ' + esc(to.name) + '</b><small id="sbShareNote">' + esc(sbShareNote(l)) + '</small></span><i aria-hidden="true"></i></button>' +
      '<p class="sb-k-when" id="sbWhen">' + esc(sbWhenNote(l)) + '</p>' +
      '<div class="sb-k-btns"><button type="button" class="sb-btn" data-act="sbReplay">Repetir la ceremonia</button><button type="button" class="sb-btn solid" data-act="sbClose">Cerrar</button></div></section>';
  } else {
    h += '<div class="sb-k-btns solo"><button type="button" class="sb-btn" data-act="sbReplay">Volver a abrirla</button><button type="button" class="sb-btn solid" data-act="sbClose">Cerrar</button></div>';
  }
  return h;
}
/* la pantalla del ordenador se escribe sola */
function sbType(lines) {
  var els = [document.getElementById('sbT0'), document.getElementById('sbT1')], li = 0, ci = 0;
  if (!els[0]) return;
  if (sbReduce()) { lines.slice(0, 2).forEach(function (t, i) { els[i].textContent = '> ' + t; }); return; }
  SB.typeT = setInterval(function () {
    if (li >= Math.min(2, lines.length)) { clearInterval(SB.typeT); SB.typeT = null; return; }
    var t = '> ' + lines[li]; ci++;
    els[li].textContent = t.slice(0, ci);
    if (ci >= t.length) { li++; ci = 0; }
  }, 62);
}
/* el sello «canjeable» y la firma de los tres entran al llegar a ellos */
function sbObserve(root) {
  var items = root.querySelectorAll('.sb-reveal');
  if (!('IntersectionObserver' in window) || sbReduce()) { items.forEach(function (x) { x.classList.add('in'); }); return; }
  SB.io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('in'); SB.io.unobserve(e.target);
      if (e.target.classList.contains('sb-ticket')) setTimeout(function () { sbThud(); sbVibe(25); }, 520);
    });
  }, { root: root, threshold: .55 });
  items.forEach(function (x) { SB.io.observe(x); });
}
function sbVisNote(l) {
  if (sbVisNow(l)) return 'Lo ven cerrado en su Inicio. Abrirlo, solo tú.';
  if (l.visible_from) return 'Programado: aparecerá solo el ' + sbWhen(l.visible_from) + '.';
  return 'Ahora es secreto. Actívalo y lo verán cerrado en su Inicio.';
}
function sbShareNote(l) {
  var n = nameOf(l.to_person);
  if (l.shared) return n + ' puede abrirla y releerla desde su móvil.';
  if (l.share_after) return 'Se guardará sola al abrirla a partir del ' + sbWhen(l.share_after) + '.';
  return 'Podrá abrirla y releerla desde su móvil.';
}
function sbWhenNote(l) {
  if (l.opened_at) return 'Abierto de verdad el ' + sbWhen(l.opened_at) + '.';
  if (l.share_after && !sbIsReal(l)) return 'Modo ensayo: hasta el ' + sbWhen(l.share_after) + ', abrirlo no cuenta y la carta no se le guarda a nadie.';
  return '';
}
function sbPanelSync() {
  var l = SB.open && sbLetter(SB.open.id); if (!l) return;
  var v = document.getElementById('sbVis'), s = document.getElementById('sbShare'), w = document.getElementById('sbWhen');
  var vn = document.getElementById('sbVisNote'), sn = document.getElementById('sbShareNote');
  if (v) v.setAttribute('aria-pressed', sbVisNow(l));
  if (s) s.setAttribute('aria-pressed', !!l.shared);
  if (vn) vn.textContent = sbVisNote(l);
  if (sn) sn.textContent = sbShareNote(l);
  if (w) w.textContent = sbWhenNote(l);
}

/* ---------- Sonidos (sintetizados, sin archivos) ---------- */
function sbAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch (e) { return null; } }
function sbNoise(dur, freq, q, vol, type) {
  var a = sbAudio(); if (!a) return;
  try {
    var len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    src.connect(f); f.connect(g); g.connect(a.destination); src.start();
  } catch (e) {}
}
function sbCrack() { sbNoise(.09, 2600, .8, .5, 'highpass'); setTimeout(function () { sbNoise(.22, 900, 1.4, .35); }, 40); sbThud(); }
function sbRustle(dur) { sbNoise(dur || .4, 3200, .6, .12); }
function sbThud() {
  var a = sbAudio(); if (!a) return;
  try {
    var t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(48, t + .18);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.32, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + .22);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + .25);
  } catch (e) {}
}

/* ---------- Acciones ---------- */
Object.assign(A, {
  sbOpen: function (el) { sbAudio(); sobreOpen(el.dataset.id); },
  sbClose: function () { sobreClose(); },
  sbFlip: function () { sbFlip(); },
  sbReplay: function () { var id = SB.open && SB.open.id; if (id) sobreOpen(id, true); },
  sbVis: function () {
    var l = SB.open && sbLetter(SB.open.id); if (!l || !sbIsKeeper(l)) return;
    var on = !sbVisNow(l);   /* apagarlo también cancela la hora programada */
    sbSet(l, on ? { visible: true } : { visible: false, visible_from: null }).then(function () {
      sbPanelSync(); toast(on ? 'Sobre a la vista: todos lo ven cerrado' : 'Sobre escondido: vuelve a ser secreto');
    }, function () { sbPanelSync(); toast('No se ha podido cambiar. Revisa la conexión'); });
    sbPanelSync();
  },
  sbShare: function () {
    var l = SB.open && sbLetter(SB.open.id); if (!l || !sbIsKeeper(l)) return;
    var who = nameOf(l.to_person);
    sbSet(l, { shared: !l.shared }).then(function () {
      sbPanelSync(); toast(l.shared ? 'Guardada: ' + esc(who) + ' ya puede abrirla cuando quiera' : 'Retirada: vuelve a ser solo tuya');
    }, function () { sbPanelSync(); toast('No se ha podido cambiar. Revisa la conexión'); });
    sbPanelSync();
  }
});
