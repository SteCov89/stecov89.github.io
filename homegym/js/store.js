/* Archivio locale (localStorage) + sincronizzazione opzionale con Supabase. */
(function () {
  var SG = (window.SG = window.SG || {});
  var KEY = 'sg.v1';
  var S = { sessions: [], active: null, pending: [], lastSync: null, settings: { theme: 'auto', step: 2.5, rest: true, wake: true } };
  var listeners = [];

  function uid() {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); });
  }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var o = JSON.parse(raw); ['sessions', 'active', 'pending', 'lastSync'].forEach(function (k) { if (o[k] !== undefined) S[k] = o[k]; }); if (o.settings) Object.assign(S.settings, o.settings); }
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ sessions: S.sessions, active: S.active, pending: S.pending, lastSync: S.lastSync, settings: S.settings })); } catch (e) {}
  }
  function emit() { listeners.forEach(function (f) { try { f(); } catch (e) {} }); }
  function nowIso() { return new Date().toISOString(); }
  function dayOf(key) { return SG.PLAN.filter(function (d) { return d.key === key; })[0]; }

  var Store = {
    state: S,
    uid: uid,
    save: save,
    on: function (f) { listeners.push(f); },
    sessions: function () { return S.sessions.slice().sort(function (a, b) { return a.started_at < b.started_at ? 1 : -1; }); },

    lastFor: function (exId) {
      var ss = Store.sessions();
      for (var i = 0; i < ss.length; i++) {
        var sets = ss[i].sets.filter(function (x) { return x.exercise_id === exId; });
        if (sets.length) return { date: ss[i].started_at, sets: sets };
      }
      return null;
    },
    suggestion: function (exId, repsText) {
      var ex = SG.EXERCISES[exId];
      if (!ex || ex.kind !== 'load') return null;
      var last = Store.lastFor(exId);
      if (!last) return null;
      var top = SG.repRange(repsText)[1], kgs = last.sets.map(function (s) { return s.weight_kg || 0; });
      var kg = Math.max.apply(null, kgs);
      if (!kg) return null;
      var topSets = last.sets.filter(function (s) { return s.weight_kg === kg; });
      var ok = topSets.length && topSets.every(function (s) { return (s.reps || 0) >= top; });
      return ok ? Math.round((kg + S.settings.step) * 100) / 100 : null;
    },

    nextKey: function () {
      var ss = Store.sessions();
      if (!ss.length) return ['a', 'a', 'a', 'b', 'b', 'c', 'c'][new Date().getDay()]; // dom-lun-mar → A, mer-gio → B, ven-sab → C
      var keys = SG.PLAN.map(function (d) { return d.key; });
      return keys[(keys.indexOf(ss[0].plan_day) + 1) % keys.length];
    },

    startWorkout: function (key) {
      if (S.active) return S.active;
      var day = dayOf(key), exs = {};
      day.items.forEach(function (it) {
        var last = Store.lastFor(it.ex), arr = [];
        for (var i = 0; i < it.sets; i++) {
          var prev = last && (last.sets[i] || last.sets[last.sets.length - 1]);
          // le serie partono compilate con quanto fatto nella seduta precedente (serie per serie)
          arr.push({ kg: prev && prev.weight_kg != null ? prev.weight_kg : '', reps: prev && prev.reps != null ? prev.reps : '', sec: prev && prev.seconds != null ? prev.seconds : (SG.EXERCISES[it.ex].kind === 'time' ? SG.repRange(it.reps)[0] : ''), done: false });
        }
        exs[it.ex] = arr;
      });
      S.active = { id: uid(), plan_day: key, started_at: nowIso(), sets: exs };
      save(); emit();
      return S.active;
    },
    discardWorkout: function () { S.active = null; save(); emit(); },

    activeProgress: function () {
      if (!S.active) return { done: 0, total: 0 };
      var d = 0, t = 0;
      Object.keys(S.active.sets).forEach(function (k) { S.active.sets[k].forEach(function (s) { t++; if (s.done) d++; }); });
      return { done: d, total: t };
    },

    finishWorkout: function (kneePain, notes) {
      var a = S.active; if (!a) return null;
      var rows = [], n = 0, day = dayOf(a.plan_day);
      day.items.forEach(function (it) {
        (a.sets[it.ex] || []).forEach(function (s, i) {
          if (!s.done) return;
          rows.push({ id: uid(), exercise_id: it.ex, set_no: i + 1, weight_kg: s.kg === '' ? null : Number(s.kg), reps: s.reps === '' ? null : Number(s.reps), seconds: SG.EXERCISES[it.ex].kind === 'time' && s.sec !== '' ? Number(s.sec) : null });
          n++;
        });
      });
      var ses = { id: a.id, plan_day: a.plan_day, started_at: a.started_at, ended_at: nowIso(), notes: notes || '', knee_pain: kneePain == null ? null : kneePain, updated_at: nowIso(), sets: rows };
      S.sessions.push(ses); S.active = null;
      Store.queue(ses.id, 'upsert');
      save(); emit();
      Cloud.sync();
      return ses;
    },

    deleteSession: function (id) {
      S.sessions = S.sessions.filter(function (s) { return s.id !== id; });
      Store.queue(id, 'delete');
      save(); emit(); Cloud.sync();
    },

    queue: function (id, op) {
      S.pending = S.pending.filter(function (p) { return p.id !== id; });
      S.pending.push({ id: id, op: op });
    },

    history: function (exId) {
      return Store.sessions().slice().reverse().map(function (s) {
        var sets = s.sets.filter(function (x) { return x.exercise_id === exId; });
        if (!sets.length) return null;
        var best = sets.reduce(function (m, x) { return Math.max(m, x.weight_kg || 0, x.seconds || 0, x.reps || 0); }, 0);
        return { date: s.started_at, best: best, sets: sets };
      }).filter(Boolean);
    },

    exportJSON: function () { return JSON.stringify({ app: 'scheda-homegym', version: 1, exported_at: nowIso(), sessions: S.sessions }, null, 2); },
    importJSON: function (text) {
      var o = JSON.parse(text), added = 0;
      if (!o || !Array.isArray(o.sessions)) throw new Error('Formato non valido');
      o.sessions.forEach(function (s) {
        if (!s.id || !s.sets) return;
        var i = S.sessions.findIndex(function (x) { return x.id === s.id; });
        if (i < 0) { S.sessions.push(s); Store.queue(s.id, 'upsert'); added++; }
      });
      save(); emit(); Cloud.sync();
      return added;
    }
  };

  /* ---------- Supabase ---------- */
  var client = null, sdkPromise = null;
  var C = { status: 'local', user: null, error: '', busy: false };
  function cfg() { return window.SG_CONFIG || {}; }

  var Cloud = {
    info: C,
    configured: function () { return !!(cfg().supabaseUrl && cfg().supabaseAnonKey); },
    loadSdk: function () {
      if (window.supabase) return Promise.resolve();
      if (sdkPromise) return sdkPromise;
      sdkPromise = new Promise(function (res, rej) {
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
        s.onload = res; s.onerror = function () { sdkPromise = null; rej(new Error('Libreria Supabase non raggiungibile (sei offline?)')); };
        document.head.appendChild(s);
      });
      return sdkPromise;
    },
    init: function () {
      if (!Cloud.configured()) { C.status = 'local'; return Promise.resolve(); }
      C.status = 'signedout';
      return Cloud.loadSdk().then(function () {
        client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } });
        return client.auth.getSession();
      }).then(function (r) {
        var u = r.data && r.data.session && r.data.session.user;
        if (u) { C.user = u; C.status = 'online'; return Cloud.sync(); }
      }).catch(function (e) { C.error = e.message; C.status = 'offline'; }).then(emit);
    },
    signUp: function (email, pw) { return Cloud.auth('signUp', email, pw); },
    signIn: function (email, pw) { return Cloud.auth('signInWithPassword', email, pw); },
    auth: function (fn, email, pw) {
      C.error = ''; C.busy = true; emit();
      return Cloud.loadSdk().then(function () {
        if (!client) client = window.supabase.createClient(cfg().supabaseUrl, cfg().supabaseAnonKey);
        return client.auth[fn]({ email: email, password: pw });
      }).then(function (r) {
        if (r.error) throw r.error;
        var u = r.data && r.data.session && r.data.user;
        if (!r.data.session) { C.error = 'Controlla la mail per confermare l’account, poi accedi.'; return; }
        C.user = u; C.status = 'online'; C.busy = false; // sync() ignora le chiamate mentre busy è attivo
        return Cloud.sync();
      }).catch(function (e) { C.error = e.message || String(e); }).then(function () { C.busy = false; emit(); });
    },
    signOut: function () {
      if (!client) return Promise.resolve();
      return client.auth.signOut().then(function () { C.user = null; C.status = 'signedout'; emit(); });
    },

    sync: function () {
      if (!client || !C.user || C.busy) return Promise.resolve();
      C.busy = true; C.error = ''; emit();
      var pend = S.pending.slice();
      return pend.reduce(function (p, q) {
        return p.then(function () {
          if (q.op === 'delete') return client.from('workout_sessions').delete().eq('id', q.id).then(chk);
          var s = S.sessions.filter(function (x) { return x.id === q.id; })[0];
          if (!s) return null;
          return client.from('workout_sessions').upsert({ id: s.id, plan_day: s.plan_day, started_at: s.started_at, ended_at: s.ended_at, notes: s.notes, knee_pain: s.knee_pain, updated_at: s.updated_at }).then(chk)
            .then(function () { return client.from('set_logs').delete().eq('session_id', s.id); }).then(chk)
            .then(function () {
              if (!s.sets.length) return null;
              return client.from('set_logs').insert(s.sets.map(function (x) { return { id: x.id, session_id: s.id, exercise_id: x.exercise_id, set_no: x.set_no, weight_kg: x.weight_kg, reps: x.reps, seconds: x.seconds }; })).then(chk);
            });
        }).then(function () { S.pending = S.pending.filter(function (x) { return x.id !== q.id; }); save(); });
      }, Promise.resolve()).then(function () {
        return Promise.all([client.from('workout_sessions').select('*'), client.from('set_logs').select('*')]);
      }).then(function (rs) {
        chk(rs[0]); chk(rs[1]);
        var remote = rs[0].data || [], logs = rs[1].data || [], ids = {};
        remote.forEach(function (r) {
          ids[r.id] = 1;
          var mine = S.sessions.filter(function (x) { return x.id === r.id; })[0];
          if (mine && S.pending.some(function (p) { return p.id === r.id; })) return;
          if (mine && mine.updated_at >= r.updated_at) return;
          var sets = logs.filter(function (l) { return l.session_id === r.id; }).sort(function (a, b) { return a.set_no - b.set_no; }).map(function (l) { return { id: l.id, exercise_id: l.exercise_id, set_no: l.set_no, weight_kg: l.weight_kg == null ? null : Number(l.weight_kg), reps: l.reps, seconds: l.seconds }; });
          var ns = { id: r.id, plan_day: r.plan_day, started_at: r.started_at, ended_at: r.ended_at, notes: r.notes || '', knee_pain: r.knee_pain, updated_at: r.updated_at, sets: sets };
          if (mine) S.sessions[S.sessions.indexOf(mine)] = ns; else S.sessions.push(ns);
        });
        S.sessions = S.sessions.filter(function (x) { return ids[x.id] || S.pending.some(function (p) { return p.id === x.id; }); });
        S.lastSync = nowIso(); save();
      }).catch(function (e) { C.error = e.message || String(e); C.status = navigator.onLine ? 'online' : 'offline'; })
        .then(function () { C.busy = false; emit(); });
    }
  };
  function chk(r) { if (r && r.error) throw r.error; return r; }

  window.addEventListener('online', function () { Cloud.sync(); });

  load();
  SG.Store = Store; SG.Cloud = Cloud;
})();
