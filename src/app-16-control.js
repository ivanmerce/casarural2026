/* ===================== Cómo vamos: desplegables compartidos =====================
   Dos cosas que todos ven para que todos sean conscientes, sin añadir pantallas nuevas:
   · Registro en la finca: quién lo ha hecho y quién falta (con recordatorio por WhatsApp).
   · Secretos: qué secretos lleva cada uno. Solo ves el nombre de los que tú también has encontrado (sin spoilers).
   Los desplegables recuerdan si están abiertos aunque la app se refresque en directo. */
function fold(k) { ui.folds = ui.folds || {}; return !!ui.folds[k]; }
/* El cuerpo se pinta siempre y solo se muestra u oculta: abrir no repinta la pantalla (sin fogonazos) */
function foldBody(k, html, cls) { return '<div class="fold-body' + (cls ? ' ' + cls : '') + '" data-fold="' + esc(k) + '"' + (fold(k) ? '' : ' hidden') + '>' + html + '</div>'; }
function foldBtn(k, inner, cls) {
  return '<button class="fold-head' + (cls ? ' ' + cls : '') + '" data-act="fold" data-k="' + esc(k) + '" aria-expanded="' + fold(k) + '">' + inner + '<span class="fold-chev" aria-hidden="true">' + icon('arrow') + '</span></button>';
}

/* ---------- Registro en la finca ---------- */
function regCardHome() {
  var F = S.finca || {}; if (!F.register || typeof regPeople !== 'function') return '';
  var rp = regPeople(); if (!rp.length) return '';
  var done = rp.filter(function (p) { return regDone(p.id); }), pend = rp.filter(function (p) { return !regDone(p.id); }), all = !pend.length;
  var stack = '<span class="av-stack">' + rp.slice().sort(function (a, b) { return regDone(b.id) - regDone(a.id); }).map(function (p) {
    return '<span class="avs-i' + (regDone(p.id) ? ' ok' : '') + '">' + av(p.id, 'xs') + '</span>';
  }).join('') + '</span>';
  var h = '<section class="card fold-card reg-card">' +
    foldBtn('reg', '<span class="grow"><b class="fold-title">Registro en la finca</b><small class="muted">' + (all ? '¡Todos registrados! La ley, contenta' : 'Faltan ' + pend.length + ' · obligatorio desde los ' + (F.register.minAge || 14) + ' años') + '</small></span>' + stack + '<span class="pill ' + (all ? 'ok' : 'warn') + '">' + done.length + '/' + rp.length + '</span>') +
    '<div class="bar reg-bar"><i style="width:' + Math.round(done.length / rp.length * 100) + '%"></i></div>';
  {
    h += foldBody('reg', '' +
      (pend.length ? '<p class="eyebrow">Faltan</p><div class="reg-who">' + pend.map(function (p) { return '<span class="who-chip pend">' + av(p.id, 'xs') + esc(p.name) + '</span>'; }).join('') + '</div>' : '') +
      (done.length ? '<p class="eyebrow">Ya registrados</p><div class="reg-who">' + done.map(function (p) { return '<span class="who-chip ok">' + av(p.id, 'xs') + esc(p.name) + ' ✓</span>'; }).join('') + '</div>' : '') +
      '<div class="row wrap fold-actions">' +
      (pend.length ? '<a class="btn" href="https://wa.me/?text=' + encodeURIComponent(regNag(pend)) + '" target="_blank" rel="noopener">' + icon('phone') + 'Recordárselo por WhatsApp</a>' : '') +
      '<button class="btn ghost" data-act="tab" data-tab="finca" data-fsub="info">' + icon('edit') + 'Ir al registro</button></div>' +
      '<p class="small muted">Cada uno marca su nombre en La Finca cuando ha rellenado el formulario. Lo ve toda la familia.</p>');
  }
  return h + '</section>';
}
function regNag(pend) {
  var F = S.finca || {}, names = pend.map(function (p) { return p.name; });
  var list = names.length > 1 ? names.slice(0, -1).join(', ') + ' y ' + names[names.length - 1] : names[0];
  return '¡Hola! ' + list + ': os falta registraros en la web de la finca (es obligatorio y son 3 minutos con el DNI a mano): ' + F.register.url +
    ' Cuando lo hagáis, marcadlo en la app, que os estamos vigilando con cariño. Casa Rural 2026';
}

/* ---------- Secretos: quién lleva cuáles ---------- */
function rankedKeys() { var f = foundMap(), c = secretsClose().getTime(); return EGGS.filter(function (e) { return f[e.k] && new Date(f[e.k]).getTime() < c; }).map(function (e) { return e.k; }); }
function keysOf(pid) { if (pid === ui.me) return rankedKeys(); var st = (S.stats || {})[pid]; return (st && st.keys) || []; }
function eggDots(keys) {
  var has = {}; keys.forEach(function (k) { has[k] = 1; });
  return '<span class="egg-dots" aria-hidden="true">' + EGGS.map(function (e) { return '<i' + (has[e.k] ? ' class="on"' : '') + '></i>'; }).join('') + '</span>';
}
function secretsWho(compact) {
  var rk = secretsRanking().filter(function (r) { return r.n > 0; }), mineF = foundMap();
  if (!rk.length) return '<p class="small muted">Nadie ha encontrado ninguno todavía. Empieza tú, anda.</p>';
  return '<div class="who-list">' + rk.map(function (r) {
    var keys = keysOf(r.id), k = 'sec-' + r.id, open = fold(k);
    var known = keys.filter(function (x) { return mineF[x]; }), hidden = Math.max(0, r.n - known.length);
    var head = medal(r.pos) + av(r.id, 'sm') + '<span class="grow"><b>' + pname(r.id) + (r.id === ui.me ? ' <small class="muted">(tú)</small>' : '') + '</b>' + eggDots(keys) + '</span><span class="num">' + r.n + '/' + EGGS.length + '</span>';
    var body = foldBody(k, '' +
        (known.length ? '<div class="reg-who">' + known.map(function (x) { var e = EGGS.find(function (y) { return y.k === x; }); return '<span class="who-chip ok">' + esc(e ? e.name : x) + '</span>'; }).join('') + '</div>' : '') +
        (hidden ? '<p class="small muted">' + (known.length ? '+ ' : '') + hidden + (hidden === 1 ? ' secreto que tú aún no has encontrado' : ' secretos que tú aún no has encontrado') + '. No hay spoilers: búscalos.</p>' : '') +
        (!keys.length && r.n ? '<p class="small muted">El detalle aparecerá cuando ' + pname(r.id) + ' vuelva a abrir la app.</p>' : ''), 'who-body');
    return '<div class="who-row' + (r.id === ui.me ? ' me' : '') + (open ? ' open' : '') + '">' + foldBtn(k, head, 'who-head') + body + '</div>';
  }).join('') + '</div><p class="small muted">Solo ves el nombre de los secretos que tú también has encontrado. Toca a alguien para ver cuáles lleva.</p>';
}
Object.assign(A, {
  fold: function (el) {
    ui.folds = ui.folds || {}; var k = el.dataset.k, open = !ui.folds[k]; ui.folds[k] = open;
    /* se cambia solo ese desplegable (en Inicio y, si está abierta, en la hoja): nada se repinta */
    document.querySelectorAll('[data-act="fold"][data-k="' + k + '"]').forEach(function (b) {
      b.setAttribute('aria-expanded', open);
      var row = b.closest('.who-row'); if (row) row.classList.toggle('open', open);
    });
    document.querySelectorAll('.fold-body[data-fold="' + k + '"]').forEach(function (d) { d.hidden = !open; });
  }
});
