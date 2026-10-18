import { api } from './api.js';

// Interazioni con i bar per le statistiche dei proprietari (backend
// routes/stats.js): scansioni del QR/NFC del locale, aperture della scheda,
// «Indicazioni» / «Chiama» / «Sito». Il proprietario vede solo totali.
//
// Il dispositivo si riconosce da un UUID casuale tenuto in localStorage, mai
// da altro, e non viene mai legato all'account (il backend non apre il token
// su /stats/events e il ping non lo riceve): serve a non contare due volte lo
// stesso refresh e a seguire, per dispositivo, il percorso scansione →
// registrazione → recensione. Statistica aggregata assimilabile ai cookie
// tecnici, senza consenso: tenerla così.
// Best-effort in tutto: niente di qui deve mai far fallire la pagina.

const VISITOR_KEY = 'rabar:visitor-id';
const PING_KEY = 'rabar:active-ping';
const PING_EVERY_MS = 6 * 60 * 60 * 1000;
const FLUSH_DELAY_MS = 1500;
const MAX_BATCH = 20;

let memoryVisitor = null;

// randomUUID esiste solo in un contesto sicuro: in sviluppo dall'IP di casa
// (http://192.168…) manca, getRandomValues no.
function newUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = newUuid();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Storage bloccato (navigazione privata su vecchi Safari): un id per la
    // sola sessione è meglio di nessuno.
    memoryVisitor ??= newUuid();
    return memoryVisitor;
  }
}

let queue = [];
let timer = null;

function flush() {
  clearTimeout(timer);
  timer = null;
  if (!queue.length) return;
  const events = queue.splice(0, MAX_BATCH);
  api.post('/stats/events', { visitor_id: visitorId(), events }).catch(() => {});
  if (queue.length) flush();
}

/**
 * Registra un'interazione con un bar del nostro DB (serve l'uuid: un posto
 * OSM non ancora salvato non ha un proprietario a cui mostrarla).
 *   kind   'scan' | 'view' | 'directions' | 'call' | 'website' | 'review'
 *   source per 'scan': 'qr' | 'nfc'; per 'view': 'map' | 'list' | 'search' |
 *          'link' | 'qr' | 'nfc'; niente per i pulsanti e per 'review' (una
 *          recensione nuova appena pubblicata da qui: solo il fatto).
 * Le scansioni partono subito: chi apre il tag spesso chiude la pagina dopo
 * pochi secondi.
 */
export function trackBar(barId, kind, source) {
  if (!barId) return;
  queue.push(source ? { bar_id: barId, kind, source } : { bar_id: barId, kind });
  if (kind === 'scan' || queue.length >= MAX_BATCH) flush();
  else timer ??= setTimeout(flush, FLUSH_DELAY_MS);
}

/** Da questo dispositivo è appena nato un account (non si dice quale). */
export function trackSignup() {
  queue.push({ kind: 'signup' });
  flush();
}

/**
 * Da chi è loggato, al massimo ogni qualche ora: fa contare l'utente tra gli
 * attivi del pannello admin. Non manda il dispositivo.
 */
export function pingActive(userId) {
  if (!userId) return;
  try {
    const last = JSON.parse(localStorage.getItem(PING_KEY) || 'null');
    if (last?.user === userId && Date.now() - last.at < PING_EVERY_MS) return;
    localStorage.setItem(PING_KEY, JSON.stringify({ user: userId, at: Date.now() }));
  } catch {
    // Senza storage si pinga a ogni avvio: il backend scrive comunque al
    // massimo ogni 10 minuti.
  }
  api.post('/stats/ping', {}).catch(() => {});
}

if (typeof document !== 'undefined') {
  // Chi chiude la scheda o passa a un'altra app non aspetta il timer.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
