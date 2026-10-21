/* Funzioni comuni a tutte le pagine: intestazione, piè di pagina, date, disegni dei campi,
   accesso ai dati condivisi e pannello di pagamento. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var C = window.CLUB;
  var App = (window.App = {});

  App.$ = function (s, r) { return (r || document).querySelector(s); };
  App.h = function (tag, attrs, kids) {
    var e = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === "text") e.textContent = attrs[k];
      else if (k === "class") e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  };
  var h = App.h;

  /* ---------- date e valuta ---------- */
  App.MONTHS = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
  App.WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
  App.WDL = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
  App.pad = function (n) { return n < 10 ? "0" + n : "" + n; };
  App.iso = function (d) { return d.getFullYear() + "-" + App.pad(d.getMonth() + 1) + "-" + App.pad(d.getDate()); };
  App.parseIso = function (s) { return new Date(s + "T12:00:00"); };
  App.fmtDay = function (s) { var d = App.parseIso(s); return App.WDL[d.getDay()] + " " + d.getDate() + " " + App.MONTHS[d.getMonth()]; };
  App.euro = function (n) { return "€ " + (Math.round(n * 100) / 100).toString().replace(".", ","); };
  App.courtById = function (id) { return window.COURTS.filter(function (c) { return c.id === id; })[0]; };
  App.courseById = function (id) { return window.COURSES.filter(function (c) { return c.id === id; })[0]; };
  App.ref = function () {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "";
    for (var i = 0; i < 5; i++) s += a.charAt(Math.floor(Math.random() * a.length));
    return C.refPrefix + "-" + s;
  };
  App.STATUS = {
    al_circolo: "Da pagare al circolo",
    da_pagare: "In attesa di pagamento",
    in_verifica: "Pagamento in verifica",
    pagata: "Pagata",
    richiesta: "Richiesta inviata",
    confermata: "Iscrizione confermata",
    annullata: "Annullata"
  };

  /* ---------- memoria locale (solo comodità del singolo dispositivo) ---------- */
  App.lget = function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  App.lset = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ---------- utilità per i contenuti modificabili ---------- */
  App.slug = function (t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);
  };
  App.newId = function (label, taken) {
    var base = App.slug(label) || "voce", id = base, n = 2;
    taken = taken || [];
    while (taken.indexOf(id) >= 0) id = base + "-" + (n++);
    return id;
  };
  /* testo con a capo -> elementi con <br>, senza HTML */
  App.lines = function (el, text) {
    el.textContent = "";
    String(text || "").split("\n").forEach(function (l, i) { if (i) el.appendChild(document.createElement("br")); el.appendChild(document.createTextNode(l)); });
  };
  /* indirizzo di un'immagine salvata: nella versione claude.ai le foto sono memorizzate come "img:<id>" */
  App.img = function (src) {
    if (!src) return "";
    if (src.indexOf("img:") === 0) return (App.imageStore && App.imageStore[src.slice(4)]) || "";
    return src;
  };
  /* immagine segnaposto quando non c'è ancora una foto */
  App.placeholder = function (label, color, ratio) {
    var W = 400, H = ratio === "portrait" ? 500 : 300;
    var s = svgEl("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: "xMidYMid slice", role: "img", "aria-label": "Foto segnaposto: " + label });
    s.appendChild(svgEl("rect", { width: W, height: H, fill: color || "#1D5C48" }));
    s.appendChild(svgEl("circle", { cx: W - 60, cy: 60, r: 26, fill: "#D6EC3F", "fill-opacity": ".85" }));
    s.appendChild(svgEl("path", { d: "M0 " + (H - 40) + " L110 " + (H - 150) + " L190 " + (H - 80) + " L270 " + (H - 190) + " L" + W + " " + (H - 70) + " L" + W + " " + H + " L0 " + H + " Z", fill: "#FFFFFF", "fill-opacity": ".2" }));
    return s;
  };

  /* ---------- copia negli appunti ---------- */
  /* Mappa: la segreteria può incollare il codice "Incorpora" di Google Maps, un link, le coordinate ("43.7696, 11.2558") o il nome di un luogo.
     Restituisce { embed, link, label } oppure null. Gli indirizzi incorporabili sono ammessi solo se di Google Maps. */
  App.mapResolve = function (K, fallback) {
    K = K || {};
    var raw = String(K.mapQuery || "").trim(), zoom = Math.min(21, Math.max(1, parseInt(K.mapZoom, 10) || 16));
    var searchLink = function (q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); };
    var byQuery = function (q, label) { return { embed: "https://www.google.com/maps?q=" + encodeURIComponent(q) + "&z=" + zoom + "&output=embed", link: searchLink(q), label: label || q }; };
    var okEmbed = /^https:\/\/(www\.google\.[a-z.]+|maps\.google\.[a-z.]+)\/maps\/embed/i;
    var coord = /(-?\d{1,3}\.\d+)\s*[,;]\s*(-?\d{1,3}\.\d+)/;
    if (raw) {
      var iframe = raw.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
      if (iframe) {
        var src = iframe[1].replace(/&amp;/g, "&");
        if (okEmbed.test(src)) {
          var c = src.match(/!2d(-?[\d.]+)!3d(-?[\d.]+)/);
          return { embed: src, link: c ? searchLink(c[2] + "," + c[1]) : searchLink(fallback || "Italia"), label: "posizione scelta dalla segreteria" };
        }
      }
      if (/<\s*iframe/i.test(raw)) return (fallback || "").trim() ? byQuery(fallback.trim()) : null;
      if (/^https?:\/\//i.test(raw)) {
        if (okEmbed.test(raw)) return { embed: raw, link: searchLink(fallback || "Italia"), label: "posizione scelta dalla segreteria" };
        if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(raw)) {
          var at = raw.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/), pl = raw.match(/\/place\/([^\/@?]+)/), qq = raw.match(/[?&]q=([^&]+)/);
          var pt = at ? at[1] + "," + at[2] : (pl ? decodeURIComponent(pl[1].replace(/\+/g, " ")) : (qq ? decodeURIComponent(qq[1].replace(/\+/g, " ")) : ""));
          if (pt) { var r = byQuery(pt, pt); r.link = raw; return r; }
          if (/goo\.gl/i.test(raw) && (fallback || "").trim()) { var f = byQuery(fallback.trim()); f.link = raw; return f; }
        }
        return (fallback || "").trim() ? byQuery(fallback.trim()) : null;
      }
      var m = raw.match(coord);
      if (m) return byQuery(m[1] + "," + m[2], m[1] + ", " + m[2]);
      return byQuery(raw);
    }
    return (fallback || "").trim() ? byQuery(fallback.trim()) : null;
  };

  App.copy = function (text, btn) {
    var done = function () { if (!btn) return; var o = btn.textContent; btn.textContent = "Copiato"; setTimeout(function () { btn.textContent = o; }, 1500); };
    try { navigator.clipboard.writeText(text).then(done, function () {}); } catch (e) {}
  };

  /* ---------- intestazione e piè di pagina ---------- */
  var NAV = [
    ["index.html", "Home"], ["storia.html", "Storia"], ["struttura.html", "Struttura"], ["corsi.html", "Scuola"],
    ["galleria.html", "Galleria"], ["eventi.html", "Eventi"], ["contatti.html", "Contatti"]
  ];
  /* pagine con titolo personalizzabile: [chiave, nome, titolo predefinito] (Storia e Struttura hanno il titolo nei propri dati) */
  App.PAGES = [["index", "Home", "Pineta\nTennis & Padel"], ["corsi", "Corsi", "Impara a giocare\ncon noi"], ["staff", "Staff", "I nostri\nistruttori"],
    ["galleria", "Galleria", "Il circolo\nin immagini"], ["eventi", "Eventi", "Prossimi\nappuntamenti"], ["contatti", "Contatti", "Vieni a trovarci"],
    ["prenota", "Prenota", "Scegli il campo.\nScegli l'ora."], ["accedi", "Accedi", "Accedi"], ["segreteria", "Area Amministratore", "Area Amministratore"]];
  var SCUOLA = [["corsi.html", "Corsi"], ["staff.html", "Staff"]];
  App.chrome = function (active) {
    var SI = window.SITO || {}, siteName = SI.name || C.name, siteShort = SI.short || C.short;
    var pageKey = String(active || "").replace(/\.html$/, "");
    /* titolo della pagina e nome del sito nella scheda del browser */
    document.title = pageKey === "index" ? siteName : document.title.replace(/\s·\s.*$/, "") + " · " + siteName;
    var custom = SI.titles && SI.titles[pageKey];
    if (custom && String(custom).trim()) {
      var h1 = document.querySelector(pageKey === "index" ? ".hero h1" : ".page-hero h1");
      if (h1) {
        var parts = String(custom).trim().split("\n");
        if (pageKey === "index") { h1.textContent = parts[0]; if (parts.length > 1) h1.appendChild(h("em", { text: parts.slice(1).join(" ") })); }
        else App.lines(h1, custom.trim());
      }
    }
    var inScuola = active === "corsi.html" || active === "staff.html";
    var nav = h("nav", { class: "nav", "aria-label": "Sezioni del sito" });
    var menuBtn = null;
    NAV.forEach(function (n) {
      if (n[0] === "corsi.html") {
        menuBtn = h("button", { type: "button", class: "navdrop", "aria-haspopup": "true", "aria-expanded": "false", "aria-controls": "scuolaMenu" }, ["Scuola", h("span", { class: "caret", "aria-hidden": "true", text: "▾" })]);
        if (inScuola) menuBtn.setAttribute("aria-current", "page");
        nav.appendChild(menuBtn); return;
      }
      var a = h("a", { href: n[0], text: n[1] });
      if (n[0] === active || (inScuola && n[0] === "corsi.html")) a.setAttribute("aria-current", "page");
      nav.appendChild(a);
    });
    var cta = h("a", { class: "cta", href: "prenota.html", text: "Prenota" });
    if (active === "prenota.html") cta.setAttribute("aria-current", "page");
    nav.appendChild(cta);
    var top = h("header", { class: "top" }, [h("div", { class: "wrap" }, [
      h("a", { class: "brand", href: "index.html", "aria-label": siteName }, [
        SI.logo && App.img(SI.logo) ? h("img", { class: "brand-logo", src: App.img(SI.logo), alt: SI.showName === false ? siteName : "" }) : h("span", { class: "dot" }),
        SI.showName === false && SI.logo && App.img(SI.logo) ? null : h("span", { text: siteShort })
      ]), nav
    ])]);
    var hostH = document.getElementById("chrome-header");
    if (hostH) hostH.replaceWith(top);
    /* sottomenu di Scuola: pannello sotto l'intestazione (non dentro la barra scorrevole, che lo taglierebbe) */
    var menu = h("div", { class: "submenu", id: "scuolaMenu", role: "menu", "aria-label": "Sezioni della scuola", hidden: "" }, SCUOLA.map(function (n) {
      var a = h("a", { href: n[0], role: "menuitem", text: n[1] }); if (n[0] === active) a.setAttribute("aria-current", "page"); return a;
    }));
    top.appendChild(menu);
    function place() { var r = menuBtn.getBoundingClientRect(), t = top.getBoundingClientRect(); menu.style.left = Math.max(8, Math.min(r.left - t.left, t.width - 180)) + "px"; }
    function setOpen(o) {
      menu.hidden = !o; menuBtn.setAttribute("aria-expanded", String(o));
      if (o) { place(); openedAt = Date.now(); }
    }
    var openedAt = 0;
    /* con il mouse il menu si apre già al passaggio: un clic subito dopo non deve richiuderlo */
    menuBtn.addEventListener("click", function (ev) { ev.stopPropagation(); setOpen(menu.hidden || Date.now() - openedAt < 600); });
    document.addEventListener("click", function (ev) { if (!menu.hidden && !menu.contains(ev.target)) setOpen(false); });
    document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !menu.hidden) { setOpen(false); menuBtn.focus(); } });
    window.addEventListener("resize", function () { if (!menu.hidden) place(); });
    nav.addEventListener("scroll", function () { if (!menu.hidden) place(); });
    var hov = window.matchMedia && window.matchMedia("(hover: hover)");
    var tmr = null;
    [menuBtn, menu].forEach(function (el) {
      el.addEventListener("mouseenter", function () { if (hov && hov.matches) { clearTimeout(tmr); setOpen(true); } });
      el.addEventListener("mouseleave", function () { if (hov && hov.matches) tmr = setTimeout(function () { setOpen(false); }, 250); });
    });
    var fitp = SI.fitpLogo && App.img(SI.fitpLogo);
    var foot = h("footer", {}, [h("div", { class: "wrap" }, [
      h("div", { class: "foot-id" }, [
        SI.logo && App.img(SI.logo) ? h("img", { class: "foot-logo", src: App.img(SI.logo), alt: "" }) : null,
        h("span", { text: C.legal + " · C.F. " + C.cf })
      ]),
      fitp ? h("img", { class: "fitp-logo", src: App.img(SI.fitpLogo), alt: "Affiliata FITP" }) : h("span", { text: C.affil }),
      h("a", { href: "segreteria.html", text: "Area Amministratore" })
    ])]);
    var hostF = document.getElementById("chrome-footer");
    if (hostF) hostF.replaceWith(foot);
    if (App.isSupabase) {
      if (App.contentError) {
        var warn = h("div", { class: "wrap", style: "padding-top:1rem" }, [h("div", { class: "msg err", role: "alert", text: "Non riusciamo a caricare i dati del circolo. Ricarica la pagina tra poco: finché il problema persiste le prenotazioni sono disattivate." })]);
        top.insertAdjacentElement("afterend", warn);
      }
      App.backend().then(function (be) {
        if (be.uid) {
          var out = h("button", { type: "button", class: "out", text: "Esci" });
          out.addEventListener("click", function () {
            Promise.resolve(App.sb().auth.signOut()).then(function () { location.href = "index.html"; }, function () { location.href = "index.html"; });
          });
          nav.insertBefore(out, cta);
        } else {
          var inn = h("a", { href: "accedi.html", text: "Accedi" });
          if (active === "accedi.html") inn.setAttribute("aria-current", "page");
          nav.insertBefore(inn, cta);
        }
      });
    }
  };

  /* ---------- disegni dei campi ---------- */
  function svgEl(tag, a) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); return e; }
  App.courtSVG = function (kind, ground, line, opts) {
    opts = opts || {};
    var W = 400, H = 225, sw = opts.sw || 2;
    var s = svgEl("svg", { viewBox: "0 0 " + W + " " + H, preserveAspectRatio: opts.par || "xMidYMid slice", role: "img", "aria-label": opts.label || "" });
    s.appendChild(svgEl("rect", { width: W, height: H, fill: ground }));
    var g = svgEl("g", { fill: "none", stroke: line, "stroke-width": sw, "stroke-linejoin": "round" });
    if (kind === "tennis") {
      g.appendChild(svgEl("rect", { x: 40, y: 28, width: 320, height: 169 }));
      g.appendChild(svgEl("line", { x1: 40, y1: 50, x2: 360, y2: 50 }));
      g.appendChild(svgEl("line", { x1: 40, y1: 175, x2: 360, y2: 175 }));
      g.appendChild(svgEl("line", { x1: 120, y1: 50, x2: 120, y2: 175 }));
      g.appendChild(svgEl("line", { x1: 280, y1: 50, x2: 280, y2: 175 }));
      g.appendChild(svgEl("line", { x1: 120, y1: 112, x2: 280, y2: 112 }));
      g.appendChild(svgEl("line", { x1: 200, y1: 22, x2: 200, y2: 203, "stroke-width": sw + 1.5, "stroke-dasharray": "2 4" }));
    } else {
      g.appendChild(svgEl("rect", { x: 90, y: 20, width: 220, height: 185, rx: 4 }));
      g.appendChild(svgEl("line", { x1: 90, y1: 112, x2: 310, y2: 112, "stroke-width": sw + 1.5 }));
      g.appendChild(svgEl("line", { x1: 90, y1: 60, x2: 310, y2: 60 }));
      g.appendChild(svgEl("line", { x1: 90, y1: 165, x2: 310, y2: 165 }));
      g.appendChild(svgEl("line", { x1: 200, y1: 60, x2: 200, y2: 165 }));
      g.appendChild(svgEl("rect", { x: 78, y: 12, width: 244, height: 201, rx: 10, "stroke-opacity": ".5" }));
    }
    s.appendChild(g);
    return s;
  };

  /* ---------- dati condivisi o modalità demo ---------- */
  var be = null;
  App.backend = function () {
    if (be) return be;
    if (App.isSupabase) { be = App.supabaseBackend(); return be; }
    be = new Promise(function (resolve) {
      var demo = { mode: "demo", db: null, uid: "local", canEdit: false, canWrite: true };
      var finished = false;
      function done(v) { if (!finished) { finished = true; resolve(v); } }
      setTimeout(function () { done(demo); }, 12000);
      if (!(window.claude && window.claude.use)) return done(demo);
      Promise.all([window.claude.use("db"), window.claude.use("user")]).then(function (r) {
        var db = r[0], user = r[1];
        if (!db || !user) return done(demo);
        Promise.all([Promise.resolve(user.can ? user.can("data.write") : null), Promise.resolve(user.canEdit ? user.canEdit() : false), user.id()]).then(function (v) {
          if (v[0] === false) return done({ mode: "readonly", db: db, uid: v[2] || null, canEdit: false, canWrite: false });
          if (!v[2]) return done(demo);
          done({ mode: "shared", db: db, uid: v[2], canEdit: !!v[1], canWrite: true });
        }, function () { done(demo); });
      }, function () { done(demo); });
    });
    return be;
  };

  /* ---------- pannello di pagamento anticipato ----------
     opts: { amount, ref, method: "online"|"bank", holdUntil, title, onDeclare } */
  App.payPanel = function (opts) {
    var box = h("div", { class: "pay" });
    box.appendChild(h("h3", { text: opts.title || "Completa il pagamento" }));
    box.appendChild(h("div", { class: "pay-amount", text: App.euro(opts.amount) }));
    var refRow = h("div", { class: "pay-ref" }, [h("span", { class: "k", text: "Codice da indicare" }), h("b", { text: opts.ref })]);
    var cb = h("button", { type: "button", class: "copy", text: "Copia" });
    cb.addEventListener("click", function () { App.copy(opts.ref, cb); });
    refRow.appendChild(cb);
    box.appendChild(refRow);
    var msg = h("div", { role: "status", "aria-live": "polite" });
    if (opts.method === "bank") {
      var b = C.payments.bank;
      [["Intestatario", b.holder], ["IBAN", b.iban], ["Banca", b.bank], ["Causale", opts.ref]].forEach(function (r) {
        var row = h("div", { class: "pay-row" }, [h("span", { class: "k", text: r[0] }), h("span", { class: "v", text: r[1] })]);
        if (r[0] === "IBAN") { var c2 = h("button", { type: "button", class: "copy", text: "Copia" }); c2.addEventListener("click", function () { App.copy(r[1], c2); }); row.appendChild(c2); }
        box.appendChild(row);
      });
    } else {
      box.appendChild(h("p", { class: "pay-help", text: "Scegli un metodo e inserisci il codice nella causale del pagamento." }));
      var links = h("div", { class: "pay-links" });
      C.payments.online.forEach(function (m) {
        if (m.url) links.appendChild(h("a", { class: "btn solid small", href: m.url, target: "_blank", rel: "noopener", text: "Paga con " + m.label }));
        else {
          var bt = h("button", { type: "button", class: "btn solid small", text: "Paga con " + m.label });
          bt.addEventListener("click", function () { msg.textContent = ""; msg.appendChild(h("div", { class: "msg err", text: "Il link di pagamento non è ancora collegato. Scegli il bonifico o paga al circolo." })); });
          links.appendChild(bt);
        }
      });
      if (!C.payments.online.length) links.appendChild(h("p", { class: "pay-help", text: "Il pagamento online non è ancora attivo. Scegli il bonifico o paga al circolo." }));
      box.appendChild(links);
    }
    if (opts.holdUntil) {
      var t = new Date(opts.holdUntil);
      box.appendChild(h("p", { class: "pay-help", text: "Lo slot resta riservato per te fino alle " + App.pad(t.getHours()) + ":" + App.pad(t.getMinutes()) + (t.toDateString() !== new Date().toDateString() ? " di " + App.fmtDay(App.iso(t)) : "") + "." }));
    }
    var done = h("button", { type: "button", class: "btn confirm", text: "Ho effettuato il pagamento" });
    done.addEventListener("click", function () { done.disabled = true; Promise.resolve(opts.onDeclare && opts.onDeclare()).then(function () {}, function () { done.disabled = false; }); });
    box.appendChild(done);
    box.appendChild(h("p", { class: "pay-help", text: "La segreteria verifica il pagamento e conferma. Lo stato resta visibile in “Le mie prenotazioni”." }));
    box.appendChild(msg);
    return box;
  };
})();
