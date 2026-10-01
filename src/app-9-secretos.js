/* ===================== Secretos de la casa =====================
   Cada persona tiene los suyos (se guardan por persona en su dispositivo; la nube solo recibe CUÁNTOS lleva).
   Misión: desbloquearlos todos sin contárselo a nadie. 3 pistas extra por persona, en total.
   El ranking se cierra el domingo a las 11:00 y avisa a todos 2 horas antes. */
var SECRETS_CLOSE = '2026-10-11T11:00:00+02:00', SECRETS_WARN_MIN = 120, SECRETS_HINTS = 3;
var EGGS = [];
function secretsCloseIso() { var e = S && S.trip && S.trip.eggs; return (e && e.close) || SECRETS_CLOSE; }
function secretsClose() { return new Date(secretsCloseIso()); }
function secretsClosed() { return Date.now() >= secretsClose().getTime(); }
function closeHour() { return secretsCloseIso().slice(11, 16); }
function fmtClose() { var d = dayOf(secretsCloseIso().slice(0, 10)); return (d && d.long ? d.long.toLowerCase() : 'domingo') + ' a las ' + closeHour(); }
function buildEggs() {
  var g = ((S.trip.eggs && S.trip.eggs.grand) || []).map(function (id) { return nameOf(id); }).filter(Boolean).join(' o a ');
  var b = babyName(), c = bdayName();
  EGGS = [
    /* Para empezar: conocer la app */
    { k: 'curioso', name: 'Curiosidad', how: 'Abrir los Secretos de la casa', hint: 'El primer secreto es saber que hay secretos', more: 'Ya lo tienes: abrir esta lista' },
    { k: 'manual', name: 'Empollón', how: 'Llegar hasta el final del Manual de uso', hint: 'Quien lee las instrucciones hasta el final…', more: 'Inicio → Manual de uso, y baja hasta abajo del todo' },
    { k: 'dias', name: 'Presente', how: 'Tocar uno de tus días en Familia', hint: 'Pasar lista', more: 'Pestaña Familia → Quién viene: toca uno de tus días' },
    { k: 'wifi', name: 'Conectados', how: 'Copiar la contraseña del Wi-Fi de la finca', hint: 'Sin esto, ni los abuelos ven el tiempo', more: 'Pestaña La Finca → Práctico → toca el Wi-Fi' },
    { k: 'meteo', name: 'Hombre del tiempo', how: 'Abrir el detalle de El tiempo', hint: 'Mira al cielo… desde la app', more: 'En Inicio, la tarjeta del tiempo → Detalle' },
    { k: 'noche', name: 'El lado oscuro', how: 'Activar el modo oscuro', hint: 'Apaga la luz', more: 'Toca tu nombre arriba a la derecha y busca el tema' },
    { k: 'apunto', name: 'Me apunto', how: 'Dar un corazón a un plan', hint: 'Los planes también se quieren', more: 'En Planes, el corazón de cualquier actividad' },
    { k: 'ojeador', name: 'Ojeador', how: 'Abrir un marcador desde Planes', hint: 'Algunos planes esconden un marcador', more: 'En Planes, busca «Marcador» en una actividad con juego' },
    { k: 'jurado', name: 'Jurado popular', how: 'Votar en un premio', hint: 'Tu voto cuenta', more: 'Juegos → Premios → uno que se vote' },
    { k: 'foto', name: 'Primera foto', how: 'Subir una foto al álbum', hint: 'Sonría, por favor', more: 'La cámara de arriba → Subir fotos' },
    { k: 'corazon', name: 'Corazón de oro', how: 'Dar un corazón a una foto', hint: 'Un poco de amor para el álbum', more: 'Abre una foto del álbum y toca el corazón' },
    /* Toques escondidos */
    { k: 'omnes', name: 'Toc, toc', how: 'Llamar a la puerta de la casita (tocar el logo)', hint: 'La casa esconde algo', more: 'Toca la casita de arriba a la izquierda o el título grande de Inicio' },
    { k: 'bday', name: 'Cumpleañero', how: 'Tocar 5 veces a ' + c + ' (o abrir la app el día de la fiesta)', hint: 'Alguien cumple años', more: 'En la pestaña Familia, toca su foto 5 veces seguidas' },
    { k: 'baby', name: 'Modo ' + b, how: 'Tocar 3 veces a ' + b + ' o «Menú ' + b + '»', hint: 'El más pequeño esconde algo', more: 'En Comidas, toca 3 veces «Menú ' + b + '»' },
    { k: 'pop', name: 'Explotaburbujas', how: 'Explotar 15 burbujas en modo ' + b, hint: 'Ploc, ploc, ploc', more: 'Primero activa el modo ' + b + ' y luego a por las burbujas' },
    { k: 'abuelo', name: 'Letra de abuelo', how: 'Tocar 3 veces a ' + (g || 'los abuelos'), hint: 'Los abuelos ven de maravilla… con ayuda', more: 'En la pestaña Familia, toca 3 veces la foto de un abuelo' },
    { k: 'sol', name: 'Invocar al sol', how: 'Tocar 5 veces el título del tiempo', hint: 'Si llueve, pídeselo al cielo', more: 'En Inicio, el título «El tiempo en la finca»' },
    { k: 'disco', name: 'Modo fiesta', how: 'Tocar 3 veces la cuenta atrás', hint: 'La cuenta atrás también sabe bailar', more: 'En Inicio, los números de la cuenta atrás' },
    { k: 'himno', name: 'Himno de la casa', how: 'Tocar 3 veces al líder en lo alto del podio', hint: 'El número 1 merece música', more: 'Juegos → Ranking, el primero del podio' },
    { k: 'abumetro', name: 'Abuelómetro al rojo', how: 'Tocar 3 veces el Abuelómetro', hint: 'Hay un medidor de abuelos', more: 'Cuentas → El rincón de los abuelos' },
    /* Palabras mágicas */
    { k: 'papa', name: 'Habemus papam', how: 'Buscar «habemus» en la lista de la compra', hint: 'Una palabra en latín, en el buscador', more: 'En Compra, escribe en el buscador una palabra de cónclave' },
    { k: 'salud', name: '¡Salud!', how: 'Buscar «salud» en la compra (o pedirse la bebida)', hint: 'Algo para brindar', more: 'En el buscador de Compra, lo que se dice al brindar' },
    /* A su hora */
    { k: 'buho', name: 'Noctámbulo', how: 'Abrir la app entre las 00:00 y las 05:00', hint: 'A deshoras', more: 'Cuando todos duermen…' },
    { k: 'deseo', name: '11:11', how: 'Tener la app abierta a las 11:11', hint: 'Una hora con los números de ' + c, more: 'Mañana o noche, cuando el reloj marque cuatro unos' },
    { k: 'zero', name: '¡Ya estamos aquí!', how: 'Abrir la app cuando ya estamos en la finca', hint: 'Cuando la cuenta atrás llega a cero', more: 'Abre la app durante el finde' },
    { k: 'quorum', name: 'Habemus quórum', how: 'Coincidir 6 o más personas conectadas a la vez', hint: 'Cuanta más familia, mejor', more: 'Mira arriba quién está conectado: hacen falta 6 a la vez' },
    /* Cuando pasa algo en la familia */
    { k: 'fumata', name: 'Habemus compra', how: 'Ver la lista de la compra completa', hint: 'Cuando no quede nada sin dueño…', more: 'Entra en Compra cuando todos los productos tengan dueño' },
    { k: 'claras', name: 'Cuentas claras', how: 'Ver la liquidación a cero con gastos apuntados', hint: 'Nadie debe nada a nadie', more: 'Entra en Cuentas cuando ya no quede ninguna transferencia pendiente' },
    { k: 'trophy', name: 'Campeón', how: 'Ver el trofeo de un campeón', hint: 'Solo puede quedar uno', more: 'Cuando acabe una eliminatoria, abre el juego y toca «Ver trofeo»' },
    { k: 'habemus', name: 'Habemus campeón', how: 'Entrar en Juegos con todos los juegos terminados', hint: 'Cuando no quede ni un juego por jugar', more: 'El último día, pásate por Juegos' },
    { k: 'gala', name: 'Noche de los Óscar', how: 'Ver la gala de premios hasta el final', hint: 'Hay una gala esperando', more: 'Juegos → Premios → Gala de premios, hasta la última' },
    { k: 'album', name: 'Paparazzi en serie', how: 'Ver el álbum con 50 fotos o más', hint: 'Una imagen vale más que mil palabras. Cincuenta, más aún', more: 'Entre todos, llegad a 50 fotos en el álbum' }
  ];
}

/* ----- Almacén por persona ----- */
function eggKey() { return KEY + '-eggs2-' + (ui.me || 'anon'); }
function hintKey() { return KEY + '-hints2-' + (ui.me || 'anon'); }
function readJ(k, mem) { try { var v = JSON.parse(localStorage.getItem(k)); if (v) return v; } catch (e) {} return (ui[mem] && ui[mem][ui.me]) || {}; }
function writeJ(k, mem, v) { ui[mem] = ui[mem] || {}; ui[mem][ui.me] = v; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function foundMap() { return readJ(eggKey(), '_eggs'); }
function hintsMap() { return readJ(hintKey(), '_hints'); }
function hasEgg(k) { return !!foundMap()[k]; }
function foundCount() { var f = foundMap(); return EGGS.filter(function (e) { return f[e.k]; }).length; }
/* Lo que cuenta para el ranking: lo descubierto antes del cierre */
function rankedCount() { var f = foundMap(), c = secretsClose().getTime(); return EGGS.filter(function (e) { return f[e.k] && new Date(f[e.k]).getTime() < c; }).length; }
function egg(k, quiet) {
  var f = foundMap(); if (f[k]) return false;
  var e = EGGS.find(function (x) { return x.k === k; }); if (!e) return false;
  f[k] = new Date().toISOString(); writeJ(eggKey(), '_eggs', f);
  var n = foundCount(), all = n === EGGS.length, late = secretsClosed();
  /* los secretos «silenciosos» (sin efecto propio) también tienen su gran momento */
  if (!quiet) revealSecret(e, { title: e.name, text: 'Lo has encontrado: ' + e.how.charAt(0).toLowerCase() + e.how.slice(1) + '.' });
  if (all && !late) revealSecret(null, { trophy: true });
  try { if (window.CLOUD && CLOUD.pingNow) CLOUD.pingNow(); } catch (x) {}
  return true;
}

/* ===== La revelación: una tarjeta grande, con fuegos, anillo de progreso y en cola (nunca se pisan) ===== */
var revealQ = [], revealOn = false;
function revealSecret(e, o) { revealQ.push({ e: e, o: o || {}, n: foundCount() }); if (!revealOn) { revealOn = true; setTimeout(revealNext, 60); } }
function revealNext() {
  var it = revealQ.shift(); if (!it) { revealOn = false; return; }
  document.querySelectorAll('.egg-msg').forEach(function (x) { x.remove(); });
  var o = it.o, n = it.n, N = EGGS.length, trophy = !!o.trophy;
  var C = 2 * Math.PI * 46, from = C * (1 - Math.max(0, n - 1) / N), to = C * (1 - n / N);
  var veil = document.createElement('div'); veil.className = 'egg-veil reveal-veil'; document.body.appendChild(veil);
  var m = document.createElement('div'); m.className = 'egg-msg egg-reveal' + (trophy ? ' is-trophy' : ''); m.setAttribute('role', 'dialog'); m.setAttribute('aria-live', 'assertive');
  m.innerHTML = '<div class="inner">' +
    '<div class="rv-seal"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="rv-track" cx="50" cy="50" r="46"/><circle class="rv-ring" cx="50" cy="50" r="46" style="stroke-dasharray:' + C.toFixed(1) + ';stroke-dashoffset:' + from.toFixed(1) + '"/></svg>' +
      '<div class="rv-core">' + (trophy ? icon('trophy') : '<b class="num">' + n + '</b><small>de ' + N + '</small>') + '</div></div>' +
    '<span class="egg-badge">' + (trophy ? 'Los ' + N + ' de ' + N : 'Secreto desbloqueado') + '</span>' +
    (o.top ? '<div class="rv-top">' + o.top + '</div>' : '') +
    '<h2>' + (trophy ? 'Guardián de los Secretos' : o.title) + '</h2>' +
    '<p>' + (trophy ? 'Los has encontrado todos. Trofeo asegurado en la gala… y ni una palabra a nadie, que te conocemos.' : o.text) + '</p>' +
    (it.e && it.e.name !== o.title ? '<small class="rv-name">«' + esc(it.e.name) + '»</small>' : '') +
    '<div class="rv-actions"><button class="btn primary" data-rv="ok">¡Toma ya!</button><button class="btn ghost" data-rv="see">Mis secretos</button></div>' +
    '<small class="egg-hush">' + (secretsClosed() ? 'El ranking ya está cerrado: este no suma' : 'Chitón: que cada uno encuentre los suyos') + '</small></div>';
  document.body.appendChild(m);
  var show = function () { if (m.classList.contains('in')) return; var r = m.querySelector('.rv-ring'); if (r) r.style.strokeDashoffset = to.toFixed(1); m.classList.add('in'); };
  requestAnimationFrame(function () { requestAnimationFrame(show); }); setTimeout(show, 120);
  try { fireworks(trophy ? 7000 : 4600, trophy ? 14 : 7); } catch (x) {}
  if (navigator.vibrate) try { navigator.vibrate(trophy ? [20, 60, 20, 60, 40] : [14, 50, 14]); } catch (x) {}
  var born = Date.now(), gone = false, tm;
  function close(then) {
    if (gone) return; gone = true; clearTimeout(tm);
    m.classList.add('out'); veil.classList.add('out');
    setTimeout(function () { m.remove(); veil.remove(); if (then) then(); if (o.after) try { o.after(); } catch (x) {} setTimeout(revealNext, revealQ.length ? 220 : 0); }, 380);
  }
  m.addEventListener('click', function (ev) {
    var b = ev.target.closest('[data-rv]'); ev.stopPropagation();
    if (b && b.dataset.rv === 'see') { close(function () { if (typeof secretsSheet === 'function') secretsSheet(); }); return; }
    if (b || Date.now() - born > 1200) close();
  });
  tm = setTimeout(close, trophy ? 9000 : 6500);
}
/* Un secreto con efecto: si es nuevo, revelación completa; si ya lo tenías, solo el efecto con su frase */
function eggCard(k, title, text, top, ms) {
  var isNew = egg(k, true), e = EGGS.find(function (x) { return x.k === k; });
  if (isNew) revealSecret(e, { title: title, text: text, top: top });
  else message((top || '') + '<h2>' + title + '</h2><p>' + text + '</p>', ms || 4200);
}
/* Secreto con efecto interactivo (burbujas, discoteca…): primero la revelación y, al cerrarla, el efecto */
function eggThen(k, title, text, fn) {
  var isNew = egg(k, true), e = EGGS.find(function (x) { return x.k === k; });
  if (isNew) revealSecret(e, { title: title, text: text, after: fn });
  else { fn(); toast(text); }
}
function eggToast(k, text) {
  var isNew = egg(k, true), e = EGGS.find(function (x) { return x.k === k; });
  if (isNew) revealSecret(e, { title: e ? e.name : '¡Secreto!', text: text });
  else toast(text);
}

/* ----- Pistas extra: 3 por persona en total ----- */
function hintsLeft() { return Math.max(0, SECRETS_HINTS - Object.keys(hintsMap()).length); }

/* ----- Ranking (la nube solo sabe cuántos lleva cada uno) ----- */
function secretsRanking() {
  var st = S.stats || {}, rows = {};
  Object.keys(st).forEach(function (pid) { if (person(pid) && (st[pid].eggs || 0) > 0) rows[pid] = st[pid].eggs; });
  rows[ui.me] = rankedCount();   /* lo mío, siempre al día desde este dispositivo */
  var arr = Object.keys(rows).map(function (pid) { return { id: pid, n: Math.min(rows[pid], EGGS.length) }; }).filter(function (r) { return r.n > 0 || r.id === ui.me; });
  arr.sort(function (a, b) { return b.n - a.n || String(pname(a.id)).localeCompare(String(pname(b.id))); });
  var pos = 0, last = -1; arr.forEach(function (r, i) { if (r.n !== last) { pos = i + 1; last = r.n; } r.pos = pos; });
  return arr;
}
function secretsSheet() {
  egg('curioso');
  var f = foundMap(), h = hintsMap(), left = hintsLeft(), closed = secretsClosed(), rk = secretsRanking(), n = foundCount();
  var mine = rk.find(function (r) { return r.id === ui.me; });
  var html = '<h2>Secretos de la casa</h2>' +
    '<div class="card wood small sec-mission"><p><b>Tu misión:</b> desbloquear los ' + EGGS.length + ' secretos <b>sin contárselo a nadie</b>. Cada uno tiene los suyos y están repartidos por toda la app.</p>' +
    '<p>' + (closed ? '<b>El ranking se cerró</b> el ' + esc(fmtClose()) + '. Lo que descubras ahora ya no suma.' : 'El ranking se cierra el <b>' + esc(fmtClose()) + '</b> (2 horas antes sonará una alarma). Quien los consiga todos se lleva el trofeo <b>Guardián de los Secretos</b> en la gala.') + '</p></div>' +
    '<div class="sec-me"><div class="row"><span class="big num">' + n + '<small>/' + EGGS.length + '</small></span><span class="grow small">' + (mine && mine.n ? '<b>' + mine.pos + '.º</b> en el ranking' : 'Aún sin estrenar') + '<br><span class="muted">' + left + (left === 1 ? ' pista extra' : ' pistas extra') + ' de ' + SECRETS_HINTS + '. Úsalas con cabeza</span></span></div>' +
    '<div class="bar"><i style="width:' + Math.round(n / EGGS.length * 100) + '%"></i></div></div>';
  html += '<p class="eyebrow">Ranking de cazasecretos</p><div class="sec-rank">' + (typeof secretsWho === 'function' ? secretsWho() : '') + '<p class="small muted">Se actualiza cada minuto.</p></div>';
  html += '<p class="eyebrow">Tus secretos</p><div class="stack">' + EGGS.map(function (e) {
    var ok = f[e.k], hint = h[e.k];
    return '<div class="row sec-egg' + (ok ? ' ok' : '') + '"><span class="av sm" style="background:' + (ok ? 'var(--accent)' : 'var(--surface-2)') + ';color:' + (ok ? '#fff' : 'var(--muted)') + '">' + (ok ? '✓' : '?') + '</span><span class="grow"><b>' + (ok ? esc(e.name) : '???') + '</b><span class="small muted" style="display:block">' + esc(ok ? e.how : 'Pista: ' + e.hint) + '</span>' +
      (!ok && hint ? '<span class="small sec-more">' + icon('bulb') + esc(e.more) + '</span>' : '') + '</span>' +
      (!ok && !hint && left > 0 && !closed ? '<button class="btn ghost sec-hint" data-act="secHint" data-k="' + e.k + '" aria-label="Usar una pista extra">' + icon('bulb') + '</button>' : '') + '</div>';
  }).join('') + '</div><button class="btn primary block" data-act="close">Seguir buscando</button>';
  openSheet(html);
}
Object.assign(A, {
  secHint: function (el) {
    var k = el.dataset.k, left = hintsLeft();
    if (!left) { toast('Ya has gastado tus ' + SECRETS_HINTS + ' pistas extra. Ahora, a pensar'); return; }
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = icon('bulb') + '¿Gastar 1 de ' + left + '?'; el.classList.add('armed'); return; }
    var h = hintsMap(); h[k] = new Date().toISOString(); writeJ(hintKey(), '_hints', h);
    closeSheet(); setTimeout(secretsSheet, 80);
    toast(hintsLeft() ? 'Pista usada. Te quedan ' + hintsLeft() : 'Última pista usada. Suerte');
  },
  secAlarmGo: function () { var v = document.querySelector('.sec-alarm'); if (v) v.remove(); secretsSheet(); },
  secAlarmClose: function () { var v = document.querySelector('.sec-alarm'); if (v) v.remove(); }
});

/* ----- Disparadores que dependen de lo que se ve (así cualquier rol puede conseguirlos) ----- */
function secretsOnView() {
  try {
    var t = ui.tab;
    if (t === 'tiempo') egg('meteo');
    if (t === 'compra') { var c = L.coverage(S.ingredients); if (c.tot && c.done === c.tot && !hasEgg('fumata') && !ui._fumataPend) { ui._fumataPend = true; setTimeout(function () { ui._fumataPend = false; if (!hasEgg('fumata')) fumata(); }, 450); } }
    if (t === 'cuentas') { var lg = L.ledger(S, false); if (lg.total > 0 && !lg.tx.length && !hasEgg('claras')) setTimeout(checkClaras, 300); }
    if (t === 'juegos' && !hasEgg('habemus')) { var gs = S.games || []; if (gs.length && gs.every(function (g) { return G.isDone(S, g); })) { ui.allDoneShown = false; checkAllGames(); } }
    if (t === 'album' && typeof photoList === 'function' && photoList().length >= 50) egg('album');
    if (t === 'manual') setTimeout(manualEndCheck, 300);
  } catch (e) {}
}
function manualEndCheck() {
  if (!ui || ui.tab !== 'manual' || hasEgg('manual')) return;
  var doc = document.documentElement;
  if (window.innerHeight + window.scrollY >= doc.scrollHeight - 140) egg('manual');
}
window.addEventListener('scroll', function () { if (ui && ui.tab === 'manual') manualEndCheck(); }, { passive: true });
function abuMeterFx() {
  confetti(1800);
  eggCard('abumetro', 'Abuelómetro al rojo vivo', 'Lo has tocado tanto que se ha calentado. Aviso: el medidor no acepta sobornos. Bueno, un vermut sí.');
}

/* ----- Alarma del cierre: 2 horas antes, para todos los que estén en la app ----- */
function flagGet(k) { try { return localStorage.getItem(KEY + '-' + k + '-' + ui.me) === '1'; } catch (e) { return !!ui['_' + k]; } }
function flagSet(k) { ui['_' + k] = true; try { localStorage.setItem(KEY + '-' + k + '-' + ui.me, '1'); } catch (e) {} }
function secretsWatch() {
  function tick() {
    var ms = secretsClose().getTime() - Date.now();
    if (ms <= 0) { if (ms > -6 * 3600000 && !flagGet('secClosed')) { flagSet('secClosed'); secretsClosedFx(); } return; }
    if (ms > SECRETS_WARN_MIN * 60000) return;
    if (ui.tab === 'inicio' && !document.querySelector('.sec-banner')) render(true);
    if (flagGet('secWarn')) return; flagSet('secWarn');
    secretsAlarm(ms);
  }
  setTimeout(tick, 5200); setInterval(tick, 30000);   /* después de la fiesta de cumple si coincide */
}
function secretsAlarm(ms) {
  var min = Math.max(1, Math.round(ms / 60000)), hrs = Math.floor(min / 60), rest = min % 60;
  var left = hrs ? hrs + (hrs === 1 ? ' hora' : ' horas') + (rest ? ' y ' + rest + ' min' : '') : min + ' minutos';
  if (navigator.vibrate) try { navigator.vibrate([200, 100, 200, 100, 400]); } catch (e) {}
  alarmBeep();
  var old = document.querySelector('.sec-alarm'); if (old) old.remove();
  var v = document.createElement('div'); v.className = 'sec-alarm'; v.setAttribute('role', 'alertdialog'); v.setAttribute('aria-label', 'Alarma de secretos');
  v.innerHTML = '<div class="sec-alarm-in"><div class="sec-bell">' + icon('clock') + '</div><span class="eyebrow">Alarma de secretos</span><h2>¡Quedan ' + esc(left) + '!</h2><p>El ranking de secretos se cierra a las <b>' + closeHour() + '</b>. Llevas <b>' + foundCount() + ' de ' + EGGS.length + '</b> y te ' + (hintsLeft() === 1 ? 'queda 1 pista extra' : 'quedan ' + hintsLeft() + ' pistas extra') + '.</p><div class="row wrap" style="justify-content:center"><button class="btn primary" data-act="secAlarmGo">Ver mis secretos</button><button class="btn ghost" data-act="secAlarmClose">Luego</button></div></div>';
  document.body.appendChild(v);
}
function secretsClosedFx() {
  var rk = secretsRanking(), top = rk.filter(function (r) { return r.pos === 1 && r.n > 0; });
  fumataRaw('¡Ranking cerrado!', top.length ? 'Mejor cazasecretos: ' + top.map(function (r) { return esc(pname(r.id)); }).join(' y ') + ' (' + top[0].n + '/' + EGGS.length + '). Desde ahora, los secretos ya no suman.' : 'El ranking de secretos se ha cerrado.');
}
function alarmBeep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [0, .25, .5].forEach(function (d) { var o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = 880; g.gain.setValueAtTime(.08, actx.currentTime + d); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + d + .2); o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + .22); });
  } catch (e) {}
}
/* Aviso fijo en Inicio durante las 2 horas previas al cierre */
function secretsHomeBanner() {
  var ms = secretsClose().getTime() - Date.now();
  if (ms <= 0 || ms > SECRETS_WARN_MIN * 60000) return '';
  return '<button class="card sec-banner" data-act="secrets"><span class="aw-ico">' + icon('clock') + '</span><span class="grow"><b>El ranking de secretos se cierra a las ' + closeHour() + '</b><small>Llevas ' + foundCount() + '/' + EGGS.length + '. ¡Último empujón!</small></span>' + icon('arrow') + '</button>';
}
