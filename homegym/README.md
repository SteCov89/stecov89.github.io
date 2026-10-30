# Scheda Home Gym

Web app per smartphone con la scheda di allenamento full body (sedute A, B, C), il registro dei carichi, il timer di recupero, lo storico con grafico dei progressi, i gruppi muscolari di ogni seduta e le animazioni di ogni esercizio (figura umana con i muscoli che lavorano evidenziati) incorporate nella pagina.

- Funziona subito, senza account: i dati restano nel browser del telefono (e anche offline, dopo la prima visita).
- Se vuoi i dati anche online, e sincronizzati tra più dispositivi, collega un database Supabase (gratuito): vedi sotto.
- Nessuna fase di build: sono solo file statici (HTML, CSS, JavaScript).

## Cosa c'è nel pacchetto

```
index.html, css/, js/        l'app
js/data.js                   esercizi, serie, ripetizioni, recuperi (qui modifichi la scheda)
js/figures.js                animazioni degli esercizi (figura umana disegnata in SVG)
js/store.js                  archivio locale + sincronizzazione con Supabase
js/config.js                 URL e chiave di Supabase (vuoti di default)
sw.js, manifest.webmanifest  installazione sul telefono e uso offline
supabase/schema.sql          tabelle, sicurezza (RLS) e vista dei progressi
supabase/seed.sql            esercizi e scheda A/B/C da caricare nel database
tools/gen-seed.js            rigenera seed.sql dopo aver modificato js/data.js
.github/workflows/pages.yml  pubblicazione automatica su GitHub Pages
```

## 1. Provarla sul computer

Serve un piccolo server locale (il service worker non funziona aprendo il file con doppio clic).

```bash
cd scheda-homegym
python3 -m http.server 8000
```

Apri http://localhost:8000. Per provarla dal telefono, collegato alla stessa rete Wi-Fi, apri `http://<IP-del-computer>:8000`.

## 2. Pubblicarla su GitHub Pages

1. Crea un repository su GitHub (anche privato, ma GitHub Pages sui repository privati richiede un piano a pagamento: con un repository pubblico è gratuito).
2. Carica tutto il contenuto della cartella `scheda-homegym` nel ramo `main`.
3. Nel repository vai in **Settings → Pages** e in **Build and deployment → Source** scegli **GitHub Actions**.
4. Il workflow `pages.yml` parte da solo a ogni push. Al termine trovi l'indirizzo, di solito `https://<tuo-utente>.github.io/<nome-repo>/`.

Attenzione: nel repository pubblico finiscono anche l'URL e la chiave "anon" di Supabase se li scrivi in `js/config.js`. È normale: quella chiave è pensata per essere pubblica, e i dati sono protetti dalle regole RLS di `schema.sql`. Non inserire mai la chiave `service_role`.

## 3. Collegare il database Supabase

1. Crea un progetto su https://supabase.com.
2. Apri **SQL Editor**, incolla ed esegui prima `supabase/schema.sql`, poi `supabase/seed.sql`.
3. In **Authentication → Providers** lascia attivo **Email**. Se non vuoi confermare l'indirizzo per mail, disattiva **Confirm email**.
4. In **Authentication → URL Configuration** imposta come **Site URL** l'indirizzo di GitHub Pages, così il link di conferma torna all'app.
5. In **Project Settings → API** copia **Project URL** e la chiave **anon public**, e incollali in `js/config.js`:

   ```js
   window.SG_CONFIG = {
     supabaseUrl: "https://xxxxxxxx.supabase.co",
     supabaseAnonKey: "eyJ..."
   };
   ```
6. Fai commit e push. Nell'app vai in **Impostazioni → Database online**, scegli **Crea account** (poi conferma la mail se richiesto) e infine **Accedi**.

Da quel momento ogni seduta salvata viene inviata al database e le sedute registrate su un altro dispositivo compaiono nello storico. Se sei offline, le sedute restano in coda e partono appena torna la connessione. Le sedute registrate prima dell'accesso vengono caricate al primo accesso.

Tabelle principali: `workout_sessions` (una riga per seduta), `set_logs` (una riga per serie, con kg, ripetizioni o secondi), `exercises`, `plan_days` e `plan_exercises` (la scheda). La vista `exercise_progress` riassume il miglior valore per esercizio e giorno. Ogni utente vede solo i propri dati.

## 4. Installarla sul telefono

- **Android (Chrome):** menu ⋮ → **Installa app** (o **Aggiungi a schermata Home**).
- **iPhone (Safari):** tasto Condividi → **Aggiungi alla schermata Home**.

## 5. Modificare la scheda

1. Cambia esercizi, serie, ripetizioni e recuperi in `js/data.js`.
2. Se usi Supabase, esegui `node tools/gen-seed.js` e riesegui `supabase/seed.sql` nel SQL Editor. Se avevi già creato le tabelle con una versione precedente, riesegui prima anche `schema.sql`: è sicuro e aggiunge solo le colonne dei gruppi muscolari.
3. I gruppi muscolari di ogni esercizio sono nella tabella `MUSC` di `js/data.js` (principali e secondari). Alle serie compilate in automatico dall'ultima seduta non serve nessuna configurazione.
4. In `sw.js` aumenta il numero di `VERSION` (per esempio `sg-v2`), così i telefoni scaricano la versione nuova.

Un esercizio nuovo senza animazione funziona comunque: mostra il testo e il registro dei carichi. Le animazioni si definiscono in `js/figures.js`.

## 6. Video veri al posto delle animazioni

Le animazioni sono illustrazioni disegnate in SVG (una figura umana stilizzata), non filmati. Se vuoi usare video veri (per esempio tuoi, o un video YouTube che hai scelto), associali all'esercizio in `js/data.js`:

```js
SG.VIDEOS = {
  panca: { youtube: 'ID_DEL_VIDEO' },        // si incorpora nella pagina, senza uscire dall'app
  stacco: { mp4: 'videos/stacco.mp4' }       // oppure un file che carichi nella cartella videos/
};
```

L'ID è la parte dopo `v=` nell'indirizzo del video. Il video sostituisce l'animazione di quell'esercizio.

## Backup

In **Impostazioni → Backup** puoi scaricare tutte le sedute in un file JSON e reimportarle su un altro dispositivo.

## Note

La scheda è pensata per un amatore e tiene conto di un fastidio al tendine rotuleo del ginocchio sinistro. Non sostituisce il parere di un medico o di un fisioterapista: se il ginocchio è gonfio o il dolore aumenta, fermati e fatti visitare.
