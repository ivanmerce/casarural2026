/* ===================== Efectos de los secretos =====================
   Cada secreto tiene su frase con gracia y su combinación de efectos (cohete, confeti, lluvia de emojis…).
   Todo se pinta en lienzos propios por encima del velo y por debajo de la tarjeta; se limpian solos. */

/* ---------- Cohete que despega y estalla ---------- */
function drawRocket(ctx, s, flick) {
  ctx.save(); ctx.scale(s, s);
  var g = ctx.createRadialGradient(0, 24, 1, 0, 26, 16 + flick * 8);
  g.addColorStop(0, 'rgba(255,245,180,1)'); g.addColorStop(.4, 'rgba(255,170,40,.95)'); g.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 26, 7 + flick * 2, 14 + flick * 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#C4112F';
  ctx.beginPath(); ctx.moveTo(-8, 4); ctx.lineTo(-17, 20); ctx.lineTo(-8, 16); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(17, 20); ctx.lineTo(8, 16); ctx.closePath(); ctx.fill();
  var b = ctx.createLinearGradient(-9, 0, 9, 0); b.addColorStop(0, '#E9E2DE'); b.addColorStop(.5, '#FFFFFF'); b.addColorStop(1, '#CFC5BF');
  ctx.fillStyle = b; ctx.beginPath(); ctx.moveTo(0, -28); ctx.quadraticCurveTo(11, -14, 9, 16); ctx.lineTo(-9, 16); ctx.quadraticCurveTo(-11, -14, 0, -28); ctx.fill();
  ctx.fillStyle = '#C4112F'; ctx.beginPath(); ctx.moveTo(0, -28); ctx.quadraticCurveTo(6, -22, 7.6, -15); ctx.lineTo(-7.6, -15); ctx.quadraticCurveTo(-6, -22, 0, -28); ctx.fill();
  ctx.fillStyle = '#4CC9F0'; ctx.strokeStyle = '#1C1614'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -4, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function rocketFx(delay) {
  setTimeout(function () {
    var fx = fxLayer(false), ctx = fx.ctx, W = fx.W, H = fx.H, t0 = performance.now(), FLY = 1700, D = 3600;
    var x0 = W * (.15 + Math.random() * .25), x1 = W * (.55 + Math.random() * .3), yTop = H * (.14 + Math.random() * .1);
    var smoke = [], P = [], boom = false, last = null, s = Math.max(1.3, Math.min(W, H) / 380);
    var cols = ['#FF3B5C', '#FFD166', '#06D6A0', '#4CC9F0', '#F72585', '#FF9F1C'];
    (function f(t) {
      ctx.clearRect(0, 0, W, H);
      var k = Math.min(1, (t - t0) / FLY), e = k * k * (1.6 - .6 * k);
      var x = x0 + (x1 - x0) * e + Math.sin(k * 7) * 10, y = H + 70 - (H + 70 - yTop) * e;
      if (!boom) {
        smoke.push({ x: x, y: y + 26 * s, r: 6 + Math.random() * 6, a: .5, vx: (Math.random() - .5) * .6, vy: .6 + Math.random() * .6 });
        if (k >= 1) { boom = true; for (var j = 0; j < 150; j++) { var a = Math.PI * 2 * j / 150, sp = 2 + Math.random() * 6; P.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c: cols[j % cols.length], s: 2 + Math.random() * 2.6 }); } if (navigator.vibrate) try { navigator.vibrate(30); } catch (z) {} }
      }
      smoke.forEach(function (p) { p.x += p.vx; p.y += p.vy; p.r += .5; p.a *= .965; ctx.globalAlpha = p.a; ctx.fillStyle = '#E8E1DD'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
      smoke = smoke.filter(function (p) { return p.a > .03; });
      if (!boom) {
        var ang = last ? Math.atan2(y - last[1], x - last[0]) + Math.PI / 2 : 0; last = [x, y];
        ctx.globalAlpha = 1; ctx.save(); ctx.translate(x, y); ctx.rotate(ang); drawRocket(ctx, s, Math.random()); ctx.restore();
      }
      P.forEach(function (p) { p.vx *= .985; p.vy = p.vy * .985 + .05; p.x += p.vx; p.y += p.vy; p.life -= .011; if (p.life <= 0) return; ctx.globalAlpha = p.life; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2); ctx.fill(); });
      P = P.filter(function (p) { return p.life > 0; });
      ctx.globalAlpha = 1;
      if (t - t0 < D || P.length || smoke.length) requestAnimationFrame(f); else fx.done();
    })(t0);
  }, delay || 0);
}

/* ---------- Cañones de confeti desde las esquinas ---------- */
function cannonsFx(delay) {
  setTimeout(function () {
    var fx = fxLayer(false), ctx = fx.ctx, W = fx.W, H = fx.H, t0 = performance.now(), D = 3800;
    var cols = ['#C4112F', '#FFD166', '#06D6A0', '#4CC9F0', '#F72585', '#FFFFFF', '#E8B64A'], P = [];
    [[0, 1], [W, -1]].forEach(function (side) {
      for (var i = 0; i < 110; i++) { var a = (-Math.PI / 2) + side[1] * (.25 + Math.random() * .55), sp = 9 + Math.random() * 11; P.push({ x: side[0], y: H, vx: Math.sin(a + Math.PI / 2) * sp * side[1] * -1 * -1, vy: -Math.abs(Math.cos(a)) * sp - 4, r: 5 + Math.random() * 6, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[i % cols.length] }); }
    });
    P.forEach(function (p) { if (p.x === 0) p.vx = Math.abs(p.vx) + 2; else p.vx = -Math.abs(p.vx) - 2; });
    (function f(t) {
      ctx.clearRect(0, 0, W, H); var k = (t - t0) / D;
      P.forEach(function (p) { p.vy += .32; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, 1 - k); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore(); });
      if (k < 1) requestAnimationFrame(f); else fx.done();
    })(t0);
  }, delay || 0);
}

/* ---------- Lluvia (o subida) de emojis ---------- */
function emojiFx(list, mode, delay, n) {
  setTimeout(function () {
    var fx = fxLayer(false), ctx = fx.ctx, W = fx.W, H = fx.H, t0 = performance.now(), D = 4200, rise = mode === 'rise';
    var E = Array.from({ length: n || 34 }, function (_, i) {
      var sz = 24 + Math.random() * 26;
      return { ch: list[i % list.length], x: Math.random() * W, y: rise ? H + 40 + Math.random() * H * .6 : -40 - Math.random() * H * .7, vy: (rise ? -1 : 1) * (2 + Math.random() * 2.6), sw: Math.random() * 6, a: Math.random() * 6, va: (Math.random() - .5) * .05, s: sz };
    });
    (function f(t) {
      ctx.clearRect(0, 0, W, H); var k = (t - t0) / D;
      E.forEach(function (e) { e.y += e.vy; e.a += e.va; var x = e.x + Math.sin((t - t0) / 380 + e.sw) * 16; ctx.save(); ctx.translate(x, e.y); ctx.rotate(rise ? 0 : e.a * .4); ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 2.2)); ctx.font = e.s + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.ch, 0, 0); ctx.restore(); });
      if (k < 1) requestAnimationFrame(f); else fx.done();
    })(t0);
  }, delay || 0);
}

/* ---------- Estrellas fugaces ---------- */
function starsFx(delay) {
  setTimeout(function () {
    var fx = fxLayer(false), ctx = fx.ctx, W = fx.W, H = fx.H, t0 = performance.now(), D = 4000;
    var tw = Array.from({ length: 70 }, function () { return { x: Math.random() * W, y: Math.random() * H * .7, r: Math.random() * 1.8 + .5, p: Math.random() * 6 }; });
    var sh = Array.from({ length: 7 }, function (_, i) { return { at: i * 420 + Math.random() * 200, x: W * (.1 + Math.random() * .6), y: H * (.05 + Math.random() * .3), vx: 9 + Math.random() * 5, vy: 4 + Math.random() * 3, life: 1 }; });
    (function f(t) {
      ctx.clearRect(0, 0, W, H); var el = t - t0, k = el / D;
      tw.forEach(function (s) { ctx.globalAlpha = Math.max(0, (1 - k)) * (.5 + .5 * Math.sin(el / 200 + s.p)); ctx.fillStyle = '#FFF7D6'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); });
      sh.forEach(function (s) {
        if (el < s.at || s.life <= 0) return; s.x += s.vx; s.y += s.vy; s.life -= .02;
        var g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9); g.addColorStop(0, 'rgba(255,250,220,' + s.life + ')'); g.addColorStop(1, 'rgba(255,250,220,0)');
        ctx.globalAlpha = 1; ctx.strokeStyle = g; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9); ctx.stroke();
      });
      if (k < 1) requestAnimationFrame(f); else fx.done();
    })(t0);
  }, delay || 0);
}

/* ---------- Sol que gira ---------- */
function sunFx(delay) {
  setTimeout(function () {
    var fx = fxLayer(false), ctx = fx.ctx, W = fx.W, H = fx.H, t0 = performance.now(), D = 3600, cx = W / 2, cy = H * .3, R = Math.max(W, H);
    (function f(t) {
      ctx.clearRect(0, 0, W, H); var k = (t - t0) / D, a = (t - t0) / 1600, al = Math.sin(Math.min(1, k) * Math.PI) * .55;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a); ctx.globalAlpha = al;
      for (var i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); var g = ctx.createLinearGradient(0, 0, R, 0); g.addColorStop(0, 'rgba(255,214,102,.9)'); g.addColorStop(1, 'rgba(255,214,102,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, -R * .09); ctx.lineTo(R, R * .09); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      if (k < 1) requestAnimationFrame(f); else fx.done();
    })(t0);
  }, delay || 0);
}

/* ---------- Humo blanco (fumata) ---------- */
function smokeFx(delay) {
  setTimeout(function () {
    var fx = fxLayer(false), ctx = fx.ctx, W = fx.W, H = fx.H, t0 = performance.now(), D = 4200, P = [];
    (function f(t) {
      if (t - t0 < D - 1400) for (var i = 0; i < 3; i++) P.push({ x: W / 2 + (Math.random() - .5) * 60, y: H + 20, r: 20 + Math.random() * 18, vx: (Math.random() - .5) * 1.4, vy: -2.4 - Math.random() * 2, a: .55 });
      ctx.clearRect(0, 0, W, H);
      P.forEach(function (p) { p.x += p.vx + Math.sin((t + p.y) / 400) * .5; p.y += p.vy; p.r += .6; p.a *= .992; var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r); g.addColorStop(0, 'rgba(255,255,255,' + p.a + ')'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
      P = P.filter(function (p) { return p.y + p.r > -40 && p.a > .02; });
      if (t - t0 < D) requestAnimationFrame(f); else fx.done();
    })(t0);
  }, delay || 0);
}

/* ---------- La personalidad de cada secreto: efectos + frase ---------- */
function secretStyle(k) {
  var b = typeof babyName === 'function' ? babyName() : 'el peque', c = typeof bdayName === 'function' ? bdayName() : 'el cumpleañero';
  var M = {
    curioso:  { fx: ['rocket', 'fireworks'], quip: 'El primer paso para encontrar secretos es saber que existen. Vas fino.' },
    manual:   { fx: ['emoji:📚 🤓 ✏️', 'cannons'], quip: 'Has leído el manual hasta el final. Eres oficialmente la única persona de la familia que lo ha hecho.' },
    dias:     { fx: ['emoji:✅ 🙋 📅', 'fireworks'], quip: 'Presente. Nunca pasar lista había sido tan emocionante.' },
    wifi:     { fx: ['emoji:📶 ⚡ 📱', 'stars'], quip: 'Conectado. Ahora ya puedes ignorar a la familia con total comodidad.' },
    meteo:    { fx: ['sun', 'emoji:☀️ ⛅ 🌈'], quip: 'Nuevo hombre del tiempo oficial. Si llueve, te pediremos explicaciones.' },
    noche:    { fx: ['stars', 'emoji:🌙 ⭐'], quip: 'Bienvenido al lado oscuro. Aquí no hay galletas, pero se ve todo muy elegante.' },
    apunto:   { fx: ['rise:❤️ 💖 💗', 'cannons'], quip: 'Le has dado amor a un plan. El plan, emocionado, te lo agradece.' },
    ojeador:  { fx: ['emoji:🔭 👀 📋', 'fireworks'], quip: 'Ves marcadores donde los demás solo ven planes. Ojo de halcón.' },
    jurado:   { fx: ['emoji:⚖️ 🗳️ 🏅', 'cannons'], quip: 'Tu voto cuenta. Cuenta uno, vale, pero cuenta.' },
    foto:     { fx: ['emoji:📸 ✨ 🎞️', 'cannons'], quip: 'Primera foto al álbum. El paparazzi de la familia ha llegado.' },
    corazon:  { fx: ['rise:❤️ 💕 💘 💞', 'fireworks'], quip: 'Repartes corazones por el álbum como si fueran gratis. Lo son.' },
    omnes:    { fx: ['rocket', 'fireworks', 'cannons'], quip: 'Toc, toc… ¿Quién es? Nadie. Están todos en la nave jugando al ping-pong.' },
    bday:     { fx: ['emoji:🎂 🎉 🎈 🎁', 'cannons', 'rocket'], quip: 'Cumplir años mola. Cumplirlos en una casa rural con toda la familia, más.' },
    baby:     { fx: ['rise:🫧 🫧 🍼'], quip: b + ' manda: la app se llena de burbujas. Explótalas antes de que escapen.' },
    pop:      { fx: ['emoji:🫧 🎈 💥', 'cannons'], quip: '15 burbujas. ' + b + ' te ficha como canguro oficial del finde.' },
    abuelo:   { fx: ['emoji:👓 🔍 👴 👵'], quip: 'Letra grande, como en el periódico de los domingos. Sin gafas, que ya no hacen falta.' },
    sol:      { fx: ['sun', 'emoji:☀️ 😎 🕶️'], quip: 'Petición enviada al cielo. Si llueve, la culpa es del hombre del tiempo.' },
    disco:    { fx: ['emoji:🪩 🕺 💃 🎶', 'cannons'], quip: 'Cuando la cuenta atrás se aburre, se va de discoteca.' },
    himno:    { fx: ['emoji:🎺 🎶 👑', 'fireworks', 'rocket'], quip: 'Música para el número 1. Que no se le suba, que todavía queda finde.' },
    abumetro: { fx: ['emoji:🔥 🌡️ 👵 👴'], quip: 'El abuelómetro echa humo. Acepta sobornos: un vermut, por ejemplo.' },
    papa:     { fx: ['smoke', 'emoji:🕊️ ⛪'], quip: 'Habemus papam. Y si no, habemus lista de la compra, que también vale.' },
    salud:    { fx: ['emoji:🥂 🍾 🍷 🍻', 'cannons'], quip: 'Chin chin. Por ' + c + ' y por quien friegue los vasos.' },
    buho:     { fx: ['stars', 'emoji:🦉 🌙'], quip: 'Despierto a estas horas… Mañana hay hockey. A dormir, búho.' },
    deseo:    { fx: ['stars', 'emoji:✨ 🌠 🙏'], quip: '11:11: pide un deseo. Que no sea «que no llueva», que ese ya está pedido.' },
    zero:     { fx: ['rocket', 'fireworks', 'cannons'], quip: '¡Ya estamos aquí! Que empiece lo bueno.' },
    quorum:   { fx: ['emoji:👨‍👩‍👧‍👦 🎉 📱', 'fireworks'], quip: 'Seis o más conectados a la vez. Esto ya es una reunión familiar en toda regla.' },
    fumata:   { fx: ['smoke', 'emoji:🛒 🥖 🧀'], quip: 'Fumata blanca: toda la compra tiene dueño. Esta familia no pasará hambre.' },
    claras:   { fx: ['emoji:💶 🪙 💰', 'cannons'], quip: 'Nadie le debe nada a nadie. Haz captura, que esto no vuelve a pasar.' },
    trophy:   { fx: ['emoji:🏆 🥇 👑', 'fireworks', 'rocket'], quip: 'Solo puede quedar uno… y lo estás viendo.' },
    habemus:  { fx: ['rocket', 'fireworks', 'cannons'], quip: 'Todos los juegos terminados. Habemus campeón.' },
    gala:     { fx: ['emoji:🎬 🌟 🏆 🎞️', 'fireworks'], quip: 'Has visto la gala hasta el final. Los Óscar de la familia te dan las gracias.' },
    album:    { fx: ['emoji:📸 🖼️ 🤳', 'cannons'], quip: 'Cincuenta fotos o más. Ya tenemos material para chantajear a todos hasta el año que viene.' }
  };
  return M[k] || { fx: ['fireworks', 'cannons'], quip: 'Un secreto más para la colección. Chitón.' };
}
/* Lanza la combinación de efectos de un secreto (escalonados para que no se amontonen) */
function playSecretFx(k, trophy) {
  if (trophy) { rocketFx(0); rocketFx(500); cannonsFx(300); emojiFx(['🏆', '👑', '✨', '🥇'], 'rain', 700, 40); try { fireworks(7000, 14); } catch (x) {} return; }
  var st = secretStyle(k), d = 0;
  st.fx.forEach(function (f) {
    if (f === 'rocket') rocketFx(d);
    else if (f === 'fireworks') setTimeout(function () { try { fireworks(4200, 7); } catch (x) {} }, d + 200);
    else if (f === 'cannons') cannonsFx(d + 150);
    else if (f === 'stars') starsFx(d);
    else if (f === 'sun') sunFx(d);
    else if (f === 'smoke') smokeFx(d);
    else if (f.indexOf('emoji:') === 0) emojiFx(f.slice(6).split(' '), 'rain', d + 100);
    else if (f.indexOf('rise:') === 0) emojiFx(f.slice(5).split(' '), 'rise', d + 100);
    d += 350;
  });
}
