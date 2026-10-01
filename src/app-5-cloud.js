/* ===================== Modo nube (Supabase) =====================
   Solo va en la web pública. El código no lleva datos personales: todo llega de la base de datos tras entrar.
   Estrategia: la app trabaja sobre el mismo objeto S que la demo. Cada save() programa una sincronización que
   compara S con la última foto del servidor y sube solo lo que ha cambiado (upsert / delete). Los cambios de los
   demás llegan por Realtime y recargan S. Los permisos los decide la base de datos (RLS); si rechaza algo, se recarga. */
var CLOUD = (function () {
  var cfg = window.CONCLAVE_CONFIG || {};
  if (!cfg.supabaseUrl || !cfg.supabaseKey) return { boot: bootPending, queue: function () {}, siteUrl: location.href.split('#')[0].split('?')[0] };
  var sb = null, last = null, timer = null, busy = false, dirty = false, reloadT = null;
  var api = { siteUrl: cfg.siteUrl || location.href.split('#')[0].split('?')[0] };
  var SLOTS = [{ k: 'des', name: 'Desayuno' }, { k: 'com', name: 'Comida' }, { k: 'mer', name: 'Merienda' }, { k: 'cen', name: 'Cena' }];
  var TABLES = ['families', 'people', 'homes', 'meals', 'meal_attendance', 'day_confirmations', 'ingredients', 'ingredient_meals', 'expenses', 'activities', 'activity_votes', 'matches', 'house_payments', 'settings', 'app_config', 'games', 'awards', 'award_votes', 'photos', 'photo_likes', 'guest_registrations', 'room_assignments', 'ideas', 'idea_likes'];
  /* tablas que la app escribe, en orden de dependencias, con su clave primaria */
  var SYNC = [
    ['settings', ['id']], ['app_config', ['key']], ['people', ['id']], ['meals', ['id']], ['ingredients', ['id']], ['activities', ['id']],
    ['expenses', ['id']], ['house_payments', ['id']], ['matches', ['tournament_id', 'round', 'slot']],
    ['ingredient_meals', ['ingredient_id', 'meal_id']], ['meal_attendance', ['meal_id', 'person_id']], ['day_confirmations', ['person_id', 'day']], ['activity_votes', ['activity_id', 'person_id']],
    ['games', ['id']], ['awards', ['id']], ['award_votes', ['award_id', 'voter_id']], ['guest_registrations', ['person_id']], ['room_assignments', ['person_id']], ['ideas', ['id']], ['idea_likes', ['idea_id', 'person_id']]
  ];
  /* lo que un lector puede escribir (RLS): el resto ni se intenta subir */
  var READER_OK = { day_confirmations: 1, meal_attendance: 1, activity_votes: 1, award_votes: 1, guest_registrations: 1, room_assignments: 1, ideas: 1, idea_likes: 1 };
  function client() {
    return sb || (sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }));
  }
  function num(v) { return v == null ? null : Number(v); }
  function hm(t) { return t ? String(t).slice(0, 5) : null; }

  /* ---------- Base de datos → S ---------- */
  function fromDb(d) {
    var spyRows = d.people.filter(function (r) { return r.family_id === SPY_FAM; });
    SPIES = spyRows.map(function (r) { return { id: r.id, name: r.name, family: r.family_id, kind: r.kind, role: r.role, attends: false, note: r.note, avatar: r.avatar, spy: true }; });
    var spiesForS = SPIES;
    d = Object.assign({}, d, { people: d.people.filter(function (r) { return r.family_id !== SPY_FAM; }), families: d.families.filter(function (f) { return f.id !== SPY_FAM; }) });
    var kv = {}; d.app_config.forEach(function (r) { kv[r.key] = r.value; });
    var st = d.settings[0] || {};
    var im = {}; d.ingredient_meals.forEach(function (r) { (im[r.ingredient_id] = im[r.ingredient_id] || []).push(r.meal_id); });
    var att = {}; d.meal_attendance.forEach(function (r) { (att[r.meal_id] = att[r.meal_id] || {})[r.person_id] = r.attends; });
    var dc = {}; d.day_confirmations.forEach(function (r) { (dc[r.person_id] = dc[r.person_id] || {})[r.day] = r.status; });
    var votes = {}; d.activity_votes.forEach(function (r) { (votes[r.activity_id] = votes[r.activity_id] || []).push(r.person_id); });
    var rounds = [];
    d.matches.forEach(function (r) { rounds[r.round] = rounds[r.round] || []; rounds[r.round][r.slot] = { a: r.player_a, b: r.player_b, sa: r.score_a, sb: r.score_b, w: r.winner }; });
    var old = S || {};
    return {
      version: 'cloud', trip: kv.trip || {}, days: kv.days || [], slots: SLOTS,
      families: d.families.slice().sort(function (a, b) { return a.sort - b.sort; }).map(function (r) { return { id: r.id, name: r.name, short: r.short, color: r.color, note: r.note }; }),
      people: d.people.slice().sort(function (a, b) { return a.sort - b.sort; }).map(function (r) { return { id: r.id, name: r.name, family: r.family_id, age: r.age, approx: r.age_approx, kind: r.kind, role: r.role, email: r.email, login: r.login || null, attends: r.attends_default, pend: r.pending, note: r.note, sort: r.sort, avatar: r.avatar }; }),
      pendingPeople: [], spies: spiesForS,
      homes: d.homes.map(function (r) { return { id: r.id, name: r.name, beds: r.beds, free: r.free, rooms: r.rooms, note: r.note, proposal: r.proposal || [] }; }),
      meals: d.meals.map(function (r) { return { id: r.id, day: r.day, slot: r.slot, time: hm(r.time_override), mode: r.mode, title: r.title, dishes: r.dishes || [], cook: r.cook_family_id, marc: r.marc_menu, notes: r.notes, star: r.star }; }),
      ingredients: d.ingredients.slice().sort(function (a, b) { return a.sort - b.sort; }).map(function (r) { return { id: r.id, name: r.name, cat: r.category, qty: num(r.qty), unit: r.unit, qtyEst: r.qty_estimated, family: r.family_id, status: r.status, split: r.split, cost: num(r.cost), est: num(r.est_cost), per: r.per_diners, sug: r.suggested, note: r.note, buy: r.buy_at || null, sort: r.sort, meals: im[r.id] || [] }; }),
      expenses: d.expenses.map(function (r) { return { id: r.id, concept: r.concept, amount: num(r.amount), payer: r.payer_family_id, split: r.split, kind: r.kind, date: r.spent_on }; }),
      house: { total: num(st.house_total), payer: st.house_payer_family_id, cancel: kv.cancel || [], payments: d.house_payments.slice().sort(function (a, b) { return a.id.localeCompare(b.id); }).map(function (r) { return { id: r.id, label: r.label, amount: num(r.amount), due: r.due_on, date: r.paid_on, paid: r.paid, note: r.note }; }) },
      tax: { perNight: num(st.tax_per_night), nights: st.tax_nights, minAge: st.tax_min_age, payer: st.tax_payer_family_id, note: kv.taxNote || '', fixed: kv.taxFixed || null },
      split: { mode: st.split_mode, w: { adulto: num(st.w_adulto), menor: num(st.w_menor), bebe: num(st.w_bebe) } },
      activities: d.activities.map(function (r) { return { id: r.id, day: r.day, start: hm(r.start_time), dur: r.duration_min, title: r.title, place: r.place, where: r.where_text, travel: r.travel, age: r.age, marc: r.marc, owner: r.owner_person_id, planB: r.plan_b, desc: r.description, star: r.star, tournament: r.is_tournament }; }),
      paidOptions: kv.paidOptions || [],
      tournament: { name: kv.tournamentName || 'Torneo', rounds: rounds.map(function (r) { return r || []; }) },
      weather: old.weather || kv.weather || { days: [], climate: {} },
      attendance: att, dayConfirm: dc, votes: votes, fumataShown: old.fumataShown,
      comp: kv.comp || { duos: [] }, finca: kv.finca || null, rooms: kv.rooms || null, shopping: kv.shopping || null,
      ideas: (d.ideas || []).map(function (r) { return { id: r.id, by: r.person_id, text: r.text, at: r.created_at, status: r.status || 'nueva' }; }),
      ideaLikes: (function () { var o = {}; (d.idea_likes || []).forEach(function (r) { (o[r.idea_id] = o[r.idea_id] || []).push(r.person_id); }); return o; })(),
      roomAssign: (function () { var o = {}; (d.room_assignments || []).forEach(function (r) { o[r.person_id] = r.room_id; }); return o; })(),
      guestReg: (function () { var o = {}; (d.guest_registrations || []).forEach(function (r) { if (r.done) o[r.person_id] = true; }); return o; })(),
      games: (d.games || []).slice().sort(function (a, b) { return a.sort - b.sort; }).map(function (r) { return Object.assign({ id: r.id, sort: r.sort }, r.data); }),
      awardData: (function () { var o = {}; (d.awards || []).forEach(function (r) { o[r.id] = r.data; }); return o; })(),
      awardVotes: (function () { var o = {}; (d.award_votes || []).forEach(function (r) { (o[r.award_id] = o[r.award_id] || {})[r.voter_id] = r.nominee; }); return o; })(),
      stats: old.stats || {},
      photos: (d.photos || []).map(function (r) { return { id: r.id, path: r.path, thumb: r.thumb, by: r.person_id, day: r.day, caption: r.caption || '', w: r.w, h: r.h, at: r.created_at }; }),
      photoLikes: (function () { var o = {}; (d.photo_likes || []).forEach(function (r) { (o[r.photo_id] = o[r.photo_id] || []).push(r.person_id); }); return o; })()
    };
  }

  /* ---------- S → filas por tabla ---------- */
  function rows(S) {
    var out = {};
    out.settings = [{ id: 1, house_total: S.house.total, house_payer_family_id: S.house.payer, split_mode: S.split.mode, w_adulto: S.split.w.adulto, w_menor: S.split.w.menor, w_bebe: S.split.w.bebe, tax_per_night: S.tax.perNight, tax_nights: S.tax.nights, tax_min_age: S.tax.minAge, tax_payer_family_id: S.tax.payer }];
    out.app_config = [{ key: 'trip', value: S.trip }, { key: 'comp', value: S.comp || { duos: [] } }];
    out.games = (S.games || []).map(function (g, i) { var d = {}; Object.keys(g).forEach(function (k) { if (k !== 'id' && k !== 'sort' && g[k] !== undefined) d[k] = g[k]; }); return { id: g.id, data: d, sort: g.sort != null ? g.sort : i }; });
    out.awards = Object.keys(S.awardData || {}).map(function (k) { return { id: k, data: S.awardData[k] }; });
    out.award_votes = []; Object.keys(S.awardVotes || {}).forEach(function (a) { Object.keys(S.awardVotes[a] || {}).forEach(function (v) { if (S.awardVotes[a][v]) out.award_votes.push({ award_id: a, voter_id: v, nominee: S.awardVotes[a][v] }); }); });
    out.people = S.people.map(function (p, i) { return { id: p.id, family_id: p.family, name: p.name, age: p.age, age_approx: !!p.approx, kind: p.kind, role: p.role, email: p.email || null, login: p.login || null, attends_default: !!p.attends, pending: !!p.pend, note: p.note || null, avatar: p.avatar || null, sort: p.sort != null ? p.sort : i }; });
    out.meals = S.meals.map(function (m) { return { id: m.id, day: m.day, slot: m.slot, time_override: m.time || null, mode: m.mode, title: m.title, dishes: m.dishes, cook_family_id: m.cook || null, marc_menu: m.marc || null, notes: m.notes || null, star: !!m.star }; });
    out.ingredients = S.ingredients.map(function (i, k) { return { id: i.id, name: i.name, category: i.cat, qty: i.qty, unit: i.unit, qty_estimated: !!i.qtyEst, family_id: i.family || null, status: i.status, split: i.split || 'comun', cost: i.cost, est_cost: i.est, per_diners: i.per || null, suggested: !!i.sug, note: i.note || null, buy_at: i.buy || null, sort: i.sort != null ? i.sort : 1000 + k }; });
    out.activities = S.activities.map(function (a) { return { id: a.id, day: a.day, start_time: a.start, duration_min: a.dur, title: a.title, place: a.place || 'finca', where_text: a.where || null, travel: a.travel || null, age: a.age || null, marc: a.marc, owner_person_id: a.owner || null, plan_b: a.planB || null, description: a.desc || null, star: !!a.star, is_tournament: !!a.tournament }; });
    out.expenses = S.expenses.map(function (e) { return { id: e.id, concept: e.concept, amount: e.amount, payer_family_id: e.payer, split: e.split || 'comun', kind: e.kind || 'gasto', spent_on: e.date || new Date().toISOString().slice(0, 10) }; });
    out.house_payments = S.house.payments.map(function (p) { return { id: p.id, label: p.label, amount: p.amount, due_on: p.due || null, paid_on: p.date || null, paid: !!p.paid, note: p.note || null }; });
    out.matches = [];
    S.tournament.rounds.forEach(function (r, ri) { r.forEach(function (m, mi) { out.matches.push({ tournament_id: 't1', round: ri, slot: mi, player_a: m.a || null, player_b: m.b || null, score_a: m.sa != null ? m.sa : null, score_b: m.sb != null ? m.sb : null, winner: m.w || null }); }); });
    out.ingredient_meals = []; S.ingredients.forEach(function (i) { i.meals.forEach(function (m) { out.ingredient_meals.push({ ingredient_id: i.id, meal_id: m }); }); });
    out.meal_attendance = []; Object.keys(S.attendance || {}).forEach(function (m) { Object.keys(S.attendance[m]).forEach(function (p) { out.meal_attendance.push({ meal_id: m, person_id: p, attends: !!S.attendance[m][p] }); }); });
    out.day_confirmations = []; Object.keys(S.dayConfirm || {}).forEach(function (p) { Object.keys(S.dayConfirm[p]).forEach(function (d) { out.day_confirmations.push({ person_id: p, day: d, status: S.dayConfirm[p][d] }); }); });
    out.ideas = (S.ideas || []).map(function (x) { return { id: x.id, person_id: x.by, text: x.text, status: x.status || 'nueva', created_at: x.at }; });
    out.idea_likes = []; Object.keys(S.ideaLikes || {}).forEach(function (k) { (S.ideaLikes[k] || []).forEach(function (p) { out.idea_likes.push({ idea_id: k, person_id: p }); }); });
    out.room_assignments = Object.keys(S.roomAssign || {}).filter(function (k) { return S.roomAssign[k]; }).map(function (k) { return { person_id: k, room_id: S.roomAssign[k] }; });
    out.guest_registrations = Object.keys(S.guestReg || {}).filter(function (k) { return S.guestReg[k]; }).map(function (k) { return { person_id: k, done: true }; });
    out.activity_votes = []; Object.keys(S.votes || {}).forEach(function (a) { (S.votes[a] || []).forEach(function (p) { out.activity_votes.push({ activity_id: a, person_id: p }); }); });
    return out;
  }
  function snapshot(S) {
    var r = rows(S), snap = {};
    SYNC.forEach(function (t) {
      var name = t[0], pk = t[1], m = {};
      (r[name] || []).forEach(function (row) { m[pk.map(function (k) { return row[k]; }).join('|')] = { row: row, json: JSON.stringify(row) }; });
      snap[name] = m;
    });
    return snap;
  }

  /* ---------- Sincronización ---------- */
  api.queue = function () { dirty = true; clearTimeout(timer); timer = setTimeout(sync, 350); };
  function sync() {
    if (busy) { timer = setTimeout(sync, 300); return; }
    if (!last) return;
    busy = true; dirty = false;
    var cur = snapshot(S), ops = [], reader = person(ui.me) && person(ui.me).role === 'lector';
    SYNC.forEach(function (t) {
      var name = t[0], pk = t[1], a = last[name] || {}, b = cur[name] || {};
      if (reader && !READER_OK[name]) { cur[name] = a; return; }
      var ins = Object.keys(b).filter(function (k) { return !a[k]; }).map(function (k) { return b[k].row; });
      var upd = Object.keys(b).filter(function (k) { return a[k] && a[k].json !== b[k].json; }).map(function (k) { return b[k].row; });
      var del = Object.keys(a).filter(function (k) { return !b[k]; }).map(function (k) { return a[k].row; });
      if (ins.length) ops.push({ name: name, pk: pk, ins: ins });
      if (upd.length) ops.push({ name: name, pk: pk, upd: upd });
      if (del.length) ops.push({ name: name, pk: pk, del: del });
    });
    /* primero borrados de tablas puente, luego altas/cambios en orden de dependencias, y al final borrados de entidades */
    var joins = { ingredient_meals: 1, meal_attendance: 1, day_confirmations: 1, activity_votes: 1, award_votes: 1 };
    function w(o) { return o.del ? (joins[o.name] ? 0 : 3) : (joins[o.name] ? 2 : 1); }
    ops = ops.map(function (o, i) { o.i = i; return o; }).sort(function (x, y) { return (w(x) - w(y)) || (x.i - y.i); });
    function pkObj(o, row) { var m = {}; o.pk.forEach(function (k) { m[k] = row[k]; }); return m; }
    var chain = Promise.resolve();
    ops.forEach(function (o) {
      chain = chain.then(function () {
        if (o.ins) return client().from(o.name).insert(o.ins).then(check);
        var list = o.upd || o.del;
        return Promise.all(list.map(function (row) {
          var q = client().from(o.name);
          return (o.upd ? q.update(row) : q.delete()).match(pkObj(o, row)).then(check);
        }));
      });
    });
    chain.then(function () { last = cur; busy = false; if (dirty) api.queue(); })
      .catch(function (err) {
        busy = false;
        toast(/permission|policy|row-level|admin/i.test(err.message || '') ? 'No tienes permiso para ese cambio. Lo deshago' : 'No se ha podido guardar. Revisa la conexión');
        reload();
      });
  }
  function check(res) { if (res && res.error) throw res.error; return res; }

  /* ---------- Carga y tiempo real ---------- */
  function loadAll() {
    return Promise.all(TABLES.map(function (t) { return client().from(t).select('*').then(check).then(function (r) { return [t, r.data]; }); }))
      .then(function (list) { var d = {}; list.forEach(function (x) { d[x[0]] = x[1]; }); return d; });
  }
  function reload() {
    if (busy || dirty) { clearTimeout(reloadT); reloadT = setTimeout(reload, 500); return; }
    return loadAll().then(function (d) {
      S = fromDb(d); last = snapshot(S);
      if (!person(ui.me)) return api.logout();
      render(true);
    }).catch(function () {});
  }
  api.presence = { online: {}, lastSeen: {} };
  function startPresence() {
    var ch = client().channel('online', { config: { presence: { key: ui.me } } });
    ch.on('presence', { event: 'sync' }, function () {
      var st = ch.presenceState(), on = {};
      Object.keys(st).forEach(function (k) { on[k] = true; });
      api.presence.online = on; onPresence();
    });
    ch.subscribe(function (status) { if (status === 'SUBSCRIBED') ch.track({ pid: ui.me, at: new Date().toISOString() }); });
    api.pingNow = ping; ping(); setInterval(ping, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { ping(); ch.track({ pid: ui.me, at: new Date().toISOString() }); } });
  }
  function ping() {
    var eg = 0, ks = []; try { eg = rankedCount(); ks = rankedKeys(); } catch (e) {}
    client().rpc('ping', { p_eggs: eg, p_ver: 3, p_keys: ks }).then(function () {
      return client().from('presence').select('person_id,last_seen,visits,minutes,eggs,egg_keys');
    }).then(function (r) {
      if (r && r.data) {
        var st = {};
        r.data.forEach(function (x) { api.presence.lastSeen[x.person_id] = x.last_seen; st[x.person_id] = { visits: x.visits, minutes: x.minutes, eggs: x.eggs, keys: x.egg_keys || [] }; });
        var before = S && S.secretsLive ? JSON.stringify(S.secretsLive.counts) : '';
        if (S) S.stats = st;
        try {
          var restored = st[ui.me] && typeof eggsRestore === 'function' && eggsRestore(st[ui.me].keys);
          if (typeof secretsLiveUpdate === 'function') secretsLiveUpdate();
          var moved = S && S.secretsLive && JSON.stringify(S.secretsLive.counts) !== before;
          /* el ranking de juegos se mueve solo cuando cambia el de secretos */
          if (restored || (moved && before && (ui.tab === 'juegos' || ui.tab === 'inicio') && !document.getElementById('scrim') && !document.querySelector('.egg-reveal'))) render(true);
        } catch (x) {}
        onPresence();
      }
    }).catch(function () {});
  }
  function subscribe() {
    client().channel('conclave').on('postgres_changes', { event: '*', schema: 'public' }, function () { clearTimeout(reloadT); reloadT = setTimeout(reload, 600); }).subscribe();
  }

  /* ---------- Acceso: email (o usuario) + código de 6 cifras ----------
     La primera vez, el código de la familia que reparte el organizador. Nada más entrar, cada uno elige el suyo. */
  var APP_NAME = 'Casa Rural 2026';
  function shell(inner) {
    $top.innerHTML = '<span class="wordmark">' + wordmarkHtml(APP_NAME, 'Plataforma familiar') + '</span><span class="sp"></span>';
    $nav.innerHTML = '';
    $main.innerHTML = '<div class="view">' + inner + '</div>';
  }
  /* Código de 6 cifras en 6 casillas. Es un campo de texto normal (no de contraseña): así iOS no salta
     con «Guardar contraseña» ni «Contraseña segura» en cada número. Las cifras se ven como puntos. */
  function codeInput(id, label) {
    return '<div class="field"><label for="' + id + '">' + label + '</label><div class="pin" data-pin="' + id + '">' +
      '<input id="' + id + '" class="pin-in" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" name="pin-' + id + '-' + Math.random().toString(36).slice(2, 7) + '" data-lpignore="true" data-1p-ignore="true">' +
      '<div class="pin-cells" aria-hidden="true">' + '<span></span>'.repeat(6) + '</div>' +
      '<button type="button" class="pin-eye" data-act="pinEye" data-id="' + id + '" aria-label="Ver u ocultar las cifras">' + icon('eye') + '</button></div></div>';
  }
  function loginView(msg) {
    shell('<section class="card login-card"><span class="login-mark">' + logoMark() + '</span><h1 class="login-title">Casa Rural <i>2026</i></h1><p class="muted">Entra con tu email y tu código de 6 cifras.</p>' +
      '<div class="field"><label for="lg-email">Tu email (o tu usuario)</label><input id="lg-email" type="email" inputmode="email" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next" placeholder="nombre@correo.com"></div>' +
      codeInput('lg-code', 'Código de 6 cifras') +
      '<button class="btn primary block big-btn" data-act="cloudLogin">Entrar</button>' +
      '<p class="small first-time"><b>¿Es la primera vez?</b> Usa el código de la familia que te ha llegado por WhatsApp. Justo después elegirás el tuyo.</p>' +
      (msg ? '<p class="small login-msg">' + msg + '</p>' : '') + '</section>' +
      '<section class="card"><button class="link" data-act="cloudForgot">He olvidado mi código</button><div id="lg-forgot" hidden><p class="small muted">Te enviamos un enlace a tu email. Ábrelo en este móvil, entrarás y podrás poner un código nuevo.</p><button class="btn block" data-act="cloudEmail">Enviarme el enlace</button>' +
      '<div class="field" id="lg-otp-box" hidden><label for="lg-otp">¿El correo trae un código? Escríbelo aquí</label><input id="lg-otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button class="btn block" data-act="cloudOtp">Entrar con ese código</button></div></div>' +
      '<p class="small muted">¿Sin email? Pídele al organizador un usuario y escríbelo en lugar del email.</p></section>');
    setTimeout(function () { var e = document.getElementById('lg-email'); if (e) e.focus(); }, 50);
  }
  function codeSetupView(first, done, name) {
    shell('<section class="card login-card"><span class="login-mark">' + logoMark() + '</span><h1 class="login-title">Hola' + (name ? ', <i>' + esc(name) + '</i>' : '') + '</h1>' +
      '<p>' + (first ? 'Último paso: <b>elige tu código personal</b> de 6 cifras. A partir de hoy entrarás con tu email y este código.' : 'Elige tu <b>código personal</b> de 6 cifras. Con tu email y este código entrarás siempre.') + '</p>' +
      codeInput('cs-1', 'Tu código nuevo') + codeInput('cs-2', 'Repítelo para confirmar') +
      '<button class="btn primary block big-btn" data-act="cloudSetCode">Guardar y entrar</button>' +
      '<p class="small muted">Que no sea 123456 ni 000000. Si un día lo olvidas: «He olvidado mi código» o pídele al organizador que te lo reinicie.</p><button class="link" data-act="logout">¿No eres ' + esc(name || 'tú') + '? Salir</button></section>');
    api._afterCode = done;
    setTimeout(function () { var e = document.getElementById('cs-1'); if (e) e.focus(); }, 80);
  }
  function bootPending() {
    $main = document.getElementById('main'); $nav = document.getElementById('nav'); $top = document.getElementById('top');
    $top.innerHTML = '<span class="wordmark">' + wordmarkHtml(APP_NAME, 'Plataforma familiar') + '</span>';
    $main.innerHTML = '<div class="view"><section class="card login-card"><h1 class="login-title">Casi <i>listo</i></h1><p class="muted">Falta conectar la base de datos. En cuanto esté, aquí podréis entrar todos.</p></section></div>';
  }
  var mustChange = false, fromLink = /[?&#](code|access_token|token_hash)=/.test(location.href);
  function enterApp() { return loadAll().then(function (d) { S = fromDb(d); last = snapshot(S); ui.tab = 'inicio'; ui.game = null; startApp(); subscribe(); startPresence();
    /* quién es el espía: solo lo devuelve la base de datos al admin y al propio espía */
    client().rpc('spy_identity').then(function (r) { if (r && r.data) { SPY_REAL = r.data; if (ui.tab === 'familia' || ui.tab === 'inicio') render(true); } }).catch(function () {}); }); }
  /* Sin código propio la base de datos no enseña nada (RLS), así que primero se comprueba y, si falta, se pide */
  function afterSession() {
    return client().rpc('claim_person').then(check).then(function (r) {
      var pid = r.data;
      if (!pid) {
        started = false;
        return client().auth.getUser().then(function (u) {
          var anonU = u.data && u.data.user && u.data.user.is_anonymous;
          if (anonU) return client().auth.signOut().then(function () { loginView(); });
          shell('<section class="card alert"><h3>Esta cuenta no está en la lista</h3><p>Pide al organizador que añada tu email.</p><button class="btn block" data-act="logout">Salir</button></section>');
        });
      }
      ui.me = pid;
      return Promise.all([client().rpc('my_code_status'), client().rpc('my_first_name')]).then(function (x) {
        var has = x[0] && !x[0].error && x[0].data === true, name = x[1] && x[1].data;
        var first = mustChange, forced = fromLink; mustChange = false; fromLink = false;
        if (!has || first || forced) { codeSetupView(first, function () { enterApp(); }, name); return; }
        return enterApp();
      });
    }).catch(function (e) { started = false; loginView('No he podido entrar: ' + esc(e.message || 'error de conexión')); });
  }
  var started = false, codeFlow = false, loginCode = null;
  /* Aviso grande (no un toast que se pierde): por qué no vale ese código y qué hacer */
  function codePopup(title, text) { message('<div class="code-pop">' + icon('shield') + '</div><h2>' + title + '</h2><p>' + text + '</p>'); }
  api.codeIsLogin = function (c) { return !!loginCode && c === loginCode; };
  api.codePopup = codePopup;
  function go2() { if (started) return; started = true; afterSession(); }
  api.boot = function () {
    loginView();
    client().auth.getSession().then(function (r) { if (r.data && r.data.session) go2(); });
    client().auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_IN' && !S && !codeFlow) go2(); });
  };
  api.logout = function () { client().auth.signOut().then(function () { location.href = api.siteUrl; }); };
  api.login = function () {
    var em = (val('lg-email') || '').trim().toLowerCase(), code = (val('lg-code') || '').replace(/\D/g, '');
    if (!em) { toast('Escribe tu email'); return; }
    if (code.length !== 6) { toast('El código tiene 6 cifras'); return; }
    var btn = document.querySelector('[data-act=cloudLogin]'); if (btn) { btn.disabled = true; btn.textContent = 'Entrando…'; }
    codeFlow = true;
    var pre = Promise.resolve();
    client().auth.getSession().then(function (r) { return r.data && r.data.session ? null : client().auth.signInAnonymously().then(check); })
      .then(function () { return client().rpc('login_with_code', { p_login: em, p_code: code }).then(check); })
      .then(function (r) {
        codeFlow = false;
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; }
        var d = r.data;
        if (!d || d.error) {
          var LM = { too_many: 'Demasiados intentos seguidos. Espera un rato o pregunta al organizador',
            no_user: 'Ese email o usuario no está en la lista. Revísalo o pregúntale al organizador',
            own_code: 'Ya elegiste tu propio código: usa ese, no el de la familia. ¿No te acuerdas? Toca «He olvidado mi código»',
            bad_code: 'El código no es correcto. La primera vez es el de la familia; después, el tuyo' };
          loginView(LM[d && d.error] || 'El email o el código no coinciden. Revísalos');
          var e1 = document.getElementById('lg-email'); if (e1) e1.value = em;
          if (d && d.error !== 'no_user') setTimeout(function () { var c = document.getElementById('lg-code'); if (c) c.focus(); }, 80);
          return;
        }
        mustChange = !!d.must_change; loginCode = mustChange ? code : null; started = false; go2();
      }).catch(function () { codeFlow = false; if (btn) { btn.disabled = false; btn.textContent = 'Entrar'; } toast('No he podido entrar. Revisa la conexión'); });
  };
  api.setCode = function () {
    var a = (val('cs-1') || '').replace(/\D/g, ''), b = (val('cs-2') || '').replace(/\D/g, '');
    if (a.length !== 6) { codePopup('Faltan cifras', 'Tu código tiene que tener <b>6 cifras</b>.'); return; }
    if (api.codeIsLogin(a)) { codePopup('Ese no vale', 'Es el <b>código de la familia</b>, el que sirve solo para entrar la primera vez. Elige uno <b>nuevo y solo tuyo</b>.'); clearPin('cs-2'); clearPin('cs-1', true); return; }
    if (a !== b) { codePopup('No coinciden', 'Los dos códigos tienen que ser iguales. Vuelve a escribirlo en la segunda fila.'); clearPin('cs-2', true); return; }
    client().rpc('set_my_code', { p_code: a }).then(check).then(function (r) {
      var m = { formato: 'Tiene que tener 6 cifras', igual_familia: 'Ese es el código de la familia: elige otro', facil: 'Demasiado fácil de adivinar: elige otro', sin_sesion: 'Tu sesión ha caducado. Vuelve a entrar' };
      if (r.data !== 'ok') {
        var pm = { igual_familia: ['Ese no vale', 'Es el <b>código de la familia</b>, el que sirve solo para entrar la primera vez. Elige uno <b>nuevo y solo tuyo</b>.'],
          facil: ['Demasiado fácil', 'Nada de 123456 ni seis cifras iguales: cualquiera lo adivinaría. Prueba con otro.'], formato: ['Faltan cifras', 'Tu código tiene que tener <b>6 cifras</b>.'] };
        if (pm[r.data]) codePopup(pm[r.data][0], pm[r.data][1]); else toast(m[r.data] || 'No he podido guardarlo');
        if (r.data !== 'sin_sesion') { clearPin('cs-2'); clearPin('cs-1', true); }
        return;
      }
      var done = api._afterCode; api._afterCode = null;
      toast('¡Listo! Tu código está guardado. La próxima vez: tu email y ese código');
      if (done) { shell('<section class="card login-card"><h1 class="login-title">Entrando<i>…</i></h1></section>'); done(); } else { closeSheet(); }
    }).catch(function () { toast('No he podido guardarlo. Revisa la conexión'); });
  };
  api.changeCodeSheet = function () {
    openSheet('<h2>Cambiar mi código</h2><p class="small muted">Tu código personal de 6 cifras para entrar con tu email.</p>' + codeInput('cs-1', 'Código nuevo') + codeInput('cs-2', 'Repítelo') +
      '<div class="sheet-actions"><button class="btn primary" data-act="cloudSetCode">Guardar</button><button class="btn" data-act="close">Cancelar</button></div>');
  };
  api.email = function () {
    var em = (val('lg-email') || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Escribe arriba tu email completo'); var e = document.getElementById('lg-email'); if (e) e.focus(); return; }
    client().rpc('email_allowed', { p_email: em }).then(check).then(function (r) {
      if (!r.data) { toast('Ese email no está en la lista. Pídeselo al organizador'); return; }
      return client().auth.signInWithOtp({ email: em, options: { emailRedirectTo: api.siteUrl, shouldCreateUser: true } }).then(check).then(function () {
        var b = document.getElementById('lg-otp-box'); if (b) b.hidden = false;
        toast('Enlace enviado a ' + esc(em) + '. Mira tu correo (y el spam)');
      });
    }).catch(function (e) { toast(/rate|seconds/i.test(e.message || '') ? 'Espera un minuto y vuelve a pedirlo' : 'No he podido enviar el enlace'); });
  };
  api.otp = function () {
    var em = (val('lg-email') || '').trim().toLowerCase(), tk = (val('lg-otp') || '').trim();
    client().auth.verifyOtp({ email: em, token: tk, type: 'email' }).then(check).then(go2).catch(function () { toast('Código incorrecto o caducado'); });
  };
  /* el PDF más reciente del bucket privado «docs»: para actualizar el manual basta con subir uno nuevo */
  MANUAL.pdf = function () {
    var b = client().storage.from('docs');
    return b.list('', { limit: 20, sortBy: { column: 'created_at', order: 'desc' } }).then(function (r) {
      var f = (r && r.data || []).filter(function (x) { return /\.pdf$/i.test(x.name); })[0]; if (!f) return null;
      return b.createSignedUrl(f.name, 900).then(function (s) { return s && s.data && (s.data.signedUrl || s.data.signedURL) || null; });
    });
  };
  /* ---------- Admin: código de la familia y códigos personales (nunca se ven, solo si existen) ---------- */
  api.status = function () { return client().rpc('admin_code_status').then(check).then(function (r) { var o = {}; (r.data || []).forEach(function (x) { o[x.person_id] = { has: x.has_code, at: x.updated_at }; }); return o; }); };
  api.reset = function (pid) { return client().rpc('admin_reset_code', { p_person: pid }).then(check); };
  api.getShared = function () { return client().rpc('get_shared_code').then(check).then(function (r) { return r.data; }); };
  api.setShared = function (code) { return client().rpc('set_shared_code', { p_code: code }).then(check).then(function (r) { if (!r.data) throw new Error('no'); }); };

  /* ---------- Álbum: Storage privado con enlaces firmados (1 h) ---------- */
  var phCache = {}, phPending = {}, phT = null;
  function bucket() { return client().storage.from('photos'); }
  PHOTOS.demo = false;
  PHOTOS.url = function (p) { var c = phCache[p]; return c && c.exp > Date.now() ? c.url : null; };
  PHOTOS.ensure = function (paths) {
    var need = (paths || []).filter(function (p) { return p && !PHOTOS.url(p) && !phPending[p]; });
    if (!need.length) return Promise.resolve(false);
    need.forEach(function (p) { phPending[p] = 1; });
    return bucket().createSignedUrls(need, 3600).then(function (r) {
      need.forEach(function (p) { delete phPending[p]; });
      (r.data || []).forEach(function (x) { var u = x.signedUrl || x.signedURL; if (u && x.path) phCache[x.path] = { url: u, exp: Date.now() + 3500000 }; });
      clearTimeout(phT); phT = setTimeout(function () { if (ui.tab === 'album' || ui.tab === 'inicio') render(true); }, 80);
      return true;
    }, function () { need.forEach(function (p) { delete phPending[p]; }); return false; });
  };
  PHOTOS.add = function (full, thumb, meta) {
    var id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : null, name = ui.me + '/' + (id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)));
    var opt = { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' };
    return bucket().upload(name + '.jpg', full.blob, opt).then(check)
      .then(function () { return bucket().upload(name + '_t.jpg', thumb.blob, opt).then(check); })
      .then(function () { var row = { path: name + '.jpg', thumb: name + '_t.jpg', person_id: ui.me, day: meta.day, w: full.w, h: full.h }; if (id) row.id = id; return client().from('photos').insert(row).select().single().then(check); })
      .then(function (r) {
        var x = r.data; phCache[x.thumb] = { url: URL.createObjectURL(thumb.blob), exp: Infinity }; phCache[x.path] = { url: URL.createObjectURL(full.blob), exp: Infinity };
        S.photos = S.photos || []; S.photos.push({ id: x.id, path: x.path, thumb: x.thumb, by: x.person_id, day: x.day, caption: '', w: x.w, h: x.h, at: x.created_at });
      });
  };
  PHOTOS.remove = function (ph) { return client().from('photos').delete().match({ id: ph.id }).then(check).then(function () { return bucket().remove([ph.path, ph.thumb]); }); };
  PHOTOS.like = function (ph, on) { var q = client().from('photo_likes'); return (on ? q.insert({ photo_id: ph.id, person_id: ui.me }) : q.delete().match({ photo_id: ph.id, person_id: ui.me })).then(check); };
  PHOTOS.caption = function (ph, txt) { return client().from('photos').update({ caption: txt || null }).match({ id: ph.id }).then(check); };

  return api;
})();
A.cloudEmail = function () { CLOUD.email(); };
A.cloudOtp = function () { CLOUD.otp(); };
A.cloudLogin = function () { CLOUD.login(); };
A.cloudSetCode = function () { CLOUD.setCode(); };
A.cloudForgot = function () { var f = document.getElementById('lg-forgot'); if (f) f.hidden = !f.hidden; };
A.myCode = function () { closeSheet(); CLOUD.changeCodeSheet(); };
A.logout = function () { CLOUD.logout(); };
if (CLOUD.status) { ACCESS.status = CLOUD.status; ACCESS.reset = CLOUD.reset; ACCESS.getShared = CLOUD.getShared; ACCESS.setShared = CLOUD.setShared; ACCESS.cloud = true; }
/* Casillas del código: pintar, avanzar solas y entrar al completar las 6 cifras */
function paintPin(inp) {
  var box = inp.closest('.pin'); if (!box) return;
  var v = inp.value, cells = box.querySelectorAll('.pin-cells span');
  cells.forEach(function (c, i) { c.classList.toggle('on', i < v.length); c.classList.toggle('cur', i === Math.min(v.length, 5)); c.setAttribute('data-d', v[i] || ''); });
}
function clearPin(id, focus) { var i = document.getElementById(id); if (!i) return; i.value = ''; paintPin(i); if (focus) setTimeout(function () { i.focus(); }, 30); }
document.addEventListener('input', function (e) {
  var t = e.target; if (!t || !t.classList || !t.classList.contains('pin-in')) return;
  var v = t.value.replace(/\D/g, '').slice(0, 6); if (v !== t.value) t.value = v; paintPin(t);
  if (v.length < 6) return;
  if (t.id === 'lg-code') { if ((val('lg-email') || '').trim()) { t.blur(); A.cloudLogin(); } else { var em = document.getElementById('lg-email'); if (em) em.focus(); toast('Escribe también tu email'); } }
  else if (t.id === 'cs-1') {
    if (CLOUD.codeIsLogin && CLOUD.codeIsLogin(v)) { t.blur(); CLOUD.codePopup('Ese no vale', 'Es el <b>código de la familia</b>, el que sirve solo para entrar la primera vez. Elige uno <b>nuevo y solo tuyo</b>.'); clearPin('cs-1'); setTimeout(function () { var c = document.getElementById('cs-1'); if (c) c.focus(); }, 300); return; }
    var n = document.getElementById('cs-2'); if (n) n.focus();
  }
  else if (t.id === 'cs-2') { t.blur(); A.cloudSetCode(); }
});
document.addEventListener('focusin', function (e) { var t = e.target; if (t && t.classList && t.classList.contains('pin-in')) paintPin(t); });
A.pinEye = function (el) { var b = el.closest('.pin'); if (b) b.toggleAttribute('data-show'); var i = document.getElementById(el.dataset.id); if (i) i.focus(); };
/* Volver atrás en iOS/Safari puede resucitar una página antigua desde la caché: se recarga para pasar por el acceso */
window.addEventListener('pageshow', function (e) { if (e.persisted) location.reload(); });
/* Intro en el campo de código = Entrar */
document.addEventListener('keydown', function (e) { if (e.key !== 'Enter') return; var t = e.target; if (t && t.id === 'lg-code') A.cloudLogin(); else if (t && t.id === 'lg-email') { var c = document.getElementById('lg-code'); if (c) c.focus(); } else if (t && t.id === 'cs-2') A.cloudSetCode(); });
window.CLOUD = CLOUD;
