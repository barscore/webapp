import { useSyncExternalStore } from 'react';

// Interruttore della monetizzazione (`app_settings.monetization_enabled`,
// pannello admin → Emergenza). App.jsx lo rilegge insieme a manutenzione e
// beta a ogni navigazione e lo pubblica qui; chi vende qualcosa o mostra un
// annuncio lo legge con useMonetization().
//
// Fail-closed: finché il valore non è arrivato, o se la lettura fallisce, vale
// spento. Niente script AdSense e niente bottoni d'acquisto "per un attimo"
// prima che arrivi la risposta.
let enabled = false;
const listeners = new Set();

export function setMonetization(value) {
  const next = value === true;
  if (next === enabled) return;
  enabled = next;
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const read = () => enabled;

/** true solo se la monetizzazione è accesa e la riga è stata letta. */
export function useMonetization() {
  return useSyncExternalStore(subscribe, read, read);
}
