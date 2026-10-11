/* ===================== v0.7.60 · La app se actualiza sola =====================
   Cada build lleva un sello (BUILD_ID) y publica version.json con el mismo sello.
   Si el móvil tiene una versión vieja abierta, se recarga sola en cuanto no estás en mitad de algo
   (sin hojas, sobres, gala ni teclado abiertos). Si estás ocupado, sale un botón discreto «Actualizar».
   Nunca entra en bucle: como mucho una recarga automática por versión nueva. */
var VER = { at: 0, next: null };
function verSafe() {
  if (document.querySelector('.aviso, .egg-msg, .sobre, .scrim, #gala, .gim-kid, .gim-gate, .gim-adm, .viewer')) return false;
  if (typeof gala !== 'undefined' && gala) return false;
  if (typeof SB !== 'undefined' && SB.open) return false;
  var a = document.activeElement;
  return !(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
}
function verGo() { location.replace(location.pathname + '?v=' + encodeURIComponent(VER.next)); }
function verApply() {
  if (!VER.next) return;
  var tried = null; try { tried = sessionStorage.getItem(KEY + '-upd'); } catch (e) {}
  if (tried !== VER.next && verSafe()) { try { sessionStorage.setItem(KEY + '-upd', VER.next); } catch (e) {} verGo(); return; }
  if (document.getElementById('ver-bar')) return;
  var b = document.createElement('button');
  b.id = 'ver-bar'; b.type = 'button'; b.className = 'ver-bar';
  b.innerHTML = '<span aria-hidden="true">↻</span> Hay versión nueva · <b>Actualizar</b>';
  b.addEventListener('click', function (e) { e.stopPropagation(); verGo(); });
  document.body.appendChild(b);
}
function verCheck(force) {
  if (typeof BUILD_ID === 'undefined' || !/^https?:$/.test(location.protocol)) return;
  if (!force && Date.now() - VER.at < 45000) return;
  VER.at = Date.now();
  fetch('version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (v) {
    if (!v || !v.build || v.build === BUILD_ID || v.build < BUILD_ID) return;
    VER.next = v.build; verApply();
  }, function () {});
}
setInterval(function () { if (VER.next) verApply(); else verCheck(); }, 15000);
document.addEventListener('visibilitychange', function () { if (!document.hidden) verCheck(true); });
setTimeout(function () { verCheck(true); }, 8000);
