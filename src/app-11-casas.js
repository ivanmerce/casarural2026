/* ===================== ¿Dónde dormimos? =====================
   Plano esquemático de las casas (S.rooms, en los datos) y asignación por persona (S.roomAssign: persona → habitación).
   Pueden asignar los editores y los adultos para su propia familia. Los bebés duermen en cuna: no ocupan cama. */
var PW = 400, PH = 250;
function roomsCfg() { return S.rooms || null; }
function roomById(id) { var R = roomsCfg(); return R ? R.list.find(function (r) { return r.id === id; }) : null; }
function houseById(id) { var R = roomsCfg(); return R ? R.houses.find(function (h) { return h.id === id; }) : null; }
function roomOf(pid) { return (S.roomAssign || {})[pid] || null; }
function roomPeople(rid) { return S.people.concat(typeof SPIES !== 'undefined' ? SPIES : []).filter(function (p) { return roomOf(p.id) === rid; }); }
function usesBed(p) { return p.kind !== 'bebe'; }
function bedsUsed(rid) { return roomPeople(rid).filter(usesBed).length; }
function sleepers() { return S.people.filter(function (p) { return L.mealsAttended(S, p.id) > 0 || p.attends; }); }
function unassigned() { return sleepers().filter(function (p) { return !roomOf(p.id); }); }
function canRoomFor(pid) { var m = me(), t = person(pid); if (!t) return false; if (m.role === 'admin' || m.role === 'editor') return true; return m.kind === 'adulto' && t.family === m.family; }
function roomLabel(rid) { var r = roomById(rid), h = r && houseById(r.home); return r ? (h ? h.name + ' · ' : '') + r.name : ''; }
function pct(v, tot) { return (v / tot * 100).toFixed(3) + '%'; }
function freeRooms() { var R = roomsCfg(); return R ? R.list.filter(function (r) { return r.kind === 'bed' && bedsUsed(r.id) < r.beds; }) : []; }

function myRoomCard(compact) {
  var R = roomsCfg(); if (!R) return '';
  var rid = roomOf(me().id), un = unassigned();
  if (isSpy()) {
    var br = rid && roomById(rid);
    return '<section class="card casas-card spy-room"><div class="card-head"><h3>Tu habitación, agente</h3></div>' +
      (br ? '<div class="my-room" style="--hc:' + houseById(br.home).color + '"><span class="my-room-house">' + esc(houseById(br.home).name) + '</span><b>' + esc(br.name) + ' 🚽</b><span class="small">Suite con ducha integrada. Privacidad: discutible.</span></div>'
        : '<p class="small"><b>Para ti hemos reservado lo mejor de la finca: un baño.</b> Elige cuál en el plano (los baños parpadean). Las camas son para la familia; un espía duerme donde nadie le busca.</p>') + '</section>';
  }
  var h = '<section class="card casas-card"><div class="card-head"><h3>' + (compact ? 'Tu habitación' : '¿Dónde dormimos?') + '</h3>' + (compact ? '' : '<button class="link" data-act="tab" data-tab="finca" data-fsub="dormir">Ver el plano ' + icon('arrow') + '</button>') + '</div>';
  if (rid) {
    var r = roomById(rid), hs = houseById(r.home), mates = roomPeople(rid).filter(function (p) { return p.id !== me().id; });
    h += '<div class="my-room" style="--hc:' + hs.color + '"><span class="my-room-house">' + esc(hs.name) + '</span><b>' + esc(r.name) + '</b><span class="small">' + (mates.length ? 'Con ' + mates.map(function (p) { return esc(p.name); }).join(', ').replace(/, ([^,]*)$/, ' y $1') : 'Para ti solo') + '</span><span class="avs">' + roomPeople(rid).map(function (p) { return av(p.id, 'sm'); }).join('') + '</span></div>';
  } else h += '<p class="small"><b>Aún no tienes habitación.</b> Mira el plano y elige una libre' + (canRoomFor(me().id) ? '' : ' (o pídeselo a tus padres)') + '.</p>';
  if (un.length) h += '<p class="small casas-pend">' + icon('clock') + '<span><b>Por elegir:</b> ' + famGroups(un) + '</span></p>';
  return h + '</section>';
}
function famGroups(list) {
  var by = {}; list.forEach(function (p) { (by[p.family] = by[p.family] || []).push(p.name); });
  return Object.keys(by).map(function (f) { return esc(by[f].join(' y ')); }).join(' · ');
}

/* ---------- Fotos de las estancias (de la web de la finca: fincalapedrera.com/es/apartamentos) ----------
   r: estancias del plano a las que corresponde. maybe: la web no dice cuál de las habitaciones iguales es */
var PICS_BASE = 'https://bstzopqtffxraovwppes.supabase.co/storage/v1/object/public/finca-images/appartementen/';
var ROOM_PICS = {
  cezanne: [
    { f: 'cezanne-2', c: 'Salón con chimenea', r: ['cz-liv'] },
    { f: 'cezanne-3', c: 'Comedor, en el salón', r: ['cz-liv'] },
    { f: 'cezanne-8', c: 'Cocina', r: ['cz-kit'] },
    { f: 'cezanne-4', c: 'Una de las dos habitaciones dobles', r: ['cz-d1', 'cz-d2'], maybe: 1 },
    { f: 'cezanne-6', c: 'La otra habitación doble', r: ['cz-d1', 'cz-d2'], maybe: 1 },
    { f: 'cezanne-7', c: 'Baño', r: ['cz-bath'] },
    { f: 'cezanne-1', c: 'El balcón de Cézanne, desde fuera' },
    { f: 'cezanne-5', c: 'Detalles de la casa' },
    { f: 'cezanne-9', c: 'Más detalles' }
  ],
  gustave: [
    { f: 'gustave-1', c: 'Habitación de 2 camas', r: ['gu-2'] },
    { f: 'gustave-2', c: 'Habitación de 2 camas, otro ángulo', r: ['gu-2'] },
    { f: 'gustave-3', c: 'Habitación de 3 camas', r: ['gu-3'] },
    { f: 'gustave-4', c: 'Un rincón de Gustave' }
  ],
  phileine: [
    { f: 'phileine-3', c: 'Salón', r: ['ph-liv'] },
    { f: 'phileine-4', c: 'Comedor (aquí comemos todos)', r: ['ph-din'] },
    { f: 'phileine-5', c: 'Cocina', r: ['ph-kit'] },
    { f: 'phileine-6', c: 'Una de las dos habitaciones dobles', r: ['ph-2a', 'ph-2b'], maybe: 1 },
    { f: 'phileine-7', c: 'La otra habitación doble', r: ['ph-2a', 'ph-2b'], maybe: 1 },
    { f: 'phileine-8', c: 'Una de las dos individuales', r: ['ph-1a', 'ph-1b'], maybe: 1 },
    { f: 'phileine-9', c: 'La otra individual', r: ['ph-1a', 'ph-1b'], maybe: 1 },
    { f: 'phileine-10', c: 'Baño', r: ['ph-bath'] },
    { f: 'phileine-1', c: 'El jardín y la casa' },
    { f: 'phileine-2', c: 'La terraza de Phileine' }
  ]
};
function picUrl(p) { return PICS_BASE + p.f + '.jpg'; }
function picsFor(key) {   /* 'all', una casa o una estancia */
  var R = roomsCfg(), out = [];
  (R ? R.houses : []).forEach(function (hs) {
    (ROOM_PICS[hs.id] || []).forEach(function (p) {
      if (key === 'all' || key === hs.id || (p.r && p.r.indexOf(key) >= 0)) out.push({ url: picUrl(p), cap: p.c, house: hs.name, maybe: !!p.maybe && key !== 'all' && key !== hs.id });
    });
  });
  return out;
}
var rpv = null;
document.addEventListener('keydown', function (e) { if (!rpv || !document.getElementById('viewer')) return; if (e.key === 'ArrowRight') A.rpNext(); else if (e.key === 'ArrowLeft') A.rpPrev(); else if (e.key === 'Escape') picsClose(); });
function picsOpen(key, title, i) {
  var list = picsFor(key);
  if (!list.length) { message('<div class="code-pop">📷</div><h2>Sin fotos de aquí</h2><p>La web de la finca no tiene foto de ' + esc(title || 'esta estancia') + '. Tocará descubrirla en directo el viernes.</p>'); return; }
  closeSheet();
  rpv = { list: list, i: i || 0, title: title };
  var el = document.createElement('div'); el.className = 'viewer rp-viewer'; el.id = 'viewer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Fotos: ' + (title || 'la finca'));
  el.innerHTML = '<div class="vw-top"><span class="vw-who"></span><button class="icon-btn" data-act="rpClose" aria-label="Cerrar">' + icon('x') + '</button></div><div class="vw-stage"><button class="vw-nav prev" data-act="rpPrev" aria-label="Anterior">' + icon('back') + '</button><div class="vw-img"></div><button class="vw-nav next" data-act="rpNext" aria-label="Siguiente">' + icon('arrow') + '</button></div><div class="vw-bot"></div>';
  document.body.appendChild(el); document.body.style.overflow = 'hidden'; overlayPush('viewer');
  var sx = null; el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { if (dx < 0) A.rpNext(); else A.rpPrev(); } sx = null; });
  picsRender();
}
function picsRender() {
  var el = document.getElementById('viewer'); if (!el || !rpv) return;
  var p = rpv.list[rpv.i];
  el.querySelector('.vw-who').innerHTML = '<span><b>' + esc(rpv.title || 'Las casas') + '</b><small>' + esc(p.house) + ' · ' + (rpv.i + 1) + '/' + rpv.list.length + '</small></span>';
  el.querySelector('.vw-img').innerHTML = '<img src="' + p.url + '" alt="' + esc(p.house + ': ' + p.cap) + '" referrerpolicy="no-referrer">';
  el.querySelector('.vw-bot').innerHTML = '<p class="vw-cap">' + esc(p.cap) + '</p>' + (p.maybe ? '<p class="vw-note">Son iguales y la web de la finca no dice cuál es cuál: la tuya es una de estas.</p>' : '') +
    (rpv.list.length > 1 ? '<div class="rp-thumbs">' + rpv.list.map(function (x, k) { return '<button class="rp-th' + (k === rpv.i ? ' on' : '') + '" data-act="rpGo" data-i="' + k + '" aria-label="Foto ' + (k + 1) + ': ' + esc(x.cap) + '"><img src="' + x.url + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>'; }).join('') + '</div>' : '') +
    '<p class="vw-src">Fotos: web de la finca</p>';
  el.querySelector('.prev').disabled = rpv.i === 0; el.querySelector('.next').disabled = rpv.i >= rpv.list.length - 1;
  var on = el.querySelector('.rp-th.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) {}
  [rpv.list[rpv.i + 1], rpv.list[rpv.i - 1]].forEach(function (x) { if (x) { var im = new Image(); im.src = x.url; } });
}
function picsClose() { var el = document.getElementById('viewer'); if (el) el.remove(); document.body.style.overflow = ''; rpv = null; if (el) overlayDone(); }
function camBadge(id) { return picsFor(id).length ? '<span class="room-cam" aria-hidden="true">' + icon('camera') + '</span>' : ''; }
function picStrip(rid, title) {
  var ps = picsFor(rid); if (!ps.length) return '';
  return '<div class="rp-strip">' + ps.map(function (p, k) { return '<button class="rp-sth" data-act="roomPics" data-id="' + rid + '" data-i="' + k + '" aria-label="Ver foto: ' + esc(p.cap) + '"><img src="' + p.url + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>'; }).join('') + '</div>' +
    (ps.some(function (p) { return p.maybe; }) ? '<p class="small muted">Las habitaciones gemelas salen juntas: la web de la finca no dice cuál es cuál.</p>' : '');
}

function casasHtml() {
  var R = roomsCfg();
  var h = '';
  if (!R) return h + '<div class="empty">' + icon('house') + '<b>Aún no hay plano</b></div>';
  h += myRoomCard(true);
  var un = unassigned(), fr = freeRooms();
  if (un.length) h += '<section class="card alert casas-choose"><h3>Falta por decidir</h3><p class="small"><b>' + famGroups(un) + '</b> ' + (un.length === 1 ? 'aún no tiene' : 'aún no tienen') + ' habitación.</p>' +
    (fr.length ? '<p class="small">Libres: ' + fr.map(function (r) { return '<button class="chip mini" data-act="roomOpen" data-id="' + r.id + '">' + esc(roomLabel(r.id)) + ' · ' + (r.beds - bedsUsed(r.id)) + (r.beds - bedsUsed(r.id) === 1 ? ' cama' : ' camas') + '</button>'; }).join(' ') + '</p>' : '') +
    '<p class="small muted">Se elige por orden de llegada al móvil: toca la habitación y «Nos la quedamos».</p></section>';
  /* plano */
  h += '<div class="row wrap plan-tools"><button class="btn" data-act="roomPics" data-id="all">' + icon('camera') + 'Ver fotos de las casas</button><span class="small muted">o toca cualquier estancia del plano</span></div>';
  h += '<div class="plan-wrap"><div class="plan" style="aspect-ratio:' + PW + '/' + Math.round(PH * 1.35) + '">';
  R.houses.forEach(function (hs) {
    h += '<div class="plan-house" style="left:' + pct(hs.x, PW) + ';top:' + pct(hs.y, PH) + ';width:' + pct(hs.w, PW) + ';height:' + pct(hs.h, PH) + ';--hc:' + hs.color + '"><span class="plan-hname">' + esc(hs.name) + '</span></div>';
  });
  R.list.forEach(function (r) {
    var style = 'left:' + pct(r.x, PW) + ';top:' + pct(r.y, PH) + ';width:' + pct(r.w, PW) + ';height:' + pct(r.h, PH) + ';--hc:' + houseById(r.home).color;
    if (r.kind === 'bath') {
      var bp = roomPeople(r.id), spyHere = bp.length ? '<span class="pdots">' + bp.map(function (p) { return '<span class="pdot">' + av(p.id, 'xs') + '</span>'; }).join('') + '</span>' : '';
      if (isSpy()) { h += '<button class="plan-room k-bath spy-pick' + (roomOf(me().id) === r.id ? ' mine' : '') + '" style="' + style + '" data-act="spyBath" data-id="' + r.id + '" aria-label="Dormir en ' + esc(roomLabel(r.id)) + '"><span>' + esc(r.name) + '</span>' + spyHere + '</button>'; return; }
      h += '<button class="plan-room k-bath pics" style="' + style + '" data-act="roomPics" data-id="' + r.id + '" aria-label="Fotos: ' + esc(roomLabel(r.id)) + '"><span>' + esc(r.name) + '</span>' + spyHere + camBadge(r.id) + '</button>'; return;
    }
    if (r.kind !== 'bed') { h += '<button class="plan-room pics k-' + r.kind + '" style="' + style + '" data-act="roomPics" data-id="' + r.id + '" aria-label="Fotos: ' + esc(roomLabel(r.id)) + '"><span>' + esc(r.name) + '</span>' + camBadge(r.id) + '</button>'; return; }
    var ps = roomPeople(r.id), used = ps.filter(usesBed).length, mine = roomOf(me().id) === r.id, crib = ps.some(function (p) { return !usesBed(p); });
    var dots = ps.map(function (p) { return '<span class="pdot' + (usesBed(p) ? '' : ' baby') + '">' + av(p.id, 'xs') + '</span>'; }).join('');
    for (var i = used; i < r.beds; i++) dots += '<span class="pdot free" aria-hidden="true"></span>';
    h += '<button class="plan-room bed' + (mine ? ' mine' : '') + (used >= r.beds ? ' full' : used ? '' : ' empty') + '" style="' + style + '" data-act="roomOpen" data-id="' + r.id + '" aria-label="' + esc(roomLabel(r.id)) + ': ' + used + ' de ' + r.beds + ' camas">' +
      '<span class="plan-rname">' + esc(r.name) + '</span><span class="pdots">' + dots + '</span>' + camBadge(r.id) + '</button>';
  });
  h += '<span class="plan-note">' + esc(R.note || '') + '</span></div></div>';
  h += '<div class="plan-legend small"><span><i class="lg-free"></i>Cama libre</span><span><i class="lg-mine"></i>Tu habitación</span><span>' + icon('baby') + 'Cuna: no ocupa cama</span></div>';
  /* listado por casa */
  R.houses.forEach(function (hs) {
    var rs = R.list.filter(function (r) { return r.home === hs.id && r.kind === 'bed'; });
    h += '<section class="card casa-list" style="--hc:' + hs.color + '"><div class="card-head"><h3 class="row" style="gap:8px"><i class="hdot"></i>' + esc(hs.name) + '</h3><button class="link" data-act="roomPics" data-id="' + hs.id + '">' + icon('camera') + 'Fotos</button></div>' + (hs.text ? '<p class="small muted casa-text">' + esc(hs.text) + '</p>' : '') +
      rs.map(function (r) {
        var ps = roomPeople(r.id), used = ps.filter(usesBed).length;
        return '<button class="row room-row" data-act="roomOpen" data-id="' + r.id + '"><span class="grow"><b>' + esc(r.name) + '</b><small class="muted"> · ' + r.beds + (r.beds === 1 ? ' cama' : ' camas') + '</small><span class="room-who">' +
          (ps.length ? ps.map(function (p) { return '<span class="who">' + av(p.id, 'xs') + esc(p.name) + (usesBed(p) ? '' : ' <small class="muted">(cuna)</small>') + '</span>'; }).join('') : '<span class="muted small">Libre</span>') + '</span></span>' +
          '<span class="pill ' + (used >= r.beds ? 'ok' : used ? 'warn' : '') + '">' + used + '/' + r.beds + '</span></button>';
      }).join('') + '</section>';
  });
  return h;
};

function roomSheet(rid) {
  var r = roomById(rid); if (!r) return;
  var hs = houseById(r.home), ps = roomPeople(rid), used = ps.filter(usesBed).length, left = r.beds - used;
  var h = '<div class="row" style="gap:10px"><span class="room-badge" style="--hc:' + hs.color + '">' + esc(hs.name) + '</span><h2 class="grow" style="margin:0">' + esc(r.name) + '</h2></div>' +
    '<p class="small muted">' + r.beds + (r.beds === 1 ? ' cama' : ' camas') + ' · ' + (left > 0 ? left + (left === 1 ? ' libre' : ' libres') : 'completa') + '</p>' + picStrip(rid);
  h += '<div class="stack" style="gap:6px">' + (ps.length ? ps.map(function (p) {
    return '<div class="row room-occ">' + av(p.id, 'sm') + '<span class="grow"><b>' + esc(p.name) + '</b>' + (usesBed(p) ? '' : ' <small class="muted">en cuna</small>') + '</span>' +
      (canRoomFor(p.id) ? '<button class="btn ghost" data-act="roomOut" data-p="' + p.id + '" data-r="' + rid + '">' + icon('x') + 'Quitar</button>' : '') + '</div>';
  }).join('') : '<p class="small muted">Nadie todavía.</p>') + '</div>';
  /* elegir: primero las familias completas que quepan, después personas sueltas */
  var cand = sleepers().filter(function (p) { return roomOf(p.id) !== rid && canRoomFor(p.id); });
  if (cand.length) {
    var byFam = {}; cand.forEach(function (p) { (byFam[p.family] = byFam[p.family] || []).push(p); });
    var groups = Object.keys(byFam).map(function (f) { return byFam[f].filter(function (p) { return p.kind === 'adulto' && !roomOf(p.id); }); }).filter(function (g) { return g.length === 2 && left >= 2; });
    h += '<p class="eyebrow">Poner aquí</p>';
    if (groups.length) h += '<div class="row wrap">' + groups.map(function (g) { return '<button class="btn primary" data-act="roomIn" data-r="' + rid + '" data-p="' + g.map(function (p) { return p.id; }).join(',') + '">' + icon('check') + 'Nos la quedamos: ' + esc(g[0].name) + ' y ' + esc(g[1].name) + '</button>'; }).join('') + '</div>';
    h += '<div class="room-pick">' + cand.map(function (p) {
      var cur = roomOf(p.id);
      return '<button class="toggle-p room-p" data-act="roomIn" data-r="' + rid + '" data-p="' + p.id + '">' + av(p.id, 'sm') + esc(p.name) + '<small class="muted">' + (cur ? esc(roomLabel(cur)) : 'sin habitación') + '</small></button>';
    }).join('') + '</div>';
  } else if (isSpy()) h += '<p class="small muted">Agente: las camas son para la familia. Lo suyo es un baño (elíjalo en el plano).</p>';
  else if (!canRoomFor(me().id)) h += '<p class="small muted">Para cambiar habitaciones, pídeselo a un adulto de tu familia o al organizador.</p>';
  h += '<button class="btn block" data-act="close">Cerrar</button>';
  openSheet(h);
}
Object.assign(A, {
  roomOpen: function (el) { roomSheet(el.dataset.id); },
  roomPics: function (el) {
    var id = el.dataset.id, r = roomById(id), hs = houseById(id);
    picsOpen(id, id === 'all' ? 'Las casas' : r ? roomLabel(id) : hs ? hs.name : '', +el.dataset.i || 0);
  },
  rpClose: function () { picsClose(); },
  rpPrev: function () { if (rpv && rpv.i > 0) { rpv.i--; picsRender(); } },
  rpNext: function () { if (rpv && rpv.i < rpv.list.length - 1) { rpv.i++; picsRender(); } },
  rpGo: function (el) { if (rpv) { rpv.i = +el.dataset.i; picsRender(); } },
  spyBath: function (el) {
    if (!isSpy()) return; var rid = el.dataset.id, r = roomById(rid); if (!r || r.kind !== 'bath') return;
    S.roomAssign = S.roomAssign || {}; S.roomAssign[me().id] = rid; save(); render(true);
    var h = houseById(r.home);
    message('<div class="code-pop">🚽</div><h2>Habitación asignada</h2><p>Agente, desde hoy duerme en el <b>' + esc(r.name.toLowerCase()) + ' de ' + esc(h ? h.name : 'la finca') + '</b>. Ducha incluida, toallas de la finca y vistas al azulejo. Nadie buscará a un espía ahí. Bueno, a las 8 de la mañana sí.</p>');
  },
  roomIn: function (el) {
    var rid = el.dataset.r, r = roomById(rid), ids = el.dataset.p.split(','), ok = ids.filter(canRoomFor);
    if (!ok.length) { toast('Esto lo cambia un adulto de la familia o el organizador'); return; }
    var need = ok.filter(function (id) { return usesBed(person(id)); }).length, left = r.beds - bedsUsed(rid);
    if (need > left) { toast(left ? 'Solo queda ' + left + (left === 1 ? ' cama' : ' camas') + ' aquí' : 'Está completa: primero quita a alguien'); return; }
    S.roomAssign = S.roomAssign || {}; ok.forEach(function (id) { S.roomAssign[id] = rid; });
    save(); closeSheet(); render(true);
    toast(ok.map(function (id) { return esc(person(id).name); }).join(' y ') + ' → ' + esc(roomLabel(rid)) + (unassigned().length ? '' : '. ¡Todos colocados!'));
    if (!unassigned().length) confetti(1600);
  },
  roomOut: function (el) {
    var pid = el.dataset.p; if (!canRoomFor(pid)) return;
    delete S.roomAssign[pid]; save(); closeSheet(); render(true);
    toast(esc(person(pid).name) + ' sin habitación', 'Deshacer', function () { S.roomAssign[pid] = el.dataset.r; save(); render(true); });
  }
});
