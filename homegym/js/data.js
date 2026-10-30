/* Piano di allenamento. Modifica qui esercizi, serie e ripetizioni.
   kind: 'load' = kg + ripetizioni, 'time' = secondi, 'bw' = solo ripetizioni (corpo libero). */
(function () {
  var SG = (window.SG = window.SG || {});

  SG.EXERCISES = {
    panca: { name: 'Panca piana con bilanciere', group: 'Petto', kind: 'load', cues: ['Scapole addotte e depresse, piedi ben saldi a terra.', 'Porta il bilanciere al petto basso, gomiti a circa 45° dal busto.', 'Spingi in alto senza staccare i glutei dalla panca.'] },
    rematore: { name: 'Rematore con bilanciere', group: 'Schiena', kind: 'load', cues: ['Busto inclinato di circa 45°, schiena neutra, ginocchia morbide.', 'Tira il bilanciere verso l’ombelico.', 'Porta le scapole indietro e in basso, senza dondolare.'] },
    stacco: { name: 'Stacco rumeno', group: 'Femorali e glutei', kind: 'load', cues: ['Ginocchia appena flesse, bacino spinto indietro.', 'Il bilanciere scorre vicino alle gambe.', 'Scendi finché senti il tirare dei femorali, poi spingi i fianchi in avanti.'] },
    spanish: { name: 'Spanish squat con elastico', group: 'Quadricipiti e tendine', kind: 'time', knee: 'Esercizio isometrico per il tendine rotuleo: dolore fino a 3 su 10, che torna normale entro il giorno dopo.', cues: ['Fissa l’elastico al rack all’altezza delle ginocchia, passalo dietro le ginocchia.', 'Tibie verticali, siediti all’indietro contro l’elastico (circa 60° di flessione).', 'Resta fermo per il tempo indicato, poi risali piano.'] },
    facepull: { name: 'Face pull ai cavi alti', group: 'Spalle posteriori', kind: 'load', cues: ['Corda all’altezza del viso, braccia tese verso il cavo.', 'Tira verso il volto aprendo i gomiti all’esterno.', 'Fermati 1 secondo con le scapole unite. Carico leggero.'] },
    plank: { name: 'Plank', group: 'Core', kind: 'time', cues: ['Gomiti sotto le spalle, corpo in linea retta.', 'Contrai glutei e addome.', 'Non lasciare cadere i lombari e non alzare il bacino.'] },

    lat: { name: 'Lat machine ai cavi alti', group: 'Dorsali', kind: 'load', cues: ['Petto in fuori, prendi la barra poco oltre la larghezza delle spalle.', 'Tira la barra alla parte alta del petto, gomiti verso il basso.', 'Risali lentamente, senza dondolare con il busto.'] },
    military: { name: 'Military press in piedi', group: 'Spalle', kind: 'load', cues: ['Glutei e addome contratti, bilanciere alle clavicole.', 'Spingi sopra la testa portando il capo leggermente in avanti sotto la barra.', 'Non inarcare la schiena.'] },
    hipthrust: { name: 'Hip thrust con bilanciere', group: 'Glutei', kind: 'load', cues: ['Scapole appoggiate alla panca, bilanciere (con pad) sui fianchi.', 'Mento verso il petto, spingi con i talloni.', 'In alto stringi i glutei: il busto resta orizzontale, senza inarcare i lombari.'] },
    pulley: { name: 'Pulley ai cavi bassi', group: 'Schiena', kind: 'load', cues: ['Seduto, busto fermo e petto aperto.', 'Porta le mani all’addome, gomiti lungo i fianchi.', 'Fermati 1 secondo con le scapole unite, poi torna lento.'] },
    curl: { name: 'Curl con manubri', group: 'Bicipiti', kind: 'load', cues: ['Gomiti fermi ai fianchi.', 'Fletti il gomito senza dondolare con il busto.', 'Scendi lento in circa 2 secondi.'] },
    pushdown: { name: 'Push-down con corda', group: 'Tricipiti', kind: 'load', cues: ['Gomiti fermi ai fianchi, busto leggermente inclinato.', 'Estendi il gomito fino in basso aprendo la corda.', 'Risali fino a 90° al gomito, senza alzare le spalle.'] },
    deadbug: { name: 'Dead bug', group: 'Core', kind: 'bw', unitLabel: 'rip. per lato', cues: ['Schiena a contatto con il pavimento, ginocchia a 90°.', 'Estendi lentamente braccio e gamba opposti.', 'Se la schiena si stacca da terra, riduci l’ampiezza.'] },
    negative: { name: 'Trazioni negative (opzionale)', group: 'Dorsali', kind: 'bw', cues: ['Parti con il mento sopra la sbarra, aiutandoti con un salto o un rialzo.', 'Scendi in circa 4 secondi, spalle lontane dalle orecchie.', 'Se riesci a farne più di 5 per serie, passa alle trazioni complete.'] },

    squat: { name: 'Squat al rack con pausa', group: 'Gambe', kind: 'load', knee: 'Scendi solo fino a dove non senti dolore al ginocchio sinistro. Se il giorno dopo è più gonfio o dolente, sostituiscilo con lo Spanish squat.', cues: ['Bilanciere sui trapezi con lo squat pad, piedi a larghezza spalle.', 'Ginocchia in linea con le punte dei piedi, busto compatto.', 'Pausa di 1 secondo in basso, poi spingi sui talloni.'] },
    inclinata: { name: 'Panca inclinata con manubri', group: 'Petto alto', kind: 'load', cues: ['Panca a circa 30°, scapole ferme sullo schienale.', 'Manubri ai lati del petto, avambracci verticali.', 'Spingi in alto senza sbattere i manubri.'] },
    rem1: { name: 'Rematore a un braccio', group: 'Schiena', kind: 'load', unitLabel: 'per lato', cues: ['Una mano e un ginocchio sulla panca, schiena piatta.', 'Tira il manubrio verso l’anca, gomito vicino al corpo.', 'Non ruotare il busto.'] },
    iperestensioni: { name: 'Iperestensioni su fitball', group: 'Lombari e glutei', kind: 'bw', cues: ['Bacino sulla palla, piedi a terra contro il muro o divaricati.', 'Sali fino a formare una linea retta tra gambe e busto.', 'Non inarcare oltre: il movimento viene da glutei e lombari.'] },
    laterali: { name: 'Alzate laterali', group: 'Spalle', kind: 'load', cues: ['Gomiti leggermente flessi, carico leggero.', 'Alza i gomiti ai lati fino all’altezza delle spalle.', 'Scendi lento, senza dondolare.'] },
    reverse: { name: 'Reverse fly con manubri', group: 'Spalle posteriori', kind: 'load', cues: ['Busto inclinato in avanti, schiena neutra.', 'Apri le braccia ai lati stringendo le scapole.', 'Carico leggero e movimento controllato.'] },
    dip: { name: 'Dip ai supporti', group: 'Petto e tricipiti', kind: 'bw', cues: ['Braccia tese, spalle lontane dalle orecchie.', 'Scendi con gomiti a circa 90°, busto leggermente inclinato.', 'Se è troppo difficile, usa un elastico sotto le ginocchia o fai i push-down con la corda.'] }
  };

  /* Gruppi muscolari. I cinque principali sono: gambe, pettorali, dorsali, tricipiti, bicipiti.
     Spalle e core sono mostrati a parte perché non rientrano tra i cinque.
     main = lavorano direttamente; also = aiutano (lavoro indiretto). */
  SG.MUSCLES = [{ id: 'gambe', label: 'Gambe' }, { id: 'pettorali', label: 'Pettorali' }, { id: 'dorsali', label: 'Dorsali' }, { id: 'tricipiti', label: 'Tricipiti' }, { id: 'bicipiti', label: 'Bicipiti' }];
  SG.EXTRA = [{ id: 'spalle', label: 'Spalle' }, { id: 'core', label: 'Core' }];
  var MUSC = {
    panca: [['pettorali'], ['tricipiti']],
    rematore: [['dorsali'], ['bicipiti']],
    stacco: [['gambe'], []],
    spanish: [['gambe'], []],
    facepull: [['spalle'], ['dorsali']],
    plank: [['core'], []],
    lat: [['dorsali'], ['bicipiti']],
    military: [['spalle'], ['tricipiti']],
    hipthrust: [['gambe'], []],
    pulley: [['dorsali'], ['bicipiti']],
    curl: [['bicipiti'], []],
    pushdown: [['tricipiti'], []],
    deadbug: [['core'], []],
    negative: [['dorsali'], ['bicipiti']],
    squat: [['gambe'], []],
    inclinata: [['pettorali'], ['tricipiti']],
    rem1: [['dorsali'], ['bicipiti']],
    iperestensioni: [['dorsali'], ['gambe']],
    laterali: [['spalle'], []],
    reverse: [['spalle'], ['dorsali']],
    dip: [['pettorali', 'tricipiti'], []]
  };
  Object.keys(MUSC).forEach(function (k) { if (SG.EXERCISES[k]) SG.EXERCISES[k].muscles = { main: MUSC[k][0], also: MUSC[k][1] }; });
  SG.muscleLabel = function (id) { var all = SG.MUSCLES.concat(SG.EXTRA); for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].label; return id; };
  /* Serie per gruppo in una seduta: { gambe: {main: 7, also: 0}, ... } */
  SG.dayMuscles = function (day) {
    var r = {};
    SG.MUSCLES.concat(SG.EXTRA).forEach(function (g) { r[g.id] = { main: 0, also: 0 }; });
    day.items.forEach(function (it) {
      var m = SG.EXERCISES[it.ex] && SG.EXERCISES[it.ex].muscles; if (!m) return;
      m.main.forEach(function (g) { r[g].main += it.sets; });
      m.also.forEach(function (g) { r[g].also += it.sets; });
    });
    return r;
  };

  SG.PLAN = [
    { key: 'a', title: 'Seduta A', focus: 'Spinta, tirata e catena posteriore', weekday: 'Martedì', minutes: 55, items: [
      { ex: 'panca', sets: 3, reps: '6-10', rest: 90 },
      { ex: 'rematore', sets: 4, reps: '8-10', rest: 90 },
      { ex: 'stacco', sets: 3, reps: '8-10', rest: 120 },
      { ex: 'spanish', sets: 4, reps: '30-45 s', rest: 60 },
      { ex: 'facepull', sets: 3, reps: '15', rest: 60 },
      { ex: 'plank', sets: 3, reps: '30-45 s', rest: 60 }
    ] },
    { key: 'b', title: 'Seduta B', focus: 'Tirate verticali, glutei e core', weekday: 'Giovedì', minutes: 55, items: [
      { ex: 'lat', sets: 4, reps: '8-12', rest: 90 },
      { ex: 'military', sets: 3, reps: '6-10', rest: 120 },
      { ex: 'hipthrust', sets: 4, reps: '8-12', rest: 90 },
      { ex: 'pulley', sets: 3, reps: '10-12', rest: 90 },
      { ex: 'curl', sets: 2, reps: '10-12', rest: 60 },
      { ex: 'pushdown', sets: 2, reps: '10-12', rest: 60 },
      { ex: 'deadbug', sets: 3, reps: '8', rest: 60 },
      { ex: 'negative', sets: 3, reps: '3-5', rest: 90 }
    ] },
    { key: 'c', title: 'Seduta C', focus: 'Gambe prudenti, spalle e schiena', weekday: 'Sabato', minutes: 55, items: [
      { ex: 'squat', sets: 3, reps: '6-8', rest: 120 },
      { ex: 'inclinata', sets: 3, reps: '8-12', rest: 90 },
      { ex: 'rem1', sets: 3, reps: '10-12', rest: 60 },
      { ex: 'iperestensioni', sets: 3, reps: '12-15', rest: 60 },
      { ex: 'laterali', sets: 3, reps: '12-15', rest: 60 },
      { ex: 'reverse', sets: 3, reps: '12-15', rest: 60 },
      { ex: 'dip', sets: 2, reps: '8-12', rest: 90 }
    ] }
  ];

  /* Video opzionali: associa a un esercizio l'ID di un video YouTube tuo (o un file mp4 in /videos)
     e verrà mostrato al posto dell'animazione. Esempio: SG.VIDEOS = { panca: { youtube: 'ID_VIDEO' } } */
  SG.VIDEOS = {};

  SG.exName = function (id) { return SG.EXERCISES[id] ? SG.EXERCISES[id].name : id; };
  SG.repRange = function (s) { var m = /(\d+)\s*-\s*(\d+)/.exec(s); if (m) return [+m[1], +m[2]]; var n = /(\d+)/.exec(s); return n ? [+n[1], +n[1]] : [0, 0]; };
})();
