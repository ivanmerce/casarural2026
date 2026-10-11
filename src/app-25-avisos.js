/* ===================== v0.7.59 · Avisos al entrar =====================
   Dos ventanitas que saltan en el Inicio, de una en una y una sola vez por persona:
   1) «Han aparecido dos sobres»: en cuanto los sobres lacrados están a la vista de todos (visible / visible_from).
   2) «Los secretos se acaban hoy a las 18:00»: el día del cierre, antes de la hora.
   Nunca tapan la gala, un sobre abierto, una hoja abierta ni el aviso de un secreto. */
var AV = { busy: false, born: Date.now() };
function avKey(k) { return KEY + '-aviso-' + k + '-' + (ui.me || 'anon'); }
function avSeen(k) { var v = null; try { v = localStorage.getItem(avKey(k)); } catch (e) {} return v || (ui['_av_' + k] || null); }
function avMark(k) { ui['_av_' + k] = '1'; try { localStorage.setItem(avKey(k), '1'); } catch (e) {} }
function avBlocked() {
  if (AV.busy || !S || !ui.me || ui.tab !== 'inicio' || document.hidden) return true;
  if (typeof gala !== 'undefined' && gala) return true;
  if (typeof SB !== 'undefined' && SB.open) return true;
  return !!document.querySelector('.aviso, .egg-msg, .sobre, .scrim, #gala, .gim-kid, .gim-gate, .viewer, .fumata');
}
function avNum(n) { return n === 1 ? 'un sobre' : n === 2 ? 'dos sobres' : n + ' sobres'; }
function avList(a) { return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]; }
function avUniq(a) { return a.filter(function (x, i) { return x && a.indexOf(x) === i; }); }

function avShow(o) {
  AV.busy = true;
  var el = document.createElement('div');
  el.className = 'aviso'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'aviso-t');
  el.innerHTML = '<div class="aviso-box ' + (o.cls || '') + '">' + (o.top || '') +
    '<h2 id="aviso-t">' + o.title + '</h2><p>' + o.text + '</p>' +
    '<div class="aviso-btns"><button type="button" class="btn primary" data-av="go">' + o.go + '</button>' +
    '<button type="button" class="btn ghost" data-av="ok">' + (o.ok || 'Entendido') + '</button></div></div>';
  function close(go) {
    if (!el.parentNode) return;
    el.classList.add('out'); document.removeEventListener('keydown', key);
    setTimeout(function () { el.remove(); AV.busy = false; if (go && o.onGo) o.onGo(); }, 220);
  }
  function key(e) { if (e.key === 'Escape') close(false); }
  el.addEventListener('click', function (e) {
    e.stopPropagation();
    var b = e.target.closest && e.target.closest('[data-av]');
    if (b) close(b.dataset.av === 'go'); else if (e.target === el) close(false);
  });
  document.addEventListener('keydown', key);
  document.body.appendChild(el);
  try { if (navigator.vibrate) navigator.vibrate([18, 40, 18]); } catch (e) {}
  setTimeout(function () { var b = el.querySelector('[data-av=go]'); if (b) try { b.focus({ preventScroll: true }); } catch (e) {} }, 60);
}

/* 1) Los sobres */
function avSobres() {
  if (typeof SB === 'undefined' || typeof sbCloud !== 'function' || !sbCloud() || avSeen('sobres')) return false;
  if (!SB.at) return 'wait';   /* aún no ha llegado la lista de sobres: esperamos un poco antes del otro aviso */
  var vis = SB.list.filter(function (l) { return sbVisNow(l) && person(l.to_person); });
  if (!vis.length) return false;
  var n = vis.length, Num = avNum(n).charAt(0).toUpperCase() + avNum(n).slice(1);
  var to = avUniq(vis.map(function (l) { return l.to_person; })), keepers = avUniq(vis.map(function (l) { return l.keeper; }));
  var toN = avList(to.map(function (p) { return esc(nameOf(p)); })), kN = avList(keepers.map(function (p) { return esc(nameOf(p, 'quien tiene la llave')); }));
  var mine = keepers.indexOf(ui.me) >= 0, forMe = to.indexOf(ui.me) >= 0;
  var title, text;
  if (mine) {
    title = n === 1 ? 'Tu sobre ya está a la vista' : 'Tus ' + avNum(n) + ' ya están a la vista';
    text = 'Desde ahora toda la familia ve ' + (n === 1 ? 'el sobre cerrado' : 'los ' + avNum(n) + ' cerrados') + ' en su Inicio y le acaba de saltar este mismo aviso. La llave solo la tienes tú: tú decides cuándo se rompe el lacre.';
  } else if (forMe) {
    title = n === 1 ? 'Ha aparecido un sobre para ti' : 'Han aparecido ' + avNum(n) + ' para ti';
    text = 'Lacrado' + (n === 1 ? '' : 's') + ' y con tu nombre. La llave la tiene ' + kN + ', así que toca esperar. Mirar' + (n === 1 ? 'lo' : 'los') + ' sí puedes. Sacudir el móvil no sirve (lo hemos probado).';
  } else {
    title = n === 1 ? 'Ha aparecido un sobre' : 'Han aparecido ' + avNum(n);
    text = Num + ' lacrado' + (n === 1 ? '' : 's') + ' para ' + toN + ' en el Inicio. La llave la tiene ' + kN + ': mirar se puede, abrir todavía no. Ni con el vapor de la cafetera.';
  }
  avMark('sobres');
  avShow({
    cls: 'is-sobres', title: title, text: text, go: icon('mail') + (n === 1 ? 'Verlo' : 'Verlos'), ok: 'Vale',
    top: '<div class="aviso-envs" aria-hidden="true">' + vis.slice(0, 3).map(function (l, i) { return '<span style="--i:' + i + '">' + sbMiniEnv(sbMark(l)) + '</span>'; }).join('') + '</div>',
    onGo: function () {
      var c = document.querySelector('.sb-card'); if (!c) return;
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      c.classList.remove('aviso-flash'); void c.offsetWidth; c.classList.add('aviso-flash');
    }
  });
  return true;
}

/* 2) El cierre de los secretos */
function avCierre() {
  if (typeof secretsCloseDay !== 'function' || !secretsCloseDay() || !EGGS.length) return false;
  var k = 'cierre-' + secretsCloseIso().slice(0, 10); if (avSeen(k)) return false;
  var f = foundCount(), N = EGGS.length, h = closeHour(), all = f >= N;
  avMark(k);
  avShow({
    cls: 'is-cierre', title: 'Los secretos se acaban hoy a las ' + h,
    text: all
      ? 'Los tienes todos: <b class="num">' + f + '/' + N + '</b>. A las ' + h + ' se cierra el ranking. Ahora solo te queda presumir en la gala.'
      : 'Llevas <b class="num">' + f + '/' + N + '</b>. A las ' + h + ' se cierra el ranking y lo que no hayas encontrado se queda en el cajón. Hasta la próxima casa rural, por lo menos.',
    go: icon('search') + (all ? 'Ver el ranking' : 'Buscar secretos'), ok: 'Luego',
    top: '<div class="aviso-clock" aria-hidden="true"><span class="num">' + h + '</span></div>',
    onGo: function () { if (A.secrets) A.secrets(); }
  });
  return true;
}

setInterval(function () {
  try {
    if (avBlocked() || Date.now() - AV.born < 2500) return;
    var s = avSobres();
    if (s === true) return;
    if (s === 'wait' && Date.now() - AV.born < 12000) return;
    avCierre();
  } catch (e) {}
}, 1500);
