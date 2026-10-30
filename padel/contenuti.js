/* Schede di modifica dei contenuti nell'area segreteria: campi, corsi, staff, eventi, struttura, storia, galleria, contatti, impostazioni. */
(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$, cms = App.cms, E = App.editor, C = window.CLUB;
  var data = {}, todayIso = App.iso(new Date());

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  var SPEC = {
    gallery: { w: 1200, h: 900, mode: "cover" },
    area: { w: 1200, h: 900, mode: "cover" },
    portrait: { w: 800, h: 1000, mode: "cover" },
    poster: { mode: "fit", max: 1400 }
  };

  function loading(pane) { pane.textContent = ""; pane.appendChild(h("p", { class: "pay-help", text: "Caricamento…" })); }
  function failed(pane, e) {
    pane.textContent = "";
    pane.appendChild(h("div", { class: "msg err", role: "alert", text: "Impossibile caricare i dati. Ricarica la pagina e riprova." }));
    try { console.warn(e); } catch (x) {}
  }
  function entities(kind) {
    if (data[kind]) return Promise.resolve(data[kind]);
    return cms.loadEntities(kind).then(function (l) { data[kind] = l; return l; });
  }
  function entityList(kind, mount, cfg) {
    cfg.mount = mount;
    cfg.getItems = function () { return data[kind] || []; };
    cfg.setItems = function (items, prev) {
      if (cfg.prepare) items = cfg.prepare(items);
      return cms.saveEntities(kind, items, prev).then(function (rep) { data[kind] = clone(items); if (cfg.after) cfg.after(); return rep; });
    };
    return E.list(cfg);
  }

  /* ------------------------------------------------------------ Campi */
  function buildCourts(pane, opts) {
    loading(pane);
    entities("courts").then(function () {
      pane.textContent = "";
      var s = E.section(pane, "Campi da gioco", "Sono gli stessi campi mostrati nella pagina Struttura e prenotabili nella pagina Prenota. Se un campo ha già prenotazioni passate non si cancella: viene archiviato e sparisce dal sito. Le prenotazioni future vanno prima annullate.");
      entityList("courts", s, {
        noun: "campo", title: function (c) { return c.name; },
        sub: function (c) { return (c.sport === "padel" ? "Padel" : "Tennis") + " · " + c.surface + " · " + c.cover + " · " + App.euro(c.price) + " all'ora"; },
        blank: function () { return { sport: "tennis", cover: "Scoperto", price: 18 }; },
        fields: [
          { k: "name", label: "Nome del campo", type: "text", req: true, max: 30, hint: "Ad esempio Campo 4 oppure Padel C." },
          { k: "sport", label: "Sport", type: "select", opts: [["tennis", "Tennis"], ["padel", "Padel"]] },
          { k: "surface", label: "Superficie", type: "text", req: true, max: 40, hint: "Ad esempio Terra rossa, Cemento, Erba sintetica." },
          { k: "cover", label: "Copertura", type: "select", opts: [["Scoperto", "Scoperto"], ["Coperto", "Coperto"]] },
          { k: "price", label: "Tariffa oraria (€)", type: "number", req: true, min: 0, max: 500, step: 0.5 }
        ],
        prepare: function (items) {
          var taken = items.map(function (c) { return c.id; }).filter(Boolean);
          items.forEach(function (c) {
            if (c.id) return;
            var p = c.sport === "padel" ? "p" : "t", n = 1; while (taken.indexOf(p + n) >= 0) n++;
            c.id = p + n; taken.push(c.id);
          });
          return items;
        },
        beforeRemove: function (c) {
          var future = Object.keys(opts.bookings()).filter(function (k) {
            var b = opts.bookings()[k]; return b.court === c.id && b.date >= todayIso && b.status !== "annullata" && !(b.status === "da_pagare" && b.holdUntil && Date.parse(b.holdUntil) < Date.now());
          }).length;
          return future ? "“" + c.name + "” ha " + future + (future === 1 ? " prenotazione futura" : " prenotazioni future") + ". Annullale dalla scheda Prenotazioni, poi elimina il campo." : null;
        },
        removeText: function (c) { return "Eliminare il campo “" + c.name + "”? Sparirà dal sito e dalla pagina Prenota."; },
        after: function () { if (opts.onCourtsChanged) opts.onCourtsChanged(); }
      });
    }, function (e) { failed(pane, e); });
  }

  /* ------------------------------------------------------------ Corsi */
  function instrOpts() {
    var l = (data.instructors || window.INSTRUCTORS || []);
    return [["", "Nessuno / da scegliere"]].concat(l.map(function (i) { return [i.id, i.name]; }));
  }
  function buildCourses(pane) {
    loading(pane);
    Promise.all([entities("courses"), entities("instructors")]).then(function () {
      pane.textContent = "";
      var s = E.section(pane, "Corsi della scuola", "I corsi compaiono nella pagina Scuola › Corsi e nel modulo di iscrizione. Eliminando un corso con iscrizioni, questo viene archiviato.");
      entityList("courses", s, {
        noun: "corso", title: function (c) { return c.name; },
        sub: function (c) { return (c.sport === "padel" ? "Padel" : "Tennis") + " · " + c.level + " · " + c.days + " " + c.time + " · " + App.euro(c.price); },
        blank: function () { return { sport: "tennis", lessons: 8, ageMin: 5, ageMax: 99, price: 70, group: "Max 6 allievi" }; },
        fields: [
          { k: "name", label: "Nome del corso", type: "text", req: true, max: 60 },
          { k: "sport", label: "Sport", type: "select", opts: [["tennis", "Tennis"], ["padel", "Padel"]] },
          { k: "level", label: "Livello", type: "text", req: true, max: 40, hint: "Ad esempio Principianti, Intermedio, Agonisti." },
          { k: "age", label: "Età (testo mostrato)", type: "text", req: true, max: 30, hint: "Ad esempio 9–14 anni oppure Da 15 anni." },
          { k: "ageMin", label: "Età minima", type: "number", req: true, min: 0, max: 99 },
          { k: "ageMax", label: "Età massima", type: "number", req: true, min: 0, max: 99 },
          { k: "days", label: "Giorni", type: "text", req: true, max: 40, hint: "Ad esempio Lun e Mer." },
          { k: "time", label: "Orario", type: "text", req: true, max: 40, hint: "Ad esempio 17:30–19:00." },
          { k: "lessons", label: "Numero di lezioni del ciclo", type: "number", req: true, min: 1, max: 100 },
          { k: "group", label: "Gruppo", type: "text", max: 40, hint: "Ad esempio Max 6 allievi." },
          { k: "coachId", label: "Istruttore", type: "select", opts: instrOpts },
          { k: "coach", label: "Istruttore (se non è nell'elenco Staff)", type: "text", max: 60, hint: "Si usa solo quando non scegli un istruttore sopra." },
          { k: "start", label: "Inizio", type: "text", max: 40, hint: "Ad esempio 5 ottobre 2026 oppure Tutto l'anno." },
          { k: "price", label: "Prezzo del ciclo (€)", type: "number", req: true, min: 0, max: 5000, step: 0.5 },
          { k: "text", label: "Descrizione", type: "textarea", rows: 4, max: 600 }
        ],
        check: function (v) { return v.ageMax < v.ageMin ? "L'età massima non può essere minore di quella minima." : null; },
        prepare: function (items) {
          var taken = items.map(function (c) { return c.id; }).filter(Boolean), instr = data.instructors || window.INSTRUCTORS || [];
          items.forEach(function (c) {
            if (!c.id) { c.id = App.newId(c.name, taken); taken.push(c.id); }
            if (c.coachId) { var ins = instr.filter(function (i) { return i.id === c.coachId; })[0]; if (ins) c.coach = ins.name; }
            else { c.coachId = null; if (!c.coach) c.coach = "A scelta"; }
          });
          return items;
        }
      });
    }, function (e) { failed(pane, e); });
  }

  /* ------------------------------------------------------------ Staff */
  function buildStaff(pane) {
    loading(pane);
    entities("instructors").then(function () {
      pane.textContent = "";
      var s = E.section(pane, "Istruttori e staff", "Compaiono nella pagina Scuola › Staff, con foto, ruolo e scheda descrittiva. Eliminando un istruttore, i suoi corsi restano senza istruttore assegnato.");
      entityList("instructors", s, {
        noun: "istruttore", title: function (c) { return c.name; }, sub: function (c) { return c.role; }, thumb: function (c) { return c.photo; },
        blank: function () { return { years: 1 }; },
        fields: [
          { k: "name", label: "Nome e cognome", type: "text", req: true, max: 60 },
          { k: "role", label: "Ruolo", type: "text", req: true, max: 80, hint: "Ad esempio Direttore tecnico · Maestro nazionale." },
          { k: "years", label: "Anni di esperienza", type: "number", min: 0, max: 80 },
          { k: "short", label: "Presentazione breve", type: "textarea", rows: 2, max: 200, hint: "Una frase mostrata sulla scheda nell'elenco." },
          { k: "photo", label: "Foto (verrà ritagliata in formato verticale 4:5)", type: "image", spec: SPEC.portrait, bucket: "photos" },
          { k: "bio", label: "Scheda descrittiva", type: "paras", rows: 8, hint: "Separa i paragrafi con una riga vuota." },
          { k: "qualifications", label: "Qualifiche", type: "lines", hint: "Una per riga." },
          { k: "specialties", label: "Specialità", type: "lines", hint: "Una per riga." }
        ],
        prepare: function (items) {
          var taken = items.map(function (c) { return c.id; }).filter(Boolean);
          items.forEach(function (c) { if (!c.id) { c.id = App.newId(c.name, taken); taken.push(c.id); } });
          return items;
        }
      });
    }, function (e) { failed(pane, e); });
  }

  /* ------------------------------------------------------------ Eventi */
  function buildEvents(pane) {
    loading(pane);
    entities("events").then(function () {
      pane.textContent = "";
      var s = E.section(pane, "Eventi", "Gli eventi passati o nascosti non compaiono sul sito. La locandina viene mostrata nella scheda dell'evento; se non la carichi ne viene generata una in automatico.");
      entityList("events", s, {
        noun: "evento", sortable: false, title: function (c) { return c.title; },
        sub: function (c) { return App.fmtDay(c.d) + " " + App.parseIso(c.d).getFullYear() + (c.time ? " · " + c.time : "") + " · " + c.cat + (c.d < todayIso ? " · passato" : "") + (c.published === false ? " · nascosto" : ""); },
        thumb: function (c) { return c.poster; },
        blank: function () { return { cat: "Tennis", published: true, d: todayIso }; },
        fields: [
          { k: "title", label: "Titolo", type: "text", req: true, max: 80 },
          { k: "cat", label: "Categoria", type: "select", opts: [["Tennis", "Tennis"], ["Padel", "Padel"], ["Sociale", "Vita sociale"]] },
          { k: "d", label: "Data", type: "date", req: true },
          { k: "time", label: "Ora di inizio", type: "time" },
          { k: "place", label: "Luogo", type: "text", max: 80, hint: "Ad esempio Campi 1, 2 e 3 oppure Club house." },
          { k: "price", label: "Costo", type: "text", max: 80, hint: "Ad esempio € 20 a coppia oppure Ingresso libero." },
          { k: "text", label: "Presentazione breve", type: "textarea", rows: 2, max: 240, req: true, hint: "Mostrata nell'elenco eventi." },
          { k: "long", label: "Descrizione completa", type: "paras", rows: 6, hint: "Separa i paragrafi con una riga vuota." },
          { k: "signup", label: "Come iscriversi", type: "textarea", rows: 2, max: 300 },
          { k: "poster", label: "Locandina (caricala intera: viene solo ridotta, non ritagliata)", type: "image", spec: SPEC.poster, bucket: "posters" },
          { k: "published", label: "Visibile sul sito", type: "checkbox" }
        ],
        prepare: function (items) {
          var taken = items.map(function (c) { return c.id; }).filter(Boolean);
          items.forEach(function (c) { if (!c.id) { c.id = App.newId(c.title, taken); taken.push(c.id); } });
          return items.slice().sort(function (a, b) { return a.d < b.d ? -1 : (a.d > b.d ? 1 : 0); });
        }
      });
    }, function (e) { failed(pane, e); });
  }

  /* ------------------------------------------------------------ Struttura */
  function buildStruttura(pane) {
    var S = function () { return window.STRUTTURA || { title: "", lead: "", sections: [] }; };
    var s1 = E.section(pane, "Titolo della pagina", "Testi in cima alla pagina Struttura. Per andare a capo nel titolo usa il pulsante Invio.");
    E.form({ mount: s1, get: function () { return S(); }, fields: [
      { k: "title", label: "Titolo", type: "textarea", rows: 2, max: 80, req: true },
      { k: "lead", label: "Testo introduttivo", type: "textarea", rows: 2, max: 300 }
    ], commit: function (v) { return cms.save("struttura", Object.assign({}, S(), { title: v.title, lead: v.lead })); } });
    var s2 = E.section(pane, "Aree del circolo", "Club house, spogliatoi, illuminazione, parcheggio… Ogni area si apre nella pagina Struttura con le sue foto e i dettagli. Per aggiungere o togliere i campi da gioco usa la scheda Campi.");
    E.list({
      mount: s2, noun: "area", title: function (a) { return a.title; }, sub: function (a) { return (a.photos || []).length + " foto"; },
      thumb: function (a) { return (a.photos && a.photos[0] && a.photos[0].src) || ""; },
      getItems: function () { return S().sections || []; },
      blank: function () { return { photos: [], details: [] }; },
      fields: [
        { k: "title", label: "Nome dell'area", type: "text", req: true, max: 60 },
        { k: "summary", label: "Descrizione breve", type: "textarea", rows: 2, max: 200, hint: "Mostrata sulla scheda dell'area." },
        { k: "details", label: "Descrizione dettagliata", type: "paras", rows: 7, hint: "Separa i paragrafi con una riga vuota." },
        { k: "photos", label: "Foto (ritagliate tutte in formato 4:3)", type: "photos", spec: SPEC.area, bucket: "photos" }
      ],
      setItems: function (items) {
        var taken = items.map(function (c) { return c.id; }).filter(Boolean);
        items.forEach(function (c) { if (!c.id) { c.id = App.newId(c.title, taken); taken.push(c.id); } });
        return cms.save("struttura", Object.assign({}, S(), { sections: items }));
      }
    });
  }

  /* ------------------------------------------------------------ Storia */
  function buildStoria(pane) {
    var S = function () { return window.STORIA || { title: "", paragraphs: [], timeline: [] }; };
    var s1 = E.section(pane, "Testo della pagina", "Titolo e paragrafi della storia del circolo e della società.");
    E.form({ mount: s1, get: function () { return S(); }, fields: [
      { k: "title", label: "Titolo", type: "textarea", rows: 2, max: 80, req: true },
      { k: "paragraphs", label: "Testo", type: "paras", rows: 10, req: true, hint: "Separa i paragrafi con una riga vuota." }
    ], commit: function (v) { return cms.save("storia", Object.assign({}, S(), { title: v.title, paragraphs: v.paragraphs })); } });
    var s2 = E.section(pane, "Timeline", "Le tappe sono mostrate in ordine di anno, dalla più antica alla più recente.");
    E.list({
      mount: s2, noun: "tappa", sortable: false, title: function (t) { return t.year + " · " + t.title; }, sub: function (t) { return t.text || ""; },
      getItems: function () {
        var l = (S().timeline || []).slice();
        if (l.every(function (x) { return /^\d{3,4}$/.test(String(x.year).trim()); })) l.sort(function (a, b) { return parseInt(a.year, 10) - parseInt(b.year, 10); });
        return l;
      },
      blank: function () { return {}; },
      fields: [
        { k: "year", label: "Anno (o data)", type: "text", req: true, max: 20, hint: "Ad esempio 1974." },
        { k: "title", label: "Titolo", type: "text", req: true, max: 80 },
        { k: "text", label: "Descrizione", type: "textarea", rows: 3, max: 300 }
      ],
      setItems: function (items) {
        if (items.every(function (x) { return /^\d{3,4}$/.test(String(x.year).trim()); })) items.sort(function (a, b) { return parseInt(a.year, 10) - parseInt(b.year, 10); });
        return cms.save("storia", Object.assign({}, S(), { timeline: items }));
      }
    });
  }

  /* ------------------------------------------------------------ Galleria */
  function buildGalleria(pane) {
    var G = function () { return window.GALLERIA || []; };
    var s = E.section(pane, "Foto della galleria", "Tutte le foto vengono ritagliate nello stesso formato (4:3) così la galleria resta ordinata. Con “Aggiungi più foto” puoi sceglierne molte insieme e dare le didascalie in un secondo momento.");
    E.list({
      mount: s, noun: "foto", title: function (g) { return g.caption || (g.src ? "Foto senza didascalia" : "Immagine segnaposto"); }, sub: function (g) { return g.src ? "" : "Segnaposto: carica una foto vera con Modifica"; },
      thumb: function (g) { return g.src; }, emptyText: "La galleria è vuota. Aggiungi la prima foto.",
      getItems: G,
      blank: function () { return { src: "", kind: "tennis", color: "#1D5C48", caption: "" }; },
      bulk: { label: "Aggiungi più foto", field: "src", spec: SPEC.gallery, bucket: "photos" },
      fields: [
        { k: "src", label: "Foto", type: "image", spec: SPEC.gallery, bucket: "photos", req: true },
        { k: "caption", label: "Didascalia", type: "text", max: 100 }
      ],
      setItems: function (items) {
        var taken = items.map(function (c) { return c.id; }).filter(Boolean);
        items.forEach(function (c) { if (!c.id) { c.id = App.newId("foto", taken); taken.push(c.id); } });
        return cms.save("galleria", items);
      }
    });
  }

  /* ------------------------------------------------------------ Contatti */
  function buildContatti(pane) {
    var K = function () { return window.CONTATTI || {}; };
    var save = function (v) { return cms.save("contatti", Object.assign({}, K(), v)); };
    var s1 = E.section(pane, "Dati di contatto", "Indirizzo, recapiti e dati dell'associazione, mostrati nella pagina Contatti e nel piè di pagina.");
    E.form({ mount: s1, get: K, fields: [
      { k: "address", label: "Indirizzo", type: "text", req: true, max: 160, full: true },
      { k: "phone", label: "Telefono segreteria", type: "text", max: 40 },
      { k: "email", label: "Email", type: "text", max: 100 },
      { k: "president", label: "Presidente ASD", type: "text", max: 80 },
      { k: "legal", label: "Denominazione ASD", type: "text", max: 100 },
      { k: "cf", label: "Codice fiscale", type: "text", max: 20 },
      { k: "affil", label: "Affiliazione", type: "text", max: 100 }
    ], commit: save });

    var s2 = E.section(pane, "Orari della segreteria", "Quando si può parlare con la segreteria (telefono e di persona). Nella pagina Contatti appaiono in grande, in evidenza.");
    E.form({ mount: s2, get: K, fields: [
      { k: "officeHours", label: "Orari della segreteria", type: "pairs", cols: ["Giorni", "Orario"], ph: ["Lunedì – Venerdì", "16:00 – 20:00"], addLabel: "Aggiungi riga" },
      { k: "officeNote", label: "Nota sotto gli orari della segreteria", type: "textarea", rows: 2, max: 300 }
    ], commit: save });

    var s3 = E.section(pane, "Orari di apertura del circolo", "Quando i campi sono aperti per giocare. Sono distinti dagli orari della segreteria.");
    E.form({ mount: s3, get: K, fields: [
      { k: "hours", label: "Orari di apertura del circolo", type: "pairs", cols: ["Giorni", "Orario"], ph: ["Lunedì – Venerdì", "08:00 – 22:00"], addLabel: "Aggiungi riga" },
      { k: "note", label: "Nota generale (sotto gli orari)", type: "textarea", rows: 2, max: 300 }
    ], commit: save });

    var s4 = E.section(pane, "Posizione sulla mappa", "Scegli il punto mostrato da Google Maps nella pagina Contatti. Se lasci il campo vuoto la mappa usa l'indirizzo.");
    var zooms = [["12", "12 · quartiere"], ["14", "14 · zona"], ["16", "16 · strada (consigliato)"], ["18", "18 · edificio"], ["20", "20 · massimo dettaglio"]];
    E.form({ mount: s4, get: K, fields: [
      { k: "mapQuery", label: "Posizione", type: "textarea", rows: 3, max: 1200, full: true,
        hint: "Puoi scrivere: il nome del luogo (es. «Circolo Tennis Pineta, Roma»), le coordinate (es. 41.9028, 12.4964), il link lungo di Google Maps, oppure il codice «Incorpora una mappa» (Google Maps › Condividi › Incorpora una mappa › Copia HTML). I link brevi maps.app.goo.gl non si possono mostrare nella mappa: usa uno degli altri formati." },
      { k: "mapZoom", label: "Ingrandimento", type: "select", opts: zooms }
    ], commit: function (v) { return save(v).then(function (r) { refresh(); return r; }); } });
    var prev = h("div", { class: "map-prev" });
    s4.appendChild(h("h4", { text: "Anteprima" })); s4.appendChild(prev);
    var timer = null;
    function refresh() {
      var f = s4.querySelector("textarea"), z = s4.querySelector("select");
      var m = App.mapResolve({ mapQuery: f ? f.value : K().mapQuery, mapZoom: z ? z.value : K().mapZoom }, (K().address || ""));
      prev.textContent = "";
      if (!m) { prev.appendChild(h("p", { class: "note", text: "Nessuna posizione: inserisci un indirizzo o una posizione." })); return; }
      prev.appendChild(h("div", { class: "map-frame" }, [h("iframe", { src: m.embed, title: "Anteprima mappa", loading: "lazy", referrerpolicy: "no-referrer-when-downgrade" })]));
      prev.appendChild(h("p", { class: "note" }, ["Verrà mostrato: " + m.label + ". ", h("a", { href: m.link, target: "_blank", rel: "noopener", text: "Controlla su Google Maps" })]));
    }
    s4.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(refresh, 700); });
    setTimeout(refresh, 0);
  }

  /* ------------------------------------------------------------ Impostazioni */
  function buildImpostazioni(pane, opts) {
    var only = opts && opts.only;
    loading(pane);
    cms.loadSettings().then(function (st) {
      pane.textContent = "";
      var cur = st;
      var flat = function () {
        var o = { bookingDays: cur.bookingDays, enrollFee: cur.enrollFee, holdOnlineMin: cur.holdOnlineMin, holdBankHours: cur.holdBankHours, cancelHours: cur.cancelHours,
          bankHolder: cur.bank.holder, bankIban: cur.bank.iban, bankName: cur.bank.bank };
        (C.payments.online || []).forEach(function (m) { o["link_" + m.id] = (cur.links || {})[m.id] || ""; });
        return o;
      };
      var s = E.section(pane, (opts && opts.title) || "Prenotazioni e pagamenti", (opts && opts.desc) || "Questi valori valgono per tutto il sito: giorni prenotabili, tempi di blocco degli slot, quota associativa e coordinate di pagamento.");
      var fields = [
        { k: "bookingDays", label: "Giorni prenotabili online (oggi compreso)", type: "number", req: true, min: 1, max: 365, hint: "Ad esempio 30 per mostrare un mese di calendario; massimo 365." },
        { k: "cancelHours", label: "Annullamento gratuito fino a (ore prima)", type: "number", req: true, min: 0, max: 720 },
        { k: "holdOnlineMin", label: "Blocco slot per pagamento online (minuti)", type: "number", req: true, min: 5, max: 1440 },
        { k: "holdBankHours", label: "Blocco slot per bonifico (ore)", type: "number", req: true, min: 1, max: 168 },
        { k: "enrollFee", label: "Quota associativa annuale (€)", type: "number", req: true, min: 0, max: 1000, step: 0.5 },
        { k: "bankHolder", label: "Bonifico: intestatario", type: "text", max: 100 },
        { k: "bankIban", label: "Bonifico: IBAN", type: "text", max: 40 },
        { k: "bankName", label: "Bonifico: banca", type: "text", max: 80 }
      ];
      (C.payments.online || []).forEach(function (m) { fields.push({ k: "link_" + m.id, label: "Link di pagamento: " + m.label, type: "url", hint: "Lascia vuoto se non è ancora attivo." }); });
      if (only) fields = fields.filter(function (f) { return only.indexOf(f.k) >= 0; });
      E.form({ mount: s, get: flat, fields: fields, commit: function (v) {
        var pick = function (k) { return v[k] !== undefined ? v[k] : cur[k]; };
        var links = Object.assign({}, cur.links || {}); (C.payments.online || []).forEach(function (m) { if (v["link_" + m.id] !== undefined) links[m.id] = v["link_" + m.id] || ""; });
        var next = { bookingDays: pick("bookingDays"), enrollFee: pick("enrollFee"), holdOnlineMin: pick("holdOnlineMin"), holdBankHours: pick("holdBankHours"), cancelHours: pick("cancelHours"),
          bank: v.bankHolder !== undefined ? { holder: v.bankHolder, iban: v.bankIban, bank: v.bankName } : cur.bank, links: links };
        return cms.saveSettings(next).then(function () { cur = next; });
      } });
    }, function (e) { failed(pane, e); });
  }

  /* ------------------------------------------------------------ Intestazione e piè di pagina (solo amministratore, dalla modalità modifica) */
  var LOGO = { mode: "fit", max: 480, png: true };
  function SI() { return window.SITO || {}; }
  function saveSito(patch) { return cms.save("sito", Object.assign({}, SI(), patch)); }
  /* cursore con anteprima immediata (variabili CSS) */
  function sizeSlider(mount, o) {
    var cur = o.get() || 0, out = h("output", { text: cur ? cur + " px" : "predefinita" });
    var inp = h("input", { type: "range", min: String(o.min), max: String(o.max), step: String(o.step || 1), value: String(cur || o.def), "aria-label": o.label });
    var rs = h("button", { type: "button", class: "btn ghost small", text: "Predefinita" });
    var save = h("button", { type: "button", class: "btn court small", text: "Salva" }), msg = h("div");
    inp.addEventListener("input", function () { out.textContent = inp.value + " px"; o.preview(Number(inp.value)); });
    rs.addEventListener("click", function () { inp.value = String(o.def); out.textContent = "predefinita"; o.preview(0); });
    save.addEventListener("click", function () {
      var v = out.textContent === "predefinita" ? 0 : Number(inp.value);
      save.disabled = true;
      o.save(v).then(function () { E.say(msg, "Dimensione salvata."); save.disabled = false; }, function (e) { E.say(msg, E.errText(e), true); save.disabled = false; });
    });
    mount.appendChild(h("div", { class: "fld" }, [h("label", { text: o.label }), h("div", { class: "sizerow" }, [inp, out, rs, save]), msg]));
  }
  function buildIdentity(pane) {
    var s1 = E.section(pane, "Nome e logo", "Il nome compare nell'intestazione e nel titolo della scheda del browser. Meglio un logo PNG o SVG con sfondo trasparente.");
    E.form({ mount: s1, get: function () { var x = SI(); return { short: x.short || "", name: x.name || "", logo: x.logo || "", showName: x.showName !== false }; }, fields: [
      { k: "short", label: "Nome breve (intestazione)", type: "text", req: true, max: 30 },
      { k: "name", label: "Nome completo del sito", type: "text", req: true, max: 80 },
      { k: "logo", label: "Logo dell'ASD", type: "image", noun: "logo", spec: LOGO, dark: true, full: true, hint: "Usato nell'intestazione e nel piè di pagina." },
      { k: "showName", label: "Mostra il nome accanto al logo nell'intestazione", type: "checkbox" }
    ], commit: function (v) { return saveSito(v); } });
  }
  function buildHeader(pane) {
    var s0 = E.section(pane, "Dimensioni dell'intestazione", "Trascina e guarda subito l'effetto sulla pagina, poi premi Salva.");
    sizeSlider(s0, { label: "Altezza dell'intestazione", min: 48, max: 140, def: 56, get: function () { return (SI().header || {}).h; },
      preview: function (v) { var x = Object.assign({}, SI(), { header: Object.assign({}, SI().header, { h: v }) }); window.SITO = x; App.applySizes(); },
      save: function (v) { return saveSito({ header: Object.assign({}, SI().header, { h: v }) }); } });
    sizeSlider(s0, { label: "Altezza del logo nell'intestazione", min: 16, max: 100, def: 32, get: function () { return (SI().header || {}).logoH; },
      preview: function (v) { window.SITO = Object.assign({}, SI(), { header: Object.assign({}, SI().header, { logoH: v }) }); App.applySizes(); },
      save: function (v) { return saveSito({ header: Object.assign({}, SI().header, { logoH: v }) }); } });
    buildIdentity(pane);
    var s1 = E.section(pane, "Ordine e visibilità delle voci", "Sposta le voci con le frecce e nascondi quelle che non servono (la voce nascosta si vede sbiadita in modalità modifica). Il pulsante Prenota resta sempre visibile.");
    var NAMES = { index: "Home", storia: "Storia", struttura: "Struttura", corsi: "Scuola", galleria: "Galleria", eventi: "Eventi", contatti: "Contatti" };
    E.list({ mount: s1, noun: "voce", noAdd: true, noEdit: true, noRemove: true,
      title: function (it) { return App.navLabel(it.k) + (it.k === "corsi" ? " (con Corsi e Staff)" : ""); },
      sub: function (it) { return it.hidden ? "Nascosta" : "Visibile"; },
      toggle: { label: function (it) { return it.hidden ? "Mostra" : "Nascondi"; }, flip: function (it) { return Object.assign({}, it, { hidden: !it.hidden }); } },
      getItems: function () { return App.navOrder().map(function (k) { return { k: k, hidden: App.navHidden(k) }; }); },
      setItems: function (list) {
        return saveSito({ navOrder: list.map(function (x) { return x.k; }), navHide: list.filter(function (x) { return x.hidden; }).map(function (x) { return x.k; }) });
      }, fields: [] });
    var s2 = E.section(pane, "Nomi delle voci", "Cambia il nome di ogni voce. Lascia vuoto per tornare al nome originale. Si possono cambiare anche direttamente nella barra del menu, cliccandoci sopra.");
    E.form({ mount: s2, get: function () { var o = {}, n = SI().nav || {}; App.NAVKEYS.forEach(function (k) { o["n_" + k[0]] = n[k[0]] || ""; }); return o; },
      fields: App.NAVKEYS.map(function (k) { return { k: "n_" + k[0], label: k[1] + (k[0] === "corsi" ? " (menu con Corsi e Staff)" : (k[0].indexOf("sub_") === 0 ? " (nel menu Scuola)" : "")), type: "text", max: 24, ph: k[1] }; }),
      commit: function (v) { var nav = {}; App.NAVKEYS.forEach(function (k) { if (v["n_" + k[0]]) nav[k[0]] = v["n_" + k[0]]; }); return saveSito({ nav: nav }); } });
  }
  function buildFooter(pane) {
    var s0 = E.section(pane, "Aspetto del piè di pagina", "Per cambiare altezza del piè di pagina, dei loghi e delle icone social trascina le maniglie blu direttamente sulla pagina, poi premi Salva nella barra in basso. Qui sotto scegli cosa mostrare.");
    var F = function () { return SI().footer || {}; };
    var setF = function (patch) { return Object.assign({}, SI(), { footer: Object.assign({}, F(), patch) }); };
    E.form({ mount: s0, get: function () { return { showContacts: !!F().showContacts, fitpLogo: SI().fitpLogo || "" }; }, fields: [
      { k: "showContacts", label: "Mostra indirizzo, telefono ed email (dai dati di Contatti)", type: "checkbox" },
      { k: "fitpLogo", label: "Logo FITP (sostituisce il testo di affiliazione)", type: "image", noun: "logo FITP", spec: LOGO, dark: true, full: true, hint: "Carica il logo ufficiale FITP, che trovi nel materiale riservato agli affiliati. Finché non lo carichi resta il testo di affiliazione (scheda Contatti › Affiliazione)." }
    ], commit: function (v) { return cms.save("sito", Object.assign({}, setF({ showContacts: v.showContacts }), { fitpLogo: v.fitpLogo })); } });
    var s1 = E.section(pane, "Dimensione dei loghi", "");
    sizeSlider(s1, { label: "Altezza del logo ASD nel piè di pagina", min: 16, max: 120, def: 35, get: function () { return F().logoH; },
      preview: function (v) { window.SITO = setF({ logoH: v }); App.applySizes(); }, save: function (v) { return cms.save("sito", setF({ logoH: v })); } });
    sizeSlider(s1, { label: "Altezza del logo FITP", min: 16, max: 120, def: 38, get: function () { return F().fitpH; },
      preview: function (v) { window.SITO = setF({ fitpH: v }); App.applySizes(); }, save: function (v) { return cms.save("sito", setF({ fitpH: v })); } });
    var s2 = E.section(pane, "Contatti, link e social", "Aggiungi voci al piè di pagina: un contatto (telefono, email, indirizzo), un link a un'altra pagina o sito, oppure un canale social con il suo logo (carica tu il logo ufficiale del social).");
    E.list({ mount: s2, noun: "voce", title: function (it) { return it.label || "(senza nome)"; },
      sub: function (it) { return ({ contact: "Contatto", link: "Link", social: "Social" }[it.kind] || "Link") + (it.url ? " · " + it.url : ""); },
      thumb: function (it) { return it.icon || ""; },
      blank: function () { return { kind: "link" }; },
      getItems: function () { return F().items || []; },
      setItems: function (items) { return cms.save("sito", setF({ items: items })); },
      fields: [
        { k: "kind", label: "Tipo", type: "select", opts: [["contact", "Contatto (telefono, email, indirizzo)"], ["link", "Link"], ["social", "Canale social"]] },
        { k: "net", label: "Canale social (per il tipo «Canale social»)", type: "select", opts: function () { return App.SOCIAL; }, hint: "Con un canale scelto compare la sua icona; se vuoi usare il tuo logo scegli «Altro» e caricalo sotto." },
        { k: "label", label: "Testo (o nome del social)", type: "text", req: true, max: 60, hint: "Ad esempio +39 06 000000, info@circolo.it, Instagram." },
        { k: "url", label: "Indirizzo del collegamento", type: "text", max: 300, hint: "Esempi: tel:+39060000000 · mailto:info@circolo.it · https://www.instagram.com/tuocircolo · galleria.html" },
        { k: "icon", label: "Logo personalizzato (facoltativo)", type: "image", noun: "logo", spec: { mode: "fit", max: 160, png: true }, dark: true, full: true, hint: "Se lo carichi sostituisce l'icona del canale. Senza icona né logo compare la lettera iniziale." }
      ],
      check: function (v) { return v.url && !App.safeUrl(v.url) ? "Indirizzo non valido: usa https://…, mailto:…, tel:… oppure una pagina del sito (es. eventi.html)." : null; }
    });
  }

  /* ------------------------------------------------------------ Account (solo amministratore, database Supabase) */
  function buildAccount(pane, opts) {
    var be = opts.accounts, me = opts.uid;
    var ROLES = [["segreteria", "Segreteria"], ["admin", "Amministratore"]];
    var s = E.section(pane, "Account che possono modificare il sito", "Segreteria: prenotazioni, campi, corsi, staff, eventi e contatti. Amministratore: tutto, comprese struttura, storia, galleria, impostazioni e account.");
    var msg = h("div"), list = h("div", { class: "acc-list" });
    s.appendChild(msg); s.appendChild(list);
    function human(e) {
      var m = String((e && (e.message || e.details)) || e || "");
      if (/user_not_found/.test(m)) return "Nessun account con questa email. La persona deve prima registrarsi dalla pagina Accedi (Crea account), poi potrai abilitarla qui.";
      if (/last_admin/.test(m)) return "Deve restare almeno un Amministratore.";
      if (/not_allowed/.test(m)) return "Solo l'Amministratore può gestire gli account.";
      if (/list_staff|add_staff|schema cache|does not exist|PGRST202/i.test(m)) return "Il database non è aggiornato: esegui migrazione_03.sql nell'SQL Editor di Supabase (vedi la guida) e riprova.";
      return "Operazione non riuscita. Controlla la connessione e riprova.";
    }
    function load() {
      return be.listStaff().then(function (rows) {
        list.textContent = "";
        rows.forEach(function (r) {
          var self = r.user_id === me;
          var sel = h("select", { "aria-label": "Ruolo di " + r.email }, ROLES.map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
          sel.value = r.role;
          sel.addEventListener("change", function () {
            be.setStaffRole(r.user_id, sel.value).then(function () { E.say(msg, "Ruolo aggiornato."); load(); }, function (e) { E.say(msg, human(e), true); load(); });
          });
          var del = h("button", { type: "button", class: "btn ghost small", text: "Rimuovi accesso" });
          del.addEventListener("click", function () {
            E.confirm("Togliere l'accesso all'area riservata a " + r.email + "? L'account resta, ma non potrà più modificare il sito.", "Rimuovi").then(function (yes) {
              if (!yes) return;
              be.removeStaff(r.user_id).then(function () { E.say(msg, "Accesso rimosso."); load(); }, function (e) { E.say(msg, human(e), true); });
            });
          });
          list.appendChild(h("div", { class: "acc-row" }, [
            h("div", { class: "acc-who" }, [h("strong", { text: r.display_name + (self ? " (tu)" : "") }), h("span", { text: r.email })]),
            sel, del
          ]));
        });
      }, function (e) { list.textContent = ""; E.say(msg, human(e), true); });
    }
    var s2 = E.section(pane, "Abilita un nuovo account", "La persona deve aver già creato un account dalla pagina Accedi. Scrivi qui la stessa email e scegli il ruolo.");
    var em = h("input", { type: "email", id: "accEmail", autocomplete: "off", placeholder: "email@esempio.it" });
    var nm = h("input", { type: "text", id: "accName", maxlength: "80", placeholder: "Nome (facoltativo)" });
    var rl = h("select", { id: "accRole" }, ROLES.map(function (o) { return h("option", { value: o[0], text: o[1] }); }));
    var go = h("button", { type: "submit", class: "btn court small", text: "Abilita" });
    var m2 = h("div");
    var f = h("form", { class: "acc-add" }, [
      h("div", { class: "fld" }, [h("label", { for: "accEmail", text: "Email *" }), em]),
      h("div", { class: "fld" }, [h("label", { for: "accName", text: "Nome" }), nm]),
      h("div", { class: "fld" }, [h("label", { for: "accRole", text: "Ruolo" }), rl]),
      go
    ]);
    f.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!em.value.trim()) { E.say(m2, "Inserisci l'email.", true); return; }
      go.disabled = true;
      be.addStaff(em.value.trim(), nm.value.trim(), rl.value).then(function () {
        E.say(m2, "Account abilitato."); em.value = ""; nm.value = ""; go.disabled = false; load();
      }, function (e) { E.say(m2, human(e), true); go.disabled = false; });
    });
    s2.appendChild(f); s2.appendChild(m2);
    load();
  }

  var BUILD = { impostazioni: buildImpostazioni, account: buildAccount };
  var ALL_LABELS = [["prenotazioni", "Prenotazioni"], ["impostazioni", "Impostazioni"], ["account", "Account"]];
  var SEG_TABS = ["prenotazioni"];
  var LABELS = ALL_LABELS;
  /* Sezioni usate dai pannelli della modalità modifica delle pagine. ruolo: "seg" = anche la Segreteria, "admin" = solo Amministratore */
  App.sections = {
    campi: { fn: buildCourts, role: "seg" }, corsi: { fn: buildCourses, role: "seg" }, staff: { fn: buildStaff, role: "seg" }, eventi: { fn: buildEvents, role: "seg" },
    contatti: { fn: buildContatti, role: "seg" },
    struttura: { fn: buildStruttura, role: "admin" }, storia: { fn: buildStoria, role: "admin" }, galleria: { fn: buildGalleria, role: "admin" },
    regole: { fn: function (pane, o) { return buildImpostazioni(pane, Object.assign({}, o, { only: ["bookingDays", "cancelHours", "holdOnlineMin", "holdBankHours"], title: "Regole di prenotazione", desc: "Quanti giorni si possono prenotare, per quanto tempo resta bloccato uno slot in attesa di pagamento e fino a quando l'annullamento è gratuito." })); }, role: "admin" },
    quota: { fn: function (pane, o) { return buildImpostazioni(pane, Object.assign({}, o, { only: ["enrollFee"], title: "Quota associativa", desc: "Importo annuale chiesto con l'iscrizione a un corso." })); }, role: "admin" },
    intestazione: { fn: buildHeader, role: "admin" }, footer: { fn: buildFooter, role: "admin" }
  };

  App.contentTabs = {
    /* opts: { bookings(): mappa prenotazioni, onCourtsChanged() } */
    init: function (opts) {
      var role = opts.role || "admin";
      LABELS = ALL_LABELS.filter(function (t) { return role === "admin" ? (t[0] !== "account" || !!opts.accounts) : SEG_TABS.indexOf(t[0]) >= 0; });
      var bar = $("#tabs"), panes = {}, built = {}, active = null;
      LABELS.forEach(function (t) {
        var b = h("button", { type: "button", role: "tab", class: "edtab", id: "tab-" + t[0], "aria-selected": "false", "aria-controls": "pane-" + t[0], text: t[1] });
        b.addEventListener("click", function () { show(t[0]); });
        b.addEventListener("keydown", function (ev) {
          var i = LABELS.map(function (x) { return x[0]; }).indexOf(t[0]), n = ev.key === "ArrowRight" ? 1 : (ev.key === "ArrowLeft" ? -1 : 0);
          if (n) { var nx = LABELS[(i + n + LABELS.length) % LABELS.length][0]; show(nx); $("#tab-" + nx).focus(); }
        });
        bar.appendChild(b);
        panes[t[0]] = t[0] === "prenotazioni" ? $("#pane-prenotazioni") : (function () { var p = h("div", { id: "pane-" + t[0], role: "tabpanel", class: "pane", hidden: "", "aria-labelledby": "tab-" + t[0] }); $("#panes").appendChild(p); return p; })();
      });
      function show(id) {
        active = id;
        LABELS.forEach(function (t) { panes[t[0]].hidden = t[0] !== id; $("#tab-" + t[0]).setAttribute("aria-selected", String(t[0] === id)); $("#tab-" + t[0]).tabIndex = t[0] === id ? 0 : -1; });
        if (BUILD[id] && !built[id]) {
          built[id] = true;
          BUILD[id](panes[id], opts);
        }
        try { history.replaceState(null, "", "#" + id); } catch (e) {}
      }
      function fromHash() { var x = (location.hash || "").replace("#", ""); return LABELS.some(function (t) { return t[0] === x; }) ? x : null; }
      show(fromHash() || (LABELS.some(function (t) { return t[0] === "prenotazioni"; }) ? "prenotazioni" : LABELS[0][0]));
      window.addEventListener("hashchange", function () { var x = fromHash(); if (x && x !== active) show(x); });
    }
  };
})();
