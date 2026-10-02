/* ===================== Gimcana nocturna «Operación Cantera» =====================
   SOLO ADULTOS (editores y admin que no juegan). El contenido (acertijos, códigos, escondites) NO está en el código:
   vive en la tabla gimcana, que la base de datos solo deja leer a esos adultos. En la demo sale de la semilla privada.
   - Panel de adultos: aviso fijo, confirmación antes de abrir, todo lo delicado borroso, se cierra solo.
   - Modo pekes: el móvil del guía se convierte en el aparato del equipo (pantalla completa, sin salir sin pulsación larga).
   - El Espía no está en la finca: deja grabados antes sus mensajes (voz distorsionada) desde su buzón secreto. */

/* Quién juega lo dice el contenido (de la base de datos); los jugadores son lectores, así que nunca ven la entrada */
function gimPlayers() { return (GIM.content && GIM.content.players) || []; }
function gimAdult() { var m = me(); return !!m && !m.spy && m.kind === 'adulto' && (m.role === 'admin' || m.role === 'editor') && gimPlayers().indexOf(m.id) < 0; }
function gimIsGame(g) { return !!g && (g.id === 'g02' || g.gimcana); }
function gimCloud() { return typeof PHOTOS !== 'undefined' && PHOTOS.demo === false && window.CLOUD && CLOUD.sb; }
var GIM = { content: null, spy: {}, teams: {}, msgs: {}, loaded: false, ch: null };
var GIM_LS = KEY + '-gim-';

/* ---------- Datos ---------- */
function gimLoad() {
  if (!gimCloud()) {
    GIM.content = (typeof SEED !== 'undefined' && SEED.gimcana) || null;
    try { GIM.teams = JSON.parse(localStorage.getItem(GIM_LS + 'teams')) || {}; GIM.spy = JSON.parse(localStorage.getItem(GIM_LS + 'spy')) || {}; GIM.msgs = JSON.parse(localStorage.getItem(GIM_LS + 'msgs')) || {}; } catch (e) {}
    GIM.loaded = true; return Promise.resolve();
  }
  return CLOUD.sb().from('gimcana').select('id,data').then(function (r) {
    if (r.error) throw r.error;
    GIM.teams = {}; GIM.msgs = {};
    (r.data || []).forEach(function (row) {
      if (row.id === 'content') GIM.content = row.data;
      else if (row.id === 'spy') GIM.spy = row.data || {};
      else if (row.id.indexOf('team-') === 0) GIM.teams[row.id.slice(5)] = row.data;
      else if (row.id.indexOf('msg-') === 0) GIM.msgs[row.id.slice(4)] = row.data;
    });
    GIM.loaded = true; gimListen();
  });
}
function gimListen() {
  if (GIM.ch || !gimCloud()) return;
  GIM.ch = CLOUD.sb().channel('gimcana').on('postgres_changes', { event: '*', schema: 'public', table: 'gimcana' }, function (p) {
    var row = p.new || {}; if (!row.id) return;
    if (row.id === 'content') GIM.content = row.data; else if (row.id === 'spy') GIM.spy = row.data || {};
    else if (row.id.indexOf('team-') === 0) { if (!(gimKid && gimKid.team === row.id.slice(5) && !gimKid.rehearsal)) GIM.teams[row.id.slice(5)] = row.data; }
    else if (row.id.indexOf('msg-') === 0) GIM.msgs[row.id.slice(4)] = row.data;
    gimRefresh();
  }).subscribe();
}
function gimSave(id, data) {
  if (!gimCloud()) {
    try { localStorage.setItem(GIM_LS + 'teams', JSON.stringify(GIM.teams)); localStorage.setItem(GIM_LS + 'msgs', JSON.stringify(GIM.msgs)); localStorage.setItem(GIM_LS + 'spy', JSON.stringify(GIM.spy)); } catch (e) {}
    return Promise.resolve();
  }
  return CLOUD.sb().from('gimcana').upsert({ id: id, data: data, updated_at: new Date().toISOString() }).then(function (r) { if (r.error) throw r.error; });
}
function gimTeamCfg(id) { return ((GIM.content && GIM.content.teams) || []).find(function (t) { return t.id === id; }); }
function gimRoute(teamId) {
  var st = GIM.content.stations, t = gimTeamCfg(teamId) || { offset: 0 }, o = (t.offset || 0) % st.length;
  return st.slice(o).concat(st.slice(0, o));
}
function gimState(teamId) { return GIM.teams[teamId] || (GIM.teams[teamId] = { idx: 0, phase: 'intro', letters: [], wrong: 0, comodin: false, hints: 0, skips: 0 }); }
function gimPersist(teamId) { var s = gimState(teamId); s.at = new Date().toISOString(); if (gimKid && gimKid.rehearsal) return Promise.resolve(); return gimSave('team-' + teamId, s).catch(function () { toast('Sin conexión: el progreso se guarda al volver la red'); }); }
function gimNorm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function gimRefresh() { if (document.getElementById('gim-adm')) gimAdmRender(); if (gimKid) gimKidMsgCheck(); }
function gimTime(ms) { var s = Math.max(0, Math.round(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }

/* ---------- Entrada desde la ficha del juego (solo adultos) ---------- */
function gimEntryHtml(g) {
  if (!gimIsGame(g) || !gimAdult()) return '';
  return '<button class="card gim-entry" data-act="gimOpen"><span class="gim-lock">🔒</span><span class="grow"><b>Panel de la gimcana</b><small>SOLO ADULTOS · que no lo vea ningún peque</small></span>' + icon('arrow') + '</button>';
}

/* ---------- Panel de adultos ---------- */
var gimAdm = { tab: 'panel', idleT: null };
function gimGate() {
  if (!gimAdult()) { toast('Esto es solo para adultos que no juegan'); return; }
  var g = document.createElement('div'); g.className = 'gim-gate'; g.id = 'gim-gate';
  g.innerHTML = '<div class="gg-in"><div class="gim-ribbon">🔒 SOLO ADULTOS · que no lo vea ningún peque</div><div class="gg-ico">🕵️</div><h2>¿Hay algún peque mirando tu móvil?</h2><p>Dentro están los acertijos, los códigos y los escondites. Si hay un agente cerca, espera a estar a solas.</p>' +
    '<button class="btn primary big-btn gg-hold" data-act="gimHold"><i></i><span>Mantén pulsado: estoy solo</span></button><button class="btn ghost" data-act="gimGateNo">Mejor luego</button></div>';
  document.body.appendChild(g);
}
function gimAdmOpen() {
  var gg = document.getElementById('gim-gate'); if (gg) gg.remove();
  var el = document.createElement('div'); el.className = 'gim-adm'; el.id = 'gim-adm';
  el.innerHTML = '<div class="gim-ribbon fixed">🔒 SOLO ADULTOS · que no lo vea ningún peque</div><div class="ga-top"><button class="icon-btn" data-act="gimAdmClose" aria-label="Cerrar">' + icon('x') + '</button><b class="grow">Operación Cantera</b><span class="small muted">Se cierra solo si no lo tocas</span></div><div class="ga-tabs"></div><div class="ga-body"><p class="small muted">Cargando…</p></div>';
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  ['pointerdown', 'keydown', 'scroll'].forEach(function (ev) { el.addEventListener(ev, gimIdle, true); });
  gimIdle();
  gimLoad().then(gimAdmRender, function () { el.querySelector('.ga-body').innerHTML = '<p class="small">No he podido cargar la gimcana. ¿Hay conexión? (Y recuerda: solo la ven los adultos que no juegan.)</p>'; });
}
function gimIdle() { clearTimeout(gimAdm.idleT); gimAdm.idleT = setTimeout(function () { gimAdmClose(); toast('Panel de la gimcana cerrado por seguridad'); }, 60000); }
function gimAdmClose() { clearTimeout(gimAdm.idleT); var el = document.getElementById('gim-adm'); if (el) el.remove(); if (!gimKid) document.body.style.overflow = ''; }
document.addEventListener('visibilitychange', function () { if (document.hidden && document.getElementById('gim-adm')) gimAdmClose(); });
function gimSecret(txt, cls) { return '<span class="gim-secret' + (cls ? ' ' + cls : '') + '" data-act="gimReveal" title="Toca para ver">' + esc(txt) + '</span>'; }
function gimAdmRender() {
  var el = document.getElementById('gim-adm'); if (!el) return;
  var C = GIM.content;
  if (!C) { el.querySelector('.ga-body').innerHTML = '<p class="small">Aún no hay contenido de la gimcana.</p>'; return; }
  var tabs = [['panel', 'En directo'], ['prep', 'Preparación'], ['teams', 'Equipos'], ['spy', 'El Espía']];
  el.querySelector('.ga-tabs').innerHTML = '<div class="seg">' + tabs.map(function (t) { return '<button data-act="gimTab" data-v="' + t[0] + '" aria-pressed="' + (gimAdm.tab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
  var h = '';
  if (gimAdm.tab === 'panel') {
    h += '<p class="small muted">Cada guía abre el <b>modo pekes</b> en su móvil con su equipo. Desde aquí ves por dónde van y puedes mandarles un mensaje del Espía.</p>';
    h += C.teams.map(function (t) {
      var s = GIM.teams[t.id] || {}, n = C.stations.length, done = s.phase === 'done', idx = Math.min(s.idx || 0, n), st = gimRoute(t.id)[Math.min(idx, n - 1)];
      var where = !s.phase || s.phase === 'intro' ? 'Sin empezar' : done ? '¡Cofre abierto!' : idx >= n ? 'En la base, con el cofre' : (idx + 1) + '/' + n + ' · ' + st.name + ' · ' + ({ riddle: 'acertijo', code: 'buscando el sobre', game: 'en la prueba', reward: 'letra conseguida' }[s.phase] || s.phase);
      return '<section class="card ga-team" style="--tc:' + t.color + '"><div class="card-head"><h3 class="row" style="gap:8px"><i class="ga-dot"></i>' + esc(s.name || t.name) + (t.optional ? ' <span class="pill">si se apunta</span>' : '') + '</h3><span class="small muted">' + (s.t0 ? gimTime((s.t1 || Date.now()) - s.t0) : '') + '</span></div>' +
        '<div class="row wrap" style="gap:6px">' + t.members.map(function (id) { return '<span class="who">' + av(id, 'xs') + esc(nameOf(id)) + '</span>'; }).join('') + (t.guide ? '<span class="small muted">· guía: ' + esc(nameOf(t.guide)) + '</span>' : '<span class="small muted">· guía: por decidir (alguien que no haya visto nada)</span>') + '</div>' +
        '<div class="bar"><i style="width:' + Math.round((done ? n : idx) / n * 100) + '%"></i></div><p class="small"><b>' + esc(where) + '</b>' + (s.letters && s.letters.length ? ' · letras: ' + s.letters.join(' ') : '') + (s.comodin ? ' · comodín usado' : '') + '</p>' +
        '<div class="row wrap ga-acts"><button class="btn primary" data-act="gimKidStart" data-t="' + t.id + '">' + icon('play') + 'Modo pekes en este móvil</button>' +
        '<button class="btn" data-act="gimSpyMsg" data-t="' + t.id + '">🕵️ Mensaje del Espía</button>' +
        (s.phase && s.phase !== 'intro' && !done ? '<button class="btn ghost" data-act="gimHint" data-t="' + t.id + '">Dar pista</button><button class="btn ghost" data-act="gimSkip" data-t="' + t.id + '">Saltar parada</button>' : '') +
        (s.phase ? '<button class="btn ghost danger-t" data-act="gimReset" data-t="' + t.id + '">Reiniciar</button>' : '') + '</div></section>';
    }).join('');
    h += '<section class="card"><h3>Ensayo</h3><p class="small">Recórrela desde el sofá: modo pekes completo, sin guardar nada y con los códigos a la vista.</p><button class="btn" data-act="gimKidStart" data-t="rojo" data-rehearsal="1">' + icon('eye') + 'Ensayar como Equipo Rojo</button></section>';
  } else if (gimAdm.tab === 'prep') {
    h += '<section class="card"><h3>Antes de empezar</h3><ul class="small finca-ul">' +
      '<li><b>Domingo, antes de la tarta y de día:</b> esconder los 6 sobres TOP SECRET (uno por sitio; vale el mismo para todos los equipos) con una pulsera luminosa.</li>' +
      '<li>En cada sobre, escrito bien grande, el <b>código de 3 cifras</b> de ese sitio.</li>' +
      '<li>El <b>cofre</b> con el tesoro y el candado de 3 cifras en ' + esc(C.base) + '. Combinación: ' + gimSecret(C.lock) + '.</li>' +
      '<li>Una <b>chuleta</b> para ' + esc(((S.trip.eggs && S.trip.eggs.grand) || []).map(function (id) { return nameOf(id); }).join(' y ') || 'los abuelos') + ' con las respuestas (es el comodín del abuelo).</li>' +
      '<li>Linterna o frontal para cada uno. Móviles de los guías <b>cargados</b> y con el volumen alto.</li>' +
      '<li>La palabra secreta es ' + gimSecret(C.word) + '. Recorrido: unos 45 minutos.</li></ul></section>';
    h += C.stations.map(function (s, i) {
      return '<section class="card ga-st"><div class="ga-st-ph"><img src="' + s.photo + '" alt="" loading="lazy" referrerpolicy="no-referrer"><b>' + (i + 1) + '</b></div><div class="ga-st-b"><h3>' + esc(s.name) + '</h3>' +
        '<p class="small"><b>Dónde esconder:</b> ' + esc(s.hide) + '</p>' +
        '<p class="small"><b>Código del sobre:</b> ' + gimSecret(s.code) + ' · <b>Letra:</b> ' + gimSecret(s.letter) + '</p>' +
        '<p class="small"><b>Prueba:</b> ' + esc(s.game.title) + '</p>' +
        '<details class="small"><summary>Acertijo y respuestas</summary><p>' + esc(s.riddle) + '</p><p><b>Vale:</b> ' + gimSecret(s.answers.join(', ')) + '</p><p><b>Pista:</b> ' + esc(s.hint) + '</p></details></div></section>';
    }).join('');
  } else if (gimAdm.tab === 'teams') {
    var players = gimPlayers().filter(function (id) { return person(id) && person(id).kind !== 'bebe'; }), adults = S.people.filter(function (p) { return p.kind === 'adulto' && gimPlayers().indexOf(p.id) < 0; });
    h += '<p class="small muted">Toca a un agente para cambiarle de equipo. El guía lleva el móvil del equipo: mejor alguien que no sea su padre o su madre (y, para quien juegue sola, alguien que no haya visto nada de la gimcana).</p>';
    h += C.teams.map(function (t) {
      return '<section class="card ga-team" style="--tc:' + t.color + '"><div class="card-head"><h3 class="row" style="gap:8px"><i class="ga-dot"></i>' + esc(t.name) + '</h3></div>' +
        '<div class="row wrap" style="gap:6px">' + players.map(function (id) { var on = t.members.indexOf(id) >= 0; return '<button class="chip' + (on ? ' on' : '') + '" data-act="gimMember" data-t="' + t.id + '" data-p="' + id + '" aria-pressed="' + on + '">' + av(id, 'xs') + esc(nameOf(id)) + '</button>'; }).join('') + '</div>' +
        '<div class="field"><label>Guía</label><select data-change="gimGuide" data-t="' + t.id + '"><option value="">Por decidir</option>' + adults.map(function (p) { return '<option value="' + p.id + '"' + (t.guide === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></div></section>';
    }).join('');
    h += '<p class="small muted">' + esc(babyName()) + ' va de mascota con su padre o su madre: no necesita equipo. En la última parada, el agente más joven pulsa el botón rojo.</p>';
  } else if (gimAdm.tab === 'spy') {
    var slots = [{ id: 'intro', name: 'La presentación' }].concat(C.stations).concat([{ id: 'final', name: 'El final' }]);
    h += '<p class="small">El Espía no estará en la finca: desde su buzón secreto (en su Inicio) graba antes un mensaje de voz o escribe un texto para cada momento. Su voz sale <b>distorsionada</b>. Si no graba nada, sale el texto por defecto.</p>';
    h += slots.map(function (s) {
      var m = GIM.spy[s.id] || {};
      return '<div class="row ga-spy"><span class="grow"><b>' + esc(s.name) + '</b><small class="muted">' + (m.audio ? '🎙️ Voz grabada' : m.text ? '✍️ Texto propio' : 'Texto por defecto') + '</small></span>' + (m.audio || m.text ? '<button class="btn ghost" data-act="gimSpyPlay" data-s="' + s.id + '">' + icon('play') + 'Oír</button>' : '') + '</div>';
    }).join('');
  }
  el.querySelector('.ga-body').innerHTML = h;
}
function gimSendMsg(teamId, text) {
  GIM.msgs[teamId] = { text: text, at: new Date().toISOString(), id: uid('m') };
  return gimSave('msg-' + teamId, GIM.msgs[teamId]).then(function () { toast('Mensaje enviado al ' + (gimTeamCfg(teamId) || {}).name); }, function () { toast('No se ha podido enviar'); });
}
function gimSaveContent() { return gimSave('content', GIM.content).catch(function () { toast('No se ha podido guardar'); }); }

/* ---------- Voz del Espía: grabada antes, distorsionada al reproducir ---------- */
function gimSpyText(slot) {
  var m = GIM.spy && GIM.spy[slot]; if (m && m.text) return m.text;
  var C = GIM.content; if (!C) return '';
  if (slot === 'intro') return C.intro.join(' ');
  if (slot === 'final') return C.final.spy;
  var st = C.stations.find(function (x) { return x.id === slot; }); return st ? st.spy : '';
}
function gimSpyAudioUrl(path) {
  if (!path) return Promise.resolve(null);
  if (/^blob:|^data:/.test(path)) return Promise.resolve(path);
  if (!gimCloud()) return Promise.resolve(null);
  return CLOUD.sb().storage.from('gimcana').createSignedUrl(path, 900).then(function (r) { return r && r.data ? (r.data.signedUrl || r.data.signedURL) : null; });
}
function gimPlayDistorted(url) {
  return fetch(url).then(function (r) { return r.arrayBuffer(); }).then(function (buf) {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    return new Promise(function (ok, ko) { actx.decodeAudioData(buf, ok, ko); });
  }).then(function (ab) {
    var src = actx.createBufferSource(); src.buffer = ab; src.playbackRate.value = 0.8;          /* más grave… */
    var ring = actx.createGain(), mod = actx.createOscillator(), depth = actx.createGain(), out = actx.createGain(), hp = actx.createBiquadFilter();
    mod.frequency.value = 38; depth.gain.value = 0.9; ring.gain.value = 0.2; mod.connect(depth); depth.connect(ring.gain);   /* …y robótica */
    hp.type = 'highpass'; hp.frequency.value = 220; out.gain.value = 1.6;
    src.connect(ring); ring.connect(hp); hp.connect(out); out.connect(actx.destination);
    mod.start(); src.start(); src.onended = function () { try { mod.stop(); } catch (e) {} };
    return true;
  });
}
function gimSpyPlay(slot) {
  var m = GIM.spy && GIM.spy[slot];
  if (m && m.audio) return gimSpyAudioUrl(m.audio).then(function (u) { return u ? gimPlayDistorted(u) : false; }).catch(function () { return false; });
  return Promise.resolve(false);
}

/* ---------- Modo pekes ---------- */
var gimKid = null;
var GIM_MISS = ['Frío, frío…', 'Nop. El Espía se está riendo.', 'Casi… o no. Probad otra vez.', 'Eso no. Pensad como un espía.', '¡Error! Pero con estilo.'];
function gimKidStart(teamId, rehearsal) {
  if (!GIM.content) return;
  gimAdmClose();
  if (rehearsal) { GIM._backup = GIM.teams[teamId]; GIM.teams[teamId] = null; }
  gimKid = { team: teamId, rehearsal: !!rehearsal, seenMsg: (GIM.msgs[teamId] || {}).id || null, tick: null };
  var s = gimState(teamId); if (!s.phase) s.phase = 'intro';
  var el = document.createElement('div'); el.className = 'gim-kid'; el.id = 'gim-kid'; el.style.setProperty('--tc', (gimTeamCfg(teamId) || {}).color || '#E5383B');
  el.innerHTML = '<canvas class="gk-stars" aria-hidden="true"></canvas><div class="gk-top"><span class="gk-team"></span><span class="gk-clock num"></span><button class="gk-exit" data-act="gimKidExitHold" aria-label="Salir (adultos): mantén pulsado"><i></i>Salir · adultos</button></div><div class="gk-body"></div>';
  document.body.appendChild(el); document.body.style.overflow = 'hidden';
  gimStars(el.querySelector('.gk-stars'));
  gimKid.tick = setInterval(gimClock, 1000);
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { if (gimKid) gimKid.lock = l; }); } catch (e) {}
  gimKidRender();
}
function gimKidClose() {
  if (!gimKid) return; clearInterval(gimKid.tick); gimGameStop();
  try { if (gimKid.lock) gimKid.lock.release(); } catch (e) {}
  if (gimKid.rehearsal) GIM.teams[gimKid.team] = GIM._backup;
  var el = document.getElementById('gim-kid'); if (el) el.remove(); document.body.style.overflow = ''; gimKid = null;
}
function gimClock() {
  var el = document.querySelector('#gim-kid .gk-clock'); if (!el || !gimKid) return; var s = gimState(gimKid.team);
  el.textContent = s.t0 ? gimTime((s.t1 || Date.now()) - s.t0) : '';
}
function gimStars(cv) {
  var ctx = cv.getContext('2d'), W, H, dpr = Math.min(window.devicePixelRatio || 1, 2), P = [];
  function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); P = Array.from({ length: 90 }, function () { return { x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3, p: Math.random() * 6 }; }); }
  size(); window.addEventListener('resize', size);
  (function f(t) { if (!document.body.contains(cv)) return; ctx.clearRect(0, 0, W, H); P.forEach(function (s) { ctx.globalAlpha = .35 + .65 * Math.abs(Math.sin(t / 900 + s.p)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }); requestAnimationFrame(f); })(0);
}
function gimSay(lines, k) { return lines.map(function (l, i) { return '<p class="gk-line" style="--d:' + ((k || 0) + i * .7) + 's">' + l + '</p>'; }).join(''); }
function gimKidRender() {
  var el = document.getElementById('gim-kid'); if (!el || !gimKid) return;
  var C = GIM.content, t = gimTeamCfg(gimKid.team), s = gimState(gimKid.team), route = gimRoute(gimKid.team), n = route.length, st = route[Math.min(s.idx, n - 1)], h = '';
  el.querySelector('.gk-team').innerHTML = '<i></i>' + esc(s.name || t.name) + (gimKid.rehearsal ? ' · ensayo' : '');
  gimGameStop();
  if (s.phase === 'intro') {
    h = '<div class="gk-spy">' + (SPIES && SPIES[0] ? av(SPIES[0].id, 'xl') : '<span class="gk-emo">🕵️</span>') + '<span class="gk-tag">📡 Mensaje interceptado</span></div><div class="gk-msg">' + gimSay((GIM.spy.intro && GIM.spy.intro.text ? [esc(GIM.spy.intro.text)] : C.intro.map(esc))) + '</div>' +
      (GIM.spy.intro && GIM.spy.intro.audio ? '<button class="btn gk-audio" data-act="gimKidAudio" data-s="intro">🔊 Oír al Espía</button>' : '') +
      '<div class="gk-card"><label for="gk-name"><b>¿Cómo se llama vuestro equipo de agentes?</b></label><input id="gk-name" class="gk-in" maxlength="28" placeholder="' + esc(t.name) + '" value="' + esc(s.name || '') + '"></div>' +
      '<details class="gk-rules"><summary>Las normas del Espía</summary><ol>' + C.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol></details>' +
      '<button class="btn primary big-btn gk-go" data-act="gimKidBegin">¡Aceptamos la misión!</button>';
  } else if (s.idx >= n && s.phase !== 'done') {
    h = gimFinalHtml(s);
  } else if (s.phase === 'done') {
    h = gimDoneHtml(s);
  } else if (s.phase === 'riddle') {
    h = '<div class="gk-step">Pista ' + (s.idx + 1) + ' de ' + n + '</div>' + gimLettersHtml(s) + '<div class="gk-card riddle"><span class="gk-tag">🕵️ El Espía dice:</span><p class="gk-riddle">' + esc(st.riddle) + '</p>' +
      (s.wrong >= 2 || s.hintShown ? '<p class="gk-hint">💡 ' + esc(st.hint) + '</p>' : '') + '</div>' +
      '<div class="gk-card"><label for="gk-ans"><b>¿A qué sitio os manda?</b></label><input id="gk-ans" class="gk-in" autocomplete="off" autocapitalize="none" placeholder="Escribid aquí…"><p class="gk-fb" id="gk-fb"></p><button class="btn primary big-btn" data-act="gimAnswer">Comprobar</button></div>' +
      (!s.comodin ? '<button class="btn ghost gk-com" data-act="gimComodin">👵👴 Comodín del abuelo (solo uno)</button>' : '');
  } else if (s.phase === 'go') {
    h = '<div class="gk-step">Pista ' + (s.idx + 1) + ' de ' + n + '</div><div class="gk-big">✅</div><h2 class="gk-h">¡Correcto!</h2><p class="gk-p">Id a <b>' + esc(st.name.toLowerCase()) + '</b> con la linterna. Buscad un sobre <b>TOP SECRET</b> con una luz.</p><p class="gk-p small">Nada de correr hacia la piscina. El guía, siempre cerca.</p><button class="btn primary big-btn" data-act="gimFound">¡Lo tenemos! Meter el código</button>';
  } else if (s.phase === 'code') {
    h = '<div class="gk-step">Pista ' + (s.idx + 1) + ' de ' + n + '</div><h2 class="gk-h">Código del sobre</h2><p class="gk-p">Tres cifras. Si no las veis, mirad bien el sobre (y no os comáis la pulsera).</p><div class="gk-code" id="gk-code"><b></b><b></b><b></b></div><div class="gk-pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9, 'x', 0, 'ok'].map(function (k) { return '<button data-act="gimKey" data-k="' + k + '">' + (k === 'x' ? '⌫' : k === 'ok' ? '✓' : k) + '</button>'; }).join('') + '</div><p class="gk-fb" id="gk-fb"></p>' +
      (gimKid.rehearsal ? '<p class="small muted">Ensayo · código: ' + esc(st.code) + '</p>' : '') + '<button class="btn ghost" data-act="gimBackRiddle">← Volver al acertijo</button>';
  } else if (s.phase === 'game') {
    h = '<div class="gk-step">Prueba ' + (s.idx + 1) + ' de ' + n + '</div><h2 class="gk-h">' + esc(st.game.title) + '</h2><p class="gk-p">' + esc(st.game.text) + '</p><div class="gk-game" id="gk-game"></div>';
  } else if (s.phase === 'reward') {
    var last = s.idx >= n - 1;
    h = '<div class="gk-step">Prueba ' + (s.idx + 1) + ' de ' + n + ' superada</div><div class="gk-letter">' + esc(st.letter) + '</div><p class="gk-p">¡Letra conseguida!</p>' + gimLettersHtml(s) +
      '<div class="gk-card spy"><span class="gk-tag">📡 Mensaje interceptado del Espía</span><p>' + esc(gimSpyText(st.id)) + '</p>' + (GIM.spy[st.id] && GIM.spy[st.id].audio ? '<button class="btn gk-audio" data-act="gimKidAudio" data-s="' + st.id + '">🔊 Oír al Espía</button>' : '') + '</div>' +
      '<button class="btn primary big-btn" data-act="gimNext">' + (last ? '¡Al cofre!' : 'Siguiente pista') + '</button>';
  }
  el.querySelector('.gk-body').innerHTML = h; el.querySelector('.gk-body').scrollTop = 0;
  if (s.phase === 'game') gimGameStart(st, document.getElementById('gk-game'));
  if (s.phase === 'reward') { try { confetti(2200); tada(true); } catch (e) {} }
  gimClock(); gimKidMsgCheck();
}
function gimLettersHtml(s) {
  var w = GIM.content.word.length; var got = s.letters || [];
  return '<div class="gk-letters">' + Array.from({ length: w }, function (_, i) { return '<b' + (got[i] ? ' class="on"' : '') + '>' + (got[i] || '?') + '</b>'; }).join('') + '</div>';
}
function gimFinalHtml(s) {
  var C = GIM.content, sol = s.solved;
  if (!sol) {
    var tiles = (s.tiles || (s.tiles = shuffled(s.letters.slice()))), pick = s.pick || [];
    return '<div class="gk-step">Misión final</div><h2 class="gk-h">La contraseña</h2><p class="gk-p">' + esc(C.final.riddle) + '</p>' +
      '<div class="gk-word">' + Array.from({ length: C.word.length }, function (_, i) { return '<b>' + (pick[i] != null ? tiles[pick[i]] : '') + '</b>'; }).join('') + '</div>' +
      '<div class="gk-tiles">' + tiles.map(function (l, i) { return '<button data-act="gimTile" data-i="' + i + '"' + (pick.indexOf(i) >= 0 ? ' disabled' : '') + '>' + esc(l) + '</button>'; }).join('') + '</div><p class="gk-fb" id="gk-fb"></p><button class="btn ghost" data-act="gimTileClear">Borrar</button>';
  }
  return '<div class="gk-step">¡Contraseña correcta!</div><div class="gk-word ok">' + C.word.split('').map(function (l) { return '<b>' + l + '</b>'; }).join('') + '</div><p class="gk-p">' + esc(C.final.lockText) + '</p>' +
    '<div class="gk-lock">' + C.lock.split('').map(function (d) { return '<b>' + d + '</b>'; }).join('') + '</div>' +
    '<p class="gk-p">El agente más joven pulsa el botón. ' + esc(bdayName()) + ', tú abres el cofre.</p><button class="gk-red" data-act="gimOpenChest">ABRIR</button>';
}
function gimDoneHtml(s) {
  var C = GIM.content, t = gimTeamCfg(gimKid.team);
  var all = C.teams.map(function (x) { var y = GIM.teams[x.id] || {}; return { name: y.name || x.name, t: y.t1 && y.t0 ? y.t1 - y.t0 : null, me: x.id === gimKid.team }; }).filter(function (x) { return x.t; }).sort(function (a, b) { return a.t - b.t; });
  return '<div class="gk-unmask"><div class="gk-spy big">' + (SPIES && SPIES[0] ? av(SPIES[0].id, 'xl') : '<span class="gk-emo">🕵️</span>') + '<span class="gk-q">?</span></div><span class="gk-tag">📡 Último mensaje del Espía</span><p class="gk-p">' + esc(gimSpyText('final')) + '</p>' +
    (GIM.spy.final && GIM.spy.final.audio ? '<button class="btn gk-audio" data-act="gimKidAudio" data-s="final">🔊 Oír al Espía</button>' : '') + '</div>' +
    '<h2 class="gk-h">¡Misión cumplida, ' + esc(s.name || t.name) + '!</h2><p class="gk-p">Tiempo: <b class="num">' + gimTime(s.t1 - s.t0) + '</b></p>' +
    (all.length ? '<div class="gk-card"><b>Clasificación</b>' + all.map(function (x, i) { return '<p class="' + (x.me ? 'me' : '') + '">' + (i + 1) + '.º ' + esc(x.name) + ' · ' + gimTime(x.t) + '</p>'; }).join('') + '</div>' : '') +
    '<p class="small gk-p">Ya podéis devolver el móvil al guía. Mantened pulsado «Salir» arriba.</p>';
}
function gimKidMsgCheck() {
  if (!gimKid) return; var m = GIM.msgs[gimKid.team];
  if (!m || m.id === gimKid.seenMsg) return; gimKid.seenMsg = m.id;
  var el = document.getElementById('gim-kid'); if (!el) return;
  var d = document.createElement('div'); d.className = 'gk-live'; d.innerHTML = '<div><span class="gk-tag">📡 Mensaje interceptado</span><p>' + esc(m.text) + '</p><button class="btn primary" data-act="gimLiveOk">Entendido</button></div>';
  el.appendChild(d); try { tada(false); if (navigator.vibrate) navigator.vibrate([60, 60, 60]); } catch (e) {}
}
function gimAdvance(phase) { var s = gimState(gimKid.team); s.phase = phase; gimPersist(gimKid.team); gimKidRender(); }
function gimFb(txt, bad) { var f = document.getElementById('gk-fb'); if (f) { f.textContent = txt; f.className = 'gk-fb' + (bad ? ' bad' : ' good'); } var c = document.querySelector('#gim-kid .gk-body .gk-card:last-of-type, #gk-code'); if (bad && c) { c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); } }

/* ---------- Minijuegos ---------- */
var gimG = null;
function gimGameStop() { if (!gimG) return; try { gimG.stop && gimG.stop(); } catch (e) {} gimG = null; }
function gimWin() { gimGameStop(); var s = gimState(gimKid.team), st = gimRoute(gimKid.team)[s.idx]; s.letters = s.letters || []; s.letters[s.idx] = st.letter; gimAdvance('reward'); try { gimSpyPlay(st.id); } catch (e) {} }
function gimMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject();
  return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } }).then(function (stream) {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    var src = actx.createMediaStreamSource(stream), an = actx.createAnalyser(); an.fftSize = 1024; src.connect(an);
    var buf = new Float32Array(an.fftSize);
    return { level: function () { an.getFloatTimeDomainData(buf); var s = 0; for (var i = 0; i < buf.length; i++) s += buf[i] * buf[i]; return Math.sqrt(s / buf.length); }, stop: function () { stream.getTracks().forEach(function (t) { t.stop(); }); try { src.disconnect(); } catch (e) {} } };
  });
}
function gimGameStart(st, box) {
  var g = st.game, type = g.type;
  if (type === 'who') return gimWho(g, box);
  if (type === 'silence') return gimSilence(g, box);
  if (type === 'candles') return gimCandles(g, box);
  if (type === 'quiz') return gimQuiz(g, box);
  if (type === 'shake') return gimShake(g, box);
  if (type === 'simon') return gimSimon(g, box);
  box.innerHTML = '<button class="btn primary big-btn" data-act="gimManualWin">¡Superada! (lo confirma el guía)</button>';
}
/* 1 · ¿Quién es quién? Fotos de la familia pixeladas que se van aclarando */
function gimWho(g, box) {
  var pool = S.people.filter(function (p) { return p.avatar; }); if (pool.length < 4) { box.innerHTML = '<button class="btn primary big-btn" data-act="gimManualWin">Seguir</button>'; return; }
  var rounds = shuffled(pool).slice(0, g.rounds || 3), r = 0, iv = null;
  gimG = { stop: function () { clearInterval(iv); } };
  function round() {
    clearInterval(iv); var p = rounds[r], opts = shuffled([p].concat(shuffled(pool.filter(function (x) { return x.id !== p.id; })).slice(0, 3)));
    box.innerHTML = '<p class="gk-p small">Ronda ' + (r + 1) + ' de ' + rounds.length + '</p><canvas class="gk-pix" width="220" height="220"></canvas><div class="gk-opts">' + opts.map(function (o) { return '<button data-act="gimWho" data-id="' + o.id + '">' + esc(o.name) + '</button>'; }).join('') + '</div><p class="gk-fb" id="gk-fb"></p>';
    var cv = box.querySelector('canvas'), ctx = cv.getContext('2d'), img = new Image(), k = 0, steps = [5, 7, 9, 12, 16, 22, 30, 44, 64, 220];
    img.onload = function () {
      var tmp = document.createElement('canvas'), tc = tmp.getContext('2d');
      function draw() { var n = steps[Math.min(k, steps.length - 1)]; tmp.width = tmp.height = n; tc.drawImage(img, 0, 0, n, n); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, 220, 220); ctx.drawImage(tmp, 0, 0, n, n, 0, 0, 220, 220); }
      draw(); iv = setInterval(function () { k++; draw(); if (k >= steps.length - 1) clearInterval(iv); }, 1100);
    };
    img.src = p.avatar;
    gimG.answer = function (id) {
      if (id === p.id) { clearInterval(iv); k = 99; ctx.imageSmoothingEnabled = true; ctx.drawImage(img, 0, 0, 220, 220); gimFb('¡Es ' + p.name + '!'); try { tada(false); } catch (e) {} r++; setTimeout(function () { if (!gimG) return; if (r >= rounds.length) gimWin(); else round(); }, 1300); }
      else gimFb(pickOne(['¡Ese no es!', 'Frío, frío…', 'Mirad mejor esos píxeles', 'El Espía se parte de risa'], id + r), true);
    };
  }
  round();
}
/* 2 · Silencio: el micrófono escucha */
function gimSilence(g, box) {
  var need = g.secs || 15, quiet = 0, mic = null, iv = null, base = null, cal = [];
  box.innerHTML = '<div class="gk-ring"><b class="num" id="gk-sil">' + need + '</b><small>segundos</small></div><div class="gk-meter"><i id="gk-lv"></i></div><p class="gk-fb" id="gk-fb">Preparados… ¡Shhh!</p><button class="btn ghost" data-act="gimManualWin">Sin micrófono: el guía cuenta ' + need + ' s y pulsa aquí</button>';
  gimG = { stop: function () { clearInterval(iv); if (mic) mic.stop(); } };
  gimMic().then(function (m) {
    mic = m; var t0 = Date.now();
    iv = setInterval(function () {
      var lv = mic.level(), el = document.getElementById('gk-lv'); if (el) el.style.width = Math.min(100, lv * 900) + '%';
      if (Date.now() - t0 < 1200) { cal.push(lv); return; }
      if (base == null) base = Math.max(.012, cal.reduce(function (a, b) { return a + b; }, 0) / Math.max(1, cal.length));
      if (lv > base * 3.2 + .02) { if (quiet > 1) gimFb(pickOne(['¡Shhh! El Espía os ha oído. Desde cero.', '¡Ese ruido! Vuelta a empezar.', 'Nada de risitas… otra vez.'], Date.now()), true); quiet = 0; }
      else quiet += .1;
      var left = Math.max(0, Math.ceil(need - quiet)), n = document.getElementById('gk-sil'); if (n) n.textContent = left;
      if (quiet >= need) gimWin();
    }, 100);
  }, function () { gimFb('No hay micrófono: que el guía cuente ' + need + ' segundos en silencio total y pulse el botón.'); });
}
/* 3 · Sopla las velas */
function gimCandles(g, box) {
  var n = g.n || 11, out = 0, mic = null, iv = null, blow = 0;
  box.innerHTML = '<div class="gk-cake"><div class="gk-candles">' + Array.from({ length: n }, function (_, i) { return '<button class="gk-candle" data-act="gimCandle" data-i="' + i + '" aria-label="Vela ' + (i + 1) + '"><i></i></button>'; }).join('') + '</div><div class="gk-cake-b">' + esc(String(n)) + '</div></div><p class="gk-fb" id="gk-fb">Soplad cerca del micrófono (o tocad las llamas).</p>';
  function off(i) { var c = box.querySelectorAll('.gk-candle:not(.off)'); if (!c.length) return; var el = i != null ? box.querySelector('.gk-candle[data-i="' + i + '"]') : c[Math.floor(Math.random() * c.length)]; if (!el || el.classList.contains('off')) return; el.classList.add('off'); out++; if (out >= n) { gimFb('¡Todas apagadas! Pide un deseo… que no sea ganar al Espía, que eso ya está.'); setTimeout(gimWin, 1200); } }
  gimG = { stop: function () { clearInterval(iv); if (mic) mic.stop(); }, candle: off };
  gimMic().then(function (m) { mic = m; iv = setInterval(function () { var lv = mic.level(); if (lv > .09) { blow += 100; if (blow >= 250) { blow = 0; off(); } } else blow = Math.max(0, blow - 50); }, 100); }, function () {});
}
/* 4 · El examen familiar */
function gimQuiz(g, box) {
  var qs = shuffled(g.qs.slice()).map(function (q) {
    if (q.dyn !== 'topSecrets') return q;
    var c = (S.secretsLive && S.secretsLive.counts) || {}, ids = Object.keys(c).filter(function (id) { return person(id) && !person(id).spy; }).sort(function (a, b) { return c[b] - c[a]; });
    if (!ids.length || (ids[1] && c[ids[0]] === c[ids[1]])) return null;   /* si hay empate, la pregunta no vale */
    var others = shuffled(S.people.filter(function (p) { return p.id !== ids[0] && p.kind !== 'bebe'; })).slice(0, 3).map(function (p) { return p.name; });
    var opts = shuffled([person(ids[0]).name].concat(others)); return { q: q.q, opts: opts, ok: opts.indexOf(person(ids[0]).name) };
  }).filter(Boolean).slice(0, 3), i = 0;
  gimG = {};
  function show() {
    var q = qs[i];
    box.innerHTML = '<p class="gk-p small">Pregunta ' + (i + 1) + ' de ' + qs.length + '</p><p class="gk-q">' + esc(q.q) + '</p><div class="gk-opts">' + q.opts.map(function (o, k) { return '<button data-act="gimQuiz" data-k="' + k + '">' + esc(o) + '</button>'; }).join('') + '</div><p class="gk-fb" id="gk-fb"></p>';
    gimG.answer = function (k) { if (k === q.ok) { gimFb('¡Correcto!'); try { tada(false); } catch (e) {} i++; setTimeout(function () { if (!gimG) return; if (i >= qs.length) gimWin(); else show(); }, 900); } else gimFb(pickOne(['¡Casi! Pensadlo otra vez.', 'Esa no. ¿Seguro que sois de esta familia?', 'Error. Los abuelos lo sabrían.'], k + i), true); };
  }
  show();
}
/* 5 · Gol y coctelera: agitar el móvil */
function gimShake(g, box) {
  var need = g.n || 60, n = 0, last = 0, on = false;
  function shakeUi() {
    box.innerHTML = '<div class="gk-ring"><b class="num" id="gk-sh">0</b><small>de ' + need + '</small></div><div class="gk-meter"><i id="gk-lv"></i></div><p class="gk-fb" id="gk-fb">¡Agitad! Pasaos el móvil entre todos.</p><button class="btn ghost" data-act="gimShakeTap">Sin sensor: tocad aquí muy rápido</button>';
    var ask = window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function';
    function start() { if (on) return; on = true; window.addEventListener('devicemotion', onMove); }
    if (ask) { var b = document.createElement('button'); b.className = 'btn primary'; b.textContent = 'Activar el sensor'; b.onclick = function () { DeviceMotionEvent.requestPermission().then(function (r) { if (r === 'granted') { start(); b.remove(); } }).catch(function () {}); }; box.insertBefore(b, box.firstChild); } else start();
  }
  function onMove(e) { var a = e.accelerationIncludingGravity || e.acceleration; if (!a) return; var m = Math.sqrt((a.x || 0) * (a.x || 0) + (a.y || 0) * (a.y || 0) + (a.z || 0) * (a.z || 0)); if (m > 19 && Date.now() - last > 180) { last = Date.now(); bump(); } }
  function bump() { n++; var el = document.getElementById('gk-sh'), lv = document.getElementById('gk-lv'); if (el) el.textContent = n; if (lv) lv.style.width = Math.min(100, n / need * 100) + '%'; if (navigator.vibrate) try { navigator.vibrate(8); } catch (x) {} if (n >= need) { gimFb('¡Coctelera completada!'); window.removeEventListener('devicemotion', onMove); setTimeout(gimWin, 700); } }
  gimG = { stop: function () { window.removeEventListener('devicemotion', onMove); }, tap: function () { bump(); }, goals: function () { shakeUi(); } };
  if (g.goals) box.innerHTML = '<div class="gk-big">⚽</div><p class="gk-p">Cada agente mete un gol en el futbolín. Sin portero, pero sin trampas.</p><button class="btn primary big-btn" data-act="gimGoals">¡Todos han marcado! (guía)</button>';
  else shakeUi();
}
/* 6 · El Simon del proyector */
function gimSimon(g, box) {
  var len = g.len || 5, seq = [], user = [], busy = false, cols = ['#E5383B', '#2EC4B6', '#FFD166', '#4895EF'], tones = [262, 330, 392, 523];
  box.innerHTML = '<div class="gk-simon">' + cols.map(function (c, i) { return '<button data-act="gimSimon" data-i="' + i + '" style="--c:' + c + '"></button>'; }).join('') + '</div><p class="gk-fb" id="gk-fb">Mirad la secuencia…</p>';
  function beep(i) { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); var o = actx.createOscillator(), gn = actx.createGain(); o.type = 'triangle'; o.frequency.value = tones[i]; gn.gain.setValueAtTime(.0001, actx.currentTime); gn.gain.exponentialRampToValueAtTime(.2, actx.currentTime + .02); gn.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .35); o.connect(gn); gn.connect(actx.destination); o.start(); o.stop(actx.currentTime + .4); } catch (e) {} }
  function flash(i) { var b = box.querySelector('[data-i="' + i + '"]'); if (!b) return; b.classList.add('lit'); beep(i); setTimeout(function () { b.classList.remove('lit'); }, 380); }
  function play() { busy = true; user = []; var k = 0; gimFb('Mirad… (' + seq.length + ' de ' + len + ')'); var iv = setInterval(function () { if (!gimG) { clearInterval(iv); return; } flash(seq[k]); k++; if (k >= seq.length) { clearInterval(iv); setTimeout(function () { busy = false; gimFb('¡Vuestro turno!'); }, 450); } }, 650); }
  function grow() { seq.push(Math.floor(Math.random() * 4)); setTimeout(play, 600); }
  gimG = { press: function (i) {
    if (busy) return; flash(i); user.push(i);
    if (seq[user.length - 1] !== i) { gimFb('¡Error del proyector! Desde el principio.', true); seq = []; busy = true; setTimeout(grow, 900); return; }
    if (user.length === seq.length) { if (seq.length >= len) { gimFb('¡Proyector encendido!'); busy = true; setTimeout(gimWin, 800); } else { busy = true; setTimeout(grow, 500); } }
  } };
  grow();
}

/* ---------- Buzón del Espía (solo su cuenta) ---------- */
function gimSpyBtn() { return isSpy() ? '<button class="btn" data-act="gimSpyBox">🎙️ Misión gimcana: graba tus mensajes</button>' : ''; }
var gimRec = null;
function gimSpyBoxOpen() {
  var load = gimCloud() ? CLOUD.sb().rpc('gim_spy_get').then(function (r) { if (r.error) throw r.error; return r.data; })
    : Promise.resolve({ slots: ((SEED.gimcana || {}).stations || []).map(function (s) { return { id: s.id, name: s.name, tip: s.spyTip }; }), spy: GIM.spy || {} });
  load.then(function (d) {
    GIM.spy = d.spy || {};
    var slots = [{ id: 'intro', name: 'La presentación', tip: 'Te presentas a los agentes: has robado el tesoro del cumpleaños de ' + bdayName() + ' y les retas a recuperarlo. Chulesco, misterioso y con humor.' }].concat(d.slots || []).concat([{ id: 'final', name: 'El final', tip: 'Han abierto el cofre. Reconoces la derrota (por esta vez) y les dices que tu identidad se sabrá… en la gala.' }]);
    openSheet('<h2>🕵️ Tu misión en la gimcana</h2><p class="small">El domingo por la noche los peques harán una gimcana y <b>tú eres el villano</b>. No hace falta que estés: graba ahora un mensaje corto (máx. 20 s) para cada momento, o escríbelo. <b>Tu voz sonará distorsionada</b>, así que nadie sabrá quién eres. No verás las soluciones: solo lo que pasa en cada parada.</p>' +
      slots.map(function (s) { var m = GIM.spy[s.id] || {}; return '<section class="card spy-slot" data-s="' + s.id + '"><h3>' + esc(s.name) + '</h3><p class="small muted">' + esc(s.tip || '') + '</p><textarea data-s="' + s.id + '" maxlength="600" placeholder="Escribe tu mensaje (opcional si grabas)">' + esc(m.text || '') + '</textarea><div class="row wrap"><button class="btn" data-act="gimRec" data-s="' + s.id + '">🎙️ ' + (m.audio ? 'Volver a grabar' : 'Grabar (20 s)') + '</button>' + (m.audio ? '<button class="btn ghost" data-act="gimSpyPlay" data-s="' + s.id + '">' + icon('play') + 'Oír cómo suena</button>' : '') + '<button class="btn primary" data-act="gimSpySave" data-s="' + s.id + '">Guardar</button></div></section>'; }).join('') +
      '<button class="btn block" data-act="close">Cerrar</button>');
  }, function () { toast('No he podido abrir tu buzón secreto'); });
}
function gimRecord(slot, btn) {
  if (gimRec) { gimRec.stop(); return; }
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Este móvil no deja grabar: escribe el mensaje'); return; }
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
    var type = ['audio/webm', 'audio/mp4', 'audio/ogg'].find(function (t) { return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t); }) || '';
    var rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined), chunks = [], tm;
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = function () {
      clearTimeout(tm); stream.getTracks().forEach(function (t) { t.stop(); }); gimRec = null; btn.textContent = '🎙️ Volver a grabar';
      var blob = new Blob(chunks, { type: rec.mimeType || type || 'audio/webm' }), ext = /mp4/.test(blob.type) ? 'm4a' : /ogg/.test(blob.type) ? 'ogg' : 'webm';
      gimSpyUpload(slot, blob, ext);
    };
    rec.start(); gimRec = rec; btn.textContent = '⏹ Parar (grabando…)'; tm = setTimeout(function () { if (rec.state === 'recording') rec.stop(); }, 20000);
  }, function () { toast('Sin permiso para el micrófono'); });
}
function gimSpyUpload(slot, blob, ext) {
  var txt = (document.querySelector('.spy-slot textarea[data-s="' + slot + '"]') || {}).value || '';
  if (!gimCloud()) { GIM.spy[slot] = { text: txt, audio: URL.createObjectURL(blob) }; gimSave(); toast('Grabado (demo)'); return; }
  var path = 'spy/' + slot + '.' + ext;
  CLOUD.sb().storage.from('gimcana').upload(path, blob, { upsert: true, contentType: blob.type }).then(function (r) {
    if (r.error) throw r.error; return CLOUD.sb().rpc('gim_spy_save', { p_slot: slot, p_text: txt, p_audio: path });
  }).then(function (r) { if (r && r.error) throw r.error; GIM.spy[slot] = { text: txt, audio: path }; toast('Grabado. Tu voz ya suena a villano'); gimSpyPlay(slot); }, function () { toast('No se ha podido subir la grabación'); });
}

/* ---------- Acciones ---------- */
var gimHoldT = null;
Object.assign(A, {
  gimOpen: function () { gimGate(); },
  gimGateNo: function () { var g = document.getElementById('gim-gate'); if (g) g.remove(); },
  gimHold: function () {},
  gimAdmClose: function () { gimAdmClose(); },
  gimTab: function (el) { gimAdm.tab = el.dataset.v; gimAdmRender(); },
  gimReveal: function (el) { el.classList.toggle('shown'); },
  gimKidStart: function (el) { gimKidStart(el.dataset.t, !!el.dataset.rehearsal); },
  gimSpyMsg: function (el) {
    var t = el.dataset.t, q = (GIM.content.spyQuick || []);
    openSheet('<h2>🕵️ Mensaje del Espía</h2><p class="small">Les aparece en la pantalla del equipo, firmado por el Espía.</p><div class="stack" style="gap:6px">' + q.map(function (m, i) { return '<button class="btn block" data-act="gimSpySend" data-t="' + t + '" data-i="' + i + '">' + esc(m) + '</button>'; }).join('') + '</div><div class="field"><label for="gim-free">O escribe el tuyo</label><input id="gim-free" maxlength="160" placeholder="Os veo… (más o menos)"></div><button class="btn primary block" data-act="gimSpySend" data-t="' + t + '">Enviar</button>');
  },
  gimSpySend: function (el) { var t = el.dataset.t, txt = el.dataset.i != null ? GIM.content.spyQuick[+el.dataset.i] : (document.getElementById('gim-free') || {}).value; if (!txt || !txt.trim()) { toast('Escribe algo'); return; } closeSheet(); gimSendMsg(t, txt.trim()); },
  gimHint: function (el) { var t = el.dataset.t, s = GIM.teams[t] || {}, st = gimRoute(t)[Math.min(s.idx || 0, GIM.content.stations.length - 1)]; gimSendMsg(t, 'Pista de regalo (no te acostumbres): ' + st.hint); },
  gimSkip: function (el) { var t = el.dataset.t, s = gimState(t), st = gimRoute(t)[s.idx]; if (!st) return; s.letters = s.letters || []; s.letters[s.idx] = st.letter; s.idx++; s.phase = 'riddle'; s.wrong = 0; s.hintShown = false; s.skips = (s.skips || 0) + 1; gimSave('team-' + t, s).then(function () { gimSendMsg(t, 'Vale, os regalo esta letra: ' + st.letter + '. Pero que conste que me da pena.'); gimAdmRender(); }); },
  gimReset: function (el) { if (!el.dataset.armed) { el.dataset.armed = 1; el.textContent = '¿Seguro? Toca otra vez'; return; } var t = el.dataset.t; GIM.teams[t] = { idx: 0, phase: 'intro', letters: [], wrong: 0 }; gimSave('team-' + t, GIM.teams[t]).then(gimAdmRender); },
  gimMember: function (el) { var t = gimTeamCfg(el.dataset.t), p = el.dataset.p; GIM.content.teams.forEach(function (x) { var k = x.members.indexOf(p); if (k >= 0) x.members.splice(k, 1); }); if (!el.classList.contains('on')) t.members.push(p); gimSaveContent().then(gimAdmRender); },
  gimSpyPlay: function (el) { gimSpyPlay(el.dataset.s).then(function (ok) { if (!ok) toast(gimSpyText(el.dataset.s) || 'Sin grabación'); }); },
  /* modo pekes */
  gimKidExitHold: function () {},
  gimKidBegin: function () { var s = gimState(gimKid.team), v = (document.getElementById('gk-name') || {}).value; s.name = (v || '').trim() || s.name || null; if (!s.t0 && !gimKid.rehearsal) s.t0 = Date.now(); if (gimKid.rehearsal && !s.t0) s.t0 = Date.now(); s.idx = s.idx || 0; s.wrong = 0; gimAdvance('riddle'); },
  gimAnswer: function () {
    var s = gimState(gimKid.team), st = gimRoute(gimKid.team)[s.idx], v = gimNorm((document.getElementById('gk-ans') || {}).value);
    if (!v) return gimFb('Escribid algo, agentes', true);
    var ok = st.answers.some(function (a) { var n = gimNorm(a); return v === n || (v.length > 3 && (v.indexOf(n) >= 0 || n.indexOf(v) >= 0)); });
    if (ok) { s.wrong = 0; s.hintShown = false; try { tada(false); } catch (e) {} gimAdvance('go'); }
    else { s.wrong = (s.wrong || 0) + 1; gimPersist(gimKid.team); if (s.wrong === 2) { gimKidRender(); setTimeout(function () { gimFb('Os dejo una pista. Soy así de generoso.'); }, 50); } else gimFb(pickOne(GIM_MISS, v + s.wrong), true); }
  },
  gimComodin: function () { var s = gimState(gimKid.team); s.comodin = true; s.hintShown = true; gimPersist(gimKid.team); gimKidRender(); var d = document.createElement('div'); d.className = 'gk-live'; d.innerHTML = '<div><span class="gk-tag">👵👴 Comodín del abuelo</span><p>' + esc(GIM.content.comodin) + '</p><button class="btn primary" data-act="gimLiveOk">¡Vamos!</button></div>'; document.getElementById('gim-kid').appendChild(d); },
  gimFound: function () { gimKid.code = ''; gimAdvance('code'); },
  gimBackRiddle: function () { gimAdvance('riddle'); },
  gimKey: function (el) {
    var k = el.dataset.k, s = gimState(gimKid.team), st = gimRoute(gimKid.team)[s.idx]; gimKid.code = gimKid.code || '';
    if (k === 'x') gimKid.code = gimKid.code.slice(0, -1); else if (k === 'ok') {} else if (gimKid.code.length < 3) gimKid.code += k;
    var bs = document.querySelectorAll('#gk-code b'); bs.forEach(function (b, i) { b.textContent = gimKid.code[i] || ''; });
    if (gimKid.code.length === 3) { if (gimKid.code === st.code) { gimFb('¡Código correcto!'); setTimeout(function () { gimAdvance('game'); }, 500); } else { gimFb('Ese código no es. ¿Seguro que es el sobre de aquí?', true); gimKid.code = ''; setTimeout(function () { document.querySelectorAll('#gk-code b').forEach(function (b) { b.textContent = ''; }); }, 600); } }
  },
  gimNext: function () { var s = gimState(gimKid.team); s.idx++; s.wrong = 0; s.hintShown = false; s.phase = s.idx >= gimRoute(gimKid.team).length ? 'final' : 'riddle'; gimPersist(gimKid.team); gimKidRender(); },
  gimManualWin: function () { gimWin(); },
  gimWho: function (el) { if (gimG && gimG.answer) gimG.answer(el.dataset.id); },
  gimQuiz: function (el) { if (gimG && gimG.answer) gimG.answer(+el.dataset.k); },
  gimCandle: function (el) { if (gimG && gimG.candle) gimG.candle(el.dataset.i); },
  gimGoals: function () { if (gimG && gimG.goals) gimG.goals(); },
  gimShakeTap: function () { if (gimG && gimG.tap) gimG.tap(); },
  gimSimon: function (el) { if (gimG && gimG.press) gimG.press(+el.dataset.i); },
  gimTile: function (el) {
    var s = gimState(gimKid.team), C = GIM.content; s.pick = s.pick || []; s.pick.push(+el.dataset.i);
    if (s.pick.length === C.word.length) {
      var w = s.pick.map(function (i) { return s.tiles[i]; }).join('');
      if (w === C.word) { s.solved = true; gimPersist(gimKid.team); gimKidRender(); try { confetti(3000); fanfare(); } catch (e) {} return; }
      gimKidRender(); gimFb('Esa palabra no abre nada. Pensad: ¿qué celebramos hoy?', true); s.pick = []; setTimeout(gimKidRender, 1400); return;
    }
    gimKidRender();
  },
  gimTileClear: function () { var s = gimState(gimKid.team); s.pick = []; gimKidRender(); },
  gimOpenChest: function () { var s = gimState(gimKid.team); s.t1 = Date.now(); s.phase = 'done'; gimPersist(gimKid.team); gimKidRender(); gimFinishGame(); try { fireworks(5000, 10); cannonsFx(200); rocketFx(400); applause(3); gimSpyPlay('final'); } catch (e) {} },
  gimLiveOk: function (el) { var d = el.closest('.gk-live'); if (d) d.remove(); },
  gimKidAudio: function (el) { gimSpyPlay(el.dataset.s).then(function (ok) { if (!ok) toast('Sin audio'); }); },
  /* buzón del Espía */
  gimSpyBox: function () { gimSpyBoxOpen(); },
  gimRec: function (el) { gimRecord(el.dataset.s, el); },
  gimSpySave: function (el) {
    var slot = el.dataset.s, txt = (document.querySelector('.spy-slot textarea[data-s="' + slot + '"]') || {}).value || '', cur = GIM.spy[slot] || {};
    if (!gimCloud()) { GIM.spy[slot] = { text: txt, audio: cur.audio || null }; gimSave(); toast('Guardado (demo)'); return; }
    CLOUD.sb().rpc('gim_spy_save', { p_slot: slot, p_text: txt, p_audio: cur.audio || null }).then(function (r) { if (r.error) throw r.error; GIM.spy[slot] = { text: txt, audio: cur.audio || null }; toast('Guardado. Muajajá'); }, function () { toast('No se ha podido guardar'); });
  }
});
Object.assign(C, { gimGuide: function (el) { var t = gimTeamCfg(el.dataset.t); t.guide = el.value || null; gimSaveContent(); } });

/* Al terminar un equipo: su puesto, al juego de la gimcana (por tiempo) */
function gimFinishGame() {
  if (gimKid && gimKid.rehearsal) return;
  var g = (S.games || []).find(gimIsGame); if (!g) return;
  var C = GIM.content, done = C.teams.filter(function (t) { var s = GIM.teams[t.id]; return s && s.t1 && s.t0; }).sort(function (a, b) { var x = GIM.teams[a.id], y = GIM.teams[b.id]; return (x.t1 - x.t0) - (y.t1 - y.t0); });
  g.teams = C.teams.filter(function (t) { return t.members.length && GIM.teams[t.id] && GIM.teams[t.id].t0; }).map(function (t) { return { id: t.id, name: (GIM.teams[t.id] && GIM.teams[t.id].name) || t.name, members: t.members.slice() }; });
  g.order = done.map(function (t) { return t.id; });
  try { save(); } catch (e) {}
}

/* Mantener pulsado (la puerta de adultos y la salida del modo pekes) */
function gimPressStart(e) {
  var b = e.target.closest && e.target.closest('.gg-hold, .gk-exit'); if (!b) return;
  e.preventDefault(); b.classList.add('holding'); var ms = b.classList.contains('gk-exit') ? 2500 : 1500;
  clearTimeout(gimHoldT); gimHoldT = setTimeout(function () { b.classList.remove('holding'); if (b.classList.contains('gk-exit')) gimKidClose(); else gimAdmOpen(); }, ms);
}
function gimPressEnd() { clearTimeout(gimHoldT); document.querySelectorAll('.gg-hold.holding, .gk-exit.holding').forEach(function (b) { b.classList.remove('holding'); }); }
document.addEventListener('pointerdown', gimPressStart);
['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { document.addEventListener(ev, gimPressEnd); });
document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && gimKid && e.target && e.target.id === 'gk-ans') A.gimAnswer(); if (e.key === 'Enter' && gimKid && e.target && e.target.id === 'gk-name') A.gimKidBegin(); });
