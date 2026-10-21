/* Componenti dell'area segreteria per modificare i contenuti: campi, finestre di modifica, elenchi con aggiungi / modifica / elimina / sposta. */
(function () {
  "use strict";
  var App = window.App, h = App.h, cms = App.cms;
  var E = (App.editor = {});
  var seq = 0;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function say(box, text, err) { box.textContent = ""; if (text) box.appendChild(h("div", { class: "msg" + (err ? " err" : ""), role: err ? "alert" : "status", text: text })); }
  E.say = say;
  function errText(e) {
    var m = String((e && e.message) || e || "");
    if (/image_too_big/.test(m)) return "La foto è troppo pesante anche dopo la riduzione. Prova con un'altra.";
    if (/not_image/.test(m)) return "Il file scelto non è un'immagine.";
    if (/no_store/.test(m)) return "Nessun archivio collegato: qui non si può salvare.";
    if (/site_content|schema cache|relation .* does not exist|PGRST20|booking_days/i.test(m)) return "Il database non è aggiornato: esegui migrazione_02.sql nell'SQL Editor di Supabase (vedi la guida) e riprova.";
    if (/permission|row-level|not_allowed|JWT|401|403/i.test(m)) return "Non hai il permesso di salvare. Accedi di nuovo con un account della segreteria.";
    return "Salvataggio non riuscito. Controlla la connessione e riprova.";
  }
  E.errText = errText;

  /* ---------- finestra di conferma (window.confirm può essere bloccato nelle pagine incorporate) ---------- */
  E.confirm = function (message, okText) {
    return new Promise(function (resolve) {
      var dlg = h("dialog", { class: "edlg small", "aria-label": "Conferma" });
      var ok = h("button", { type: "button", class: "btn confirm", text: okText || "Conferma", style: "width:auto;padding-inline:1.4rem" });
      var no = h("button", { type: "button", class: "btn ghost small", text: "Annulla" });
      dlg.appendChild(h("div", { class: "edbody" }, [h("p", { text: message }), h("div", { class: "btn-row" }, [ok, no])]));
      document.body.appendChild(dlg);
      function end(v) { try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } dlg.remove(); resolve(v); }
      ok.addEventListener("click", function () { end(true); });
      no.addEventListener("click", function () { end(false); });
      dlg.addEventListener("cancel", function () { dlg.remove(); resolve(false); });
      try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
      no.focus();
    });
  };

  /* ---------- campi ---------- */
  function wrapField(f, ctl) {
    var id = "ef" + (++seq);
    var box = h("div", { class: "fld" + (f.full || ["textarea", "paras", "lines", "image", "photos", "pairs", "checkbox"].indexOf(f.type) >= 0 ? " full" : "") });
    if (f.type === "checkbox") {
      ctl.input.id = id;
      box.appendChild(h("label", { class: "check", for: id }, [ctl.input, h("span", { text: f.label })]));
    } else {
      box.appendChild(h("label", { for: id, text: f.label + (f.req ? " *" : "") }));
      if (ctl.input) ctl.input.id = id;
      box.appendChild(ctl.el);
    }
    if (f.hint) box.appendChild(h("small", { class: "hint", text: f.hint }));
    ctl.box = box;
    return ctl;
  }
  function simple(input, get, set) { return { el: input, input: input, get: get, set: set, focus: function () { input.focus(); } }; }

  var BUILD = {
    text: function (f) { var i = h("input", { type: "text", maxlength: String(f.max || 140), autocomplete: "off", placeholder: f.ph || "" }); return simple(i, function () { return i.value.trim(); }, function (v) { i.value = v == null ? "" : v; }); },
    textarea: function (f) { var i = h("textarea", { rows: String(f.rows || 3), maxlength: String(f.max || 1500), placeholder: f.ph || "" }); return simple(i, function () { return i.value.trim(); }, function (v) { i.value = v == null ? "" : v; }); },
    paras: function (f) {
      var i = h("textarea", { rows: String(f.rows || 7), maxlength: "6000" });
      return simple(i, function () { return i.value.split(/\n\s*\n/).map(function (x) { return x.trim(); }).filter(Boolean); }, function (v) { i.value = (v || []).join("\n\n"); });
    },
    lines: function (f) {
      var i = h("textarea", { rows: String(f.rows || 4), maxlength: "2000" });
      return simple(i, function () { return i.value.split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }, function (v) { i.value = (v || []).join("\n"); });
    },
    number: function (f) {
      var i = h("input", { type: "number", inputmode: "decimal", step: String(f.step || 1) });
      if (f.min != null) i.min = String(f.min); if (f.max != null) i.max = String(f.max);
      var c = simple(i, function () { return i.value === "" ? null : Number(i.value); }, function (v) { i.value = v == null ? "" : v; });
      c.number = true; return c;
    },
    date: function () { var i = h("input", { type: "date" }); return simple(i, function () { return i.value; }, function (v) { i.value = v || ""; }); },
    time: function () { var i = h("input", { type: "time" }); return simple(i, function () { return i.value; }, function (v) { i.value = v || ""; }); },
    url: function (f) { var i = h("input", { type: "url", placeholder: "https://", maxlength: "300" }); return simple(i, function () { return i.value.trim(); }, function (v) { i.value = v == null ? "" : v; }); },
    select: function (f) {
      var i = h("select"), fill = function (opts) { i.textContent = ""; opts.forEach(function (o) { i.appendChild(h("option", { value: o[0], text: o[1] })); }); };
      fill(typeof f.opts === "function" ? f.opts() : f.opts);
      var c = simple(i, function () { return i.value; }, function (v) { if (typeof f.opts === "function") fill(f.opts()); i.value = v == null ? "" : String(v); if (i.value !== String(v == null ? "" : v)) i.selectedIndex = 0; });
      return c;
    },
    checkbox: function () { var i = h("input", { type: "checkbox" }); return { el: i, input: i, get: function () { return i.checked; }, set: function (v) { i.checked = !!v; }, focus: function () { i.focus(); } }; },

    /* una foto, ridimensionata al formato indicato prima del caricamento */
    image: function (f, ctx) {
      var val = "", wrap = h("div", { class: "imgfield" }), prev = h("div", { class: "prev" }), status = h("span", { class: "pay-help" });
      if (f.spec && f.spec.w) prev.style.aspectRatio = f.spec.w + " / " + f.spec.h;
      if (f.dark) prev.classList.add("dark");
      if (f.spec && f.spec.mode === "fit") prev.classList.add("contain");
      var file = h("input", { type: "file", accept: "image/*", hidden: "" }), pick = h("button", { type: "button", class: "btn ghost small", text: "Scegli " + (f.noun || "foto") });
      var rm = h("button", { type: "button", class: "btn ghost small", text: "Rimuovi" });
      function draw() {
        prev.textContent = "";
        var s = App.img(val);
        if (s) prev.appendChild(h("img", { src: s, alt: "Anteprima" })); else prev.appendChild(h("span", { class: "none", text: "Nessun" + (f.noun ? " " + f.noun : "a foto") }));
        rm.hidden = !val; pick.textContent = (val ? "Cambia " : "Scegli ") + (f.noun || "foto");
      }
      pick.addEventListener("click", function () { file.click(); });
      rm.addEventListener("click", function () { val = ""; status.textContent = ""; draw(); });
      file.addEventListener("change", function () {
        var fl = file.files && file.files[0]; if (!fl) return;
        pick.disabled = true; status.textContent = "Caricamento…";
        cms.uploadImage(fl, f.spec, f.bucket).then(function (src) { val = src; ctx.uploaded.push(src); status.textContent = ""; }, function (e) { status.textContent = errText(e); })
          .then(function () { pick.disabled = false; file.value = ""; draw(); });
      });
      wrap.appendChild(prev); wrap.appendChild(h("div", { class: "imgbtns" }, [pick, rm, file, status]));
      draw();
      return { el: wrap, get: function () { return val; }, set: function (v) { val = v || ""; draw(); }, focus: function () { pick.focus(); } };
    },

    /* più foto con didascalia: [{src, caption}] */
    photos: function (f, ctx) {
      var items = [], wrap = h("div", { class: "photosfield" }), list = h("ul", { class: "phlist" }), status = h("span", { class: "pay-help" });
      var file = h("input", { type: "file", accept: "image/*", multiple: "", hidden: "" }), add = h("button", { type: "button", class: "btn ghost small", text: "Aggiungi foto" });
      function draw() {
        list.textContent = "";
        items.forEach(function (it, i) {
          var cap = h("input", { type: "text", maxlength: "100", placeholder: "Didascalia (facoltativa)", value: it.caption || "", "aria-label": "Didascalia foto " + (i + 1) });
          cap.addEventListener("input", function () { it.caption = cap.value; });
          var th = h("div", { class: "th" }); var s = App.img(it.src); if (s) th.appendChild(h("img", { src: s, alt: "" }));
          var up = h("button", { type: "button", class: "ico", text: "↑", "aria-label": "Sposta su" }), dn = h("button", { type: "button", class: "ico", text: "↓", "aria-label": "Sposta giù" }), del = h("button", { type: "button", class: "ico del", text: "✕", "aria-label": "Rimuovi foto" });
          up.disabled = i === 0; dn.disabled = i === items.length - 1;
          up.addEventListener("click", function () { items.splice(i - 1, 0, items.splice(i, 1)[0]); draw(); });
          dn.addEventListener("click", function () { items.splice(i + 1, 0, items.splice(i, 1)[0]); draw(); });
          del.addEventListener("click", function () { items.splice(i, 1); draw(); });
          list.appendChild(h("li", {}, [th, cap, up, dn, del]));
        });
        if (!items.length) list.appendChild(h("li", { class: "none", text: "Nessuna foto: verrà mostrata un'immagine segnaposto." }));
      }
      add.addEventListener("click", function () { file.click(); });
      file.addEventListener("change", function () {
        var fl = Array.prototype.slice.call(file.files || []); if (!fl.length) return;
        add.disabled = true; status.textContent = "Caricamento di " + fl.length + (fl.length === 1 ? " foto…" : " foto…");
        var errs = 0;
        fl.reduce(function (p, one) {
          return p.then(function () { return cms.uploadImage(one, f.spec, f.bucket).then(function (src) { items.push({ src: src, caption: "" }); ctx.uploaded.push(src); draw(); }, function () { errs++; }); });
        }, Promise.resolve()).then(function () { add.disabled = false; file.value = ""; status.textContent = errs ? errs + " foto non caricate (formato non valido o troppo pesanti)." : ""; });
      });
      wrap.appendChild(list); wrap.appendChild(h("div", { class: "imgbtns" }, [add, file, status]));
      draw();
      return { el: wrap, get: function () { return items.map(function (x) { return { src: x.src, caption: (x.caption || "").trim() }; }); }, set: function (v) { items = clone(v || []); draw(); }, focus: function () { add.focus(); } };
    },

    /* righe a due colonne: [[etichetta, valore]] (ad esempio gli orari) */
    pairs: function (f) {
      var rows = [], wrap = h("div", { class: "pairsfield" }), list = h("div", { class: "prlist" });
      var add = h("button", { type: "button", class: "btn ghost small", text: f.addLabel || "Aggiungi riga" });
      function draw() {
        list.textContent = "";
        rows.forEach(function (r, i) {
          var a = h("input", { type: "text", maxlength: "60", value: r[0] || "", placeholder: f.ph ? f.ph[0] : "", "aria-label": (f.cols ? f.cols[0] : "Voce") + " " + (i + 1) });
          var b = h("input", { type: "text", maxlength: "60", value: r[1] || "", placeholder: f.ph ? f.ph[1] : "", "aria-label": (f.cols ? f.cols[1] : "Valore") + " " + (i + 1) });
          a.addEventListener("input", function () { r[0] = a.value; }); b.addEventListener("input", function () { r[1] = b.value; });
          var del = h("button", { type: "button", class: "ico del", text: "✕", "aria-label": "Elimina riga" });
          del.addEventListener("click", function () { rows.splice(i, 1); draw(); });
          list.appendChild(h("div", { class: "pr" }, [a, b, del]));
        });
      }
      add.addEventListener("click", function () { rows.push(["", ""]); draw(); });
      wrap.appendChild(list); wrap.appendChild(add); draw();
      return { el: wrap, get: function () { return rows.map(function (r) { return [(r[0] || "").trim(), (r[1] || "").trim()]; }).filter(function (r) { return r[0] || r[1]; }); }, set: function (v) { rows = clone(v || []); draw(); } };
    }
  };

  /* costruisce i campi di una scheda; ritorna { el, set(obj), read() -> {value|error} } */
  function buildFields(fields, ctx) {
    var grid = h("div", { class: "form-grid" }), ctls = [];
    fields.forEach(function (f) {
      var c = wrapField(f, BUILD[f.type](f, ctx)); c.f = f; ctls.push(c); grid.appendChild(c.box);
    });
    return {
      el: grid,
      set: function (obj) { ctls.forEach(function (c) { var v = obj[c.f.k]; if (c.f.type === "checkbox") c.set(v === undefined ? (c.f.def !== undefined ? c.f.def : true) : v); else c.set(v === undefined ? c.f.def : v); }); },
      read: function (base) {
        var out = Object.assign({}, base);
        for (var i = 0; i < ctls.length; i++) {
          var c = ctls[i], f = c.f, v = c.get();
          if (f.type === "number") {
            if (v === null || isNaN(v)) { if (f.req) return { error: "Inserisci un numero in “" + f.label + "”.", focus: c }; v = f.def != null ? f.def : null; }
            else if ((f.min != null && v < f.min) || (f.max != null && v > f.max)) return { error: "“" + f.label + "” deve essere tra " + f.min + " e " + f.max + ".", focus: c };
          } else if (f.type === "url" && v && !/^https?:\/\/\S+$/i.test(v)) return { error: "“" + f.label + "” deve iniziare con https://", focus: c };
          else if (f.req && (v === "" || v == null || (Array.isArray(v) && !v.length))) return { error: "Compila il campo “" + f.label + "”.", focus: c };
          out[f.k] = v;
        }
        return { value: out };
      },
      focusFirst: function () { if (ctls[0] && ctls[0].focus) ctls[0].focus(); }
    };
  }

  /* ---------- finestra di modifica di una scheda ---------- */
  function editDialog(spec, item, isNew) {
    return new Promise(function (resolve) {
      var ctx = { uploaded: [] }, form = buildFields(spec.fields, ctx);
      var dlg = h("dialog", { class: "edlg", "aria-label": (isNew ? "Nuovo: " : "Modifica: ") + spec.noun });
      var msg = h("div", { role: "status", "aria-live": "polite" });
      var save = h("button", { type: "submit", class: "btn confirm", text: "Salva", style: "width:auto;padding-inline:1.6rem" });
      var cancel = h("button", { type: "button", class: "btn ghost small", text: "Annulla" });
      var fm = h("form", { class: "edbody", novalidate: "" }, [h("h3", { text: (isNew ? "Aggiungi " : "Modifica ") + spec.noun }), form.el, msg, h("div", { class: "btn-row" }, [save, cancel])]);
      dlg.appendChild(fm); document.body.appendChild(dlg);
      form.set(item || {});
      function cleanup(saved, value) {
        /* foto caricate in questa finestra e poi non usate: si eliminano */
        var used = value ? cms.imagesIn(value) : [];
        ctx.uploaded.forEach(function (s) { if (used.indexOf(s) < 0) cms.dropImage(s); });
        try { dlg.close(); } catch (e) { dlg.removeAttribute("open"); } dlg.remove(); resolve(saved ? value : null);
      }
      cancel.addEventListener("click", function () { cleanup(false); });
      dlg.addEventListener("cancel", function (ev) { ev.preventDefault(); cleanup(false); });
      fm.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var r = form.read(item || {});
        if (r.error) { say(msg, r.error, true); if (r.focus && r.focus.focus) r.focus.focus(); return; }
        if (spec.check) { var bad = spec.check(r.value, isNew); if (bad) { say(msg, bad, true); return; } }
        save.disabled = true; say(msg, "Salvataggio…");
        Promise.resolve(spec.commit(r.value, isNew)).then(function () { cleanup(true, r.value); }, function (e) { save.disabled = false; say(msg, errText(e), true); });
      });
      try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); }
      setTimeout(function () { form.focusFirst(); }, 30);
    });
  }

  /* ---------- elenco con aggiungi / modifica / elimina / sposta ----------
     spec: { mount, noun, nounPlural, fields, getItems(), setItems(items, prev) -> Promise, blank(),
             title(it), sub(it), thumb(it) -> src, check(item, isNew), beforeRemove(it) -> messaggio|null, removeText, sortable, emptyText } */
  E.list = function (spec) {
    var box = h("div", { class: "edlist-wrap" }), ul = h("ul", { class: "edlist" }), msg = h("div", { role: "status", "aria-live": "polite" });
    var head = h("div", { class: "edhead" });
    var add = h("button", { type: "button", class: "btn solid small", text: "+ Aggiungi " + spec.noun, style: "color:var(--ball-ink)" });
    head.appendChild(add);
    if (spec.bulk) {
      var bf = h("input", { type: "file", accept: "image/*", multiple: "", hidden: "" }), bb = h("button", { type: "button", class: "btn ghost small", text: spec.bulk.label });
      bb.addEventListener("click", function () { bf.click(); });
      bf.addEventListener("change", function () {
        var files = Array.prototype.slice.call(bf.files || []); if (!files.length) return;
        bb.disabled = add.disabled = true; say(msg, "Caricamento di " + files.length + (files.length === 1 ? " foto…" : " foto…"));
        var items = spec.getItems().slice(), prev = clone(items), errs = 0, done = 0;
        files.reduce(function (p, f) {
          return p.then(function () { return cms.uploadImage(f, spec.bulk.spec, spec.bulk.bucket).then(function (src) { var it = spec.blank(); it[spec.bulk.field] = src; items.push(it); done++; }, function () { errs++; }); });
        }, Promise.resolve()).then(function () {
          if (!done) { say(msg, "Nessuna foto caricata: formato non valido o file troppo pesanti.", true); return; }
          return Promise.resolve(spec.setItems(items, prev)).then(function () { say(msg, done + (done === 1 ? " foto aggiunta." : " foto aggiunte.") + (errs ? " " + errs + " non caricate." : "")); draw(); }, function (e) { say(msg, errText(e), true); });
        }).then(function () { bb.disabled = add.disabled = false; bf.value = ""; });
      });
      head.appendChild(bb); head.appendChild(bf);
    }
    box.appendChild(head); box.appendChild(ul); box.appendChild(msg);
    spec.mount.appendChild(box);

    function persist(items, okText) {
      var prev = clone(spec.getItems());
      return Promise.resolve(spec.setItems(items, prev)).then(function (rep) {
        var t = okText;
        if (rep && rep.archived && rep.archived.length) t += " Alcuni elementi avevano prenotazioni o iscrizioni: sono stati archiviati (non compaiono più sul sito ma restano nello storico).";
        say(msg, t); draw();
      }, function (e) { say(msg, errText(e), true); draw(); throw e; });
    }
    function draw() {
      var items = spec.getItems(); ul.textContent = "";
      if (!items.length) ul.appendChild(h("li", { class: "none", text: spec.emptyText || "Nessun elemento. Usa il pulsante per aggiungerne uno." }));
      items.forEach(function (it, i) {
        var li = h("li", { class: "edrow" });
        if (spec.thumb) { var th = h("div", { class: "th" }), s = App.img(spec.thumb(it)); if (s) th.appendChild(h("img", { src: s, alt: "" })); li.appendChild(th); }
        var sub = spec.sub ? spec.sub(it) : "";
        li.appendChild(h("div", { class: "tx" }, [h("b", { text: spec.title(it) }), sub ? h("span", { text: sub }) : null]));
        var acts = h("div", { class: "tools" });
        if (spec.sortable !== false && items.length > 1) {
          var up = h("button", { type: "button", class: "ico", text: "↑", "aria-label": "Sposta su: " + spec.title(it) }), dn = h("button", { type: "button", class: "ico", text: "↓", "aria-label": "Sposta giù: " + spec.title(it) });
          up.disabled = i === 0; dn.disabled = i === items.length - 1;
          function move(d) { var n = clone(items); n.splice(i + d, 0, n.splice(i, 1)[0]); up.disabled = dn.disabled = true; persist(n, "Ordine aggiornato.").catch(function () {}); }
          up.addEventListener("click", function () { move(-1); }); dn.addEventListener("click", function () { move(1); });
          acts.appendChild(up); acts.appendChild(dn);
        }
        var ed = h("button", { type: "button", class: "link", text: "Modifica" });
        ed.addEventListener("click", function () {
          say(msg, "");
          editDialog({ noun: spec.noun, fields: spec.fields, check: spec.check ? function (v, n) { return spec.check(v, n, i); } : null, commit: function (v) { var n = clone(items); n[i] = v; return persist(n, "Modifiche salvate."); } }, clone(it), false);
        });
        var rm = h("button", { type: "button", class: "link", text: "Elimina" });
        rm.addEventListener("click", function () {
          var why = spec.beforeRemove ? spec.beforeRemove(it) : null;
          if (why) { say(msg, why, true); return; }
          E.confirm((spec.removeText ? spec.removeText(it) : "Eliminare “" + spec.title(it) + "”?") + " L'operazione non si può annullare.", "Elimina").then(function (yes) {
            if (!yes) return;
            var n = clone(items); n.splice(i, 1); persist(n, "Eliminato.").catch(function () {});
          });
        });
        acts.appendChild(ed); acts.appendChild(rm); li.appendChild(acts);
        ul.appendChild(li);
      });
    }
    add.addEventListener("click", function () {
      say(msg, "");
      editDialog({ noun: spec.noun, fields: spec.fields, check: spec.check, commit: function (v) {
        var n = clone(spec.getItems()); n.push(v); return persist(n, "Aggiunto.");
      } }, spec.blank ? spec.blank() : {}, true);
    });
    draw();
    return { redraw: draw, say: function (t, e) { say(msg, t, e); } };
  };

  /* ---------- modulo singolo (un documento) ---------- */
  E.form = function (spec) {
    var ctx = { uploaded: [] }, form = buildFields(spec.fields, ctx), msg = h("div", { role: "status", "aria-live": "polite" });
    var save = h("button", { type: "submit", class: "btn confirm", text: spec.saveText || "Salva", style: "width:auto;padding-inline:1.6rem" });
    var fm = h("form", { class: "edform", novalidate: "" }, [form.el, h("div", { class: "btn-row" }, [save]), msg]);
    spec.mount.appendChild(fm);
    function load() { form.set(spec.get() || {}); }
    load();
    fm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var r = form.read(spec.get() || {});
      if (r.error) { say(msg, r.error, true); if (r.focus && r.focus.focus) r.focus.focus(); return; }
      save.disabled = true; say(msg, "Salvataggio…");
      Promise.resolve(spec.commit(r.value)).then(function () {
        var used = cms.imagesIn(r.value); ctx.uploaded.forEach(function (s) { if (used.indexOf(s) < 0) cms.dropImage(s); }); ctx.uploaded = [];
        save.disabled = false; say(msg, "Modifiche salvate.");
      }, function (e) { save.disabled = false; say(msg, errText(e), true); });
    });
    return { reload: load };
  };

  E.section = function (mount, title, desc) {
    var s = h("section", { class: "edsec" }, [h("h3", { text: title }), desc ? h("p", { class: "pay-help", text: desc }) : null]);
    mount.appendChild(s); return s;
  };
})();
