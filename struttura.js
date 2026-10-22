/* Pagina Struttura: campi (dalla stessa tabella usata dalle prenotazioni) e aree del circolo con foto e dettagli. */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, F = window.STRUTTURA || { sections: [] };
  App.chrome("struttura.html");
  App.lines($("#faTitle"), F.title || "La struttura");
  $("#faLead").textContent = F.lead || "";
  $("#faLead").hidden = !F.lead;

  /* ---------- campi ---------- */
  var cards = $("#courtCards"); cards.textContent = "";
  var courts = window.COURTS || [];
  $("#courtEmpty").hidden = courts.length > 0;
  courts.forEach(function (c) {
    var isP = c.sport === "padel";
    var thumb = h("div", { class: "thumb" });
    thumb.appendChild(App.courtSVG(c.sport, isP ? "#2B5FC9" : (c.surface === "Cemento" ? "#3F6E8F" : "#B5532F"), "#FFFFFF", { label: "Schema del " + c.name }));
    cards.appendChild(h("article", { class: "court" }, [thumb, h("div", { class: "body" }, [
      h("span", { class: "tag" + (isP ? " padel" : ""), text: isP ? "Padel" : "Tennis" }), h("h3", { text: c.name }),
      h("ul", { class: "facts" }, [
        h("li", {}, [h("span", { text: "Superficie" }), h("span", { text: c.surface })]),
        h("li", {}, [h("span", { text: "Copertura" }), h("span", { text: c.cover })]),
        h("li", {}, [h("span", { text: "Tariffa oraria" }), h("span", { text: App.euro(c.price) })])])])]));
  });

  /* ---------- aree ---------- */
  var COLORS = ["#1D5C48", "#B5532F", "#1F4BA8", "#6B4C9A", "#8A6D1D", "#16503F"];
  function photoEl(area, i, idx) {
    var p = (area.photos || [])[i];
    var src = p && App.img(p.src);
    if (src) return h("img", { src: src, alt: (p.caption || area.title), loading: "lazy" });
    return App.placeholder(area.title, COLORS[idx % COLORS.length]);
  }
  var areas = F.sections || [], dlg = $("#areaDlg"), cur = { a: null, idx: 0, i: 0 }, lastFocus = null;
  var box = $("#areas"); box.textContent = "";
  areas.forEach(function (a, idx) {
    var btn = h("button", { type: "button", class: "area", "aria-haspopup": "dialog" });
    var ph = h("div", { class: "ph" }); ph.appendChild(photoEl(a, 0, idx));
    var n = (a.photos || []).filter(function (p) { return App.img(p.src); }).length;
    btn.appendChild(ph);
    btn.appendChild(h("div", { class: "txt" }, [h("h3", { text: a.title }), h("p", { text: a.summary || "" }), h("span", { class: "go", text: n > 1 ? "Foto e dettagli (" + n + ") →" : "Dettagli →" })]));
    btn.addEventListener("click", function () { lastFocus = btn; openArea(idx); });
    box.appendChild(btn);
  });
  if (!areas.length) box.appendChild(h("p", { class: "note", text: "Le aree del circolo saranno presto descritte qui." }));

  function show() {
    var a = cur.a, photos = a.photos || [], stage = $("#areaStage");
    stage.textContent = ""; stage.appendChild(photoEl(a, cur.i, cur.idx));
    var p = photos[cur.i];
    $("#areaCap").textContent = (p && p.caption) || "";
    $("#areaBar").hidden = photos.length < 2;
    $("#areaCount").textContent = (cur.i + 1) + " / " + photos.length;
    var th = $("#areaThumbs"); th.textContent = ""; th.hidden = photos.length < 2;
    photos.forEach(function (_, i) {
      var b = h("button", { type: "button", "aria-label": "Foto " + (i + 1), "aria-pressed": String(i === cur.i) });
      b.appendChild(photoEl(a, i, cur.idx));
      b.addEventListener("click", function () { cur.i = i; show(); });
      th.appendChild(b);
    });
  }
  function openArea(idx) {
    var a = areas[idx]; if (!a) return;
    cur = { a: a, idx: idx, i: 0 };
    var info = $("#areaInfo"); info.textContent = "";
    info.appendChild(h("span", { class: "tag", text: "Il circolo" }));
    info.appendChild(h("h2", { id: "areaTitle", text: a.title }));
    if (a.summary) info.appendChild(h("p", { class: "lead2", text: a.summary }));
    (a.details || []).forEach(function (t) { info.appendChild(h("p", { text: t })); });
    show();
    try { if (!dlg.open) dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
  }
  function close() { try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } if (lastFocus) lastFocus.focus(); }
  function step(d) { var n = (cur.a.photos || []).length; if (n < 2) return; cur.i = (cur.i + d + n) % n; show(); }
  $("#areaClose").addEventListener("click", close);
  $("#areaPrev").addEventListener("click", function () { step(-1); });
  $("#areaNext").addEventListener("click", function () { step(1); });
  dlg.addEventListener("click", function (ev) { if (ev.target === dlg) close(); });
  dlg.addEventListener("keydown", function (ev) { if (ev.key === "ArrowLeft") step(-1); else if (ev.key === "ArrowRight") step(1); });
  var hash = (location.hash || "").replace("#", "");
  areas.forEach(function (a, i) { if (a.id === hash) openArea(i); });
});
