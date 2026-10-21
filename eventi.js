/* Pagina eventi: elenco, filtri e scheda di dettaglio con locandina. */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$;
  var NS = "http://www.w3.org/2000/svg";
  var EV = window.EVENTS, byId = {};
  EV.forEach(function (e) { byId[e.id] = e; });
  App.chrome("eventi.html");

  var filter = "all", lastFocus = null;
  var dlg = $("#evDlg");

  function catLabel(c) { return c === "Sociale" ? "Vita sociale" : c; }

  /* ---------- locandina: immagine caricata nella cartella del sito, altrimenti generata ---------- */
  function wrap(text, max) {
    var words = text.toUpperCase().split(" "), lines = [], cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 5);
  }
  function se(tag, a, text) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; return e; }
  function poster(e) {
    if (App.img(e.poster)) return h("img", { src: App.img(e.poster), alt: "Locandina: " + e.title });
    var d = App.parseIso(e.d), bg = e.cat === "Padel" ? "#1F4BA8" : (e.cat === "Sociale" ? "#10241F" : "#1D5C48");
    var s = se("svg", { viewBox: "0 0 300 400", role: "img", "aria-label": "Locandina: " + e.title });
    s.appendChild(se("rect", { width: 300, height: 400, fill: bg }));
    var g = se("g", { fill: "none", stroke: "#F3F7EE", "stroke-opacity": ".35", "stroke-width": 2 });
    g.appendChild(se("rect", { x: 30, y: 215, width: 240, height: 155 }));
    g.appendChild(se("line", { x1: 30, y1: 292, x2: 270, y2: 292, "stroke-dasharray": "2 4", "stroke-width": 3 }));
    g.appendChild(se("line", { x1: 90, y1: 240, x2: 90, y2: 345 }));
    g.appendChild(se("line", { x1: 210, y1: 240, x2: 210, y2: 345 }));
    g.appendChild(se("line", { x1: 90, y1: 292, x2: 210, y2: 292 }));
    s.appendChild(g);
    s.appendChild(se("circle", { cx: 252, cy: 48, r: 14, fill: "#D6EC3F" }));
    var f = "font-family:'Big Shoulders Display','Arial Narrow',Impact,sans-serif;font-weight:900;fill:#F3F7EE";
    s.appendChild(se("text", { x: 24, y: 62, style: "font-family:'DM Mono',monospace;font-size:13px;letter-spacing:2px;fill:#D6EC3F" }, "PINETA T&P · " + catLabel(e.cat).toUpperCase()));
    var lines = wrap(e.title, 13), y = 112;
    lines.forEach(function (l) { s.appendChild(se("text", { x: 24, y: y, style: f + ";font-size:44px" }, l)); y += 42; });
    s.appendChild(se("text", { x: 24, y: 198, style: f + ";font-size:26px;fill:#D6EC3F" }, d.getDate() + " " + App.MONTHS[d.getMonth()].toUpperCase() + " " + d.getFullYear() + (e.time ? " · " + e.time : "")));
    s.appendChild(se("text", { x: 24, y: 388, style: "font-family:'DM Mono',monospace;font-size:11px;letter-spacing:1px;fill:#F3F7EE" }, e.place.toUpperCase()));
    return s;
  }

  /* ---------- elenco ---------- */
  function render() {
    var box = $("#events"); box.textContent = "";
    var shown = EV.filter(function (e) { return filter === "all" || e.cat === filter; });
    if (!shown.length) box.appendChild(h("p", { class: "note", text: "Nessun evento in programma per ora. Torna a trovarci presto." }));
    shown.forEach(function (e) {
      var d = App.parseIso(e.d);
      var more = h("button", { type: "button", class: "more", text: "Dettagli e locandina" });
      more.addEventListener("click", function () { lastFocus = more; open(e.id); });
      box.appendChild(h("article", { class: "event", id: "ev-" + e.id }, [
        h("div", { class: "date" }, [h("b", { text: String(d.getDate()) }), h("span", { text: App.MONTHS[d.getMonth()] + " " + d.getFullYear() })]),
        h("div", {}, [h("h3", { text: e.title }), h("p", { text: e.text }), h("p", { class: "meta", text: e.meta }), more]),
        h("div", { class: "tag-col" }, [h("span", { class: "tag" + (e.cat === "Padel" ? " padel" : ""), text: catLabel(e.cat) })])
      ]));
    });
  }
  document.querySelectorAll(".chip").forEach(function (b) {
    b.addEventListener("click", function () {
      document.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      filter = b.getAttribute("data-f"); render();
    });
  });

  /* ---------- scheda ---------- */
  function open(id) {
    var e = byId[id]; if (!e) return;
    var d = App.parseIso(e.d);
    var pb = $("#evPoster"); pb.textContent = ""; pb.appendChild(poster(e));
    var info = $("#evInfo"); info.textContent = "";
    var tagEl = h("span", { class: "tag" + (e.cat === "Padel" ? " padel" : ""), text: catLabel(e.cat) });
    var t = h("h2", { id: "evTitle", text: e.title });
    info.appendChild(tagEl); info.appendChild(t);
    info.appendChild(h("ul", { class: "facts big" }, [
      h("li", {}, [h("span", { text: "Quando" }), h("span", { text: App.fmtDay(e.d) + " " + d.getFullYear() + (e.time ? ", ore " + e.time : "") })]),
      h("li", {}, [h("span", { text: "Dove" }), h("span", { text: e.place })]),
      h("li", {}, [h("span", { text: "Costo" }), h("span", { text: e.price })])
    ]));
    (e.long || [e.text]).forEach(function (p) { info.appendChild(h("p", { text: p })); });
    info.appendChild(h("div", { class: "msg", text: e.signup }));
    var row = h("div", { class: "btn-row" });
    row.appendChild(h("a", { class: "btn ghost small", href: "contatti.html", text: "Contatta la segreteria" }));
    info.appendChild(row);
    try { if (!dlg.open) dlg.showModal(); } catch (err) { dlg.setAttribute("open", ""); }
    try { history.replaceState(null, "", "#" + id); } catch (err) {}
  }
  function close() {
    try { dlg.close(); } catch (err) { dlg.removeAttribute("open"); }
    try { history.replaceState(null, "", location.pathname + location.search); } catch (err) {}
    if (lastFocus) lastFocus.focus();
  }
  $("#evClose").addEventListener("click", close);
  dlg.addEventListener("click", function (ev) { if (ev.target === dlg) close(); });
  dlg.addEventListener("cancel", function () { try { history.replaceState(null, "", location.pathname + location.search); } catch (err) {} });

  render();
  var hash = (location.hash || "").replace("#", "");
  if (hash && byId[hash]) open(hash);
  window.addEventListener("hashchange", function () { var x = (location.hash || "").replace("#", ""); if (x && byId[x]) open(x); });
});
