/* Galleria: tutte le foto nello stesso formato (4:3), con ingrandimento. */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$;
  App.chrome("galleria.html");
  var items = (window.GALLERIA || []).slice(), box = $("#gallery"), dlg = $("#lbDlg"), cur = 0, lastFocus = null;
  box.textContent = ""; $("#galEmpty").hidden = items.length > 0;
  function pic(it, big) {
    var src = App.img(it.src);
    if (src) return h("img", { src: src, alt: it.caption || "Foto del circolo", loading: big ? "eager" : "lazy" });
    return App.courtSVG(it.kind === "padel" ? "padel" : "tennis", it.color || "#B5532F", "#FFFFFF", { sw: 1.8, label: it.caption || "" });
  }
  items.forEach(function (it, i) {
    var b = h("button", { type: "button", class: "gtile", "aria-label": "Ingrandisci: " + (it.caption || "foto " + (i + 1)) });
    var fr = h("div", { class: "fr" }); fr.appendChild(pic(it));
    b.appendChild(fr);
    if (it.caption) b.appendChild(h("span", { class: "cap", text: it.caption }));
    b.addEventListener("click", function () { lastFocus = b; open(i); });
    box.appendChild(b);
  });
  function show() {
    var it = items[cur], v = $("#lbImg"); v.textContent = ""; v.appendChild(pic(it, true));
    $("#lbCap").textContent = (it.caption || "") + (items.length > 1 ? "  ·  " + (cur + 1) + "/" + items.length : "");
    var multi = items.length > 1; $("#lbPrev").hidden = !multi; $("#lbNext").hidden = !multi;
  }
  function open(i) { cur = i; show(); try { if (!dlg.open) dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }
  function close() { try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } if (lastFocus) lastFocus.focus(); }
  function step(d) { cur = (cur + d + items.length) % items.length; show(); }
  $("#lbClose").addEventListener("click", close);
  $("#lbPrev").addEventListener("click", function () { step(-1); });
  $("#lbNext").addEventListener("click", function () { step(1); });
  dlg.addEventListener("click", function (ev) { if (ev.target === dlg) close(); });
  dlg.addEventListener("keydown", function (ev) { if (ev.key === "ArrowLeft") step(-1); else if (ev.key === "ArrowRight") step(1); });
});
