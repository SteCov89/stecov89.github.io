/* Prenotazione campi con pagamento anticipato. */
(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, pad = App.pad, C = window.CLUB, COURTS = window.COURTS;
  var HOURS = []; for (var i = 8; i <= 21; i++) HOURS.push(i);
  var LS = "ptp-demo-bookings";
  var state = { sport: "tennis", date: null, sel: null, bookings: {}, blocks: {}, be: null, payKey: null };

  var today = new Date(), todayIso = App.iso(today);
  state.date = todayIso;
  var DAYS = []; for (var di = 0; di < 14; di++) { var dd = new Date(today); dd.setDate(today.getDate() + di); DAYS.push(App.iso(dd)); }

  $("#holdOn").textContent = C.holdOnlineMin;
  $("#holdBk").textContent = C.holdBankHours;
  $("#policy").textContent = C.cancelPolicy;

  function key(c, d, hr) { return c + "_" + d + "_" + pad(hr); }
  function isPast(date, hr) { if (date < todayIso) return true; if (date > todayIso) return false; return hr <= new Date().getHours(); }
  function expired(bk) { return bk && bk.status === "da_pagare" && bk.holdUntil && Date.parse(bk.holdUntil) < Date.now(); }
  function occupied(bk) { return !!bk && !expired(bk); }
  function mine(bk) { return !!bk && !!state.be && bk.uid === state.be.uid; }
  function say(text, err) { var m = $("#bkMsg"); m.textContent = ""; if (text) m.appendChild(h("div", { class: "msg" + (err ? " err" : ""), text: text })); }

  /* ---------- disegno ---------- */
  function renderDays() {
    var box = $("#days"); box.textContent = "";
    DAYS.forEach(function (s) {
      var d = App.parseIso(s);
      var b = h("button", { type: "button", class: "day", "aria-pressed": String(s === state.date), "aria-label": App.fmtDay(s) }, [
        h("small", { text: s === todayIso ? "oggi" : App.WD[d.getDay()] }), h("b", { text: String(d.getDate()) })
      ]);
      b.addEventListener("click", function () { state.date = s; state.sel = null; renderAll(); });
      box.appendChild(b);
    });
  }

  var SLOT_LABEL = { pagata: "Tuo", al_circolo: "Tuo", da_pagare: "Da pagare", in_verifica: "In verifica" };

  function renderGrid() {
    var list = COURTS.filter(function (c) { return c.sport === state.sport; });
    var g = $("#grid"); g.textContent = "";
    g.style.gridTemplateColumns = "3.2rem repeat(" + list.length + ", minmax(0, 1fr))";
    g.appendChild(h("div"));
    list.forEach(function (c) { g.appendChild(h("div", { class: "hd" }, [c.name, h("small", { text: c.cover + " · " + App.euro(c.price) })])); });
    var canBook = state.be && state.be.canWrite;
    HOURS.forEach(function (hr) {
      g.appendChild(h("div", { class: "t", text: pad(hr) + ":00" }));
      list.forEach(function (c) {
        var k = key(c.id, state.date, hr), bk = state.bookings[k], past = isPast(state.date, hr);
        var cls = "slot" + (c.sport === "padel" ? " padel" : ""), label = "Libero", dis = false, isMine = occupied(bk) && mine(bk);
        if (past) { cls += " past"; label = "–"; dis = true; }
        else if (isMine) { cls += " mine"; label = SLOT_LABEL[bk.status] || "Tuo"; dis = true; }
        else if (occupied(bk) || state.blocks[k]) { cls += " taken"; label = "Occupato"; dis = true; }
        else if (!canBook) { dis = true; }
        var sel = state.sel && state.sel.court === c.id && state.sel.hour === hr && state.sel.date === state.date;
        var b = h("button", { type: "button", class: cls, text: label, "aria-pressed": String(!!sel), "aria-label": c.name + " alle " + pad(hr) + ":00, " + label.toLowerCase() });
        if (dis) b.disabled = true;
        b.addEventListener("click", function () {
          state.sel = { court: c.id, hour: hr, date: state.date };
          say("");
          renderGrid(); renderSummary();
          if (matchMedia("(max-width: 62rem)").matches) $("#summary").scrollIntoView({ block: "center", behavior: "smooth" });
        });
        g.appendChild(b);
      });
    });
  }

  function renderSummary() {
    var s = $("#summary"), f = $("#bookForm");
    s.textContent = "";
    if (!state.sel) { s.className = "empty"; s.textContent = "Scegli uno slot libero nella griglia per iniziare."; f.hidden = true; return; }
    var c = App.courtById(state.sel.court);
    s.className = "summary";
    s.appendChild(h("div", { class: "big", text: c.name }));
    s.appendChild(h("div", { class: "sub", text: App.fmtDay(state.sel.date) + " · " + pad(state.sel.hour) + ":00–" + pad(state.sel.hour + 1) + ":00" }));
    s.appendChild(h("div", { class: "sub", text: c.surface + " · " + c.cover }));
    s.appendChild(h("div", { class: "price", text: App.euro(c.price) }));
    f.hidden = false;
  }

  function badge(status) {
    var cls = status === "pagata" ? "badge ok" : (status === "da_pagare" || status === "in_verifica" ? "badge wait" : "badge");
    return h("span", { class: cls, text: App.STATUS[status] || status });
  }

  function myBookings() {
    return Object.keys(state.bookings).map(function (k) { return [k, state.bookings[k]]; })
      .filter(function (e) { return mine(e[1]) && occupied(e[1]) && !isPast(e[1].date, e[1].hour); })
      .sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
  }

  function renderMine() {
    var ul = $("#myList"); ul.textContent = "";
    var list = myBookings();
    $("#myEmpty").hidden = list.length > 0;
    list.forEach(function (e) {
      var b = e[1], c = App.courtById(b.court), acts = h("div", { class: "acts" });
      if (b.status === "da_pagare") {
        var pb = h("button", { type: "button", class: "link", text: "Paga" });
        pb.addEventListener("click", function () { state.payKey = e[0]; renderPay(); $("#payPanel").scrollIntoView({ block: "nearest", behavior: "smooth" }); });
        acts.appendChild(pb);
      }
      if (b.status !== "pagata") {
        var cb = h("button", { type: "button", class: "link", text: "Annulla" });
        cb.addEventListener("click", function () { cancel(e[0]); });
        acts.appendChild(cb);
      }
      ul.appendChild(h("li", {}, [
        h("span", {}, [h("b", { text: c.name }), h("small", { text: App.fmtDay(b.date) + " · " + pad(b.hour) + ":00 · " + App.euro(b.amount) }), h("small", { text: "Codice " + b.ref })]),
        badge(b.status), acts
      ]));
    });
  }

  function renderPay() {
    var box = $("#payPanel"), k = state.payKey, bk = k && state.bookings[k];
    box.textContent = "";
    if (!bk || bk.status !== "da_pagare" || !mine(bk) || expired(bk)) { box.hidden = true; if (k && (!bk || bk.status !== "da_pagare")) state.payKey = null; return; }
    box.hidden = false;
    box.appendChild(App.payPanel({
      amount: bk.amount, ref: bk.ref, method: bk.pay === "bank" ? "bank" : "online", holdUntil: bk.holdUntil,
      title: "Completa il pagamento", onDeclare: function () { return declare(k); }
    }));
  }

  function renderAll() { renderDays(); renderGrid(); renderSummary(); renderMine(); renderPay(); }

  /* ---------- salvataggio ---------- */
  function loadLocal() { state.bookings = App.lget(LS, {}); }
  function saveLocal() { App.lset(LS, state.bookings); }
  function shared() { return state.be && state.be.mode === "shared"; }

  function book(sel, name, method) {
    var c = App.courtById(sel.court), k = key(sel.court, sel.date, sel.hour), now = Date.now();
    var rec = { court: sel.court, sport: c.sport, date: sel.date, hour: sel.hour, uid: state.be.uid, pay: method, ref: App.ref(), amount: c.price, createdAt: new Date(now).toISOString() };
    if (method === "circolo") rec.status = "al_circolo";
    else {
      rec.status = "da_pagare";
      var hold = now + (method === "bank" ? C.holdBankHours * 3600000 : C.holdOnlineMin * 60000);
      var start = new Date(sel.date + "T" + pad(sel.hour) + ":00:00").getTime();
      rec.holdUntil = new Date(Math.min(hold, start)).toISOString();
    }
    if (!shared()) {
      if (occupied(state.bookings[k])) return Promise.resolve(null);
      state.bookings[k] = rec; saveLocal(); return Promise.resolve({ k: k, rec: rec });
    }
    var ref = state.be.db.doc("bookings/" + k);
    return state.be.db.doc("blocks/" + k).get().then(function (bs) {
      return bs.exists ? { blocked: true } : ref.acquire({ holder: state.be.uid, ttlMs: 5000 });
    }).then(function (r) {
      if (r.blocked || !r.acquired) return null;
      return ref.get().then(function (snap) {
        var cur = snap.exists ? snap.data() : null;
        if (occupied(cur)) return null;
        return ref.set(rec).then(function () {
          /* il nome resta in un documento leggibile solo dalla segreteria */
          return editInfo(function (items) { items[k] = { name: name, ref: rec.ref }; })
            .then(function () { return { k: k, rec: rec }; }, function () { return { k: k, rec: rec }; });
        });
      });
    });
  }

  /* nomi delle prenotazioni: un documento per persona, leggibile solo dalla segreteria */
  function editInfo(fn) {
    var ref = state.be.db.doc("bookingInfo/" + state.be.uid);
    return ref.get().then(function (snap) {
      var d = snap.exists ? snap.data() : null, items = Object.assign({}, (d && d.items) || {});
      fn(items);
      return ref.set({ items: items });
    });
  }

  function declare(k) {
    if (!shared()) { state.bookings[k].status = "in_verifica"; saveLocal(); state.payKey = null; renderAll(); say("Grazie. La segreteria verificherà il pagamento."); return Promise.resolve(); }
    return state.be.db.doc("bookings/" + k).update({ status: "in_verifica", declaredAt: new Date().toISOString() }).then(function () {
      state.payKey = null; say("Grazie. La segreteria verificherà il pagamento e confermerà la prenotazione.");
    }, function () { say("Non è stato possibile aggiornare lo stato. Riprova.", true); throw new Error("x"); });
  }

  function cancel(k) {
    if (!shared()) { delete state.bookings[k]; saveLocal(); if (state.payKey === k) state.payKey = null; renderAll(); say("Prenotazione annullata."); return; }
    state.be.db.doc("bookings/" + k).delete().then(function () {
      if (state.payKey === k) state.payKey = null;
      editInfo(function (items) { delete items[k]; }).then(function () {}, function () {});
      say("Prenotazione annullata.");
    }, function () { say("Non è stato possibile annullare. Riprova.", true); });
  }

  $("#bookForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var name = $("#bkName").value.trim(), method = (document.querySelector('input[name="pay"]:checked') || {}).value || "circolo";
    if (!state.sel || !name) { say("Inserisci nome e cognome per confermare.", true); return; }
    var sel = state.sel, btn = $("#bkConfirm"); btn.disabled = true;
    book(sel, name, method).then(function (res) {
      btn.disabled = false;
      if (!res) { say("Questo slot è stato appena prenotato da un altro utente. Scegline un altro.", true); state.sel = null; renderAll(); return; }
      var c = App.courtById(sel.court);
      state.sel = null;
      if (res.rec.status === "da_pagare") { state.payKey = res.k; say("Slot riservato: " + c.name + ", " + App.fmtDay(sel.date) + " alle " + pad(sel.hour) + ":00. Completa il pagamento qui sotto."); }
      else say("Prenotazione confermata: " + c.name + ", " + App.fmtDay(sel.date) + " alle " + pad(sel.hour) + ":00. Paghi al circolo.");
      renderAll();
      if (state.payKey) $("#payPanel").scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, function () { btn.disabled = false; say("Prenotazione non riuscita. Controlla la connessione e riprova.", true); });
  });

  $("#sportTennis").addEventListener("click", function () { setSport("tennis"); });
  $("#sportPadel").addEventListener("click", function () { setSport("padel"); });
  function setSport(s) {
    state.sport = s; state.sel = null;
    $("#sportTennis").setAttribute("aria-pressed", String(s === "tennis"));
    $("#sportPadel").setAttribute("aria-pressed", String(s === "padel"));
    renderAll();
  }

  /* ---------- avvio ---------- */
  App.chrome("prenota.html");
  var note = $("#modeNote");
  state.be = { mode: "demo", uid: "local", canWrite: true };
  loadLocal(); renderAll();
  note.hidden = false; note.textContent = "Caricamento delle prenotazioni condivise…";

  App.backend().then(function (be) {
    state.be = be;
    if (be.mode === "demo") {
      note.textContent = "Modalità demo: le prenotazioni restano solo su questo dispositivo.";
      loadLocal(); renderAll(); return;
    }
    state.bookings = {};
    note.hidden = be.mode === "shared";
    be.db.collection("blocks").onSnapshot(function (s) {
      var m = {}; s.docs.forEach(function (d) { m[d.id] = d.data(); });
      state.blocks = m; renderGrid();
    }, function () {});
    if (be.mode === "readonly") note.textContent = "Sei in sola lettura: vedi gli slot occupati ma non puoi prenotare.";
    be.db.collection("bookings").onSnapshot(function (snap) {
      var m = {}; snap.docs.forEach(function (d) { m[d.id] = d.data(); });
      state.bookings = m; renderGrid(); renderMine(); renderPay();
    }, function () {
      state.be = { mode: "demo", uid: "local", canWrite: true }; loadLocal();
      note.hidden = false; note.textContent = "Prenotazioni condivise non disponibili: modalità demo su questo dispositivo.";
      renderAll();
    });
    renderAll();
  });
  setInterval(function () { renderGrid(); renderMine(); }, 30000);
})();
