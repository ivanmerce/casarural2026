/* ===================== Juegos, competición y premios: lógica pura =====================
   Sin datos personales: nombres, dúos, edades y juegos llegan de S (semilla privada o Supabase).
   Participante ("entrant") = una persona o un dúo (p. ej. un adulto con un bebé que compiten juntos). */
var G = (function () {
  var DEFAULT_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
  var CATS = { deporte: 'Deporte', velocidad: 'Velocidad', ingenio: 'Ingenio', escondite: 'Escondite', mini: 'Minijuego', mesa: 'Mesa' };
  var FORMATS = { bracket: 'Eliminatoria', league: 'Liguilla', teams: 'Por equipos', ranking: 'Clasificación' };
  var MODES = { order: 'Orden de llegada', high: 'Más es mejor', low: 'Menos es mejor' };

  function r2(x) { return Math.round(x * 100) / 100; }
  function comp(S) { return S.comp || { duos: [] }; }
  function duos(S) { return comp(S).duos || []; }
  function person(S, id) { return S.people.find(function (p) { return p.id === id; }) || (S.spies || []).find(function (p) { return p.id === id; }); }
  function duoOf(S, pid) { return duos(S).find(function (d) { return d.members.indexOf(pid) >= 0; }); }

  /* ---------- Participantes ---------- */
  function entrantIds(S) {
    var out = [], seen = {};
    S.people.forEach(function (p) { var d = duoOf(S, p.id), id = d ? d.id : p.id; if (!seen[id]) { seen[id] = 1; out.push(id); } });
    return out;
  }
  function entrant(S, id) {
    var d = duos(S).find(function (x) { return x.id === id; });
    if (d) return { id: d.id, name: d.name, members: d.members.slice(), duo: true };
    var p = person(S, id);
    return p ? { id: p.id, name: p.name, members: [p.id], duo: false } : null;
  }
  function entrantOf(S, pid) { var d = duoOf(S, pid); return d ? d.id : pid; }
  function membersOf(S, id) { var e = entrant(S, id); return e ? e.members : []; }
  /* ¿Está ese día? (confirmado o, si no ha confirmado, su asistencia por defecto) */
  function presentOn(S, id, day) {
    return membersOf(S, id).some(function (pid) {
      var p = person(S, pid); if (!p) return false;
      var c = S.dayConfirm && S.dayConfirm[pid];
      if (day) { var st = c && c[day]; return st === 'si' || (!st && !!p.attends); }
      return !!p.attends || !!(c && Object.keys(c).some(function (k) { return c[k] === 'si'; }));
    });
  }
  function presentList(S, day) { return entrantIds(S).filter(function (id) { return presentOn(S, id, day); }); }
  /* edad "de competición": la del mayor del dúo */
  function ageOf(S, id) { var a = membersOf(S, id).map(function (pid) { var p = person(S, pid); return p && p.age != null ? p.age : (p && p.kind === 'adulto' ? 40 : 10); }); return a.length ? Math.max.apply(null, a) : 0; }

  /* ---------- Eliminatoria ---------- */
  function nextPow2(n) { var p = 1; while (p < n) p *= 2; return p; }
  function seedOrder(n) { var r = [0]; while (r.length < n) { var m = r.length * 2, nr = []; r.forEach(function (x) { nr.push(x, m - 1 - x); }); r = nr; } return r; }
  /* list ya ordenada por cabeza de serie; los primeros reciben los "pases" si faltan rivales */
  function makeBracket(list) {
    var n = Math.max(2, list.length), size = nextPow2(n), order = seedOrder(size), rounds = [], first = [];
    for (var i = 0; i < size; i += 2) first.push({ a: list[order[i]] || null, b: list[order[i + 1]] || null, sa: null, sb: null, w: null });
    rounds.push(first);
    for (var k = size / 4; k >= 1; k /= 2) rounds.push(Array.from({ length: k }, function () { return { a: null, b: null, sa: null, sb: null, w: null }; }));
    return rounds;
  }
  function roundName(total, r) {
    var left = total - r;
    return left === 1 ? 'Final' : left === 2 ? 'Semifinales' : left === 3 ? 'Cuartos' : left === 4 ? 'Octavos' : 'Ronda ' + (r + 1);
  }
  function winnerOf(m, r) {
    if (m.w === 'a' || m.w === 'b') return m[m.w];
    if (r === 0 && m.a && !m.b) return m.a;
    if (r === 0 && m.b && !m.a) return m.b;
    return null;
  }
  /* propaga ganadores; si cambia quién juega un partido, se borra su resultado. Devuelve el campeón */
  function advance(g) {
    var R = g.rounds || [];
    for (var r = 0; r < R.length - 1; r++) {
      R[r].forEach(function (m, i) {
        var nx = R[r + 1][Math.floor(i / 2)], side = i % 2 ? 'b' : 'a', w = winnerOf(m, r);
        if (nx[side] !== w) { nx[side] = w; nx.w = null; nx.sa = nx.sb = null; }
      });
    }
    var last = R[R.length - 1] && R[R.length - 1][0];
    return last ? winnerOf(last, R.length - 1) : null;
  }
  function isBye(m, r) { return r === 0 && (!m.a || !m.b); }

  /* ---------- Liguilla (todos contra todos) ---------- */
  function roundRobin(ids) {
    var out = [];
    for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++) out.push({ a: ids[i], b: ids[j], sa: null, sb: null, w: null });
    return out;
  }
  function table(ids, matches) {
    var t = {}; ids.forEach(function (id) { t[id] = { id: id, pj: 0, g: 0, e: 0, p: 0, pts: 0, gf: 0, gc: 0 }; });
    (matches || []).forEach(function (m) {
      if (!m.w || !t[m.a] || !t[m.b]) return;
      var A = t[m.a], B = t[m.b], sa = +m.sa || 0, sb = +m.sb || 0;
      A.pj++; B.pj++; A.gf += sa; A.gc += sb; B.gf += sb; B.gc += sa;
      if (m.w === 'draw') { A.e++; B.e++; A.pts += 1; B.pts += 1; }
      else { var W = m.w === 'a' ? A : B, Lo = m.w === 'a' ? B : A; W.g++; W.pts += 3; Lo.p++; }
    });
    var rows = ids.map(function (id) { return t[id]; });
    rows.sort(function (x, y) { return (y.pts - x.pts) || ((y.gf - y.gc) - (x.gf - x.gc)) || (y.gf - x.gf); });
    rows.forEach(function (row, i) {
      var prev = rows[i - 1];
      row.pos = prev && prev.pts === row.pts && (prev.gf - prev.gc) === (row.gf - row.gc) && prev.gf === row.gf ? prev.pos : i + 1;
    });
    return rows;
  }

  /* ---------- Equipos ---------- */
  function balancedTeams(S, ids, n, rnd) {
    n = Math.max(2, n || 2); rnd = rnd || Math.random;
    var list = ids.slice().map(function (id) { return { id: id, a: ageOf(S, id) + rnd() * 6 }; }).sort(function (x, y) { return y.a - x.a; });
    var teams = Array.from({ length: n }, function (_, i) { return { id: 't' + (i + 1), name: TEAM_NAMES[i % TEAM_NAMES.length], members: [] }; });
    list.forEach(function (x, i) { var round = Math.floor(i / n), k = i % n; teams[round % 2 ? n - 1 - k : k].members.push(x.id); });   /* serpiente */
    return teams;
  }
  var TEAM_NAMES = ['Equipo Carmesí', 'Equipo Oliva', 'Equipo Madera', 'Equipo Pizarra'];

  /* ---------- Clasificación de cada juego ---------- */
  function sortRank(ids, vals, low) {
    var withV = ids.filter(function (id) { return vals[id] != null && vals[id] !== ''; });
    withV.sort(function (a, b) { return low ? vals[a] - vals[b] : vals[b] - vals[a]; });
    var out = [];
    withV.forEach(function (id, i) { var prev = out[i - 1]; out.push({ id: id, pos: prev && vals[prev.id] === vals[id] ? prev.pos : i + 1, score: vals[id] }); });
    return out;
  }
  /* devuelve { rows: [{id, pos|null, score, note}], complete, champion } — rows cubre a todos los participantes */
  function standings(S, g) {
    var ids = (g.entrants || []).slice(), rows = [], complete = false, champion = null;
    if (g.format === 'bracket') {
      champion = advance(g); var R = g.rounds || [], total = R.length, pos = {};
      R.forEach(function (round, r) {
        round.forEach(function (m) {
          var w = winnerOf(m, r); if (!w || isBye(m, r)) return;
          var lo = w === m.a ? m.b : m.a; if (lo) pos[lo] = Math.pow(2, total - 1 - r) + 1;
        });
      });
      if (champion) pos[champion] = 1;
      complete = !!champion;
      rows = ids.map(function (id) { return { id: id, pos: pos[id] || null, note: pos[id] ? '' : 'Sigue vivo' }; });
    } else if (g.format === 'league') {
      var tb = table(ids, g.matches); complete = (g.matches || []).length > 0 && g.matches.every(function (m) { return !!m.w; });
      rows = tb.map(function (t) { return { id: t.id, pos: t.pj ? t.pos : null, score: t.pts, note: t.pj ? t.g + 'G ' + t.e + 'E ' + t.p + 'P · ' + t.gf + '-' + t.gc : 'Sin jugar' }; });
      if (complete) champion = rows[0] && rows[0].id;
    } else if (g.format === 'teams') {
      var teams = g.teams || [], tt;
      if (g.teamRank) {   /* equipos clasificados por orden (gimcana, relevos…) en vez de por partidos */
        var tor = (g.order || []).filter(function (id) { return teams.some(function (t) { return t.id === id; }); });
        tt = tor.map(function (id, i) { return { id: id, pos: i + 1, pj: 1, pts: null }; });
        complete = teams.length > 1 && tor.length === teams.length;
      } else {
        tt = table(teams.map(function (t) { return t.id; }), g.matches);
        complete = (g.matches || []).length > 0 && g.matches.every(function (m) { return !!m.w; });
      }
      var tpos = {}; tt.forEach(function (t) { tpos[t.id] = t; });
      var inTeam = {}; teams.forEach(function (t) { t.members.forEach(function (id) { inTeam[id] = t; }); });
      rows = ids.map(function (id) { var t = inTeam[id], s = t && tpos[t.id]; return { id: id, pos: s && s.pj ? s.pos : null, team: t ? t.id : null, score: s ? s.pts : null, note: t ? t.name : 'Sin equipo' }; });
      if (complete && tt[0]) champion = tt[0].id;
    } else {
      var mode = g.mode || 'order';
      if (mode === 'order') {
        var ord = (g.order || []).filter(function (id) { return ids.indexOf(id) >= 0; });
        rows = ord.map(function (id, i) { return { id: id, pos: i + 1 }; });
      } else rows = sortRank(ids, g.results || {}, mode === 'low');
      var got = {}; rows.forEach(function (r) { got[r.id] = 1; });
      complete = ids.length > 0 && ids.every(function (id) { return got[id]; });
      ids.forEach(function (id) { if (!got[id]) rows.push({ id: id, pos: null, note: 'Sin resultado' }); });
      if (rows[0] && rows[0].pos === 1) champion = rows[0].id;
    }
    rows.sort(function (a, b) { return (a.pos || 999) - (b.pos || 999); });
    return { rows: rows, complete: complete, champion: champion };
  }
  /* Un juego cerrado sin ningún resultado no cuenta como jugado ni da puntos (nadie empieza con ventaja) */
  function hasResults(st) { return st.rows.some(function (r) { return r.pos; }); }
  function isDone(S, g) { var st = standings(S, g); return st.complete || (!!g.closed && hasResults(st)); }
  function pointsFor(g, pos) {
    var tbl = g.points && g.points.length ? g.points : DEFAULT_POINTS;
    if (!pos) return g.part != null ? g.part : 1;
    return tbl[pos - 1] != null ? tbl[pos - 1] : (g.part != null ? g.part : 1);
  }
  /* puntos que da un juego terminado a cada participante */
  function gamePoints(S, g) {
    var st = standings(S, g), out = {};
    if (!hasResults(st)) return out;
    st.rows.forEach(function (r) { out[r.id] = { pts: pointsFor(g, r.pos), pos: r.pos }; });
    return out;
  }
  function when(g) { return (g.day || '9999') + ' ' + (g.time || '99:99'); }
  function doneGames(S) { return (S.games || []).filter(function (g) { return isDone(S, g); }).sort(function (a, b) { return when(a).localeCompare(when(b)) || (a.sort || 0) - (b.sort || 0); }); }

  /* ---------- Ranking global ---------- */
  function rankFrom(S, games) {
    var acc = {};
    entrantIds(S).forEach(function (id) { acc[id] = { id: id, pts: 0, gold: 0, silver: 0, bronze: 0, played: 0, byGame: [] }; });
    games.forEach(function (g) {
      var gp = gamePoints(S, g);
      Object.keys(gp).forEach(function (id) {
        var a = acc[id]; if (!a) return;
        a.pts += gp[id].pts; a.played++;
        if (gp[id].pos === 1) a.gold++; else if (gp[id].pos === 2) a.silver++; else if (gp[id].pos === 3) a.bronze++;
        a.byGame.push({ game: g.id, name: g.name, pos: gp[id].pos, pts: gp[id].pts });
      });
    });
    var rows = Object.keys(acc).map(function (k) { return acc[k]; });
    function cmp(x, y) { return (y.pts - x.pts) || (y.gold - x.gold) || (y.silver - x.silver) || (y.bronze - x.bronze); }
    rows.sort(function (x, y) { return cmp(x, y) || (y.played - x.played); });
    rows.forEach(function (r, i) { var p = rows[i - 1]; r.pos = p && cmp(p, r) === 0 ? p.pos : i + 1; r.pts = r2(r.pts); });
    return rows;
  }
  function ranking(S) { return rankFrom(S, doneGames(S)); }
  /* la mayor remontada: peor puesto tras algún juego (desde el 2.º) frente al puesto final */
  function comeback(S) {
    var gs = doneGames(S); if (gs.length < 3) return null;
    var worst = {}, fin = rankFrom(S, gs);
    for (var k = 1; k < gs.length; k++) rankFrom(S, gs.slice(0, k)).forEach(function (r) { if (r.played) worst[r.id] = Math.max(worst[r.id] || 0, r.pos); });
    var best = null;
    fin.forEach(function (r) { if (!worst[r.id]) return; var up = worst[r.id] - r.pos; if (up >= 2 && (!best || up > best.up)) best = { id: r.id, up: up, from: worst[r.id], to: r.pos }; });
    return best;
  }

  /* ---------- Premios ---------- */
  function topBy(list, key, min) {
    var best = -Infinity; list.forEach(function (x) { if (x[key] > best) best = x[key]; });
    if (best === -Infinity || best < (min == null ? 1 : min)) return [];
    return list.filter(function (x) { return x[key] === best; });
  }
  function catPoints(S, cat) {
    var gs = doneGames(S).filter(function (g) { return g.cat === cat; });
    if (!gs.length) return null;
    return { games: gs, rows: rankFrom(S, gs).filter(function (r) { return r.played; }) };
  }
  function fam(S, id) { return S.families.find(function (f) { return f.id === id; }); }
  function famIds(S) { return S.families.map(function (f) { return f.id; }); }
  function F(id) { return 'fam:' + id; }
  function money(v) { return typeof L !== 'undefined' ? L.money(v) : v + ' €'; }
  function nameOfE(S, id) { var e = entrant(S, id); return e ? e.name : id; }

  /* Cada premio: grupo, nombre, criterio y cálculo automático → { winners, why } (winners: ids de participante, persona o 'fam:ID') */
  var AWARDS = [
    /* --- Podio --- */
    { id: 'oro', group: 'podio', icon: 'trophy', name: 'Campeón Absoluto', desc: 'Primero del ranking global: suma de puntos de todos los juegos.',
      auto: function (S, c) { var w = c.rank.filter(function (r) { return r.pos === 1 && r.pts > 0; }); return w.length ? { winners: ids(w), why: w[0].pts + ' puntos' } : null; } },
    { id: 'plata', group: 'podio', icon: 'trophy', name: 'Medalla de Plata', desc: 'Segundo del ranking global.',
      auto: function (S, c) { var w = c.rank.filter(function (r) { return r.pos === 2 && r.pts > 0; }); return w.length ? { winners: ids(w), why: w[0].pts + ' puntos' } : null; } },
    { id: 'bronce', group: 'podio', icon: 'trophy', name: 'Medalla de Bronce', desc: 'Tercero del ranking global.',
      auto: function (S, c) { var w = c.rank.filter(function (r) { return r.pos === 3 && r.pts > 0; }); return w.length ? { winners: ids(w), why: w[0].pts + ' puntos' } : null; } },
    /* --- Juegos --- */
    { id: 'rayo', group: 'juegos', icon: 'bolt', name: 'El Rayo de la Casa', desc: 'El más veloz: más puntos en las pruebas de velocidad.',
      auto: function (S) { var cp = catPoints(S, 'velocidad'); if (!cp) return null; var w = topBy(cp.rows, 'pts'); return w.length ? { winners: ids(w), why: w[0].pts + ' puntos en ' + list(cp.games) } : null; } },
    { id: 'cerebro', group: 'juegos', icon: 'bulb', name: 'El Cerebrito', desc: 'El más inteligente: gana las pruebas de ingenio.',
      auto: function (S) { var cp = catPoints(S, 'ingenio'); if (!cp) return null; var w = topBy(cp.rows, 'pts'); return w.length ? { winners: ids(w), why: 'Mejor en ' + list(cp.games) } : null; } },
    { id: 'fantasma', group: 'juegos', icon: 'ghost', name: 'El Fantasma de la Finca', desc: 'El mejor escondido: gana el escondite.',
      auto: function (S) { var cp = catPoints(S, 'escondite'); if (!cp) return null; var w = topBy(cp.rows, 'pts'); return w.length ? { winners: ids(w), why: 'Nadie le encontraba' } : null; } },
    { id: 'raqueta', group: 'juegos', icon: 'paddle', name: 'Raqueta de Oro', desc: 'Campeón de la eliminatoria de ping-pong.',
      auto: function (S) { var g = (S.games || []).find(function (x) { return x.format === 'bracket' && /ping/i.test(x.name) && isDone(S, x); }); var ch = g && standings(S, g).champion; return ch ? { winners: [ch], why: g.name } : null; } },
    { id: 'fenix', group: 'juegos', icon: 'flame', name: 'Ave Fénix', desc: 'La gran remontada: quien más puestos sube en el ranking desde su peor momento.',
      auto: function (S) { var cb = comeback(S); return cb ? { winners: [cb.id], why: 'Del ' + cb.from + '.º al ' + cb.to + '.º' } : null; } },
    { id: 'invencibles', group: 'juegos', icon: 'shield', name: 'Los Invencibles', desc: 'El equipo con más victorias en los juegos por equipos (hockey, fútbol…).',
      auto: function (S) {
        var tally = {}; doneGames(S).filter(function (g) { return g.format === 'teams'; }).forEach(function (g) {
          (g.matches || []).forEach(function (m) { if (m.w === 'a' || m.w === 'b') { var t = (g.teams || []).find(function (x) { return x.id === m[m.w]; }); if (t) { var k = g.id + ':' + t.id; tally[k] = tally[k] || { n: 0, t: t, g: g }; tally[k].n++; } } });
        });
        var arr = Object.keys(tally).map(function (k) { return tally[k]; }); var w = topBy(arr, 'n'); if (!w.length) return null;
        var win = []; w.forEach(function (x) { x.t.members.forEach(function (id) { if (win.indexOf(id) < 0) win.push(id); }); });
        return { winners: win, why: w.map(function (x) { return x.t.name + ' (' + x.g.name + ')'; }).join(' · ') };
      } },
    { id: 'poulidor', group: 'juegos', icon: 'medal', name: 'El Eterno Poulidor', desc: 'Siempre a un pelo: quien más segundos puestos acumula (mínimo 2).',
      auto: function (S, c) { var w = topBy(c.rank, 'silver', 2); return w.length ? { winners: ids(w), why: w[0].silver + ' platas' } : null; } },
    { id: 'todoterreno', group: 'juegos', icon: 'run', name: 'Todoterreno', desc: 'Quien ha jugado más juegos.',
      auto: function (S, c) { var w = topBy(c.rank, 'played', 2); return w.length ? { winners: ids(w), why: w[0].played + ' juegos' } : null; } },
    { id: 'coubertin', group: 'juegos', icon: 'heart', name: 'Barón de Coubertin', desc: 'Lo importante es participar: más juegos jugados sin pisar el podio (mínimo 2).',
      auto: function (S, c) { var cand = c.rank.filter(function (r) { return r.played >= 2 && !r.gold && !r.silver && !r.bronze; }); var w = topBy(cand, 'played', 2); return w.length ? { winners: ids(w), why: w[0].played + ' juegos dándolo todo' } : null; } },
    { id: 'revelacion', group: 'juegos', icon: 'star', name: 'Revelación del Finde', desc: 'El mejor clasificado de los peques y los adolescentes.',
      auto: function (S, c) { var cand = c.rank.filter(function (r) { return r.pts > 0 && membersOf(S, r.id).every(function (pid) { var p = person(S, pid); return p && p.kind !== 'adulto'; }); }); if (!cand.length) return null; var best = cand[0].pos; var w = cand.filter(function (r) { return r.pos === best; }); return { winners: ids(w), why: best + '.º del ranking global' }; } },
    { id: 'hierro', group: 'juegos', icon: 'shield', name: 'Abuelos de Hierro', desc: 'El mejor clasificado de los abuelos.',
      auto: function (S, c) { var gr = (S.trip && S.trip.eggs && S.trip.eggs.grand) || []; var cand = c.rank.filter(function (r) { return r.played && membersOf(S, r.id).some(function (pid) { return gr.indexOf(pid) >= 0; }); }); if (!cand.length) return null; var best = cand[0].pos; var w = cand.filter(function (r) { return r.pos === best; }); return { winners: ids(w), why: best + '.º del ranking global' }; } },
    { id: 'duo', group: 'juegos', icon: 'users', name: 'Dúo Dinámico', desc: 'La mejor pareja que compite junta.',
      auto: function (S, c) { var cand = c.rank.filter(function (r) { return r.played && entrant(S, r.id) && entrant(S, r.id).duo; }); if (!cand.length) return null; return { winners: [cand[0].id], why: cand[0].pts + ' puntos entre los dos' }; } },
    /* --- La casa: todo lo que pasa en la plataforma --- */
    /* --- Premio especial: el espía (que no opta a ningún otro) --- */
    { id: 'espia', group: 'casa', icon: 'search', name: 'Agente Secreto del Año', desc: 'Premio especial para el espía que se coló en la plataforma, lo trasteó todo y nos chivó lo que había que mejorar. Fuera de concurso en todo lo demás.',
      auto: function (S) { var sp = S.spies || []; return sp.length ? { winners: sp.map(function (p) { return p.id; }), why: 'Por colarse sin que nadie supiera quién era' } : null; } },
    { id: 'derroche', group: 'casa', icon: 'coins', name: 'Los Más Derrochadores', desc: 'Quienes pagan la casa rural (y la tasa turística).',
      auto: function (S) { var p = S.house && S.house.payer; if (!p) return null; var t = typeof L !== 'undefined' ? L.tax(S).withExemption : 0; return { winners: [F(p)], why: 'La casa (' + money(S.house.total) + ')' + (S.tax && S.tax.payer === p && t ? ' y la tasa (' + money(t) + ')' : '') }; } },
    { id: 'carrito', group: 'casa', icon: 'cart', name: 'Reyes del Carrito', desc: 'La familia que más productos se ha pedido de la lista de la compra.',
      auto: function (S) { var arr = famIds(S).map(function (f) { return { f: f, n: S.ingredients.filter(function (i) { return i.family === f; }).length }; }); var w = topBy(arr, 'n'); return w.length ? { winners: w.map(function (x) { return F(x.f); }), why: w[0].n + ' productos a su cargo' } : null; } },
    { id: 'tarjeta', group: 'casa', icon: 'card', name: 'Tarjeta Echando Humo', desc: 'La familia que más dinero ha adelantado para el bote común.',
      auto: function (S) { if (typeof L === 'undefined') return null; var lg = L.ledger(S, false); var arr = lg.rows.map(function (r) { return { f: r.id, n: r.paid }; }); var w = topBy(arr, 'n', 0.01); return w.length ? { winners: w.map(function (x) { return F(x.f); }), why: money(w[0].n) + ' adelantados' } : null; } },
    { id: 'despensa', group: 'casa', icon: 'basket', name: 'Despensa Infinita', desc: 'La familia que más cosas trae de casa.',
      auto: function (S) { var arr = famIds(S).map(function (f) { return { f: f, n: S.ingredients.filter(function (i) { return i.family === f && i.status === 'casa'; }).length }; }); var w = topBy(arr, 'n'); return w.length ? { winners: w.map(function (x) { return F(x.f); }), why: w[0].n + (w[0].n === 1 ? ' cosa' : ' cosas') + ' de casa' } : null; } },
    { id: 'chef', group: 'casa', icon: 'meals', name: 'Estrella Michelín de la Casa', desc: 'Los chefs del finde: la familia que cocina más comidas.',
      auto: function (S) { var arr = famIds(S).map(function (f) { return { f: f, n: S.meals.filter(function (m) { return m.cook === f; }).length }; }); var w = topBy(arr, 'n'); return w.length ? { winners: w.map(function (x) { return F(x.f); }), why: w[0].n + ' comidas a los fogones' } : null; } },
    { id: 'banco', group: 'casa', icon: 'coins', name: 'El Banco de la Casa', desc: 'La familia que más recibe en la liquidación final: fue la que más adelantó.',
      auto: function (S) { if (typeof L === 'undefined') return null; var tx = L.ledger(S, false).tx, acc = {}; tx.forEach(function (t) { acc[t.to] = (acc[t.to] || 0) + t.amount; }); var arr = Object.keys(acc).map(function (f) { return { f: f, n: r2(acc[f]) }; }); var w = topBy(arr, 'n', 0.01); return w.length ? { winners: w.map(function (x) { return F(x.f); }), why: 'Recibe ' + money(w[0].n) } : null; } },
    { id: 'mecenas', group: 'casa', icon: 'gift', name: 'Mecenas del Finde', desc: 'La mayor aportación de regalo al bote.',
      auto: function (S) { if (typeof L === 'undefined') return null; var g = L.gifts(S), arr = Object.keys(g).map(function (f) { return { f: f, n: g[f] }; }); var w = topBy(arr, 'n', 0.01); return w.length ? { winners: w.map(function (x) { return F(x.f); }), why: money(w[0].n) + ' de regalo' } : null; } },
    { id: 'maestro', group: 'publico', icon: 'plans', vote: true, name: 'Maestro de Ceremonias', desc: 'Quien más ha liado a todos para hacer planes (sin que nadie se lo pidiera).' },
    { id: 'fiestero', group: 'casa', icon: 'heart', name: 'Alma de la Fiesta', desc: 'Quien se apunta a más planes (corazones en el planning).',
      auto: function (S) { var arr = S.people.map(function (p) { return { id: p.id, n: Object.keys(S.votes || {}).filter(function (a) { return (S.votes[a] || []).indexOf(p.id) >= 0; }).length }; }); var w = topBy(arr, 'n', 2); return w.length ? { winners: ids(w), why: 'Se apunta a ' + w[0].n + ' planes' } : null; } },
    { id: 'omnipresente', group: 'casa', icon: 'check', name: 'Omnipresente', desc: 'Confirmó que viene todos los días.',
      auto: function (S) { var ds = (S.days || []).map(function (d) { return d.k; }); var w = S.people.filter(function (p) { var c = S.dayConfirm && S.dayConfirm[p.id]; return c && ds.length && ds.every(function (d) { return c[d] === 'si'; }); }); return w.length ? { winners: ids(w), why: 'Los ' + ds.length + ' días, sin faltar uno' } : null; } },
    { id: 'enganchado', group: 'casa', icon: 'phone', name: 'Enganchado a la App', desc: 'El más activo en la plataforma: más rato con la app abierta.',
      auto: function (S) { var st = S.stats || {}; var arr = S.people.map(function (p) { var x = st[p.id] || {}; return { id: p.id, n: (x.minutes || 0) + 3 * (x.visits || 0) }; }); var w = topBy(arr, 'n', 5); return w.length ? { winners: ids(w), why: ((st[w[0].id] || {}).minutes || 0) + ' min en la app' } : null; } },
    { id: 'cazador', group: 'casa', icon: 'search', name: 'Cazasecretos', desc: 'Quien ha descubierto más secretos escondidos en la app.',
      auto: function (S) { var st = S.stats || {}; var arr = S.people.map(function (p) { return { id: p.id, n: (st[p.id] || {}).eggs || 0 }; }); var w = topBy(arr, 'n', 2); return w.length ? { winners: ids(w), why: w[0].n + ' secretos' } : null; } },
    { id: 'guardian', group: 'casa', icon: 'shield', name: 'Guardián de los Secretos', desc: 'Desbloqueó todos los secretos de la casa… y (en teoría) no se lo contó a nadie.',
      auto: function (S) { var tot = typeof EGGS !== 'undefined' && EGGS.length ? EGGS.length : 20, st = S.stats || {}; var w = S.people.filter(function (p) { return ((st[p.id] || {}).eggs || 0) >= tot; }); return w.length ? { winners: ids(w), why: 'Los ' + tot + ' secretos, sin chivarse' } : null; } },
    { id: 'paparazzi', group: 'casa', icon: 'camera', name: 'Paparazzi del Finde', desc: 'Quien más fotos ha subido al álbum.',
      auto: function (S) { var n = {}; (S.photos || []).forEach(function (p) { n[p.by] = (n[p.by] || 0) + 1; }); var arr = Object.keys(n).map(function (id) { return { id: id, n: n[id] }; }); var w = topBy(arr, 'n', 3); return w.length ? { winners: ids(w), why: w[0].n + ' fotos' } : null; } },
    { id: 'fotaza', group: 'casa', icon: 'star', name: 'La Foto del Finde', desc: 'Autor de la foto con más corazones del álbum.',
      auto: function (S) { var L2 = S.photoLikes || {}, best = null; (S.photos || []).forEach(function (p) { var n = (L2[p.id] || []).length; if (n >= 2 && (!best || n > best.n)) best = { by: p.by, n: n }; }); return best ? { winners: [best.by], why: best.n + ' corazones' } : null; } },
    { id: 'cumple', group: 'casa', icon: 'cake', name: 'Cumpleañero Supremo', desc: 'El protagonista del finde: el que cumple años.',
      auto: function (S) { var e = S.trip && S.trip.eggs; return e && e.bday ? { winners: [e.bday], why: e.bdayAge ? 'Cumple ' + e.bdayAge + ' años' : 'Es su cumple' } : null; } },
    { id: 'mascota', group: 'casa', icon: 'baby', name: 'Mascota Oficial', desc: 'El miembro más joven de la familia.',
      auto: function (S) { var e = S.trip && S.trip.eggs; if (!e || !e.baby) return null; var p = person(S, e.baby); return { winners: [e.baby], why: p && p.age != null ? p.age + ' años y ya compite' : 'El más peque' }; } },
    /* --- Premios del público (votación) --- */
    { id: 'fairplay', group: 'publico', icon: 'shield', vote: true, name: 'Espíritu Deportivo', desc: 'Juega limpio, anima al rival y sabe perder (y ganar).' },
    { id: 'creativo', group: 'publico', icon: 'bulb', vote: true, name: 'El Más Creativo', desc: 'Las mejores ideas, disfraces, trampas legales y ocurrencias.' },
    { id: 'animador', group: 'publico', icon: 'megaphone', vote: true, name: 'Animador de la Grada', desc: 'Quien más grita, anima y celebra desde la banda.' },
    { id: 'risas', group: 'publico', icon: 'smile', vote: true, name: 'Rey de las Risas', desc: 'Quien más nos ha hecho reír este finde.' },
    { id: 'pinche', group: 'publico', icon: 'meals', vote: true, name: 'Pinche de Oro', desc: 'Quien más ha ayudado en la cocina y a recoger.' }
  ];
  var GROUPS = { podio: 'El podio', juegos: 'Premios de los juegos', casa: 'Premios de la casa', publico: 'Premios del público', extra: 'Premios especiales' };
  function ids(list) { return list.map(function (x) { return x.id; }); }
  function list(games) { return games.map(function (g) { return g.name; }).join(', '); }

  function voteResult(S, awardId) {
    var v = (S.awardVotes && S.awardVotes[awardId]) || {}, n = {};
    Object.keys(v).forEach(function (voter) { var x = v[voter]; if (x) n[x] = (n[x] || 0) + 1; });
    var arr = Object.keys(n).map(function (id) { return { id: id, n: n[id] }; });
    var w = topBy(arr, 'n', 1);
    return { total: Object.keys(v).length, counts: n, winners: ids(w), top: w.length ? w[0].n : 0 };
  }
  /* todos los premios resueltos: automáticos, por votación, manuales (sobrescriben) y personalizados */
  function awards(S) {
    var c = { rank: ranking(S) }, data = S.awardData || {}, out = [];
    AWARDS.forEach(function (a) {
      var d = data[a.id] || {}, res = null, source = 'auto';
      if (d.hidden) return;
      if (a.vote) { var vr = voteResult(S, a.id); res = vr.winners.length ? { winners: vr.winners, why: vr.top + (vr.top === 1 ? ' voto' : ' votos') + ' de ' + vr.total } : null; source = 'voto'; }
      else { try { res = a.auto(S, c); } catch (e) { res = null; } }
      if (d.winners && d.winners.length) { res = { winners: d.winners.slice(), why: d.why || 'Decisión del jurado' }; source = 'manual'; }
      out.push({ id: a.id, group: a.group, icon: a.icon, name: a.name, desc: a.desc, vote: !!a.vote, winners: res ? res.winners : [], why: res ? res.why : '', source: source });
    });
    Object.keys(data).forEach(function (k) {
      var d = data[k]; if (!d || !d.custom || d.hidden) return;
      out.push({ id: k, group: 'extra', icon: d.icon || 'star', name: d.name || 'Premio especial', desc: d.desc || '', vote: false, winners: (d.winners || []).slice(), why: d.why || '', source: 'manual', custom: true });
    });
    return out;
  }
  /* personas premiadas (expande familias y dúos) */
  function peopleOf(S, wid) {
    if (String(wid).indexOf('fam:') === 0) { var f = wid.slice(4); return S.people.filter(function (p) { return p.family === f; }).map(function (p) { return p.id; }); }
    return membersOf(S, wid);
  }
  function tally(S) {
    var t = {}; S.people.concat(S.spies || []).forEach(function (p) { t[p.id] = []; });
    awards(S).forEach(function (a) { var seen = {}; a.winners.forEach(function (w) { peopleOf(S, w).forEach(function (pid) { if (t[pid] && !seen[pid]) { seen[pid] = 1; t[pid].push(a.id); } }); }); });
    return t;
  }

  /* ---------- Plantillas para crear juegos sobre la marcha ---------- */
  var TEMPLATES = [
    { key: 'pingpong', name: 'Torneo de ping-pong', cat: 'deporte', format: 'bracket', icon: 'paddle', rules: 'Partidos a 11 puntos, cambio de saque cada 2. La final, al mejor de 3.' },
    { key: 'liguilla', name: 'Liguilla de ping-pong', cat: 'deporte', format: 'league', icon: 'paddle', rules: 'Todos contra todos a 11 puntos. Victoria 3, empate 1.', allowDraw: false },
    { key: 'hockey', name: 'Partido de hockey', cat: 'deporte', format: 'teams', icon: 'stick', rules: 'Dos tiempos de 10 minutos. Stick por debajo de la cintura.', points: [8, 4], allowDraw: true },
    { key: 'futbol', name: 'Partido de fútbol', cat: 'deporte', format: 'teams', icon: 'ball', rules: 'Dos tiempos de 10 minutos. Los peques pueden tirar desde donde quieran.', points: [8, 4], allowDraw: true },
    { key: 'escondite', name: 'Escondite', cat: 'escondite', format: 'ranking', mode: 'order', icon: 'ghost', rules: 'Apunta el orden en que os van encontrando: el primero de la lista es el último en ser encontrado (el mejor escondido).' },
    { key: 'sprint', name: 'Sprint de 30 metros', cat: 'velocidad', format: 'ranking', mode: 'low', unit: 's', icon: 'bolt', rules: 'Tiempo en segundos. Los peques salen con ventaja.' },
    { key: 'quiz', name: 'Quiz', cat: 'ingenio', format: 'ranking', mode: 'high', unit: 'aciertos', icon: 'bulb', rules: 'Una pregunta cada vez. Gana quien más acierta.' },
    { key: 'zapatilla', name: 'Lanzamiento de zapatilla', cat: 'mini', format: 'ranking', mode: 'high', unit: 'm', icon: 'shoe', rules: 'Tres intentos, cuenta el mejor. Metros medidos a pasos.' },
    { key: 'ppt', name: 'Piedra, papel o tijera', cat: 'ingenio', format: 'bracket', icon: 'hand', rules: 'Al mejor de 3. Sin trampas de última hora.' },
    { key: 'pañuelo', name: 'El pañuelo', cat: 'velocidad', format: 'teams', icon: 'flag', rules: 'Dos equipos numerados. El que se lleva el pañuelo suma un punto.', points: [8, 4], allowDraw: true },
    { key: 'sillas', name: 'Sillas musicales', cat: 'mini', format: 'ranking', mode: 'order', icon: 'music', rules: 'Apunta en orden inverso: el primero es el que se queda con la última silla.' },
    { key: 'nerf', name: 'Nerf: atrapa la bandera', cat: 'deporte', format: 'teams', icon: 'flag', rules: 'Dos equipos con su bandera. Si te dan, a tu base a recargar. Gana quien lleve la bandera rival a su campo.', points: [10, 5], allowDraw: false },
    { key: 'gimcana', name: 'Gimcana', cat: 'velocidad', format: 'teams', teamRank: true, icon: 'search', rules: 'Pistas, pruebas y adivinanzas. Apunta el orden de llegada de los equipos.', points: [10, 7] },
    { key: 'peso', name: 'Adivina el peso', cat: 'mini', format: 'ranking', mode: 'low', unit: 'g de error', icon: 'flame', rules: 'Cada uno dice un peso; se mira la etiqueta. Apunta los gramos de error: gana quien menos se equivoca.' },
    { key: 'canasta', name: 'Canasta de papel', cat: 'mini', format: 'ranking', mode: 'high', unit: 'canastas', icon: 'ball', rules: 'Bolas de papel a una papelera, 5 tiros cada uno.' },
    { key: 'silencio', name: 'El juego del silencio', cat: 'mini', format: 'ranking', mode: 'order', icon: 'moon', rules: 'Quien hable o se ría queda eliminado. El primero de la lista es quien más aguanta.' },
    { key: 'libre', name: 'Juego nuevo', cat: 'mini', format: 'ranking', mode: 'order', icon: 'star', rules: '' }
  ];

  return {
    CATS: CATS, FORMATS: FORMATS, MODES: MODES, DEFAULT_POINTS: DEFAULT_POINTS, TEMPLATES: TEMPLATES, AWARDS: AWARDS, GROUPS: GROUPS,
    entrantIds: entrantIds, entrant: entrant, entrantOf: entrantOf, membersOf: membersOf, presentOn: presentOn, presentList: presentList, ageOf: ageOf,
    makeBracket: makeBracket, seedOrder: seedOrder, advance: advance, roundName: roundName, winnerOf: winnerOf, isBye: isBye,
    roundRobin: roundRobin, table: table, balancedTeams: balancedTeams, standings: standings, isDone: isDone, pointsFor: pointsFor, gamePoints: gamePoints,
    doneGames: doneGames, ranking: ranking, rankFrom: rankFrom, comeback: comeback, awards: awards, voteResult: voteResult, peopleOf: peopleOf, tally: tally
  };
})();
if (typeof module !== 'undefined') module.exports = G;
