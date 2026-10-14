/* Dati del circolo: modifica questo file per aggiornare testi, tariffe, corsi, eventi e pagamenti.
   Tutti i valori sono ESEMPI da sostituire con quelli reali. */
window.CLUB = {
  name: "Pineta Tennis & Padel",
  short: "Pineta T&P",
  legal: "ASD Pineta Tennis & Padel",
  cf: "00000000000",
  affil: "Affiliata FITP (esempio)",
  address: "Via dei Pini 12, 00000 Città (esempio)",
  phone: "+39 000 000 0000",
  email: "info@esempio-circolo.it",
  president: "Nome Cognome",
  hours: [
    ["Lunedì – Venerdì", "08:00 – 22:00"],
    ["Sabato", "08:00 – 22:00"],
    ["Domenica e festivi", "08:00 – 20:00"],
    ["Segreteria", "16:00 – 20:00"]
  ],
  refPrefix: "PTP",
  enrollFee: 30,            /* quota associativa annuale ASD, in euro */
  holdOnlineMin: 30,        /* minuti di blocco dello slot per pagamento online */
  holdBankHours: 12,        /* ore di blocco dello slot per bonifico */
  cancelPolicy: "Annullamento gratuito fino a 24 ore prima dell'orario prenotato (esempio).",
  /* Pagamento anticipato. Inserisci in "url" il link di pagamento del circolo
     (Stripe Payment Link, PayPal.me, Satispay, ecc.). Con url vuoto il pulsante mostra un avviso. */
  payments: {
    online: [
      { id: "card", label: "Carta di credito o debito", url: "" },
      { id: "paypal", label: "PayPal", url: "" }
    ],
    bank: { holder: "ASD Pineta Tennis & Padel", iban: "IT00 X000 0000 0000 0000 0000 000", bank: "Banca Esempio" }
  }
};

window.COURTS = [
  { id: "t1", sport: "tennis", name: "Campo 1", surface: "Terra rossa", cover: "Scoperto", price: 18 },
  { id: "t2", sport: "tennis", name: "Campo 2", surface: "Terra rossa", cover: "Scoperto", price: 18 },
  { id: "t3", sport: "tennis", name: "Campo 3", surface: "Cemento", cover: "Coperto", price: 24 },
  { id: "p1", sport: "padel", name: "Padel A", surface: "Erba sintetica", cover: "Scoperto", price: 32 },
  { id: "p2", sport: "padel", name: "Padel B", surface: "Erba sintetica", cover: "Coperto", price: 36 }
];

window.COURSES = [
  { id: "mini", sport: "tennis", name: "Mini tennis", level: "Principianti", age: "5–8 anni", ageMin: 5, ageMax: 8,
    days: "Mar e Gio", time: "16:30–17:30", lessons: 8, group: "Max 6 allievi", coach: "Maestro Rossi", coachId: "rossi", start: "5 ottobre 2026", price: 55,
    text: "Il primo contatto con racchetta e palla attraverso giochi di coordinazione, con palline morbide e campo ridotto." },
  { id: "junior", sport: "tennis", name: "Scuola tennis Junior", level: "Base e intermedio", age: "9–14 anni", ageMin: 9, ageMax: 14,
    days: "Lun e Mer", time: "17:30–19:00", lessons: 8, group: "Max 6 allievi", coach: "Maestro Rossi", coachId: "rossi", start: "5 ottobre 2026", price: 70,
    text: "Fondamentali, primi punti giocati e partecipazione ai tornei giovanili del circolo." },
  { id: "adulti-base", sport: "tennis", name: "Tennis adulti base", level: "Principianti", age: "Da 15 anni", ageMin: 15, ageMax: 99,
    days: "Mar e Gio", time: "20:00–21:00", lessons: 8, group: "Max 4 allievi", coach: "Maestra Bianchi", coachId: "bianchi", start: "6 ottobre 2026", price: 80,
    text: "Dritto, rovescio, servizio e regole del gioco per chi inizia o riparte dopo una lunga pausa." },
  { id: "adulti-inter", sport: "tennis", name: "Tennis adulti intermedio", level: "Intermedio", age: "Da 15 anni", ageMin: 15, ageMax: 99,
    days: "Lun e Mer", time: "20:00–21:00", lessons: 8, group: "Max 4 allievi", coach: "Maestra Bianchi", coachId: "bianchi", start: "5 ottobre 2026", price: 90,
    text: "Tattica, gioco a rete e match play per migliorare la costanza in partita." },
  { id: "padel-base", sport: "padel", name: "Padel base", level: "Principianti", age: "Da 14 anni", ageMin: 14, ageMax: 99,
    days: "Ven", time: "19:00–20:30", lessons: 4, group: "Max 4 allievi", coach: "Maestro Verdi", coachId: "verdi", start: "9 ottobre 2026", price: 60,
    text: "Posizione in campo, colpi di base, uso delle pareti e le prime partite in doppio." },
  { id: "padel-inter", sport: "padel", name: "Padel intermedio", level: "Intermedio", age: "Da 14 anni", ageMin: 14, ageMax: 99,
    days: "Sab", time: "10:00–11:30", lessons: 4, group: "Max 4 allievi", coach: "Maestro Verdi", coachId: "verdi", start: "10 ottobre 2026", price: 70,
    text: "Bandeja, vibora, uscite di parete e costruzione del punto in coppia." },
  { id: "agonistica", sport: "tennis", name: "Preparazione agonistica", level: "Agonisti", age: "Da 10 anni", ageMin: 10, ageMax: 99,
    days: "Lun, Mer e Ven", time: "18:00–20:00", lessons: 12, group: "Max 6 allievi", coach: "Maestro Rossi", coachId: "rossi", start: "5 ottobre 2026", price: 140,
    text: "Allenamento tecnico e atletico per chi gioca i campionati federali con la squadra dell'ASD." },
  { id: "privata", sport: "tennis", name: "Lezione privata", level: "Tutti i livelli", age: "Tutte le età", ageMin: 0, ageMax: 99,
    days: "Su appuntamento", time: "Orario da concordare", lessons: 1, group: "1 o 2 allievi", coach: "A scelta", start: "Tutto l'anno", price: 40,
    text: "Una lezione di un'ora costruita sui tuoi obiettivi, nel tennis o nel padel." }
];

window.EVENTS = [
  { id: "torneo-padel", d: "2026-10-24", time: "09:00", cat: "Padel", title: "Torneo sociale di padel",
    text: "Coppie libere, formula a gironi e finale nel tardo pomeriggio. Aperitivo per tutti.",
    long: ["Una giornata di padel aperta a soci e non soci. Le coppie si formano liberamente e giocano in gironi da quattro, con finale in serata.", "Al termine, aperitivo e premiazioni in club house. Sono previsti premi per le prime tre coppie e per la coppia più simpatica."],
    place: "Campi Padel A e B", price: "€ 20 a coppia", signup: "Iscrizione in segreteria entro il 21 ottobre. Posti limitati a 16 coppie.", meta: "Dalle 09:00 · Iscrizione in segreteria", poster: "" },
  { id: "open-autunno", d: "2026-11-07", time: "08:30", cat: "Tennis", title: "Open d'autunno singolare",
    text: "Torneo aperto a tesserati e non, categorie 4.1–4.6. Montepremi in materiale tecnico.",
    long: ["Torneo di singolare a tabellone con consolazione, aperto a giocatori tesserati FITP e non tesserati (con certificato medico).", "Le partite si giocano al meglio dei due set con tie-break decisivo. Il calendario viene pubblicato in segreteria il giorno prima."],
    place: "Campi 1, 2 e 3", price: "€ 25 a giocatore", signup: "Iscrizione online o in segreteria entro il 4 novembre.", meta: "Tutto il giorno · Campi 1, 2 e 3", poster: "" },
  { id: "cena-sociale", d: "2026-11-21", time: "20:30", cat: "Sociale", title: "Cena sociale dell'ASD",
    text: "Serata con premiazioni della stagione e presentazione dei corsi invernali.",
    long: ["La cena di fine stagione per soci, famiglie e allievi dei corsi. Premiazione dei tornei sociali e presentazione del programma invernale.", "Menu fisso con opzioni vegetariane. Segnala eventuali allergie al momento dell'iscrizione."],
    place: "Club house", price: "€ 28 a persona, bambini under 12 € 15", signup: "Prenotazione obbligatoria in segreteria entro il 16 novembre.", meta: "20:30 · Club house", poster: "" },
  { id: "giornata-scuola", d: "2026-12-12", time: "10:00", cat: "Tennis", title: "Giornata della scuola tennis",
    text: "Mini-tornei per bambini dai 5 ai 12 anni, con gli istruttori della società.",
    long: ["Una mattina di mini-tornei e giochi per bambini dai 5 ai 12 anni, seguiti dagli istruttori della scuola tennis.", "Gli accompagnatori possono assistere dai bordi campo. Al termine, merenda per tutti i partecipanti."],
    place: "Campi 1, 2 e 3", price: "Ingresso libero", signup: "Non serve iscriversi. Per i nuovi allievi è prevista una lezione di prova gratuita.", meta: "10:00–13:00 · Ingresso libero", poster: "" },
  { id: "clinic-padel", d: "2027-01-09", time: "15:00", cat: "Padel", title: "Clinic di padel con il maestro",
    text: "Due ore di tecnica su bandeja, vibora e uscite di parete per giocatori di livello intermedio.",
    long: ["Due ore di lavoro tecnico con il maestro Verdi su bandeja, vibora e uscite di parete, con esercizi a gruppi di quattro.", "Adatto a chi ha già qualche mese di gioco alle spalle. Palline fornite dal circolo."],
    place: "Padel B (coperto)", price: "€ 30 a persona", signup: "Iscrizione in segreteria. Massimo 8 partecipanti.", meta: "15:00 · Posti limitati", poster: "" }
];

window.INSTRUCTORS = [
  { id: "rossi", name: "Marco Rossi", role: "Direttore tecnico · Maestro nazionale", color: "#1D5C48", photo: "", years: 22,
    short: "Guida la scuola tennis e la squadra agonistica dell'ASD.",
    bio: ["Marco insegna tennis da oltre vent'anni e dirige l'area tecnica del circolo. Ha costruito la scuola tennis giovanile e segue la squadra che partecipa ai campionati federali.", "Nei corsi per bambini e ragazzi lavora su coordinazione e divertimento prima che sulla tecnica. Con gli agonisti prepara il programma stagionale di allenamento e tornei."],
    qualifications: ["Maestro nazionale FITP", "Preparatore atletico di primo livello", "Corso di aggiornamento sul tennis giovanile"],
    specialties: ["Mini tennis e scuola junior", "Preparazione agonistica", "Lezioni private"] },
  { id: "bianchi", name: "Elena Bianchi", role: "Istruttrice di secondo grado", color: "#B5532F", photo: "", years: 12,
    short: "Segue i corsi per adulti, dai principianti ai giocatori di club.",
    bio: ["Elena ha iniziato a insegnare dopo una carriera nei campionati a squadre. Nei corsi per adulti punta su pochi concetti chiari, ripetuti in situazioni di gioco reali.", "Ama lavorare con chi riparte dopo una pausa e vuole tornare a giocare con costanza e senza infortuni."],
    qualifications: ["Istruttrice di secondo grado FITP", "Giocatrice di serie D1"],
    specialties: ["Tennis adulti base e intermedio", "Tattica di doppio", "Ripartenza dopo una pausa"] },
  { id: "verdi", name: "Luca Verdi", role: "Istruttore di padel", color: "#1F4BA8", photo: "", years: 8,
    short: "Responsabile del padel: corsi, clinic e tornei di coppia.",
    bio: ["Luca ha portato il padel nel circolo nel 2019 e oggi coordina corsi, clinic e il torneo sociale. Prima giocava a tennis a livello agonistico.", "Nelle lezioni insiste su posizione in campo e uso delle pareti, gli aspetti che fanno la differenza nelle prime partite in doppio."],
    qualifications: ["Istruttore di padel FIT", "Arbitro di padel"],
    specialties: ["Padel base e intermedio", "Clinic tecnici", "Organizzazione tornei"] }
];
