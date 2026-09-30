/* ===================== La Finca (pestaña) =====================
   Todo lo de la finca en un sitio: dónde dormimos (plano), lo práctico (Wi-Fi, registro, normas…) y compras en el pueblo. */
var FINCA_SUBS = [['dormir', 'Dormir', 'bed'], ['info', 'Práctico', 'bulb'], ['pueblo', 'Compras', 'cart']];
VIEWS.finca = function () {
  var F = S.finca || {}, T = S.trip || {}, sub = ui.fsub || 'dormir';
  if (!FINCA_SUBS.some(function (x) { return x[0] === sub; })) sub = 'dormir';
  var h = '<div class="view-head"><div><h2>La Finca</h2><p class="muted small">' + esc(T.place || '') + (T.town ? ' · ' + esc(T.town) : '') + '</p></div></div>' +
    '<div class="seg finca-seg" role="group" aria-label="Sección">' + FINCA_SUBS.map(function (x) {
      return '<button data-act="fsub" data-v="' + x[0] + '" aria-pressed="' + (sub === x[0]) + '">' + icon(x[2]) + x[1] + '</button>';
    }).join('') + '</div>';
  if (sub === 'dormir') h += (typeof casasHtml === 'function' ? casasHtml() : '');
  else if (sub === 'info') h += fincaInfo('info');
  else h += fincaInfo('pueblo');
  return h;
};
VIEWS.casas = function () { ui.tab = 'finca'; ui.fsub = 'dormir'; return VIEWS.finca(); };
Object.assign(A, { fsub: function (el) { ui.fsub = el.dataset.v; render(); window.scrollTo(0, 0); } });
