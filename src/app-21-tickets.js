/* ===================== Tickets de compra =====================
   Cada familia hace foto al ticket y lo sube desde Compra. Queda «por pasar» hasta que se pasa a la lista:
   cada producto queda comprado con sus unidades y su precio real, y lo que no estaba se añade.
   Nube: bucket privado «tickets» (carpeta por persona) + tabla tickets (RLS). Demo: en memoria. */

IC.receipt = '<path d="M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21V3Z"/><path d="M9 8h6M9 11.5h6M9 15h3.5"/>';
var TK = { list: [], at: 0, loading: false, ch: false, urls: {}, file: null, demoUrls: {} };
function tkCloud() { return typeof PHOTOS !== 'undefined' && PHOTOS.demo === false && window.CLOUD && CLOUD.sb; }
function tkBucket() { return CLOUD.sb().storage.from('tickets'); }

function tkLoad(force) {
  if (!tkCloud()) return Promise.resolve();
  if (TK.loading || (!force && Date.now() - TK.at < 20000)) return Promise.resolve();
  TK.loading = true;
  if (!TK.ch) {
    TK.ch = true;
    try { CLOUD.sb().channel('tickets').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, function () { tkLoad(true); }).subscribe(); } catch (e) {}
  }
  return CLOUD.sb().from('tickets').select('*').order('created_at', { ascending: false }).then(function (r) {
    TK.loading = false; TK.at = Date.now(); if (r.error) return;
    var before = JSON.stringify(TK.list); TK.list = r.data || [];
    if (JSON.stringify(TK.list) !== before && ui.tab === 'compra' && !document.getElementById('scrim')) render(true);
  }, function () { TK.loading = false; TK.at = Date.now(); });
}

function tkWhen(ts) {
  var d = new Date(ts); if (isNaN(d)) return '';
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' · ' + p(d.getHours()) + ':' + p(d.getMinutes());
}
function tkPill(t) {
  if (t.status === 'procesado') return '<span class="pill ok">' + icon('check') + 'En la lista</span>';
  if (t.status === 'descartado') return '<span class="pill pend">Descartado</span>';
  return '<span class="pill est">Por pasar</span>';
}
function tkCanUpload() { return !(typeof isKid === 'function' && isKid()) && !!me(); }

function ticketsCard() {
  tkLoad();
  var list = TK.list, pend = list.filter(function (t) { return t.status === 'pendiente'; }).length;
  var shown = ui.tkAll ? list : list.slice(0, 4);
  var h = '<section class="card tk-card"><div class="card-head"><h3>Tickets de compra</h3>' +
    (pend ? '<span class="pill est num">' + pend + ' por pasar</span>' : list.length ? '<span class="pill ok">Todo en la lista</span>' : '') + '</div>';
  h += '<p class="small muted">¿Venís del súper? Foto al ticket y para aquí. Se pasa a la lista: cada producto queda comprado con sus unidades y su precio, y lo que no estaba se añade. Nada de teclear precios con el carro en la mano.</p>';
  if (tkCanUpload()) h += '<label class="btn primary block" for="tk-in" style="cursor:pointer">' + icon('receipt') + 'Subir un ticket</label><input id="tk-in" type="file" accept="image/*" hidden data-change="tkPick">';
  if (list.length) {
    h += '<div class="tk-list">' + shown.map(function (t) {
      return '<button class="tk-row" data-act="tkOpen" data-id="' + esc(t.id) + '"><span class="tk-ico">' + icon('receipt') + '</span><span class="tk-txt"><b>' + esc(nameOf(t.person_id, 'Alguien')) + '</b> <small class="muted num">' + tkWhen(t.created_at) + '</small>' +
        (t.status === 'procesado' && t.result ? '<small class="tk-res">' + esc(t.result) + '</small>' : t.note ? '<small class="muted tk-note">«' + esc(t.note) + '»</small>' : '') + '</span>' +
        '<span class="tk-side">' + tkPill(t) + (t.total != null ? '<small class="num">' + L.money(Number(t.total)) + '</small>' : '') + '</span></button>';
    }).join('') + '</div>';
    if (list.length > 4) h += '<button class="link small" data-act="tkAll">' + (ui.tkAll ? 'Ver menos' : 'Ver los ' + list.length + ' tickets') + '</button>';
  } else if (!tkCloud()) h += '<p class="small muted">En la demo los tickets se quedan en este móvil.</p>';
  return h + '</section>';
}

function tkFind(id) { return TK.list.find(function (t) { return String(t.id) === String(id); }); }
function tkUrl(t) {
  if (!tkCloud()) return Promise.resolve(TK.demoUrls[t.id] || null);
  var c = TK.urls[t.path]; if (c && c.exp > Date.now()) return Promise.resolve(c.url);
  return tkBucket().createSignedUrl(t.path, 900).then(function (r) {
    var u = r && r.data && (r.data.signedUrl || r.data.signedURL); if (u) TK.urls[t.path] = { url: u, exp: Date.now() + 840000 }; return u || null;
  }, function () { return null; });
}

Object.assign(C, {
  tkPick: function (el) {
    var f = el.files && el.files[0]; el.value = ''; if (!f) return;
    if (!/^image\//.test(f.type) && !/\.(jpe?g|png|heic|webp)$/i.test(f.name)) { toast('Eso no parece una foto. Prueba con la cámara'); return; }
    TK.file = f;
    var prev = URL.createObjectURL(f);
    openSheet('<h2>Subir ticket</h2><div class="tk-prev"><img src="' + prev + '" alt="Vista previa del ticket"></div>' +
      '<label class="field"><span class="lbl">¿Algo que no haya que contar? <small class="muted">(opcional)</small></span><textarea id="tk-note" rows="3" maxlength="400" placeholder="Ej.: los pañales y el jamón dulce son nuestros"></textarea></label>' +
      '<p class="small muted">Comprueba que se lee el total. Si sale borroso, mejor repetir la foto con luz.</p>' +
      '<button class="btn primary block" data-act="tkSend">' + icon('receipt') + 'Subir ticket</button>');
  }
});

Object.assign(A, {
  tkAll: function () { ui.tkAll = !ui.tkAll; render(true); },
  tkSend: function (el) {
    if (!TK.file || el.disabled) return;
    var note = ((document.getElementById('tk-note') || {}).value || '').trim().slice(0, 400);
    el.disabled = true; el.innerHTML = 'Subiendo…';
    shrink(TK.file, 2200, 0.86).then(function (img) {
      if (!tkCloud()) {
        var id = uid('tk'); TK.demoUrls[id] = img.url || URL.createObjectURL(img.blob);
        TK.list.unshift({ id: id, person_id: me().id, family_id: me().family || null, path: id + '.jpg', note: note || null, status: 'pendiente', result: null, total: null, created_at: new Date().toISOString() });
        return;
      }
      var name = ui.me + '/' + ((window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)) + '.jpg';
      return tkBucket().upload(name, img.blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '3600' }).then(function (r) { if (r.error) throw r.error; })
        .then(function () { return CLOUD.sb().from('tickets').insert({ person_id: ui.me, family_id: me().family || null, path: name, note: note || null }).select().single(); })
        .then(function (r) { if (r.error) throw r.error; TK.urls[name] = { url: URL.createObjectURL(img.blob), exp: Infinity }; TK.list.unshift(r.data); TK.at = Date.now(); });
    }).then(function () {
      TK.file = null; closeSheet(); render(true);
      confetti(900); toast('Ticket recibido. En cuanto se pase, lo verás en la lista con sus precios');
    }, function () {
      el.disabled = false; el.innerHTML = icon('receipt') + 'Subir ticket';
      toast('No he podido subir el ticket. Prueba otra vez (mejor con WiFi)');
    });
  },
  tkOpen: function (el) {
    var t = tkFind(el.dataset.id); if (!t) return;
    var mine = t.person_id === ui.me, adm = me() && me().role === 'admin';
    openSheet('<h2>Ticket de ' + esc(nameOf(t.person_id, 'alguien')) + '</h2><p class="small muted num">' + tkWhen(t.created_at) + ' · ' + tkPill(t) + '</p>' +
      '<div class="tk-big" id="tk-big"><span class="ph-wait" aria-hidden="true"></span></div>' +
      (t.note ? '<p class="small"><b>Nota:</b> «' + esc(t.note) + '»</p>' : '') +
      (t.result ? '<p class="small"><b>Pasado a la lista:</b> ' + esc(t.result) + (t.total != null ? ' · <b class="num">' + L.money(Number(t.total)) + '</b>' : '') + '</p>' : '') +
      '<div class="row wrap">' +
      (adm && t.status === 'pendiente' ? '<button class="btn" data-act="tkMark" data-id="' + esc(t.id) + '" data-v="procesado">' + icon('check') + 'Ya está en la lista</button>' : '') +
      ((mine || adm) && t.status === 'pendiente' ? '<button class="btn ghost" data-act="tkDel" data-id="' + esc(t.id) + '">' + icon('trash') + 'Borrar</button>' : '') +
      '</div>');
    tkUrl(t).then(function (u) {
      var b = document.getElementById('tk-big'); if (!b) return;
      b.innerHTML = u ? '<a href="' + u + '" target="_blank" rel="noopener"><img src="' + u + '" alt="Foto del ticket"></a><small class="muted">Toca la foto para verla en grande</small>' : '<p class="small muted">No he podido cargar la foto.</p>';
    });
  },
  tkMark: function (el) {
    var t = tkFind(el.dataset.id); if (!t) return;
    var upd = { status: el.dataset.v, processed_at: new Date().toISOString() };
    var p = tkCloud() ? CLOUD.sb().from('tickets').update(upd).match({ id: t.id }).then(function (r) { if (r.error) throw r.error; }) : Promise.resolve();
    p.then(function () { Object.assign(t, upd); closeSheet(); render(true); toast('Ticket marcado como pasado'); }, function () { toast('No he podido guardarlo'); });
  },
  tkDel: function (el) {
    if (!el.dataset.armed) { el.dataset.armed = '1'; el.innerHTML = '¿Borrar? Toca otra vez'; return; }
    var t = tkFind(el.dataset.id); if (!t) return;
    var p = tkCloud() ? CLOUD.sb().from('tickets').delete().match({ id: t.id }).then(function (r) { if (r.error) throw r.error; return tkBucket().remove([t.path]); }) : Promise.resolve();
    p.then(function () { TK.list = TK.list.filter(function (x) { return x !== t; }); closeSheet(); render(true); toast('Ticket borrado'); }, function () { toast('No he podido borrarlo'); });
  }
});
