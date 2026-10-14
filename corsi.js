/* Pagina corsi: elenco, filtri, iscrizione con pagamento anticipato. */
(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, C = window.CLUB, COURSES = window.COURSES;
  var LS = "ptp-demo-enroll";
  var state = { sport: "all", age: null, be: null, items: [], payId: null };

  App.chrome("corsi.html");

  /* ---------- elenco corsi ---------- */
  function renderCourses() {
    var box = $("#courseGrid"); box.textContent = "";
    var list = COURSES.filter(function (c) {
      if (state.sport !== "all" && c.sport !== state.sport) return false;
      if (state.age !== null && (state.age < c.ageMin || state.age > c.ageMax)) return false;
      return true;
    });
    $("#courseEmpty").hidden = list.length > 0;
    list.forEach(function (c) {
      var go = h("button", { type: "button", class: "btn solid small", text: "Iscriviti" });
      go.addEventListener("click", function () { $("#enCourse").value = c.id; updateSummary(); $("#iscrizione").scrollIntoView({ behavior: "smooth", block: "start" }); });
      box.appendChild(h("article", { class: "course" }, [
        h("div", { class: "top-row" }, [h("span", { class: "tag" + (c.sport === "padel" ? " padel" : ""), text: c.sport === "padel" ? "Padel" : "Tennis" }), h("span", { class: "badge", text: c.level })]),
        h("h3", { text: c.name }),
        h("div", { class: "price" }, [App.euro(c.price), h("small", { text: " / ciclo di " + c.lessons + (c.lessons === 1 ? " lezione" : " lezioni") })]),
        h("p", { text: c.text }),
        h("ul", { class: "facts" }, [
          h("li", {}, [h("span", { text: "Età" }), h("span", { text: c.age })]),
          h("li", {}, [h("span", { text: "Giorni" }), h("span", { text: c.days })]),
          h("li", {}, [h("span", { text: "Orario" }), h("span", { text: c.time })]),
          h("li", {}, [h("span", { text: "Gruppo" }), h("span", { text: c.group })]),
          coachRow(c),
          h("li", {}, [h("span", { text: "Inizio" }), h("span", { text: c.start })])
        ]),
        go
      ]));
    });
  }
  document.querySelectorAll(".chip").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      state.sport = b.getAttribute("data-s"); renderCourses();
    });
  });
  $("#ageFilter").addEventListener("input", function () { var v = parseInt(this.value, 10); state.age = isNaN(v) ? null : v; renderCourses(); });

  /* ---------- modulo ---------- */
  var sel = $("#enCourse");
  sel.appendChild(h("option", { value: "", text: "Seleziona un corso" }));
  COURSES.forEach(function (c) { sel.appendChild(h("option", { value: c.id, text: c.name + " · " + c.age + " · " + c.days })); });
  sel.addEventListener("change", updateSummary);

  function updateSummary() {
    var s = $("#enSummary"), c = App.courseById(sel.value);
    s.textContent = "";
    if (!c) { s.className = "empty"; s.textContent = "Scegli un corso per vedere l'importo da pagare."; return; }
    s.className = "";
    s.appendChild(h("div", { class: "summary" }, [h("div", { class: "big", text: c.name }), h("div", { class: "sub", text: c.days + " · " + c.time }), h("div", { class: "sub", text: "Inizio " + c.start })]));
    s.appendChild(h("div", { class: "price-box" }, [
      h("div", {}, [h("span", { text: "Quota associativa annuale" }), h("span", { text: App.euro(C.enrollFee) })]),
      h("div", {}, [h("span", { text: "Ciclo di " + c.lessons + (c.lessons === 1 ? " lezione" : " lezioni") }), h("span", { text: App.euro(c.price) })]),
      h("div", {}, [h("span", { text: "Totale da pagare" }), h("span", { text: App.euro(C.enrollFee + c.price) })])
    ]));
  }

  function say(text, err) { var m = $("#enMsg"); m.textContent = ""; if (text) m.appendChild(h("div", { class: "msg" + (err ? " err" : ""), text: text })); }

  function persist(items) {
    state.items = items;
    if (state.be.mode === "shared") return state.be.db.doc("enrollments/" + state.be.uid).set({ items: items });
    App.lset(LS, items); return Promise.resolve();
  }

  $("#enrollForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var c = App.courseById(sel.value);
    if (!c) { say("Scegli il corso a cui iscriverti.", true); return; }
    if (!state.be || !state.be.canWrite) { say("In questa visualizzazione non puoi inviare iscrizioni.", true); return; }
    var method = (document.querySelector('input[name="enpay"]:checked') || {}).value || "circolo";
    var it = {
      id: App.ref(), courseId: c.id, participant: $("#enName").value.trim(), birth: $("#enBirth").value,
      guardian: $("#enGuardian").value.trim(), email: $("#enMail").value.trim(), phone: $("#enPhone").value.trim(),
      pay: method, amount: C.enrollFee + c.price, status: method === "circolo" ? "richiesta" : "da_pagare", createdAt: new Date().toISOString()
    };
    var btn = $("#enSubmit"); btn.disabled = true;
    persist(state.items.concat([it])).then(function () {
      btn.disabled = false;
      $("#enrollForm").reset(); updateSummary();
      if (it.status === "da_pagare") { state.payId = it.id; say("Richiesta inviata. Completa il pagamento qui accanto per accelerare la conferma."); }
      else say("Richiesta inviata. Porta il certificato medico e salda l'importo in segreteria: ti confermeremo l'iscrizione.");
      renderEnroll();
      if (state.payId) $("#enPayPanel").scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, function () { btn.disabled = false; state.items = state.items.slice(0, -1); say("Invio non riuscito. Controlla la connessione e riprova.", true); });
  });

  function declare(id) {
    var items = state.items.map(function (x) { return x.id === id ? Object.assign({}, x, { status: "in_verifica", declaredAt: new Date().toISOString() }) : x; });
    return persist(items).then(function () { state.payId = null; say("Grazie. La segreteria verificherà il pagamento e confermerà l'iscrizione."); renderEnroll(); },
      function () { say("Non è stato possibile aggiornare lo stato. Riprova.", true); throw new Error("x"); });
  }

  function cancel(id) {
    persist(state.items.filter(function (x) { return x.id !== id; })).then(function () { if (state.payId === id) state.payId = null; say("Richiesta annullata."); renderEnroll(); },
      function () { say("Non è stato possibile annullare. Riprova.", true); });
  }

  function renderEnroll() {
    var ul = $("#enList"); ul.textContent = "";
    $("#enEmpty").hidden = state.items.length > 0;
    state.items.forEach(function (it) {
      var c = App.courseById(it.courseId) || { name: "Corso" }, acts = h("div", { class: "acts" });
      if (it.status === "da_pagare") { var pb = h("button", { type: "button", class: "link", text: "Paga" }); pb.addEventListener("click", function () { state.payId = it.id; renderEnroll(); }); acts.appendChild(pb); }
      if (it.status !== "confermata") { var cb = h("button", { type: "button", class: "link", text: "Annulla" }); cb.addEventListener("click", function () { cancel(it.id); }); acts.appendChild(cb); }
      var cls = it.status === "confermata" ? "badge ok" : (it.status === "da_pagare" || it.status === "in_verifica" ? "badge wait" : "badge");
      ul.appendChild(h("li", {}, [
        h("span", {}, [h("b", { text: c.name }), h("small", { text: it.participant + " · " + App.euro(it.amount) }), h("small", { text: "Codice " + it.id })]),
        h("span", { class: cls, text: App.STATUS[it.status] || it.status }), acts
      ]));
    });
    var box = $("#enPayPanel"), cur = state.payId && state.items.filter(function (x) { return x.id === state.payId; })[0];
    box.textContent = "";
    if (!cur || cur.status !== "da_pagare") { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(App.payPanel({ amount: cur.amount, ref: cur.id, method: cur.pay === "bank" ? "bank" : "online", title: "Pagamento iscrizione", onDeclare: function () { return declare(cur.id); } }));
  }

  /* ---------- istruttori ---------- */
  var NS = "http://www.w3.org/2000/svg", COACHES = window.INSTRUCTORS || [], coachById = {}, lastFocus = null;
  COACHES.forEach(function (c) { coachById[c.id] = c; });
  var cdlg = $("#coachDlg");

  function se(tag, a, text) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; return e; }
  function portrait(ins) {
    if (ins.photo) return h("img", { src: ins.photo, alt: "Foto di " + ins.name });
    var initials = ins.name.split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
    var s = se("svg", { viewBox: "0 0 300 400", preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": "Foto segnaposto di " + ins.name });
    s.appendChild(se("rect", { width: 300, height: 400, fill: ins.color }));
    s.appendChild(se("ellipse", { cx: 150, cy: 400, rx: 120, ry: 150, fill: "#FFFFFF", "fill-opacity": ".22" }));
    s.appendChild(se("circle", { cx: 150, cy: 160, r: 62, fill: "#FFFFFF", "fill-opacity": ".3" }));
    s.appendChild(se("text", { x: 22, y: 64, style: "font-family:'Big Shoulders Display','Arial Narrow',Impact,sans-serif;font-weight:900;font-size:56px;fill:#F3F7EE" }, initials));
    return s;
  }
  function coachRow(c) {
    var ins = c.coachId && coachById[c.coachId], val;
    if (ins) {
      val = h("button", { type: "button", class: "link", text: ins.name });
      val.addEventListener("click", function () { lastFocus = val; openCoach(ins.id); });
    } else val = h("span", { text: c.coach });
    return h("li", {}, [h("span", { text: "Istruttore" }), val]);
  }
  function renderCoaches() {
    var box = $("#coachGrid"); box.textContent = "";
    COACHES.forEach(function (ins) {
      var b = h("button", { type: "button", class: "btn small", text: "Scheda completa" });
      b.addEventListener("click", function () { lastFocus = b; openCoach(ins.id); });
      var ph = h("div", { class: "ph" }); ph.appendChild(portrait(ins));
      box.appendChild(h("article", { class: "coach" }, [ph, h("div", { class: "body" }, [
        h("span", { class: "role", text: ins.role }), h("h3", { text: ins.name }), h("p", { text: ins.short }), b
      ])]));
    });
  }
  function list(items, cls) { var ul = h("ul", { class: cls || "tl" }); items.forEach(function (t) { ul.appendChild(h("li", { text: t })); }); return ul; }
  function openCoach(id) {
    var ins = coachById[id]; if (!ins) return;
    var ph = $("#coachPhoto"); ph.textContent = ""; ph.appendChild(portrait(ins));
    var info = $("#coachInfo"); info.textContent = "";
    info.appendChild(h("span", { class: "role", style: "font:500 .72rem/1.3 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--court)", text: ins.role }));
    info.appendChild(h("h2", { id: "coachName", text: ins.name }));
    info.appendChild(h("p", { text: ins.years + " anni di esperienza come istruttore" }));
    ins.bio.forEach(function (p) { info.appendChild(h("p", { text: p })); });
    info.appendChild(h("h4", { text: "Qualifiche" })); info.appendChild(list(ins.qualifications));
    info.appendChild(h("h4", { text: "Specialità" })); info.appendChild(list(ins.specialties));
    var mine = COURSES.filter(function (c) { return c.coachId === id; });
    if (mine.length) {
      info.appendChild(h("h4", { text: "Corsi che tiene" }));
      var ul = h("ul", { class: "coach-courses" });
      mine.forEach(function (c) {
        var go = h("button", { type: "button", class: "btn solid small", text: "Iscriviti" });
        go.addEventListener("click", function () { closeCoach(true); sel.value = c.id; updateSummary(); $("#iscrizione").scrollIntoView({ behavior: "smooth", block: "start" }); });
        ul.appendChild(h("li", {}, [h("span", {}, [c.name, h("small", { text: c.days + " · " + c.time })]), go]));
      });
      info.appendChild(ul);
    }
    try { if (!cdlg.open) cdlg.showModal(); } catch (err) { cdlg.setAttribute("open", ""); }
  }
  function closeCoach(skipFocus) {
    try { cdlg.close(); } catch (err) { cdlg.removeAttribute("open"); }
    if (!skipFocus && lastFocus) lastFocus.focus();
  }
  $("#coachClose").addEventListener("click", function () { closeCoach(); });
  cdlg.addEventListener("click", function (ev) { if (ev.target === cdlg) closeCoach(); });
  renderCoaches();
  renderCourses();

  /* ---------- avvio ---------- */
  renderCourses(); updateSummary();
  state.be = { mode: "demo", uid: "local", canWrite: true };
  state.items = App.lget(LS, []); renderEnroll();
  var note = $("#enNote");

  App.backend().then(function (be) {
    state.be = be;
    if (be.mode === "demo") { note.hidden = false; note.textContent = "Modalità demo: le iscrizioni restano solo su questo dispositivo."; return; }
    state.items = [];
    if (be.mode === "readonly") { note.hidden = false; note.textContent = "Sei in sola lettura: non puoi inviare iscrizioni."; renderEnroll(); return; }
    be.db.doc("enrollments/" + be.uid).onSnapshot(function (snap) {
      var d = snap.exists ? snap.data() : null;
      state.items = (d && Array.isArray(d.items)) ? d.items : [];
      renderEnroll();
    }, function () {
      state.be = { mode: "demo", uid: "local", canWrite: true }; state.items = App.lget(LS, []);
      note.hidden = false; note.textContent = "Iscrizioni condivise non disponibili: modalità demo su questo dispositivo."; renderEnroll();
    });
    renderEnroll();
  });
})();
