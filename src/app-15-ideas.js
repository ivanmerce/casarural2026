/* ===================== Buzón de ideas =====================
   La plataforma es de todos: cualquiera propone (juegos, comidas, cambios…), los demás apoyan con un «+1»
   y el organizador marca lo que ya está hecho. S.ideas: [{ id, by, text, at, status }] · S.ideaLikes: { id: [pid] } */
function orgName() { var a = S.people.find(function (p) { return p.role === 'admin'; }); return a ? a.name : 'el organizador'; }
var IDEA_ST = { nueva: 'Nueva', vista: 'Lo miramos', hecha: '¡Hecho!', no: 'Mejor no' };
function ideaLikes(id) { return (S.ideaLikes && S.ideaLikes[id]) || []; }
function ideasSorted() {
  return (S.ideas || []).slice().sort(function (a, b) { return (ideaLikes(b.id).length - ideaLikes(a.id).length) || String(b.at).localeCompare(String(a.at)); });
}
function ideaRow(x) {
  var likes = ideaLikes(x.id), mine = likes.indexOf(me().id) >= 0, st = x.status || 'nueva';
  return '<div class="idea' + (st === 'hecha' ? ' done' : st === 'no' ? ' no' : '') + '">' + av(x.by, 'sm') +
    '<div class="grow"><p>' + esc(x.text) + '</p><small class="muted">' + esc((person(x.by) || {}).name || '') + (st !== 'nueva' ? ' · <b class="idea-st st-' + st + '">' + IDEA_ST[st] + '</b>' : '') + '</small>' +
    (can('access') ? '<div class="row wrap idea-adm">' + Object.keys(IDEA_ST).map(function (k) { return '<button class="chip mini" data-act="ideaSt" data-id="' + x.id + '" data-v="' + k + '" aria-pressed="' + (st === k) + '">' + IDEA_ST[k] + '</button>'; }).join('') + '</div>' : '') + '</div>' +
    '<button class="vote" data-act="ideaLike" data-id="' + x.id + '" aria-pressed="' + mine + '" aria-label="Apoyar la idea">+1 <span class="num">' + likes.length + '</span></button>' +
    ((x.by === me().id || can('access')) ? '<button class="icon-btn sm" data-act="ideaDel" data-id="' + x.id + '" aria-label="Borrar la idea">' + icon('trash') + '</button>' : '') + '</div>';
}
function ideasCard() {
  var list = ideasSorted(), top = list.slice(0, 3);
  return '<section class="card ideas-card"><div class="card-head"><h3 class="row" style="gap:8px">' + icon('bulb') + 'Buzón de ideas</h3>' + (list.length ? '<button class="link" data-act="ideasAll">Todas (' + list.length + ') ' + icon('arrow') + '</button>' : '') + '</div>' +
    '<p class="small">La plataforma es <b>de todos</b>. ¿Un juego nuevo, quitar otro, una comida, un cambio en la app? Escríbelo aquí y apoya con <b>+1</b> lo que te guste. ' + esc(orgName()) + ' lo va moldeando.</p>' +
    '<div class="idea-new"><textarea id="idea-text" rows="2" maxlength="400" placeholder="Mi idea es…"></textarea><button class="btn primary" data-act="ideaAdd">' + icon('plus') + 'Enviar</button></div>' +
    (top.length ? '<div class="stack ideas-list">' + top.map(ideaRow).join('') + '</div>' : '<p class="small muted">Todavía no hay ninguna. Estrénalo, que no muerde.</p>') + '</section>';
}
function ideasSheet() {
  var list = ideasSorted();
  openSheet('<h2>Buzón de ideas</h2><p class="small muted">Ordenadas por apoyos. ' + (can('access') ? 'Tú puedes marcar cómo va cada una.' : esc(orgName()) + ' marca lo que ya está hecho.') + '</p>' +
    '<div class="stack ideas-list">' + (list.length ? list.map(ideaRow).join('') : '<p class="small muted">Nada por aquí.</p>') + '</div><button class="btn block" data-act="close">Cerrar</button>');
}
Object.assign(A, {
  ideaNew: function () { go('inicio'); setTimeout(function () { var t = document.getElementById('idea-text'); if (t) { t.scrollIntoView({ block: 'center' }); t.focus(); } }, 150); },
  ideaAdd: function () {
    var t = document.getElementById('idea-text'), v = t ? t.value.trim() : '';
    if (v.length < 3) { toast('Escribe tu idea primero (aunque sea corta)'); return; }
    S.ideas = S.ideas || []; S.ideas.push({ id: uid('id'), by: me().id, text: v.slice(0, 400), at: new Date().toISOString(), status: 'nueva' });
    save(); render(true); toast('¡Idea al buzón! Gracias por hacer la casa rural más chula');
  },
  ideaLike: function (el) {
    var id = el.dataset.id; S.ideaLikes = S.ideaLikes || {}; var l = S.ideaLikes[id] = S.ideaLikes[id] || [], k = l.indexOf(me().id);
    if (k >= 0) l.splice(k, 1); else l.push(me().id);
    save(); var open = !!document.querySelector('.sheet .ideas-list'); render(true); if (open) { closeSheet(); setTimeout(ideasSheet, 60); }
  },
  ideaSt: function (el) {
    if (!can('access')) return; var x = (S.ideas || []).find(function (i) { return i.id === el.dataset.id; }); if (!x) return;
    x.status = el.dataset.v; save(); var open = !!document.querySelector('.sheet .ideas-list'); render(true); if (open) { closeSheet(); setTimeout(ideasSheet, 60); }
    toast('Idea: ' + IDEA_ST[x.status]);
  },
  ideaDel: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.classList.add('armed'); toast('Toca otra vez la papelera para borrarla'); return; }
    var id = el.dataset.id; S.ideas = (S.ideas || []).filter(function (i) { return i.id !== id; }); if (S.ideaLikes) delete S.ideaLikes[id];
    save(); var open = !!document.querySelector('.sheet .ideas-list'); render(true); if (open) { closeSheet(); setTimeout(ideasSheet, 60); }
    toast('Idea borrada');
  },
  ideasAll: function () { ideasSheet(); }
});
