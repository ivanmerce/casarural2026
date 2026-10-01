/* ===================== Gala de premios v3 =====================
   Corta y para todos: UNA estatuilla por persona (la suya, la más suya), en ráfagas de 3, y el podio al final en una
   sola pantalla. Fiesta de fondo (pompas, confeti, cohetes), un efecto distinto en cada desvelado, varias melodías propias
   (sintetizadas, sin derechos), avance automático y modo presentación a pantalla completa. Unos 3 minutos. */

var GALA_TIME = { intro: 6, burst0: 2.6, burst1: 7.5, podStep0: 2.2, podStep1: 3.2, podEnd: 7, ad: 5, teaser: 6, photos: 8, final: 9, credits: 16 };
var GALA_PODIUM = { oro: 1, plata: 1, bronce: 1 };

/* ---------- La estatuilla de cada uno ----------
   De todos los premios que tiene una persona, el más «suyo»: el que comparte con menos gente y aún no ha salido. */
function galaPicks(list) {
  var t = {}, byId = {}, e = S.trip.eggs || {};
  list.forEach(function (a) { byId[a.id] = a; });
  var people = S.people.concat(S.spies || []);
  people.forEach(function (p) { t[p.id] = []; });
  list.forEach(function (a) { if (GALA_PODIUM[a.id]) return; var seen = {}; a.winners.forEach(function (w) { G.peopleOf(S, w).forEach(function (pid) { if (t[pid] && !seen[pid]) { seen[pid] = 1; t[pid].push(a); } }); }); });
  var used = {}, out = [], mi = Math.floor(Math.random() * GALA_MENTIONS.length);
  /* primero los que solo tienen una opción, para que nadie se quede sin la suya */
  people.slice().sort(function (x, y) { return t[x.id].length - t[y.id].length; }).forEach(function (p) {
    var fixed = p.id === e.bday ? byId.cumple : p.id === e.baby ? byId.mascota : p.spy ? byId.espia : null;
    var opts = t[p.id].filter(function (a) { return (used[a.id] || 0) < 2; }).sort(function (a, b) { return (used[a.id] || 0) - (used[b.id] || 0) || personalness(a) - personalness(b); });
    /* si su premio ya ha salido dos veces, una mención especial solo para él (así no se repite) */
    var a = fixed || opts[0] || (t[p.id].length ? galaMention(p.id, mi++) : byId.estrella) || galaMention(p.id, mi++);
    used[a.id] = (used[a.id] || 0) + 1;
    out.push({ pid: p.id, a: a });
  });
  function personalness(a) { var n = 0; a.winners.forEach(function (w) { n += G.peopleOf(S, w).length; }); return n; }
  /* orden del espectáculo: mezclados, el espía por en medio y el cumpleañero cerrando las ráfagas */
  var bday = out.filter(function (x) { return x.pid === e.bday; }), spy = out.filter(function (x) { return (person(x.pid) || {}).spy; });
  var rest = shuffled(out.filter(function (x) { return bday.indexOf(x) < 0 && spy.indexOf(x) < 0; }));
  if (spy.length) rest.splice(Math.min(rest.length, 4), 0, spy[0]);
  return rest.concat(bday);
}

/* Menciones especiales: títulos cariñosos para que nadie repita estatuilla */
var GALA_MENTIONS = [
  ['Sonrisa del Finde', 'smile', 'Ni la lluvia ni el ping-pong le han quitado la sonrisa. Ni una vez.'],
  ['Corazón Culé', 'heart', 'Más culé que un Barça-Madrid en el Camp Nou. Visca el Barça y visca la familia.'],
  ['Abrazo de Oso', 'users', 'Sus abrazos deberían venderse en farmacias.'],
  ['Alma de la Sobremesa', 'meals', 'Cuando se levanta de la mesa, la sobremesa se acaba. Así de claro.'],
  ['Buen Rollo Certificado', 'check', 'Certificado oficial: 100 % buen rollo, 0 % dramas.'],
  ['Estrella del Selfie', 'camera', 'Sale bien en todas las fotos. Todas. Es sospechoso.'],
  ['Risa Contagiosa', 'smile', 'Se ríe y nos reímos todos. Es un superpoder.'],
  ['Mejor Fichaje del Finde', 'star', 'Si esto fuera el Barça, ya tendría contrato hasta 2030.']
];
function galaMention(pid, k) { var m = GALA_MENTIONS[k % GALA_MENTIONS.length]; GALA_QUIP['m-' + m[0]] = m[2]; return { id: 'm-' + m[0], icon: m[1], name: 'Mención especial: ' + m[0], desc: '', winners: [pid], why: '' }; }

/* ---------- Guion ---------- */
function galaSlides(trailer, awardsList) {
  if (trailer) return [{ t: 'intro', trailer: true }, { t: 'ad', ad: GALA_ADS[0] }, { t: 'teaser' }, { t: 'final', trailer: true }];
  var list = (awardsList || G.awards(S)).filter(function (a) { return a.winners.length; });
  var picks = galaPicks(list), slides = [{ t: 'intro', n: picks.length }];
  /* ráfagas de 3 (si sobra uno solo, se va con la anterior) */
  var groups = []; for (var i = 0; i < picks.length; i += 3) groups.push(picks.slice(i, i + 3));
  if (groups.length > 1 && groups[groups.length - 1].length === 1) groups[groups.length - 2] = groups[groups.length - 2].concat(groups.pop());
  groups.forEach(function (g, k) { slides.push({ t: 'burst', items: g, song: k % 2 ? 2 : 1 }); if (k === 1) slides.push({ t: 'ad', ad: rnd(GALA_ADS) }); });
  if (typeof photoList === 'function' && photoList().length >= 3) slides.push({ t: 'photos' });
  var pod = ['bronce', 'plata', 'oro'].map(function (id) { return list.find(function (a) { return a.id === id; }); }).filter(Boolean);
  if (pod.length) slides.push({ t: 'podium', pods: pod, song: 3 });
  slides.push({ t: 'final', picks: picks }, { t: 'credits' });
  return slides;
}
function galaMinutes(slides) {
  var s = 0; slides.forEach(function (x) { s += x.t === 'burst' ? GALA_TIME.burst0 + GALA_TIME.burst1 + 1.6 : x.t === 'podium' ? x.pods.length * (GALA_TIME.podStep0 + GALA_TIME.podStep1) + GALA_TIME.podEnd : GALA_TIME[x.t] || 5; });
  return Math.max(1, Math.round(s / 60));
}

/* ---------- Pantallas ---------- */
var GALA_ENTER = ['flip', 'zoom', 'drop', 'spin', 'slide'];
var GALA_ASK = ['¿Qué se lleva…?', 'Para ti, este sobre…', 'A ver, a ver…', 'Lo que todos sospechábamos…', 'Redoble, por favor…', '¿Adivináis?'];
function winnersHtml(a, size) { return a.winners.map(function (w) { return '<span class="gw">' + eAv(w, size || 'xl') + '<b>' + eName(w) + '</b></span>'; }).join(''); }
function galaRender() {
  var el = document.getElementById('gala'); if (!el || !gala) return;
  var s = gala.slides[gala.i], inner = '', rv = gala.revealed;
  el.classList.toggle('is-ad', s.t === 'ad'); el.dataset.slide = s.t;
  if (s.t === 'intro') inner = '<div class="gala-curtain" aria-hidden="true"><i></i><i></i></div><span class="eyebrow">' + esc(S.trip.name) + (gala.rehearsal ? ' · ensayo' : gala.sim ? ' · simulación' : '') + '</span><h1 class="gala-title xl">' + (s.trailer ? 'Próximamente' : 'Gala de premios') + '</h1>' +
    (s.trailer ? '<p>La gran noche llega el <b>' + esc(galaWhen()) + '</b>. Esto es solo el tráiler: sin spoilers, que nos conocemos.</p>'
      : '<p>Una estatuilla para cada uno. Nadie se va de vacío.</p><p class="small">' + s.n + ' estatuillas + el podio · unos ' + galaMinutes(gala.slides) + ' minutos · cero modestia</p>' +
        '<div class="gala-start"><button class="btn primary big-btn" data-act="galaGo" data-auto="1">' + icon('play') + 'Empezar (avanza sola)</button><button class="btn" data-act="galaGo">Paso a paso</button></div>');
  else if (s.t === 'ad') inner = '<span class="gala-ad-tag">Pausa publicitaria</span><h1 class="gala-title ad">' + esc(s.ad[0]) + '</h1><p>' + esc(s.ad[1]) + '</p>';
  else if (s.t === 'teaser') inner = '<span class="gala-ico">' + icon('trophy') + '</span><h1 class="gala-title">Una estatuilla para cada uno</h1><p>Sobres, redoble, discursos de 30 segundos y un podio que va a dar que hablar.</p>';
  else if (s.t === 'burst') {
    inner = '<span class="eyebrow">' + esc(pickOne(GALA_ASK, gala.i)) + '</span><div class="gala-burst" style="--n:' + s.items.length + '">' + s.items.map(function (x, k) {
      var a = x.a, fx = GALA_ENTER[(gala.i + k) % GALA_ENTER.length];
      return '<div class="gb fx-' + fx + (rv === true ? ' on' : '') + '" style="--d:' + (k * .5) + 's"><span class="gb-av">' + av(x.pid, 'xl') + '</span><b class="gb-who">' + pname(x.pid) + '</b>' +
        (rv === true ? '<span class="gb-ico">' + icon(a.icon || 'star') + '</span><b class="gb-name">' + esc(a.name) + '</b><small class="gb-quip">' + esc(GALA_QUIP[a.id] || a.why || '') + '</small>'
          : '<span class="gb-env' + (rv === 'wait' ? ' opening' : '') + '" aria-hidden="true"></span>') + '</div>';
    }).join('') + '</div>' + (rv === true ? '' : '<p class="gala-drum' + (rv === 'wait' ? ' rolling' : '') + '">' + esc(pickOne(GALA_DRUM, gala.i)) + '</p>');
  } else if (s.t === 'podium') {
    var step = typeof rv === 'number' ? rv : 0, order = { bronce: 3, plata: 2, oro: 1 };
    inner = '<span class="eyebrow">Lo que todos esperabais</span><h1 class="gala-title">El podio</h1><div class="gala-podium">' + ['plata', 'oro', 'bronce'].map(function (id) {
      var a = s.pods.find(function (x) { return x.id === id; }); if (!a) return '';
      var k = s.pods.indexOf(a), on = step > k;
      return '<div class="gp gp-' + id + (on ? ' on' : '') + '"><div class="gp-who">' + (on ? winnersHtml(a, 'lg') + '<small class="gp-pts">' + esc(a.why || '') + '</small>' : '<span class="gp-q">?</span>') + '</div><div class="gp-block"><b>' + order[id] + '</b></div></div>';
    }).join('') + '</div>' + (step >= s.pods.length ? '<p class="gala-quip">' + esc(GALA_QUIP.oro) + '</p><button class="btn gala-speech" data-act="galaSpeech">🎤 Discurso del campeón (30 s)</button>' : '<p class="gala-drum' + (gala.podWait ? ' rolling' : '') + '">' + ['Tercer puesto…', 'Segundo puesto…', 'Y el campeón del finde es…'][step] + '</p>');
  } else if (s.t === 'photos') {
    var ps = photoList().slice().sort(function () { return Math.random() - .5; }).slice(0, 12);
    inner = '<span class="eyebrow">Mientras el jurado delibera…</span><h1 class="gala-title">Momentos del finde</h1><div class="gala-photos">' + ps.map(function (p, k) { var u = PHOTOS.url(p.thumb) || PHOTOS.url(p.path); return u ? '<img src="' + u + '" alt="" style="--d:' + (k * .2) + 's;--r:' + ((k % 2 ? 1 : -1) * (2 + k % 4)) + 'deg">' : ''; }).join('') + '</div>';
    if (typeof PHOTOS !== 'undefined' && PHOTOS.ensure) PHOTOS.ensure(ps.map(function (p) { return p.thumb; })).then(function (ch) { if (ch && gala && gala.slides[gala.i] === s) galaRender(); });
  } else if (s.t === 'final') {
    if (s.trailer) inner = '<span class="eyebrow">' + esc(galaWhen()) + '</span><h1 class="gala-title">No te lo pierdas</h1><p>Trae palomitas, pañuelos y el discurso preparado. Por si acaso.</p>';
    else inner = '<span class="eyebrow">Habemus premiados</span><h1 class="gala-title">¡Gracias, familia!</h1><div class="gala-all">' + s.picks.map(function (x, k) { return '<div class="ga" style="--d:' + (k * .07) + 's">' + av(x.pid, 'md') + '<b>' + pname(x.pid) + '</b><small>' + esc(x.a.name) + '</small></div>'; }).join('') + '</div>';
  } else if (s.t === 'credits') inner = galaCredits();
  el.querySelector('.gala-in').innerHTML = inner;
  el.querySelector('.gala-count').textContent = (gala.i + 1) + ' / ' + gala.slides.length;
  el.querySelector('[data-act=galaPrev]').disabled = gala.i === 0;
  var waiting = (s.t === 'burst' && rv !== true) || (s.t === 'podium' && (typeof rv !== 'number' || rv < s.pods.length));
  el.querySelector('.gala-ctl [data-act=galaNext]').innerHTML = waiting ? (s.t === 'podium' ? 'Desvelar' : 'Abrir los sobres') : gala.i === gala.slides.length - 1 ? 'Cerrar' : 'Siguiente ' + icon('arrow');
  el.querySelector('[data-act=galaAuto]').classList.toggle('on', !!gala.auto);
  el.querySelector('[data-act=galaMusic]').classList.toggle('on', !!gala.music);
  galaFxMood(s);
  if (gala.music && s.song != null && GM && GM.song !== s.song) galaMusicSong(s.song);
  galaAutoArm();
}

/* ---------- Un efecto distinto cada vez ---------- */
var GALA_FX = [
  function () { try { rocketFx(0); rocketFx(450); } catch (x) {} },
  function () { try { cannonsFx(0); } catch (x) {} },
  function () { try { emojiFx(['🎉', '🥳', '🎊', '✨'], 'rain', 0, 34); } catch (x) {} },
  function () { try { starsFx(0); } catch (x) {} },
  function () { try { emojiFx(['🏆', '🥇', '👏', '🙌'], 'rise', 0, 30); } catch (x) {} },
  function () { try { fireworks(3200, 6); } catch (x) {} },
  function () { try { emojiFx(['😂', '🤣', '😎', '🤩'], 'rain', 0, 30); } catch (x) {} },
  function () { try { smokeFx(0); emojiFx(['🕊️', '💫'], 'rise', 300, 20); } catch (x) {} }
];
function galaFxRandom(k) { GALA_FX[(gala.fxI = ((gala.fxI || 0) + 1 + (k || 0)) % GALA_FX.length)](); }

/* ---------- Avanzar (a mano o sola) ---------- */
function galaReveal() {
  var s = gala.slides[gala.i];
  if (s.t === 'podium') {
    var step = typeof gala.revealed === 'number' ? gala.revealed : 0; if (gala.podWait || step >= s.pods.length) return;
    gala.podWait = true; gala.revealed = step; galaMusicDuck(true); drumroll(step === s.pods.length - 1); galaRender();
    setTimeout(function () {
      if (!gala || gala.slides[gala.i] !== s) return;
      gala.podWait = false; gala.revealed = step + 1; galaMusicDuck(false); galaRender();
      var gold = s.pods[step].id === 'oro';
      applause(gold ? 3.4 : 2); confetti(gold ? 4200 : 2200); galaFxBurstAt('.gp-' + s.pods[step].id);
      if (gold) { fanfare(); try { fireworks(5600, 14); cannonsFx(200); rocketFx(400); emojiFx(['🏆', '👑', '✨', '🥇'], 'rain', 700, 40); } catch (x) {} } else galaFxRandom();
    }, step === s.pods.length - 1 ? 2400 : 1600);
    return;
  }
  if (gala.revealed) return;
  gala.revealed = 'wait'; galaMusicDuck(true); drumroll(false); galaRender();
  setTimeout(function () {
    if (!gala || gala.slides[gala.i] !== s) return;
    gala.revealed = true; galaMusicDuck(false); galaRender();
    applause(2); confetti(2000);
    s.items.forEach(function (x, k) { setTimeout(function () { galaFxBurstAt('.gb:nth-child(' + (k + 1) + ')'); }, k * 500 + 300); });
    galaFxRandom(gala.i);
    if (navigator.vibrate) try { navigator.vibrate([30, 40, 30]); } catch (x) {}
  }, 1300);
}
function galaStep(dir) {
  if (!gala) return; clearTimeout(gala.timer);
  var s = gala.slides[gala.i];
  var pending = (s.t === 'burst' && gala.revealed !== true) || (s.t === 'podium' && (typeof gala.revealed !== 'number' || gala.revealed < s.pods.length));
  if (dir > 0 && pending) { galaReveal(); return; }
  if (dir > 0 && gala.i >= gala.slides.length - 1) { var wasSim = gala.sim; galaClose(); if (!wasSim) egg('gala'); return; }
  if (dir < 0 && !gala.i) return;
  gala.i += dir; var n = gala.slides[gala.i];
  gala.podWait = false;
  gala.revealed = dir < 0 ? (n.t === 'podium' ? n.pods.length : n.t === 'burst') : (n.t === 'podium' ? 0 : false);
  clearInterval(speechT); var mic = document.querySelector('.gala-mic'); if (mic) mic.remove();
  galaRender();
  if (n.t === 'final' && !gala.trailer) { confetti(3400); applause(3); try { rocketFx(0); rocketFx(600); cannonsFx(300); } catch (x) {} }
  if (gala.i === gala.slides.length - 1 && !gala.sim) egg('gala');
}
function galaAutoArm() {
  if (!gala) return; clearTimeout(gala.timer); var bar = document.querySelector('.gala-prog i');
  var stop = function () { if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; } };
  if (!gala.auto || gala.paused || document.querySelector('.gala-mic')) return stop();
  var s = gala.slides[gala.i], rv = gala.revealed, sec;
  if (s.t === 'intro' && !gala.trailer && gala.i === 0 && !gala.started) return stop();
  if (s.t === 'burst') sec = rv === true ? GALA_TIME.burst1 : rv ? 0 : GALA_TIME.burst0;
  else if (s.t === 'podium') { if (gala.podWait) return stop(); var st = typeof rv === 'number' ? rv : 0; sec = st >= s.pods.length ? GALA_TIME.podEnd : st === 0 ? GALA_TIME.podStep0 : GALA_TIME.podStep1; }
  else sec = GALA_TIME[s.t] || 5;
  if (!sec) return stop();
  if (s.t === 'credits' && gala.i === gala.slides.length - 1) return stop();
  if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = 'width ' + sec + 's linear'; bar.style.width = '100%'; }
  gala.timer = setTimeout(function () { galaStep(1); }, sec * 1000);
}

/* ---------- Música de fondo: cuatro melodías propias, una por momento ---------- */
var GALA_SONGS = [
  { bpm: 112, ch: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], mel: [76, 79, 81, 79, 76, 74, 72, 74, 76, 74, 72, 67, 69, 72, 74, 76], lead: 'triangle' },   /* entrada: alegre */
  { bpm: 124, ch: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [60, 64, 67]], mel: [69, 72, 76, 72, 74, 77, 74, 72, 71, 74, 79, 74, 72, 76, 79, 81], lead: 'square', disco: 1 },   /* ráfagas: disco */
  { bpm: 132, ch: [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]], mel: [74, 78, 81, 78, 76, 74, 71, 74, 79, 78, 76, 74, 73, 76, 81, 76], lead: 'sawtooth', swing: 1 },   /* ráfagas: fiesta */
  { bpm: 88, ch: [[62, 65, 69], [58, 62, 65], [53, 57, 60], [60, 64, 67]], mel: [74, 77, 81, 79, 77, 76, 74, 72, 74, 77, 82, 81, 79, 77, 76, 74], lead: 'triangle', epic: 1 }   /* podio: épica */
];
var GM = null;
function galaMusicStart(song) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    if (GM) return;
    var S0 = GALA_SONGS[song || 0], master = actx.createGain(), lp = actx.createBiquadFilter(); master.gain.value = 0.0001; lp.type = 'lowpass'; lp.frequency.value = S0.epic ? 2400 : 3400;
    master.connect(lp); lp.connect(actx.destination); master.gain.exponentialRampToValueAtTime(0.15, actx.currentTime + 1.2);
    var beat = 60 / S0.bpm, step = beat / 2, i = 0, next = actx.currentTime + .08;
    var noise = actx.createBuffer(1, actx.sampleRate * .05, actx.sampleRate), nd = noise.getChannelData(0); for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function note(m, t, d, type, vol) { var o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(hz(m), t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02); }
    function hat(t, vol) { var src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); src.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = vol; src.connect(f); f.connect(g); g.connect(master); src.start(t); }
    function kick(t) { var o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + .12); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .16); o.connect(g); g.connect(master); o.start(t); o.stop(t + .18); }
    function clap(t) { var src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); src.buffer = noise; f.type = 'bandpass'; f.frequency.value = 1500; g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .12); src.connect(f); f.connect(g); g.connect(master); src.start(t); }
    var iv = setInterval(function () {
      while (next < actx.currentTime + .25) {
        var bar = Math.floor(i / 8) % 4, pos = i % 8, ch = S0.ch[bar], tt = next + (S0.swing && pos % 2 ? step * .18 : 0);
        if (S0.epic) { if (pos === 0) { ch.forEach(function (m) { note(m, tt, beat * 3.8, 'sawtooth', .025); }); note(ch[0] - 24, tt, beat * 3.6, 'triangle', .25); kick(tt); } if (pos === 4) kick(tt); if (pos % 2 === 0) note(ch[(pos / 2) % 3] + 12, tt, step * 1.8, 'triangle', .05); }
        else {
          if (pos === 0 || pos === 4 || (S0.disco && pos % 2 === 0)) kick(tt);
          if (S0.disco) note(ch[0] - (pos % 2 ? 12 : 24), tt, step * .9, 'triangle', .16);
          else { if (pos === 0 || pos === 4) note(ch[0] - 24, tt, beat * 1.6, 'triangle', .22); if (pos === 2 || pos === 6) note(ch[0] - 12, tt, beat * .7, 'triangle', .12); }
          note(ch[pos % 3] + 12, tt, step * .9, 'sine', .045);
          if (pos % 2) hat(tt, S0.disco ? .09 : .05); if (pos === 2 || pos === 6) clap(tt);
        }
        if (i % 2 === 0 && Math.floor(i / 32) % 2 === 1) note(S0.mel[(i / 2) % S0.mel.length], tt, step * 1.7, S0.lead, S0.lead === 'sawtooth' ? .018 : .028);
        next += step; i++;
      }
    }, 90);
    GM = { master: master, iv: iv, song: song || 0 };
  } catch (e) {}
}
function galaMusicStop() { if (!GM) return; try { var m = GM.master; m.gain.cancelScheduledValues(actx.currentTime); m.gain.setTargetAtTime(0.0001, actx.currentTime, .25); var iv = GM.iv; setTimeout(function () { clearInterval(iv); try { m.disconnect(); } catch (x) {} }, 1000); } catch (e) {} GM = null; }
function galaMusicSong(k) { galaMusicStop(); setTimeout(function () { if (gala && gala.music && !GM) galaMusicStart(k); }, 450); }
function galaMusicDuck(on) { if (!GM) return; try { GM.master.gain.setTargetAtTime(on ? 0.035 : 0.15, actx.currentTime, .2); } catch (e) {} }

/* ---------- Fiesta de fondo: pompas, confeti flotando y cohetes que cruzan ---------- */
var GFX = null;
function galaFxStart() {
  var el = document.getElementById('gala'); if (!el || GFX) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cv = document.createElement('canvas'); cv.className = 'gala-fx'; el.insertBefore(cv, el.firstChild);
  var ctx = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2), W, H;
  function size() { W = el.clientWidth; H = el.clientHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  size(); window.addEventListener('resize', size);
  var cols = ['#FF3B5C', '#FFD166', '#06D6A0', '#4CC9F0', '#F72585', '#E8B64A', '#FFFFFF'];
  var P = [], mood = { bubbles: .5, confetti: .4, rockets: .25 }, lastRocket = 0;
  function bubble() { P.push({ k: 'b', x: Math.random() * W, y: H + 20, r: 6 + Math.random() * 18, vy: -.4 - Math.random() * .8, w: Math.random() * 6, life: 1 }); }
  function flake() { P.push({ k: 'c', x: Math.random() * W, y: -10, s: 4 + Math.random() * 5, vy: .6 + Math.random() * 1.2, vx: (Math.random() - .5) * .6, a: Math.random() * 6, va: (Math.random() - .5) * .15, c: cols[Math.floor(Math.random() * cols.length)], life: 1 }); }
  function rocket() { var x = W * (.1 + Math.random() * .8); P.push({ k: 'r', x: x, y: H + 10, vx: (Math.random() - .5) * 1.4, vy: -(H / 70) - Math.random() * 3, top: H * (.12 + Math.random() * .3), c: cols[Math.floor(Math.random() * cols.length)], life: 1 }); }
  function boom(x, y, c, n) { for (var i = 0; i < (n || 46); i++) { var a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 4.5; P.push({ k: 's', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: c || cols[i % cols.length], life: 1 }); } }
  var raf, last = performance.now();
  (function f(t) {
    var dt = Math.min(50, t - last) / 16.7; last = t;
    if (Math.random() < .06 * mood.bubbles * dt) bubble();
    if (Math.random() < .12 * mood.confetti * dt) flake();
    if (mood.rockets && t - lastRocket > 4200 / mood.rockets && Math.random() < .02 * dt) { rocket(); lastRocket = t; }
    ctx.clearRect(0, 0, W, H);
    P.forEach(function (p) {
      if (p.k === 'b') { p.y += p.vy * dt; p.x += Math.sin((t / 700) + p.w) * .4; if (p.y < -30) p.life = 0;
        var g = ctx.createRadialGradient(p.x - p.r * .35, p.y - p.r * .35, 1, p.x, p.y, p.r); g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(180,220,255,.10)'); g.addColorStop(1, 'rgba(255,255,255,.28)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
      else if (p.k === 'c') { p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(t / 500 + p.a) * .3; p.a += p.va * dt; if (p.y > H + 10) p.life = 0;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = .75; ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); }
      else if (p.k === 'r') { p.x += p.vx * dt; p.y += p.vy * dt; ctx.fillStyle = '#FFF4C4'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,190,90,.35)'; ctx.beginPath(); ctx.arc(p.x - p.vx * 2, p.y - p.vy * 2, 2, 0, Math.PI * 2); ctx.fill();
        if (p.y <= p.top) { p.life = 0; boom(p.x, p.y, p.c); } }
      else if (p.k === 's') { p.vy += .05 * dt; p.vx *= .985; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= .014 * dt;
        ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    });
    P = P.filter(function (p) { return p.life > 0; }); if (P.length > 600) P.splice(0, P.length - 600);
    raf = requestAnimationFrame(f);
  })(last);
  GFX = { stop: function () { cancelAnimationFrame(raf); window.removeEventListener('resize', size); cv.remove(); }, mood: function (m) { mood = m; }, boom: function (x, y, n) { boom(x, y, null, n); } };
}
function galaFxMood(s) {
  if (!GFX) return;
  var m = { intro: { bubbles: .8, confetti: .6, rockets: .5 }, ad: { bubbles: .2, confetti: 0, rockets: 0 }, burst: { bubbles: .6, confetti: .6, rockets: .4 },
    podium: { bubbles: .8, confetti: .8, rockets: .8 }, photos: { bubbles: .9, confetti: .3, rockets: 0 }, final: { bubbles: 1, confetti: 1.4, rockets: 1.2 }, credits: { bubbles: .6, confetti: .6, rockets: .4 } }[s.t] || { bubbles: .5, confetti: .4, rockets: .25 };
  if (s.t === 'podium' && gala.revealed >= s.pods.length) m = { bubbles: 1, confetti: 1.6, rockets: 1.6 };
  GFX.mood(m);
}
function galaFxBurstAt(sel) {
  var el = document.getElementById('gala'), t = el && el.querySelector(sel); if (!t || !GFX) return;
  var r = t.getBoundingClientRect(), g = el.getBoundingClientRect(); GFX.boom(r.left - g.left + r.width / 2, r.top - g.top + r.height / 3, 70);
}

/* ---------- Modo presentación: pantalla completa, letra grande, controles que se esconden ---------- */
function galaPresent(on) {
  var el = document.getElementById('gala'); if (!el) return;
  var want = on == null ? !el.classList.contains('present') : on;
  el.classList.toggle('present', want);
  try {
    if (want && el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(function () {});
    else if (want && el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    if (!want && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  } catch (e) {}
  try { if (want && navigator.wakeLock && !gala.lock) navigator.wakeLock.request('screen').then(function (l) { if (gala) gala.lock = l; }); } catch (e) {}
  galaPoke();
}
function galaPoke() {
  var el = document.getElementById('gala'); if (!el) return;
  el.classList.add('awake'); clearTimeout(el._idle);
  el._idle = setTimeout(function () { el.classList.remove('awake'); }, 2600);
}

/* ---------- Abrir y cerrar ---------- */
function galaOpen(mode) {
  var trailer = mode === 'trailer', sim = mode === 'sim', list = sim ? simAwards() : null;
  gala = { slides: galaSlides(trailer, list), i: 0, revealed: false, trailer: trailer, rehearsal: mode === 'rehearsal', sim: sim, list: list, auto: trailer, music: true, started: trailer };
  var el = document.createElement('div'); el.className = 'gala awake'; el.id = 'gala'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Gala de premios');
  el.innerHTML = '<div class="gala-spot" aria-hidden="true"></div><div class="gala-spot s2" aria-hidden="true"></div>' +
    '<div class="gala-tools"><button class="icon-btn" data-act="galaMusic" aria-label="Música de fondo" title="Música">🎵</button><button class="icon-btn" data-act="galaAuto" aria-label="Avance automático" title="Avanza sola">' + icon('play') + '</button><button class="icon-btn" data-act="galaPresent" aria-label="Modo presentación" title="Pantalla completa">⛶</button></div>' +
    '<button class="gala-x icon-btn" data-act="galaExit" aria-label="Salir de la gala">' + icon('x') + '</button>' +
    '<div class="gala-in" data-act="galaNext" aria-live="polite"></div>' +
    '<div class="gala-ctl"><div class="gala-prog" aria-hidden="true"><i></i></div><button class="btn" data-act="galaPrev">' + icon('back') + '</button><span class="gala-count small"></span><button class="btn primary" data-act="galaNext"></button></div>';
  document.body.appendChild(el); document.body.style.overflow = 'hidden'; document.body.classList.add('gala-on'); overlayPush('gala');
  el.addEventListener('pointermove', galaPoke); el.addEventListener('pointerdown', galaPoke);
  galaFxStart(); galaMusicStart(0); galaRender(); try { fanfare(); } catch (e) {}
}
function galaClose(fromNav) {
  clearInterval(speechT); if (gala) clearTimeout(gala.timer); galaMusicStop(); if (GFX) { GFX.stop(); GFX = null; }
  try { if (gala && gala.lock) gala.lock.release(); if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {}); } catch (e) {}
  var el = document.getElementById('gala'); if (el) el.remove(); document.body.style.overflow = ''; document.body.classList.remove('gala-on'); gala = null; if (el && !fromNav) overlayDone();
}

Object.assign(A, {
  galaStart: function (el) { galaOpen(el.dataset.mode || (galaOpenNow() ? 'gala' : 'trailer')); },
  galaGo: function (el) { if (!gala) return; gala.started = true; gala.auto = !!el.dataset.auto; galaStep(1); },
  galaSpeech: function () { if (gala) clearTimeout(gala.timer); galaMusicDuck(true); galaSpeech(); },
  galaSpeechEnd: function () { clearInterval(speechT); var m = document.querySelector('.gala-mic'); if (m) m.remove(); applause(1.6); galaMusicDuck(false); galaAutoArm(); },
  galaExit: function () { galaClose(); },
  galaPrev: function () { galaStep(-1); },
  galaNext: function (el) {
    if (!gala) return;
    /* con avance automático, tocar la pantalla pausa (y vuelve a arrancar) */
    if (gala.auto && el && el.classList && el.classList.contains('gala-in') && gala.started) { gala.paused = !gala.paused; toast(gala.paused ? 'Pausa. Toca otra vez para seguir' : 'Seguimos'); galaAutoArm(); return; }
    if (gala.i === 0 && !gala.started && !gala.trailer) gala.started = true;
    gala.paused = false; galaStep(1);
  },
  galaAuto: function () { if (!gala) return; gala.auto = !gala.auto; gala.started = true; gala.paused = false; toast(gala.auto ? 'Avance automático: la gala va sola (toca para pausar)' : 'Avance manual'); galaRender(); },
  galaMusic: function () { if (!gala) return; gala.music = !gala.music; if (gala.music) galaMusicStart((gala.slides[gala.i] || {}).song || 0); else galaMusicStop(); galaRender(); },
  galaPresent: function () { galaPresent(); }
});
document.addEventListener('fullscreenchange', function () { var el = document.getElementById('gala'); if (el && !document.fullscreenElement) el.classList.remove('present'); });
document.addEventListener('keydown', function (e) { if (!gala) return; if (e.key === 'f' || e.key === 'F') galaPresent(); if (e.key === 'p' || e.key === 'P') A.galaAuto(); if (e.key === 'm' || e.key === 'M') A.galaMusic(); });
