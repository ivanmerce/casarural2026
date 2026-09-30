/* ===================== Juegos, competición y premios: vistas y acciones =====================
   Pensado para el móvil en plena partida: botones grandes, marcador con + y −, un toque para dar la victoria. */

function gById(id) { return (S.games || []).find(function (g) { return g.id === id; }); }
function isFam(id) { return String(id).indexOf('fam:') === 0; }
function eAv(id, cls) {
  if (isFam(id)) { var f = id.slice(4); return '<span class="av-stack">' + S.people.filter(function (p) { return p.family === f; }).slice(0, 4).map(function (p) { return av(p.id, cls || 'sm'); }).join('') + '</span>'; }
  var e = G.entrant(S, id); if (!e) return '';
  if (!e.duo) return av(id, cls);
  return '<span class="av-duo">' + e.members.map(function (m) { return av(m, cls); }).join('') + '</span>';
}
function eName(id) {
  if (isFam(id)) { var f = fam(id.slice(4)); return f ? esc(f.name) : ''; }
  var e = G.entrant(S, id); if (!e) return esc(id);
  return e.duo ? esc(e.name) : pname(id);
}
function eText(id) { if (isFam(id)) { var f = fam(id.slice(4)); return f ? f.name : ''; } var e = G.entrant(S, id); return e ? e.name : id; }
function gIcon(g) { return icon(g.icon || { deporte: 'ball', velocidad: 'bolt', ingenio: 'bulb', escondite: 'ghost', mini: 'star', mesa: 'games' }[g.cat] || 'trophy'); }
function gHasAny(g) {
  if (g.format === 'bracket') return (g.rounds || []).some(function (r, ri) { return r.some(function (m) { return (m.w && !G.isBye(m, ri)) || m.sa != null || m.sb != null; }); });
  if (g.format === 'ranking' || g.teamRank) return (g.order || []).length > 0 || Object.keys(g.results || {}).length > 0;
  return (g.matches || []).some(function (m) { return m.w || m.sa != null || m.sb != null; });
}
function gStatus(g) { return G.isDone(S, g) ? 'fin' : gHasAny(g) ? 'vivo' : 'prox'; }
var GST = { prox: ['Próximo', ''], vivo: ['En juego', 'red live'], fin: ['Terminado', 'ok'] };
function gWhen(g) { var d = g.day && dayOf(g.day); return (d ? d.short : 'Cuando queráis') + (g.time ? ' · ' + g.time : ''); }
function ensureGame(g) {
  if (g.format === 'bracket' && !g.rounds) { g.rounds = G.makeBracket(g.entrants || []); G.advance(g); }
  if (g.format === 'teams') { g.teams = g.teams || []; g.matches = g.matches || []; }
  if (g.format === 'league' && !g.matches) g.matches = G.roundRobin(g.entrants || []);
  if (g.format === 'ranking') { g.order = g.order || []; g.results = g.results || {}; }
  return g;
}
function gPointsText(g) {
  var t = g.points && g.points.length ? g.points : G.DEFAULT_POINTS;
  return t.map(function (p, i) { return (i + 1) + '.º ' + p; }).join(' · ') + ' · resto ' + (g.part != null ? g.part : 1);
}
function medal(pos) { return pos === 1 ? '<span class="medal g">1</span>' : pos === 2 ? '<span class="medal s">2</span>' : pos === 3 ? '<span class="medal b">3</span>' : '<span class="medal">' + (pos || '–') + '</span>'; }

/* ---------- Tarjeta de Inicio ---------- */
function compCard() {
  var rank = G.ranking(S), leader = rank.filter(function (r) { return r.pos === 1 && r.pts > 0; });
  var live = (S.games || []).filter(function (g) { return gStatus(g) === 'vivo'; });
  var now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  var next = (S.games || []).filter(function (g) { return gStatus(g) === 'prox' && g.day; }).sort(function (a, b) { return (a.day + a.time).localeCompare(b.day + b.time); })
    .filter(function (g) { return (g.day + ' ' + (g.time || '00:00')) >= now; })[0] || (S.games || []).filter(function (g) { return gStatus(g) === 'prox'; })[0];
  var done = G.doneGames(S).length, tot = (S.games || []).length;
  return '<section class="card comp-card"><div class="card-head"><h3 class="row" style="gap:8px">' + icon('trophy') + 'Competición</h3><button class="link" data-act="tab" data-tab="juegos">Juegos ' + icon('arrow') + '</button></div>' +
    (leader.length ? '<button class="leader" data-act="jsub" data-v="ranking">' + eAv(leader[0].id, 'sm') + '<span class="grow"><span class="eyebrow">Líder del finde</span><b>' + leader.map(function (l) { return eName(l.id); }).join(' y ') + '</b></span><span class="big num">' + leader[0].pts + '</span><small class="muted">pts</small></button>'
      : '<p class="small muted">Nadie ha puntuado todavía. El trono está libre.</p>') +
    (live.length ? live.map(function (g) { return '<button class="game-mini" data-act="gOpen" data-id="' + g.id + '">' + gIcon(g) + '<span class="grow"><b>' + esc(g.name) + '</b><small class="muted">' + gWhen(g) + '</small></span><span class="pill red live">En juego</span></button>'; }).join('')
      : next ? '<button class="game-mini" data-act="gOpen" data-id="' + next.id + '">' + gIcon(next) + '<span class="grow"><b>' + esc(next.name) + '</b><small class="muted">Próximo · ' + gWhen(next) + '</small></span>' + icon('arrow') + '</button>' : '') +
    '<div class="progress" aria-label="Juegos terminados"><i style="width:' + (tot ? Math.round(done / tot * 100) : 0) + '%"></i></div><p class="small muted">' + done + ' de ' + tot + ' juegos terminados · ' + G.awards(S).filter(function (a) { return a.winners.length; }).length + ' premios en juego</p></section>';
}

/* ---------- Vista principal ---------- */
VIEWS.juegos = function () {
  if (ui.game) { var g = gById(ui.game); if (g) return gameView(ensureGame(g)); ui.game = null; }
  var sub = ui.jsub || 'juegos';
  var h = '<div class="view-head"><div><h2>Juegos</h2><p class="muted small">Competición, ranking y premios del finde</p></div></div>' +
    '<div class="seg" role="group" aria-label="Sección"><button data-act="jsub" data-v="juegos" aria-pressed="' + (sub === 'juegos') + '">Juegos</button><button data-act="jsub" data-v="ranking" aria-pressed="' + (sub === 'ranking') + '">Ranking</button><button data-act="jsub" data-v="premios" aria-pressed="' + (sub === 'premios') + '">Premios</button></div>';
  if (sub === 'ranking') return h + rankingView();
  if (sub === 'premios') return h + premiosView();
  return h + gamesList();
};

function gamesList() {
  var gs = (S.games || []).slice().sort(function (a, b) { return ((a.day || '9') + (a.time || '')).localeCompare((b.day || '9') + (b.time || '')) || (a.sort || 0) - (b.sort || 0); });
  if (!gs.length) return '<div class="empty">' + icon('games') + '<b>Sin juegos todavía</b><span>Pulsa + y crea el primero. El sofá no cuenta como deporte.</span></div>' + (can('edit') ? '<button class="fab" data-act="gNew" aria-label="Añadir juego">' + icon('plus') + '</button>' : '');
  var h = '', groups = {};
  gs.forEach(function (g) { var k = g.day || 'x'; (groups[k] = groups[k] || []).push(g); });
  var live = gs.filter(function (g) { return gStatus(g) === 'vivo'; });
  if (live.length) h += '<p class="eyebrow live-label"><span class="live-dot" aria-hidden="true"></span> En juego ahora</p>' + live.map(gameCard).join('');
  S.days.concat([{ k: 'x', long: 'Cuando queráis' }]).forEach(function (d) {
    var list = (groups[d.k] || []).filter(function (g) { return gStatus(g) !== 'vivo'; }); if (!list.length) return;
    h += '<p class="eyebrow">' + esc(d.long) + '</p>' + list.map(gameCard).join('');
  });
  h += '<section class="card wood small"><h3>Cómo se puntúa</h3><p>Cada juego reparte puntos según el puesto (se puede cambiar en cada juego). El ranking global suma todo. Si hay empate a puntos, manda quien tenga más oros, luego platas y luego bronces.</p><p class="muted">Todos compiten por su cuenta. ' + esc((S.comp && S.comp.duos || []).map(function (d) { return d.name; }).join(', ')) + (S.comp && S.comp.duos && S.comp.duos.length ? ' compiten en pareja: si ganan, ganan los dos.' : '') + '</p></section>';
  if (can('edit')) h += '<button class="fab" data-act="gNew" aria-label="Añadir juego">' + icon('plus') + '</button>';
  return h;
}
function gameCard(g) {
  ensureGame(g);
  var st = gStatus(g), sd = G.standings(S, g), ents = g.entrants || [];
  var champ = sd.complete || g.closed ? sd.rows.filter(function (r) { return r.pos === 1; }).map(function (r) { return r.id; }) : [];
  var prog = g.format === 'ranking' ? ' · ' + sd.rows.filter(function (r) { return r.pos; }).length + '/' + ents.length + ' con resultado' : '';
  return '<button class="card game-card st-' + st + '" data-act="gOpen" data-id="' + g.id + '">' +
    '<span class="g-ico">' + gIcon(g) + '</span><span class="grow g-body"><span class="row" style="gap:6px;flex-wrap:wrap"><b class="g-name">' + esc(g.name) + '</b></span>' +
    '<span class="small muted">' + gWhen(g) + (g.where ? ' · ' + esc(g.where) : '') + '</span>' +
    '<span class="row wrap" style="gap:6px"><span class="pill ' + GST[st][1] + '">' + GST[st][0] + '</span><span class="pill">' + G.FORMATS[g.format] + '</span>' + (g.needs && /PENDIENTE/.test(g.needs) ? '<span class="pill pend">Material pendiente</span>' : '') + '</span>' +
    (champ.length ? '<span class="g-champ">' + icon('trophy') + eAv(champ[0], 'xs') + '<b>' + champ.map(eName).join(', ') + '</b></span>' :
      '<span class="avs">' + ents.slice(0, 7).map(function (id) { return eAv(id, 'xs'); }).join('') + (ents.length > 7 ? '<span class="more">+' + (ents.length - 7) + '</span>' : '') + '<small class="muted">' + ents.length + ' jugadores' + prog + '</small></span>') +
    '</span>' + icon('arrow') + '</button>';
}

/* ---------- Ficha de un juego ---------- */
function gameView(g) {
  var ed = can('edit'), st = gStatus(g), sd = G.standings(S, g);
  var act = g.act && S.activities.find(function (a) { return a.id === g.act; });
  var h = '<div class="g-top"><button class="icon-btn" data-act="gBack" aria-label="Volver a juegos">' + icon('back') + '</button><div class="grow"><span class="eyebrow">' + esc(G.CATS[g.cat] || '') + ' · ' + G.FORMATS[g.format] + '</span><h2>' + esc(g.name) + '</h2></div>' +
    (ed ? '<button class="icon-btn" data-act="gEdit" data-id="' + g.id + '" aria-label="Editar juego">' + icon('edit') + '</button>' : '') + '</div>';
  h += '<div class="facts"><span class="pill ' + GST[st][1] + '">' + GST[st][0] + '</span><span class="fact">' + icon('clock') + gWhen(g) + '</span>' + (g.where ? '<span class="fact">' + icon('pin') + esc(g.where) + '</span>' : '') + '<span class="fact">' + icon('users') + (g.entrants || []).length + '</span></div>';
  if (g.needs) h += '<p class="small needs">' + icon('umbrella') + '<span><b>Material:</b> ' + esc(g.needs) + '</span></p>';
  if (g.rules) h += '<details class="rules"><summary>Reglas</summary><p class="small">' + esc(g.rules) + '</p></details>';
  if (act) h += '<button class="link small" data-act="tab" data-tab="planes">En el planning: ' + esc(dayOf(act.day).short) + ' ' + act.start + ' · ' + esc(act.title) + ' ' + icon('arrow') + '</button>';
  if (!ed) h += '<p class="small pill pend" style="white-space:normal">Modo lector: ves los resultados en directo. Los apuntan los editores.</p>';

  if (sd.champion && (g.format === 'bracket' || g.format === 'league')) h += '<div class="champ card">' + icon('trophy') + '<div class="grow"><span class="eyebrow">Campeón</span><h3>' + eName(sd.champion) + '</h3></div><button class="btn" data-act="gTrophy" data-id="' + g.id + '">Trofeo</button></div>';

  if (g.format === 'bracket') h += bracketHtml(g, ed);
  else if (g.format === 'league') h += leagueHtml(g, ed);
  else if (g.format === 'teams') h += teamsHtml(g, ed);
  else h += rankingInputHtml(g, ed);

  h += standingsHtml(g, sd);
  if (ed) h += '<div class="row wrap">' + (g.format === 'bracket' ? '<button class="btn" data-act="gReseed" data-id="' + g.id + '">' + icon('shuffle') + 'Sortear cuadro</button>' : '') +
    '<button class="btn ' + (g.closed ? '' : 'ghost') + '" data-act="gClose" data-id="' + g.id + '">' + (g.closed ? icon('undo') + 'Reabrir juego' : icon('check') + 'Dar por terminado') + '</button></div>';
  return h;
}
function stepper(g, k, side, v, dis) {
  return '<span class="stepper"><button data-act="gScore" data-g="' + g.id + '" data-k="' + k + '" data-s="' + side + '" data-d="-1" aria-label="Restar"' + dis + '>' + icon('minus') + '</button><b class="num' + (v != null ? '' : ' muted') + '">' + (v != null ? v : 0) + '</b><button data-act="gScore" data-g="' + g.id + '" data-k="' + k + '" data-s="' + side + '" data-d="1" aria-label="Sumar"' + dis + '>' + icon('plus') + '</button></span>';
}
/* un partido: dos filas grandes; tocar el nombre da la victoria */
function matchHtml(g, k, m, ed, label, bye, names) {
  names = names || {};
  var rows = ['a', 'b'].map(function (s) {
    var id = m[s], win = m.w === s, dis = ed && id && !bye ? '' : ' disabled';
    var nm = id ? (names[s] || eName(id)) : '<span class="muted">' + (bye ? 'Pasa directo' : 'Por decidir') + '</span>';
    return '<div class="mt-row' + (win ? ' win' : '') + (m.w && !win && m.w !== 'draw' ? ' lose' : '') + '"><button class="mt-name" data-act="gWin" data-g="' + g.id + '" data-k="' + k + '" data-s="' + s + '"' + dis + '>' + (id && !names[s] ? eAv(id, 'sm') : '') + '<span class="grow">' + nm + '</span>' + (win ? icon('check') : '') + '</button>' + (id && !bye ? stepper(g, k, s, m['s' + s], ed ? '' : ' disabled') : '') + '</div>';
  }).join('');
  var foot = '';
  if (ed && !bye && m.a && m.b && !m.w) {
    if (m.sa != null && m.sb != null) foot += '<button class="chip" data-act="gFinish" data-g="' + g.id + '" data-k="' + k + '">' + icon('check') + 'Terminar ' + m.sa + '–' + m.sb + '</button>';
    if (g.allowDraw) foot += '<button class="chip" data-act="gWin" data-g="' + g.id + '" data-k="' + k + '" data-s="draw">Empate</button>';
  }
  if (m.w === 'draw') foot += '<span class="pill">Empate</span>' + (ed ? '<button class="chip" data-act="gWin" data-g="' + g.id + '" data-k="' + k + '" data-s="draw">Quitar empate</button>' : '');
  return '<div class="match-card' + (m.w ? ' done' : '') + (bye ? ' bye' : '') + '">' + (label ? '<span class="eyebrow">' + label + '</span>' : '') + rows + (foot ? '<div class="row wrap mt-foot">' + foot + '</div>' : '') + '</div>';
}
function bracketHtml(g, ed) {
  var R = g.rounds || [];
  return R.map(function (round, ri) {
    var ms = round.map(function (m, mi) { return { m: m, mi: mi, bye: G.isBye(m, ri) }; });
    var real = ms.filter(function (x) { return !x.bye; }), byes = ms.filter(function (x) { return x.bye && (x.m.a || x.m.b); });
    return '<section class="round-sec"><h3 class="row" style="gap:8px">' + G.roundName(R.length, ri) + '<span class="small muted">' + real.filter(function (x) { return x.m.w; }).length + '/' + real.length + '</span></h3>' +
      real.map(function (x) { return matchHtml(g, 'b:' + ri + ':' + x.mi, x.m, ed); }).join('') +
      (byes.length ? '<p class="small muted byes">Pasan directos: ' + byes.map(function (x) { return eName(x.m.a || x.m.b); }).join(', ') + '</p>' : '') + '</section>';
  }).join('');
}
function leagueHtml(g, ed) {
  var ms = g.matches || [], pend = [], done = [];
  ms.forEach(function (m, i) { (m.w ? done : pend).push(matchHtml(g, 'l:' + i, m, ed)); });
  var tb = G.table(g.entrants || [], ms);
  return '<section class="card"><h3>Tabla</h3><div class="tbl-wrap"><table class="tbl lg"><thead><tr><th></th><th>Jugador</th><th>PJ</th><th>G</th><th>P</th><th>Pts</th></tr></thead><tbody>' +
    tb.map(function (t) { return '<tr><td>' + medal(t.pj ? t.pos : null) + '</td><td><span class="row" style="gap:6px">' + eAv(t.id, 'xs') + eName(t.id) + '</span></td><td>' + t.pj + '</td><td>' + t.g + '</td><td>' + t.p + '</td><td><b>' + t.pts + '</b></td></tr>'; }).join('') + '</tbody></table></div></section>' +
    (pend.length ? '<p class="eyebrow">Por jugar · ' + pend.length + '</p>' + pend.join('') : '') + (done.length ? '<p class="eyebrow">Jugados · ' + done.length + '</p>' + done.join('') : '');
}
function teamsHtml(g, ed) {
  var teams = g.teams || [], inTeam = {};
  teams.forEach(function (t) { t.members.forEach(function (id) { inTeam[id] = t.id; }); });
  var loose = (g.entrants || []).filter(function (id) { return !inTeam[id]; });
  var h = '<section class="card"><div class="card-head"><h3>Equipos</h3>' + (ed ? '<button class="btn" data-act="gShuffleTeams" data-id="' + g.id + '">' + icon('shuffle') + 'Sortear</button>' : '') + '</div>';
  if (!teams.length) h += '<p class="small muted">Aún no hay equipos. ' + (ed ? 'Pulsa «Sortear» y salen equilibrados por edades (se pueden retocar).' : 'Los hará un editor.') + '</p>';
  else h += (ed ? '<p class="small muted">Toca a alguien para pasarle al siguiente equipo.</p>' : '') + '<div class="teams">' + teams.map(function (t, i) {
    return '<div class="team tc' + (i % 4 + 1) + '">' + (ed ? '<input class="team-name" aria-label="Nombre del equipo" data-change="gTeamName" data-g="' + g.id + '" data-t="' + t.id + '" value="' + esc(t.name) + '">' : '<b>' + esc(t.name) + '</b>') +
      '<div class="team-m">' + (t.members.length ? t.members.map(function (id) { return '<button class="chip p-chip" data-act="gTeam" data-g="' + g.id + '" data-e="' + id + '"' + (ed ? '' : ' disabled') + '>' + eAv(id, 'xs') + eName(id) + '</button>'; }).join('') : '<span class="small muted">Vacío</span>') + '</div></div>';
  }).join('') + '</div>';
  if (loose.length && teams.length) h += '<div class="team loose"><span class="eyebrow">Sin equipo</span><div class="team-m">' + loose.map(function (id) { return '<button class="chip p-chip" data-act="gTeam" data-g="' + g.id + '" data-e="' + id + '"' + (ed ? '' : ' disabled') + '>' + eAv(id, 'xs') + eName(id) + '</button>'; }).join('') + '</div></div>';
  if (ed) h += '<div class="row wrap"><button class="btn ghost" data-act="gTeamN" data-id="' + g.id + '" data-d="1">' + icon('plus') + 'Equipo</button>' + (teams.length > 2 ? '<button class="btn ghost" data-act="gTeamN" data-id="' + g.id + '" data-d="-1">' + icon('minus') + 'Equipo</button>' : '') + '</div>';
  h += '</section>';
  if (teams.length < 2) return h;
  if (g.teamRank) {
    var ord = g.order || [];
    h += '<section class="card"><h3>Orden de llegada</h3><p class="small muted">' + (ed ? 'Toca los equipos según terminan: el primero que toques es el ganador.' : 'Así van.') + '</p><div class="stack" style="gap:8px">' +
      teams.map(function (t, i) { var p = ord.indexOf(t.id); return '<button class="order-btn tc' + (i % 4 + 1) + (p >= 0 ? ' placed' : '') + '" data-act="gTeamOrder" data-g="' + g.id + '" data-t="' + t.id + '"' + (ed ? '' : ' disabled') + '>' + (p >= 0 ? medal(p + 1) : '<span class="medal">·</span>') + '<b class="grow">' + esc(t.name) + '</b><span class="avs">' + t.members.slice(0, 5).map(function (id) { return eAv(id, 'xs'); }).join('') + '</span></button>'; }).join('') + '</div></section>';
    return h;
  }
  var names = {}; teams.forEach(function (t) { names[t.id] = esc(t.name); });
  h += '<p class="eyebrow">Partidos</p>' + (g.matches || []).map(function (m, i) { return matchHtml(g, 'l:' + i, m, ed, (g.matches.length > 1 ? 'Partido ' + (i + 1) : ''), false, { a: names[m.a], b: names[m.b] }); }).join('');
  if (ed) h += '<button class="btn ghost" data-act="gAddMatch" data-id="' + g.id + '">' + icon('plus') + 'Otro partido (revancha)</button>';
  return h;
}
function rankingInputHtml(g, ed) {
  var mode = g.mode || 'order', ents = g.entrants || [];
  if (mode === 'order') {
    var ord = (g.order || []).filter(function (id) { return ents.indexOf(id) >= 0; }), rest = ents.filter(function (id) { return ord.indexOf(id) < 0; });
    var h = '<section class="card"><h3>' + (g.cat === 'escondite' ? 'Mejor escondidos' : 'Clasificación') + '</h3><p class="small muted">' + (ed ? (g.cat === 'escondite' ? 'Apunta primero al ÚLTIMO en aparecer: es el mejor escondido. Luego el penúltimo, y así.' : 'Toca a cada uno en orden: primero, segundo, tercero…') : 'Así va la clasificación.') + '</p>';
    if (ord.length) h += '<ol class="order-list">' + ord.map(function (id, i) { return '<li><button class="order-btn placed" data-act="gOrder" data-g="' + g.id + '" data-e="' + id + '"' + (ed ? '' : ' disabled') + '>' + medal(i + 1) + eAv(id, 'sm') + '<b class="grow">' + eName(id) + '</b>' + (ed ? icon('x') : '') + '</button></li>'; }).join('') + '</ol>';
    if (rest.length) h += '<span class="eyebrow">' + (ord.length ? 'Faltan' : 'Participantes') + '</span><div class="pick-grid">' + rest.map(function (id) { return '<button class="pick" data-act="gOrder" data-g="' + g.id + '" data-e="' + id + '"' + (ed ? '' : ' disabled') + '>' + eAv(id, 'md') + '<span>' + eName(id) + '</span></button>'; }).join('') + '</div>';
    if (ed && ord.length) h += '<div class="row wrap"><button class="btn ghost" data-act="gOrderUndo" data-g="' + g.id + '">' + icon('undo') + 'Deshacer</button><button class="btn ghost" data-act="gOrderClear" data-g="' + g.id + '">Borrar orden</button></div>';
    return h + '</section>';
  }
  var sd = G.standings(S, g), pos = {}; sd.rows.forEach(function (r) { pos[r.id] = r.pos; });
  var unit = g.unit || 'puntos';
  return '<section class="card"><h3>Resultados</h3><p class="small muted">' + (mode === 'low' ? 'Menos es mejor (' + esc(unit) + '). ' : 'Más es mejor (' + esc(unit) + '). ') + (ed ? 'Escribe el resultado de cada uno: la clasificación sale sola.' : '') + '</p><div class="stack" style="gap:6px">' +
    ents.slice().sort(function (a, b) { return (pos[a] || 999) - (pos[b] || 999); }).map(function (id) {
      var v = (g.results || {})[id];
      return '<div class="res-row">' + medal(pos[id]) + eAv(id, 'sm') + '<b class="grow">' + eName(id) + '</b><span class="res-in"><input inputmode="decimal" aria-label="Resultado de ' + esc(eText(id)) + '" data-change="gVal" data-g="' + g.id + '" data-e="' + id + '" value="' + (v != null ? L.n(v) : '') + '" placeholder="–"' + (ed ? '' : ' disabled') + '><small>' + esc(unit) + '</small></span></div>';
    }).join('') + '</div></section>';
}
function standingsHtml(g, sd) {
  var done = G.isDone(S, g), any = sd.rows.some(function (r) { return r.pos; });
  if (!any && !done) return '<section class="card"><h3>Puntos de este juego</h3><p class="small muted">' + gPointsText(g) + '</p></section>';
  return '<section class="card"><div class="card-head"><h3>Clasificación</h3><span class="pill ' + (done ? 'ok' : '') + '">' + (done ? 'Cuenta para el ranking' : 'Provisional') + '</span></div><div class="stack" style="gap:0">' +
    sd.rows.map(function (r) { return '<div class="st-row">' + medal(r.pos) + eAv(r.id, 'sm') + '<span class="grow"><b>' + eName(r.id) + '</b>' + (r.note ? '<small class="muted" style="display:block">' + esc(r.note) + '</small>' : '') + '</span>' + (r.pos || done ? '<b class="pts">+' + G.pointsFor(g, r.pos) + '</b>' : '') + '</div>'; }).join('') +
    '</div><p class="small muted">' + gPointsText(g) + '</p></section>';
}

/* ---------- Ranking global ---------- */
function rankingView() {
  var rank = G.ranking(S), done = G.doneGames(S);
  if (!done.length) {
    var nx = (S.games || [])[0];
    return '<div class="empty">' + icon('podium') + '<b>El podio está vacío</b><span>En cuanto termine el primer juego aparecen aquí los puntos. Se admiten apuestas.</span></div>' + (nx ? '<button class="btn block" data-act="jsub" data-v="juegos">Ver los juegos</button>' : '');
  }
  var top = [2, 1, 3].map(function (p) { return rank.filter(function (r) { return r.pos === p && r.pts > 0; }); });
  var h = '<section class="podium-wrap"><div class="podium">' + top.map(function (list, i) {
    var p = [2, 1, 3][i]; if (!list.length) return '<div class="pod p' + p + ' empty"><div class="block">' + p + '</div></div>';
    return '<div class="pod p' + p + '"' + (p === 1 ? ' data-egg="podio"' : '') + '>' + (p === 1 ? '<span class="crown">' + icon('trophy') + '</span>' : '') + '<span class="pod-av pod-avs">' + list.slice(0, 3).map(function (r) { return eAv(r.id, 'lg'); }).join('') + '</span><b class="pod-name">' + list.map(function (r) { return eName(r.id); }).join('<br>') + '</b><span class="pod-pts num">' + list[0].pts + ' pts</span><div class="block">' + p + '</div></div>';
  }).join('') + '</div></section>';
  h += '<section class="card"><div class="card-head"><h3>Clasificación general</h3><span class="small muted">' + done.length + ' de ' + (S.games || []).length + ' juegos</span></div><div class="stack" style="gap:0">' +
    rank.map(function (r) {
      return '<button class="rk-row" data-act="gRow" data-e="' + r.id + '">' + medal(r.pts ? r.pos : null) + eAv(r.id, 'sm') + '<span class="grow"><b>' + eName(r.id) + '</b><small class="muted" style="display:block">' + r.played + (r.played === 1 ? ' juego' : ' juegos') + (r.gold || r.silver || r.bronze ? ' · ' + [r.gold ? r.gold + ' oro' + (r.gold > 1 ? 's' : '') : '', r.silver ? r.silver + ' plata' + (r.silver > 1 ? 's' : '') : '', r.bronze ? r.bronze + ' bronce' + (r.bronze > 1 ? 's' : '') : ''].filter(Boolean).join(', ') : '') + '</small></span><b class="pts num">' + r.pts + '</b></button>';
    }).join('') + '</div></section>';
  var cb = G.comeback(S);
  if (cb) h += '<section class="card wood small"><p><b>Remontada en marcha:</b> ' + eName(cb.id) + ' ha pasado del ' + cb.from + '.º al ' + cb.to + '.º.</p></section>';
  return h;
}

/* ---------- Premios ---------- */
function premiosView() {
  var list = G.awards(S), withW = list.filter(function (a) { return a.winners.length; }), t = G.tally(S);
  var prized = S.people.filter(function (p) { return t[p.id].length; }), none = S.people.filter(function (p) { return !t[p.id].length && (p.attends || G.presentOn(S, G.entrantOf(S, p.id))); });
  var h = '<section class="card gala-card"><span class="eyebrow">La noche de los premios</span><h3>Gala de premios</h3><p class="small">' + withW.length + ' premios con ganador · ' + prized.length + ' de ' + S.people.length + ' personas premiadas.</p>' +
    '<button class="btn primary block big-btn" data-act="galaStart"' + (withW.length ? '' : ' disabled') + '>' + icon('play') + 'Empezar la gala</button>' +
    (none.length ? '<p class="small muted">Aún sin premio: ' + none.map(function (p) { return esc(p.name); }).join(', ') + '. ' + (can('edit') ? 'Crea un premio especial para que nadie se quede sin estatuilla.' : '') + '</p>' : '<p class="small">Todo el mundo tiene al menos un premio. Así se hace.</p>') +
    (can('edit') ? '<button class="btn block" data-act="aNew">' + icon('plus') + 'Premio especial</button>' : '') + '</section>';
  ['podio', 'juegos', 'casa', 'publico', 'extra'].forEach(function (gk) {
    var items = list.filter(function (a) { return a.group === gk; }); if (!items.length) return;
    h += '<p class="eyebrow">' + esc(G.GROUPS[gk]) + '</p>' + (gk === 'publico' ? '<p class="small muted">Vota todo el mundo, también los lectores. Un voto por premio; se puede cambiar. El resultado se desvela en la gala.</p>' : '');
    var won = items.filter(function (a) { return a.vote || a.winners.length; }), pend = items.filter(function (a) { return !a.vote && !a.winners.length; });
    h += won.map(awardCard).join('');
    if (pend.length) h += '<section class="card aw-pend"><span class="eyebrow">Por decidir · ' + pend.length + '</span>' + pend.map(function (a) {
      return '<div class="aw-row">' + '<span class="aw-ico sm">' + icon(a.icon || 'star') + '</span><span class="grow"><b>' + esc(a.name) + '</b><small class="muted">' + esc(a.desc) + '</small></span>' + (can('edit') ? '<button class="icon-btn" data-act="aEdit" data-id="' + a.id + '" aria-label="Decidir ' + esc(a.name) + '">' + icon('edit') + '</button>' : '') + '</div>';
    }).join('') + '</section>';
  });
  return h;
}
function awardCard(a) {
  var ed = can('edit'), mine = a.vote && S.awardVotes && S.awardVotes[a.id] && S.awardVotes[a.id][me().id];
  var vr = a.vote ? G.voteResult(S, a.id) : null;
  var body;
  if (a.vote && a.source !== 'manual') body = '<p class="small">' + (mine ? 'Tu voto: <b>' + eName(mine) + '</b>' : 'Todavía no has votado') + ' · ' + vr.total + (vr.total === 1 ? ' voto' : ' votos') + ' en total</p><button class="btn ' + (mine ? '' : 'primary') + '" data-act="aVote" data-id="' + a.id + '">' + icon('heart') + (mine ? 'Cambiar voto' : 'Votar') + '</button>';
  else if (a.winners.length) body = '<div class="aw-win">' + a.winners.slice(0, 8).map(function (w) { return '<span class="aw-w">' + eAv(w, 'sm') + '<b>' + eName(w) + '</b></span>'; }).join('') + (a.winners.length > 8 ? '<span class="small muted">y ' + (a.winners.length - 8) + ' más</span>' : '') + '</div>' + (a.why ? '<p class="small muted">' + esc(a.why) + '</p>' : '');
  else body = '<p class="small muted">Sin ganador todavía: se decide con lo que pase en el finde.</p>';
  var src = a.source === 'manual' ? 'Jurado' : a.source === 'voto' ? 'Votación' : 'Automático';
  return '<article class="card award"><div class="row" style="align-items:flex-start"><span class="aw-ico">' + icon(a.icon || 'star') + '</span><div class="grow"><h3>' + esc(a.name) + '</h3><p class="small muted">' + esc(a.desc) + '</p></div>' +
    (ed ? '<button class="icon-btn" data-act="aEdit" data-id="' + a.id + '" aria-label="Editar premio">' + icon('edit') + '</button>' : '') + '</div>' + body +
    '<span class="pill aw-src">' + src + '</span></article>';
}
/* kind: 'entrants' (quién juega) · 'people' (votos: personas y dúos) · 'all' (jurado: personas, dúos y familias) */
function pickList(act, id, selected, kind) {
  var duoIds = G.entrantIds(S).filter(function (e) { return !person(e); });
  var opts = kind === 'entrants' ? G.entrantIds(S) : S.people.map(function (p) { return p.id; }).concat(duoIds);
  if (kind === 'all') opts = opts.concat(S.families.map(function (f) { return 'fam:' + f.id; }));
  return '<div class="pick-grid">' + opts.map(function (o) { var on = selected.indexOf(o) >= 0; return '<button type="button" class="pick' + (on ? ' on' : '') + '" data-act="' + act + '" data-id="' + id + '" data-e="' + o + '" aria-pressed="' + on + '">' + eAv(o, 'md') + '<span>' + eName(o) + '</span></button>'; }).join('') + '</div>';
}

/* ---------- Gala ---------- */
var gala = null;
function galaSlides() {
  var list = G.awards(S).filter(function (a) { return a.winners.length; });
  var order = ['casa', 'juegos', 'publico', 'extra'], slides = [{ t: 'intro' }];
  order.forEach(function (gk) { var it = list.filter(function (a) { return a.group === gk; }); if (it.length) { slides.push({ t: 'group', g: gk }); it.forEach(function (a) { slides.push({ t: 'award', a: a }); }); } });
  var pod = ['bronce', 'plata', 'oro'].map(function (id) { return list.find(function (a) { return a.id === id; }); }).filter(Boolean);
  if (pod.length) { slides.push({ t: 'group', g: 'podio' }); pod.forEach(function (a) { slides.push({ t: 'award', a: a, podium: true }); }); }
  slides.push({ t: 'final' });
  return slides;
}
function galaRender() {
  var el = document.getElementById('gala'); if (!el || !gala) return;
  var s = gala.slides[gala.i], inner = '';
  if (s.t === 'intro') inner = '<span class="eyebrow">' + esc(S.trip.name) + '</span><h1 class="gala-title">Gala de premios</h1><p>Silencio en la sala. Apagad los móviles… bueno, este no.</p><p class="small">' + (gala.slides.filter(function (x) { return x.t === 'award'; }).length) + ' premios</p>';
  else if (s.t === 'group') inner = '<span class="eyebrow">A continuación</span><h1 class="gala-title">' + esc(G.GROUPS[s.g]) + '</h1>';
  else if (s.t === 'award') {
    var a = s.a;
    inner = '<span class="gala-ico">' + icon(a.icon || 'star') + '</span><span class="eyebrow">' + esc(G.GROUPS[a.group]) + '</span><h1 class="gala-title">' + esc(a.name) + '</h1><p>' + esc(a.desc) + '</p>' +
      (gala.revealed ? '<div class="gala-win">' + a.winners.map(function (w) { return '<span class="gw">' + eAv(w, 'xl') + '<b>' + eName(w) + '</b></span>'; }).join('') + '</div>' + (a.why ? '<p class="gala-why">' + esc(a.why) + '</p>' : '')
        : '<p class="gala-drum">Y el premio es para…</p><p class="small">Toca para desvelarlo</p>');
  } else {
    var t = G.tally(S), names = {}; G.awards(S).forEach(function (a) { names[a.id] = a.name; });
    inner = '<span class="eyebrow">Habemus premiados</span><h1 class="gala-title">¡Gracias, familia!</h1><div class="gala-all">' + S.people.filter(function (p) { return t[p.id].length; }).map(function (p) { return '<div class="ga">' + av(p.id, 'md') + '<b>' + esc(p.name) + '</b><small>' + t[p.id].map(function (k) { return esc(names[k]); }).join(' · ') + '</small></div>'; }).join('') + '</div><p class="small">Nos vemos en la próxima escapada.</p>';
  }
  el.querySelector('.gala-in').innerHTML = inner;
  el.querySelector('.gala-count').textContent = (gala.i + 1) + ' / ' + gala.slides.length;
  el.querySelector('[data-act=galaPrev]').disabled = gala.i === 0;
  el.querySelector('[data-act=galaNext]').innerHTML = s.t === 'award' && !gala.revealed ? 'Desvelar' : gala.i === gala.slides.length - 1 ? 'Cerrar' : 'Siguiente ' + icon('arrow');
}
function drumroll() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    for (var i = 0; i < 22; i++) {
      var t = actx.currentTime + i * 0.055, o = actx.createOscillator(), gn = actx.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(110 + Math.random() * 30, t);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.12 + i * 0.006, t + 0.01); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(gn); gn.connect(actx.destination); o.start(t); o.stop(t + 0.06);
    }
  } catch (e) {}
}
function fanfare() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [[523, 0], [659, .14], [784, .28], [1047, .46], [784, .66], [1047, .8]].forEach(function (n) {
      var t = actx.currentTime + n[1], o = actx.createOscillator(), gn = actx.createGain();
      o.type = 'square'; o.frequency.setValueAtTime(n[0], t);
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.07, t + 0.02); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(gn); gn.connect(actx.destination); o.start(t); o.stop(t + 0.25);
    });
  } catch (e) {}
}
function galaOpen() {
  gala = { slides: galaSlides(), i: 0, revealed: false };
  var el = document.createElement('div'); el.className = 'gala'; el.id = 'gala'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Gala de premios');
  el.innerHTML = '<div class="gala-spot" aria-hidden="true"></div><button class="gala-x icon-btn" data-act="galaExit" aria-label="Salir de la gala">' + icon('x') + '</button><div class="gala-in" data-act="galaNext" aria-live="polite"></div><div class="gala-ctl"><button class="btn" data-act="galaPrev">' + icon('back') + '</button><span class="gala-count small"></span><button class="btn primary" data-act="galaNext"></button></div>';
  document.body.appendChild(el); document.body.style.overflow = 'hidden'; overlayPush('gala');
  galaRender();
}
function galaClose(fromNav) { var el = document.getElementById('gala'); if (el) el.remove(); document.body.style.overflow = ''; gala = null; if (el && !fromNav) overlayDone(); }

/* ---------- Hojas de edición ---------- */
function gameSheet(id) {
  var g = gById(id); ensureGame(g);
  draft = { id: id, entrants: (g.entrants || []).slice(), format: g.format, mode: g.mode || 'order', cat: g.cat, allowDraw: !!g.allowDraw, teamRank: !!g.teamRank };
  openSheet('<h2>Editar juego</h2>' +
    '<div class="field"><label for="g-name">Nombre</label><input id="g-name" value="' + esc(g.name) + '"></div>' +
    '<div class="grid2"><div class="field"><label for="g-cat">Tipo de prueba</label><select id="g-cat">' + Object.keys(G.CATS).map(function (c) { return '<option value="' + c + '"' + (g.cat === c ? ' selected' : '') + '>' + G.CATS[c] + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="g-format">Formato</label><select id="g-format">' + Object.keys(G.FORMATS).map(function (f) { return '<option value="' + f + '"' + (g.format === f ? ' selected' : '') + '>' + G.FORMATS[f] + '</option>'; }).join('') + '</select></div></div>' +
    '<div class="field"><span class="lbl">Si es clasificación, ¿cómo se ordena?</span>' + segHtml('mode', [['order', 'Orden'], ['high', 'Más es mejor'], ['low', 'Menos es mejor']], draft.mode) + '</div>' +
    '<div class="grid2"><div class="field"><label for="g-unit">Unidad</label><input id="g-unit" value="' + esc(g.unit || '') + '" placeholder="puntos, s, m…"></div>' +
    '<div class="field"><span class="lbl">Empates en partidos</span>' + segHtml('allowDraw', [['1', 'Sí'], ['', 'No']], draft.allowDraw ? '1' : '') + '</div></div>' +
    '<div class="field"><span class="lbl">Equipos: ¿cómo se decide?</span>' + segHtml('teamRank', [['', 'Partidos'], ['1', 'Orden de llegada']], draft.teamRank ? '1' : '') + '</div>' +
    '<div class="grid2"><div class="field"><label for="g-day">Día</label><select id="g-day"><option value="">Cuando queráis</option>' + S.days.map(function (d) { return '<option value="' + d.k + '"' + (g.day === d.k ? ' selected' : '') + '>' + esc(d.long) + '</option>'; }).join('') + '</select></div>' +
    '<div class="field"><label for="g-time">Hora</label><input id="g-time" type="time" value="' + esc(g.time || '') + '"></div></div>' +
    '<div class="field"><label for="g-where">Dónde</label><input id="g-where" value="' + esc(g.where || '') + '"></div>' +
    '<div class="field"><label for="g-points">Puntos por puesto (1.º, 2.º, 3.º…)</label><input id="g-points" inputmode="numeric" value="' + esc((g.points && g.points.length ? g.points : G.DEFAULT_POINTS).join(', ')) + '"></div>' +
    '<div class="field"><label for="g-part">Puntos por participar (resto)</label><input id="g-part" inputmode="numeric" value="' + (g.part != null ? g.part : 1) + '"></div>' +
    '<div class="field"><span class="lbl">Quién juega · <span id="g-count">' + draft.entrants.length + '</span></span><div class="row wrap"><button type="button" class="chip" data-act="gPickAll" data-v="all">Todos</button><button type="button" class="chip" data-act="gPickAll" data-v="day">Los que están ese día</button><button type="button" class="chip" data-act="gPickAll" data-v="none">Nadie</button></div>' + pickList('gPick', id, draft.entrants, 'entrants') + '</div>' +
    '<div class="field"><label for="g-rules">Reglas</label><textarea id="g-rules">' + esc(g.rules || '') + '</textarea></div>' +
    '<div class="field"><label for="g-needs">Material que hace falta</label><input id="g-needs" value="' + esc(g.needs || '') + '"></div>' +
    '<div class="sheet-actions"><button class="btn primary" data-act="gSave">Guardar</button><button class="btn danger" data-act="gDel" data-id="' + id + '">' + icon('trash') + 'Borrar juego</button></div>');
}
function saveGame() {
  var g = gById(draft.id); if (!g) return;
  var name = val('g-name').trim(); if (!name) { toast('Ponle nombre al juego'); return; }
  var fmt = val('g-format'), changedFmt = fmt !== g.format, oldE = (g.entrants || []).join(','), newE = draft.entrants.join(',');
  if (changedFmt && gHasAny(g) && !draft.confirmFmt) { draft.confirmFmt = true; toast('Cambiar el formato borra los resultados de este juego. Pulsa Guardar otra vez para confirmarlo'); return; }
  g.name = name; g.cat = val('g-cat'); g.mode = draft.mode; g.unit = val('g-unit').trim() || null; g.allowDraw = !!draft.allowDraw; g.teamRank = !!draft.teamRank;
  g.day = val('g-day') || null; g.time = val('g-time') || null; g.where = val('g-where').trim(); g.rules = val('g-rules').trim(); g.needs = val('g-needs').trim();
  var pts = val('g-points').split(/[^\d]+/).filter(Boolean).map(Number); g.points = pts.length ? pts : null;
  var part = parseInt(val('g-part'), 10); g.part = isNaN(part) ? 1 : part;
  g.entrants = draft.entrants.slice();
  if (changedFmt) { g.format = fmt; delete g.rounds; delete g.matches; delete g.order; delete g.results; g.teams = fmt === 'teams' ? (g.teams || []) : undefined; g.closed = false; }
  if (g.format === 'bracket' && (changedFmt || oldE !== newE)) {
    if (!gHasAny(g) || changedFmt) { g.rounds = G.makeBracket(g.entrants); G.advance(g); }
    else toast('Has cambiado jugadores: pulsa «Sortear cuadro» para rehacer la eliminatoria');
  }
  if (g.format === 'league' && (changedFmt || oldE !== newE)) {
    var keep = (g.matches || []).filter(function (m) { return g.entrants.indexOf(m.a) >= 0 && g.entrants.indexOf(m.b) >= 0; });
    G.roundRobin(g.entrants).forEach(function (m) { if (!keep.some(function (k) { return (k.a === m.a && k.b === m.b) || (k.a === m.b && k.b === m.a); })) keep.push(m); });
    g.matches = keep;
  }
  if (g.format === 'teams' && g.teams) g.teams.forEach(function (t) { t.members = t.members.filter(function (id) { return g.entrants.indexOf(id) >= 0; }); });
  Object.keys(g).forEach(function (k) { if (g[k] === undefined) delete g[k]; });
  ensureGame(g); save(); closeSheet(); render(true); toast('Juego guardado');
}
function newGameSheet() {
  openSheet('<h2>Nuevo juego</h2><p class="small muted">Elige una plantilla y ajústala. Se puede crear desde el móvil en plena partida.</p><div class="tpl-grid">' +
    G.TEMPLATES.map(function (t) { return '<button class="tpl" data-act="gCreate" data-k="' + t.key + '">' + icon(t.icon) + '<b>' + esc(t.name) + '</b><small>' + G.FORMATS[t.format] + '</small></button>'; }).join('') + '</div>');
}
function createGame(key) {
  var t = G.TEMPLATES.find(function (x) { return x.key === key; }); if (!t) return;
  var today = new Date().toISOString().slice(0, 10), day = S.days.some(function (d) { return d.k === today; }) ? today : null;
  var g = { id: uid('g'), sort: (S.games || []).length + 1, name: t.name, cat: t.cat, format: t.format, icon: t.icon, day: day, time: null, where: '', rules: t.rules || '', needs: '', entrants: G.presentList(S, day) };
  ['mode', 'unit', 'points', 'allowDraw'].forEach(function (k) { if (t[k] != null) g[k] = t[k]; });
  S.games = S.games || []; S.games.push(ensureGame(g));
  save(); closeSheet(); ui.game = g.id; ui.jsub = 'juegos'; render(); window.scrollTo(0, 0); gameSheet(g.id);
}
function awardSheet(id) {
  var a = G.awards(S).find(function (x) { return x.id === id; }); if (!a) return;
  var d = (S.awardData || {})[id] || {};
  draft = { id: id, winners: (d.winners || (a.source !== 'manual' ? [] : a.winners)).slice(), custom: !!d.custom };
  openSheet('<h2>' + esc(a.name) + '</h2>' +
    (d.custom ? '<div class="field"><label for="a-name">Nombre del premio</label><input id="a-name" value="' + esc(d.name || '') + '"></div><div class="field"><label for="a-desc">Criterio</label><input id="a-desc" value="' + esc(d.desc || '') + '"></div>' : '<p class="small muted">' + esc(a.desc) + '</p>' +
      '<p class="small">Ahora mismo: <b>' + (a.winners.length && !(a.vote && a.source !== 'manual') ? a.winners.map(eText).map(esc).join(', ') : a.vote ? 'se decide por votación' : 'sin ganador') + '</b> (' + (a.source === 'manual' ? 'decisión del jurado' : a.source === 'voto' ? 'votación' : 'automático') + ')</p>') +
    '<div class="field"><span class="lbl">' + (d.custom ? 'Premiados' : 'Decisión del jurado (sustituye al cálculo automático)') + '</span>' + pickList('aPickW', id, draft.winners, 'all') + '</div>' +
    '<div class="field"><label for="a-why">Motivo (opcional)</label><input id="a-why" value="' + esc(d.why || '') + '" placeholder="Por…"></div>' +
    '<div class="sheet-actions"><button class="btn primary" data-act="aSave">Guardar</button>' + (!d.custom && d.winners && d.winners.length ? '<button class="btn" data-act="aAuto" data-id="' + id + '">Volver a automático</button>' : '') + '<button class="btn danger" data-act="aHide" data-id="' + id + '">' + (d.custom ? 'Borrar premio' : 'Quitar premio') + '</button></div>');
}

/* ---------- Acciones ---------- */
function mObj(g, k) { var p = k.split(':'); return p[0] === 'b' ? g.rounds[+p[1]][+p[2]] : g.matches[+p[1]]; }
function afterResult(g, before) {
  var sd = G.standings(S, g); save(); render(true);
  if (sd.champion && sd.champion !== before && (g.format === 'bracket' || g.format === 'league')) setTimeout(function () { gTrophy(sd.champion, g.name); }, 250);
  else if (sd.complete && !before) { confetti(1800); toast('¡' + esc(g.name) + ' terminado! Los puntos ya cuentan'); }
  checkAllGames();
}
function gTrophy(id, title) {
  var v = document.createElement('div'); v.className = 'egg-veil'; document.body.appendChild(v);
  confetti(3600); fanfare();
  eggCard('trophy', esc(eText(id)), 'Campeón de «' + esc(title) + '». Aplausos, fotos y, si quiere, una vuelta de honor por la nave.', '<div class="trophy">' + icon('trophy') + '</div>');
  setTimeout(function () { v.remove(); }, 4400);
}
function checkAllGames() {
  var gs = S.games || []; if (!gs.length || ui.allDoneShown) return;
  if (gs.every(function (g) { return G.isDone(S, g); })) {
    ui.allDoneShown = true; var r = G.ranking(S).filter(function (x) { return x.pos === 1; });
    setTimeout(function () { fumataRaw('¡Tenemos campeón!', r.map(function (x) { return esc(eText(x.id)); }).join(' y ') + ' gana el finde. Que vaya preparando el discurso para la gala (máximo 30 segundos).', 'habemus'); }, 1200);
  }
}
function champOf(g) { var sd = G.standings(S, g); return sd.champion || (sd.complete ? 'done' : null); }
function gGuard() { return guard('edit'); }

Object.assign(A, {
  jsub: function (el) { ui.jsub = el.dataset.v; ui.game = null; if (ui.tab !== 'juegos') ui.tab = 'juegos'; render(); window.scrollTo(0, 0); navPush(); },
  gOpen: function (el) { if (ui.tab === 'planes') egg('ojeador'); ui.game = el.dataset.id; if (ui.tab !== 'juegos') ui.tab = 'juegos'; render(); window.scrollTo(0, 0); navPush(); },
  gBack: function () { var st = history.state, g = ui.game; ui.game = null; render(); window.scrollTo(0, 0); if (st && st.app && st.v && st.v.game === g && history.length > 1) history.back(); else navPush(); },
  gNew: function () { if (gGuard()) newGameSheet(); },
  gCreate: function (el) { createGame(el.dataset.k); },
  gEdit: function (el) { if (gGuard()) gameSheet(el.dataset.id); },
  gSave: saveGame,
  gDel: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Toca otra vez'; return; }
    var g = gById(el.dataset.id), idx = S.games.indexOf(g); S.games.splice(idx, 1); ui.game = null; save(); closeSheet(); render();
    toast('Juego borrado', 'Deshacer', function () { S.games.splice(idx, 0, g); save(); render(); });
  },
  gPick: function (el) {
    var id = el.dataset.e, k = draft.entrants.indexOf(id); if (k >= 0) draft.entrants.splice(k, 1); else draft.entrants.push(id);
    el.classList.toggle('on', k < 0); el.setAttribute('aria-pressed', k < 0); var c = document.getElementById('g-count'); if (c) c.textContent = draft.entrants.length;
  },
  gPickAll: function (el) {
    var v = el.dataset.v; draft.entrants = v === 'all' ? G.entrantIds(S) : v === 'day' ? G.presentList(S, val('g-day') || null) : [];
    document.querySelectorAll('[data-act=gPick]').forEach(function (b) { var on = draft.entrants.indexOf(b.dataset.e) >= 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    var c = document.getElementById('g-count'); if (c) c.textContent = draft.entrants.length;
  },
  gWin: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.g), m = mObj(g, el.dataset.k), before = champOf(g), s = el.dataset.s;
    m.w = m.w === s ? null : s;
    if (g.format === 'bracket') G.advance(g);
    if (navigator.vibrate) try { navigator.vibrate(18); } catch (e) {}
    afterResult(g, before);
  },
  gScore: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.g), m = mObj(g, el.dataset.k), s = el.dataset.s, o = s === 'a' ? 'b' : 'a';
    var v = (m['s' + s] || 0) + (+el.dataset.d); m['s' + s] = Math.max(0, v); if (m['s' + o] == null) m['s' + o] = 0;
    save(); render(true);
  },
  gFinish: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.g), m = mObj(g, el.dataset.k), before = champOf(g);
    if (m.sa === m.sb) { if (g.allowDraw) m.w = 'draw'; else { toast('Empate: toca el nombre del ganador'); return; } } else m.w = m.sa > m.sb ? 'a' : 'b';
    if (g.format === 'bracket') G.advance(g);
    afterResult(g, before);
  },
  gTrophy: function (el) { var g = gById(el.dataset.id), c = G.standings(S, g).champion; if (c) gTrophy(c, g.name); },
  gOrder: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.g), id = el.dataset.e, before = champOf(g); g.order = g.order || [];
    var k = g.order.indexOf(id); if (k >= 0) g.order.splice(k, 1); else g.order.push(id);
    if (k < 0 && navigator.vibrate) try { navigator.vibrate(15); } catch (e) {}
    afterResult(g, before);
  },
  gOrderUndo: function (el) { if (!gGuard()) return; var g = gById(el.dataset.g); (g.order || []).pop(); save(); render(true); },
  gOrderClear: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = '¿Seguro? Toca otra vez'; return; }
    var g = gById(el.dataset.g); g.order = []; save(); render(true);
  },
  gTeamOrder: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.g), id = el.dataset.t, before = champOf(g); g.order = g.order || [];
    var k = g.order.indexOf(id); if (k >= 0) g.order.splice(k, 1); else g.order.push(id);
    afterResult(g, before);
  },
  gShuffleTeams: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.id);
    if ((g.matches || []).some(function (m) { return m.w || m.sa != null; }) && !el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = 'Hay resultados: toca otra vez para sortear'; return; }
    var n = Math.max(2, (g.teams || []).length || (g.teamRank ? 4 : 2)), names = (g.teams || []).map(function (t) { return t.name; });
    g.teams = G.balancedTeams(S, g.entrants || [], n); g.teams.forEach(function (t, i) { if (names[i]) t.name = names[i]; });
    if (!g.teamRank) g.matches = G.roundRobin(g.teams.map(function (t) { return t.id; })); else g.order = [];
    save(); render(true); toast('Equipos sorteados y equilibrados por edades');
  },
  gTeam: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.g), id = el.dataset.e, T = g.teams || [];
    var cur = T.findIndex(function (t) { return t.members.indexOf(id) >= 0; });
    if (cur >= 0) T[cur].members.splice(T[cur].members.indexOf(id), 1);
    var nx = cur + 1; if (nx < T.length) T[nx].members.push(id);
    save(); render(true);
  },
  gTeamN: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.id), T = g.teams = g.teams || [];
    if (+el.dataset.d > 0) { var i = T.length; T.push({ id: 't' + Date.now().toString(36), name: ['Equipo Carmesí', 'Equipo Oliva', 'Equipo Madera', 'Equipo Pizarra', 'Equipo Oro', 'Equipo Plata'][i % 6], members: [] }); }
    else if (T.length > 2) { var rm = T.pop(); g.matches = (g.matches || []).filter(function (m) { return m.a !== rm.id && m.b !== rm.id; }); if (g.order) g.order = g.order.filter(function (x) { return x !== rm.id; }); }
    if (!g.teamRank) { var ids = T.map(function (t) { return t.id; }); G.roundRobin(ids).forEach(function (m) { if (!(g.matches || []).some(function (k) { return (k.a === m.a && k.b === m.b) || (k.a === m.b && k.b === m.a); })) g.matches.push(m); }); }
    save(); render(true);
  },
  gAddMatch: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.id), T = g.teams || []; if (T.length < 2) return;
    var n = (g.matches || []).length, pairs = G.roundRobin(T.map(function (t) { return t.id; })), p = pairs[n % pairs.length];
    g.matches.push({ a: p.a, b: p.b, sa: null, sb: null, w: null }); save(); render(true); toast('Revancha añadida');
  },
  gReseed: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.id);
    if (gHasAny(g) && !el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = 'Se borran los resultados: toca otra vez'; return; }
    var list = (g.entrants || []).slice(); for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; }
    g.rounds = G.makeBracket(list); G.advance(g); g.closed = false; save(); render(true); toast('Cuadro sorteado. ¡Suerte!');
  },
  gClose: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.id); g.closed = !g.closed; save(); render(true);
    toast(g.closed ? 'Juego terminado: sus puntos cuentan para el ranking' : 'Juego reabierto'); if (g.closed) checkAllGames();
  },
  gRow: function (el) {
    var r = G.ranking(S).find(function (x) { return x.id === el.dataset.e; }); if (!r) return;
    openSheet('<div class="row">' + eAv(r.id, 'lg') + '<div class="grow"><h2>' + eName(r.id) + '</h2><p class="small muted">' + r.pos + '.º · ' + r.pts + ' puntos</p></div></div><div class="stack" style="gap:0">' +
      (r.byGame.length ? r.byGame.map(function (b) { return '<div class="st-row">' + medal(b.pos) + '<span class="grow">' + esc(b.name) + '</span><b class="pts">+' + b.pts + '</b></div>'; }).join('') : '<p class="small muted">Aún no ha puntuado.</p>') +
      '</div><button class="btn primary block" data-act="close">Cerrar</button>');
  },
  aVote: function (el) {
    var a = G.AWARDS.find(function (x) { return x.id === el.dataset.id; }); var mine = S.awardVotes && S.awardVotes[a.id] && S.awardVotes[a.id][me().id];
    openSheet('<h2>' + esc(a.name) + '</h2><p class="small muted">' + esc(a.desc) + '</p><p class="small">Tu voto es secreto hasta la gala. No vale votarse a uno mismo.</p>' +
      pickList('aPick', a.id, mine ? [mine] : [], 'people') + (mine ? '<button class="btn ghost block" data-act="aUnvote" data-id="' + a.id + '">Quitar mi voto</button>' : '') + '<button class="btn block" data-act="close">Cerrar</button>');
  },
  aPick: function (el) {
    var aid = el.dataset.id, nom = el.dataset.e, myE = G.entrantOf(S, me().id);
    if (nom === me().id || nom === myE) { toast('Votarte a ti mismo no vale. Buen intento'); return; }
    egg('jurado');
    S.awardVotes = S.awardVotes || {}; S.awardVotes[aid] = S.awardVotes[aid] || {}; S.awardVotes[aid][me().id] = nom;
    save(); closeSheet(); render(true); toast('Voto guardado para ' + esc(eText(nom)));
  },
  aUnvote: function (el) { if (S.awardVotes && S.awardVotes[el.dataset.id]) delete S.awardVotes[el.dataset.id][me().id]; save(); closeSheet(); render(true); toast('Voto quitado'); },
  aEdit: function (el) { if (gGuard()) awardSheet(el.dataset.id); },
  aPickW: function (el) { var id = el.dataset.e, k = draft.winners.indexOf(id); if (k >= 0) draft.winners.splice(k, 1); else draft.winners.push(id); el.classList.toggle('on', k < 0); el.setAttribute('aria-pressed', k < 0); },
  aSave: function () {
    S.awardData = S.awardData || {}; var d = S.awardData[draft.id] = Object.assign({}, S.awardData[draft.id] || {});
    if (d.custom) { d.name = val('a-name').trim() || 'Premio especial'; d.desc = val('a-desc').trim(); }
    d.winners = draft.winners.slice(); d.why = val('a-why').trim() || null; if (!d.why) delete d.why;
    if (!d.custom && !d.winners.length) delete S.awardData[draft.id];
    save(); closeSheet(); render(true); toast('Premio guardado');
  },
  aAuto: function (el) { if (S.awardData) delete S.awardData[el.dataset.id]; save(); closeSheet(); render(true); toast('Vuelve al cálculo automático'); },
  aHide: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Seguro? Toca otra vez'; return; }
    S.awardData = S.awardData || {}; var d = S.awardData[el.dataset.id] || {};
    if (d.custom) delete S.awardData[el.dataset.id]; else S.awardData[el.dataset.id] = { hidden: true };
    save(); closeSheet(); render(true); toast('Premio quitado');
  },
  aNew: function () {
    if (!gGuard()) return; S.awardData = S.awardData || {}; var id = uid('aw'); S.awardData[id] = { custom: true, name: 'Premio especial', desc: '', winners: [], icon: 'star' };
    save(); render(true); awardSheet(id);
  },
  galaStart: function () { galaOpen(); },
  galaExit: function () { galaClose(); },
  galaPrev: function () { if (!gala || !gala.i) return; gala.i--; gala.revealed = gala.slides[gala.i].t === 'award'; galaRender(); },
  galaNext: function () {
    if (!gala) return; var s = gala.slides[gala.i];
    if (s.t === 'award' && !gala.revealed) {
      gala.revealed = 'wait'; drumroll(); var el = document.querySelector('.gala-drum'); if (el) el.classList.add('rolling');
      setTimeout(function () { if (!gala) return; gala.revealed = true; galaRender(); confetti(s.podium ? 3200 : 1600); if (s.podium && s.a.id === 'oro') fanfare(); }, 1300);
      return;
    }
    if (gala.revealed === 'wait') return;
    if (gala.i >= gala.slides.length - 1) { galaClose(); egg('gala'); return; }
    gala.i++; gala.revealed = false; galaRender();
    if (gala.i === gala.slides.length - 1) { confetti(3000); egg('gala'); }
  }
});
Object.assign(C, {
  gVal: function (el) {
    if (!gGuard()) return; var g = gById(el.dataset.g), before = champOf(g), v = el.value.replace(',', '.').trim(); g.results = g.results || {};
    if (v === '') delete g.results[el.dataset.e]; else { var n = parseFloat(v); if (isNaN(n)) { toast('Escribe un número'); return; } g.results[el.dataset.e] = n; }
    afterResult(g, before);
  },
  gTeamName: function (el) { if (!gGuard()) return; var g = gById(el.dataset.g), t = (g.teams || []).find(function (x) { return x.id === el.dataset.t; }); if (t) { t.name = el.value.trim() || t.name; save(); } }
});
document.addEventListener('keydown', function (e) { if (!gala) return; if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); A.galaNext(); } else if (e.key === 'ArrowLeft') A.galaPrev(); else if (e.key === 'Escape') galaClose(); });
