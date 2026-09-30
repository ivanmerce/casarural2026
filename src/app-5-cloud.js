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
  var TABLES = ['families', 'people', 'homes', 'meals', 'meal_attendance', 'day_confirmations', 'ingredients', 'ingredient_meals', 'expenses', 'activities', 'activity_votes', 'matches', 'house_payments', 'settings', 'app_config', 'games', 'awards', 'award_votes', 'photos', 'photo_likes'];
  /* tablas que la app escribe, en orden de dependencias, con su clave primaria */
  var SYNC = [
    ['settings', ['id']], ['app_config', ['key']], ['people', ['id']], ['meals', ['id']], ['ingredients', ['id']], ['activities', ['id']],
    ['expenses', ['id']], ['house_payments', ['id']], ['matches', ['tournament_id', 'round', 'slot']],
    ['ingredient_meals', ['ingredient_id', 'meal_id']], ['meal_attendance', ['meal_id', 'person_id']], ['day_confirmations', ['person_id', 'day']], ['activity_votes', ['activity_id', 'person_id']],
    ['games', ['id']], ['awards', ['id']], ['award_votes', ['award_id', 'voter_id']]
  ];
  /* lo que un lector puede escribir (RLS): el resto ni se intenta subir */
  var READER_OK = { day_confirmations: 1, meal_attendance: 1, activity_votes: 1, award_votes: 1 };
  function client() {
    return sb || (sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }));
  }
  function num(v) { return v == null ? null : Number(v); }
  function hm(t) { return t ? String(t).slice(0, 5) : null; }

  /* ---------- Base de datos → S ---------- */
  function fromDb(d) {
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
      people: d.people.slice().sort(function (a, b) { return a.sort - b.sort; }).map(function (r) { return { id: r.id, name: r.name, family: r.family_id, age: r.age, approx: r.age_approx, kind: r.kind, role: r.role, email: r.email, attends: r.attends_default, pend: r.pending, note: r.note, sort: r.sort, avatar: r.avatar }; }),
      pendingPeople: [],
      homes: d.homes.map(function (r) { return { id: r.id, name: r.name, beds: r.beds, free: r.free, rooms: r.rooms, note: r.note, proposal: r.proposal || [] }; }),
      meals: d.meals.map(function (r) { return { id: r.id, day: r.day, slot: r.slot, time: hm(r.time_override), mode: r.mode, title: r.title, dishes: r.dishes || [], cook: r.cook_family_id, marc: r.marc_menu, notes: r.notes, star: r.star }; }),
      ingredients: d.ingredients.slice().sort(function (a, b) { return a.sort - b.sort; }).map(function (r) { return { id: r.id, name: r.name, cat: r.category, qty: num(r.qty), unit: r.unit, qtyEst: r.qty_estimated, family: r.family_id, status: r.status, split: r.split, cost: num(r.cost), est: num(r.est_cost), per: r.per_diners, sug: r.suggested, note: r.note, sort: r.sort, meals: im[r.id] || [] }; }),
      expenses: d.expenses.map(function (r) { return { id: r.id, concept: r.concept, amount: num(r.amount), payer: r.payer_family_id, split: r.split, kind: r.kind, date: r.spent_on }; }),
      house: { total: num(st.house_total), payer: st.house_payer_family_id, cancel: kv.cancel || [], payments: d.house_payments.slice().sort(function (a, b) { return a.id.localeCompare(b.id); }).map(function (r) { return { id: r.id, label: r.label, amount: num(r.amount), due: r.due_on, date: r.paid_on, paid: r.paid, note: r.note }; }) },
      tax: { perNight: num(st.tax_per_night), nights: st.tax_nights, minAge: st.tax_min_age, payer: st.tax_payer_family_id, note: kv.taxNote || '' },
      split: { mode: st.split_mode, w: { adulto: num(st.w_adulto), menor: num(st.w_menor), bebe: num(st.w_bebe) } },
      activities: d.activities.map(function (r) { return { id: r.id, day: r.day, start: hm(r.start_time), dur: r.duration_min, title: r.title, place: r.place, where: r.where_text, travel: r.travel, age: r.age, marc: r.marc, owner: r.owner_person_id, planB: r.plan_b, desc: r.description, star: r.star, tournament: r.is_tournament }; }),
      paidOptions: kv.paidOptions || [],
      tournament: { name: kv.tournamentName || 'Torneo', rounds: rounds.map(function (r) { return r || []; }) },
      weather: old.weather || kv.weather || { days: [], climate: {} },
      attendance: att, dayConfirm: dc, votes: votes, fumataShown: old.fumataShown,
      comp: kv.comp || { duos: [] },
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
    out.people = S.people.map(function (p, i) { return { id: p.id, family_id: p.family, name: p.name, age: p.age, age_approx: !!p.approx, kind: p.kind, role: p.role, email: p.email || null, attends_default: !!p.attends, pending: !!p.pend, note: p.note || null, avatar: p.avatar || null, sort: p.sort != null ? p.sort : i }; });
    out.meals = S.meals.map(function (m) { return { id: m.id, day: m.day, slot: m.slot, time_override: m.time || null, mode: m.mode, title: m.title, dishes: m.dishes, cook_family_id: m.cook || null, marc_menu: m.marc || null, notes: m.notes || null, star: !!m.star }; });
    out.ingredients = S.ingredients.map(function (i, k) { return { id: i.id, name: i.name, category: i.cat, qty: i.qty, unit: i.unit, qty_estimated: !!i.qtyEst, family_id: i.family || null, status: i.status, split: i.split || 'comun', cost: i.cost, est_cost: i.est, per_diners: i.per || null, suggested: !!i.sug, note: i.note || null, sort: i.sort != null ? i.sort : 1000 + k }; });
    out.activities = S.activities.map(function (a) { return { id: a.id, day: a.day, start_time: a.start, duration_min: a.dur, title: a.title, place: a.place || 'finca', where_text: a.where || null, travel: a.travel || null, age: a.age || null, marc: a.marc, owner_person_id: a.owner || null, plan_b: a.planB || null, description: a.desc || null, star: !!a.star, is_tournament: !!a.tournament }; });
    out.expenses = S.expenses.map(function (e) { return { id: e.id, concept: e.concept, amount: e.amount, payer_family_id: e.payer, split: e.split || 'comun', kind: e.kind || 'gasto', spent_on: e.date || new Date().toISOString().slice(0, 10) }; });
    out.house_payments = S.house.payments.map(function (p) { return { id: p.id, label: p.label, amount: p.amount, due_on: p.due || null, paid_on: p.date || null, paid: !!p.paid, note: p.note || null }; });
    out.matches = [];
    S.tournament.rounds.forEach(function (r, ri) { r.forEach(function (m, mi) { out.matches.push({ tournament_id: 't1', round: ri, slot: mi, player_a: m.a || null, player_b: m.b || null, score_a: m.sa != null ? m.sa : null, score_b: m.sb != null ? m.sb : null, winner: m.w || null }); }); });
    out.ingredient_meals = []; S.ingredients.forEach(function (i) { i.meals.forEach(function (m) { out.ingredient_meals.push({ ingredient_id: i.id, meal_id: m }); }); });
    out.meal_attendance = []; Object.keys(S.attendance || {}).forEach(function (m) { Object.keys(S.attendance[m]).forEach(function (p) { out.meal_attendance.push({ meal_id: m, person_id: p, attends: !!S.attendance[m][p] }); }); });
    out.day_confirmations = []; Object.keys(S.dayConfirm || {}).forEach(function (p) { Object.keys(S.dayConfirm[p]).forEach(function (d) { out.day_confirmations.push({ person_id: p, day: d, status: S.dayConfirm[p][d] }); }); });
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
    ping(); setInterval(ping, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { ping(); ch.track({ pid: ui.me, at: new Date().toISOString() }); } });
  }
  function ping() {
    var eg = 0; try { eg = foundCount(); } catch (e) {}
    client().rpc('ping', { p_eggs: eg }).then(function () {
      return client().from('presence').select('person_id,last_seen,visits,minutes,eggs');
    }).then(function (r) {
      if (r && r.data) {
        var st = {};
        r.data.forEach(function (x) { api.presence.lastSeen[x.person_id] = x.last_seen; st[x.person_id] = { visits: x.visits, minutes: x.minutes, eggs: x.eggs }; });
        if (S) S.stats = st; onPresence();
      }
    }).catch(function () {});
  }
  function subscribe() {
    client().channel('conclave').on('postgres_changes', { event: '*', schema: 'public' }, function () { clearTimeout(reloadT); reloadT = setTimeout(reload, 600); }).subscribe();
  }

  /* ---------- Acceso ---------- */
  function shell(inner) {
    $top.innerHTML = '<span class="wordmark">' + wordmarkHtml('Cónclave') + '</span><span class="sp"></span>';
    $nav.innerHTML = '';
    $main.innerHTML = '<div class="view"><section class="hero glass" style="margin-top:28px"><canvas id="heroNet" aria-hidden="true"></canvas><div class="kicker">Plataforma familiar</div><h1>Cónclave</h1></section>' + inner + '</div>';
    startHero();
  }
  function loginView(msg) {
    shell('<section class="card"><h3>Entra con tu email</h3><p class="small muted">Te llega un enlace al correo. Ábrelo en este mismo móvil y listo.</p>' +
      '<div class="field"><label for="lg-email">Tu email</label><input id="lg-email" type="email" inputmode="email" autocomplete="email" placeholder="nombre@correo.com"></div>' +
      '<button class="btn primary block" data-act="cloudEmail">Enviarme el enlace</button>' +
      '<div class="field" id="lg-otp-box" hidden><label for="lg-otp">¿El email trae un código de 6 cifras? Escríbelo aquí</label><input id="lg-otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button class="btn block" data-act="cloudOtp">Entrar con ese código</button></div></section>' +
      '<section class="card"><h3>Tengo un código personal</h3><p class="small muted">El organizador te lo ha pasado por WhatsApp.</p>' +
      '<div class="field"><label for="lg-code">Código de 6 cifras</label><input id="lg-code" inputmode="numeric" maxlength="6" autocomplete="off" style="font-size:1.6rem;letter-spacing:.2em;font-weight:800"></div>' +
      '<button class="btn primary block" data-act="cloudCode">Entrar</button></section>' +
      (msg ? '<section class="card alert"><p>' + msg + '</p></section>' : ''));
  }
  function bootPending() {
    $main = document.getElementById('main'); $nav = document.getElementById('nav'); $top = document.getElementById('top');
    $top.innerHTML = '<span class="wordmark">' + wordmarkHtml('Cónclave') + '</span>';
    $main.innerHTML = '<div class="view"><section class="hero glass" style="margin-top:28px"><div class="kicker">Casi listo</div><h1>Cónclave</h1><p class="place">Falta conectar la base de datos. En cuanto esté, aquí podréis entrar todos.</p></section></div>';
  }
  function afterSession() {
    return client().rpc('claim_person').then(check).then(function (r) {
      var pid = r.data;
      if (!pid) {
        started = false;
        return client().auth.getUser().then(function (u) {
          var anonU = u.data && u.data.user && u.data.user.is_anonymous;
          if (anonU) return client().auth.signOut().then(function () { loginView('Ese código no vale o ha caducado. Pídele uno nuevo al organizador.'); });
          shell('<section class="card alert"><h3>Esta cuenta no está en la lista</h3><p>Pide al organizador que añada tu email o que te pase un código.</p><button class="btn block" data-act="logout">Salir</button></section>');
        });
      }
      ui.me = pid;
      return loadAll().then(function (d) { S = fromDb(d); last = snapshot(S); startApp(); subscribe(); startPresence(); });
    }).catch(function (e) { loginView('No he podido entrar: ' + esc(e.message || 'error de conexión')); });
  }
  var started = false, codeFlow = false;
  function go2() { if (started) return; started = true; afterSession(); }
  api.boot = function () {
    loginView();
    client().auth.getSession().then(function (r) {
      if (r.data && r.data.session) go2();
    });
    client().auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_IN' && !S && !codeFlow) go2(); });
  };
  api.logout = function () { client().auth.signOut().then(function () { location.href = api.siteUrl; }); };
  api.email = function () {
    var em = (val('lg-email') || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) { toast('Escribe tu email completo'); return; }
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
  api.code = function () {
    var code = (val('lg-code') || '').replace(/\D/g, '');
    if (code.length !== 6) { toast('El código tiene 6 cifras'); return; }
    codeFlow = true;
    client().auth.signInAnonymously().then(check).then(function () { return client().rpc('claim_with_code', { p_code: code }).then(check); }).then(function (r) {
      codeFlow = false;
      if (!r.data) { return client().auth.signOut().then(function () { toast('Ese código no vale. Revísalo con el organizador'); }); }
      started = false; go2();
    }).catch(function () { codeFlow = false; toast('No he podido entrar con el código'); });
  };
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

  /* códigos personales: solo el admin puede leerlos o cambiarlos (RLS) */
  api.getCode = function (pid) { return client().from('access_codes').select('code').eq('person_id', pid).maybeSingle().then(function (r) { return r.data ? r.data.code : null; }); };
  api.setCode = function (pid, code) { return client().from('access_codes').upsert({ person_id: pid, code: code }, { onConflict: 'person_id' }).then(check); };
  return api;
})();
A.cloudEmail = function () { CLOUD.email(); };
A.cloudOtp = function () { CLOUD.otp(); };
A.cloudCode = function () { CLOUD.code(); };
A.logout = function () { CLOUD.logout(); };
if (CLOUD.getCode) { ACCESS.getCode = CLOUD.getCode; ACCESS.setCode = CLOUD.setCode; }
window.CLOUD = CLOUD;
