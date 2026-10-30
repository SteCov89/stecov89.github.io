/* Contatti: dati modificabili dalla segreteria e mappa Google Maps. */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, K = window.CONTATTI || {};
  App.chrome("contatti.html");
  var rows = $("#rows"); rows.textContent = "";
  [["Indirizzo", K.address, null], ["Telefono segreteria", K.phone, "tel:"], ["Email", K.email, "mailto:"], ["Presidente ASD", K.president, null]].forEach(function (r) {
    if (!r[1]) return;
    var val = r[2] ? h("a", { class: "v", href: r[2] + String(r[1]).replace(/\s+/g, ""), text: r[1] }) : h("span", { class: "v", text: r[1] });
    var row = h("div", { class: "row" }, [h("div", {}, [h("span", { class: "k", text: r[0] }), val])]);
    if (r[2]) { var b = h("button", { type: "button", class: "copy", text: "Copia" }); b.addEventListener("click", function () { App.copy(r[1], b); }); row.appendChild(b); }
    rows.appendChild(row);
  });
  function fill(id, list) {
    var el = $(id); el.textContent = "";
    (list || []).forEach(function (r) { el.appendChild(h("div", {}, [h("span", { text: r[0] }), h("strong", { text: r[1] })])); });
    return el;
  }
  fill("#hours", K.hours);
  var off = fill("#officeHours", K.officeHours);
  var offPanel = off.closest(".panel"); offPanel.hidden = !(K.officeHours && K.officeHours.length);
  $("#officeNote").textContent = K.officeNote || ""; $("#officeNote").hidden = !K.officeNote;
  $("#ctNote").textContent = K.note || ""; $("#ctNote").hidden = !K.note;

  /* mappa: codice "Incorpora" / link di Google Maps / coordinate / nome del luogo (vedi App.mapResolve) */
  var m = App.mapResolve(K, K.address);
  var mb = $("#mapBox");
  if (!m) { mb.hidden = true; return; }
  $("#mapLink").href = m.link;
  var fr = $("#mapFrame"); fr.textContent = "";
  fr.appendChild(h("iframe", { src: m.embed, title: "Mappa: " + m.label, loading: "lazy", referrerpolicy: "no-referrer-when-downgrade", allowfullscreen: "" }));
  $("#mapNote").textContent = "Posizione: " + m.label + ". Se la mappa non si carica, usa il pulsante “Apri in Google Maps”.";
});
