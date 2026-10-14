/* Collegamento al database di produzione (Supabase).
   Si attiva solo se config.js imposta backend "supabase"; altrimenti non fa nulla. */
(function () {
  "use strict";
  var App = window.App, CFG = window.SITE_CONFIG || {}, C = window.CLUB, pad = App.pad;
  App.isSupabase = CFG.backend === "supabase";
  App.contentError = false;
  if (!App.isSupabase) { App.ready = Promise.resolve(); return; }

  /* ---------- orari: il circolo ragiona sempre in ora italiana ---------- */
  var ROME = "Europe/Rome";
  var fmt = new Intl.DateTimeFormat("en-GB", { timeZone: ROME, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  function parts(t) { var o = {}; fmt.formatToParts(new Date(t)).forEach(function (p) { o[p.type] = p.value; }); return o; }
  App.fromRome = function (iso) { var o = parts(Date.parse(iso)); return { date: o.year + "-" + o.month + "-" + o.day, hour: parseInt(o.hour, 10) }; };
  App.romeIso = function (date, hour) {
    var guess = Date.parse(date + "T" + pad(hour) + ":00:00Z");
    function local(t) { var o = parts(t); return Date.UTC(+o.year, +o.month - 1, +o.day, +o.hour, +o.minute); }
    var off = local(guess) - guess, t = guess - off, off2 = local(t) - t;
    if (off2 !== off) t = guess - off2;
    return new Date(t).toISOString();
  };

  /* ---------- client ---------- */
  var client = null;
  function sb() {
    if (!client) {
      if (!(window.supabase && window.supabase.createClient)) throw new Error("supabase-js non caricato");
      client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    }
    return client;
  }
  App.sb = sb;
  function P(b) { return Promise.resolve(b); }
  function unwrap(r) { if (r.error) throw r.error; return r.data; }
  function msgOf(e) { return String((e && e.message) || e || ""); }
  function key(court, date, hour) { return court + "_" + date + "_" + pad(hour); }
  function pubUrl(bucket, path) { return path ? CFG.supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + path : ""; }

  /* ---------- contenuti pubblici: campi, corsi, istruttori, eventi, dati del circolo ---------- */
  var COLORS = ["#1D5C48", "#B5532F", "#1F4BA8", "#6B4C9A", "#8A6D1D"];
  function loadContent() {
    var c = sb(), today = new Date().toISOString().slice(0, 10);
    return Promise.all([
      P(c.from("courts").select("*").eq("active", true).order("sort_order")).then(unwrap),
      P(c.from("courses").select("*").eq("active", true).order("sort_order")).then(unwrap),
      P(c.from("instructors").select("*").eq("active", true).order("sort_order")).then(unwrap),
      P(c.from("events").select("*").eq("published", true).gte("event_date", today).order("event_date")).then(unwrap),
      P(c.from("club_public").select("*").limit(1)).then(unwrap)
    ]).then(function (r) {
      window.COURTS = r[0].map(function (x) { return { id: x.id, sport: x.sport, name: x.name, surface: x.surface, cover: x.covered ? "Coperto" : "Scoperto", price: Number(x.price_hour) }; });
      window.COURSES = r[1].map(function (x) {
        return { id: x.id, sport: x.sport, name: x.name, level: x.level, age: x.age_label, ageMin: x.age_min, ageMax: x.age_max, days: x.days, time: x.time_label,
          lessons: x.lessons, group: x.group_size || "", coach: x.coach || "A scelta", coachId: x.instructor_id || null, start: x.starts_on || "", price: Number(x.price), text: x.description || "" };
      });
      window.INSTRUCTORS = r[2].map(function (x, i) {
        return { id: x.id, name: x.name, role: x.role, color: COLORS[i % COLORS.length], photo: pubUrl("photos", x.photo_path), years: x.years || 0,
          short: x.short_bio || "", bio: x.bio || [], qualifications: x.qualifications || [], specialties: x.specialties || [] };
      });
      window.EVENTS = r[3].map(function (x) {
        return { id: x.id, d: x.event_date, time: x.starts_at || "", cat: x.category, title: x.title, text: x.summary, long: x.description || [x.summary],
          place: x.place || "", price: x.price_label || "", signup: x.signup_info || "", poster: pubUrl("posters", x.poster_path),
          meta: [x.starts_at, x.place].filter(Boolean).join(" · ") };
      });
      var k = r[4][0];
      if (k) {
        C.name = k.name; C.legal = k.legal_name || k.name; C.address = k.address || ""; C.phone = k.phone || ""; C.email = k.email || "";
        if (k.tax_code) C.cf = k.tax_code;
        C.holdOnlineMin = k.hold_online_min; C.holdBankHours = k.hold_bank_hours; C.enrollFee = Number(k.enroll_fee);
        C.cancelPolicy = "Annullamento gratuito fino a " + k.cancel_hours + " ore prima dell'orario prenotato.";
        C.payments = { online: Array.isArray(k.payment_links) ? k.payment_links : [], bank: { holder: k.bank_holder || "", iban: k.bank_iban || "", bank: k.bank_name || "" } };
      }
    });
  }
  App.ready = Promise.resolve().then(loadContent).catch(function (e) { App.contentError = true; try { console.warn("Contenuti non caricati", e); } catch (x) {} });

  /* ---------- sessione e funzioni usate dalle pagine ---------- */
  function mapBooking(b) {
    var t = App.fromRome(b.slot_start);
    return { k: key(b.court_id, t.date, t.hour), rec: { court: b.court_id, sport: "", date: t.date, hour: t.hour, uid: b.user_id, status: b.status, ref: b.ref, amount: Number(b.amount), pay: b.pay_method, holdUntil: b.hold_until, name: b.customer_name } };
  }
  function mapEnroll(e) {
    return { id: e.ref, courseId: e.course_id, participant: e.participant_name, birth: e.birth_date, guardian: e.guardian_name || "", email: e.email, phone: e.phone,
      pay: e.pay_method, amount: Number(e.amount), status: e.status, createdAt: e.created_at, cert: !!e.medical_cert_ok, uid: e.user_id };
  }
  function rpc(name, args) { return P(sb().rpc(name, args)).then(function (r) { if (r.error) throw r.error; return r.data; }); }
  function one(d) { return Array.isArray(d) ? d[0] : d; }

  App.supabaseBackend = function () {
    var c, be;
    try { c = sb(); } catch (e) { return Promise.resolve({ mode: "supabase", uid: null, email: "", canWrite: false, needLogin: true, canEdit: false, broken: true }); }
    return P(c.auth.getSession()).then(function (r) {
      var user = r.data && r.data.session && r.data.session.user;
      be = {
        mode: "supabase", uid: user ? user.id : null, email: user ? (user.email || "") : "", canEdit: false,
        needLogin: !user, canWrite: !!user && !App.contentError
      };

      /* prenotazioni dei campi */
      be.loadBookings = function () {
        var from = new Date(Date.now() - 86400000).toISOString(), to = new Date(Date.now() + 16 * 86400000).toISOString();
        var occ = P(c.from("slot_occupancy").select("court_id,slot_start").gte("slot_start", from).lte("slot_start", to)).then(unwrap);
        var own = be.uid ? P(c.from("bookings").select("*").neq("status", "annullata").gte("slot_start", from)).then(unwrap) : Promise.resolve([]);
        return Promise.all([occ, own]).then(function (r2) {
          var m = {};
          r2[0].forEach(function (o) { var t = App.fromRome(o.slot_start); m[key(o.court_id, t.date, t.hour)] = { court: o.court_id, date: t.date, hour: t.hour, uid: "altro", status: "occupato" }; });
          r2[1].forEach(function (b) { var x = mapBooking(b); m[x.k] = x.rec; });
          return m;
        });
      };
      be.book = function (sel, name, method, phone) {
        return P(c.rpc("book_slot", { p_court: sel.court, p_slot: App.romeIso(sel.date, sel.hour), p_name: name, p_email: be.email || null, p_phone: phone || null, p_method: method })).then(function (r2) {
          if (r2.error) { if (/slot_taken|slot_blocked|duplicate|unique/i.test(msgOf(r2.error))) return null; throw r2.error; }
          return mapBooking(one(r2.data));
        });
      };
      be.declareBooking = function (ref) { return rpc("declare_booking_payment", { p_ref: ref }); };
      be.cancelBooking = function (ref) { return rpc("cancel_booking", { p_ref: ref }); };

      /* iscrizioni ai corsi */
      be.loadEnrollments = function () {
        return P(c.from("enrollments").select("*").neq("status", "annullata").order("created_at")).then(unwrap).then(function (rows) { return rows.map(mapEnroll); });
      };
      be.enroll = function (it) {
        return rpc("enroll", { p_course: it.courseId, p_name: it.participant, p_birth: it.birth, p_guardian: it.guardian || null, p_email: it.email, p_phone: it.phone, p_method: it.pay }).then(function (d) { return mapEnroll(one(d)); });
      };
      be.declareEnrollment = function (ref) { return rpc("declare_enrollment_payment", { p_ref: ref }); };
      be.cancelEnrollment = function (ref) { return rpc("cancel_enrollment", { p_ref: ref }); };

      /* area segreteria */
      be.staffLoad = function () {
        var nowIso = new Date().toISOString();
        return Promise.all([
          P(c.from("bookings").select("*").neq("status", "annullata").order("slot_start")).then(unwrap),
          P(c.from("enrollments").select("*").neq("status", "annullata").order("created_at", { ascending: false })).then(unwrap),
          P(c.from("court_blocks").select("*").gte("end_at", nowIso)).then(unwrap)
        ]).then(function (r2) {
          var S = { bookings: {}, info: {}, enroll: [], blocks: {}, notes: {}, rowOf: {} };
          r2[0].forEach(function (b) { var x = mapBooking(b); S.bookings[x.k] = x.rec; S.info[x.k] = { name: b.customer_name }; });
          S.enroll = r2[1].map(function (e) { return { uid: e.user_id, it: mapEnroll(e) }; });
          r2[2].forEach(function (row) {
            var courts = row.court_id ? [row.court_id] : (window.COURTS || []).map(function (x) { return x.id; });
            for (var t = Date.parse(row.start_at); t < Date.parse(row.end_at); t += 3600000) {
              var p = App.fromRome(new Date(t).toISOString());
              courts.forEach(function (cid) { var k = key(cid, p.date, p.hour); S.blocks[k] = { court: cid, date: p.date, hour: p.hour }; S.notes[k] = { note: row.reason || "" }; S.rowOf[k] = row.id; });
            }
          });
          return S;
        });
      };
      be.confirmBooking = function (ref) { return rpc("confirm_booking_payment", { p_ref: ref }); };
      be.confirmEnrollment = function (ref, cert) { return rpc("confirm_enrollment", { p_ref: ref, p_certificate: !!cert }); };
      be.removeEnrollment = function (ref) { return P(c.from("enrollments").update({ status: "annullata" }).eq("ref", ref)).then(unwrap); };
      be.addBlocks = function (rows) { return P(c.from("court_blocks").insert(rows)).then(unwrap); };
      be.removeBlockRows = function (ids) { return P(c.from("court_blocks").delete().in("id", ids)).then(unwrap); };

      if (!user) return be;
      return P(c.rpc("is_staff")).then(function (s) { be.canEdit = s.data === true; return be; }, function () { return be; });
    }, function () { return { mode: "supabase", uid: null, email: "", canWrite: false, needLogin: true, canEdit: false, broken: true }; });
  };
})();
