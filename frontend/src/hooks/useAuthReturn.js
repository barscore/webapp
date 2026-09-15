import { useRef } from 'react';

// Dove tornare dopo il login/registrazione. La pagina di partenza viene
// memorizzata ad ogni navigazione (App.jsx): in sessionStorage e non in
// location.state perché il giro OAuth di Google ricarica la pagina.
const KEY = 'rabar_auth_return';
const EXCLUDED = ['/login', '/register'];

// Solo path interni: il valore finisce in navigate() e, per OAuth, concatenato
// a window.location.origin — un `//host` o un `https://host` sarebbe un
// open redirect.
function safePath(path) {
  if (!path || path[0] !== '/' || path[1] === '/' || path[1] === '\\') return '/';
  return path;
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

export const __test = { resolveAuthReturn };

// Risolto una volta sola al mount: submit e bottone Google devono usare lo
// stesso valore, anche dopo che la navigazione ha cambiato la history.
export function useAuthReturn() {
  const ref = useRef(null);
  if (ref.current === null) ref.current = resolveAuthReturn();
  return ref.current;
}
