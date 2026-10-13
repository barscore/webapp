import { entity } from '../legal/entity.js';

// Editorial pages: /come-funziona, /faq, /chi-siamo, /contatti.
// One source for both the React page (pages/ContentPage.jsx) and the static
// HTML written at build time (scripts/prerender.mjs) — plain ESM, no JSX.
// Italian first; every other UI language gets the English copy, as the legal
// pages do. Paragraphs are plain text: e-mail addresses become mailto links
// when rendered.
//
// Shape: { title, description, intro: [p], sections: [{ h, p: [p] }] }
// FAQ sections are question/answer pairs (the prerender emits FAQPage JSON-LD).

const mail = entity.emailGenerale;

export const CONTENT_SLUGS = ['come-funziona', 'faq', 'chi-siamo', 'contatti'];

export const PAGES = {
  'come-funziona': {
    it: {
      title: 'Come funziona rabar',
      description:
        'Come si vota un bar su rabar: i cinque assi (prezzo, qualità dei drink, socialità, varietà, orari), la scala da 1 a 5 e come nasce il punteggio in decimi.',
      intro: [
        'rabar è una mappa di bar votati da chi ci va davvero. Invece di una stella sola, ogni recensione valuta il locale su cinque aspetti distinti: così un bar economico ma sempre vuoto non ha lo stesso voto di un cocktail bar caro ma pieno di vita, e puoi scegliere in base a quello che cerchi stasera.',
      ],
      sections: [
        {
          h: 'I cinque assi',
          p: [
            'Prezzo — quanto spendi rispetto a quello che ricevi. Qui il voto alto è buono per il portafoglio: 1 vuol dire caro, 5 vuol dire economico.',
            'Qualità dei drink — com’è fatto quello che bevi: dosi, ingredienti, cura nella preparazione, bicchiere giusto. 1 = scarsa, 5 = ottima.',
            'Socialità — l’atmosfera. C’è gente, si chiacchiera, si conosce qualcuno, oppure è un locale silenzioso? 1 = morto, 5 = vivace. Non è un giudizio morale: un 2 può essere esattamente il posto tranquillo che cerchi.',
            'Varietà — quanta scelta c’è: carta dei cocktail, birre, vini, analcolici, qualcosa da mangiare. 1 = poca scelta, 5 = ampia scelta.',
            'Orari — quanto sono comodi gli orari di apertura: aperto la sera tardi, nel weekend, all’ora dell’aperitivo. 1 = scomodi, 5 = comodi.',
          ],
        },
        {
          h: 'Dal voto al punteggio',
          p: [
            'Ogni asse si vota con un numero intero da 1 a 5. Per ogni bar rabar calcola la media di ciascun asse su tutte le recensioni, e il punteggio complessivo è la media dei cinque assi. Il calcolo lo fa il database a ogni voto nuovo, modificato o cancellato: nessuno lo ritocca a mano.',
            'Nell’app il punteggio è mostrato in decimi (la media moltiplicata per due), perché è la scala che tutti leggono a colpo d’occhio. Il verde segna i bar da 7 in su, l’arancione quelli sotto, il grigio i bar che non hanno ancora recensioni.',
            'Il grafico a radar della scheda di ogni bar disegna i cinque assi insieme: una forma ampia e regolare vuol dire un locale bilanciato, una punta lunga su un asse solo racconta il suo punto di forza.',
          ],
        },
        {
          h: 'Chi può votare',
          p: [
            'Per recensire serve un account gratuito e bisogna avere almeno 18 anni, perché si parla di locali che servono alcolici. Ogni persona può lasciare una sola recensione per bar: se cambi idea la modifichi, non ne aggiungi un’altra. Il commento scritto è facoltativo, fino a 500 caratteri, ed è la parte più utile per chi legge dopo di te.',
            'Il proprietario di un bar può rivendicarne la scheda dimostrando di esserlo; dopo la verifica dello staff può rispondere pubblicamente alle recensioni, ma non può cancellarle né modificarle.',
          ],
        },
        {
          h: 'Bar sponsorizzati',
          p: [
            'I proprietari possono mettere in evidenza il proprio bar per un periodo limitato. Un bar sponsorizzato compare più in alto nelle liste ed è sempre segnato come tale; la sponsorizzazione non cambia i voti né il punteggio, che restano quelli dati dagli utenti.',
          ],
        },
        {
          h: 'Da dove vengono i bar',
          p: [
            'L’elenco dei locali e la mappa vengono da OpenStreetMap, la mappa libera costruita dai volontari. Se un bar manca o ha dati sbagliati puoi segnalarlo dall’app con «Segnala un bar»: lo aggiungiamo o lo correggiamo dopo un controllo.',
          ],
        },
      ],
    },
    en: {
      title: 'How rabar works',
      description:
        'How bars are rated on rabar: the five axes (price, drinks quality, vibe, variety, opening hours), the 1–5 scale and how the score out of ten is built.',
      intro: [
        'rabar is a map of bars rated by the people who actually go there. Instead of a single star, every review scores the venue on five separate aspects: a cheap bar that is always empty doesn’t get the same score as a pricey cocktail bar full of life, and you can pick based on what you are after tonight.',
      ],
      sections: [
        {
          h: 'The five axes',
          p: [
            'Price — what you pay for what you get. A high score is good for your wallet: 1 means expensive, 5 means cheap.',
            'Drinks quality — how well your drink is made: measures, ingredients, care, the right glass. 1 = poor, 5 = excellent.',
            'Vibe — the atmosphere. Is it crowded and chatty, a place to meet people, or a quiet spot? 1 = dead, 5 = lively. It isn’t a moral judgement: a 2 may be exactly the quiet place you want.',
            'Variety — how much choice there is: cocktail list, beers, wines, alcohol-free options, something to eat. 1 = little choice, 5 = wide choice.',
            'Opening hours — how convenient they are: open late, at weekends, at aperitivo time. 1 = inconvenient, 5 = convenient.',
          ],
        },
        {
          h: 'From votes to score',
          p: [
            'Each axis is rated with a whole number from 1 to 5. For every bar rabar averages each axis over all reviews, and the overall score is the mean of the five axes. The database recomputes it on every new, edited or deleted review: nobody adjusts it by hand.',
            'The app shows the score out of ten (the average times two), because that is the scale everyone reads at a glance. Green marks bars scoring 7 or more, orange those below, grey the bars with no reviews yet.',
            'The radar chart on each bar page draws the five axes together: a wide, even shape means a balanced venue, a long spike on one axis tells you its strong point.',
          ],
        },
        {
          h: 'Who can rate',
          p: [
            'Reviewing needs a free account and you must be at least 18, since these are venues serving alcohol. Each person can leave one review per bar: if you change your mind you edit it rather than add another. The written comment is optional, up to 500 characters, and it is the most useful part for whoever reads after you.',
            'A bar owner can claim the bar’s page by proving they run it; once staff have verified the claim they can reply publicly to reviews, but they cannot delete or edit them.',
          ],
        },
        {
          h: 'Sponsored bars',
          p: [
            'Owners can promote their bar for a limited time. A sponsored bar is listed higher and is always labelled as such; sponsorship never changes the ratings or the score, which stay the ones users gave.',
          ],
        },
        {
          h: 'Where the bars come from',
          p: [
            'The list of venues and the map come from OpenStreetMap, the free map built by volunteers. If a bar is missing or its details are wrong you can report it from the app with “Suggest a bar”: we add or fix it after a check.',
          ],
        },
      ],
    },
  },

  faq: {
    it: {
      title: 'Domande frequenti',
      description:
        'Risposte alle domande più comuni su rabar: costi, recensioni, punteggi, bar mancanti, proprietari, rabar+ e privacy.',
      intro: ['Le domande che ci fanno più spesso. Se la tua non c’è, scrivici a ' + mail + '.'],
      sections: [
        {
          h: 'rabar è gratis?',
          p: [
            'Sì. Guardare la mappa, leggere le recensioni e votare è gratuito. Esiste un abbonamento facoltativo, rabar+, che toglie la pubblicità e sblocca i temi grafici: non dà nessun vantaggio sui voti.',
          ],
        },
        {
          h: 'Devo registrarmi per vedere i bar?',
          p: [
            'No. La mappa, i punteggi e le recensioni sono pubblici. L’account serve solo per votare, salvare i bar preferiti e seguire eventi e organizzatori.',
          ],
        },
        {
          h: 'Come viene calcolato il punteggio di un bar?',
          p: [
            'Ogni recensione dà un voto da 1 a 5 su cinque assi. Il punteggio del bar è la media dei cinque assi, mostrata in decimi. Il dettaglio è nella pagina «Come funziona».',
          ],
        },
        {
          h: 'Perché il prezzo più alto è un voto migliore?',
          p: [
            'Perché tutti gli assi vanno nella stessa direzione: 5 è sempre il lato buono. Sul prezzo il lato buono è spendere poco, quindi 5 vuol dire economico.',
          ],
        },
        {
          h: 'Posso votare lo stesso bar più volte?',
          p: [
            'No, una recensione per persona per bar. Puoi modificarla o cancellarla quando vuoi, per esempio dopo esserci tornato.',
          ],
        },
        {
          h: 'Il mio bar preferito non c’è. Come lo aggiungo?',
          p: [
            'Usa «Segnala un bar» nell’app, anche senza account: indica nome e zona, lo controlliamo e lo mettiamo sulla mappa.',
          ],
        },
        {
          h: 'Sono il proprietario di un bar: cosa posso fare?',
          p: [
            'Dalla scheda del tuo bar puoi rivendicarlo allegando una prova (per esempio una visura o una foto dell’insegna con un documento). Dopo la verifica puoi rispondere alle recensioni e, se vuoi, sponsorizzare il locale. Non puoi rimuovere recensioni negative: se una recensione viola le regole, segnalala.',
          ],
        },
        {
          h: 'Una recensione è offensiva o falsa. Cosa faccio?',
          p: [
            'Segnalala dal menu account con «Segnala», oppure scrivi a ' + entity.emailAbuse + '. Lo staff la esamina e rimuove i contenuti che violano i Termini.',
          ],
        },
        {
          h: 'Cosa sono i cubetti di ghiaccio?',
          p: [
            'Sono i punti della classifica: ogni recensione ne vale 10. La classifica mostra chi contribuisce di più alla mappa.',
          ],
        },
        {
          h: 'Cosa fate con i miei dati?',
          p: [
            'Il minimo per far funzionare il servizio. Alla prima visita Google ti chiede il consenso per la pubblicità: senza, niente annunci personalizzati né cookie pubblicitari, e puoi cambiare idea in qualsiasi momento dalle Impostazioni. Tutti i dettagli sono nell’informativa privacy.',
          ],
        },
      ],
    },
    en: {
      title: 'Frequently asked questions',
      description:
        'Answers to the most common questions about rabar: cost, reviews, scores, missing bars, owners, rabar+ and privacy.',
      intro: ['The questions we get asked most. If yours isn’t here, write to ' + mail + '.'],
      sections: [
        {
          h: 'Is rabar free?',
          p: [
            'Yes. Browsing the map, reading reviews and rating bars is free. There is an optional subscription, rabar+, that removes ads and unlocks the colour themes: it gives no advantage on ratings.',
          ],
        },
        {
          h: 'Do I need an account to see the bars?',
          p: [
            'No. The map, scores and reviews are public. An account is only needed to rate, save favourite bars and follow events and organisers.',
          ],
        },
        {
          h: 'How is a bar’s score calculated?',
          p: [
            'Each review gives a 1 to 5 rating on five axes. The bar’s score is the mean of the five axes, shown out of ten. The details are on the “How it works” page.',
          ],
        },
        {
          h: 'Why is a higher price rating better?',
          p: [
            'Because every axis points the same way: 5 is always the good side. For price the good side is spending little, so 5 means cheap.',
          ],
        },
        {
          h: 'Can I rate the same bar more than once?',
          p: [
            'No, one review per person per bar. You can edit or delete it at any time, for example after going back.',
          ],
        },
        {
          h: 'My favourite bar is missing. How do I add it?',
          p: [
            'Use “Suggest a bar” in the app, no account needed: give us the name and area, we check it and put it on the map.',
          ],
        },
        {
          h: 'I own a bar: what can I do?',
          p: [
            'From your bar’s page you can claim it by attaching proof (for example a business registry extract or a photo of the sign with an ID). Once verified you can reply to reviews and, if you like, sponsor the venue. You cannot remove negative reviews: if a review breaks the rules, report it.',
          ],
        },
        {
          h: 'A review is offensive or fake. What do I do?',
          p: [
            'Report it from the account menu with “Report”, or write to ' + entity.emailAbuse + '. Staff review it and remove content that breaks the Terms.',
          ],
        },
        {
          h: 'What are ice cubes?',
          p: [
            'They are the leaderboard points: each review is worth 10. The leaderboard shows who contributes most to the map.',
          ],
        },
        {
          h: 'What do you do with my data?',
          p: [
            'The minimum needed to run the service. On your first visit Google asks for your consent to advertising: without it, no personalised ads and no advertising cookies, and you can change your mind any time from Settings. All the details are in the privacy policy.',
          ],
        },
      ],
    },
  },

  'chi-siamo': {
    it: {
      title: 'Chi siamo',
      description:
        'rabar è un progetto indipendente nato a Rovereto, in Trentino: una mappa dei bar costruita dalle recensioni di chi li frequenta.',
      intro: [
        'rabar è un progetto indipendente nato a Rovereto, in Trentino, da un’idea di Martino Parisi.',
      ],
      sections: [
        {
          h: 'Perché esiste',
          p: [
            'Scegliere dove bere qualcosa dovrebbe essere semplice, e invece le recensioni generaliste mescolano tutto in una stella sola: il ristorante, il servizio, il parcheggio. A chi cerca un bar interessano poche cose precise — quanto costa, come sono i drink, che aria tira, quanta scelta c’è, fino a che ora è aperto — e rabar misura esattamente quelle.',
            'In Italia ci sono circa 150.000 bar, e molti dei migliori sono piccoli locali di quartiere che non compaiono in nessuna guida. Una mappa fatta dalla community dà visibilità anche a loro, e permette a chi arriva in una città nuova di trovare subito il posto giusto.',
          ],
        },
        {
          h: 'Dove siamo',
          p: [
            'Partiamo dal Trentino e dal Veneto — Rovereto, Trento, Riva del Garda, Verona — dove la community è più attiva, ma la mappa copre tutta Italia e ogni città cresce con le recensioni di chi la vive.',
          ],
        },
        {
          h: 'Come ci sosteniamo',
          p: [
            'rabar è gratuito. Lo sostengono la pubblicità (personalizzata solo con il tuo consenso), l’abbonamento facoltativo rabar+ e le sponsorizzazioni dei locali, sempre dichiarate. Nessuno di questi può comprare un voto: i punteggi sono solo quelli dati dagli utenti.',
          ],
        },
        {
          h: 'Principi',
          p: [
            'Una persona, una recensione per bar. Punteggi calcolati automaticamente, mai ritoccati. Sponsorizzazioni sempre etichettate. Dati personali ridotti al minimo. Mappe e dati dei locali da OpenStreetMap, un progetto libero a cui restituiamo il merito.',
          ],
        },
      ],
    },
    en: {
      title: 'About us',
      description:
        'rabar is an independent project born in Rovereto, Trentino: a map of bars built from the reviews of the people who go there.',
      intro: ['rabar is an independent project born in Rovereto, Trentino, from an idea by Martino Parisi.'],
      sections: [
        {
          h: 'Why it exists',
          p: [
            'Choosing where to have a drink should be simple, yet general review sites squash everything into a single star: the food, the service, the parking. Someone looking for a bar cares about a few precise things — what it costs, how good the drinks are, what the vibe is like, how much choice there is, how late it stays open — and rabar measures exactly those.',
            'Italy has around 150,000 bars, and many of the best are small neighbourhood places no guide mentions. A community-made map gives them visibility too, and helps anyone arriving in a new city find the right place straight away.',
          ],
        },
        {
          h: 'Where we are',
          p: [
            'We start from Trentino and Veneto — Rovereto, Trento, Riva del Garda, Verona — where the community is most active, but the map covers all of Italy and every city grows with the reviews of the people who live there.',
          ],
        },
        {
          h: 'How we fund it',
          p: [
            'rabar is free. It is funded by advertising (personalised only with your consent), the optional rabar+ subscription and venue sponsorships, always disclosed. None of these can buy a rating: scores are only the ones users give.',
          ],
        },
        {
          h: 'Principles',
          p: [
            'One person, one review per bar. Scores computed automatically, never adjusted. Sponsorships always labelled. Personal data kept to a minimum. Maps and venue data from OpenStreetMap, a free project we credit.',
          ],
        },
      ],
    },
  },

  contatti: {
    it: {
      title: 'Contatti',
      description: 'Come contattare rabar: informazioni generali, privacy, segnalazioni di contenuti, proprietari di bar.',
      intro: ['Scegli l’indirizzo giusto per quello che ti serve: così la richiesta arriva subito a chi può gestirla.'],
      sections: [
        { h: 'Informazioni generali e collaborazioni', p: ['Scrivi a ' + mail + '.'] },
        {
          h: 'Privacy e dati personali',
          p: ['Per accedere, correggere o cancellare i tuoi dati scrivi a ' + entity.emailPrivacy + '.'],
        },
        {
          h: 'Segnalare un contenuto',
          p: [
            'Recensioni offensive, false o illecite: usa «Segnala» dal menu account, oppure scrivi a ' +
              entity.emailAbuse + ' indicando il bar e la recensione.',
          ],
        },
        {
          h: 'Aggiungere o correggere un bar',
          p: ['Usa «Segnala un bar» nell’app: non serve un account.'],
        },
        {
          h: 'Proprietari di bar',
          p: [
            'Per gestire la scheda del tuo locale, rispondere alle recensioni o sponsorizzarlo, rivendica il bar dalla sua pagina. Per domande scrivi a ' + mail + '.',
          ],
        },
      ],
    },
    en: {
      title: 'Contact',
      description: 'How to contact rabar: general enquiries, privacy, content reports, bar owners.',
      intro: ['Pick the right address for what you need, so your request reaches the right person straight away.'],
      sections: [
        { h: 'General enquiries and partnerships', p: ['Write to ' + mail + '.'] },
        {
          h: 'Privacy and personal data',
          p: ['To access, correct or delete your data write to ' + entity.emailPrivacy + '.'],
        },
        {
          h: 'Reporting content',
          p: [
            'Offensive, fake or unlawful reviews: use “Report” from the account menu, or write to ' +
              entity.emailAbuse + ' naming the bar and the review.',
          ],
        },
        { h: 'Adding or fixing a bar', p: ['Use “Suggest a bar” in the app: no account needed.'] },
        {
          h: 'Bar owners',
          p: [
            'To manage your venue’s page, reply to reviews or sponsor it, claim the bar from its page. For questions write to ' + mail + '.',
          ],
        },
      ],
    },
  },
};

/** Italian copy for `it`, English for every other language. */
export const pageCopy = (slug, lang) => PAGES[slug]?.[lang === 'it' ? 'it' : 'en'];

/** Splits a paragraph into text and e-mail parts: [{ text } | { email }]. */
export function splitEmails(text) {
  return text
    .split(/([\w.+-]+@[\w-]+\.[\w.]+[a-z])/i)
    .filter(Boolean)
    .map((part) => (/^[\w.+-]+@[\w-]+\.[\w.]+[a-z]$/i.test(part) ? { email: part } : { text: part }));
}
