/* Modifica del sito direttamente nelle pagine.
   Amministratore: testi, titoli, voci di menu, immagini (con dimensione), intestazione, piè di pagina e tutti i contenuti (storia, struttura, campi, corsi, staff, galleria, eventi, contatti, regole di prenotazione).
   Segreteria: solo i contenuti che le competono (campi, corsi, staff, eventi, contatti).
   Ridimensionamento a trascinamento di intestazione, piè di pagina, loghi e icone social (maniglie blu sulla pagina).
   Un clic su una scheda (corso, istruttore, evento, campo, area, tappa della storia, foto) apre direttamente la sua modifica.
   Salva in "pagine" (testi e immagini fissi), "sito" (titoli, menu, intestazione, piè di pagina) e nei dati di Storia e Struttura (titolo). */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, cms = App.cms;
  var file = location.pathname.split("/").pop() || "index.html";
  var key = file.replace(/\.html$/, "") || "index";
  if (key === "segreteria") return;

  /* blocchi che si compilano da soli: [selettore, sezione, testo del pulsante, chi può: "seg" (anche Segreteria) o "admin"] */
  var DYN = {
    index: [["#nextEvents", "eventi", "Modifica gli eventi", "seg"]],
    corsi: [["#courseGrid", "corsi", "Modifica i corsi", "seg"], ["#courseGrid", "staff", "Modifica lo staff", "seg"], ["#courseGrid", "quota", "Quota associativa", "admin"]],
    staff: [["#coachGrid", "staff", "Modifica lo staff", "seg"]],
    eventi: [["#events", "eventi", "Modifica gli eventi", "seg"]],
    galleria: [["#gallery", "galleria", "Modifica la galleria", "admin"]],
    storia: [["#stText", "storia", "Modifica testo e timeline", "admin"], ["#stTimeline", "storia", "Modifica la timeline", "admin"]],
    struttura: [["#courtCards", "campi", "Modifica i campi", "seg"], ["#areas", "struttura", "Modifica aree e servizi", "admin"]],
    contatti: [["#rows", "contatti", "Modifica contatti, orari e mappa", "seg"], ["#mapBox", "contatti", "Cambia la mappa", "seg"]],
    prenota: [["#grid", "campi", "Modifica campi e tariffe", "seg"], ["#grid", "regole", "Regole di prenotazione", "admin"]]
  };
  var TITLES = { campi: "Campi da gioco", corsi: "Corsi", staff: "Staff", eventi: "Eventi", contatti: "Contatti, orari e mappa", struttura: "Aree e servizi", storia: "Storia e timeline",
    galleria: "Galleria", regole: "Regole di prenotazione", quota: "Quota associativa", intestazione: "Intestazione e menu", footer: "Piè di pagina" };

  /* schede cliccabili in modalità modifica: [selettore, sezione, chi può, titolo della scheda come compare nell'elenco di modifica] */
  var txt = function (el, sel) { var n = sel ? el.querySelector(sel) : el; return n ? n.textContent.replace(/\s+/g, " ").trim() : ""; };
  var ITEMS = {
    index: [[".event", "eventi", "seg", function (el) { return txt(el, "h3"); }]],
    corsi: [[".course", "corsi", "seg", function (el) { return txt(el, "h3"); }]],
    staff: [[".coach", "staff", "seg", function (el) { return txt(el, "h3"); }]],
    eventi: [[".event", "eventi", "seg", function (el) { return txt(el, "h3"); }]],
    galleria: [[".gtile", "galleria", "admin", function (el) { return txt(el, ".cap") || "Foto senza didascalia"; }]],
    storia: [["#stTimeline li", "storia", "admin", function (el) { return txt(el, ".yr") + " · " + txt(el, "h3"); }]],
    struttura: [["#courtCards .court", "campi", "seg", function (el) { return txt(el, "h3"); }], [".area", "struttura", "admin", function (el) { return txt(el, "h3"); }]]
  };

  App.backend().then(function (be) {
    if (!be || !be.canEdit) return;
    var admin = (be.role || "admin") === "admin", lite = !admin;
    var fab = h("button", { type: "button", class: "ed-fab", text: lite ? "✎ Modifica contenuti" : "✎ Modifica questa pagina" });
    fab.addEventListener("click", function () { start(); });
    document.body.appendChild(fab);

    var on = false, bar, status, saveB, exitB, items = [], imgs = [], uploaded = [], confirmExit = false, bookingsCache = {};
    var LAYK = ["hdrH", "logoH", "padY", "footLogoH", "fitpH", "socH"], lay = {}, layStart = {}, sizers = [];
    function layFromSite() {
      var SI = window.SITO || {}, hd = SI.header || {}, ft = SI.footer || {};
      return { hdrH: Number(hd.h) || 0, logoH: Number(hd.logoH) || 0, padY: Number(ft.padY) || 0, footLogoH: Number(ft.logoH) || 0, fitpH: Number(ft.fitpH) || 0, socH: Number(ft.socH) || 0 };
    }
    function layDirty() { return LAYK.some(function (k) { return lay[k] !== layStart[k]; }); }
    function layApply() {
      var SI = window.SITO || {};
      window.SITO = Object.assign({}, SI, { header: Object.assign({}, SI.header, { h: lay.hdrH, logoH: lay.logoH }), footer: Object.assign({}, SI.footer, { padY: lay.padY, logoH: lay.footLogoH, fitpH: lay.fitpH, socH: lay.socH }) });
      App.applySizes(); placeSizers(); refreshBar();
    }

    function say(t, err) { status.textContent = t; status.className = "ed-status" + (err ? " err" : ""); }
    function dirty() { return items.some(function (i) { return i.get() !== i.start; }) || layDirty() || imgs.some(function (i) { return i.val !== i.start || i.w !== i.startW; }); }
    function refreshBar() {
      if (lite) { say("Scegli sotto il blocco da modificare."); return; }
      saveB.disabled = !dirty(); if (dirty()) say("Modifiche non salvate"); else if (!status.dataset.keep) say("Clicca su un testo per modificarlo."); delete status.dataset.keep; confirmExit = false; exitB.textContent = "Esci";
    }

    function start() {
      if (on) return; on = true; fab.hidden = true;
      try { history.replaceState(null, "", "#modifica"); } catch (e) {}
      document.body.classList.add("ed-on");
      if (lite) document.body.classList.add("ed-lite");
      if (admin) {
        var isIndex = key === "index";
        document.querySelectorAll("[data-ed], [data-ed-title], header.top a[data-nav]").forEach(function (el) {
          var title = el.hasAttribute("data-ed-title"), two = isIndex && title, nav = el.getAttribute("data-nav");
          try { el.contentEditable = "plaintext-only"; } catch (e) {}
          if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
          el.spellcheck = true; el.setAttribute("role", "textbox");
          var def = nav ? (App.NAVKEYS.filter(function (k) { return k[0] === nav; })[0] || [0, ""])[1] : (el.getAttribute("data-def") || "");
          var it = { el: el, nav: nav, title: title ? el.getAttribute("data-ed-title") : null, id: el.getAttribute("data-ed"), def: def, get: function () { return App.textOf(el, two); } };
          it.start = it.get(); items.push(it);
          el.addEventListener("input", refreshBar);
          el.addEventListener("paste", function (ev) { ev.preventDefault(); var t = (ev.clipboardData || window.clipboardData).getData("text/plain"); document.execCommand("insertText", false, t); });
          el.addEventListener("keydown", function (ev) { if (nav && ev.key === "Enter") ev.preventDefault(); });
        });
        document.querySelectorAll("details").forEach(function (d) { d.open = true; d.addEventListener("toggle", function () { if (on && !d.open) d.open = true; }); });
        document.querySelectorAll("[data-ed-img]").forEach(function (el) { imgBox(el); });
        /* intestazione e piè di pagina */
        var hd = document.querySelector("header.top");
        if (hd) hd.appendChild(h("div", { class: "ed-hbar" }, [panelChip("intestazione", "✎ Intestazione e menu")]));
        var ft = document.querySelector("footer");
        if (ft) ft.insertBefore(h("div", { class: "ed-fbar" }, [panelChip("footer", "✎ Piè di pagina: contatti, link e social")]), ft.firstChild);
        lay = layFromSite(); layStart = Object.assign({}, lay);
        initSizers();
      }
      /* niente navigazione né apertura/chiusura mentre si modifica */
      document.addEventListener("click", blockNav, true);
      /* blocchi dinamici */
      (DYN[key] || []).forEach(function (d) {
        if (d[3] === "admin" && !admin) return;
        var host = document.querySelector(d[0]); if (!host) return;
        host.classList.add("ed-dyn");
        var barEl = host.previousElementSibling && host.previousElementSibling.classList.contains("ed-dynbar") ? host.previousElementSibling : null;
        if (!barEl) { barEl = h("div", { class: "ed-dynbar" }); host.insertAdjacentElement("beforebegin", barEl); }
        barEl.appendChild(panelChip(d[1], "✎ " + d[2]));
      });
      (ITEMS[key] || []).forEach(function (d) {
        if (d[2] === "admin" && !admin) return;
        document.querySelectorAll(d[0]).forEach(function (el, idx) { el.classList.add("ed-item"); el.setAttribute("data-ed-idx", String(idx)); el.title = "Clic per modificare"; });
      });
      document.addEventListener("click", itemClick, true);
      bar = h("div", { class: "ed-bar", role: "region", "aria-label": "Modalità modifica" });
      status = h("span", { class: "ed-status", role: "status" });
      saveB = h("button", { type: "button", class: "btn solid", text: "Salva" });
      var undoB = h("button", { type: "button", class: "btn ghost", text: "Annulla modifiche" });
      exitB = h("button", { type: "button", class: "btn ghost", text: "Esci" });
      bar.appendChild(h("strong", { text: "Modalità modifica" })); bar.appendChild(status);
      bar.appendChild(h("div", { class: "ed-btns" }, lite ? [exitB] : [saveB, undoB, exitB]));
      document.body.appendChild(bar);
      saveB.addEventListener("click", function () { save(); });
      undoB.addEventListener("click", function () {
        items.forEach(function (i) { if (i.get() !== i.start) App.lines(i.el, i.start); });
        imgs.forEach(function (i) { if (i.val !== i.start) i.set(i.start); if (i.w !== i.startW) i.setW(i.startW); });
        if (layDirty()) { lay = Object.assign({}, layStart); layApply(); }
        dropUploaded(); refreshBar();
      });
      exitB.addEventListener("click", function () {
        if (dirty() && !confirmExit) { confirmExit = true; exitB.textContent = "Esci senza salvare"; say("Ci sono modifiche non salvate.", true); return; }
        dropUploaded(); try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {} location.reload();
      });
      refreshBar();
      restoreScroll();
    }

    function restoreScroll() { try { var y = sessionStorage.getItem("ed-scroll"); if (y) { sessionStorage.removeItem("ed-scroll"); setTimeout(function () { window.scrollTo(0, Number(y)); }, 250); } } catch (e) {} }
    function reloadHere() { try { sessionStorage.setItem("ed-scroll", String(window.scrollY)); } catch (e) {} location.hash = "#modifica"; location.reload(); }

    function blockNav(ev) {
      var t = ev.target;
      if (t.closest && t.closest(".ed-bar, .ed-fab, .ed-chip, .ed-imgtools, dialog")) return;
      var a = t.closest && t.closest("a[href], summary, label, button");
      if (a && (a.closest("main") || a.closest("footer") || (a.closest("header.top") && a.hasAttribute("data-nav")))) ev.preventDefault();
    }

    /* ---------- pannelli con i moduli di modifica dei contenuti ---------- */
    function itemClick(ev) {
      var t = ev.target; if (!t.closest || t.closest(".ed-bar, .ed-fab, .ed-chip, .ed-imgtools, dialog, .ed-rz")) return;
      var it = t.closest(".ed-item"); if (!it) return;
      var def = (ITEMS[key] || []).filter(function (d) { return it.matches(d[0]); })[0]; if (!def) return;
      ev.preventDefault(); ev.stopPropagation();
      var all = Array.prototype.slice.call(document.querySelectorAll(def[0]));
      openPanel(def[1], { title: def[3](it), index: all.indexOf(it), count: all.length });
    }
    function focusRow(root, f, tries) {
      var rows = Array.prototype.slice.call(root.querySelectorAll(".edrow")), hit = null;
      if (rows.length) {
        hit = rows.filter(function (r) { var b = r.querySelector(".tx b"); return b && b.textContent.replace(/\s+/g, " ").trim() === f.title; })[0];
        if (!hit && f.count === rows.length) hit = rows[f.index];
        if (!hit) return;
        var b = hit.querySelector(".tools .link"); if (b) b.click();
        return;
      }
      if ((tries || 0) < 40) setTimeout(function () { focusRow(root, f, (tries || 0) + 1); }, 100);
    }
    function panelChip(id, text) {
      var b = h("button", { type: "button", class: "ed-chip", text: text });
      b.addEventListener("click", function () { openPanel(id); });
      return b;
    }
    function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
    function ensureLibs() {
      return Promise.resolve().then(function () { return App.editor ? null : loadScript("editor.js"); }).then(function () { return App.sections ? null : loadScript("contenuti.js"); });
    }
    function loadBookings() {
      if (be.mode === "supabase" && be.loadBookings) return be.loadBookings().then(function (m) { bookingsCache = m || {}; }, function () {});
      if (be.db && be.db.collection) return be.db.collection("bookings").get().then(function (s) { var m = {}; s.docs.forEach(function (d) { m[d.id] = d.data(); }); bookingsCache = m; }, function () {});
      return Promise.resolve();
    }
    function openPanel(id, focus) {
      var go = function () {
        Promise.all([ensureLibs(), id === "campi" ? loadBookings() : null]).then(function () {
          var def = App.sections && App.sections[id];
          if (!def || (def.role === "admin" && !admin)) return;
          var before = cms.changes || 0;
          var dlg = h("dialog", { class: "edlg wide", "aria-label": TITLES[id] || "Modifica" });
          var closeB = h("button", { type: "button", class: "btn ghost small", text: "Chiudi" });
          var body = h("div", { class: "edpanel" });
          dlg.appendChild(h("div", { class: "edbody" }, [h("div", { class: "edpanel-head" }, [h("h3", { text: TITLES[id] || "Modifica" }), closeB]), body]));
          document.body.appendChild(dlg);
          closeB.addEventListener("click", function () { try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); dlg.dispatchEvent(new Event("close")); } });
          dlg.addEventListener("close", function () {
            dlg.remove();
            if ((cms.changes || 0) > before || id === "intestazione" || id === "footer") reloadHere();
          });
          try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
          def.fn(body, { role: be.role || "admin", bookings: function () { return bookingsCache; }, onCourtsChanged: function () {} });
          if (focus) focusRow(body, focus, 0);
        });
      };
      if (!lite && dirty()) { say("Salvataggio prima di aprire il modulo…"); status.dataset.keep = "1"; save().then(go, function () {}); } else go();
    }

    /* ---------- immagini: sostituzione e dimensione ---------- */
    function imgBox(el) {
      var P0 = window.PAGINE || {}, iid = el.getAttribute("data-ed-img");
      var o = { el: el, id: iid, start: P0[iid] || "", val: "", startW: Number(P0[iid + "@w"]) || 100, w: 0 };
      o.val = o.start; o.w = o.startW; var original = el.innerHTML;
      var file = h("input", { type: "file", accept: "image/*", hidden: "" });
      var pick = h("button", { type: "button", class: "btn solid", text: "Cambia immagine" });
      var reset = h("button", { type: "button", class: "btn ghost", text: "Ripristina originale" });
      var range = h("input", { type: "range", min: "20", max: "100", step: "5", value: String(o.w), "aria-label": "Dimensione dell'immagine" });
      var rlab = h("label", { class: "ed-size" }, [h("span", { text: "Dimensione" }), range, h("output", { text: o.w + "%" })]);
      var tools = h("div", { class: "ed-imgtools" }, [pick, reset, rlab, file]);
      var heroDefault = el.id === "heroCourt" ? App.courtSVG("tennis", "#16503F", "#F3F7EE", { sw: 2.5, par: "xMidYMax meet" }).outerHTML : "";
      el.classList.add("ed-imgbox"); el.appendChild(tools);
      function draw() {
        var src = o.val && App.img(o.val);
        Array.prototype.slice.call(el.children).forEach(function (c) { if (c !== tools) el.removeChild(c); });
        if (src) el.insertBefore(h("img", { src: src, alt: "", class: "ed-img" }), tools);
        else { var tmp = h("div"); tmp.innerHTML = original; Array.prototype.slice.call(tmp.childNodes).forEach(function (c) { if (!(c.classList && c.classList.contains("ed-imgtools"))) el.insertBefore(c, tools); }); }
        reset.hidden = !o.val; refreshBar();
      }
      o.set = function (v) { o.val = v; draw(); };
      o.setW = function (w) { o.w = w; range.value = String(w); rlab.lastChild.textContent = w + "%"; App.setImgWidth(el, w); refreshBar(); };
      range.addEventListener("input", function () { o.setW(Number(range.value)); });
      /* il contenuto originale (disegno) va salvato senza i controlli */
      original = Array.prototype.slice.call(el.children).filter(function (c) { return c !== tools; }).map(function (c) { return c.outerHTML; }).join("");
      if (!original.trim() || /<img/.test(original)) original = heroDefault;
      pick.addEventListener("click", function () { file.click(); });
      reset.addEventListener("click", function () { o.set(""); });
      file.addEventListener("change", function () {
        var f = file.files && file.files[0]; if (!f) return;
        pick.disabled = true; say("Caricamento immagine…"); status.dataset.keep = "1";
        cms.uploadImage(f, { mode: "cover", w: 1200, h: 675 }).then(function (src) { uploaded.push(src); o.set(src); },
          function (e) { say(App.editor && App.editor.errText ? App.editor.errText(e) : "Caricamento non riuscito.", true); status.dataset.keep = "1"; })
          .then(function () { pick.disabled = false; file.value = ""; });
      });
      reset.hidden = !o.val;
      imgs.push(o);
    }

    /* ---------- maniglie di ridimensionamento ---------- */
    function sizer(o) {
      var el = h("button", { type: "button", class: "ed-rz " + o.cls, role: "slider", "aria-label": o.label, "aria-valuemin": String(o.min), "aria-valuemax": String(o.max), title: o.label + " (trascina, oppure frecce su/giù; doppio clic per il valore predefinito)" });
      var out = h("output", { "aria-hidden": "true" }); el.appendChild(document.createTextNode(o.cls.indexOf("dot") >= 0 ? "↘" : "↕")); el.appendChild(out);
      function cur() { return lay[o.k] || Math.round(o.cur()); }
      function show(v) { out.textContent = v + " px"; el.setAttribute("aria-valuenow", String(v)); }
      function put(v) { v = Math.max(o.min, Math.min(o.max, Math.round(v))); lay[o.k] = v; show(v); layApply(); }
      el.addEventListener("pointerdown", function (ev) {
        ev.preventDefault(); ev.stopPropagation();
        var y0 = ev.clientY, v0 = cur(); el.classList.add("drag"); show(v0);
        try { el.setPointerCapture(ev.pointerId); } catch (e) {}
        function mv(e) { put(v0 + o.dir * (e.clientY - y0) * (o.k === "padY" ? .5 : 1)); }
        function up() { el.classList.remove("drag"); el.removeEventListener("pointermove", mv); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); }
        el.addEventListener("pointermove", mv); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
      });
      el.addEventListener("keydown", function (ev) {
        var d = (ev.key === "ArrowUp" || ev.key === "ArrowRight") ? 2 : ((ev.key === "ArrowDown" || ev.key === "ArrowLeft") ? -2 : 0);
        if (!d) return; ev.preventDefault(); put(cur() + d);
      });
      el.addEventListener("dblclick", function (ev) { ev.preventDefault(); lay[o.k] = 0; layApply(); });
      el.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); });
      if (getComputedStyle(o.host).position === "static") o.host.style.position = "relative";
      o.host.appendChild(el); o.el = el; show(cur()); sizers.push(o); return o;
    }
    function initSizers() {
      var hd = document.querySelector("header.top"), ft = document.querySelector("footer");
      if (hd) sizer({ k: "hdrH", cls: "ed-rz-bar bottom", host: hd, label: "Altezza dell'intestazione", min: 48, max: 160, dir: 1, cur: function () { return hd.getBoundingClientRect().height; } });
      if (ft) sizer({ k: "padY", cls: "ed-rz-bar top", host: ft, label: "Altezza del piè di pagina", min: 8, max: 120, dir: -1, cur: function () { return parseFloat(getComputedStyle(ft).paddingTop) || 32; } });
      /* il bordo superiore del piè di pagina: trascinare verso l'alto lo alza */
      [["logoH", ".brand-logo", ".brand", "Altezza del logo nell'intestazione", 16, 120], ["footLogoH", ".foot-logo", ".foot-id", "Altezza del logo nel piè di pagina", 16, 140],
       ["fitpH", ".fitp-logo", null, "Altezza del logo FITP", 16, 140], ["socH", ".soc-logo, .soc-ico, .soc-fallback", ".foot-links", "Dimensione delle icone social", 20, 90]].forEach(function (d) {
        var img = document.querySelector(d[1]); if (!img) return;
        var host = d[2] ? img.closest(d[2]) : img.parentNode; if (!host) return;
        sizer({ k: d[0], cls: "ed-rz-dot", host: host, target: img, label: d[3], min: d[4], max: d[5], dir: 1, cur: function () { return img.getBoundingClientRect().height; } });
      });
      placeSizers();
      window.addEventListener("resize", placeSizers);
    }
    function placeSizers() {
      sizers.forEach(function (o) {
        if (!o.target) return;
        var hr = o.host.getBoundingClientRect(), tr = o.target.getBoundingClientRect();
        o.el.style.left = (tr.right - hr.left - 12) + "px"; o.el.style.top = (tr.bottom - hr.top - 12) + "px";
        o.el.setAttribute("aria-valuenow", String(lay[o.k] || Math.round(o.cur())));
      });
    }

    function dropUploaded() { uploaded.forEach(function (u) { if (imgs.every(function (i) { return i.start !== u && i.val !== u; })) cms.dropImage(u); }); uploaded = []; }

    function save() {
      saveB.disabled = true; say("Salvataggio…"); status.dataset.keep = "1";
      var P = Object.assign({}, window.PAGINE || {}), SI = Object.assign({}, window.SITO || {}, { titles: Object.assign({}, (window.SITO || {}).titles || {}), nav: Object.assign({}, (window.SITO || {}).nav || {}) });
      var st = window.STORIA, fa = window.STRUTTURA, jobs = [], pageChanged = false, siteChanged = false;
      if (layDirty()) {
        SI.header = Object.assign({}, SI.header, { h: lay.hdrH, logoH: lay.logoH });
        SI.footer = Object.assign({}, SI.footer, { padY: lay.padY, logoH: lay.footLogoH, fitpH: lay.fitpH, socH: lay.socH });
        siteChanged = true;
      }
      items.forEach(function (i) {
        var v = i.get(); if (v === i.start) return;
        var same = !v || v === i.def;
        if (i.nav) { if (same) delete SI.nav[i.nav]; else SI.nav[i.nav] = v; siteChanged = true; }
        else if (i.title) {
          if (i.title === "storia") { if (st && !same) jobs.push(cms.save("storia", Object.assign({}, st, { title: v }))); }
          else if (i.title === "struttura") { if (fa && !same) jobs.push(cms.save("struttura", Object.assign({}, fa, { title: v }))); }
          else { if (same) delete SI.titles[i.title]; else SI.titles[i.title] = v; siteChanged = true; }
        } else { if (same) delete P[i.id]; else P[i.id] = v; pageChanged = true; }
      });
      imgs.forEach(function (i) {
        if (i.val !== i.start) { if (i.val) P[i.id] = i.val; else delete P[i.id]; pageChanged = true; }
        if (i.w !== i.startW) { if (i.w < 100) P[i.id + "@w"] = i.w; else delete P[i.id + "@w"]; pageChanged = true; }
      });
      if (pageChanged) jobs.push(cms.save("pagine", P));
      if (siteChanged) jobs.push(cms.save("sito", SI));
      return Promise.all(jobs).then(function () {
        items.forEach(function (i) { i.start = i.get(); }); imgs.forEach(function (i) { i.start = i.val; i.startW = i.w; }); uploaded = []; layStart = Object.assign({}, lay);
        say("Salvato. Le modifiche sono già visibili a tutti."); status.dataset.keep = "1"; refreshBar();
      }, function (e) { say(App.editor && App.editor.errText ? App.editor.errText(e) : "Salvataggio non riuscito.", true); status.dataset.keep = "1"; saveB.disabled = false; throw e; });
    }

    /* l'intestazione si costruisce poco dopo: si parte quando c'è */
    function whenChrome(fn, n) { if (document.querySelector("header.top") && document.querySelector("footer") || (n || 0) > 80) fn(); else setTimeout(function () { whenChrome(fn, (n || 0) + 1); }, 50); }
    window.addEventListener("hashchange", function () { if (/^#modifica/.test(location.hash) && !on) whenChrome(start); });
    if (/^#modifica/.test(location.hash)) whenChrome(start);
  });
});
