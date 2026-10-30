/* Configurazione del collegamento al database.
   - backend "platform": versione su claude.ai (usa il database della piattaforma).
   - backend "supabase": versione pubblica con dominio proprio (usa il progetto Supabase qui sotto).
   L'indirizzo e la chiave pubblica (publishable) possono stare nelle pagine: i dati sono protetti dalle regole del database.
   Non inserire MAI qui la chiave "secret" o "service_role". */
window.SITE_CONFIG = {
  backend: "supabase",
  supabaseUrl: "https://csocwhaebojzlftmnjxs.supabase.co",
  supabaseKey: "sb_publishable_42pSmS_h_CSbeSk7LosEDw_mppq2RB2"
};
