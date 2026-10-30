(function () {
  var SG = window.SG, Store = SG.Store, Cloud = SG.Cloud, S = Store.state;
  var app = document.getElementById('app');

  /* ---------- utilità ---------- */
  function h(tag, props) {
    var el = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2);
    for (var k in props || {}) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    (function add(list) { list.forEach(function (c) { if (c == null || c === false) return; if (Array.isArray(c)) return add(c); el.appendChild(c.nodeType ? c : document.createTextNode(String(c))); }); })(kids);
    return el;
  }
  var ICONS = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 21V5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    play: '<path d="M7 4v16l13-8z" fill="currentColor"/>',
    pause: '<path d="M7 4v16M17 4v16" stroke-width="4"/>',
    check: '<path d="M5 12.5l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'
  };
  function ico(n) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'ico'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = ICONS[n]; return s; }
  var MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  var GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  function fmtDate(iso) { var d = new Date(iso); return GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()]; }
  function fmtKg(n) { return n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ','); }
  function mins(a, b) { return Math.max(1, Math.round((new Date(b) - new Date(a)) / 60000)); }
  function dayOf(key) { return SG.PLAN.filter(function (d) { return d.key === key; })[0]; }
  function toast(msg) { var t = h('div', { class: 'toast', role: 'status' }, msg); document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200); }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  function twoTap(btn, label, fn) {
    var armed = false, orig = btn.textContent, tm;
    btn.addEventListener('click', function () {
      if (armed) { clearTimeout(tm); fn(); return; }
      armed = true; btn.textContent = label; tm = setTimeout(function () { armed = false; btn.textContent = orig; }, 3200);
    });
  }
  function weekStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); var wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x; }

  /* ---------- tema ---------- */
  function applyTheme() { var t = S.settings.theme; if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t); }

  /* ---------- router ---------- */
  var VIEWS = { oggi: viewHome, scheda: viewPlan, storico: viewHistory, profilo: viewProfile, seduta: viewWorkout };
  var cleanup = null;
  function route() { var r = (location.hash || '').replace('#', ''); if (!VIEWS[r]) r = 'oggi'; if (r === 'seduta' && !S.active) r = 'oggi'; return r; }
  function go(r) { if (location.hash === '#' + r) render(); else location.hash = r; }
  function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    var r = route(), y = window.scrollY;
    app.innerHTML = '';
    var view = VIEWS[r]();
    app.appendChild(view);
    app.appendChild(navBar(r));
    window.scrollTo(0, r === lastRoute ? y : 0); lastRoute = r;
    renderRest();
  }
  var lastRoute = '';
  window.addEventListener('hashchange', render);

  function navBar(cur) {
    var tabs = [['oggi', 'Allenati', 'home'], ['scheda', 'Scheda', 'book'], ['storico', 'Storico', 'clock'], ['profilo', 'Impostazioni', 'gear']];
    var active = cur === 'seduta' ? 'oggi' : cur;
    return h('nav', { class: 'nav', 'aria-label': 'Navigazione principale' }, h('div', { class: 'nav-in' }, tabs.map(function (t) {
      return h('button', { type: 'button', 'aria-current': t[0] === active ? 'page' : null, onclick: function () { go(t[0]); } }, ico(t[2]), t[1]);
    })));
  }
  function syncPill() {
    var c = Cloud.info, txt = 'Locale', cls = '';
    if (c.status === 'online') { txt = c.busy ? 'Sincronizzo…' : 'Sincronizzato'; cls = 'on'; }
    else if (c.status === 'signedout') txt = 'Non connesso';
    else if (c.status === 'offline') { txt = 'Offline'; cls = 'err'; }
    return h('span', { class: 'pill ' + cls }, h('i'), txt);
  }
  function top(title, sub) { return h('header', { class: 'top' }, h('div', null, h('h1', null, title), sub ? h('p', { class: 'sub' }, sub) : null), syncPill()); }

  /* ---------- immagine/animazione ---------- */
  function thumb(exId) { return h('div', { class: 'thumb' }, SG.Figure.thumb(exId)); }

  /* ---------- gruppi muscolari ---------- */
  function exChips(exId) {
    var m = SG.EXERCISES[exId].muscles || { main: [], also: [] };
    return m.main.map(function (g) { return h('span', { class: 'mc ' + (SG.MUSCLES.some(function (x) { return x.id === g; }) ? 'main' : 'extra') }, SG.muscleLabel(g)); })
      .concat(m.also.map(function (g) { return h('span', { class: 'mc also' }, '+ ' + SG.muscleLabel(g)); }));
  }
  function dayChips(day) {
    var m = SG.dayMuscles(day), out = [];
    SG.MUSCLES.forEach(function (g) {
      if (m[g.id].main) out.push(h('span', { class: 'mc main' }, g.label + ' · ' + m[g.id].main + ' serie'));
      else if (m[g.id].also) out.push(h('span', { class: 'mc also' }, g.label + ' · indiretto'));
    });
    SG.EXTRA.forEach(function (g) { if (m[g.id].main) out.push(h('span', { class: 'mc extra' }, g.label + ' · ' + m[g.id].main + ' serie')); });
    return h('div', { class: 'mchips' }, out);
  }
  function weekTable() {
    var ms = SG.PLAN.map(SG.dayMuscles), head = h('tr', null, h('th', null, 'Gruppo'), SG.PLAN.map(function (d) { return h('th', null, d.key.toUpperCase()); }), h('th', null, 'Tot.'));
    var rows = SG.MUSCLES.map(function (g) {
      var tot = 0;
      return h('tr', null, h('th', { scope: 'row' }, g.label), ms.map(function (m) { tot += m[g.id].main; return h('td', { class: m[g.id].main ? 'on' : '' }, m[g.id].main ? String(m[g.id].main) : (m[g.id].also ? 'ind.' : '–')); }), h('td', { class: 'tot' }, String(tot)));
    });
    return h('div', { class: 'card stack', style: 'gap:10px' }, h('h2', null, 'Serie per gruppo muscolare'),
      h('div', { class: 'tscroll' }, h('table', { class: 'mtab' }, h('thead', null, head), h('tbody', null, rows))),
      h('p', { class: 'sub', style: 'margin:0' }, 'Serie dirette per seduta. «ind.» = il gruppo lavora solo come aiuto in altri esercizi.'));
  }

  /* ---------- Oggi ---------- */
  function viewHome() {
    var now = new Date(), nextKey = Store.nextKey(), day = dayOf(nextKey), ss = Store.sessions();
    var ws = weekStart(now), doneKeys = {};
    ss.forEach(function (s) { if (new Date(s.started_at) >= ws) doneKeys[s.plan_day] = true; });
    var datestr = GIORNI[now.getDay()] + ' ' + now.getDate() + ' ' + MESI[now.getMonth()];
    var wrap = h('div', { class: 'stack' }, top('Oggi', datestr));

    if (S.active) {
      var ad = dayOf(S.active.plan_day), pr = Store.activeProgress();
      wrap.appendChild(h('div', { class: 'card hero' }, h('div', { class: 'big' }, ad.key.toUpperCase()), h('div', null, h('span', { class: 'label' }, 'Seduta in corso'), h('h2', null, ad.title)), h('p', null, pr.done + ' di ' + pr.total + ' serie completate'), dayChips(ad),
        h('button', { class: 'btn', type: 'button', onclick: function () { go('seduta'); } }, 'Riprendi la seduta', ico('arrow'))));
    } else {
      wrap.appendChild(h('div', { class: 'card hero' }, h('div', { class: 'big' }, day.key.toUpperCase()), h('div', null, h('span', { class: 'label' }, 'Prossima seduta'), h('h2', null, day.title)), h('p', null, day.focus + ' · ' + day.items.length + ' esercizi · circa ' + day.minutes + ' min'), dayChips(day),
        h('button', { class: 'btn', type: 'button', onclick: function () { Store.startWorkout(day.key); go('seduta'); } }, 'Inizia la seduta', ico('arrow'))));
    }

    var plan = { 1: ['Padel', 'p'], 2: ['A', 'a'], 3: ['Prep.', 'p'], 4: ['B', 'b'], 5: ['—', ''], 6: ['C', 'c'], 0: ['—', ''] };
    var order = [1, 2, 3, 4, 5, 6, 0], names = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    wrap.appendChild(h('div', { class: 'card' }, h('div', { class: 'section-title', style: 'margin:0 0 10px' }, h('h2', null, 'Questa settimana'), h('span', { class: 'label' }, Object.keys(doneKeys).length + '/3')),
      h('div', { class: 'week' }, order.map(function (wd, i) {
        var pl = plan[wd], isSes = 'abc'.indexOf(pl[1]) >= 0 && pl[1] !== '';
        var cls = 'day' + (isSes ? ' plan' : '') + (now.getDay() === wd ? ' today' : '') + (isSes && doneKeys[pl[1]] ? ' done' : '');
        return h('div', { class: cls }, names[i], h('b', null, pl[0]));
      }))));

    wrap.appendChild(h('div', { class: 'section-title' }, h('h2', null, 'Scegli un’altra seduta')));
    wrap.appendChild(h('div', { class: 'chips' }, SG.PLAN.map(function (d) {
      return h('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', disabled: S.active ? true : null, onclick: function () { Store.startWorkout(d.key); go('seduta'); } }, d.title + ' · ' + d.weekday);
    })));

    wrap.appendChild(h('div', { class: 'section-title' }, h('h2', null, 'Ultime sedute')));
    if (!ss.length) wrap.appendChild(h('div', { class: 'card empty' }, 'Qui compariranno le sedute completate, con i carichi usati.'));
    else wrap.appendChild(h('div', { class: 'list' }, ss.slice(0, 3).map(sessionRow)));
    return wrap;
  }

  function sessionRow(s) {
    var d = dayOf(s.plan_day), vol = 0;
    s.sets.forEach(function (x) { vol += (x.weight_kg || 0) * (x.reps || 0); });
    return h('button', { class: 'row', type: 'button', onclick: function () { openSession(s); } }, h('div', { class: 'badge' }, d.key.toUpperCase()),
      h('div', { class: 'txt' }, h('div', { class: 'nm' }, d.title + ' · ' + fmtDate(s.started_at)), h('div', { class: 'meta' }, s.sets.length + ' serie · ' + mins(s.started_at, s.ended_at) + ' min' + (vol ? ' · ' + Math.round(vol) + ' kg tot.' : ''))));
  }

  /* ---------- Scheda ---------- */
  function viewPlan() {
    var wrap = h('div', { class: 'stack' }, top('Scheda', 'Tocca un esercizio per vedere come si esegue'), weekTable());
    SG.PLAN.forEach(function (d) {
      wrap.appendChild(h('div', { class: 'section-title' }, h('h2', null, d.title), h('span', { class: 'label' }, d.weekday)));
      wrap.appendChild(h('p', { class: 'sub', style: 'margin:-8px 2px 0' }, d.focus));
      wrap.appendChild(dayChips(d));
      wrap.appendChild(h('div', { class: 'list' }, d.items.map(function (it) {
        var ex = SG.EXERCISES[it.ex];
        return h('button', { class: 'row', type: 'button', onclick: function () { openExercise(it.ex, null, it); } }, thumb(it.ex),
          h('div', { class: 'txt' }, h('div', { class: 'nm' }, ex.name), h('div', { class: 'meta' }, it.sets + ' × ' + it.reps + ' · rec. ' + it.rest + '"'), h('div', { class: 'mchips sm' }, exChips(it.ex))));
      })));
    });
    return wrap;
  }

  /* ---------- Seduta attiva ---------- */
  function viewWorkout() {
    var a = S.active, day = dayOf(a.plan_day), pr = Store.activeProgress();
    var wrap = h('div', { class: 'stack' });
    var timer = h('span', { class: 'timer' }, '0:00');
    var bar = h('i'); bar.style.width = (pr.total ? (100 * pr.done / pr.total) : 0) + '%';
    wrap.appendChild(h('div', { class: 'wbar' }, h('div', { class: 'grow' }, h('h1', null, day.title), h('div', { class: 'bar', style: 'margin-top:8px' }, bar)), h('div', { style: 'text-align:right' }, timer, h('div', { class: 'timer' }, pr.done + '/' + pr.total + ' serie'))));
    wrap.appendChild(dayChips(day));
    function tick() { var s = Math.floor((Date.now() - new Date(a.started_at)) / 1000); timer.textContent = Math.floor(s / 3600) ? Math.floor(s / 3600) + ':' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2) : Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
    tick(); var iv = setInterval(tick, 1000);
    requestWake();
    cleanup = function () { clearInterval(iv); };

    wrap.appendChild(h('div', { class: 'list' }, day.items.map(function (it) {
      var sets = a.sets[it.ex] || [], done = sets.filter(function (s) { return s.done; }).length, ex = SG.EXERCISES[it.ex];
      return h('button', { class: 'row' + (done === sets.length && sets.length ? ' done' : ''), type: 'button', onclick: function () { openExercise(it.ex, day.key, it); } }, thumb(it.ex),
        h('div', { class: 'txt' }, h('div', { class: 'nm' }, ex.name), h('div', { class: 'meta' }, it.sets + ' × ' + it.reps + ' · rec. ' + it.rest + '"'), h('div', { class: 'mchips sm' }, exChips(it.ex))),
        h('div', { class: 'st' }, done === sets.length && sets.length ? ico('check') : done + '/' + sets.length));
    })));
    var fin = h('button', { class: 'btn primary block', type: 'button', onclick: openFinish }, 'Termina la seduta');
    var disc = h('button', { class: 'btn ghost danger block', type: 'button' }, 'Annulla la seduta');
    twoTap(disc, 'Tocca di nuovo per annullare', function () { Store.discardWorkout(); stopRest(); go('oggi'); });
    wrap.appendChild(fin); wrap.appendChild(disc);
    return wrap;
  }
  var wakeLock = null;
  function requestWake() { try { if (S.settings.wake && navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {}); } catch (e) {} }

  /* ---------- timer di recupero ---------- */
  var rest = null, restEl = null, restIv = null;
  function startRest(sec) { if (!S.settings.rest) return; rest = { end: Date.now() + sec * 1000 }; renderRest(); clearInterval(restIv); restIv = setInterval(renderRest, 250); }
  function stopRest() { rest = null; clearInterval(restIv); if (restEl) { restEl.remove(); restEl = null; } }
  function beep() { try { var c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.value = 0.15; o.start(); o.stop(c.currentTime + 0.25); } catch (e) {} buzz([200, 100, 200]); }
  function renderRest() {
    if (!rest) return;
    var left = Math.ceil((rest.end - Date.now()) / 1000);
    if (left <= 0) { beep(); stopRest(); return; }
    if (!restEl) {
      restEl = h('div', { class: 'rest', role: 'timer' }, h('div', { class: 't' }, h('span', { class: 'l' }, 'Recupero'), h('span', { id: 'rest-t' }, '')),
        h('button', { type: 'button', onclick: function () { rest.end += 15000; renderRest(); } }, '+15 s'), h('button', { type: 'button', onclick: stopRest }, 'Salta'));
      document.body.appendChild(restEl);
    }
    restEl.querySelector('#rest-t').textContent = Math.floor(left / 60) + ':' + ('0' + left % 60).slice(-2);
  }

  /* ---------- sheet ---------- */
  var sheetCtl = null;
  function openSheet(titleText, bodyKids, footer, onClose) {
    closeSheet();
    var scrim = h('div', { class: 'scrim', onclick: closeSheet });
    var body = h('div', { class: 'sheet-b' }, bodyKids);
    var sheet = h('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': titleText },
      h('div', { class: 'sheet-h' }, h('h2', null, titleText), h('button', { class: 'x', type: 'button', 'aria-label': 'Chiudi', onclick: closeSheet }, ico('x'))), body, footer ? h('div', { class: 'sheet-f' }, footer) : null);
    document.body.appendChild(scrim); document.body.appendChild(sheet);
    document.body.style.overflow = 'hidden'; document.body.classList.add('has-sheet');
    sheetCtl = { scrim: scrim, sheet: sheet, onClose: onClose };
    return body;
  }
  function closeSheet() {
    if (!sheetCtl) return;
    var c = sheetCtl; sheetCtl = null;
    c.scrim.remove(); c.sheet.remove(); document.body.style.overflow = ''; document.body.classList.remove('has-sheet');
    if (c.onClose) c.onClose();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });

  function videoBlock(exId) {
    var stage = h('div', { class: 'stage' }), v = SG.VIDEOS[exId];
    if (v && v.youtube) { stage.appendChild(h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + v.youtube, title: SG.exName(exId), allowfullscreen: true, loading: 'lazy' })); return stage; }
    if (v && v.mp4) { stage.appendChild(h('video', { src: v.mp4, controls: true, playsinline: true, loop: true, muted: true })); return stage; }
    var cap = h('div', { class: 'cap', 'aria-live': 'off' }, '');
    var ctl = SG.Figure.mount(stage, exId, function (t) { cap.textContent = t; });
    var pbtn = h('button', { type: 'button', 'aria-label': 'Pausa o riprendi', onclick: function () { var p = ctl.toggle(); pbtn.innerHTML = ''; pbtn.appendChild(ico(p ? 'pause' : 'play')); } }, ico(ctl.isPlaying() ? 'pause' : 'play'));
    var speed = 1, sbtn = h('button', { type: 'button', 'aria-label': 'Velocità', onclick: function () { speed = speed === 1 ? 0.5 : 1; ctl.setSpeed(speed); sbtn.textContent = speed === 1 ? '1×' : '½×'; } }, '1×');
    stage.appendChild(cap); stage.appendChild(h('div', { class: 'ctl' }, sbtn, pbtn));
    return stage;
  }

  function cuesBlock(ex) {
    return [h('div', null, h('div', { class: 'label', style: 'margin-bottom:8px' }, 'Come si esegue'), h('ol', { class: 'cues' }, ex.cues.map(function (c) { return h('li', null, c); }))), ex.knee ? h('div', { class: 'note' }, h('b', null, 'Ginocchio. '), ex.knee) : null];
  }

  function openExercise(exId, dayKey, item) {
    var ex = SG.EXERCISES[exId], logging = dayKey && S.active && S.active.plan_day === dayKey, kids = [videoBlock(exId)];
    kids.push(h('div', { class: 'hint' }, h('span', null, item.sets + ' serie × ' + item.reps), h('span', null, '· recupero ' + item.rest + ' s')));
    kids.push(h('div', { class: 'mwhy' }, h('span', { class: 'label' }, 'Muscoli'), h('div', { class: 'mchips' }, exChips(exId)), h('span', { class: 'sub', style: 'font-size:12px' }, 'In arancione sulla figura i muscoli che lavorano. «+» = aiutano.')));
    if (logging) kids.push(setsBlock(exId, item));
    kids = kids.concat(cuesBlock(ex));
    openSheet(ex.name, kids, logging ? h('button', { class: 'btn primary block', type: 'button', onclick: closeSheet }, 'Fatto, torna alla lista') : null, function () { if (route() === 'seduta') render(); });
  }

  function setsBlock(exId, item) {
    var ex = SG.EXERCISES[exId], sets = S.active.sets[exId], box = h('div', { class: 'stack', style: 'gap:10px' });
    var last = Store.lastFor(exId), sug = Store.suggestion(exId, item.reps);
    var hint = h('div', { class: 'hint' });
    if (last) {
      var txt = last.sets.map(function (s) { return ex.kind === 'time' ? (s.seconds + ' s') : (s.weight_kg != null ? fmtKg(s.weight_kg) + '×' : '') + (s.reps != null ? s.reps : ''); }).join(' · ');
      hint.appendChild(h('span', null, 'Ultima volta (' + fmtDate(last.date) + '): ' + txt));
    } else hint.appendChild(h('span', null, 'Prima volta: scegli un carico leggero e annotalo.'));
    if (sug) hint.appendChild(h('button', { class: 'sug', type: 'button', onclick: function () { sets.forEach(function (s) { if (!s.done) s.kg = sug; }); Store.save(); redraw(); toast('Carico impostato a ' + fmtKg(sug) + ' kg'); } }, 'Sali a ' + fmtKg(sug) + ' kg'));
    box.appendChild(hint);
    var rows = h('div', { class: 'stack', style: 'gap:8px' });
    box.appendChild(rows);
    function field(unit, val, step, set, ph) {
      var inp = h('input', { type: 'text', inputmode: 'decimal', value: val === '' ? '' : String(val).replace('.', ','), placeholder: ph || '', 'aria-label': unit });
      inp.addEventListener('input', function () { var v = inp.value.replace(',', '.').trim(); var n = v === '' ? '' : parseFloat(v); set(isNaN(n) ? '' : n); Store.save(); });
      var minus = h('button', { type: 'button', 'aria-label': 'Meno', onclick: function () { var n = (parseFloat(String(inp.value).replace(',', '.')) || 0) - step; n = Math.max(0, Math.round(n * 100) / 100); inp.value = String(n).replace('.', ','); set(n); Store.save(); } }, '−');
      var plus = h('button', { type: 'button', 'aria-label': 'Più', onclick: function () { var n = (parseFloat(String(inp.value).replace(',', '.')) || 0) + step; n = Math.round(n * 100) / 100; inp.value = String(n).replace('.', ','); set(n); Store.save(); } }, '+');
      return h('div', { class: 'fld' }, minus, inp, plus);
    }
    function redraw() {
      rows.innerHTML = '';
      sets.forEach(function (s, i) {
        var t1 = ex.kind !== 'load';
        var row = h('div', { class: 'set' + (s.done ? ' done' : '') + (t1 ? ' t1' : '') }, h('div', { class: 'n' }, i + 1));
        if (ex.kind === 'load') { row.appendChild(field('kg', s.kg, S.settings.step, function (v) { s.kg = v; }, 'kg')); row.appendChild(field('rip', s.reps, 1, function (v) { s.reps = v; }, item.reps)); }
        else if (ex.kind === 'time') row.appendChild(field('sec', s.sec, 5, function (v) { s.sec = v; }, 'sec'));
        else row.appendChild(field('rip', s.reps, 1, function (v) { s.reps = v; }, item.reps));
        row.appendChild(h('button', { class: 'chk', type: 'button', 'aria-label': 'Serie completata', 'aria-pressed': s.done ? 'true' : 'false', onclick: function () {
          s.done = !s.done;
          if (s.done && ex.kind === 'load' && s.reps === '') s.reps = SG.repRange(item.reps)[0];
          Store.save();
          if (s.done) { buzz(30); if (i < sets.length - 1) startRest(item.rest); }
          else if (rest && i === sets.length - 1) stopRest();
          redraw();
        } }, ico('check')));
        rows.appendChild(row);
      });
    }
    redraw();
    box.appendChild(h('button', { class: 'addset', type: 'button', onclick: function () { var l = sets[sets.length - 1] || { kg: '', reps: '', sec: '' }; sets.push({ kg: l.kg, reps: '', sec: l.sec, done: false }); Store.save(); redraw(); } }, '+ Aggiungi una serie'));
    return box;
  }

  function openFinish() {
    var pr = Store.activeProgress(), pain = null, notes = h('textarea', { id: 'note', placeholder: 'Sensazioni, ginocchio, note per la prossima volta' });
    var seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Dolore al ginocchio da 0 a 10' });
    for (var i = 0; i <= 10; i++) (function (n) { var b = h('button', { type: 'button', 'aria-pressed': 'false', onclick: function () { pain = pain === n ? null : n; Array.prototype.forEach.call(seg.children, function (c, k) { c.setAttribute('aria-pressed', k === pain ? 'true' : 'false'); }); } }, String(n)); seg.appendChild(b); })(i);
    var kids = [h('div', { class: 'card' }, h('div', { class: 'stats' }, h('div', { class: 'stat' }, h('b', null, pr.done), h('span', null, 'serie fatte')), h('div', { class: 'stat' }, h('b', null, mins(S.active.started_at, new Date().toISOString())), h('span', null, 'minuti')), h('div', { class: 'stat' }, h('b', null, pr.total - pr.done), h('span', null, 'saltate')))),
      h('div', { class: 'field' }, h('label', { class: 'label' }, 'Ginocchio sinistro dopo la seduta (0 = nessun dolore)'), seg),
      h('div', { class: 'field' }, h('label', { class: 'label', for: 'note' }, 'Note'), notes)];
    var save = h('button', { class: 'btn primary block', type: 'button', onclick: function () {
      var s = Store.finishWorkout(pain, notes.value); stopRest(); closeSheet();
      if (wakeLock) { try { wakeLock.release(); } catch (e) {} wakeLock = null; }
      go('oggi'); toast(s && s.sets.length ? 'Seduta salvata' : 'Seduta salvata (nessuna serie)');
    } }, pr.done ? 'Salva la seduta' : 'Salva senza serie');
    openSheet('Fine seduta', kids, save);
  }

  /* ---------- Storico ---------- */
  var histEx = null;
  function viewHistory() {
    var ss = Store.sessions(), wrap = h('div', { class: 'stack' }, top('Storico', ss.length + (ss.length === 1 ? ' seduta registrata' : ' sedute registrate')));
    var withData = Object.keys(SG.EXERCISES).filter(function (k) { return Store.history(k).length; });
    if (withData.length) {
      if (!histEx || withData.indexOf(histEx) < 0) histEx = withData[0];
      var sel = h('select', { id: 'hx', 'aria-label': 'Esercizio', onchange: function () { histEx = sel.value; render(); } }, withData.map(function (k) { return h('option', { value: k, selected: k === histEx ? true : null }, SG.exName(k)); }));
      var ex = SG.EXERCISES[histEx], unit = ex.kind === 'load' ? 'kg' : ex.kind === 'time' ? 's' : 'rip';
      wrap.appendChild(h('div', { class: 'card stack', style: 'gap:10px' }, h('div', { class: 'label' }, 'Progressi (miglior valore per seduta)'), h('div', { class: 'field' }, sel), chart(Store.history(histEx), unit)));
    }
    if (!ss.length) wrap.appendChild(h('div', { class: 'card empty' }, 'Nessuna seduta ancora. Completa la prima e comparirà qui.'));
    var month = '';
    ss.forEach(function (s) {
      var d = new Date(s.started_at), m = MESI[d.getMonth()] + ' ' + d.getFullYear();
      if (m !== month) { month = m; wrap.appendChild(h('div', { class: 'section-title' }, h('h2', null, m))); }
      wrap.appendChild(sessionRow(s));
    });
    return wrap;
  }

  function chart(hist, unit) {
    var W = 320, H = 150, pl = 34, pr = 14, pt = 18, pb = 22;
    if (!hist.length) return h('div', { class: 'empty' }, 'Nessun dato');
    var vals = hist.map(function (x) { return x.best; }), mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mn === mx) { mn = Math.max(0, mn - 1); mx = mx + 1; }
    var pad = (mx - mn) * 0.15; mn = Math.max(0, mn - pad); mx += pad;
    var X = function (i) { return hist.length === 1 ? (pl + (W - pl - pr) / 2) : pl + (i * (W - pl - pr)) / (hist.length - 1); };
    var Y = function (v) { return pt + (1 - (v - mn) / (mx - mn)) * (H - pt - pb); };
    var NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + W + ' ' + H); s.setAttribute('class', 'chart'); s.setAttribute('role', 'img');
    s.setAttribute('aria-label', 'Andamento: da ' + fmtKg(vals[0]) + ' a ' + fmtKg(vals[vals.length - 1]) + ' ' + unit + ' in ' + hist.length + ' sedute');
    var g = '';
    [0, 0.5, 1].forEach(function (f) { var v = mn + (mx - mn) * f, y = Y(v); g += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + fmtKg(Math.round(v * 2) / 2) + '</text>'; });
    var pts = hist.map(function (x, i) { return X(i) + ',' + Y(x.best); }).join(' ');
    g += '<polyline class="ln" points="' + pts + '"/>';
    hist.forEach(function (x, i) { g += '<circle class="pt" cx="' + X(i) + '" cy="' + Y(x.best) + '" r="' + (i === hist.length - 1 ? 5 : 3.5) + '"><title>' + fmtDate(x.date) + ': ' + fmtKg(x.best) + ' ' + unit + '</title></circle>'; });
    var last = hist[hist.length - 1], lx = X(hist.length - 1);
    g += '<text class="endt" x="' + Math.min(lx, W - pr - 2) + '" y="' + (Y(last.best) - 10) + '" text-anchor="' + (lx > W - 40 ? 'end' : 'middle') + '">' + fmtKg(last.best) + ' ' + unit + '</text>';
    g += '<text x="' + pl + '" y="' + (H - 4) + '">' + fmtDate(hist[0].date) + '</text>';
    if (hist.length > 1) g += '<text x="' + (W - pr) + '" y="' + (H - 4) + '" text-anchor="end">' + fmtDate(last.date) + '</text>';
    s.innerHTML = g;
    return s;
  }

  function openSession(s) {
    var d = dayOf(s.plan_day), byEx = {}, order = [];
    s.sets.forEach(function (x) { if (!byEx[x.exercise_id]) { byEx[x.exercise_id] = []; order.push(x.exercise_id); } byEx[x.exercise_id].push(x); });
    var kids = [h('div', { class: 'hint' }, h('span', null, fmtDate(s.started_at) + ' · ' + mins(s.started_at, s.ended_at) + ' min'), s.knee_pain != null ? h('span', null, '· ginocchio ' + s.knee_pain + '/10') : null)];
    if (s.notes) kids.push(h('div', { class: 'note' }, s.notes));
    order.forEach(function (id) {
      var ex = SG.EXERCISES[id] || { kind: 'load' };
      kids.push(h('div', { class: 'card' }, h('h2', { style: 'font-size:17px;margin-bottom:6px' }, SG.exName(id)), byEx[id].map(function (x) {
        var v = ex.kind === 'time' ? x.seconds + ' s' : (x.weight_kg != null ? fmtKg(x.weight_kg) + ' kg × ' : '') + (x.reps != null ? x.reps : '');
        return h('div', { class: 'kv' }, h('span', null, 'Serie ' + x.set_no), h('span', null, v));
      })));
    });
    if (!order.length) kids.push(h('div', { class: 'empty' }, 'Nessuna serie registrata.'));
    var del = h('button', { class: 'btn ghost danger block', type: 'button' }, 'Elimina la seduta');
    twoTap(del, 'Tocca di nuovo per eliminare', function () { Store.deleteSession(s.id); closeSheet(); toast('Seduta eliminata'); });
    kids.push(del);
    openSheet(d.title + ' · ' + fmtDate(s.started_at), kids, null);
  }

  /* ---------- Impostazioni ---------- */
  function viewProfile() {
    var c = Cloud.info, wrap = h('div', { class: 'stack' }, top('Impostazioni'));

    var cloud = h('div', { class: 'card stack', style: 'gap:12px' }, h('h2', null, 'Database online'));
    if (!Cloud.configured()) {
      cloud.appendChild(h('p', { class: 'sub', style: 'margin:0' }, 'Al momento i dati sono salvati solo su questo dispositivo. Per averli anche online inserisci URL e chiave di Supabase in js/config.js (vedi README) e ricarica la pagina.'));
    } else if (c.user) {
      cloud.appendChild(h('div', { class: 'kv' }, h('span', null, 'Account'), h('span', null, c.user.email)));
      cloud.appendChild(h('div', { class: 'kv' }, h('span', null, 'Ultima sincronizzazione'), h('span', null, S.lastSync ? fmtDate(S.lastSync) + ' ' + new Date(S.lastSync).toTimeString().slice(0, 5) : '—')));
      cloud.appendChild(h('div', { class: 'kv' }, h('span', null, 'In attesa di invio'), h('span', null, String(S.pending.length))));
      if (c.error) cloud.appendChild(h('p', { class: 'err' }, c.error));
      cloud.appendChild(h('div', { class: 'chips' }, h('button', { class: 'btn primary sm', type: 'button', disabled: c.busy ? true : null, onclick: function () { Cloud.sync().then(function () { toast('Sincronizzato'); }); } }, 'Sincronizza ora'), h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { Cloud.signOut(); } }, 'Esci')));
    } else {
      var em = h('input', { type: 'email', id: 'em', autocomplete: 'email', placeholder: 'nome@esempio.it' }), pw = h('input', { type: 'password', id: 'pw', autocomplete: 'current-password', placeholder: 'Password (min. 6 caratteri)' });
      cloud.appendChild(h('div', { class: 'field' }, h('label', { class: 'label', for: 'em' }, 'Email'), em));
      cloud.appendChild(h('div', { class: 'field' }, h('label', { class: 'label', for: 'pw' }, 'Password'), pw));
      if (c.error) cloud.appendChild(h('p', { class: 'err' }, c.error));
      cloud.appendChild(h('div', { class: 'chips' }, h('button', { class: 'btn primary', type: 'button', disabled: c.busy ? true : null, onclick: function () { Cloud.signIn(em.value.trim(), pw.value); } }, 'Accedi'), h('button', { class: 'btn ghost', type: 'button', disabled: c.busy ? true : null, onclick: function () { Cloud.signUp(em.value.trim(), pw.value); } }, 'Crea account')));
    }
    wrap.appendChild(cloud);

    var pref = h('div', { class: 'card stack', style: 'gap:10px' }, h('h2', null, 'Preferenze'));
    pref.appendChild(h('div', { class: 'field' }, h('span', { class: 'label' }, 'Tema'), h('div', { class: 'chips' }, [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']].map(function (t) { return h('button', { class: 'chip', type: 'button', 'aria-pressed': S.settings.theme === t[0] ? 'true' : 'false', onclick: function () { S.settings.theme = t[0]; Store.save(); applyTheme(); render(); } }, t[1]); }))));
    pref.appendChild(h('div', { class: 'field' }, h('span', { class: 'label' }, 'Passo dei carichi'), h('div', { class: 'chips' }, [1, 1.25, 2.5, 5].map(function (n) { return h('button', { class: 'chip', type: 'button', 'aria-pressed': S.settings.step === n ? 'true' : 'false', onclick: function () { S.settings.step = n; Store.save(); render(); } }, fmtKg(n) + ' kg'); }))));
    function tog(label, key) { var b = h('button', { class: 'chip', type: 'button', 'aria-pressed': S.settings[key] ? 'true' : 'false', onclick: function () { S.settings[key] = !S.settings[key]; Store.save(); render(); } }, S.settings[key] ? 'Attivo' : 'Spento'); return h('div', { class: 'toggle' }, h('span', null, label), b); }
    pref.appendChild(tog('Timer di recupero automatico', 'rest')); pref.appendChild(tog('Schermo sempre acceso in seduta', 'wake'));
    wrap.appendChild(pref);

    var json = h('textarea', { id: 'bk', placeholder: 'Incolla qui un backup JSON per importarlo' });
    var bk = h('div', { class: 'card stack', style: 'gap:10px' }, h('h2', null, 'Backup'), h('p', { class: 'sub', style: 'margin:0' }, 'Esporta tutte le sedute in un file JSON o importale su un altro dispositivo.'),
      h('div', { class: 'chips' },
        h('button', { class: 'btn sm', type: 'button', onclick: function () { try { var blob = new Blob([Store.exportJSON()], { type: 'application/json' }), a = h('a', { href: URL.createObjectURL(blob), download: 'scheda-homegym-backup.json' }); document.body.appendChild(a); a.click(); a.remove(); toast('Backup scaricato'); } catch (e) { toast('Download non disponibile'); } } }, 'Scarica backup'),
        h('button', { class: 'btn sm', type: 'button', onclick: function () { var t = Store.exportJSON(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () { toast('Backup copiato'); }, function () { json.value = t; json.select(); toast('Copia il testo selezionato'); }); } }, 'Copia backup')),
      h('div', { class: 'field' }, json),
      h('button', { class: 'btn ghost sm', type: 'button', onclick: function () { try { var n = Store.importJSON(json.value); json.value = ''; toast(n + ' sedute importate'); render(); } catch (e) { toast('Backup non valido'); } } }, 'Importa'));
    wrap.appendChild(bk);
    wrap.appendChild(h('p', { class: 'sub', style: 'text-align:center' }, 'Scheda Home Gym · le animazioni sono schematiche, non filmati reali.'));
    return wrap;
  }

  /* ---------- avvio ---------- */
  Store.on(function () { if (!sheetCtl) render(); });
  applyTheme();
  render();
  Cloud.init();
  try { if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {}
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible' && S.active) requestWake(); });
})();
