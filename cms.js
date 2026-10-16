/* Contenuti modificabili dalla segreteria: caricamento per le pagine pubbliche, salvataggio, foto.
   Due archivi, stessa interfaccia:
   - Supabase (sito pubblico): tabelle courts/courses/instructors/events + tabella site_content + bucket "photos" e "posters".
   - Piattaforma claude.ai: documenti "content/<chiave>" e "images/<id>" nel database della piattaforma.
   Se non c'è nessun archivio raggiungibile restano i testi d'esempio di data.js. */
(function () {
  "use strict";
  var App = window.App, C = window.CLUB, CFG = window.SITE_CONFIG || {};
  var cms = (App.cms = {});
  var DOC_KEYS = ["storia", "struttura", "galleria", "contatti"];
  var GLOBAL = { storia: "STORIA", struttura: "STRUTTURA", galleria: "GALLERIA", contatti: "CONTATTI" };
  var ENT = { courts: "COURTS", courses: "COURSES", instructors: "INSTRUCTORS", events: "EVENTS" };
  var COLORS = ["#1D5C48", "#B5532F", "#1F4BA8", "#6B4C9A", "#8A6D1D"];
  var todayIso = App.iso(new Date());
  App.imageStore = {};
  App.ALL_EVENTS = null;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function isObj(v) { return v && typeof v === "object" && !Array.isArray(v); }

  /* ---------- applicazione dei dati caricati alle variabili usate dalle pagine ---------- */
  function applyContacts() {
    var k = window.CONTATTI || {};
    ["address", "phone", "email", "president", "legal", "cf", "affil"].forEach(function (f) { if (k[f]) C[f] = k[f]; });
    /* compatibilità: vecchi dati con la riga "Segreteria" dentro gli orari del circolo */
    if (Array.isArray(k.hours)) {
      var legacy = k.hours.filter(function (r) { return /segreteria/i.test(r[0]); });
      if (legacy.length) {
        k.hours = k.hours.filter(function (r) { return !/segreteria/i.test(r[0]); });
        if (!Array.isArray(k.officeHours) || !k.officeHours.length) k.officeHours = legacy.map(function (r) { return ["Tutti i giorni di apertura", r[1]]; });
      }
      C.hours = k.hours;
    }
    if (Array.isArray(k.officeHours)) C.officeHours = k.officeHours;
  }
  function applySettings(st) {
    if (!isObj(st)) return;
    ["bookingDays", "enrollFee", "holdOnlineMin", "holdBankHours", "cancelHours"].forEach(function (f) { if (st[f] != null && st[f] !== "") C[f] = Number(st[f]); });
    if (C.cancelHours) C.cancelPolicy = "Annullamento gratuito fino a " + C.cancelHours + " ore prima dell'orario prenotato.";
    if (isObj(st.bank)) C.payments.bank = Object.assign({}, C.payments.bank, st.bank);
    if (isObj(st.links)) C.payments.online.forEach(function (m) { if (st.links[m.id] != null) m.url = st.links[m.id]; });
  }
  function applyEvents(list) {
    list.forEach(function (e) { e.meta = [e.time, e.place].filter(Boolean).join(" · "); if (!e.long || !e.long.length) e.long = [e.text || ""]; });
    App.ALL_EVENTS = list;
    window.EVENTS = list.filter(function (e) { return e.published !== false && e.d >= todayIso; }).sort(function (a, b) { return a.d < b.d ? -1 : (a.d > b.d ? 1 : 0); });
  }
  function finish() {
    applyContacts();
    if (!window.EVENTS) window.EVENTS = [];
    if (!App.ALL_EVENTS) applyEvents(window.EVENTS);
    (window.INSTRUCTORS || []).forEach(function (x, i) { if (!x.color) x.color = COLORS[i % COLORS.length]; });
  }

  /* ---------- immagini: ridimensionate tutte allo stesso formato prima del caricamento ---------- */
  function loadBitmap(file) {
    if (window.createImageBitmap) return createImageBitmap(file, { imageOrientation: "from-image" }).catch(function () { return viaImg(file); });
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error("immagine non valida")); };
      im.src = u;
    });
  }
  /* spec: { w, h, mode: "cover" | "fit", max } */
  cms.prepareImage = function (file, spec, scale) {
    if (!file || !/^image\//.test(file.type)) return Promise.reject(new Error("not_image"));
    return loadBitmap(file).then(function (bmp) {
      var sw = bmp.width, sh = bmp.height, k = scale || 1, W, H, sx = 0, sy = 0, cw = sw, ch = sh;
      if (spec.mode === "fit") {
        var m = (spec.max || 1200) * k, f = Math.min(1, m / Math.max(sw, sh));
        W = Math.round(sw * f); H = Math.round(sh * f);
      } else {
        W = Math.round(spec.w * k); H = Math.round(spec.h * k);
        var r = W / H;
        if (sw / sh > r) { cw = sh * r; sx = (sw - cw) / 2; } else { ch = sw / r; sy = (sh - ch) / 2; }
      }
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
      g.imageSmoothingQuality = "high"; g.drawImage(bmp, sx, sy, cw, ch, 0, 0, W, H);
      return cv;
    });
  };
  function toBlob(cv, q) {
    return new Promise(function (res, rej) { cv.toBlob(function (b) { b ? res(b) : rej(new Error("encode")); }, "image/jpeg", q); });
  }
  function blobToDataUrl(b) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.onerror = rej; r.readAsDataURL(b); }); }

  /* ---------- trova le immagini usate in un valore (per eliminare quelle non più usate) ---------- */
  function imagesIn(v, out) {
    out = out || [];
    if (typeof v === "string") { if (v.indexOf("img:") === 0 || v.indexOf("/storage/v1/object/public/") > 0) out.push(v); }
    else if (Array.isArray(v)) v.forEach(function (x) { imagesIn(x, out); });
    else if (isObj(v)) Object.keys(v).forEach(function (k) { imagesIn(v[k], out); });
    return out;
  }
  function dropUnused(before, after) {
    var keep = imagesIn(after), gone = imagesIn(before).filter(function (x) { return keep.indexOf(x) < 0; });
    gone.forEach(function (src) { cms.dropImage(src); });
  }

  cms.imagesIn = imagesIn;
  var be = null, mode = "none";
  cms.mode = function () { return mode; };

  /* =====================================================================
     SUPABASE
     ===================================================================== */
  var BUCKET_RE = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/;
  function pathOf(url) { var m = BUCKET_RE.exec(url || ""); return m ? m[2] : null; }
  function unwrap(r) { if (r.error) throw r.error; return r.data; }
  function P(b) { return Promise.resolve(b); }

  var ROWS = {
    courts: function (c, i) { return { id: c.id, sport: c.sport, name: c.name, surface: c.surface, covered: c.cover === "Coperto", price_hour: Number(c.price) || 0, active: true, sort_order: i }; },
    courses: function (c, i) {
      return { id: c.id, sport: c.sport, name: c.name, level: c.level, age_label: c.age, age_min: Number(c.ageMin) || 0, age_max: Number(c.ageMax) || 99, days: c.days, time_label: c.time,
        lessons: Number(c.lessons) || 1, group_size: c.group || null, coach: c.coach || null, instructor_id: c.coachId || null, starts_on: c.start || null,
        price: Number(c.price) || 0, description: c.text || "", active: true, sort_order: i };
    },
    instructors: function (c, i) {
      return { id: c.id, name: c.name, role: c.role, short_bio: c.short || "", bio: c.bio || [], qualifications: c.qualifications || [], specialties: c.specialties || [],
        years: Number(c.years) || 0, photo_path: pathOf(c.photo), active: true, sort_order: i };
    },
    events: function (c) {
      return { id: c.id, event_date: c.d, starts_at: c.time || null, category: c.cat, title: c.title, summary: c.text || "", description: (c.long && c.long.length) ? c.long : [c.text || ""],
        place: c.place || null, price_label: c.price || null, signup_info: c.signup || null, poster_path: pathOf(c.poster), published: c.published !== false };
    }
  };
  var TABLE = { courts: "courts", courses: "courses", instructors: "instructors", events: "events" };
  var MAPPER = { courts: "court", courses: "course", instructors: "instructor", events: "event" };

  function sbLoadContent() {
    var c = App.sb();
    return P(c.from("site_content").select("*")).then(unwrap).then(function (rows) {
      rows.forEach(function (r) { var g = GLOBAL[r.key]; if (g && r.value != null) window[g] = r.value; });
    });
  }
  function sbSave(key, value) {
    var c = App.sb();
    return P(c.from("site_content").upsert({ key: key, value: value, updated_at: new Date().toISOString(), updated_by: be.uid }, { onConflict: "key" })).then(unwrap);
  }
  function sbLoadEntities(kind) {
    var c = App.sb(), q = c.from(TABLE[kind]).select("*");
    q = kind === "events" ? q.order("event_date") : q.order("sort_order");
    return P(q).then(unwrap).then(function (rows) {
      if (kind !== "events") rows = rows.filter(function (r) { return r.active !== false; });
      return rows.map(function (r, i) { return App.rowMap[MAPPER[kind]](r, i); });
    });
  }
  function sbSaveEntities(kind, list, prev) {
    var c = App.sb(), t = TABLE[kind], rows = list.map(function (x, i) { return ROWS[kind](x, i); });
    var keep = list.map(function (x) { return x.id; });
    var removed = (prev || []).map(function (x) { return x.id; }).filter(function (id) { return keep.indexOf(id) < 0; });
    var report = { archived: [] };
    var step = rows.length ? P(c.from(t).upsert(rows, { onConflict: "id" })).then(unwrap) : Promise.resolve();
    return step.then(function () {
      return removed.reduce(function (p, id) {
        return p.then(function () {
          var pre = kind === "instructors" ? P(c.from("courses").update({ instructor_id: null }).eq("instructor_id", id)).then(unwrap) : Promise.resolve();
          return pre.then(function () { return P(c.from(t).delete().eq("id", id)); }).then(function (r) {
            if (!r.error) return;
            /* campi e corsi con prenotazioni o iscrizioni non si cancellano: si archiviano */
            if ((kind === "courts" || kind === "courses") && (r.error.code === "23503" || /foreign key|violates/i.test(r.error.message || ""))) {
              return P(c.from(t).update({ active: false }).eq("id", id)).then(unwrap).then(function () { report.archived.push(id); });
            }
            throw r.error;
          });
        });
      }, Promise.resolve());
    }).then(function () { return report; });
  }
  function sbSaveSettings(st) {
    var c = App.sb();
    var patch = { booking_days: st.bookingDays, enroll_fee: st.enrollFee, hold_online_min: st.holdOnlineMin, hold_bank_hours: st.holdBankHours, cancel_hours: st.cancelHours,
      bank_holder: st.bank.holder, bank_iban: st.bank.iban, bank_name: st.bank.bank,
      payment_links: C.payments.online.map(function (m) { return { id: m.id, label: m.label, url: (st.links && st.links[m.id]) || "" }; }) };
    return P(c.from("club_settings").update(patch).eq("id", 1)).then(unwrap);
  }
  function sbLoadSettings() {
    var c = App.sb();
    return P(c.from("club_settings").select("*").limit(1)).then(unwrap).then(function (r) {
      var k = r[0] || {};
      return { bookingDays: k.booking_days, enrollFee: Number(k.enroll_fee), holdOnlineMin: k.hold_online_min, holdBankHours: k.hold_bank_hours, cancelHours: k.cancel_hours,
        bank: { holder: k.bank_holder || "", iban: k.bank_iban || "", bank: k.bank_name || "" },
        links: (Array.isArray(k.payment_links) ? k.payment_links : []).reduce(function (o, m) { o[m.id] = m.url; return o; }, {}) };
    });
  }
  function sbUpload(file, spec, bucket) {
    return cms.prepareImage(file, spec, 1).then(function (cv) { return toBlob(cv, 0.86); }).then(function (blob) {
      var path = (bucket === "posters" ? "locandina-" : "foto-") + Date.now().toString(36) + Math.random().toString(36).slice(2, 7) + ".jpg";
      var st = App.sb().storage.from(bucket);
      return P(st.upload(path, blob, { contentType: "image/jpeg", upsert: false })).then(unwrap).then(function () {
        var u = st.getPublicUrl(path); return (u.data && u.data.publicUrl) || App.pubUrl(bucket, path);
      });
    });
  }
  function sbDrop(src) {
    var m = BUCKET_RE.exec(src); if (!m) return;
    try { Promise.resolve(App.sb().storage.from(m[1]).remove([m[2]])).then(function () {}, function () {}); } catch (e) {}
  }

  /* =====================================================================
     PIATTAFORMA claude.ai
     ===================================================================== */
  function plLoad() {
    var db = be.db;
    return Promise.all([db.collection("content").get(), db.collection("images").get()]).then(function (r) {
      r[1].docs.forEach(function (d) { var v = d.data() || {}; if (v.data) App.imageStore[d.id] = v.data; });
      var st = null, ev = null;
      r[0].docs.forEach(function (d) {
        var v = (d.data() || {}).value, id = d.id;
        if (v == null) return;
        if (GLOBAL[id]) window[GLOBAL[id]] = v;
        else if (ENT[id] && Array.isArray(v)) { if (id === "events") ev = v; else window[ENT[id]] = v; }
        else if (id === "settings") st = v;
      });
      if (ev) applyEvents(ev);
      applySettings(st);
    });
  }
  function plSave(key, value) { return be.db.doc("content/" + key).set({ value: value }); }
  function plUpload(file, spec) {
    return cms.prepareImage(file, spec, 0.62).then(function (cv) {
      function attempt(q) {
        return toBlob(cv, q).then(blobToDataUrl).then(function (url) {
          if (url.length > 170000 && q > 0.4) return attempt(q - 0.12);
          if (url.length > 220000) throw new Error("image_too_big");
          return url;
        });
      }
      return attempt(0.78);
    }).then(function (url) {
      var id = "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      return be.db.doc("images/" + id).set({ data: url }).then(function () { App.imageStore[id] = url; return "img:" + id; });
    });
  }
  function plDrop(src) {
    if (src.indexOf("img:") !== 0) return;
    var id = src.slice(4);
    try { be.db.doc("images/" + id).delete().then(function () { delete App.imageStore[id]; }, function () {}); } catch (e) {}
  }

  /* =====================================================================
     interfaccia comune (usata dalle pagine e dall'area segreteria)
     ===================================================================== */
  cms.dropImage = function (src) { if (mode === "supabase") sbDrop(src); else if (mode === "platform") plDrop(src); };
  cms.canEdit = function () { return !!(be && be.canEdit); };

  cms.load = function () {
    return App.backend().then(function (b) {
      be = b; mode = b.mode === "supabase" ? "supabase" : (b.db ? "platform" : "none");
      if (mode === "supabase") {
        if (b.broken || App.contentError) return;
        return sbLoadContent();
      }
      if (mode === "platform") return plLoad();
    }).catch(function (e) { try { console.warn("Contenuti modificabili non caricati", e); } catch (x) {} });
  };

  cms.save = function (key, value) {
    var before = window[GLOBAL[key]];
    var run = mode === "supabase" ? sbSave(key, value) : (mode === "platform" ? plSave(key, value) : Promise.reject(new Error("no_store")));
    return run.then(function () { window[GLOBAL[key]] = value; if (key === "contatti") applyContacts(); dropUnused(before, value); });
  };

  cms.loadEntities = function (kind) {
    if (mode === "supabase") return sbLoadEntities(kind);
    if (kind === "events") return Promise.resolve(clone(App.ALL_EVENTS || window.EVENTS || []));
    return Promise.resolve(clone(window[ENT[kind]] || []));
  };
  cms.saveEntities = function (kind, list, prev) {
    var run;
    if (mode === "supabase") run = sbSaveEntities(kind, list, prev);
    else if (mode === "platform") run = plSave(kind, list).then(function () { return { archived: [] }; });
    else return Promise.reject(new Error("no_store"));
    return run.then(function (rep) {
      if (kind === "events") applyEvents(clone(list)); else window[ENT[kind]] = clone(list);
      dropUnused(prev, list);
      return rep;
    });
  };

  cms.loadSettings = function () {
    if (mode === "supabase") return sbLoadSettings();
    var links = {}; C.payments.online.forEach(function (m) { links[m.id] = m.url; });
    return Promise.resolve({ bookingDays: C.bookingDays, enrollFee: C.enrollFee, holdOnlineMin: C.holdOnlineMin, holdBankHours: C.holdBankHours, cancelHours: C.cancelHours || 24,
      bank: Object.assign({}, C.payments.bank), links: links });
  };
  cms.saveSettings = function (st) {
    var run = mode === "supabase" ? sbSaveSettings(st) : (mode === "platform" ? plSave("settings", st) : Promise.reject(new Error("no_store")));
    return run.then(function () { applySettings(st); });
  };

  /* spec: { w, h, mode } ; bucket: "photos" (predefinito) o "posters" */
  cms.uploadImage = function (file, spec, bucket) {
    if (mode === "supabase") return sbUpload(file, spec, bucket || "photos");
    if (mode === "platform") return plUpload(file, spec);
    return Promise.reject(new Error("no_store"));
  };

  /* Sulle pagine pubbliche: aspetta il caricamento dei contenuti prima di mostrare la pagina. */
  var base = App.ready;
  App.ready = base.then(function () {
    return Promise.race([cms.load(), new Promise(function (r) { setTimeout(r, 6000); })]);
  }).then(finish);
})();
