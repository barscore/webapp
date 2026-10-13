// Accettazione di Privacy e Termini e dichiarazione di maggiore età.
//
// La spunta sta nel form di registrazione, ma un account nasce anche senza
// passare da lì: «Continua con Google» dalla pagina di login crea il profilo
// al primo accesso. Per questo l'accettazione è un dato dell'account
// (`terms_accepted_at` nei metadati utente di Supabase) e non un passaggio del
// form: chi non ce l'ha viene fermato da TermsGate, da qualunque porta entri.
//
// Il redirect OAuth non porta metadati con sé: chi spunta la casella in
// Register e poi sceglie Google lascia qui un segno, che useAuth trasforma in
// accettazione al ritorno — così non gli viene chiesta due volte.

const TICK_KEY = 'rabar_terms_tick';
// Il giro da Google dura secondi; mezz'ora copre anche chi si ferma a scegliere
// l'account, senza far valere la spunta per un accesso di un altro giorno.
const TICK_TTL_MS = 30 * 60 * 1000;

// Le pagine che l'utente deve poter leggere prima di accettare.
const READABLE = ['/privacy', '/tos'];

export function rememberTermsTick(now = Date.now()) {
  try {
    localStorage.setItem(TICK_KEY, String(now));
  } catch {
    /* storage bloccato: al ritorno lo chiederà TermsGate */
  }
}

export function hasTermsTick(now = Date.now()) {
  let raw = null;
  try {
    raw = localStorage.getItem(TICK_KEY);
  } catch {
    return false;
  }
  const at = Number(raw);
  return raw !== null && Number.isFinite(at) && now >= at && now - at < TICK_TTL_MS;
}

export function clearTermsTick() {
  try {
    localStorage.removeItem(TICK_KEY);
  } catch {
    /* storage bloccato */
  }
}

/** true se TermsGate deve coprire questa pagina. */
export function termsGateOpen(termsRequired, pathname) {
  return !!termsRequired && !READABLE.includes(pathname);
}
