/* ===================== Álbum de fotos =====================
   Todos (también los peques) suben fotos desde el móvil. Se reducen en el propio móvil antes de subir
   (1600 px y miniatura de 480 px) para que vaya rápido con la WiFi de la finca y quepa todo en el plan gratuito.
   Demo: las fotos se quedan en memoria. Nube: Supabase Storage (bucket privado) + tabla photos. */

var PHOTOS = {
  demo: true, urls: {},
  url: function (p) { return PHOTOS.urls[p] || null; },
  add: function (full, thumb, meta) {
    var id = uid('ph'); PHOTOS.urls[id + '.jpg'] = full.url; PHOTOS.urls[id + '_t.jpg'] = thumb.url;
    S.photos = S.photos || []; S.photos.push({ id: id, path: id + '.jpg', thumb: id + '_t.jpg', by: me().id, day: meta.day, caption: '', w: full.w, h: full.h, at: new Date().toISOString() });
    return Promise.resolve();
  },
  remove: function (ph) { S.photos = S.photos.filter(function (x) { return x.id !== ph.id; }); return Promise.resolve(); },
  like: function (ph, on) { S.photoLikes = S.photoLikes || {}; var l = S.photoLikes[ph.id] = S.photoLikes[ph.id] || []; var k = l.indexOf(me().id); if (on && k < 0) l.push(me().id); if (!on && k >= 0) l.splice(k, 1); return Promise.resolve(); },
  caption: function (ph, txt) { ph.caption = txt; return Promise.resolve(); },
  ensure: function () { return Promise.resolve(false); }
};

function photoList() { return (S.photos || []).slice().sort(function (a, b) { return (b.at || '').localeCompare(a.at || ''); }); }
function likesOf(ph) { return (S.photoLikes && S.photoLikes[ph.id]) || []; }
function canDelPhoto(ph) { return ph.by === me().id || can('edit'); }
function thumbImg(ph, cls) {
  var u = PHOTOS.url(ph.thumb);
  return u ? '<img src="' + u + '" alt="' + esc(ph.caption || 'Foto de ' + nameOf(ph.by)) + '" loading="lazy" decoding="async"' + (cls ? ' class="' + cls + '"' : '') + '>' : '<span class="ph-wait" aria-hidden="true"></span>';
}
function uploadBtn(cls, label) {
  if (typeof isKid === 'function' && isKid()) return '<button class="btn ' + (cls || 'primary') + '" data-act="phNope">' + icon('camera') + (label || 'Subir fotos') + '</button>';
  return '<label class="btn ' + (cls || 'primary') + '" for="ph-in-' + (cls || 'p') + '" style="cursor:pointer">' + icon('camera') + (label || 'Subir fotos') + '</label><input id="ph-in-' + (cls || 'p') + '" type="file" accept="image/*" multiple hidden data-change="phUpload">';
}

/* ---------- Tarjeta de Inicio ---------- */
function albumCard() {
  var ps = photoList();
  PHOTOS.ensure(ps.slice(0, 6).map(function (p) { return p.thumb; }));
  return '<section class="card"><div class="card-head"><h3 class="row" style="gap:8px">' + icon('camera') + 'Álbum de fotos</h3><button class="link" data-act="tab" data-tab="album">' + (ps.length ? ps.length + (ps.length === 1 ? ' foto ' : ' fotos ') : 'Ver ') + icon('arrow') + '</button></div>' +
    (ps.length ? '<div class="ph-strip">' + ps.slice(0, 6).map(function (p) { return '<button class="ph" data-act="phOpen" data-id="' + p.id + '">' + thumbImg(p) + '</button>'; }).join('') + '</div>'
      : '<p class="small muted">Todavía no hay fotos. La primera que suba alguien se lleva el título de fotógrafo oficial (de momento).</p>') +
    uploadBtn('ghost', 'Subir fotos') + '</section>';
}

/* ---------- Vista ---------- */
VIEWS.album = function () {
  var f = ui.phf || 'all', ps = photoList();
  if (f === 'mine') ps = ps.filter(function (p) { return p.by === me().id; });
  if (f === 'fav') ps = ps.filter(function (p) { return likesOf(p).length; }).sort(function (a, b) { return likesOf(b).length - likesOf(a).length; });
  PHOTOS.ensure(ps.slice(0, 60).map(function (p) { return p.thumb; }));
  var all = photoList(), people = {}; all.forEach(function (p) { people[p.by] = (people[p.by] || 0) + 1; });
  var h = '<div class="view-head"><div><h2>Álbum</h2><p class="muted small">' + all.length + (all.length === 1 ? ' foto' : ' fotos') + ' de ' + Object.keys(people).length + (Object.keys(people).length === 1 ? ' persona' : ' personas') + '. Todo el mundo puede subir</p></div></div>';
  h += '<section class="card up-card"><div class="row"><span class="grow small">Sube las fotos del día desde el móvil. Se reducen solas para que suban rápido.</span></div>' + uploadBtn('primary', 'Subir fotos') + '<div id="ph-progress" class="small muted" aria-live="polite"></div>' +
    (PHOTOS.demo ? '<p class="small muted">En la demo las fotos solo viven mientras la tengas abierta. En la web de verdad se guardan para todos.</p>' : '') + '</section>';
  h += '<div class="chips" role="group" aria-label="Filtro"><button class="chip" data-act="phf" data-v="all" aria-pressed="' + (f === 'all') + '">Todas</button><button class="chip" data-act="phf" data-v="mine" aria-pressed="' + (f === 'mine') + '">Mis fotos</button><button class="chip" data-act="phf" data-v="fav" aria-pressed="' + (f === 'fav') + '">' + icon('heart') + 'Favoritas</button></div>';
  if (!ps.length) return h + '<div class="empty">' + icon('camera') + '<b>' + (f === 'all' ? 'El álbum está en blanco' : 'Nada por aquí') + '</b><span>' + (f === 'all' ? 'Las mejores fotos del finde empiezan aquí. Sin filtros, que salimos todos guapísimos.' : 'Cambia el filtro o sube alguna.') + '</span></div>';
  var groups = {}, order = [];
  ps.forEach(function (p) { var k = f === 'fav' ? 'fav' : (p.day || 'x'); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(p); });
  if (f !== 'fav') order.sort(function (a, b) { return a === 'x' ? 1 : b === 'x' ? -1 : b.localeCompare(a); });
  order.forEach(function (k) {
    var d = dayOf(k);
    h += '<p class="eyebrow">' + (k === 'fav' ? 'Las más queridas' : d ? esc(d.long) : 'Antes y después') + ' · ' + groups[k].length + '</p><div class="ph-grid">' +
      groups[k].map(function (p) { var n = likesOf(p).length; return '<button class="ph" data-act="phOpen" data-id="' + p.id + '">' + thumbImg(p) + (n ? '<span class="ph-likes">' + icon('heart') + n + '</span>' : '') + '</button>'; }).join('') + '</div>';
  });
  return h;
};

/* ---------- Visor a pantalla completa ---------- */
var viewer = null;
function viewerOpen(id) {
  var list = ui.tab === 'album' ? currentAlbumList() : photoList();
  var i = list.findIndex(function (p) { return p.id === id; }); if (i < 0) return;
  viewer = { list: list, i: i };
  var el = document.createElement('div'); el.className = 'viewer'; el.id = 'viewer'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Foto');
  el.innerHTML = '<div class="vw-top"><span class="vw-who"></span><button class="icon-btn" data-act="vwClose" aria-label="Cerrar">' + icon('x') + '</button></div><div class="vw-stage"><button class="vw-nav prev" data-act="vwPrev" aria-label="Anterior">' + icon('back') + '</button><div class="vw-img"></div><button class="vw-nav next" data-act="vwNext" aria-label="Siguiente">' + icon('arrow') + '</button></div><div class="vw-bot"></div>';
  document.body.appendChild(el); document.body.style.overflow = 'hidden'; overlayPush('viewer');
  var sx = null; el.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', function (e) { if (sx == null) return; var dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) { if (dx < 0) A.vwNext(); else A.vwPrev(); } sx = null; });
  viewerRender();
}
function currentAlbumList() {
  var f = ui.phf || 'all', ps = photoList();
  if (f === 'mine') ps = ps.filter(function (p) { return p.by === me().id; });
  if (f === 'fav') ps = ps.filter(function (p) { return likesOf(p).length; }).sort(function (a, b) { return likesOf(b).length - likesOf(a).length; });
  return ps;
}
function viewerRender() {
  var el = document.getElementById('viewer'); if (!el || !viewer) return;
  var p = viewer.list[viewer.i]; if (!p) { viewerClose(); return; }
  var full = PHOTOS.url(p.path), th = PHOTOS.url(p.thumb), liked = likesOf(p).indexOf(me().id) >= 0, d = dayOf(p.day);
  if (!full) PHOTOS.ensure([p.path, p.thumb]).then(function (ch) { if (ch) viewerRender(); });
  el.querySelector('.vw-who').innerHTML = av(p.by, 'sm') + '<span><b>' + esc(nameOf(p.by)) + '</b><small>' + (d ? esc(d.long) : '') + ' · ' + (viewer.i + 1) + '/' + viewer.list.length + '</small></span>';
  el.querySelector('.vw-img').innerHTML = full || th ? '<img src="' + (full || th) + '" alt="' + esc(p.caption || 'Foto') + '">' : '<span class="ph-wait big"></span>';
  el.querySelector('.vw-bot').innerHTML = (p.caption ? '<p class="vw-cap">' + esc(p.caption) + '</p>' : '') + '<div class="row wrap vw-actions">' +
    '<button class="btn ' + (liked ? 'primary' : '') + '" data-act="phLike" data-id="' + p.id + '">' + icon('heart') + likesOf(p).length + '</button>' +
    (p.by === me().id || can('edit') ? '<button class="btn" data-act="phCaption" data-id="' + p.id + '">' + icon('edit') + (p.caption ? 'Pie de foto' : 'Añadir pie') + '</button>' : '') +
    (full ? '<a class="btn" href="' + full + '" download="conclave-' + p.id + '.jpg" target="_blank" rel="noopener">Descargar</a>' : '') +
    (canDelPhoto(p) ? '<button class="btn danger" data-act="phDel" data-id="' + p.id + '">' + icon('trash') + '</button>' : '') + '</div>';
  el.querySelector('.prev').disabled = viewer.i === 0; el.querySelector('.next').disabled = viewer.i >= viewer.list.length - 1;
  [viewer.list[viewer.i + 1], viewer.list[viewer.i - 1]].forEach(function (x) { if (x && !PHOTOS.url(x.path)) PHOTOS.ensure([x.path]); });
}
function viewerClose(fromNav) { var el = document.getElementById('viewer'); if (el) el.remove(); document.body.style.overflow = ''; viewer = null; if (el && !fromNav) overlayDone(); }

/* ---------- Reducir antes de subir ---------- */
function shrink(file, max, q) {
  return new Promise(function (ok, ko) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var r = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), w = Math.round(img.naturalWidth * r), h = Math.round(img.naturalHeight * r);
      var c = document.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { if (!b) return ko(new Error('sin imagen')); ok({ blob: b, url: PHOTOS.demo ? c.toDataURL('image/jpeg', q) : null, w: w, h: h }); }, 'image/jpeg', q);
    };
    img.onerror = function () { URL.revokeObjectURL(url); ko(new Error('formato')); };
    img.src = url;
  });
}
function tripDayOf(ts) {
  var k = new Date(ts || Date.now()); k = new Date(k.getTime() - k.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  return S.days.some(function (d) { return d.k === k; }) ? k : null;
}

Object.assign(A, {
  phf: function (el) { ui.phf = el.dataset.v; render(true); },
  phOpen: function (el) { viewerOpen(el.dataset.id); },
  vwClose: function () { viewerClose(); },
  vwPrev: function () { if (viewer && viewer.i > 0) { viewer.i--; viewerRender(); } },
  vwNext: function () { if (viewer && viewer.i < viewer.list.length - 1) { viewer.i++; viewerRender(); } },
  phLike: function (el) {
    var p = (S.photos || []).find(function (x) { return x.id === el.dataset.id; }); if (!p) return;
    var on = likesOf(p).indexOf(me().id) < 0;
    S.photoLikes = S.photoLikes || {}; var l = S.photoLikes[p.id] = S.photoLikes[p.id] || []; if (on) { if (l.indexOf(me().id) < 0) l.push(me().id); } else l.splice(l.indexOf(me().id), 1);
    viewerRender(); if (on) egg('corazon'); if (on && navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}
    PHOTOS.like(p, on).catch(function () { toast('No he podido guardar el corazón'); });
  },
  phCaption: function (el) {
    var p = (S.photos || []).find(function (x) { return x.id === el.dataset.id; }); if (!p) return;
    var t = window.prompt('Pie de foto', p.caption || ''); if (t === null) return;
    t = t.trim().slice(0, 140); PHOTOS.caption(p, t).then(function () { p.caption = t; viewerRender(); render(true); }, function () { toast('No he podido guardar el pie de foto'); });
  },
  phDel: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Borrar? Toca otra vez'; return; }
    var p = (S.photos || []).find(function (x) { return x.id === el.dataset.id; }); if (!p) return;
    PHOTOS.remove(p).then(function () { S.photos = (S.photos || []).filter(function (x) { return x.id !== p.id; }); viewer.list = viewer.list.filter(function (x) { return x.id !== p.id; }); if (viewer.i >= viewer.list.length) viewer.i = viewer.list.length - 1; if (!viewer.list.length) viewerClose(); else viewerRender(); render(true); toast('Foto borrada'); }, function () { toast('No he podido borrarla'); });
  }
});
Object.assign(C, {
  phUpload: function (el) {
    var files = Array.prototype.slice.call(el.files || []).filter(function (f) { return /^image\//.test(f.type) || /\.(jpe?g|png|heic|webp)$/i.test(f.name); });
    el.value = ''; if (!files.length) return;
    var done = 0, fail = 0, prog = function () { var n = document.getElementById('ph-progress'); if (n) n.textContent = 'Subiendo ' + Math.min(done + fail + 1, files.length) + ' de ' + files.length + '…'; };
    prog(); toast('Subiendo ' + files.length + (files.length === 1 ? ' foto…' : ' fotos…'));
    var chain = Promise.resolve();
    files.forEach(function (f) {
      chain = chain.then(function () {
        prog();
        return Promise.all([shrink(f, 1600, 0.82), shrink(f, 480, 0.72)]).then(function (r) { return PHOTOS.add(r[0], r[1], { day: tripDayOf(f.lastModified) || tripDayOf() }); })
          .then(function () { done++; }, function () { fail++; });
      });
    });
    chain.then(function () {
      var n = document.getElementById('ph-progress'); if (n) n.textContent = '';
      render(true);
      if (done) { confetti(1200); toast(done + (done === 1 ? ' foto subida' : ' fotos subidas') + (fail ? ' · ' + fail + ' no se han podido leer' : '') + '. ¡Gracias, paparazzi!'); egg('foto'); if (photoList().length >= 50) egg('album'); }
      else toast('No he podido subir esas fotos. Prueba con otras (JPG o PNG)');
    });
  }
});
document.addEventListener('keydown', function (e) { if (!viewer) return; if (e.key === 'ArrowRight') A.vwNext(); else if (e.key === 'ArrowLeft') A.vwPrev(); else if (e.key === 'Escape') viewerClose(); });
A.phNope = function () {
  if (typeof hasEgg === 'function' && !hasEgg('foto')) { egg('foto'); return; }   /* intentarlo también cuenta */
  message('<div class="code-pop">' + icon('camera') + '</div><h2>' + (isSpy() ? 'Modo espía' : 'Modo explorador') + '</h2><p>' + (isSpy() ? 'Un buen espía hace fotos… pero no las publica. Aquí puedes ver el álbum entero; las fotos las suben los de la familia.' : 'Puedes ver todas las fotos del álbum. Para subir las tuyas, pásaselas a tus padres y que las suban ellos.') + '</p>');
};
