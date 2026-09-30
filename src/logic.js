/* =====================================================================
   Casa Rural · Lógica pura (sin DOM). Testeable con node: tests/logic.test.js
   ===================================================================== */
var L = (function () {
  var eur = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var num = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

  /* "1.234,56 €": Intl en es-ES no pone punto de miles con 4 cifras, lo forzamos */
  function money(v) {
    if (v == null || isNaN(v)) return '—';
    var s = eur.format(Math.round(v * 100) / 100);
    return s.replace(/^(-?)(\d)(\d{3}),/, '$1$2.$3,');
  }
  function n(v) { return num.format(v); }
  function ddmm(iso) { var d = iso.slice(0, 10).split('-'); return d[2] + '/' + d[1]; }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* ---- Asistencia ---- */
  function attends(S, personId, mealId) {
    /* prioridad: excepción de esa comida > confirmación del día > valor por defecto de la persona */
    var o = S.attendance && S.attendance[mealId];
    if (o && personId in o) return !!o[personId];
    var m = S.meals.find(function (x) { return x.id === mealId; });
    var st = m ? dayStatus(S, personId, m.day) : 'pend';
    if (st === 'si') return true;
    if (st === 'no') return false;
    var p = S.people.find(function (x) { return x.id === personId; });
    return !!(p && p.attends);
  }
  /* ---- Confirmación por día: 'si' · 'no' · 'pend' ---- */
  function dayStatus(S, personId, day) {
    var c = S.dayConfirm && S.dayConfirm[personId];
    return (c && c[day]) || 'pend';
  }
  function dayCount(S, day) {
    var r = { si: 0, no: 0, pend: 0, pendYes: 0, total: S.people.length };
    S.people.forEach(function (p) {
      var st = dayStatus(S, p.id, day); r[st]++;
      if (st === 'pend' && p.attends) r.pendYes++;
    });
    r.expected = r.si + r.pendYes;           /* los que contamos para cantidades */
    return r;
  }
  /* Cantidad sugerida: los ingredientes con "per" están pensados para N comensales */
  function suggestQty(S, item) {
    if (!item.per || !item.meals || !item.meals.length) return null;
    var n = Math.max.apply(null, item.meals.map(function (id) { return diners(S, id).length; }));
    if (!n || n === item.per) return null;
    var q = item.qty * n / item.per;
    q = item.qty >= 10 || /u$|^u|latas|canelones|láminas/.test(item.unit) ? Math.ceil(q) : Math.ceil(q * 10) / 10;
    return q === item.qty ? null : { n: n, qty: q };
  }
  function diners(S, mealId) {
    return S.people.filter(function (p) { return attends(S, p.id, mealId); });
  }
  function mealsAttended(S, personId) {
    return S.meals.filter(function (m) { return attends(S, personId, m.id); }).length;
  }

  /* ---- Reparto ---- */
  function weightOf(S, p) {
    var w = (S.split && S.split.w) || { adulto: 1, menor: 0.5, bebe: 0 };
    return w[p.kind] != null ? w[p.kind] : 1;
  }
  /* familias fuera del reparto: por defecto, quien paga la casa (los abuelos). Lo que paguen o aporten se descuenta del bote */
  function excluded(S) {
    var x = S.split && S.split.exclude;
    if (Array.isArray(x)) return x.slice();
    return S.house && S.house.payer ? [S.house.payer] : [];
  }
  /* devuelve { familyId: fracción 0..1 } */
  function shares(S) {
    /* v0.5.9: el reparto es SIEMPRE proporcional por persona y comida (adultos y niños 1, bebé 0).
       Se ignora cualquier otro criterio guardado para que nadie lo cambie por error. */
    var mode = 'ponderado';
    var units = {};
    S.families.forEach(function (f) { units[f.id] = 0; });
    if (mode === 'familia') {
      S.families.forEach(function (f) {
        var any = S.people.some(function (p) { return p.family === f.id && mealsAttended(S, p.id) > 0; });
        units[f.id] = any ? 1 : 0;
      });
    } else {
      S.people.forEach(function (p) {
        var m = mealsAttended(S, p.id);
        var w = mode === 'persona' ? 1 : weightOf(S, p);
        units[p.family] = (units[p.family] || 0) + w * m;
      });
    }
    excluded(S).forEach(function (k) { if (k in units) units[k] = 0; });
    var tot = Object.keys(units).reduce(function (a, k) { return a + units[k]; }, 0);
    var out = {};
    Object.keys(units).forEach(function (k) { out[k] = tot ? units[k] / tot : 0; });
    return { share: out, units: units };
  }

  /* gastos comunes por familia. Un producto que una familia se pide cuenta ya a su cargo:
     con el precio real si lo ha apuntado y, si no, con el estimado. «Viene de casa» = 0 €. */
  function itemCost(i) { if (i.status === 'casa') return 0; return i.cost != null ? i.cost : (i.est || 0); }   /* para previsiones */
  function realCost(i) { if (i.status === 'casa') return 0; return i.cost != null ? i.cost : null; }           /* para Cuentas */
  function needsPrice(i) { return !!i.family && realCost(i) == null; }
  function paidBy(S) {
    var paid = {};
    S.families.forEach(function (f) { paid[f.id] = 0; });
    S.ingredients.forEach(function (i) {
      if ((i.split || 'comun') !== 'comun' || !i.family || paid[i.family] == null) return;
      var v = realCost(i); if (v != null) paid[i.family] += v;   /* sin precio real todavía no cuenta */
    });
    (S.expenses || []).forEach(function (e) {
      if ((e.split || 'comun') !== 'comun' || e.kind === 'aportacion') return;
      if (e.payer && e.amount) paid[e.payer] += e.amount;
    });
    Object.keys(paid).forEach(function (k) { paid[k] = r2(paid[k]); });
    return paid;
  }

  /* mínimo número de transferencias (voraz: mayor deudor paga a mayor acreedor) */
  function settle(balances) {
    var debt = [], cred = [];
    Object.keys(balances).forEach(function (k) {
      var v = r2(balances[k]);
      if (v < -0.005) debt.push({ id: k, v: -v });
      else if (v > 0.005) cred.push({ id: k, v: v });
    });
    var tx = [];
    while (debt.length && cred.length) {
      debt.sort(function (a, b) { return b.v - a.v; });
      cred.sort(function (a, b) { return b.v - a.v; });
      var d = debt[0], c = cred[0];
      var amt = r2(Math.min(d.v, c.v));
      if (amt > 0) tx.push({ from: d.id, to: c.id, amount: amt });
      d.v = r2(d.v - amt); c.v = r2(c.v - amt);
      if (d.v <= 0.005) debt.shift();
      if (c.v <= 0.005) cred.shift();
    }
    return tx;
  }

  /* Aportaciones: dinero que una familia pone "de regalo" para el bote común.
     Reduce lo que hay que repartir y se suma a lo que le toca a quien lo aporta (así la suma cuadra). */
  function gifts(S) {
    var g = {}; S.families.forEach(function (f) { g[f.id] = 0; });
    (S.expenses || []).forEach(function (e) { if (e.kind === 'aportacion' && e.payer && e.amount) g[e.payer] = r2(g[e.payer] + e.amount); });
    return g;
  }
  function ledger(S, useEst) {
    var paid = paidBy(S, useEst);
    var total = r2(Object.keys(paid).reduce(function (a, k) { return a + paid[k]; }, 0));
    var g = gifts(S), ex = excluded(S);
    ex.forEach(function (k) { if (k in g) g[k] = r2(g[k] + (paid[k] || 0)); });   /* lo que pagan los anfitriones es una invitación */
    var gTot = r2(Object.keys(g).reduce(function (a, k) { return a + g[k]; }, 0));
    var gUsed = Math.min(gTot, total);                      /* una aportación no puede superar el gasto */
    var ratio = gTot ? gUsed / gTot : 0;
    var toShare = r2(total - gUsed);
    var sh = shares(S);
    var rows = S.families.map(function (f) {
      var gift = r2(g[f.id] * ratio);
      var owe = r2(toShare * sh.share[f.id] + gift);
      return { id: f.id, paid: paid[f.id], owe: owe, gift: gift, bal: r2(paid[f.id] - owe), share: sh.share[f.id], units: sh.units[f.id] };
    });
    var sumOwe = r2(rows.reduce(function (a, r) { return a + r.owe; }, 0));
    var diff = r2(total - sumOwe);
    if (diff !== 0 && rows.length) {
      var big = rows.slice().sort(function (a, b) { return b.owe - a.owe; })[0];
      big.owe = r2(big.owe + diff); big.bal = r2(big.paid - big.owe);
    }
    var bal = {}; rows.forEach(function (r) { bal[r.id] = r.bal; });
    return { total: total, gifts: gUsed, giftsPledged: gTot, toShare: toShare, rows: rows, tx: settle(bal), excluded: ex };
  }

  /* ¿Cae una comida fuera del horario de entrada/salida que habéis elegido? */
  function mealConflict(S, m, time) {
    var first = S.days[0].k, last = S.days[S.days.length - 1].k;
    if (m.day === first && S.trip.arrival && time < S.trip.arrival) return 'Es antes de vuestra hora de llegada (' + S.trip.arrival + ')';
    if (m.day === last && S.trip.departure && time > S.trip.departure) return 'Es después de vuestra hora de salida (' + S.trip.departure + ')';
    return null;
  }
  function offHours(S) {
    var o = S.trip.official || {}, w = [];
    if (o.arrival && S.trip.arrival && S.trip.arrival < o.arrival) w.push('Llegada a las ' + S.trip.arrival + ': la finca abre a las ' + o.arrival + '. Hay que pedirlo');
    if (o.departure && S.trip.departure && S.trip.departure > o.departure) w.push('Salida a las ' + S.trip.departure + ': la finca pide salir a las ' + o.departure + '. Hay que pedirlo');
    return w;
  }

  /* ---- Compra ---- */
  /* previsión del gasto común total, lo compre quien lo compre (lo que aún no tiene dueño también cuenta) */
  function estCommon(S) {
    var t = 0;
    S.ingredients.forEach(function (i) { if ((i.split || 'comun') !== 'comun' || i.status === 'casa') return; var v = i.cost != null ? i.cost : i.est; if (v) t += v; });
    (S.expenses || []).forEach(function (e) { if ((e.split || 'comun') === 'comun' && e.kind !== 'aportacion' && e.amount) t += e.amount; });
    return r2(t);
  }
  function unassigned(S) { return S.ingredients.filter(function (i) { return !i.family; }); }
  function coverage(items) {
    var tot = items.length, done = items.filter(function (i) { return !!i.family; }).length;
    return { tot: tot, done: done, pct: tot ? Math.round(done / tot * 100) : 0 };
  }

  /* ---- Tasa turística ---- */
  /* Tasa turística (Llei 5/2017 mod. Llei 2/2026): por persona y noche; exentas las personas de 16 años o menos.
     Noches reales de cada uno según la confirmación por día (o su asistencia por defecto si aún no ha confirmado). */
  function sleeps(S, p, day) {
    var st = dayStatus(S, p.id, day);
    return st === 'si' || (st === 'pend' && !!p.attends);
  }
  function taxPays(S, p) {
    var t = S.tax || {}, maxEx = t.maxExemptAge != null ? t.maxExemptAge : (t.minAge != null ? t.minAge - 1 : 16);
    if (p.age != null) return p.age > maxEx;
    return p.kind === 'adulto';
  }
  function tax(S) {
    var t = S.tax || { perNight: 1.1, nights: 3 };
    var nightDays = (S.days || []).slice(0, t.nights || Math.max(0, (S.days || []).length - 1)).map(function (d) { return d.k; });
    var rows = S.people.map(function (p) {
      var n = nightDays.filter(function (d) { return sleeps(S, p, d); }).length;
      var pays = taxPays(S, p);
      return { id: p.id, nights: n, pays: pays, amount: pays ? r2(n * t.perNight) : 0 };
    }).filter(function (r) { return r.nights > 0; });
    var payers = rows.filter(function (r) { return r.pays; });
    var stays = payers.reduce(function (a, r) { return a + r.nights; }, 0);
    var allStays = rows.reduce(function (a, r) { return a + r.nights; }, 0);
    return {
      rows: rows, adults: payers.length, exempt: rows.length - payers.length, all: rows.length, stays: stays,
      withExemption: r2(stays * t.perNight), withoutExemption: r2(allStays * t.perNight)
    };
  }

  /* ---- Tiempo ---- */
  var WMO = {
    0: ['Despejado', 'sun'], 1: ['Casi despejado', 'sun'], 2: ['Intervalos de nubes', 'partly'], 3: ['Nublado', 'cloud'],
    45: ['Niebla', 'fog'], 48: ['Niebla', 'fog'], 51: ['Llovizna', 'rain'], 53: ['Llovizna', 'rain'], 55: ['Llovizna', 'rain'],
    61: ['Lluvia débil', 'rain'], 63: ['Lluvia', 'rain'], 65: ['Lluvia fuerte', 'rain'], 80: ['Chubascos', 'rain'], 81: ['Chubascos', 'rain'],
    82: ['Chubascos fuertes', 'rain'], 95: ['Tormenta', 'storm'], 96: ['Tormenta', 'storm'], 99: ['Tormenta', 'storm']
  };
  function wmo(code) { return WMO[code] || ['Variable', 'partly']; }
  function advice(d) {
    var wet = d.prob >= 50 || d.rain >= 2;
    return {
      pool: d.tmax >= 27 && !wet ? { ok: true, t: 'Piscina: quizá, si el agua no está helada' } : { ok: false, t: 'Piscina: no. ' + (d.tmax < 27 ? 'Máxima de ' + Math.round(d.tmax) + ' °C, el agua estará fría' : 'Riesgo de lluvia') },
      bbq: !wet && d.wind < 35 ? { ok: true, t: 'Barbacoa al aire libre: adelante' } : { ok: false, t: 'Barbacoa: mejor dentro de La Barbacoa' },
      clothes: d.tmin < 10 ? 'Capas: noche fresca (' + Math.round(d.tmin) + ' °C). Chaqueta y sudadera' : (d.tmin < 14 ? 'Sudadera para la noche' : 'Manga corta de día, algo fino de noche'),
      planB: wet ? { on: true, t: 'Activar plan B bajo techo' } : { on: false, t: 'Plan B preparado, de momento no hace falta' }
    };
  }

  /* ---- Torneo ---- */
  function advance(T) {
    for (var r = 0; r < T.rounds.length - 1; r++) {
      T.rounds[r].forEach(function (m, i) {
        var next = T.rounds[r + 1][Math.floor(i / 2)];
        var side = i % 2 === 0 ? 'a' : 'b';
        var w = m.w ? m[m.w] : null;
        if (next[side] !== w) { next[side] = w; next.w = null; next.sa = next.sb = null; }
      });
    }
    var f = T.rounds[T.rounds.length - 1][0];
    return f.w ? f[f.w] : null;
  }

  return { gifts: gifts, mealConflict: mealConflict, offHours: offHours, dayStatus: dayStatus, dayCount: dayCount, suggestQty: suggestQty, money: money, n: n, ddmm: ddmm, r2: r2, attends: attends, diners: diners, mealsAttended: mealsAttended, shares: shares, paidBy: paidBy, settle: settle, ledger: ledger, coverage: coverage, excluded: excluded, itemCost: itemCost, realCost: realCost, needsPrice: needsPrice, estCommon: estCommon, unassigned: unassigned, tax: tax, taxPays: taxPays, sleeps: sleeps, wmo: wmo, advice: advice, advance: advance };
})();
if (typeof module !== 'undefined') module.exports = L;
