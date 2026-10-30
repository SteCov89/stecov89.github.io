/* Accesso, registrazione e recupero password (solo versione pubblica con Supabase). */
window.App.ready.then(function () {
  "use strict";
  var App = window.App, h = App.h, $ = App.$;
  App.chrome("accedi.html");
  if (!App.isSupabase) { $("#platformNote").hidden = false; return; }

  var c = null;
  try { c = App.sb(); } catch (e) { $("#boxIn").hidden = false; $("#auMsg").appendChild(h("div", { class: "msg err", text: "Il servizio di accesso non è raggiungibile. Ricarica la pagina tra poco." })); return; }

  var mode = "in", NEXT = { prenota: "prenota.html", corsi: "corsi.html", segreteria: "segreteria.html" };
  var next = NEXT[(location.hash || "").replace("#", "")] || "prenota.html";
  function baseUrl() { return location.origin + location.pathname.replace(/[^/]*$/, ""); }
  function say(el, text, err) { el.textContent = ""; if (text) el.appendChild(h("div", { class: "msg" + (err ? " err" : ""), text: text, role: err ? "alert" : "status" })); }
  function it(e) {
    var m = String((e && e.message) || e || "");
    if (/Invalid login credentials/i.test(m)) return "Email o password non corretti.";
    if (/already registered|already been registered/i.test(m)) return "Esiste già un account con questa email. Prova ad accedere.";
    if (/Email not confirmed/i.test(m)) return "Devi ancora confermare l'email: controlla la posta e apri il link che ti abbiamo inviato.";
    if (/rate limit|too many/i.test(m)) return "Troppi tentativi ravvicinati. Aspetta qualche minuto e riprova.";
    if (/Password should be at least/i.test(m)) return "La password deve avere almeno 8 caratteri.";
    if (/valid email|invalid format/i.test(m)) return "Controlla l'indirizzo email.";
    return "Operazione non riuscita. Controlla i dati e riprova.";
  }

  function setMode(m) {
    mode = m;
    $("#tabIn").setAttribute("aria-pressed", String(m === "in"));
    $("#tabUp").setAttribute("aria-pressed", String(m === "up"));
    $("#auSubmit").textContent = m === "in" ? "Accedi" : "Crea account";
    $("#auPass").autocomplete = m === "in" ? "current-password" : "new-password";
    $("#auHint").hidden = m === "in";
    $("#auForgot").hidden = m !== "in";
    say($("#auMsg"), "");
  }
  $("#tabIn").addEventListener("click", function () { setMode("in"); });
  $("#tabUp").addEventListener("click", function () { setMode("up"); });

  function showIn() { $("#boxIn").hidden = false; $("#boxOut").hidden = true; $("#boxRecover").hidden = true; }
  function showOut(user) {
    $("#boxIn").hidden = true; $("#boxRecover").hidden = true; $("#boxOut").hidden = false;
    $("#outMail").textContent = user.email || "";
    Promise.resolve(c.rpc("is_staff")).then(function (r) { $("#outStaff").hidden = r.data !== true; }, function () {});
  }

  $("#authForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var email = $("#auEmail").value.trim(), pass = $("#auPass").value, msg = $("#auMsg");
    if (!email) { say(msg, "Inserisci l'email.", true); return; }
    if (pass.length < 8) { say(msg, "La password deve avere almeno 8 caratteri.", true); return; }
    var b = $("#auSubmit"); b.disabled = true;
    if (mode === "in") {
      Promise.resolve(c.auth.signInWithPassword({ email: email, password: pass })).then(function (r) {
        b.disabled = false;
        if (r.error) { say(msg, it(r.error), true); return; }
        location.href = next;
      }, function (e) { b.disabled = false; say(msg, it(e), true); });
    } else {
      Promise.resolve(c.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: baseUrl() + "accedi.html" } })).then(function (r) {
        b.disabled = false;
        if (r.error) { say(msg, it(r.error), true); return; }
        if (r.data && r.data.session) { location.href = next; return; }
        if (r.data && r.data.user && r.data.user.identities && r.data.user.identities.length === 0) { say(msg, "Esiste già un account con questa email. Prova ad accedere.", true); return; }
        say(msg, "Account creato. Ti abbiamo scritto per confermare l'indirizzo: apri il link nell'email, poi accedi.");
      }, function (e) { b.disabled = false; say(msg, it(e), true); });
    }
  });

  $("#auForgot").addEventListener("click", function () {
    var email = $("#auEmail").value.trim(), msg = $("#auMsg");
    if (!email) { say(msg, "Scrivi la tua email nel campo qui sopra, poi premi di nuovo “Password dimenticata?”.", true); return; }
    Promise.resolve(c.auth.resetPasswordForEmail(email, { redirectTo: baseUrl() + "accedi.html" })).then(function (r) {
      if (r.error) { say(msg, it(r.error), true); return; }
      say(msg, "Se l'indirizzo è registrato, ti arriva un'email con il link per scegliere una nuova password.");
    }, function (e) { say(msg, it(e), true); });
  });

  $("#recForm").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var pass = $("#rcPass").value, msg = $("#rcMsg");
    if (pass.length < 8) { say(msg, "La password deve avere almeno 8 caratteri.", true); return; }
    Promise.resolve(c.auth.updateUser({ password: pass })).then(function (r) {
      if (r.error) { say(msg, it(r.error), true); return; }
      say(msg, "Password aggiornata."); setTimeout(function () { location.href = next; }, 900);
    }, function (e) { say(msg, it(e), true); });
  });

  $("#outBtn").addEventListener("click", function () {
    Promise.resolve(c.auth.signOut()).then(function () { location.href = "index.html"; }, function () { location.href = "index.html"; });
  });

  c.auth.onAuthStateChange(function (event) {
    if (event === "PASSWORD_RECOVERY") { $("#boxIn").hidden = true; $("#boxOut").hidden = true; $("#boxRecover").hidden = false; }
  });
  setMode("in");
  Promise.resolve(c.auth.getSession()).then(function (r) {
    var user = r.data && r.data.session && r.data.session.user;
    if ($("#boxRecover").hidden === false) return;
    if (user) showOut(user); else showIn();
  }, function () { showIn(); });
});
