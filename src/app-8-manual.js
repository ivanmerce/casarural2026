/* ===================== Manual de uso (dentro de la app) =====================
   Siempre al día: el texto vive en el mismo código que la app. Los datos (horarios, finca…) salen de S.
   «Descargar PDF» abre el manual en PDF diseñado (bucket privado «docs» en la nube); si no está, se imprime esta vista. */
var MANUAL = {
  pdf: function () { return Promise.resolve(null); }   /* la nube lo sustituye */
};
function manualCardHome() {
  return '<button class="card manual-cta" data-act="tab" data-tab="manual"><span class="aw-ico">' + icon('bulb') + '</span><span class="grow"><b>Manual de uso</b><small class="muted">Todo lo que hay que saber en 2 minutos. Y en PDF para descargar</small></span>' + icon('arrow') + '</button>';
}
VIEWS.manual = function () {
  var T = S.trip || {}, myF = fam(me().family), babyN = babyName(), payer = S.house && fam(S.house.payer);
  var steps = [
    ['Entra', 'Con <b>tu email</b> (los peques, con su <b>usuario</b>) y el <b>código de la familia</b> que te ha llegado por WhatsApp. Justo después <b>eliges tu propio código</b> de 6 cifras: ya solo entrarás con ese.'],
    ['Revisa tus días', 'Ya están apuntados. Si <b>cambia algo</b>, en <b>Inicio → «Vuestros días»</b> toca el día: <b>✓</b> viene · <b>✕</b> no viene. Los padres lo cambian por toda su familia.'],
    ['Pídete la compra', 'En <b>Compra → «Sin dueño»</b> toca <b>«Me lo pido»</b>: queda a vuestro cargo con su precio estimado. ¿Error? En «Lo nuestro», <b>Soltar</b>.']
  ];
  var cards = [
    ['cart', 'Vuestra lista', 'Compra → <b>«Lo nuestro»</b> es vuestra lista para el súper, con el total estimado. Tocando un producto podéis poner el <b>precio real</b> o marcar que lo traéis <b>de casa</b> (0 €).'],
    ['meals', 'Comidas', 'Cada comida con su menú y el <b>menú de ' + esc(babyN) + '</b>. Quién cocina se decide sobre la marcha. Toca los comensales si alguien no come ese día: las cantidades se ajustan solas.'],
    ['trophy', 'Juegos en directo', 'Los editores apuntan resultados: <b>toca el nombre del ganador</b> o usa <b>+ / −</b> en el marcador. El ranking y el podio se actualizan solos.'],
    ['star', 'Premios y gala', 'Más de 30 premios: muchos salen solos de lo que pasa en la app y otros <b>los vota todo el mundo</b> (Juegos → Premios). El último día, <b>Gala de premios</b>.'],
    ['camera', 'Álbum de fotos', 'Toca la <b>cámara</b> de arriba y sube tus fotos (se reducen solas). Corazones para las mejores y descárgalas cuando quieras.'],
    ['coins', 'Cuentas claras', (payer ? 'La casa y la tasa turística las pagan <b>' + esc(payer.name) + '</b>. ' : '') + 'El resto se reparte y la app dice <b>quién paga a quién</b> con el mínimo de transferencias.']
  ];
  var h = '<div class="view-head"><div><h2>Manual de uso</h2><p class="muted small">Todo lo que hay que saber de la ' + esc(T.name || 'app') + '</p></div></div>';
  h += '<section class="card manual-dl"><div class="row" style="align-items:flex-start"><span class="aw-ico">' + icon('copy') + '</span><div class="grow"><b>El manual en PDF</b><p class="small muted">Para guardarlo en el móvil o reenviarlo por WhatsApp.</p></div></div>' +
    '<div class="row wrap"><button class="btn primary" data-act="manualPdf">' + icon('arrow') + 'Descargar PDF</button><button class="btn ghost" data-act="manualPrint">Imprimir esta página</button></div></section>';
  h += '<p class="eyebrow">Lo primero</p><div class="stack man-steps">' + steps.map(function (s, i) {
    return '<article class="card man-step"><span class="man-n">' + (i + 1) + '</span><div class="grow"><h3>' + s[0] + '</h3><p class="small">' + s[1] + '</p></div></article>';
  }).join('') + '</div>';
  h += '<p class="eyebrow">Durante el finde</p><div class="man-grid">' + cards.map(function (c) {
    return '<article class="card man-card"><span class="aw-ico sm">' + icon(c[0]) + '</span><h3>' + c[1] + '</h3><p class="small">' + c[2] + '</p></article>';
  }).join('') + '</div>';
  h += '<section class="card man-dark"><div class="man-tips">' +
    '<div><b>Como una app</b><p class="small">iPhone: <b>Compartir → Añadir a pantalla de inicio</b>. Android: menú (los tres puntos) → <b>Añadir a pantalla de inicio</b>.</p></div>' +
    '<div><b>Quién puede qué</b><p class="small">Todos lo ven todo, se apuntan a planes, votan y suben fotos. Los <b>editores</b> apuntan compras, precios y resultados. Los adultos confirman a su familia.</p></div>' +
    '<div><b class="gold">Secretos</b><p class="small">Hay <b>easter eggs escondidos</b>: toques repetidos, horas raras, palabras mágicas… Arriba se ve quién está conectado.</p></div></div></section>';
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
