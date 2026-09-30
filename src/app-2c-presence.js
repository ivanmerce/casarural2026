/* ===================== Quién está conectado =====================
   En la nube: Supabase Realtime Presence (quién tiene la app abierta AHORA) + tabla presence (última vez visto).
   En la demo: solo tú. */
function presenceData() {
  if (window.CLOUD && CLOUD.presence) return CLOUD.presence;
  var o = {}; if (ui && ui.me) o[ui.me] = true;
  return { online: o, lastSeen: {}, demo: true };
}
function onlineIds() {
  var on = presenceData().online;
  return S ? S.people.filter(function (p) { return on[p.id]; }).map(function (p) { return p.id; }) : [];
}
function timeAgo(iso) {
  if (!iso) return null;
  var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 90) return 'hace un momento';
  if (s < 3600) return 'hace ' + Math.round(s / 60) + ' min';
  if (s < 86400) return 'hace ' + Math.round(s / 3600) + ' h';
  var d = Math.round(s / 86400); return 'hace ' + d + (d === 1 ? ' día' : ' días');
}
function presencePill() {
  var ids = onlineIds();
  return '<button class="online-pill" data-act="whoOnline" aria-label="' + ids.length + ' conectados ahora">' +
    '<span class="live-dot" aria-hidden="true"></span><span class="avs">' + ids.slice(0, 3).map(function (id) { return av(id, 'xs'); }).join('') + '</span>' +
    '<b class="num">' + ids.length + '</b></button>';
}
function presenceCard() {
  var ids = onlineIds(), pd = presenceData();
  return '<section class="card" id="presenceCard"><div class="card-head"><h3 class="row" style="gap:8px"><span class="live-dot" aria-hidden="true"></span>Ahora en la app</h3><button class="link" data-act="whoOnline">Todos ' + icon('arrow') + '</button></div>' +
    (ids.length ? '<div class="online-list">' + ids.map(function (id) { return '<span class="online-chip">' + av(id, 'sm') + pname(id) + (id === ui.me ? ' <small class="muted">(tú)</small>' : '') + '</span>'; }).join('') + '</div>' : '<p class="small muted">Nadie más por aquí ahora mismo.</p>') +
    (pd.demo ? '<p class="small muted">En la demo solo te ves a ti. En la web de verdad aparece quién tiene la app abierta en cada momento.</p>' : '') + '</section>';
}
function whoList() {
  var pd = presenceData(), on = pd.online;
  var rows = S.people.slice().sort(function (a, b) {
    var ao = on[a.id] ? 1 : 0, bo = on[b.id] ? 1 : 0; if (ao !== bo) return bo - ao;
    var at = pd.lastSeen[a.id] ? new Date(pd.lastSeen[a.id]).getTime() : 0, bt = pd.lastSeen[b.id] ? new Date(pd.lastSeen[b.id]).getTime() : 0;
    return bt - at;
  });
  var n = onlineIds().length;
  return '<p class="small"><span class="live-dot" aria-hidden="true"></span> <b>' + n + (n === 1 ? ' persona conectada' : ' personas conectadas') + '</b> ahora mismo</p><div class="stack" style="gap:0">' +
    rows.map(function (p) {
      var st = on[p.id] ? '<span class="pill ok">Conectado ahora</span>' : pd.lastSeen[p.id] ? '<span class="small muted">Visto ' + timeAgo(pd.lastSeen[p.id]) + '</span>' : '<span class="small muted">Aún no ha entrado</span>';
      return '<div class="person">' + av(p.id) + '<div class="grow"><b>' + pname(p.id) + '</b><div class="small muted">' + esc(fam(p.family).name) + '</div></div>' + st + '</div>';
    }).join('') + '</div>';
}
var lastOnlineCount = 0;
function onPresence() {
  var t = document.getElementById('onlineSlot'); if (t) t.innerHTML = presencePill();
  var c = document.getElementById('presenceCard'); if (c) c.outerHTML = presenceCard();
  var w = document.getElementById('whoSheet'); if (w) w.innerHTML = whoList();
  var n = onlineIds().length;
  if (n >= 6 && lastOnlineCount < 6) habemusQuorum(n);
  lastOnlineCount = n;
}
