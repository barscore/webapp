import { useRef } from 'react';

// Dove tornare dopo il login/registrazione. La pagina di partenza viene
// memorizzata ad ogni navigazione (App.jsx): in sessionStorage e non in
// location.state perché il giro OAuth di Google ricarica la pagina.
const KEY = 'rabar_auth_return';
const EXCLUDED = ['/login', '/register'];
// Ritorno promesso a un giro OAuth in corso. Chiave a parte: all'atterraggio
// App.jsx memorizza la pagina d'arrivo e sovrascriverebbe KEY.
const PENDING_KEY = 'rabar_auth_pending';
const PENDING_TTL_MS = 15 * 60 * 1000;

// Solo path interni: il valore finisce in navigate() e, per OAuth, concatenato
// a window.location.origin — un `//host` o un `https://host` sarebbe un
// open redirect. Guardare i primi due caratteri non basta: il parser degli URL
// toglie TAB e a capo, `/\t/evil.com` diventa `//evil.com`, e React Router, se
// pushState rifiuta un URL di un'altra origine, ci va con location.assign.
// Quindi niente spazi, controlli o backslash (un path vero arriva già
// codificato), e l'ultima parola la ha il parser stesso.
const PROBE_ORIGIN = 'https://rabar.invalid';

export function safePath(path) {
  if (typeof path !== 'string' || path[0] !== '/' || /[\s\\\u0000-\u001f\u007f]/.test(path)) return '/';
  try {
    return new URL(path, PROBE_ORIGIN).origin === PROBE_ORIGIN ? path : '/';
  } catch {
    return '/';
  }
}

export function rememberAuthReturn(path) {
  if (EXCLUDED.includes(path.split('?')[0])) return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* private mode: si perde il ritorno, non è un errore */
  }
}

function resolveAuthReturn() {
  const explicit = new URLSearchParams(window.location.search).get('redirectTo');
  if (explicit) return safePath(explicit);
  try {
    return safePath(sessionStorage.getItem(KEY));
  } catch {
    return '/';
  }
}

// Supabase accetta il redirectTo solo se è nella lista «Redirect URLs» del
// progetto; altrimenti rimanda al Site URL, cioè alla home. Il percorso si
// lascia qui prima di partire e App.jsx lo riprende quando arriva la sessione,
// così il ritorno non dipende da quella lista.
export function rememberPendingAuthReturn(path) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ path: safePath(path), at: Date.now() }));
  } catch {
    /* private mode: resta il redirectTo di Supabase */
  }
}

export function takePendingAuthReturn() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    const { path, at } = JSON.parse(raw);
    // Un giro abbandonato (Google chiuso, «indietro») non deve spostare
    // l'utente al login successivo, magari ore dopo.
    if (!(Date.now() - at < PENDING_TTL_MS)) return null;
    return safePath(path);
  } catch {
    return null;
  }
}

export const __test = { resolveAuthReturn };

// Risolto una volta sola al mount: submit e bottone Google devono usare lo
// stesso valore, anche dopo che la navigazione ha cambiato la history.
export function useAuthReturn() {
  const ref = useRef(null);
  if (ref.current === null) ref.current = resolveAuthReturn();
  return ref.current;
}
