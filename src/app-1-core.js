/* ===================== Cónclave · núcleo ===================== */
var KEY = 'conclave-app';
var S, ui;
var $main, $nav, $top;
var SLOT_T = { des: '09:00', com: '14:00', mer: '17:30', cen: '21:00' };
var CATS = { fresco: 'Fresco', carne: 'Carne y pescado', bebidas: 'Bebidas', despensa: 'Despensa', desayunos: 'Desayunos', bbq: 'Barbacoa', cumple: 'Cumpleaños', marc: 'Menú especial', limpieza: 'Limpieza y menaje', otros: 'Otros' };
var STATUS = { pendiente: 'Pendiente', comprado: 'Comprado', casa: 'Viene de casa' };
var KIND = { adulto: 'Adulto', menor: 'Menor', bebe: 'Bebé' };
var ROLE = { admin: 'Admin', editor: 'Editor', lector: 'Lector' };

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function load() {
  try {
    var raw = localStorage.getItem(KEY);
    if (raw) {
      var d = JSON.parse(raw);
      if (d && d.version === SEED.version) { if (typeof AVATARS !== 'undefined') d.people.forEach(function (p) { if (!p.avatar && AVATARS[p.id]) p.avatar = AVATARS[p.id]; }); return d; }
    }
  } catch (e) {}
  var s = clone(SEED); s.attendance = {};
  s.ingredients.forEach(function (i) { if (!i.status) i.status = 'pendiente'; if (!i.split) i.split = 'comun'; if (i.cost === undefined) i.cost = null; });
  return s;
}
function save() {
  if (window.CLOUD) { CLOUD.queue(); return; }
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}
function loadUi() { try { return JSON.parse(localStorage.getItem(KEY + '-ui')) || {}; } catch (e) { return {}; } }
function saveUi() {
  try { localStorage.setItem(KEY + '-ui', JSON.stringify({ tab: ui.tab, me: ui.me, fam: ui.fam, theme: ui.theme, superMode: ui.superMode, bdaySeen: ui.bdaySeen })); } catch (e) {}
}
function uid(p) { return p + Math.random().toString(36).slice(2, 8); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function fam(id) { return S.families.find(function (f) { return f.id === id; }); }
function person(id) { return S.people.find(function (p) { return p.id === id; }); }
function meal(id) { return S.meals.find(function (m) { return m.id === id; }); }
function dayOf(k) { return S.days.find(function (d) { return d.k === k; }); }
function slotName(k) { var s = S.slots.find(function (x) { return x.k === k; }); return s ? s.name : k; }
function me() { return person(ui.me) || (S.people.filter(function (p) { return p.role === 'admin'; })[0] || S.people[0]); }
function initial(name) { return (name || '?').slice(0, 1).toUpperCase(); }
/* Quién activa cada easter egg: viene de los datos (S.trip.eggs), no del código */
function eggRole(pid) {
  var e = (S.trip && S.trip.eggs) || {};
  if (pid === e.bday) return 'bday';
  if (pid === e.baby) return 'baby';
  if ((e.grand || []).indexOf(pid) >= 0) return 'grand';
  return null;
}
function nameOf(pid, fb) { var p = person(pid); return p ? p.name : (fb || ''); }
function babyName() { return nameOf(S.trip.eggs && S.trip.eggs.baby, 'el peque'); }
function bdayName() { return nameOf(S.trip.eggs && S.trip.eggs.bday, 'el cumpleañero'); }
function av(pid, cls) {
  var p = person(pid); if (!p) return '';
  var f = fam(p.family);
  var er = eggRole(p.id), egg = er ? ' data-egg="' + er + '"' : '';
  return '<span class="av ' + (cls || '') + ' ' + (f ? f.color : '') + '"' + egg + ' title="' + esc(p.name) + '" aria-hidden="true">' + (p.avatar ? '<img src="' + p.avatar + '" alt="" loading="lazy" decoding="async">' : initial(p.name)) + '</span>';
}
function pname(pid) {
  var p = person(pid); if (!p) return '';
  var er = eggRole(p.id), egg = er ? ' data-egg="' + er + '"' : '';
  return '<span' + egg + '>' + esc(p.name) + '</span>';
}
function famTag(fid) {
  var f = fam(fid); if (!f) return '<span class="muted">Sin asignar</span>';
  return '<span class="row" style="gap:6px;display:inline-flex"><i class="fam-dot ' + f.color + '"></i>' + esc(f.name) + '</span>';
}
function mealTime(m) { return m.time || SLOT_T[m.slot]; }
function dt(day, time) { return new Date(day + 'T' + time + ':00+02:00'); }
function ownerLabel(o) {
  if (!o) return 'Libre';
  if (person(o)) return person(o).name;
  if (fam(o)) return fam(o).name;
  return o;
}

/* ---------- Permisos (en v0.2 los aplica la base de datos con RLS) ---------- */
function can(what, target) {
  var r = me().role;
  if (r === 'admin') return true;
  if (what === 'access') return false;
  if (r === 'editor') return true;
  if (what === 'vote') return true;
  if (what === 'attend') return target === me().id;
  return false;
}
function guard(what, target) {
  if (can(what, target)) return true;
  toast(what === 'access' ? 'Solo el admin gestiona los accesos' : 'Estás en modo lector. Pide al admin que te haga editor');
  return false;
}

/* ---------- Iconos (trazo, 24px) ---------- */
var IC = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5h4v5"/>',
  meals: '<path d="M7 3v8"/><path d="M4.5 3v5a2.5 2.5 0 0 0 5 0V3"/><path d="M7 11v10"/><path d="M17 21V3c-2.2 1.3-3.5 4-3.5 7v4H17"/>',
  cart: '<path d="M3 4h2.5l2.2 11h10.6l2-8H6.6"/><circle cx="9.5" cy="19.5" r="1.4"/><circle cx="17" cy="19.5" r="1.4"/>',
  plans: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  coins: '<ellipse cx="9" cy="7" rx="5.5" ry="2.5"/><path d="M3.5 7v4c0 1.4 2.5 2.5 5.5 2.5s5.5-1.1 5.5-2.5V7"/><path d="M3.5 11v4c0 1.4 2.5 2.5 5.5 2.5 1 0 2-.1 2.8-.4"/><circle cx="16.5" cy="16" r="4.5"/><path d="M16.5 14v4"/>',
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/>',
  partly: '<circle cx="9" cy="9" r="3.5"/><path d="M9 2.5v1.5M2.5 9H4M4.4 4.4l1 1M13.6 4.4l-1 1"/><path d="M8 20h9.5a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.6 1.2A3 3 0 0 0 8 20Z"/>',
  cloud: '<path d="M7 19h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 19Z"/>',
  rain: '<path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 15Z"/><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"/>',
  fog: '<path d="M4 9h16M6 13h12M4 17h16"/>',
  storm: '<path d="M7 15h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.5 1.6A3.3 3.3 0 0 0 7 15Z"/><path d="m12.5 15-2 3.5h3l-2 3.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><circle cx="17" cy="9" r="2.5"/><path d="M17.5 14.3c2.2.4 3.6 2 4 4.7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  umbrella: '<path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"/><path d="M12 12v7a2 2 0 0 1-4 0"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M3.5 16h17v3h-17z"/><circle cx="7.5" cy="13" r=".8"/><circle cx="16.5" cy="13" r=".8"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  baby: '<circle cx="12" cy="7" r="3.5"/><path d="M6 21c0-4 2.7-7 6-7s6 3 6 7"/><path d="M10.5 7h.01M13.5 7h.01"/>',
  cake: '<path d="M4 21h16v-7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7Z"/><path d="M4 16c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0"/><path d="M9 12V9M15 12V9M9 6.5c0-.8.5-1.5 0-2.5M15 6.5c0-.8.5-1.5 0-2.5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"/><path d="M12 14v3.5M8.5 21h7M9.5 17.5h5V21h-5z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  house: '<path d="M3 20h18M5 20V9l7-5 7 5v11"/><path d="M9.5 20v-6h5v6"/>',
  bed: '<path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5"/><circle cx="7" cy="11" r="2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>',
  basket: '<path d="M4 10h16l-1.5 9.5h-13z"/><path d="m8 10 3-6M16 10l-3-6"/>',
  mountain: '<path d="m3 19 6-10 4 6 2.5-3.5L21 19z"/>'
};
function icon(n, cls) { return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }
function wxIcon(code) { return icon(L.wmo(code)[1]); }

/* ---------- Tema ---------- */
function applyTheme() {
  var r = document.documentElement;
  if (ui.theme === 'light' || ui.theme === 'dark') r.setAttribute('data-theme', ui.theme); else r.removeAttribute('data-theme');
}

/* ---------- Toast y sheets ---------- */
var toastTimer;
function toast(msg, actLabel, actFn) {
  var old = document.querySelector('.toast'); if (old) old.remove();
  var t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
  t.innerHTML = '<span>' + msg + '</span>' + (actLabel ? '<button type="button">' + esc(actLabel) + '</button>' : '');
  if (actLabel) t.querySelector('button').onclick = function () { t.remove(); actFn(); };
  document.body.appendChild(t);
  clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.remove(); }, actLabel ? 5200 : 2600);
}
function openSheet(html, onMount) {
  closeSheet();
  var s = document.createElement('div'); s.className = 'scrim'; s.id = 'scrim';
  s.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>' + html + '</div>';
  s.addEventListener('click', function (e) { if (e.target === s) closeSheet(); });
  document.body.appendChild(s);
  document.body.style.overflow = 'hidden';
  if (onMount) onMount(s.querySelector('.sheet'));
  var f = s.querySelector('input:not([disabled]),select:not([disabled]),button'); if (f && f.tagName !== 'BUTTON') setTimeout(function () { f.focus(); }, 60);
}
function closeSheet() { var s = document.getElementById('scrim'); if (s) s.remove(); document.body.style.overflow = ''; }
function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }
function numVal(id) { var v = val(id).replace(',', '.').trim(); if (v === '') return null; var n = parseFloat(v); return isNaN(n) ? null : n; }

/* ---------- Shell ---------- */
var TABS = [
  { k: 'inicio', t: 'Inicio', i: 'home' },
  { k: 'comidas', t: 'Comidas', i: 'meals' },
  { k: 'compra', t: 'Compra', i: 'cart' },
  { k: 'planes', t: 'Planes', i: 'plans' },
  { k: 'cuentas', t: 'Cuentas', i: 'coins' }
];
function splitLast(t) { var i = t.lastIndexOf(' '); return i < 0 ? ['', t] : [t.slice(0, i), t.slice(i + 1)]; }
function wordmarkText() { var p = splitLast(S.trip.short || S.trip.name); return esc(p[0]) + ' <i>' + esc(p[1]) + '</i>'; }
function renderTop() {
  var p = me();
  $top.innerHTML =
    '<button class="wordmark" data-act="logo" aria-label="' + esc(S.trip.name) + ', ir a inicio"><svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><g stroke="currentColor" stroke-width="1.3" opacity=".75"><path d="M4 18 11 6l9 4 2 10-9 2z"/><path d="M11 6l2 16M4 18l16-8"/></g><g fill="var(--crimson)"><circle cx="4" cy="18" r="2.3"/><circle cx="11" cy="6" r="2.3"/><circle cx="20" cy="10" r="2.3"/><circle cx="22" cy="20" r="2.3"/><circle cx="13" cy="22" r="2.3"/></g></svg><b>' + wordmarkText() + '</b></button>' +
    '<span class="sp"></span>' +
    '<span id="onlineSlot">' + presencePill() + '</span>' +
    '<button class="me-btn" data-act="menu" aria-label="Quién eres y más opciones">' + av(p.id, 'sm') + '<span style="display:flex;flex-direction:column;align-items:flex-start;line-height:1.1"><span style="font-weight:700;font-size:.9rem">' + esc(p.name) + '</span><span class="role">' + ROLE[p.role] + '</span></span></button>';
}
function renderNav() {
  $nav.innerHTML = '<div class="nav-in">' + TABS.map(function (t) {
    return '<button data-act="tab" data-tab="' + t.k + '"' + (ui.tab === t.k ? ' aria-current="page"' : '') + '>' + icon(t.i) + '<span>' + t.t + '</span></button>';
  }).join('') + '</div>';
}
var VIEWS = {};
var afterRender = [];
function render(keepScroll) {
  var y = window.scrollY;
  stopHero();
  afterRender = [];
  var fn = VIEWS[ui.tab] || VIEWS.inicio;
  $main.innerHTML = '<div class="view" data-view="' + ui.tab + '">' + fn() + '</div>';
  renderTop(); renderNav();
  afterRender.forEach(function (f) { f(); });
  if (keepScroll) window.scrollTo(0, y);
}
function go(tab, opts) {
  ui.tab = tab; Object.assign(ui, opts || {}); saveUi(); render(); window.scrollTo(0, 0);
}
function tripDayDefault() {
  var today = new Date().toISOString().slice(0, 10);
  return S.days.some(function (d) { return d.k === today; }) ? today : S.days[0].k;
}
function daySelector(act) {
  return '<div class="days" role="group" aria-label="Día">' + S.days.map(function (d) {
    return '<button class="day' + (d.star ? ' star' : '') + '" data-act="' + act + '" data-day="' + d.k + '" aria-pressed="' + (ui.day === d.k) + '">' + esc(d.short) + '<small>' + (d.star ? 'Cumple' : d.k === S.days[0].k ? 'Llegada' : d.k === S.days[S.days.length - 1].k ? 'Salida' : 'Día' ) + '</small></button>';
  }).join('') + '</div>';
}
