/* ===================== Manual de uso (dentro de la app) =====================
   Siempre al día: el texto vive en el mismo código que la app. Los datos (horarios, finca…) salen de S.
   «Descargar PDF» abre el manual en PDF diseñado (bucket privado «docs» en la nube); si no está, se imprime esta vista. */
var MANUAL = {
  pdf: function () { return Promise.resolve(null); }   /* la nube lo sustituye */
};
function manualCardHome() {
  return '<button class="card manual-cta" data-act="tab" data-tab="manual"><span class="aw-ico">' + icon('bulb') + '</span><span class="grow"><b>Manual de uso</b><small class="muted">Interactivo, con enlaces a cada sección. Y en PDF para compartir</small></span>' + icon('arrow') + '</button>';
}
VIEWS.manual = function () {
  var T = S.trip || {}, myF = fam(me().family), babyN = babyName(), payer = S.house && fam(S.house.payer);
  /* [título, texto, pestaña, subapartado] — cada tarjeta lleva a su sitio */
  var steps = [
    ['Entra', 'Con <b>tu email</b> (los peques, con su <b>usuario</b>) y el <b>código de la familia</b>. Justo después <b>eliges tu propio código</b> de 6 cifras: ya solo entrarás con ese.', null],
    ['Regístrate en la finca', 'Obligatorio por ley desde los 14 años: <b>La Finca → Práctico</b>, «Rellenar el formulario de la finca» (uno por persona) y luego <b>marca tu nombre</b>.', 'finca', 'info'],
    ['Mira dónde duermes', '<b>La Finca → Dormir</b>: el plano de las tres casas, tu habitación y quién duerme en cada una.', 'finca', 'dormir'],
    ['Revisa tus días', '<b>Familia → Quién viene</b>: ya están apuntados. Si <b>cambia algo</b>, toca el día (<b>✓</b> viene · <b>✕</b> no). Los padres lo cambian por toda su familia.', 'familia', 'dias'],
    ['Pídete la compra', '<b>Compra → «Sin dueño»</b> → <b>«Me lo pido»</b>. Cuando lo compres, en «Lo nuestro» apunta el <b>precio real</b>: sin él no cuenta en Cuentas.', 'compra']
  ];
  var cards = [
    ['cart', 'Vuestra lista', 'Compra → <b>«Lo nuestro»</b> es vuestra lista para el súper, con la casilla de <b>precio real</b>. Al tocar un producto podéis decidir si se compra <b>antes de ir</b> o <b>allí</b>; entonces aparecen los filtros para verlo de un vistazo.', 'compra'],
    ['meals', 'Comidas', 'Cada comida con su menú y el <b>menú de ' + esc(babyN) + '</b>. Quién cocina se decide sobre la marcha. Si alguien no come ese día, toca los comensales: las cantidades se ajustan solas.', 'comidas'],
    ['plans', 'Planes', 'El planning de cada día, con plan B si llueve. Dale al corazón a lo que te apetezca.', 'planes'],
    ['trophy', 'Juegos y ranking', 'Hockey, ping-pong, Nerf, la gimcana de los pekes y minijuegos cada día. Los editores apuntan resultados y el <b>ranking</b> se actualiza solo.', 'juegos'],
    ['star', 'Premios y gala', 'Más de 30 premios: muchos salen solos y otros <b>los vota todo el mundo</b> (Juegos → Premios). El último día, <b>Gala de premios</b>.', 'juegos'],
    ['camera', 'Álbum de fotos', 'Toca la <b>cámara</b> de arriba y sube tus fotos (se reducen solas). Corazones para las mejores.', 'album'],
    ['house', 'La Finca', '<b>Dormir</b> (plano y habitaciones), <b>Práctico</b> (Wi-Fi, registro, normas, si se va la luz, antes de irnos) y <b>Compras</b> (tiendas del pueblo; el domingo solo abre una).', 'finca', 'info'],
    ['users', 'Familia', 'Quién viene cada día y las personas de cada familia.', 'familia', 'dias'],
    ['coins', 'Cuentas claras', (payer ? 'La casa y la tasa las pagan <b>' + esc(payer.name) + '</b>, fuera del reparto (si invitan a algo, se descuenta del bote). ' : '') + 'El resto, entre hermanos y compañía <b>a proporción de personas y comidas</b>, y la app dice <b>quién paga a quién</b>.', 'cuentas'],
    ['bulb', 'Buzón de ideas', 'La plataforma es <b>de todos</b>: propón juegos, comidas o cambios en Inicio → <b>Buzón de ideas</b> y apoya con <b>+1</b> las que te gusten.', 'inicio']
  ];
  function goBtn(tab, sub, label) { return tab ? '<button class="link man-go" data-act="tab" data-tab="' + tab + '"' + (sub ? (tab === 'finca' ? ' data-fsub="' : ' data-msub="') + sub + '"' : '') + '>' + (label || 'Ir') + ' ' + icon('arrow') + '</button>' : ''; }
  var h = '<div class="view-head"><div><h2>Manual de uso</h2><p class="muted small">Todo lo que hay que saber de la ' + esc(T.name || 'app') + '</p></div></div>';
  h += '<section class="card manual-dl"><div class="row" style="align-items:flex-start"><span class="aw-ico">' + icon('copy') + '</span><div class="grow"><b>El manual en PDF</b><p class="small muted">Para guardarlo en el móvil o reenviarlo por WhatsApp.</p></div></div>' +
    '<div class="row wrap"><button class="btn primary" data-act="manualPdf">' + icon('arrow') + 'Descargar PDF</button><button class="btn ghost" data-act="manualPrint">Imprimir esta página</button></div></section>';
  h += '<p class="eyebrow">Paso a paso</p><div class="stack man-steps">' + steps.map(function (s, i) {
    return '<article class="card man-step"><span class="man-n">' + (i + 1) + '</span><div class="grow"><h3>' + s[0] + '</h3><p class="small">' + s[1] + '</p>' + goBtn(s[2], s[3], 'Hacerlo ahora') + '</div></article>';
  }).join('') + '</div>';
  h += '<p class="eyebrow">Durante el finde</p><div class="man-grid">' + cards.map(function (c) {
    return '<article class="card man-card"><span class="aw-ico sm">' + icon(c[0]) + '</span><h3>' + c[1] + '</h3><p class="small">' + c[2] + '</p>' + goBtn(c[3], c[4], 'Abrir') + '</article>';
  }).join('') + '</div>';
  h += '<section class="card man-dark"><div class="man-tips">' +
    '<div><b>Como una app</b><p class="small">iPhone: <b>Compartir → Añadir a pantalla de inicio</b>. Android: menú (los tres puntos) → <b>Añadir a pantalla de inicio</b>.</p></div>' +
    '<div><b>Quién puede qué</b><p class="small">Todos lo ven todo, se apuntan a planes, votan y suben fotos. Los <b>editores</b> apuntan compras, precios y resultados. Los adultos confirman a su familia.</p></div>' +
    '<div><b class="gold">Secretos de la casa</b><p class="small">Hay <b>' + (EGGS.length || 31) + ' secretos</b> repartidos por la app: toques repetidos, horas raras, palabras mágicas… Cada uno tiene los suyos, con <b>3 pistas extra</b> y un <b>ranking</b> (en Inicio o tocando tu nombre). Se cierra el <b>' + esc(fmtClose()) + '</b>. Chitón.</p></div></div></section>' +
    '<p class="small muted" style="text-align:center">Has llegado al final del manual. Eso, en esta casa, tiene premio.</p>';
  h += '<section class="card wood small"><p><b>Llegada:</b> ' + esc(dayOf(S.days[0].k).long) + ' a las ' + esc(T.arrival || '—') + ' · <b>Salida:</b> ' + esc(dayOf(S.days[S.days.length - 1].k).long) + ' a las ' + esc(T.departure || '—') + '</p>' +
    (T.address ? '<p>' + esc(T.place || '') + ' · ' + esc(T.address) + '</p>' : '') + (T.phone ? '<p>Teléfono de la finca: <b>' + esc(T.phone) + '</b></p>' : '') +
    '<p class="muted">¿Dudas? Pregúntale al organizador.</p></section>';
  return h;
};
Object.assign(A, {
  manualPrint: function () { try { window.print(); } catch (e) { toast('Usa «Compartir → Imprimir» del navegador'); } },
  manualPdf: function (el) {
    var win = null; try { win = window.open('', '_blank'); } catch (e) {}
    el.disabled = true; var t = el.innerHTML; el.textContent = 'Preparando…';
    MANUAL.pdf().then(function (url) {
      el.disabled = false; el.innerHTML = t;
      if (!url) { if (win) win.close(); toast('El PDF aún no está subido: te abro la versión para imprimir'); setTimeout(function () { A.manualPrint(); }, 600); return; }
      if (win) win.location.href = url; else location.href = url;
    }, function () { if (win) win.close(); el.disabled = false; el.innerHTML = t; toast('No he podido abrir el PDF. Prueba otra vez'); });
  }
});
