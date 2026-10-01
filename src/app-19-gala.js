/* ===================== Gala de premios v2 =====================
   Más corta (ráfagas de 3 premios y solo lo gordo a solas), con fiesta de fondo (pompas, confeti, cohetes),
   música propia (sintetizada, sin derechos de autor), avance automático y modo presentación a pantalla completa. */

var GALA_STAR = { cumple: 1, espia: 1, estrella: 1, guardian: 1 };   /* premios que se desvelan a solas (además del podio) */
var GALA_TIME = { intro: 7, group: 4, burst0: 3.5, burst1: 10, award0: 3.5, award1: 8, podium1: 10, ad: 6, teaser: 7, photos: 12, final: 11, credits: 27 };

/* ---------- Guion ---------- */
function galaSlides(trailer, awardsList) {
  if (trailer) return [{ t: 'intro', trailer: true }, { t: 'ad', ad: GALA_ADS[0] }, { t: 'teaser' }, { t: 'ad', ad: GALA_ADS[3] }, { t: 'final', trailer: true }];
  var list = (awardsList || G.awards(S)).filter(function (a) { return a.winners.length; });
  var slides = [{ t: 'intro' }], bursts = 0, ads = 0;
  function adMaybe() { if ((bursts === 3 || bursts === 6) && ads < 2) slides.push({ t: 'ad', ad: GALA_ADS[(ads++ * 3 + Math.floor(Math.random() * 3)) % GALA_ADS.length] }); }
  ['casa', 'juegos', 'publico', 'extra'].forEach(function (gk) {
    var it = list.filter(function (a) { return a.group === gk && ['oro', 'plata', 'bronce'].indexOf(a.id) < 0; });
    if (!it.length) return;
    var minor = it.filter(function (a) { return !GALA_STAR[a.id]; }), star = it.filter(function (a) { return GALA_STAR[a.id]; });
    for (var i = 0; i < minor.length; i += 3) { slides.push({ t: 'burst', g: gk, items: minor.slice(i, i + 3) }); bursts++; adMaybe(); }
    star.forEach(function (a) { slides.push({ t: 'award', a: a }); });
  });
  if (typeof photoList === 'function' && photoList().length >= 3) slides.push({ t: 'photos' });
  var pod = ['bronce', 'plata', 'oro'].map(function (id) { return list.find(function (a) { return a.id === id; }); }).filter(Boolean);
  if (pod.length) { slides.push({ t: 'group', g: 'podio' }); pod.forEach(function (a) { slides.push({ t: 'award', a: a, podium: true }); }); }
  slides.push({ t: 'final' }, { t: 'credits' });
  return slides;
}
function galaMinutes(slides) {
  var s = 0; slides.forEach(function (x) { s += x.t === 'burst' ? GALA_TIME.burst0 + GALA_TIME.burst1 + 2 : x.t === 'award' ? GALA_TIME.award0 + (x.podium ? GALA_TIME.podium1 : GALA_TIME.award1) + 2 : GALA_TIME[x.t] || 6; });
  return Math.max(1, Math.round(s / 60));
}

/* ---------- Pantallas ---------- */
function winnersHtml(a, size) { return a.winners.map(function (w) { return '<span class="gw">' + eAv(w, size || 'xl') + '<b>' + eName(w) + '</b></span>'; }).join(''); }
function galaRender() {
  var el = document.getElementById('gala'); if (!el || !gala) return;
  var s = gala.slides[gala.i], inner = '', rv = gala.revealed;
  el.classList.toggle('is-ad', s.t === 'ad'); el.dataset.slide = s.t;
  if (s.t === 'intro') inner = '<div class="gala-curtain" aria-hidden="true"><i></i><i></i></div><span class="eyebrow">' + esc(S.trip.name) + (gala.rehearsal ? ' · ensayo' : gala.sim ? ' · simulación' : '') + '</span><h1 class="gala-title xl">' + (s.trailer ? 'Próximamente' : 'Gala de premios') + '</h1>' +
    (s.trailer ? '<p>La gran noche llega el <b>' + esc(galaWhen()) + '</b>. Esto es solo el tráiler: sin spoilers, que nos conocemos.</p>'
      : '<p>Silencio en la sala. Apagad los móviles… bueno, este no.</p><p class="small">' + gala.slides.filter(function (x) { return x.t === 'award' || x.t === 'burst'; }).reduce(function (n, x) { return n + (x.items ? x.items.length : 1); }, 0) + ' premios · unos ' + galaMinutes(gala.slides) + ' minutos · cero modestia</p>' +
        '<div class="gala-start"><button class="btn primary big-btn" data-act="galaGo" data-auto="1">' + icon('play') + 'Empezar (avanza sola)</button><button class="btn" data-act="galaGo">Empezar paso a paso</button></div>');
  else if (s.t === 'group') inner = '<span class="eyebrow">Lo que todos esperabais</span><h1 class="gala-title xl">El podio</h1><p>Tres puestos. Una familia. Cero rencores (bueno, alguno).</p>';
  else if (s.t === 'ad') inner = '<span class="gala-ad-tag">Pausa publicitaria</span><h1 class="gala-title ad">' + esc(s.ad[0]) + '</h1><p>' + esc(s.ad[1]) + '</p><p class="small">Volvemos en 3, 2, 1…</p>';
  else if (s.t === 'teaser') inner = '<span class="gala-ico">' + icon('trophy') + '</span><h1 class="gala-title">' + G.awards(S).length + ' premios. Una noche.</h1><p>Habrá lágrimas, discursos de 30 segundos (cronometrados) y algún que otro «yo no he sido». Nadie se queda sin estatuilla.</p>';
  else if (s.t === 'burst') {
    inner = '<span class="eyebrow">' + esc(G.GROUPS[s.g] || 'Premios') + ' · ráfaga</span><div class="gala-burst">' + s.items.map(function (a, k) {
      return '<div class="gb' + (rv === true ? ' on' : '') + '" style="--d:' + (k * .55) + 's"><span class="gb-ico">' + icon(a.icon || 'star') + '</span><b class="gb-name">' + esc(a.name) + '</b>' +
        (rv === true ? '<div class="gb-win">' + winnersHtml(a, a.winners.length > 2 ? 'sm' : 'md') + '</div><small class="gb-quip">' + esc(GALA_QUIP[a.id] || a.why || '') + '</small>' : '<small class="gb-desc">' + esc(a.desc) + '</small><span class="gb-env" aria-hidden="true"></span>') + '</div>';
    }).join('') + '</div>' + (rv === true ? '' : '<p class="gala-drum' + (rv === 'wait' ? ' rolling' : '') + '">' + esc(pickOne(GALA_DRUM, s.g + gala.i)) + '</p>');
  } else if (s.t === 'award') {
    var a = s.a;
    inner = '<span class="gala-ico">' + icon(a.icon || 'star') + '</span><span class="eyebrow">' + (s.podium ? 'El podio' : esc(G.GROUPS[a.group] || 'Premio')) + '</span><h1 class="gala-title">' + esc(a.name) + '</h1>' +
      (rv === true ? '<div class="gala-win">' + winnersHtml(a) + '</div>' + (a.why ? '<p class="gala-why">' + esc(a.why) + '</p>' : '') + (GALA_QUIP[a.id] ? '<p class="gala-quip">' + esc(GALA_QUIP[a.id]) + '</p>' : '') +
        (a.fact ? '<p class="gala-fact">' + esc(a.fact) + '</p>' : a.winners.length === 1 && !gala.sim && galaFact(a.winners[0]) ? '<p class="gala-fact">' + esc(galaFact(a.winners[0])) + '</p>' : '') +
        '<button class="btn gala-speech" data-act="galaSpeech">🎤 Discurso (30 s)</button>'
        : '<p>' + esc(a.desc) + '</p><div class="gala-env' + (rv === 'wait' ? ' opening' : '') + '" aria-hidden="true"><i></i></div><p class="gala-drum' + (rv === 'wait' ? ' rolling' : '') + '">' + esc(pickOne(GALA_DRUM, a.id + gala.i)) + '</p>');
  } else if (s.t === 'photos') {
    var ps = photoList().slice().sort(function () { return Math.random() - .5; }).slice(0, 12);
    inner = '<span class="eyebrow">Mientras el jurado delibera…</span><h1 class="gala-title">Momentos del finde</h1><div class="gala-photos">' + ps.map(function (p, k) { var u = PHOTOS.url(p.thumb) || PHOTOS.url(p.path); return u ? '<img src="' + u + '" alt="" style="--d:' + (k * .25) + 's;--r:' + ((k % 2 ? 1 : -1) * (2 + k % 4)) + 'deg">' : ''; }).join('') + '</div>';
    if (typeof PHOTOS !== 'undefined' && PHOTOS.ensure) PHOTOS.ensure(ps.map(function (p) { return p.thumb; })).then(function (ch) { if (ch && gala && gala.slides[gala.i] === s) galaRender(); });
  } else if (s.t === 'final') {
    if (s.trailer) inner = '<span class="eyebrow">' + esc(galaWhen()) + '</span><h1 class="gala-title">No te lo pierdas</h1><p>Trae palomitas, pañuelos y el discurso preparado. Por si acaso.</p>';
    else {
      var t = gala.sim ? simTally(gala.list) : G.tally(S), names = {}; (gala.list || G.awards(S)).forEach(function (x) { names[x.id] = x.name; });
      inner = '<span class="eyebrow">Habemus premiados</span><h1 class="gala-title">¡Gracias, familia!</h1><div class="gala-all">' + S.people.filter(function (p) { return t[p.id].length; }).map(function (p, k) { return '<div class="ga" style="--d:' + (k * .08) + 's">' + av(p.id, 'md') + '<b>' + esc(p.name) + '</b><small>' + t[p.id].map(function (x) { return esc(names[x] || x); }).join(' · ') + '</small></div>'; }).join('') + '</div>';
    }
  } else if (s.t === 'credits') inner = galaCredits();
  el.querySelector('.gala-in').innerHTML = inner;
  el.querySelector('.gala-count').textContent = (gala.i + 1) + ' / ' + gala.slides.length;
  el.querySelector('[data-act=galaPrev]').disabled = gala.i === 0;
  var waiting = (s.t === 'award' || s.t === 'burst') && rv !== true;
  el.querySelector('.gala-ctl [data-act=galaNext]').innerHTML = waiting ? 'Abrir ' + (s.t === 'burst' ? 'los sobres' : 'el sobre') : gala.i === gala.slides.length - 1 ? 'Cerrar' : 'Siguiente ' + icon('arrow');
  el.querySelector('[data-act=galaAuto]').classList.toggle('on', !!gala.auto);
  el.querySelector('[data-act=galaMusic]').classList.toggle('on', !!gala.music);
  galaFxMood(s);
  galaAutoArm();
}

/* ---------- Avanzar (a mano o sola) ---------- */
function galaReveal() {
  var s = gala.slides[gala.i]; if (gala.revealed) return;
  gala.revealed = 'wait'; galaMusicDuck(true); drumroll(s.podium); galaRender();
  setTimeout(function () {
    if (!gala || gala.slides[gala.i] !== s) return;
    gala.revealed = true; galaMusicDuck(false); galaRender();
    applause(s.podium ? 3.2 : 2.2); confetti(s.podium ? 3800 : 2400);
    if (s.t === 'burst') { [0, 550, 1100].forEach(function (d, k) { setTimeout(function () { galaFxBurstAt('.gb:nth-child(' + (k + 1) + ')'); }, d + 350); }); }
    else { galaFxBurstAt('.gala-win'); try { rocketFx(200); } catch (x) {} }
    if (s.podium) { try { fireworks(5200, s.a.id === 'oro' ? 14 : 7); cannonsFx(300); } catch (x) {} if (s.a.id === 'oro') { fanfare(); try { emojiFx(['🏆', '👑', '✨', '🥇', '🎉'], 'rain', 600, 40); } catch (x) {} } }
    if (navigator.vibrate) try { navigator.vibrate([30, 40, 30]); } catch (x) {}
  }, s.podium ? 2400 : 1500);
}
function galaStep(dir) {
  if (!gala) return; clearTimeout(gala.timer);
  var s = gala.slides[gala.i];
  if (dir > 0 && (s.t === 'award' || s.t === 'burst') && gala.revealed !== true) { if (!gala.revealed) galaReveal(); return; }
  if (dir > 0 && gala.i >= gala.slides.length - 1) { var wasSim = gala.sim; galaClose(); if (!wasSim) egg('gala'); return; }
  if (dir < 0 && !gala.i) return;
  gala.i += dir; var n = gala.slides[gala.i];
  gala.revealed = dir < 0 && (n.t === 'award' || n.t === 'burst');
  clearInterval(speechT); var mic = document.querySelector('.gala-mic'); if (mic) mic.remove();
  galaRender();
  if (n.t === 'final' && !gala.trailer) { confetti(3200); applause(3); try { rocketFx(0); rocketFx(700); } catch (x) {} }
  if (n.t === 'group') { try { fireworks(3000, 5); } catch (x) {} }
  if (gala.i === gala.slides.length - 1 && !gala.sim) egg('gala');
}
function galaAutoArm() {
  if (!gala) return; clearTimeout(gala.timer); var bar = document.querySelector('.gala-prog i');
  if (!gala.auto || gala.paused || document.querySelector('.gala-mic')) { if (bar) bar.style.transition = 'none', bar.style.width = '0'; return; }
  var s = gala.slides[gala.i], rv = gala.revealed, sec;
  if (s.t === 'intro' && !gala.trailer && gala.i === 0 && !gala.started) return;   /* espera al botón «Empezar» */
  if (s.t === 'burst') sec = rv === true ? GALA_TIME.burst1 : rv ? 0 : GALA_TIME.burst0;
  else if (s.t === 'award') sec = rv === true ? (s.podium ? GALA_TIME.podium1 : GALA_TIME.award1) : rv ? 0 : GALA_TIME.award0;
  else sec = GALA_TIME[s.t] || 6;
  if (!sec) return;
  if (s.t === 'credits' && gala.i === gala.slides.length - 1) { if (bar) bar.style.width = '0'; return; }   /* al final, se queda en los créditos */
  if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; void bar.offsetWidth; bar.style.transition = 'width ' + sec + 's linear'; bar.style.width = '100%'; }
  gala.timer = setTimeout(function () { galaStep(1); }, sec * 1000);
}

/* ---------- Música de fondo (sintetizada aquí mismo: alegre, suave y sin derechos) ---------- */
var GM = null;
function galaMusicStart() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume();
    if (GM) return;
    var master = actx.createGain(), lp = actx.createBiquadFilter(); master.gain.value = 0.0001; lp.type = 'lowpass'; lp.frequency.value = 3200;
    master.connect(lp); lp.connect(actx.destination); master.gain.exponentialRampToValueAtTime(0.16, actx.currentTime + 1.5);
    var bpm = 116, beat = 60 / bpm, step = beat / 2, chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], i = 0, next = actx.currentTime + .1;
    var noise = actx.createBuffer(1, actx.sampleRate * .05, actx.sampleRate), nd = noise.getChannelData(0); for (var k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;
    function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
    function note(m, t, d, type, vol) { var o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.setValueAtTime(hz(m), t); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .02); }
    function hat(t, vol) { var src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(); src.buffer = noise; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = vol; src.connect(f); f.connect(g); g.connect(master); src.start(t); }
    function kick(t) { var o = actx.createOscillator(), g = actx.createGain(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(45, t + .12); g.gain.setValueAtTime(.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + .16); o.connect(g); g.connect(master); o.start(t); o.stop(t + .18); }
    var mel = [72, 74, 76, 79, 76, 74, 72, 67, 69, 72, 74, 72, 71, 67, 69, 71];
    var iv = setInterval(function () {
      while (next < actx.currentTime + .25) {
        var bar = Math.floor(i / 8) % 4, pos = i % 8, ch = chords[bar];
        if (pos === 0 || pos === 4) { note(ch[0] - 24, next, beat * 1.6, 'triangle', .22); kick(next); }
        if (pos === 2 || pos === 6) note(ch[0] - 12, next, beat * .7, 'triangle', .12);
        note(ch[pos % 3] + 12, next, step * .9, 'sine', .05);
        if (pos % 2) hat(next, .05); if (pos === 2 || pos === 6) hat(next, .1);
        if (i % 2 === 0 && Math.floor(i / 32) % 2 === 1) note(mel[(i / 2) % mel.length], next, step * 1.7, 'square', .028);
        next += step; i++;
      }
    }, 90);
    GM = { master: master, iv: iv };
  } catch (e) {}
}
function galaMusicStop() { if (!GM) return; try { var m = GM.master; m.gain.cancelScheduledValues(actx.currentTime); m.gain.setTargetAtTime(0.0001, actx.currentTime, .3); var iv = GM.iv; setTimeout(function () { clearInterval(iv); try { m.disconnect(); } catch (x) {} }, 1200); } catch (e) {} GM = null; }
function galaMusicDuck(on) { if (!GM) return; try { GM.master.gain.setTargetAtTime(on ? 0.04 : 0.16, actx.currentTime, .25); } catch (e) {} }

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
  var m = { intro: { bubbles: .8, confetti: .6, rockets: .5 }, ad: { bubbles: .2, confetti: 0, rockets: 0 }, burst: { bubbles: .5, confetti: .5, rockets: .3 }, award: { bubbles: .5, confetti: .4, rockets: .3 },
    group: { bubbles: 1, confetti: 1, rockets: 1 }, photos: { bubbles: .9, confetti: .3, rockets: 0 }, final: { bubbles: 1, confetti: 1.4, rockets: 1.2 }, credits: { bubbles: .6, confetti: .6, rockets: .4 } }[s.t] || { bubbles: .5, confetti: .4, rockets: .25 };
  if (s.podium && gala.revealed === true) m = { bubbles: 1, confetti: 1.6, rockets: 1.5 };
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
  galaFxStart(); galaMusicStart(); galaRender(); try { fanfare(); } catch (e) {}
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
  galaAuto: function () { if (!gala) return; gala.auto = !gala.auto; gala.started = true; toast(gala.auto ? 'Avance automático: la gala va sola (toca para pausar)' : 'Avance manual'); galaRender(); },
  galaMusic: function () { if (!gala) return; gala.music = !gala.music; if (gala.music) galaMusicStart(); else galaMusicStop(); galaRender(); },
  galaPresent: function () { galaPresent(); }
});
document.addEventListener('fullscreenchange', function () { var el = document.getElementById('gala'); if (el && !document.fullscreenElement) el.classList.remove('present'); });
document.addEventListener('keydown', function (e) { if (!gala) return; if (e.key === 'f' || e.key === 'F') galaPresent(); if (e.key === 'p' || e.key === 'P') A.galaAuto(); if (e.key === 'm' || e.key === 'M') A.galaMusic(); });
