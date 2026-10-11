/* ===================== Pelis con mímica: el móvil hace de papelitos y de reloj =====================
   Para el juego de mímica (data.mimica): saca una peli al azar que solo ve quien actúa (mantener pulsado),
   cuenta 1 minuto y lleva el marcador de los dos equipos. El marcador vive en este móvil; el resultado
   final se apunta como siempre en la ficha del juego. */

var MIMICA_PELIS = [
  'El Rey León', 'Frozen', 'Toy Story', 'Buscando a Nemo', 'Shrek', 'Harry Potter', 'Star Wars', 'Titanic', 'Jurassic Park',
  'Spider-Man', 'Mary Poppins', 'Coco', 'Up', 'Ratatouille', 'Los Increíbles', 'Cars', 'Monstruos S.A.', 'Gru, mi villano favorito',
  'Los Minions', 'Kung Fu Panda', 'Madagascar', 'Ice Age', 'Del revés', 'Encanto', 'Vaiana', 'Aladdín', 'La sirenita',
  'La bella y la bestia', 'Blancanieves', 'La Cenicienta', 'El libro de la selva', 'Peter Pan', 'Pinocho', 'Dumbo', 'Mulán',
  'Hércules', 'Tarzán', 'Lilo y Stitch', 'Zootrópolis', 'Enredados', 'Wall-E', 'E.T., el extraterrestre', 'Regreso al futuro',
  'Indiana Jones', 'Piratas del Caribe', 'Karate Kid', 'Rocky', 'Tiburón', 'Cazafantasmas', 'Solo en casa', 'Grease',
  'Mamma Mia!', 'Matilda', 'Charlie y la fábrica de chocolate', 'Jumanji', 'Avatar', 'Los Vengadores', 'Batman', 'Superman',
  'Super Mario Bros.', 'Sonic', 'Barbie', 'Top Gun', 'Misión imposible', 'El mago de Oz', 'Forrest Gump', 'A todo gas',
  'El señor de los anillos', 'Los Pitufos', 'Paddington', 'Astérix y Obélix', 'Campeones', 'Ocho apellidos vascos',
  'Las aventuras de Tadeo Jones', 'Mortadelo y Filemón', 'Los Goonies', 'Pokémon', 'Cómo entrenar a tu dragón', 'Bolt',
  'Chicken Run', 'Wallace y Gromit', 'Hotel Transilvania', 'Los Croods', 'Space Jam', 'El gato con botas', 'Gremlins'
];
function mimicaOn(g) { return !!(g && (g.mimica || /m[ií]mica/i.test(g.name || ''))); }
function mimicaEntryHtml(g) {
  if (!mimicaOn(g)) return '';
  return '<section class="card mim-card"><div class="card-head"><h3>El móvil hace de papelitos</h3><span class="pill olive">' + MIMICA_PELIS.length + ' pelis</span></div>' +
    '<p class="small muted">Quien actúa saca una peli al azar (solo la ve quien mantiene pulsado), pone el minuto en marcha y, si su equipo acierta, punto. El marcador va en este móvil; al acabar, apuntad el resultado en el juego.</p>' +
    '<button class="btn primary block" data-act="mimOpen">' + icon('play') + 'Empezar la mímica</button></section>';
}
var MIM = null;
function mimInit() {
  if (MIM) return MIM;
  var used = {}; try { used = JSON.parse(localStorage.getItem(KEY + '-mim-used')) || {}; } catch (e) {}
  var sc = [0, 0]; try { sc = JSON.parse(localStorage.getItem(KEY + '-mim-score')) || [0, 0]; } catch (e) {}
  MIM = { used: used, score: sc, turn: 0, peli: null, t: 0, timer: null };
  return MIM;
}
function mimStore() { try { localStorage.setItem(KEY + '-mim-used', JSON.stringify(MIM.used)); localStorage.setItem(KEY + '-mim-score', JSON.stringify(MIM.score)); } catch (e) {} }
function mimTeamName(i) {
  var g = (S.games || []).find(mimicaOn), t = g && g.teams && g.teams[i];
  return (t && t.name) || ('Equipo ' + (i + 1));
}
function mimRender() {
  var el = document.getElementById('mim'); if (!el || !MIM) return;
  var running = MIM.t > 0;
  el.innerHTML =
    '<div class="mim-score">' + [0, 1].map(function (i) {
      return '<div class="mim-team' + (MIM.turn === i ? ' on' : '') + '"><small>' + esc(mimTeamName(i)) + '</small><b class="num">' + MIM.score[i] + '</b></div>';
    }).join('') + '</div>' +
    '<p class="small muted mim-turn">Turno de <b>' + esc(mimTeamName(MIM.turn)) + '</b></p>' +
    (MIM.peli
      ? '<button class="mim-peli" id="mim-peli" aria-label="Mantén pulsado para ver la peli"><span class="mim-hide">Mantén pulsado para verla</span><span class="mim-show">' + esc(MIM.peli) + '</span></button>'
      : '<button class="btn primary block" data-act="mimDraw">' + icon('shuffle') + 'Sacar peli</button>') +
    '<div class="mim-clock' + (running && MIM.t <= 10 ? ' hurry' : '') + '"><b class="num" id="mim-t">' + (running ? MIM.t : 60) + '</b><small>segundos</small></div>' +
    '<div class="row wrap mim-btns">' +
    (MIM.peli && !running ? '<button class="btn" data-act="mimGo">' + icon('play') + 'Empieza el minuto</button>' : '') +
    (MIM.peli ? '<button class="btn primary" data-act="mimHit">' + icon('check') + '¡Acertado!</button><button class="btn ghost" data-act="mimMiss">' + icon('x') + 'Fallado</button>' : '') +
    '</div>' +
    '<button class="link small" data-act="mimReset">Poner el marcador a cero</button>';
  var p = document.getElementById('mim-peli');
  if (p) {
    var on = function (e) { e.preventDefault(); p.classList.add('show'); }, off = function () { p.classList.remove('show'); };
    p.addEventListener('pointerdown', on); p.addEventListener('pointerup', off); p.addEventListener('pointerleave', off); p.addEventListener('pointercancel', off);
    p.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
}
function mimStop() { if (MIM && MIM.timer) { clearInterval(MIM.timer); MIM.timer = null; } if (MIM) MIM.t = 0; }
function mimNext(hit) {
  mimStop();
  if (hit) { MIM.score[MIM.turn]++; confetti(900); if (navigator.vibrate) try { navigator.vibrate(30); } catch (e) {} }
  MIM.peli = null; MIM.turn = 1 - MIM.turn; mimStore(); mimRender();
}
Object.assign(A, {
  mimOpen: function () {
    mimInit();
    openSheet('<h2>Pelis con mímica</h2><div id="mim" class="mim"></div>');
    mimRender();
  },
  mimDraw: function () {
    var left = MIMICA_PELIS.filter(function (p) { return !MIM.used[p]; });
    if (!left.length) { MIM.used = {}; left = MIMICA_PELIS.slice(); toast('Se acabaron las pelis: empezamos otra vez'); }
    MIM.peli = left[Math.floor(Math.random() * left.length)]; MIM.used[MIM.peli] = 1; mimStore(); mimRender();
  },
  mimGo: function () {
    mimStop(); MIM.t = 60; mimRender();
    MIM.timer = setInterval(function () {
      if (!document.getElementById('mim')) { mimStop(); return; }
      MIM.t--; var n = document.getElementById('mim-t'); if (n) n.textContent = Math.max(0, MIM.t);
      if (MIM.t === 10) { var c = document.querySelector('.mim-clock'); if (c) c.classList.add('hurry'); }
      if (MIM.t <= 0) { mimStop(); if (navigator.vibrate) try { navigator.vibrate([300, 100, 300]); } catch (e) {} toast('¡Tiempo! ¿La han acertado?'); mimRender(); }
    }, 1000);
  },
  mimHit: function () { mimNext(true); },
  mimMiss: function () { mimNext(false); },
  mimReset: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = '¿Seguro? Toca otra vez'; return; }
    mimStop(); MIM.score = [0, 0]; MIM.turn = 0; MIM.peli = null; mimStore(); mimRender();
  }
});
