/* Area segreteria: conferma pagamenti e iscrizioni, blocco dei campi.
   Funziona sia sulla versione claude.ai (database della piattaforma) sia sulla versione pubblica (Supabase). */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, pad = App.pad;
  App.chrome("segreteria.html");
  var S = { bookings: {}, info: {}, enroll: [], blocks: {}, notes: {}, rowOf: {}, docs: {}, infoDocs: {}, infoOwner: {} };
  var be, ops, isSb = false;
  var todayIso = App.iso(new Date());

  function badge(st) {
    var cls = (st === "pagata" || st === "confermata") ? "badge ok" : ((st === "da_pagare" || st === "in_verifica") ? "badge wait" : "badge");
    return h("span", { class: cls, text: App.STATUS[st] || st });
  }
  function btn(text, fn) { var b = h("button", { type: "button", class: "link", text: text }); b.addEventListener("click", function () { b.disabled = true; fn().then(function () {}, function () { b.disabled = false; }); }); return b; }
  function expired(bk) { return bk.status === "da_pagare" && bk.holdUntil && Date.parse(bk.holdUntil) < Date.now(); }

  /* ---------- disegno ---------- */
  function render() {
    var bks = Object.keys(S.bookings).map(function (k) { return [k, S.bookings[k]]; }).filter(function (e) { return !expired(e[1]); }).sort(function (a, b) { return a[0].split("_")[1] + a[0].split("_")[2] < b[0].split("_")[1] + b[0].split("_")[2] ? -1 : 1; });
    var rows = $("#bkRows"); rows.textContent = "";
    $("#bkEmpty").hidden = bks.length > 0;
    bks.forEach(function (e) {
      var k = e[0], b = e[1], c = App.courtById(b.court) || { name: b.court }, info = S.info[k] || {};
      var acts = h("div", { class: "tools" });
      if (b.status !== "pagata") acts.appendChild(btn("Segna pagata", function () { return ops.markPaid(k, b); }));
      acts.appendChild(btn("Elimina", function () { return ops.deleteBooking(k, b); }));
      rows.appendChild(h("tr", {}, [
        h("td", { class: "num", text: App.fmtDay(b.date) + " " + pad(b.hour) + ":00" }), h("td", { text: c.name }), h("td", { text: info.name || "–" }),
        h("td", { text: b.ref }), h("td", { class: "num", text: App.euro(b.amount) }), h("td", {}, [badge(b.status)]), h("td", {}, [acts])
      ]));
    });
    var en = $("#enRows"); en.textContent = "";
    $("#enEmpty").hidden = S.enroll.length > 0;
    S.enroll.forEach(function (r) {
      var it = r.it, c = App.courseById(it.courseId) || { name: "Corso" }, acts = h("div", { class: "tools" });
      if (it.status !== "confermata") {
        acts.appendChild(btn("Conferma", function () { return ops.confirmEnroll(r, false); }));
        if (isSb) acts.appendChild(btn("Conferma + certificato", function () { return ops.confirmEnroll(r, true); }));
      }
      acts.appendChild(btn("Elimina", function () { return ops.deleteEnroll(r); }));
      var sub = "Nato il " + (it.birth || "–") + (it.guardian ? " · Ref. " + it.guardian : "") + (isSb ? (it.cert ? " · Certificato ricevuto" : " · Certificato da ricevere") : "");
      en.appendChild(h("tr", {}, [
        h("td", {}, [h("b", { text: it.participant }), h("div", { class: "pay-help", text: sub })]),
        h("td", { text: c.name }), h("td", {}, [h("div", { text: it.email }), h("div", { class: "pay-help", text: it.phone })]),
        h("td", { text: it.id }), h("td", { class: "num", text: App.euro(it.amount) }), h("td", {}, [badge(it.status)]), h("td", {}, [acts])
      ]));
    });
    renderBlocks();
    var future = bks.filter(function (e) { return e[1].date >= todayIso; }).length;
    var verify = bks.filter(function (e) { return e[1].status === "in_verifica"; }).length + S.enroll.filter(function (r) { return r.it.status === "in_verifica"; }).length;
    var paid = bks.filter(function (e) { return e[1].status === "pagata"; }).reduce(function (a, e) { return a + e[1].amount; }, 0)
      + S.enroll.filter(function (r) { return r.it.status === "confermata"; }).reduce(function (a, r) { return a + r.it.amount; }, 0);
    var toConfirm = S.enroll.filter(function (r) { return r.it.status !== "confermata"; }).length;
    var k = $("#kpis"); k.textContent = "";
    [[future, "prenotazioni da oggi in poi"], [verify, "pagamenti da verificare"], [toConfirm, "iscrizioni da confermare"], [App.euro(paid), "incassato e confermato"]].forEach(function (x) {
      k.appendChild(h("div", { class: "kpi" }, [h("b", { text: String(x[0]) }), h("span", { text: x[1] })]));
    });
  }

  /* ---------- blocco campi ---------- */
  function blkMsg(text, err) { var m = $("#blMsg"); m.textContent = ""; if (text) m.appendChild(h("div", { class: "msg" + (err ? " err" : ""), text: text })); }

  function blockGroups() {
    var items = Object.keys(S.blocks).map(function (k) {
      var b = S.blocks[k]; return { k: k, court: b.court, date: b.date, hour: b.hour, note: (S.notes[k] || {}).note || "" };
    }).filter(function (b) { return b.date >= todayIso; })
      .sort(function (a, b) { var x = a.date + a.court + pad(a.hour), y = b.date + b.court + pad(b.hour); return x < y ? -1 : 1; });
    var groups = [];
    items.forEach(function (it) {
      var g = groups[groups.length - 1];
      if (g && g.date === it.date && g.court === it.court && g.note === it.note && g.last + 1 === it.hour) { g.last = it.hour; g.keys.push(it.k); }
      else groups.push({ date: it.date, court: it.court, note: it.note, first: it.hour, last: it.hour, keys: [it.k] });
    });
    return groups;
  }

  function renderBlocks() {
    var rows = $("#blRows"); if (!rows) return;
    rows.textContent = "";
    var groups = blockGroups();
    $("#blEmpty").hidden = groups.length > 0;
    groups.forEach(function (g) {
      var c = App.courtById(g.court) || { name: g.court };
      rows.appendChild(h("tr", {}, [
        h("td", { class: "num", text: App.fmtDay(g.date) }),
        h("td", { class: "num", text: pad(g.first) + ":00–" + pad(g.last + 1) + ":00" }),
        h("td", { text: c.name }), h("td", { text: g.note || "–" }),
        h("td", {}, [btn("Sblocca", function () { return ops.removeBlock(g.keys); })])
      ]));
    });
  }

  function setupBlockForm() {
    var sc = $("#blCourt"), fr = $("#blFrom"), to = $("#blTo");
    sc.appendChild(h("option", { value: "all", text: "Tutti i campi" }));
    sc.appendChild(h("option", { value: "sport:tennis", text: "Tutti i campi da tennis" }));
    sc.appendChild(h("option", { value: "sport:padel", text: "Tutti i campi da padel" }));
    window.COURTS.forEach(function (c) { sc.appendChild(h("option", { value: c.id, text: c.name })); });
    for (var i = 8; i <= 21; i++) fr.appendChild(h("option", { value: String(i), text: pad(i) + ":00" }));
    for (var j = 9; j <= 22; j++) to.appendChild(h("option", { value: String(j), text: pad(j) + ":00" }));
    to.value = "10";
    var d = $("#blDate"); d.min = todayIso; d.value = todayIso;
    $("#blockForm").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var v = sc.value, date = d.value, from = parseInt(fr.value, 10), end = parseInt(to.value, 10), note = $("#blNote").value.trim();
      if (!date || date < todayIso) { blkMsg("Scegli un giorno da oggi in poi.", true); return; }
      if (end <= from) { blkMsg("L'ora finale deve essere dopo quella iniziale.", true); return; }
      var courts = window.COURTS.filter(function (c) { return v === "all" || v === c.id || v === "sport:" + c.sport; });
      var nowH = new Date().getHours(), todo = [], taken = [], past = 0, already = 0;
      courts.forEach(function (c) {
        for (var hr = from; hr < end; hr++) {
          var k = c.id + "_" + date + "_" + pad(hr);
          if (date === todayIso && hr <= nowH) { past++; continue; }
          if (S.blocks[k]) { already++; continue; }
          var bk = S.bookings[k];
          if (bk && !expired(bk)) { taken.push(c.name + " " + pad(hr) + ":00"); continue; }
          todo.push({ k: k, court: c.id, hour: hr });
        }
      });
      var btnEl = $("#blSubmit"); btnEl.disabled = true;
      ops.createBlocks(todo, date, note).then(function () {
        btnEl.disabled = false;
        var parts = [todo.length + (todo.length === 1 ? " slot bloccato." : " slot bloccati.")];
        if (taken.length) parts.push("Saltati perché già prenotati da un cliente: " + taken.join(", ") + ". Gestiscili dalla tabella prenotazioni.");
        if (past) parts.push(past + " già passati.");
        if (already) parts.push(already + " erano già bloccati.");
        blkMsg(parts.join(" "), taken.length > 0 && todo.length === 0);
      }, function () { btnEl.disabled = false; blkMsg("Blocco non riuscito. Controlla la connessione e riprova.", true); });
    });
  }

  /* ---------- operazioni: versione claude.ai (database della piattaforma) ---------- */
  function platformOps() {
    function setEnroll(r, patch) {
      var doc = S.docs[r.uid], items = (doc.items || []).filter(function (x) { return patch || x.id !== r.it.id; }).map(function (x) { return x.id === r.it.id ? Object.assign({}, x, patch) : x; });
      return be.db.doc("enrollments/" + r.uid).set({ items: items });
    }
    return {
      markPaid: function (k) { return be.db.doc("bookings/" + k).update({ status: "pagata", paidAt: new Date().toISOString() }); },
      deleteBooking: function (k) {
        return be.db.doc("bookings/" + k).delete().then(function () {
          var uid = S.infoOwner[k];
          if (!uid) return;
          var items = Object.assign({}, S.infoDocs[uid] || {}); delete items[k];
          return be.db.doc("bookingInfo/" + uid).set({ items: items });
        });
      },
      confirmEnroll: function (r) { return setEnroll(r, { status: "confermata", confirmedAt: new Date().toISOString() }); },
      deleteEnroll: function (r) { return setEnroll(r, null); },
      createBlocks: function (todo, date, note) {
        return todo.reduce(function (p, it) {
          return p.then(function () { return be.db.doc("blocks/" + it.k).set({ court: it.court, date: date, hour: it.hour, createdAt: new Date().toISOString() }); })
            .then(function () { return be.db.doc("blockNotes/" + it.k).set({ note: note, createdAt: new Date().toISOString() }); });
        }, Promise.resolve());
      },
      removeBlock: function (keys) {
        return keys.reduce(function (p, k) {
          return p.then(function () { return be.db.doc("blocks/" + k).delete(); }).then(function () { return be.db.doc("blockNotes/" + k).delete(); });
        }, Promise.resolve());
      }
    };
  }
  function startPlatform() {
    be.db.collection("blocks").onSnapshot(function (s) { var m = {}; s.docs.forEach(function (d) { m[d.id] = d.data(); }); S.blocks = m; render(); }, function () {});
    be.db.collection("blockNotes").onSnapshot(function (s) { var m = {}; s.docs.forEach(function (d) { m[d.id] = d.data(); }); S.notes = m; render(); }, function () {});
    be.db.collection("bookings").onSnapshot(function (s) { var m = {}; s.docs.forEach(function (d) { m[d.id] = d.data(); }); S.bookings = m; render(); }, function () {});
    be.db.collection("bookingInfo").onSnapshot(function (s) {
      var m = {}; S.infoDocs = {}; S.infoOwner = {};
      s.docs.forEach(function (d) {
        var items = (d.data() || {}).items || {}; S.infoDocs[d.id] = items;
        Object.keys(items).forEach(function (k) { m[k] = items[k]; S.infoOwner[k] = d.id; });
      });
      S.info = m; render();
    }, function () {});
    be.db.collection("enrollments").onSnapshot(function (s) {
      var list = []; S.docs = {};
      s.docs.forEach(function (d) { var v = d.data() || {}; S.docs[d.id] = v; (v.items || []).forEach(function (it) { list.push({ uid: d.id, it: it }); }); });
      list.sort(function (a, c) { return a.it.createdAt < c.it.createdAt ? 1 : -1; });
      S.enroll = list; render();
    }, function () {});
  }

  /* ---------- operazioni: versione pubblica (Supabase) ---------- */
  function supabaseOps() {
    function reload() {
      return be.staffLoad().then(function (x) {
        S.bookings = x.bookings; S.info = x.info; S.enroll = x.enroll; S.blocks = x.blocks; S.notes = x.notes; S.rowOf = x.rowOf; render();
      });
    }
    ops = {
      reload: reload,
      markPaid: function (k, b) { return be.confirmBooking(b.ref).then(reload); },
      deleteBooking: function (k, b) { return be.cancelBooking(b.ref).then(reload); },
      confirmEnroll: function (r, cert) { return be.confirmEnrollment(r.it.id, cert).then(reload); },
      deleteEnroll: function (r) { return be.removeEnrollment(r.it.id).then(reload); },
      createBlocks: function (todo, date, note) {
        var byCourt = {};
        todo.forEach(function (it) { (byCourt[it.court] = byCourt[it.court] || []).push(it.hour); });
        var rows = [];
        Object.keys(byCourt).forEach(function (court) {
          var hrs = byCourt[court].sort(function (a, b) { return a - b; }), start = hrs[0], prev = hrs[0];
          for (var i = 1; i <= hrs.length; i++) {
            if (i === hrs.length || hrs[i] !== prev + 1) {
              rows.push({ court_id: court, start_at: App.romeIso(date, start), end_at: App.romeIso(date, prev + 1), reason: note || null, created_by: be.uid });
              start = hrs[i]; prev = hrs[i];
            } else prev = hrs[i];
          }
        });
        if (!rows.length) return Promise.resolve();
        return be.addBlocks(rows).then(reload);
      },
      removeBlock: function (keys) {
        var ids = [];
        keys.forEach(function (k) { var id = S.rowOf[k]; if (id && ids.indexOf(id) < 0) ids.push(id); });
        if (!ids.length) return Promise.resolve();
        return be.removeBlockRows(ids).then(reload);
      }
    };
    return ops;
  }

  /* ---------- avvio ---------- */
  App.backend().then(function (b) {
    be = b;
    var gate = $("#gate"), msg = $("#gateMsg");
    if (b.mode === "supabase") {
      isSb = true;
      if (b.broken) { msg.textContent = "Non riusciamo a collegarci al database. Ricarica la pagina tra poco."; return; }
      if (b.needLogin) { msg.textContent = ""; msg.appendChild(document.createTextNode("Quest'area è riservata alla segreteria. ")); msg.appendChild(h("a", { href: "accedi.html#segreteria", text: "Accedi con le tue credenziali" })); return; }
      if (!b.canEdit) { msg.textContent = "Il tuo account non ha accesso all'area segreteria. Chiedi all'amministratore di abilitarlo."; return; }
      gate.hidden = true; $("#admin").hidden = false;
      setupBlockForm(); supabaseOps();
      ops.reload().then(function () {}, function () { msg.textContent = "Impossibile caricare i dati. Ricarica la pagina."; gate.hidden = false; $("#admin").hidden = true; });
      setInterval(function () { ops.reload().then(function () {}, function () {}); }, 20000);
      return;
    }
    if (b.mode === "demo") { msg.textContent = "L'area segreteria richiede i dati condivisi: aprila dal link del sito condiviso, con un account autorizzato a modificare."; return; }
    if (!b.canEdit) { msg.textContent = "Quest'area è riservata alla segreteria. Accedi con un account che può modificare il sito."; return; }
    gate.hidden = true; $("#admin").hidden = false;
    ops = platformOps();
    setupBlockForm();
    startPlatform();
    render();
  });
});
