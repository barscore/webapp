// Identità del titolare / prestatore del servizio.
//
// PERCHÉ ESISTE QUESTO FILE, E PERCHÉ VA COMPILATO PRIMA DI PUBBLICARE:
//
//   * GDPR art. 13(1)(a) — l'informativa deve indicare «l'identità e i dati di
//     contatto del titolare del trattamento». «Il gestore di rabar» non è
//     un'identità: non permette a nessuno di sapere chi risponde dei suoi dati.
//   * D.Lgs. 70/2003 art. 7 e Cod. Cons. art. 49 — dal momento in cui rabar
//     vende (rabar+ e i boost) è un operatore economico, e deve pubblicare in
//     modo facilmente accessibile denominazione, sede, partita IVA o codice
//     fiscale, un contatto rapido e, se iscritto, il numero REA.
//   * DSA artt. 11-12 — serve un punto di contatto per le autorità e uno per
//     gli utenti.
//
// Finché un campo vale DA_COMPILARE il sito NON è conforme su quel punto. Il
// segnaposto viene reso a schermo così com'è, di proposito: un buco visibile si
// chiude, uno nascosto dietro una stringa vuota resta lì per sempre.
//
// Un solo posto per tutte e tre le lingue e per entrambe le pagine legali:
// cambiare la sede o la P.IVA non deve voler dire ricordarsi di sei punti.

export const DA_COMPILARE = '[DA COMPILARE]';

export const entity = {
  /** Denominazione o nome e cognome del titolare. */
  denominazione: DA_COMPILARE,
  /** Via e numero civico. */
  indirizzo: DA_COMPILARE,
  /** CAP, città e provincia. */
  citta: DA_COMPILARE,
  paese: 'Italia',
  /** Partita IVA — obbligatoria se l'attività di vendita è in regime d'impresa. */
  partitaIva: DA_COMPILARE,
  /** Codice fiscale, se diverso dalla partita IVA o in assenza di questa. */
  codiceFiscale: DA_COMPILARE,
  /** Numero REA, se iscritto al Registro delle Imprese. */
  rea: DA_COMPILARE,

  // Le tre caselle esistono già nel codice: privacy@ e abuse@ sono usate dalle
  // pagine legali, martino.parisi@ è il mittente VAPID delle notifiche push
  // (backend/src/lib/notify.js) e il contatto dello User-Agent verso
  // OpenStreetMap (backend/src/lib/osm.js).
  emailPrivacy: 'privacy@rabar.it',
  emailAbuse: 'abuse@rabar.it',
  emailGenerale: 'martino.parisi@rabar.it',
  /** PEC, se attiva. Facoltativa. */
  pec: DA_COMPILARE,
};

/** true se un campo è ancora da compilare — le pagine lo usano per evidenziarlo. */
export const mancante = (v) => v === DA_COMPILARE;

/** Sede su una riga sola, come va scritta nell'informativa. */
export const sedeCompleta = () =>
  [entity.indirizzo, entity.citta, entity.paese].filter(Boolean).join(', ');
