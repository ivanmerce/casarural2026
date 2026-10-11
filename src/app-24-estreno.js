/* ===================== Estreno de la gala y ranking congelado =====================
   La gala se estrena cuando el admin lo decide. En ese momento se guardan (app_config «gala») el ranking y los premios
   tal y como están: a partir de ahí, todo lo que lee el ranking o los premios usa esa foto fija, aunque se jueguen más juegos.
   A todos les salta el aviso una vez. El admin puede deshacer el estreno si se ha equivocado. */
(function () {
  var liveRank = G.ranking, liveAwards = G.awards, liveTally = G.tally;
  function copy(x) { return JSON.parse(JSON.stringify(x)); }
  G.ranking = function (S2) { var f = galaFrozen(); return f && f.rank ? copy(f.rank) : liveRank(S2); };
  G.awards = function (S2) { var f = galaFrozen(); return f ? copy(f.awards) : liveAwards(S2); };
  G.tally = function (S2) {
    var f = galaFrozen(); if (!f) return liveTally(S2);
    var t = {}; S2.people.concat(S2.spies || []).forEach(function (p) { t[p.id] = []; });
    f.awards.forEach(function (a) { var seen = {}; (a.winners || []).forEach(function (w) { G.peopleOf(S2, w).forEach(function (pid) { if (t[pid] && !seen[pid]) { seen[pid] = 1; t[pid].push(a.id); } }); }); });
    return t;
  };
  G.live = { ranking: liveRank, awards: liveAwards };
})();

function galaSaveState(v) {
  S.galaState = v;
  return (typeof PHOTOS !== 'undefined' && PHOTOS.demo === false && window.CLOUD && CLOUD.sb)
    ? CLOUD.sb().from('app_config').upsert({ key: 'gala', value: v }).then(function (r) { if (r.error) throw r.error; })
    : Promise.resolve();
}
function galaSeenKey() { return KEY + '-galaSeen-' + (ui.me || 'anon'); }
/* aviso a todos, una sola vez, cuando el admin estrena la gala */
setInterval(function () {
  try {
    var g = S && S.galaState; if (!g || !g.open || !ui.me || typeof gala === 'undefined' || gala) return;
    var seen = null; try { seen = localStorage.getItem(galaSeenKey()); } catch (e) { seen = ui._galaSeen; }
    if (seen === g.at) return;
    ui._galaSeen = g.at; try { localStorage.setItem(galaSeenKey(), g.at); } catch (e) {}
    confetti(2600); try { fanfare(); } catch (e) {}
    message('<div class="code-pop">🏆</div><h2>¡Empieza la gala!</h2><p>Todos al salón. El ranking y los premios ya están cerrados.</p><button class="btn primary" id="gala-go-now">' + icon('play') + 'Ver la gala</button>', 9000);
    var b = document.getElementById('gala-go-now');
    if (b) b.addEventListener('click', function (e) { e.stopPropagation(); var m = document.querySelector('.egg-msg'); if (m) m.remove(); galaOpen('gala'); });
  } catch (e) {}
}, 4000);

Object.assign(A, {
  galaPremiere: function (el) {
    if (!can('access')) return;
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = icon('trophy') + '¿Seguro? Se congela el ranking. Toca otra vez'; return; }
    el.disabled = true;
    var at = new Date().toISOString();
    var v = { open: true, at: at, rank: G.live.ranking(S), awards: G.live.awards(S) };
    try { localStorage.setItem(galaSeenKey(), at); } catch (e) {} ui._galaSeen = at;
    galaSaveState(v).then(function () { render(true); galaOpen('gala'); }, function () { el.disabled = false; toast('No he podido estrenar la gala. ¿Hay conexión?'); });
  },
  galaReopen: function (el) {
    if (!can('access')) return;
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.textContent = '¿Seguro? El ranking vuelve a moverse. Toca otra vez'; return; }
    galaSaveState({ open: false, at: null }).then(function () { render(true); toast('Estreno deshecho: el ranking vuelve a estar vivo'); }, function () { toast('No he podido deshacerlo'); });
  }
});
