/* Modifica visiva delle pagine (solo Amministratore): si vedono le pagine così come sono e si cambiano testi e immagini direttamente.
   Salva in "pagine" (testi e immagini fissi), "sito" (titoli) e nei dati di Storia e Struttura (titolo). */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, cms = App.cms;
  var file = location.pathname.split("/").pop() || "index.html";
  var key = file.replace(/\.html$/, "") || "index";
  if (key === "segreteria") return;

  /* blocchi che si compilano da soli: si modificano nell'area, non qui */
  var DYN = {
    index: [["#nextEvents", "eventi", "Modifica gli eventi"]],
    corsi: [["#courseGrid", "corsi", "Modifica i corsi"]],
    staff: [["#coachGrid", "staff", "Modifica lo staff"]],
    eventi: [["#events", "eventi", "Modifica gli eventi"]],
    galleria: [["#gallery", "galleria", "Modifica la galleria"]],
    storia: [["#stText", "storia", "Modifica la storia"], ["#stTimeline", "storia", "Modifica la timeline"]],
    struttura: [["#courtCards", "campi", "Modifica i campi"], ["#areas", "struttura", "Modifica le aree"]],
    contatti: [["#rows", "contatti", "Modifica i contatti"], ["#mapBox", "contatti", "Cambia la mappa"]],
    prenota: [["#grid", "campi", "Modifica i campi"]]
  };

  App.backend().then(function (be) {
    if (!be || !be.canEdit || (be.role || "admin") !== "admin") return;
    var fab = h("button", { type: "button", class: "ed-fab", text: "✎ Modifica questa pagina" });
    fab.addEventListener("click", function () { start(); });
    document.body.appendChild(fab);

    var on = false, bar, status, saveB, exitB, items = [], imgs = [], uploaded = [], confirmExit = false;
    window.addEventListener("hashchange", function () { if (/^#modifica/.test(location.hash) && !on) start(); });

    function say(t, err) { status.textContent = t; status.className = "ed-status" + (err ? " err" : ""); }
    function dirty() { return items.some(function (i) { return i.get() !== i.start; }) || imgs.some(function (i) { return i.val !== i.start; }); }
    function refreshBar() { saveB.disabled = !dirty(); if (dirty()) say("Modifiche non salvate"); else if (!status.dataset.keep) say("Clicca su un testo per modificarlo."); delete status.dataset.keep; confirmExit = false; exitB.textContent = "Esci"; }

    function start() {
      if (on) return; on = true; fab.hidden = true;
      document.body.classList.add("ed-on");
      var isIndex = key === "index";
      document.querySelectorAll("[data-ed], [data-ed-title]").forEach(function (el) {
        var title = el.hasAttribute("data-ed-title"), two = isIndex && title;
        try { el.contentEditable = "plaintext-only"; } catch (e) {}
        if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
        el.spellcheck = true; el.setAttribute("role", "textbox");
        var it = { el: el, title: title ? el.getAttribute("data-ed-title") : null, id: el.getAttribute("data-ed"), def: el.getAttribute("data-def") || "", get: function () { return App.textOf(el, two); } };
        it.start = it.get(); items.push(it);
        el.addEventListener("input", refreshBar);
        el.addEventListener("paste", function (ev) { ev.preventDefault(); var t = (ev.clipboardData || window.clipboardData).getData("text/plain"); document.execCommand("insertText", false, t); });
      });
      /* niente navigazione né apertura/chiusura mentre si modifica */
      document.addEventListener("click", blockNav, true);
      document.querySelectorAll("details").forEach(function (d) { d.open = true; d.addEventListener("toggle", function () { if (on && !d.open) d.open = true; }); });
      /* immagini */
      document.querySelectorAll("[data-ed-img]").forEach(function (el) { imgBox(el); });
      /* blocchi dinamici */
      (DYN[key] || []).forEach(function (d) {
        var host = document.querySelector(d[0]); if (!host) return;
        host.classList.add("ed-dyn");
        host.insertAdjacentElement("beforebegin", h("div", { class: "ed-dynbar" }, [h("a", { class: "ed-chip", href: "segreteria.html#" + d[1], target: "_blank", rel: "noopener", text: "✎ " + d[2] + " ↗" })]));
      });
      bar = h("div", { class: "ed-bar", role: "region", "aria-label": "Modalità modifica" });
      status = h("span", { class: "ed-status", role: "status" });
      saveB = h("button", { type: "button", class: "btn solid", text: "Salva" });
      var undoB = h("button", { type: "button", class: "btn ghost", text: "Annulla modifiche" });
      exitB = h("button", { type: "button", class: "btn ghost", text: "Esci" });
      bar.appendChild(h("strong", { text: "Modalità modifica" })); bar.appendChild(status);
      bar.appendChild(h("div", { class: "ed-btns" }, [saveB, undoB, exitB]));
      document.body.appendChild(bar);
      saveB.addEventListener("click", save);
      undoB.addEventListener("click", function () {
        items.forEach(function (i) { if (i.get() !== i.start) App.lines(i.el, i.start); });
        imgs.forEach(function (i) { if (i.val !== i.start) i.set(i.start); });
        dropUploaded(); refreshBar();
      });
      exitB.addEventListener("click", function () {
        if (dirty() && !confirmExit) { confirmExit = true; exitB.textContent = "Esci senza salvare"; say("Ci sono modifiche non salvate.", true); return; }
        dropUploaded(); location.hash = ""; location.reload();
      });
      refreshBar();
    }

    function blockNav(ev) {
      var t = ev.target;
      if (t.closest && t.closest(".ed-bar, .ed-fab, .ed-chip, .ed-imgtools")) return;
      var a = t.closest && t.closest("a[href], summary, label, button");
      if (a && a.closest("main")) ev.preventDefault();
    }

    function imgBox(el) {
      var o = { el: el, id: el.getAttribute("data-ed-img"), start: (window.PAGINE || {})[el.getAttribute("data-ed-img")] || "", val: "" };
      o.val = o.start; var original = el.innerHTML;
      var file = h("input", { type: "file", accept: "image/*", hidden: "" });
      var pick = h("button", { type: "button", class: "btn solid", text: "Cambia immagine" });
      var reset = h("button", { type: "button", class: "btn ghost", text: "Ripristina originale" });
      var tools = h("div", { class: "ed-imgtools" }, [pick, reset, file]);
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

    function dropUploaded() { var keep = imgs.map(function (i) { return i.val; }); uploaded.forEach(function (u) { if (keep.indexOf(u) < 0 || true) { if (imgs.every(function (i) { return i.start !== u; }) && imgs.every(function (i) { return i.val !== u; })) cms.dropImage(u); } }); uploaded = []; }

    function save() {
      saveB.disabled = true; say("Salvataggio…"); status.dataset.keep = "1";
      var P = Object.assign({}, window.PAGINE || {}), SI = Object.assign({}, window.SITO || {}, { titles: Object.assign({}, (window.SITO || {}).titles || {}) });
      var st = window.STORIA, fa = window.STRUTTURA, jobs = [], pageChanged = false, siteChanged = false;
      items.forEach(function (i) {
        var v = i.get(); if (v === i.start) return;
        var same = !v || v === i.def;
        if (i.title) {
          if (i.title === "storia") { if (st && !same) jobs.push(cms.save("storia", Object.assign({}, st, { title: v }))); }
          else if (i.title === "struttura") { if (fa && !same) jobs.push(cms.save("struttura", Object.assign({}, fa, { title: v }))); }
          else { if (same) delete SI.titles[i.title]; else SI.titles[i.title] = v; siteChanged = true; }
        } else { if (same) delete P[i.id]; else P[i.id] = v; pageChanged = true; }
      });
      imgs.forEach(function (i) { if (i.val === i.start) return; if (i.val) P[i.id] = i.val; else delete P[i.id]; pageChanged = true; });
      if (pageChanged) jobs.push(cms.save("pagine", P));
      if (siteChanged) jobs.push(cms.save("sito", SI));
      Promise.all(jobs).then(function () {
        items.forEach(function (i) { i.start = i.get(); }); imgs.forEach(function (i) { i.start = i.val; }); uploaded = [];
        say("Salvato. Le modifiche sono già visibili a tutti."); status.dataset.keep = "1"; refreshBar();
      }, function (e) { say(App.editor && App.editor.errText ? App.editor.errText(e) : "Salvataggio non riuscito.", true); status.dataset.keep = "1"; saveB.disabled = false; });
    }
    if (/^#modifica/.test(location.hash)) start();
  });
});
