/* ===================== Exportar la lista de la compra =====================
   Excel (.xlsx de verdad, generado aquí mismo, sin librerías) o PDF (vista de impresión: «Guardar como PDF»).
   Se puede exportar lo vuestro, lo que se está viendo con los filtros o toda la lista. */
function exportScopeItems(scope) {
  var all = S.ingredients.slice(), myF = me().family;
  if (scope === 'mine') return all.filter(function (i) { return i.family === myF; });
  if (scope === 'view') {
    var f = ui.fam, q = (ui.q || '').toLowerCase();
    return all.filter(function (i) {
      if (!(f === 'all' || (f === 'libre' ? !i.family : i.family === f))) return false;
      if (ui.mealFilter && i.meals.indexOf(ui.mealFilter) < 0) return false;
      if (ui.buyF && i.buy !== ui.buyF) return false;
      if (q && i.name.toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  return all;
}
function exportScopeName(scope) {
  var f = fam(me().family);
  if (scope === 'mine') return 'Lo nuestro' + (f ? ' · ' + f.name : '');
  if (scope === 'view') { var vf = ui.fam === 'libre' ? 'Sin dueño' : ui.fam === 'all' ? 'Todo' : (fam(ui.fam) || {}).name || ''; return 'Lo que estoy viendo' + (vf ? ' · ' + vf : ''); }
  return 'Toda la lista';
}
var CAT_ORDER = ['fresco', 'carne', 'bebidas', 'despensa', 'desayunos', 'bbq', 'cumple', 'marc', 'limpieza', 'otros'];
function exportRows(items) {
  return items.slice().sort(function (a, b) { return (CAT_ORDER.indexOf(a.cat) - CAT_ORDER.indexOf(b.cat)) || a.name.localeCompare(b.name, 'es'); }).map(function (i) {
    var f = fam(i.family);
    var meals = (i.meals || []).map(function (mid) { var m = meal(mid); return m ? dayOf(m.day).short + ' ' + slotName(m.slot).toLowerCase() : ''; }).filter(Boolean).join(', ');
    return {
      it: i, name: i.name, qty: i.qty, unit: i.unit || '', cat: CATS[i.cat] || i.cat || '', where: i.buy === 'antes' ? 'Antes de ir' : i.buy === 'alli' ? 'Allí' : '',
      meals: meals, who: f ? f.name : 'Sin dueño', status: i.status === 'casa' ? 'Viene de casa' : i.cost != null ? 'Comprado' : 'Pendiente',
      est: i.est != null ? i.est : null, cost: i.status === 'casa' ? 0 : i.cost, note: i.note || ''
    };
  });
}
function exportFileBase(scope) {
  var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
  return 'Compra ' + (S.trip.name || 'Casa Rural') + ' - ' + exportScopeName(scope).replace(/[\\/:*?"<>|·]+/g, '').replace(/\s+/g, ' ').trim() + ' ' + p(d.getDate()) + '-' + p(d.getMonth() + 1);
}

/* ---------- XLSX mínimo (zip sin compresión) ---------- */
var CRC_T = null;
function crc32(u8) {
  if (!CRC_T) { CRC_T = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } }
  var crc = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) crc = CRC_T[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files) {   /* files: [{ name, data: Uint8Array }] */
  var enc = new TextEncoder(), parts = [], central = [], off = 0;
  function u16(v) { return [v & 255, (v >>> 8) & 255]; }
  function u32(v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
  files.forEach(function (f) {
    var nm = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    var head = [].concat([0x50, 0x4B, 0x03, 0x04], u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(sz), u32(sz), u16(nm.length), u16(0));
    parts.push(new Uint8Array(head), nm, f.data);
    central.push(new Uint8Array([].concat([0x50, 0x4B, 0x01, 0x02], u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(sz), u32(sz), u16(nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nm);
    off += head.length + nm.length + sz;
  });
  var cdSize = central.reduce(function (a, b) { return a + b.length; }, 0);
  var end = new Uint8Array([].concat([0x50, 0x4B, 0x05, 0x06], u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)));
  return new Blob(parts.concat(central, [end]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
function xmlEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function colName(i) { var s = ''; i++; while (i) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
function buildXlsx(title, head, rows, widths) {
  var enc = new TextEncoder();
  function cell(v, r, c, style) {
    var ref = colName(c) + r;
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + (style ? ' s="' + style + '"' : '') + '><v>' + v + '</v></c>';
    if (v == null || v === '') return '<c r="' + ref + '"' + (style ? ' s="' + style + '"' : '') + '/>';
    return '<c r="' + ref + '" t="inlineStr"' + (style ? ' s="' + style + '"' : '') + '><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
  }
  var sheetRows = '<row r="1">' + cell(title, 1, 0, 3) + '</row>' +
    '<row r="3">' + head.map(function (h, c) { return cell(h, 3, c, 1); }).join('') + '</row>' +
    rows.map(function (rw, k) { var r = k + 4; return '<row r="' + r + '">' + rw.map(function (v, c) { return cell(v, r, c, typeof v === 'number' && c >= rw.length - 2 ? 2 : 0); }).join('') + '</row>'; }).join('');
  var sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' +
    widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols><sheetData>' + sheetRows + '</sheetData>' +
    '<autoFilter ref="A3:' + colName(head.length - 1) + (rows.length + 3) + '"/></worksheet>';
  var styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00\\ &quot;€&quot;"/></numFmts>' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="14"/><name val="Calibri"/></font></fonts>' +
    '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFC4112F"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  var files = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Compra" sheetId="1" r:id="rId1"/></sheets><definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Compra!$A$3:$' + colName(head.length - 1) + '$' + (rows.length + 3) + '</definedName></definedNames></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', styles],
    ['xl/worksheets/sheet1.xml', sheet]
  ].map(function (f) { return { name: f[0], data: enc.encode(f[1]) }; });
  return zipStore(files);
}
function downloadBlob(blob, name) {
  var url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
  setTimeout(function () { a.remove(); URL.revokeObjectURL(url); }, 4000);
}
function exportXlsx(scope) {
  var rows = exportRows(exportScopeItems(scope)); if (!rows.length) { toast('No hay nada que exportar en esa lista'); return; }
  var head = ['✓', 'Producto', 'Cantidad', 'Unidad', 'Categoría', 'Dónde', 'Para', 'Lo compra', 'Estado', 'Nota', 'Estimado', 'Precio real'];
  var data = rows.map(function (r) { return [r.status === 'Pendiente' ? '☐' : '☑', r.name, r.qty, r.unit, r.cat, r.where, r.meals, r.who, r.status, r.note, r.est, r.cost]; });
  var title = (S.trip.name || 'Casa Rural') + ' · Lista de la compra · ' + exportScopeName(scope);
  downloadBlob(buildXlsx(title, head, data, [4, 34, 10, 12, 16, 12, 26, 18, 14, 30, 12, 12]), exportFileBase(scope) + '.xlsx');
  closeSheet(); toast('Excel descargado. ¡A por la compra!');
}

/* ---------- PDF: vista de impresión limpia (Imprimir → Guardar como PDF) ---------- */
function exportPdf(scope) {
  var rows = exportRows(exportScopeItems(scope)); if (!rows.length) { toast('No hay nada que exportar en esa lista'); return; }
  var groups = {}; rows.forEach(function (r) { (groups[r.cat] = groups[r.cat] || []).push(r); });
  var est = rows.reduce(function (a, r) { return a + (r.cost != null ? r.cost : r.est || 0); }, 0);
  var d = new Date();
  var html = '<div class="pl-head"><div><div class="pl-kicker">' + esc(S.trip.name || 'Casa Rural') + ' · ' + esc(S.trip.dateLabel || '') + '</div><h1>Lista de la compra</h1><div class="pl-sub">' + esc(exportScopeName(scope)) + ' · ' + rows.length + ' productos · ≈ ' + L.money(est) + '</div></div>' +
    '<div class="pl-date">' + d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) + '</div></div>' +
    Object.keys(groups).map(function (g) {
      return '<section class="pl-group"><h2>' + esc(g) + ' <small>' + groups[g].length + '</small></h2><table>' + groups[g].map(function (r) {
        var done = r.status !== 'Pendiente';
        return '<tr class="' + (done ? 'done' : '') + '"><td class="pl-box">' + (done ? '✓' : '') + '</td><td class="pl-name"><b>' + esc(r.name) + '</b>' + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</td>' +
          '<td class="pl-qty">' + esc(L.n(r.qty)) + ' ' + esc(r.unit) + '</td><td class="pl-meta">' + esc([r.where, r.meals].filter(Boolean).join(' · ')) + (scope !== 'mine' ? '<small>' + esc(r.who) + '</small>' : '') + '</td></tr>';
      }).join('') + '</table></section>';
    }).join('') +
    '<div class="pl-foot">Hecha con la app de la ' + esc(S.trip.name || 'Casa Rural') + '. Al comprar, apuntad el precio real en la app: sin precio no cuenta en las cuentas.</div>';
  var box = document.getElementById('print-list'); if (box) box.remove();
  box = document.createElement('div'); box.id = 'print-list'; box.innerHTML = html; document.body.appendChild(box);
  document.documentElement.classList.add('printing-list'); closeSheet();
  var done = function () { document.documentElement.classList.remove('printing-list'); var b = document.getElementById('print-list'); if (b) b.remove(); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  setTimeout(function () { try { window.print(); } catch (e) {} setTimeout(function () { if (document.documentElement.classList.contains('printing-list') && !window.matchMedia('print').matches) done(); }, 1500); }, 120);
}

function exportSheet(inPlace) {
  var myF = me().family, hasMine = S.ingredients.some(function (i) { return i.family === myF; });
  ui.expScope = ui.expScope || (hasMine ? 'mine' : 'view');
  var opts = [['mine', 'Lo nuestro'], ['view', 'Lo que veo'], ['all', 'Toda la lista']].filter(function (o) { return o[0] !== 'mine' || hasMine; });
  var n = exportScopeItems(ui.expScope).length;
  var body = ('<h2>Llévate la lista</h2><p class="small muted">Para ir al súper con ella: en Excel, o en PDF para imprimir o guardar en el móvil.</p>' +
    '<div class="field"><span class="lbl">¿Qué lista?</span><div class="seg" role="group">' + opts.map(function (o) { return '<button data-act="expScope" data-v="' + o[0] + '" aria-pressed="' + (ui.expScope === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>' +
    '<p class="small muted" style="margin-top:6px">' + esc(exportScopeName(ui.expScope)) + ' · <b>' + n + '</b> ' + (n === 1 ? 'producto' : 'productos') + '</p></div>' +
    '<div class="exp-btns"><button class="btn primary" data-act="expXlsx">' + icon('copy') + 'Excel (.xlsx)</button><button class="btn" data-act="expPdf">' + icon('edit') + 'PDF / imprimir</button></div>' +
    '<p class="small muted">En el PDF, elige «Guardar como PDF» en la ventana de imprimir (en el móvil: Compartir → Imprimir y pellizca la vista previa).</p>' +
    '<button class="btn block ghost" data-act="close">Cerrar</button>');
  var sh = inPlace && document.querySelector('#scrim .sheet');
  if (sh) { sh.querySelectorAll(':scope > :not(.grab):not(.sheet-x)').forEach(function (x) { x.remove(); }); sh.insertAdjacentHTML('beforeend', body); }   /* sin repintar la hoja: nada de fogonazos */
  else openSheet(body);
}
Object.assign(A, {
  exportList: function () { exportSheet(); },
  expScope: function (el) { ui.expScope = el.dataset.v; exportSheet(true); },
  expXlsx: function () { exportXlsx(ui.expScope || 'view'); },
  expPdf: function () { exportPdf(ui.expScope || 'view'); }
});
