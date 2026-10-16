/* Pagina Storia: testi e timeline modificabili dalla segreteria. */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, S = window.STORIA || {};
  App.chrome("storia.html");
  App.lines($("#stTitle"), S.title || "La nostra storia");
  var box = $("#stText"); box.textContent = "";
  (S.paragraphs || []).forEach(function (t) { box.appendChild(h("p", { text: t })); });
  var tl = $("#stTimeline"); tl.textContent = "";
  var items = (S.timeline || []).slice();
  if (items.every(function (x) { return /^\d{3,4}$/.test(String(x.year).trim()); })) items.sort(function (a, b) { return parseInt(a.year, 10) - parseInt(b.year, 10); });
  items.forEach(function (x) {
    tl.appendChild(h("li", {}, [h("div", { class: "yr", text: x.year }), h("h3", { text: x.title }), x.text ? h("p", { text: x.text }) : null]));
  });
});
