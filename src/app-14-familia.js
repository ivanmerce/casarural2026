/* ===================== Familia (pestaña) =====================
   Quién viene y cuándo (tus días + asistencia por día) y las personas (roles y accesos). */
var FAM_SUBS = [['dias', 'Quién viene', 'plans'], ['personas', 'Personas', 'users']];
var _viewAsistencia = VIEWS.asistencia, _viewPersonas = VIEWS.personas;
function stripHead(html) { return String(html).replace(/^<div class="view-head">[\s\S]*?<\/div><\/div>/, ''); }
VIEWS.familia = function () {
  var sub = ui.msub || 'dias';
  if (!FAM_SUBS.some(function (x) { return x[0] === sub; })) sub = 'dias';
  var att = S.people.filter(function (p) { return L.mealsAttended(S, p.id) > 0; });
  var h = '<div class="view-head"><div><h2>Familia</h2><p class="muted small">' + att.length + ' personas · ' + S.families.length + ' familias · quién viene y cuándo</p></div></div>' +
    '<div class="seg finca-seg" role="group" aria-label="Sección">' + FAM_SUBS.map(function (x) {
      return '<button data-act="msub" data-v="' + x[0] + '" aria-pressed="' + (sub === x[0]) + '">' + icon(x[2]) + x[1] + '</button>';
    }).join('') + '</div>';
  if (sub === 'dias') {
    h += '<section class="card"><div class="avs fam-avs">' + att.map(function (p) { return av(p.id); }).join('') + '</div></section>';
    h += confirmCard().replace(/<button class="link" data-act="tab" data-tab="asistencia">[\s\S]*?<\/button>/, '');
    h += stripHead(_viewAsistencia());
  } else h += stripHead(_viewPersonas());
  return h;
};
VIEWS.asistencia = function () { ui.tab = 'familia'; ui.msub = 'dias'; return VIEWS.familia(); };
VIEWS.personas = function () { ui.tab = 'familia'; ui.msub = 'personas'; return VIEWS.familia(); };
Object.assign(A, { msub: function (el) { ui.msub = el.dataset.v; render(); window.scrollTo(0, 0); } });
