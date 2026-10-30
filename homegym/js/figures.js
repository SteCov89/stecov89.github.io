/* Animazioni degli esercizi: omino schematico a scheletro, disegnato in SVG.
   Ogni esercizio definisce pose (angoli in gradi) e una sequenza di keyframe. */
(function () {
  var SG = (window.SG = window.SG || {});
  var L = { thigh: 52, shin: 50, torso: 62, ua: 36, fa: 34, neck: 19, foot: 15, head: 10.5 };
  var FLOOR = 212, VW = 320, VH = 230, AY = 207;
  var R = function (d) { return (d * Math.PI) / 180; };
  var vec = function (l, d) { return [l * Math.cos(R(d)), l * Math.sin(R(d))]; };
  var add = function (a, b) { return [a[0] + b[0], a[1] + b[1]]; };
  var sub = function (a, b) { return [a[0] - b[0], a[1] - b[1]]; };
  var fx = function (n) { return Math.round(n * 10) / 10; };
  var ease = function (t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); };

  var ln = function (a, b, c, w) { return '<line x1="' + fx(a[0]) + '" y1="' + fx(a[1]) + '" x2="' + fx(b[0]) + '" y2="' + fx(b[1]) + '" class="' + c + '"' + (w ? ' stroke-width="' + w + '"' : '') + '/>'; };
  var ci = function (c, r, k) { return '<circle cx="' + fx(c[0]) + '" cy="' + fx(c[1]) + '" r="' + r + '" class="' + k + '"/>'; };
  var rc = function (x, y, w, h, k) { return '<rect x="' + fx(x) + '" y="' + fx(y) + '" width="' + fx(w) + '" height="' + fx(h) + '" rx="2" class="' + k + '"/>'; };
  var plate = function (c, r) { return ci(c, r || 14, 'plate') + ci(c, 2.5, 'eqf'); };
  var dumb = function (c) { return ci(c, 7.5, 'eqf'); };

  /* ---------- risoluzione dello scheletro ---------- */
  function ik2(a, tgt, l1, l2, bend) {
    var dx = tgt[0] - a[0], dy = tgt[1] - a[1];
    var d = Math.hypot(dx, dy);
    d = Math.max(Math.abs(l1 - l2) + 0.01, Math.min(l1 + l2 - 0.01, d));
    var base = Math.atan2(dy, dx);
    var c = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
    var A = Math.acos(Math.max(-1, Math.min(1, c)));
    var ang = base + bend * A;
    var mid = [a[0] + l1 * Math.cos(ang), a[1] + l1 * Math.sin(ang)];
    var ux = tgt[0] - mid[0], uy = tgt[1] - mid[1], ul = Math.hypot(ux, uy) || 1;
    return [mid, [mid[0] + (l2 * ux) / ul, mid[1] + (l2 * uy) / ul]];
  }

  function solve(ex, p) {
    var J = {};
    J.hip = [0, 0];
    J.sho = vec(L.torso, p.to);
    J.knee = vec(L.thigh, p.th);
    J.ankle = add(J.knee, vec(L.shin, p.sh));
    J.elb = add(J.sho, vec(L.ua, p.ua));
    J.wri = add(J.elb, vec(L.fa, p.fa));
    J.head = add(J.sho, vec(L.neck, p.ne));
    if (p.th2 != null) { J.knee2 = vec(L.thigh, p.th2); J.ankle2 = add(J.knee2, vec(L.shin, p.sh2)); }
    if (p.ua2 != null) { J.elb2 = add(J.sho, vec(L.ua, p.ua2)); J.wri2 = add(J.elb2, vec(L.fa, p.fa2)); }
    var o = sub(ex.anchor.pos, J[ex.anchor.j]);
    Object.keys(J).forEach(function (k) { J[k] = add(J[k], o); });
    if (ex.legIK) {
      var r = ik2(J.hip, ex.legIK.target, L.thigh, L.shin, ex.legIK.bend);
      J.knee = r[0]; J.ankle = r[1];
    }
    if (ex.armIK) {
      var t = add(J[ex.armIK.to], ex.armIK.off);
      var r2 = ik2(J.sho, t, L.ua, L.fa, ex.armIK.bend);
      J.elb = r2[0]; J.wri = r2[1];
    }
    J.toe = add(J.ankle, vec(L.foot, p.ft == null ? 0 : p.ft));
    if (J.ankle2) J.toe2 = add(J.ankle2, vec(L.foot, p.ft == null ? 0 : p.ft));
    return J;
  }

  /* ---------- figura umana: pelle, maglia, pantaloncini e scarpe ---------- */
  var unit = function (a) { var l = Math.hypot(a[0], a[1]) || 1; return [a[0] / l, a[1] / l]; };
  var mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; };
  var mad = function (a, d, k) { return [a[0] + d[0] * k, a[1] + d[1] * k]; };
  var P2 = function (p) { return fx(p[0]) + ' ' + fx(p[1]); };
  /* capsula rastremata tra due punti (arto) */
  function capD(a, b, ra, rb) {
    var d = unit(sub(b, a)), n = [-d[1], d[0]];
    var a1 = mad(a, n, ra), b1 = mad(b, n, rb), b2 = mad(b, n, -rb), a2 = mad(a, n, -ra);
    return 'M' + P2(a1) + 'L' + P2(b1) + 'A' + fx(rb) + ' ' + fx(rb) + ' 0 0 0 ' + P2(b2) + 'L' + P2(a2) + 'A' + fx(ra) + ' ' + fx(ra) + ' 0 0 0 ' + P2(a1) + 'Z';
  }
  function cirD(c, r) { return 'M' + P2([c[0] - r, c[1]]) + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z'; }
  /* gruppo di forme: prima il contorno unito, poi i riempimenti */
  function grp(S) {
    return '<g class="o">' + S.map(function (x) { return '<path d="' + x[0] + '"/>'; }).join('') + '</g>' + S.map(function (x) { return '<path d="' + x[0] + '" class="' + x[1] + '"/>'; }).join('');
  }
  function legShapes(hip, knee, ankle, toe, f, far) {
    var k = far ? '2' : '', inner = add(unit(sub(hip, knee)), unit(sub(ankle, knee)));
    var back = unit(mad(inner, f, -0.25));          // lato posteriore del polpaccio
    return [
      [capD(knee, ankle, 6.2, 4.2), 'sk' + k],
      [cirD(mad(mix(knee, ankle, 0.3), back, 2.4), 5.4), 'sk' + k],
      [capD(hip, knee, 8.8, 6.4), 'sk' + k],
      [capD(hip, mix(hip, knee, 0.6), 9.4, 8.2), 'sr' + k],
      [capD(ankle, toe, 4.8, 3.6), 'sh' + k],
      [cirD(mad(ankle, back, 1), 4.6), 'sh' + k]
    ];
  }
  function armShapes(sho, elb, wri, far) {
    var k = far ? '2' : '';
    return [
      [capD(mix(sho, elb, 0.3), elb, 4.7, 3.8), 'sk' + k],
      [capD(elb, wri, 3.8, 3.0), 'sk' + k],
      [cirD(mad(wri, unit(sub(wri, elb)), 1.5), 3.6), 'sk' + k],
      [capD(sho, mix(sho, elb, 0.42), 6.2, 5.4), 'sf' + k],
      [cirD(sho, 6.4), 'sf' + k]
    ];
  }
  function headShapes(c, u, f) {
    var r = L.head + 0.4, hc = unit(sub(u, f)), ang = Math.atan2(hc[1], hc[0]), da = 1.75;
    var p1 = [c[0] + r * Math.cos(ang - da), c[1] + r * Math.sin(ang - da)], p2 = [c[0] + r * Math.cos(ang + da), c[1] + r * Math.sin(ang + da)];
    var hair = 'M' + P2(p1) + 'A' + fx(r) + ' ' + fx(r) + ' 0 1 1 ' + P2(p2) + 'Q' + P2(mad(c, hc, -0.3 * r)) + ' ' + P2(p1) + 'Z';
    return [[cirD(c, L.head), 'sk'], [cirD(mad(c, f, L.head), 1.9), 'sk'], [hair, 'hr']];
  }
  /* muscoli che lavorano: sovrapposizione colorata semitrasparente */
  function overlay(J, f, hl) {
    var S = [];
    (hl || []).forEach(function (g) {
      if (g === 'pettorali') S.push(cirD(mad(mix(J.sho, J.hip, 0.3), f, 2.4), 7.2));
      else if (g === 'dorsali') S.push(capD(mad(mix(J.sho, J.hip, 0.12), f, -5.5), mad(mix(J.sho, J.hip, 0.72), f, -5.5), 4.2, 4.2));
      else if (g === 'bicipiti' || g === 'tricipiti') S.push(capD(mix(J.sho, J.elb, 0.3), mix(J.sho, J.elb, 0.92), 3.6, 3.2));
      else if (g === 'gambe') { S.push(capD(mix(J.hip, J.knee, 0.12), mix(J.hip, J.knee, 0.92), 7.4, 5.6)); S.push(capD(mix(J.knee, J.ankle, 0.15), mix(J.knee, J.ankle, 0.85), 4.8, 3.6)); }
      else if (g === 'spalle') S.push(cirD(J.sho, 5.8));
      else if (g === 'core') S.push(capD(mad(mix(J.hip, J.sho, 0.18), f, 2.5), mad(mix(J.hip, J.sho, 0.55), f, 2.5), 5.5, 5.5));
    });
    return S.map(function (d) { return '<path d="' + d + '" class="hl"/>'; }).join('');
  }
  function bodySvg(J, hl) {
    var t = unit(sub(J.sho, J.hip)), f = [-t[1], t[0]], u = unit(sub(J.head, J.sho)), s = '', far = [];
    if (J.knee2) far = far.concat(legShapes(J.hip, J.knee2, J.ankle2, J.toe2, f, true));
    if (J.elb2) far = far.concat(armShapes(J.sho, J.elb2, J.wri2, true));
    if (far.length) s += grp(far);
    s += grp([
      [capD(J.hip, J.sho, 9.2, 10.8), 'sf'],
      [cirD(mad(mix(J.sho, J.hip, 0.3), f, 2.4), 10.2), 'sf'],
      [cirD(mad(J.hip, f, -1.5), 9.6), 'sr'],
      [capD(J.sho, J.head, 3.7, 3.3), 'sk']
    ]);
    s += grp(legShapes(J.hip, J.knee, J.ankle, J.toe, f, false));
    s += grp(headShapes(J.head, u, f));
    var eye = mad(mad(J.head, f, L.head * 0.5), u, L.head * 0.15);
    s += '<circle cx="' + fx(eye[0]) + '" cy="' + fx(eye[1]) + '" r="1.1" class="ey"/>';
    s += grp(armShapes(J.sho, J.elb, J.wri, false));
    s += overlay(J, f, hl);
    return s;
  }

  /* ---------- definizioni degli esercizi ---------- */
  var STAND = { th: 90, sh: 90, to: -90, ne: -90, ua: 90, fa: 90, ft: 0 };
  function P(base, o) { var r = {}, k; for (k in base) r[k] = base[k]; for (k in o) r[k] = o[k]; return r; }
  var E = {};

  E.panca = {
    anchor: { j: 'hip', pos: [170, 170] },
    base: { th: -12, sh: 100, to: 180, ne: 185, ua: -90, fa: -90, ft: 0 },
    keys: [
      { p: {}, move: 1, hold: 0.5, cap: 'Spingi il bilanciere in alto' },
      { p: { ua: 45, fa: -90 }, move: 2.2, hold: 0.4, cap: 'Scendi controllando fino al petto' }
    ],
    scene: function (J) {
      var bt = J.hip[1] + 10, x0 = J.hip[0] - 92, x1 = J.hip[0] + 34, sx = J.hip[0] - 62;
      return { back: rc(x0, bt, x1 - x0, 8, 'eqf') + ln([x0 + 12, bt + 8], [x0 + 12, FLOOR], 'eq', 4) + ln([x1 - 12, bt + 8], [x1 - 12, FLOOR], 'eq', 4) + ln([x0 - 30, 96], [x0 - 30, FLOOR], 'eq', 4) + ln([x0 - 30, 104], [sx - 6, 104], 'eq', 4),
        front: plate(J.wri) };
    }
  };

  E.rematore = {
    anchor: { j: 'ankle', pos: [150, AY] },
    base: { th: 60, sh: 95, to: -38, ne: -55, ua: 100, fa: 100, ft: 0 },
    keys: [
      { p: {}, move: 1.3, hold: 0.3, cap: 'Scendi controllando, schiena neutra' },
      { p: { ua: 140 }, move: 1.1, hold: 0.5, cap: 'Tira il bilanciere verso l’ombelico, scapole unite' }
    ],
    scene: function (J) { return { back: '', front: plate(J.wri) }; }
  };

  E.stacco = {
    anchor: { j: 'ankle', pos: [150, AY] },
    base: STAND,
    keys: [
      { p: {}, move: 1.4, hold: 0.4, cap: 'Risali spingendo i fianchi in avanti' },
      { p: { th: 65, sh: 95, to: -30, ne: -50, ua: 105, fa: 105 }, move: 2, hold: 0.4, cap: 'Fianchi indietro, ginocchia morbide, schiena dritta' }
    ],
    scene: function (J) { return { back: '', front: plate(J.wri) }; }
  };

  E.spanish = {
    anchor: { j: 'ankle', pos: [130, AY] },
    base: STAND,
    keys: [
      { p: { ua: 20, fa: 10 }, move: 2.2, hold: 0.4, cap: 'Risali piano' },
      { p: { th: 40, sh: 90, to: -95, ne: -95, ua: 20, fa: 10 }, move: 2.4, hold: 5, cap: 'Mantieni 30-45 s, siediti all’indietro contro l’elastico' }
    ],
    scene: function (J) {
      var ky = J.knee[1];
      return { back: ln([268, 70], [268, FLOOR], 'eq', 5) + ln([268, ky], [J.knee[0] - 5, ky], 'cab', 3), front: ci([J.knee[0] - 5, ky], 3.5, 'eqf') };
    }
  };

  E.facepull = {
    anchor: { j: 'ankle', pos: [120, AY] },
    base: P(STAND, { to: -92, ne: -92, ua: -8, fa: -8 }),
    keys: [
      { p: {}, move: 1.5, hold: 0.4, cap: 'Braccia tese verso il cavo' },
      { p: { ua: 172, fa: -25 }, move: 1.2, hold: 0.7, cap: 'Tira verso il viso, gomiti alti e larghi' }
    ],
    scene: function (J) {
      var pu = [292, J.sho[1] - 4];
      return { back: ln([292, 18], [292, FLOOR], 'eq', 5), front: ln(J.wri, pu, 'cab', 2.5) + ci(pu, 6, 'plate') };
    }
  };

  E.plank = {
    anchor: { j: 'elb', pos: [205, 208] },
    base: { th: 170.9, sh: 170.9, to: -9.1, ne: -20, ua: 90, fa: 0, ft: 70 },
    keys: [
      { p: {}, move: 1.5, hold: 2, cap: 'Mantieni la linea retta per 30-45 s' },
      { p: { to: -8.4, th: 171.6, sh: 171.6, ne: -22 }, move: 1.5, hold: 2, cap: 'Glutei e addome contratti, non cedere sui lombari' }
    ],
    scene: function (J) { return { back: ln(J.toe, J.sho, 'guide', 1.5), front: '' }; }
  };

  E.lat = {
    anchor: { j: 'hip', pos: [150, 160] },
    base: { th: -5, sh: 90, to: -100, ne: -95, ua: -75, fa: -80, ft: 0 },
    keys: [
      { p: {}, move: 1.4, hold: 0.4, cap: 'Risali controllando, braccia quasi tese' },
      { p: { ua: 100, fa: -75 }, move: 1.3, hold: 0.6, cap: 'Porta la barra al petto, gomiti verso il basso' }
    ],
    scene: function (J) {
      var pu = [160, 16];
      var h = J.hip;
      return { back: ln([235, FLOOR], [235, 16], 'eq', 5) + ln([235, 16], [150, 16], 'eq', 5) + ci(pu, 6, 'plate') + rc(h[0] - 28, h[1] + 10, 64, 7, 'eqf') + ln([h[0] + 4, h[1] + 17], [h[0] + 4, FLOOR], 'eq', 4) + rc(h[0] + 24, h[1] - 16, 26, 6, 'eqf'),
        front: ln(pu, J.wri, 'cab', 2.5) + ci(J.wri, 5, 'eqf') };
    }
  };

  E.military = {
    z: 0.78,
    anchor: { j: 'ankle', pos: [140, AY] },
    base: STAND,
    keys: [
      { p: { ua: 75, fa: -85 }, move: 1.5, hold: 0.4, cap: 'Abbassa il bilanciere alle clavicole' },
      { p: { ua: -80, fa: -85 }, move: 1.1, hold: 0.5, cap: 'Spingi sopra la testa, glutei e addome contratti' }
    ],
    scene: function (J) { return { back: '', front: plate(J.wri) }; }
  };

  E.hipthrust = {
    anchor: { j: 'sho', pos: [100, 162] },
    legIK: { target: [205, 206], bend: -1 },
    armIK: { to: 'hip', off: [0, -6], bend: 1 },
    base: { th: 0, sh: 90, to: 215, ne: 195, ua: 0, fa: 0, ft: 0 },
    keys: [
      { p: {}, move: 1.5, hold: 0.3, cap: 'Scendi con i glutei, schiena sulla panca' },
      { p: { to: 182 }, move: 1.1, hold: 0.7, cap: 'Spingi con i talloni, stringi i glutei in alto' }
    ],
    scene: function (J) {
      return { back: rc(58, 172, 62, 8, 'eqf') + ln([68, 180], [68, FLOOR], 'eq', 4) + ln([110, 180], [110, FLOOR], 'eq', 4),
        front: plate([J.hip[0], J.hip[1] - 7]) };
    }
  };

  E.pulley = {
    anchor: { j: 'hip', pos: [100, 196] },
    base: { th: 5, sh: 5, to: -75, ne: -85, ua: -10, fa: -5, ft: -80 },
    keys: [
      { p: {}, move: 1.3, hold: 0.4, cap: 'Braccia tese, schiena dritta' },
      { p: { to: -92, ua: 155, fa: 5 }, move: 1.2, hold: 0.6, cap: 'Porta le mani all’addome, scapole unite' }
    ],
    scene: function (J) {
      var pu = [300, 150];
      return { back: ln([J.ankle[0] + 10, 176], [J.ankle[0] + 10, FLOOR], 'eq', 5) + ln([300, 120], [300, FLOOR], 'eq', 5),
        front: ln(J.wri, pu, 'cab', 2.5) + ci(pu, 6, 'plate') + ci(J.wri, 5, 'eqf') };
    }
  };

  E.curl = {
    anchor: { j: 'ankle', pos: [150, AY] },
    base: STAND,
    keys: [
      { p: { ua: 90, fa: 90 }, move: 1.8, hold: 0.3, cap: 'Scendi lento, senza dondolare' },
      { p: { ua: 86, fa: -50 }, move: 1.2, hold: 0.5, cap: 'Fletti il gomito, gomito fermo al fianco' }
    ],
    scene: function (J) { return { back: '', front: dumb(J.wri) }; }
  };

  E.pushdown = {
    anchor: { j: 'ankle', pos: [130, AY] },
    base: P(STAND, { th: 88, sh: 92, to: -84, ne: -86, ua: 90, fa: 0 }),
    keys: [
      { p: {}, move: 1.5, hold: 0.3, cap: 'Risali fino a 90° al gomito' },
      { p: { fa: 85 }, move: 1, hold: 0.5, cap: 'Estendi il gomito, gomiti fermi ai fianchi' }
    ],
    scene: function (J) {
      var pu = [188, 22];
      return { back: ln([188, FLOOR], [188, 22], 'eq', 5), front: ln(J.wri, pu, 'cab', 2.5) + ci(pu, 6, 'plate') + ci(J.wri, 4.5, 'eqf') };
    }
  };

  E.deadbug = {
    anchor: { j: 'hip', pos: [180, 201] },
    base: { th: -90, sh: 0, to: 180, ne: 185, ua: -90, fa: -90, ft: -45, th2: -90, sh2: 0, ua2: -90, fa2: -90 },
    keys: [
      { p: {}, move: 1.2, hold: 0.4, cap: 'Posizione base: braccia in alto, ginocchia a 90°' },
      { p: { ua: 180, fa: 180, th2: -4, sh2: -4 }, move: 2, hold: 0.5, cap: 'Estendi braccio e gamba opposti, lombari a terra' }
    ],
    scene: function () { return { back: rc(30, FLOOR - 3, 260, 5, 'eqf'), front: '' }; }
  };

  E.negative = {
    z: 0.88,
    anchor: { j: 'wri', pos: [150, 28] },
    base: { th: 70, sh: 190, to: -90, ne: -90, ua: 100, fa: -80, ft: 0 },
    keys: [
      { p: {}, move: 0.9, hold: 0.5, cap: 'Parti in alto (salta o usa un rialzo)' },
      { p: { ua: -90, fa: -90 }, move: 4, hold: 0.7, cap: 'Scendi in 4 secondi, controllando' }
    ],
    scene: function () { return { back: ln([212, FLOOR], [212, 28], 'eq', 5) + ln([212, 28], [150, 28], 'eq', 5), front: ci([150, 28], 5, 'plate') }; }
  };

  E.squat = {
    anchor: { j: 'ankle', pos: [150, AY] },
    base: STAND,
    keys: [
      { p: {}, move: 1.2, hold: 0.4, cap: 'Risali spingendo sui talloni' },
      { p: { th: 30, sh: 100, to: -55, ne: -65, ua: 120, fa: -60 }, move: 2.2, hold: 1, cap: 'Scendi fino a dove non senti dolore, pausa di 1 s' }
    ],
    scene: function (J) { return { back: ln([48, 30], [48, FLOOR], 'eq', 5), front: plate([J.sho[0] - 3, J.sho[1] - 3], 13) }; }
  };

  E.inclinata = {
    anchor: { j: 'hip', pos: [160, 168] },
    base: { th: -10, sh: 100, to: 220, ne: 225, ua: -55, fa: -60, ft: 0 },
    keys: [
      { p: {}, move: 1, hold: 0.5, cap: 'Spingi i manubri in alto' },
      { p: { ua: 70, fa: -80 }, move: 2.2, hold: 0.4, cap: 'Scendi ai lati del petto, controllando' }
    ],
    scene: function (J) {
      var h = J.hip, o = [h[0] - 6, h[1] + 8], e = add(o, vec(104, 220));
      return { back: ln(o, e, 'eq', 9) + rc(h[0] - 24, h[1] + 12, 52, 6, 'eqf') + ln([h[0] - 8, h[1] + 18], [h[0] - 8, FLOOR], 'eq', 4) + ln([e[0] + 14, e[1] + 10], [e[0] + 14, FLOOR], 'eq', 4), front: dumb(J.wri) };
    }
  };

  E.rem1 = {
    anchor: { j: 'ankle', pos: [130, AY] },
    base: { th: 65, sh: 95, to: -12, ne: -30, ua: 90, fa: 90, ft: 0, th2: 75, sh2: 175, ua2: 90, fa2: 90 },
    keys: [
      { p: {}, move: 1.4, hold: 0.3, cap: 'Scendi con il braccio disteso' },
      { p: { ua: 160 }, move: 1, hold: 0.5, cap: 'Porta il gomito indietro, verso l’anca' }
    ],
    scene: function (J) {
      var top = J.hip[1] + 56;
      return { back: rc(J.hip[0] - 40, top, 112, 8, 'eqf') + ln([J.hip[0] - 28, top + 8], [J.hip[0] - 28, FLOOR], 'eq', 4) + ln([J.hip[0] + 60, top + 8], [J.hip[0] + 60, FLOOR], 'eq', 4), front: dumb(J.wri) };
    }
  };

  E.iperestensioni = {
    anchor: { j: 'hip', pos: [145, 134] },
    base: { th: 135, sh: 135, to: 30, ne: 25, ua: 35, fa: 35, ft: 90 },
    keys: [
      { p: {}, move: 1.5, hold: 0.3, cap: 'Scendi con il busto, schiena neutra' },
      { p: { to: -36, ne: -40, ua: -36, fa: -36 }, move: 1.3, hold: 0.7, cap: 'Sali fino alla linea retta, senza inarcare' }
    ],
    scene: function () { return { back: ci([145, 176], 34, 'ball'), front: '' }; }
  };

  E.dip = {
    anchor: { j: 'wri', pos: [150, 100] },
    base: { th: 90, sh: 150, to: -90, ne: -90, ua: 90, fa: 90, ft: 0 },
    keys: [
      { p: {}, move: 1, hold: 0.5, cap: 'Spingi fino ad avere le braccia tese' },
      { p: { ua: 150, fa: 80, to: -80, ne: -75 }, move: 1.8, hold: 0.4, cap: 'Scendi con gomiti a circa 90°, spalle basse' }
    ],
    scene: function () { return { back: ln([100, 105], [200, 105], 'eq', 5) + ln([110, 105], [110, FLOOR], 'eq', 4) + ln([190, 105], [190, FLOOR], 'eq', 4), front: '' }; }
  };

  /* ---------- vista frontale (alzate laterali, reverse fly) ---------- */
  function frontSvg(p, hl) {
    var cx = 160, hy = 104, shY = hy - 62 * Math.cos(R(p.lean * 55)), headY = shY - (19 - 12 * p.lean), r = L.head;
    var legs = [], arms = [], s = '';
    [-1, 1].forEach(function (sd) {
      var hp = [cx + sd * 9, hy], kn = [cx + sd * 12, 156], an = [cx + sd * 14, 205];
      legs.push([capD(kn, an, 6, 4.2), 'sk'], [capD(hp, kn, 9, 6.6), 'sk'], [capD(hp, mix(hp, kn, 0.55), 10, 8.6), 'sr'], [capD(an, [an[0] + sd * 8, 208], 4.6, 3.8), 'sh']);
    });
    s += grp(legs);
    s += grp([
      ['M' + P2([cx - 24, shY]) + 'L' + P2([cx + 24, shY]) + 'L' + P2([cx + 16, hy]) + 'L' + P2([cx - 16, hy]) + 'Z', 'sf'],
      [cirD([cx - 24, shY], 7), 'sf'], [cirD([cx + 24, shY], 7), 'sf'],
      [capD([cx - 7, hy + 2], [cx + 7, hy + 2], 9.5, 9.5), 'sr'],
      [capD([cx, shY], [cx, headY + 6], 3.8, 3.6), 'sk']
    ]);
    var hx0 = P2([cx - r - 0.4, headY + 1.5]), hx1 = P2([cx + r + 0.4, headY + 1.5]);
    s += grp([[cirD([cx, headY], r), 'sk'], ['M' + hx0 + 'A' + fx(r + 0.4) + ' ' + fx(r + 0.4) + ' 0 0 1 ' + hx1 + 'Q' + P2([cx, headY - r * 0.55]) + ' ' + hx0 + 'Z', 'hr']]);
    s += '<circle cx="' + (cx - 3.6) + '" cy="' + (headY + 2) + '" r="1.1" class="ey"/><circle cx="' + (cx + 3.6) + '" cy="' + (headY + 2) + '" r="1.1" class="ey"/>';
    [-1, 1].forEach(function (sd) {
      var sh = [cx + sd * 25, shY], th = R(p.a), t2 = R(p.a - p.bend);
      var el = [sh[0] + sd * 36 * Math.sin(th), sh[1] + 36 * Math.cos(th)];
      var wr = [el[0] + sd * 34 * Math.sin(t2), el[1] + 34 * Math.cos(t2)];
      arms = arms.concat(armShapes(sh, el, wr, false)); arms.push([cirD(wr, 7.4), 'eqf']);
    });
    s += grp(arms);
    (hl || []).forEach(function (g) {
      if (g === 'spalle') [-1, 1].forEach(function (sd) { s += '<path d="' + cirD([cx + sd * 25, shY], 6.2) + '" class="hl"/>'; });
      else if (g === 'dorsali') s += '<path d="' + capD([cx - 13, shY + 7], [cx + 13, shY + 7], 5, 5) + '" class="hl"/>';
    });
    return s;
  }
  E.laterali = { front: true, keys: [
    { p: { lean: 0, a: 6, bend: 10 }, move: 1.6, hold: 0.3, cap: 'Scendi lento, senza dondolare' },
    { p: { lean: 0, a: 88, bend: 12 }, move: 1.2, hold: 0.5, cap: 'Alza i gomiti ai lati fino all’altezza delle spalle' }
  ] };
  E.reverse = { front: true, keys: [
    { p: { lean: 1, a: 4, bend: 8 }, move: 1.6, hold: 0.3, cap: 'Braccia sotto le spalle, busto inclinato' },
    { p: { lean: 1, a: 85, bend: 14 }, move: 1.2, hold: 0.5, cap: 'Apri le braccia stringendo le scapole' }
  ] };

  Object.keys(E).forEach(function (k) { E[k].id = k; });

  /* ---------- motore ---------- */
  function fullPose(ex, k) { return ex.front ? k.p : P(ex.base, k.p); }
  function lerp(a, b, t) { var o = {}; for (var k in a) o[k] = typeof a[k] === 'number' && typeof b[k] === 'number' ? a[k] + (b[k] - a[k]) * t : a[k]; return o; }

  function timeline(ex) {
    var t = 0, segs = [];
    ex.keys.forEach(function (k, i) {
      var prev = ex.keys[(i + ex.keys.length - 1) % ex.keys.length];
      segs.push({ from: fullPose(ex, prev), to: fullPose(ex, k), t0: t, t1: t + k.move, h1: t + k.move + k.hold, cap: k.cap });
      t += k.move + k.hold;
    });
    return { segs: segs, total: t };
  }

  function sample(ex, tl, time) {
    var t = time % tl.total, s = tl.segs[0], i;
    for (i = 0; i < tl.segs.length; i++) if (t < tl.segs[i].h1) { s = tl.segs[i]; break; }
    var u = t >= s.t1 ? 1 : ease(Math.max(0, (t - s.t0) / (s.t1 - s.t0)));
    return { pose: lerp(s.from, s.to, u), cap: s.cap };
  }

  function focusOf(ex) { var d = SG.EXERCISES && SG.EXERCISES[ex.id]; return d && d.muscles ? d.muscles.main : []; }
  function shadow(cx, rx) { return '<ellipse cx="' + fx(cx) + '" cy="' + (FLOOR + 2) + '" rx="' + fx(rx) + '" ry="4" class="shd"/>'; }

  function render(ex, pose) {
    var inner, hl = focusOf(ex);
    if (ex.front) {
      inner = shadow(160, 38) + frontSvg(pose, hl);
    } else {
      var J = solve(ex, pose), sc = ex.scene ? ex.scene(J, pose) : { back: '', front: '' };
      var xs = [J.hip[0], J.sho[0], J.ankle[0], J.toe[0]], x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
      inner = shadow((x0 + x1) / 2, Math.max(24, Math.min(90, (x1 - x0) / 2 + 12))) + sc.back + bodySvg(J, hl) + sc.front;
    }
    var z = ex.z || 1;
    var g = z === 1 ? inner : '<g transform="translate(160 ' + FLOOR + ') scale(' + z + ') translate(-160 -' + FLOOR + ')">' + inner + '</g>';
    return '<rect x="-400" y="' + FLOOR + '" width="1120" height="260" class="flr"/><line x1="10" y1="' + FLOOR + '" x2="310" y2="' + FLOOR + '" class="floor"/>' + g;
  }

  function mkSvg() {
    var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 ' + VW + ' ' + VH);
    s.setAttribute('class', 'fig');
    s.setAttribute('role', 'img');
    return s;
  }

  var live = [];
  var raf = 0, last = 0;
  function loop(ts) {
    var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    live = live.filter(function (m) { return m.el.isConnected; });
    live.forEach(function (m) {
      if (!m.playing) return;
      m.time += dt * m.speed;
      m.draw();
    });
    raf = live.length ? requestAnimationFrame(loop) : 0;
  }
  function kick() { if (!raf && live.length) { last = performance.now(); raf = requestAnimationFrame(loop); } }

  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  SG.Figure = {
    has: function (id) { return !!E[id]; },
    thumb: function (id) {
      var ex = E[id], svg = mkSvg();
      if (!ex) return svg;
      var tl = timeline(ex);
      var peak = tl.segs.length > 1 ? tl.segs[1].to : tl.segs[0].to;
      svg.innerHTML = render(ex, peak);
      return svg;
    },
    frame: function (id, i) {
      var ex = E[id], svg = mkSvg();
      svg.innerHTML = render(ex, fullPose(ex, ex.keys[i]));
      return svg;
    },
    mount: function (host, id, onCaption) {
      var ex = E[id];
      var svg = mkSvg();
      host.appendChild(svg);
      if (!ex) return { toggle: function () {}, setSpeed: function () {}, isPlaying: function () { return false; } };
      var tl = timeline(ex);
      var m = { el: svg, time: 0, speed: 1, playing: !reduce };
      var lastCap = '';
      m.draw = function () {
        var s = sample(ex, tl, m.time);
        svg.innerHTML = render(ex, s.pose);
        if (s.cap !== lastCap) { lastCap = s.cap; if (onCaption) onCaption(s.cap); }
      };
      m.draw();
      live.push(m); kick();
      return {
        toggle: function () { m.playing = !m.playing; kick(); return m.playing; },
        setSpeed: function (x) { m.speed = x; },
        isPlaying: function () { return m.playing; }
      };
    },
    ids: function () { return Object.keys(E); }
  };
})();
