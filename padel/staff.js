/* Pagina Staff: istruttori con foto, ruolo e scheda descrittiva. */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, NS = "http://www.w3.org/2000/svg";
  App.chrome("staff.html");
  var COACHES = window.INSTRUCTORS || [], COURSES = window.COURSES || [], byId = {}, lastFocus = null;
  COACHES.forEach(function (c) { byId[c.id] = c; });
  var dlg = $("#coachDlg");

  function se(tag, a, text) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; return e; }
  function portrait(ins) {
    var src = App.img(ins.photo);
    if (src) return h("img", { src: src, alt: "Foto di " + ins.name });
    var initials = ins.name.split(" ").map(function (w) { return w.charAt(0); }).join("").slice(0, 2).toUpperCase();
    var s = se("svg", { viewBox: "0 0 300 400", preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": "Foto segnaposto di " + ins.name });
    s.appendChild(se("rect", { width: 300, height: 400, fill: ins.color || "#1D5C48" }));
    s.appendChild(se("ellipse", { cx: 150, cy: 400, rx: 120, ry: 150, fill: "#FFFFFF", "fill-opacity": ".22" }));
    s.appendChild(se("circle", { cx: 150, cy: 160, r: 62, fill: "#FFFFFF", "fill-opacity": ".3" }));
    s.appendChild(se("text", { x: 22, y: 64, style: "font-family:'Big Shoulders Display','Arial Narrow',Impact,sans-serif;font-weight:900;font-size:56px;fill:#F3F7EE" }, initials));
    return s;
  }
  function list(items) { var ul = h("ul", { class: "tl" }); (items || []).forEach(function (t) { ul.appendChild(h("li", { text: t })); }); return ul; }

  var box = $("#coachGrid"); box.textContent = ""; $("#coachEmpty").hidden = COACHES.length > 0;
  COACHES.forEach(function (ins) {
    var b = h("button", { type: "button", class: "btn small", text: "Scheda completa" });
    b.addEventListener("click", function () { lastFocus = b; openCoach(ins.id); });
    var ph = h("div", { class: "ph" }); ph.appendChild(portrait(ins));
    box.appendChild(h("article", { class: "coach" }, [ph, h("div", { class: "body" }, [
      h("span", { class: "role", text: ins.role }), h("h3", { text: ins.name }), h("p", { text: ins.short }), b
    ])]));
  });

  function openCoach(id) {
    var ins = byId[id]; if (!ins) return;
    var ph = $("#coachPhoto"); ph.textContent = ""; ph.appendChild(portrait(ins));
    var info = $("#coachInfo"); info.textContent = "";
    info.appendChild(h("span", { class: "role", style: "font:500 .72rem/1.3 var(--font-mono);letter-spacing:.06em;text-transform:uppercase;color:var(--court)", text: ins.role }));
    info.appendChild(h("h2", { id: "coachName", text: ins.name }));
    if (ins.years) info.appendChild(h("p", { text: ins.years + " anni di esperienza come istruttore" }));
    (ins.bio || []).forEach(function (p) { info.appendChild(h("p", { text: p })); });
    if ((ins.qualifications || []).length) { info.appendChild(h("h4", { text: "Qualifiche" })); info.appendChild(list(ins.qualifications)); }
    if ((ins.specialties || []).length) { info.appendChild(h("h4", { text: "Specialità" })); info.appendChild(list(ins.specialties)); }
    var mine = COURSES.filter(function (c) { return c.coachId === id; });
    if (mine.length) {
      info.appendChild(h("h4", { text: "Corsi che tiene" }));
      var ul = h("ul", { class: "coach-courses" });
      mine.forEach(function (c) {
        ul.appendChild(h("li", {}, [h("span", {}, [c.name, h("small", { text: c.days + " · " + c.time })]),
          h("a", { class: "btn solid small", href: "corsi.html?corso=" + encodeURIComponent(c.id) + "#iscrizione", text: "Iscriviti" })]));
      });
      info.appendChild(ul);
    }
    try { if (!dlg.open) dlg.showModal(); } catch (err) { dlg.setAttribute("open", ""); }
    try { history.replaceState(null, "", "#" + id); } catch (err) {}
  }
  function close() {
    try { dlg.close(); } catch (err) { dlg.removeAttribute("open"); }
    try { history.replaceState(null, "", location.pathname + location.search); } catch (err) {}
    if (lastFocus) lastFocus.focus();
  }
  $("#coachClose").addEventListener("click", close);
  dlg.addEventListener("click", function (ev) { if (ev.target === dlg) close(); });
  var hash = (location.hash || "").replace("#", ""); if (hash && byId[hash]) openCoach(hash);
});
