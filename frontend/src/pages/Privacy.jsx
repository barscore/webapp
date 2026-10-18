import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';
import { entity, identificativi, mancante, sedeCompleta } from '../legal/entity.js';

// Informativa privacy (GDPR + CCPA/CPRA). I dati del titolare vivono in
// src/legal/entity.js: compilarli lì, non qui. L'italiano è la versione
// autorevole; ogni altra lingua della UI riceve la traduzione inglese.
// Vale per sito, app Android e app iOS: le app la mostrano (Android la
// rigenera con android/tools/gen-legal.mjs) o la aprono da qui.
export default function Privacy() {
  const { lang } = useI18n();
  return lang === 'it' ? <PrivacyIt /> : <PrivacyEn />;
}

const UPDATED_IT = '17 ottobre 2026';
const UPDATED_EN = 'October 17, 2026';

const linkClass = 'text-ember-ink hover:underline';

const mailTo = (address) => (
  <a href={`mailto:${address}`} className={linkClass}>
    {address}
  </a>
);

const extLink = (href, label) => (
  <a href={href} target="_blank" rel="noreferrer" className={linkClass}>
    {label}
  </a>
);

const privacyMail = mailTo(entity.emailPrivacy);
const abuseMail = mailTo(entity.emailAbuse);

// Campi ancora DA_COMPILARE in legal/entity.js: nascosti per ora, non
// evidenziati. Restano da compilare lì.
function Campo({ value }) {
  return mancante(value) ? null : <>{value}</>;
}

/** Blocco identificativo del titolare, uguale in entrambe le lingue. */
function Titolare() {
  return (
    <ul className="list-none space-y-0.5 pl-0">
      <li>
        <strong>
          <Campo value={entity.denominazione} />
        </strong>
      </li>
      <li>{sedeCompleta()}</li>
      {identificativi() && <li>{identificativi()}</li>}
    </ul>
  );
}

function List({ children }) {
  return <ul className="list-disc space-y-1.5 pl-5">{children}</ul>;
}

function PrivacyIt() {
  return (
    <LegalLayout title="Informativa sul trattamento dei dati personali" updated={UPDATED_IT}>
      <p>
        La presente informativa, resa ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679
        (di seguito, «GDPR») e, per gli utenti residenti negli Stati Uniti, della normativa statale
        applicabile (incluso il California Consumer Privacy Act, come modificato dal California
        Privacy Rights Act), descrive le modalità con cui sono trattati i dati personali degli
        utenti del sito web www.rabar.it e delle applicazioni rabar per Android e iOS (di seguito,
        il «Servizio»).
      </p>

      <Section title="1. Titolare del trattamento e contatti">
        <Titolare />
        <p>
          Le richieste relative al trattamento dei dati personali, ivi compreso l’esercizio dei
          diritti di cui alla sezione 10, possono essere inviate all’indirizzo {privacyMail}. Il
          medesimo indirizzo costituisce il punto di contatto per i destinatari del Servizio ai sensi
          dell’art. 12 del Regolamento (UE) 2022/2065 (di seguito, «DSA»). Le comunicazioni delle
          autorità e le segnalazioni di contenuti illeciti vanno invece indirizzate a {abuseMail}.
        </p>
      </Section>

      <Section title="2. Categorie di dati trattati">
        <List>
          <li>
            <strong>Dati dell’account:</strong> indirizzo email, nome utente e password, gestiti
            tramite il servizio di autenticazione Supabase Auth (la password è conservata in forma
            cifrata e non è mai accessibile al Titolare); data di registrazione; tipo di account
            (utente, PR, organizzatore, gestore di un locale); dichiarazione di maggiore età e data
            di accettazione dei Termini. In caso di accesso con Google o Apple, il fornitore
            trasmette l’indirizzo email (con Apple, eventualmente un indirizzo di inoltro) e, ove
            disponibile, l’immagine del profilo.
          </li>
          <li>
            <strong>Profilo pubblico:</strong> il nome utente, l’immagine del profilo, i
            contrassegni (rabar+, esploratore, tipo di account), il numero di valutazioni, gli ice
            cubes e la posizione in classifica sono <strong>visibili a chiunque</strong>, anche senza
            account, insieme ai contenuti pubblicati. I PR possono indicare, facoltativamente, un nome
            utente Instagram e un numero WhatsApp: tali dati sono mostrati pubblicamente nella pagina
            degli eventi ai quali il PR partecipa, affinché gli interessati possano contattarlo.
          </li>
          <li>
            <strong>Contenuti pubblicati:</strong> valutazioni sui cinque criteri (prezzo, qualità dei
            drink, socialità, varietà, orari), commenti, voti sui drink, risposte dei gestori alle
            valutazioni e, per gli account organizzatore, gli eventi con la relativa immagine e
            posizione.
          </li>
          <li>
            <strong>Attività nell’account, non pubbliche:</strong> locali salvati, eventi e
            organizzatori seguiti, notifiche ricevute, segnalazioni e suggerimenti di nuovi locali o
            drink (con l’eventuale recapito indicato volontariamente), richieste di account PR od
            organizzatore e rivendicazioni di locali.
          </li>
          <li>
            <strong>Free drink e codici QR personali:</strong> lo stato del free drink (spettante agli
            abbonati rabar+ e agli esploratori, si veda la sezione 5 dei Termini) e, al momento del
            riscatto, il locale, il gestore che lo ha convalidato e la data. Il codice QR del free
            drink e quello per l’ingresso agli eventi contengono un codice associato all’account: chi
            li scansiona (il gestore o l’organizzatore) ne verifica la validità e, per gli eventi,
            visualizza il nome utente.
          </li>
          <li>
            <strong>Dati di posizione:</strong> la geolocalizzazione, se autorizzata, è elaborata sul
            dispositivo per centrare la mappa. Le coordinate sono trasmesse ai nostri server al solo
            fine di individuare i locali nelle vicinanze e non sono memorizzate nel database; restano
            unicamente nei registri tecnici delle richieste per il tempo indicato alla sezione 7. Sono
            invece registrate le coordinate che l’utente inserisce volontariamente in un suggerimento
            o in un evento.
          </li>
          <li>
            <strong>Documentazione di verifica:</strong> i file caricati per rivendicare la gestione
            di un locale o per richiedere un account PR od organizzatore (si veda la sezione 6).
          </li>
          <li>
            <strong>Dati di acquisto:</strong> per rabar+ e per i boost sono conservati il canale di
            pagamento (Stripe sul sito, Google Play nell’app Android, Apple nell’app iOS), il
            prodotto, il piano, l’importo, lo stato, le date di acquisto e di scadenza e gli
            identificativi necessari a verificare l’acquisto e a gestire rinnovi e rimborsi
            (identificativo cliente e abbonamento Stripe, token d’acquisto e numero d’ordine di
            Google Play, identificativo della transazione Apple). I dati della carta di pagamento sono
            trattati esclusivamente da tali fornitori e non sono mai accessibili al Titolare.
          </li>
          <li>
            <strong>Dati tecnici:</strong> registri delle richieste (indirizzo IP, user agent,
            indirizzo richiesto) utilizzati per finalità di sicurezza, prevenzione degli abusi e
            limitazione del numero di richieste; sul sito, se l’utente attiva le notifiche, l’indirizzo
            di consegna fornito dal browser.
          </li>
          <li>
            <strong>Dati di utilizzo:</strong> le interazioni con le schede dei locali (apertura della
            scheda, anche tramite il codice QR o il tag NFC esposto nel locale; uso dei pulsanti
            Indicazioni, Chiama e Sito), con data e ora, associate a un identificativo casuale
            generato sul dispositivo, che <strong>non è mai collegato all’account</strong>: di ogni
            evento si registra soltanto se proviene da un utente che ha effettuato l’accesso, non da
            quale. Dal sito sono registrati allo stesso modo la pubblicazione di una nuova valutazione
            e la creazione di un account dal dispositivo, senza indicare quali. Per gli utenti
            registrati è inoltre conservata la data dell’ultimo utilizzo del Servizio.
          </li>
          <li>
            <strong>Dati di moderazione:</strong> eventuali sospensioni o blocchi dell’account, le
            relative motivazioni e il registro delle azioni compiute dal personale incaricato.
          </li>
        </List>
      </Section>

      <Section title="3. Finalità e basi giuridiche del trattamento">
        <List>
          <li>
            Erogazione del Servizio, inclusi profilo pubblico, contenuti, eventi, notifiche, free
            drink e funzionalità a pagamento: esecuzione del contratto (art. 6, par. 1, lett. b GDPR).
          </li>
          <li>
            Verifica dell’identità di chi rivendica un locale o richiede un account organizzatore:
            esecuzione del contratto e legittimo interesse a prevenire sostituzioni di persona (art.
            6, par. 1, lett. b e f GDPR).
          </li>
          <li>
            Sicurezza del Servizio, prevenzione di spam e abusi, moderazione dei contenuti, anche
            mediante il controllo automatico descritto nella sezione 4: legittimo interesse (art. 6,
            par. 1, lett. f GDPR) e adempimento degli obblighi previsti dal DSA (art. 6, par. 1, lett.
            c GDPR).
          </li>
          <li>
            Adempimenti fiscali e contabili connessi alle vendite: obbligo di legge (art. 6, par. 1,
            lett. c GDPR).
          </li>
          <li>
            Accertamento, esercizio o difesa di un diritto, anche in relazione a contestazioni sulle
            decisioni di moderazione: legittimo interesse (art. 6, par. 1, lett. f GDPR).
          </li>
          <li>
            Statistiche sull’uso del Servizio (nuovi iscritti, utenti attivi) e statistiche fornite
            ai gestori dei locali sulla propria scheda (aperture tramite QR e NFC, recensioni,
            visualizzazioni, utilizzo dei pulsanti): legittimo interesse del Titolare a misurare il
            funzionamento del Servizio e a offrire ai locali un riscontro sulla propria presenza
            (art. 6, par. 1, lett. f GDPR). I gestori ricevono soltanto <strong>numeri aggregati</strong>,
            mai dati che consentano di identificare i singoli utenti. L’identificativo del dispositivo
            serve unicamente a produrre tali statistiche, non è collegato all’account né incrociato con
            altri dati: per questo, secondo le linee guida del Garante del 10 giugno 2021, è assimilato
            agli strumenti tecnici e non richiede il consenso. Non essendo collegati all’account, questi
            dati non possono essere ricondotti al singolo utente (art. 11 GDPR).
          </li>
          <li>
            Pubblicità tramite Google AdSense sul sito web e Google AdMob nelle applicazioni:
            per gli annunci personalizzati e per l’uso di cookie e identificatori pubblicitari,
            consenso dell’interessato (art. 6, par. 1, lett. a GDPR), revocabile in qualsiasi
            momento; per gli annunci non personalizzati o limitati, legittimo interesse del Titolare a
            sostenere economicamente un Servizio offerto gratuitamente (art. 6, par. 1, lett. f
            GDPR).
          </li>
        </List>
        <p>
          Il conferimento dei dati dell’account è necessario per registrarsi; senza di essi il
          Servizio resta consultabile senza account. Il conferimento degli altri dati è facoltativo.
        </p>
      </Section>

      <Section title="4. Destinatari e fornitori di servizi">
        <p>
          Per l’erogazione del Servizio il Titolare si avvale dei seguenti fornitori, che operano in
          qualità di responsabili del trattamento o di titolari autonomi:
        </p>
        <List>
          <li>
            <strong>Supabase</strong> — autenticazione, database e archiviazione dei file. I dati
            sono ospitati nell’Unione europea (Irlanda).
          </li>
          <li>
            <strong>Vercel</strong> — hosting del sito web e dell’API, inclusi i registri delle
            richieste.
          </li>
          <li>
            <strong>Stripe</strong> — pagamenti effettuati sul sito, fatturazione e portale di
            gestione dell’abbonamento.
          </li>
          <li>
            <strong>Google Play</strong> — pagamenti effettuati nell’app Android, rinnovi, ricevute e
            rimborsi; il Servizio ne verifica gli acquisti tramite le API di Google.
          </li>
          <li>
            <strong>Apple</strong> — pagamenti effettuati nell’app iOS e verifica dei relativi
            acquisti; accesso con Apple.
          </li>
          <li>
            <strong>Google</strong> — accesso con Google; nell’app Android, lettura dei codici QR
            tramite il lettore dei servizi Google Play, che raccoglie dati tecnici del dispositivo
            e dell’app a fini diagnostici.
          </li>
          <li>
            <strong>OpenAI</strong> — controllo automatico dei contenuti destinati alla
            pubblicazione (testi di valutazioni, risposte ed eventi, immagini degli eventi, nomi
            utente), al solo fine di impedire la pubblicazione di contenuti vietati dai Termini.
            Riceve il contenuto ma non l’identità dell’autore e, secondo le condizioni del
            fornitore, non lo utilizza per l’addestramento dei propri modelli.
          </li>
          <li>
            <strong>OpenFreeMap</strong> e <strong>OpenStreetMap</strong> — forniscono la mappa di
            sfondo, le cui porzioni sono scaricate direttamente dal dispositivo dell’utente, che
            comunica pertanto a tali servizi l’indirizzo IP e l’area geografica visualizzata. Il sito
            utilizza OpenFreeMap e, qualora non sia raggiungibile, i server di OpenStreetMap; le
            applicazioni utilizzano i server di OpenStreetMap.
          </li>
          <li>
            I server pubblici <strong>Overpass</strong>, <strong>Nominatim</strong> e{' '}
            <strong>Photon (komoot)</strong> — ricerca dei locali e dei luoghi. Sono interrogati dai
            server del Servizio, mai dal dispositivo dell’utente, e ricevono unicamente l’area
            geografica visualizzata o il testo cercato, senza alcun dato che identifichi l’utente.
          </li>
          <li>
            <strong>Google Fonts</strong> — sul sito, i caratteri tipografici sono scaricati dai
            server di Google, che ricevono l’indirizzo IP e i dati tecnici del browser.
          </li>
          <li>
            <strong>Google AdSense</strong> e <strong>Google AdMob</strong> — pubblicità sul sito web
            e nelle applicazioni, personalizzata soltanto previo consenso. Su iOS l’utilizzo
            dell’identificativo pubblicitario richiede inoltre l’autorizzazione al tracciamento
            prevista dal sistema operativo.
          </li>
          <li>
            I <strong>servizi di notifica push</strong> del browser (Google, Mozilla, Apple), qualora
            l’utente attivi le notifiche sul sito.
          </li>
        </List>
        <p>
          Ciascun fornitore tratta i dati in conformità alla propria informativa. I dati possono
          inoltre essere comunicati ai consulenti del Titolare vincolati alla riservatezza (ad
          esempio per gli adempimenti fiscali) e alle autorità, ove previsto dalla legge. I gestori
          dei locali e gli organizzatori ricevono soltanto i dati descritti nelle sezioni 2 e 3. I
          dati non sono venduti.
        </p>
        <p>
          <strong>Processi decisionali automatizzati.</strong> Il controllo automatico dei contenuti
          può impedire la pubblicazione di un testo o di un’immagine, o sostituire un nome utente con
          uno generico; non comporta decisioni con effetti giuridici o di analoga rilevanza ai sensi
          dell’art. 22 GDPR. La rimozione di contenuti pubblicati e la sospensione degli account
          sono decise da persone, e ogni decisione può essere contestata come previsto dai Termini.
        </p>
      </Section>

      <Section title="5. Trasferimenti di dati verso paesi terzi">
        <p>
          Alcuni fornitori (Google, Stripe, Vercel, Apple, OpenAI, Supabase) hanno sede o
          infrastrutture negli Stati Uniti. I trasferimenti avvengono sulla base della decisione di
          adeguatezza relativa all’<em>EU–U.S. Data Privacy Framework</em> per i fornitori aderenti
          e, in mancanza, sulla base delle clausole contrattuali standard adottate dalla Commissione
          europea, integrate dalle misure supplementari previste dal capo V del GDPR. I server di
          OpenStreetMap si trovano anche nel Regno Unito, oggetto di una decisione di adeguatezza.
          Copia delle garanzie adottate può essere richiesta all’indirizzo {privacyMail}.
        </p>
      </Section>

      <Section title="6. Documentazione di verifica">
        <p>
          Per rivendicare la gestione di un locale o richiedere un account PR od organizzatore è
          richiesto il caricamento da uno a tre file (immagini o PDF, di dimensione massima pari a 8
          MB ciascuno) idonei a comprovare quanto dichiarato, quali una visura camerale, un documento
          o materiale relativo a un evento. Il trattamento si fonda sull’esecuzione del contratto e
          sul legittimo interesse del Titolare a non attribuire la gestione di un locale a soggetti
          non legittimati.
        </p>
        <p>
          I file sono conservati in un archivio <strong>privato</strong>, privo di indirizzi
          pubblici. Il dispositivo dell’utente non dispone di credenziali di scrittura permanenti:
          ogni caricamento è autorizzato singolarmente dal server e limitato alla cartella
          dell’utente. La consultazione è riservata al personale incaricato dell’esame della
          richiesta, mediante collegamenti a scadenza automatica.
        </p>
        <p>
          <strong>Conservazione:</strong> in caso di rigetto della richiesta i file sono cancellati;
          in caso di accoglimento sono conservati quale prova della verifica effettuata e cancellati
          contestualmente all’eliminazione dell’account.
        </p>
      </Section>

      <Section title="7. Periodo di conservazione">
        <List>
          <li>
            <strong>Account, profilo, contenuti e attività:</strong> per tutta la durata
            dell’account, salvo cancellazione anticipata da parte dell’utente; si veda la sezione 8
            per ciò che accade all’eliminazione.
          </li>
          <li>
            <strong>Dati di acquisto:</strong> per la durata dell’account. I documenti fiscali relativi
            alle vendite sono conservati dai fornitori di pagamento e nella contabilità del Titolare
            per il periodo prescritto dalla normativa fiscale (dieci anni).
          </li>
          <li>
            <strong>Registri delle richieste</strong> (indirizzo IP, user agent, indirizzo
            richiesto): conservati dalla piattaforma di hosting per <strong>un’ora</strong>,
            conformemente al piano Vercel in uso. Decorso tale termine non sono più consultabili; il
            Titolare non ne conserva copia né li esporta.
          </li>
          <li>
            <strong>Limitazione delle richieste:</strong> è mantenuto un contatore per ciascun
            chiamante, che non contiene l’indirizzo IP bensì un codice da esso derivato mediante una
            chiave segreta custodita sul server, dal quale l’indirizzo non è ricostruibile. Il
            contatore si azzera al termine della relativa finestra temporale (di norma un minuto) e
            il record è eliminato entro l’ora successiva.
          </li>
          <li>
            <strong>Dati di utilizzo:</strong> cancellati dopo <strong>tredici mesi</strong>; restano
            soltanto conteggi giornalieri per locale, privi di dati personali.
          </li>
          <li>
            <strong>Dati di moderazione:</strong> per il tempo necessario a documentare le decisioni
            adottate e a gestire eventuali reclami, contestazioni o richieste delle autorità.
          </li>
        </List>
      </Section>

      <Section id="elimina-account" title="8. Eliminazione dell’account">
        <p>
          L’account può essere eliminato in qualsiasi momento, senza costi:
        </p>
        <List>
          <li>
            dall’app Android, dall’app iOS o dal sito: <strong>Impostazioni → Elimina account</strong>;
          </li>
          <li>
            senza accedere all’app né reinstallarla, scrivendo a {privacyMail} dall’indirizzo email
            associato all’account. La richiesta è evasa entro trenta giorni.
          </li>
        </List>
        <p>
          Con l’eliminazione sono cancellati definitivamente i dati dell’account e del profilo
          (compresi i contatti Instagram e WhatsApp), le valutazioni e i voti, i locali salvati, gli
          eventi e gli organizzatori seguiti, le notifiche, le richieste di verifica con i relativi
          file e i dati di acquisto conservati dal Servizio. Un abbonamento rabar+ sottoscritto sul
          sito viene annullato automaticamente; un abbonamento sottoscritto tramite Google Play deve
          essere annullato da Google Play, poiché l’eliminazione dell’account non lo interrompe.
        </p>
        <p>
          Restano, senza alcun collegamento all’account: gli eventi già pubblicati e le risposte già
          date come gestore; le segnalazioni e i suggerimenti inviati; la registrazione dell’avvenuto
          riscatto del free drink, che impedisce di ottenerne un secondo; le interazioni con le schede
          dei locali, che non sono mai state collegate all’account, fino alla scadenza dei tredici
          mesi. Restano inoltre i dati di moderazione e i
          documenti fiscali, per i periodi indicati nella sezione 7.
        </p>
      </Section>

      <Section title="9. Minori">
        <p>
          Il Servizio riguarda locali che somministrano bevande alcoliche: i Termini di servizio
          richiedono il compimento del diciottesimo anno di età, dichiarato in fase di registrazione.
          Il Titolare non tratta consapevolmente dati di minori. Qualora si ritenga che un minore
          abbia fornito i propri dati, è possibile darne comunicazione a {privacyMail}: l’account sarà
          disattivato e i dati cancellati.
        </p>
      </Section>

      <Section title="10. Diritti dell’interessato">
        <p>
          L’interessato ha diritto di accesso, rettifica, cancellazione, limitazione del trattamento,
          portabilità dei dati e opposizione (artt. 15-22 GDPR), nonché di revocare in qualsiasi
          momento il consenso prestato, senza pregiudizio per la liceità del trattamento precedente.
          Due di tali diritti possono essere esercitati direttamente dalla sezione{' '}
          <strong>Impostazioni</strong>: l’<strong>esportazione dei dati</strong> in formato JSON (art.
          20), dal sito e dall’app Android, e l’<strong>eliminazione dell’account</strong> (art. 17),
          dal sito e da entrambe le app. Per ogni altra richiesta è
          possibile scrivere a {privacyMail}; il Titolare fornisce riscontro entro un mese dal
          ricevimento.
        </p>
        <p>
          L’interessato che ritenga il trattamento non conforme al GDPR ha diritto di proporre
          reclamo al Garante per la protezione dei dati personali (
          {extLink('https://www.garanteprivacy.it', 'www.garanteprivacy.it')}) o all’autorità di
          controllo dello Stato membro di residenza.
        </p>
      </Section>

      <Section title="11. Cookie, memoria del dispositivo e strumenti di tracciamento">
        <p>
          Il sito utilizza la memoria locale del browser, e le applicazioni la memoria del
          dispositivo, esclusivamente per finalità tecniche (sessione, lingua, tema grafico, schermate
          già viste, elenco degli utenti bloccati) e per conservare l’identificativo casuale impiegato
          per le statistiche aggregate di cui alla sezione 3, che non è collegato all’account, non è
          comunicato a terzi né utilizzato a fini pubblicitari.
        </p>
        <p>
          Sul sito web il consenso alla pubblicità è raccolto tramite la piattaforma di gestione
          del consenso di Google, certificata secondo l’IAB Transparency and Consent Framework, che
          viene mostrata alla prima visita agli utenti che si trovano nello Spazio economico
          europeo, nel Regno Unito e in Svizzera. Per poter mostrare tale richiesta, lo script di
          Google AdSense è caricato all’apertura del sito, il che comporta la comunicazione a Google
          dell’indirizzo IP e dei dati tecnici della connessione;{' '}
          <strong>nessun annuncio è richiesto prima della scelta dell’utente</strong>, e i cookie e
          gli identificatori pubblicitari sono utilizzati <strong>solo previo consenso</strong>. La
          scelta è conservata in cookie tecnici di prima parte (<code>FCCDCF</code>,{' '}
          <code>FCNEC</code>).
        </p>
        <p>
          Nelle applicazioni il consenso è raccolto, al primo avvio, con il messaggio di consenso di
          Google (User Messaging Platform). Su Android l’identificativo pubblicitario può essere
          reimpostato o eliminato dalle impostazioni del dispositivo; su iOS è utilizzato solo se
          l’utente lo autorizza nella richiesta di tracciamento del sistema, mostrata soltanto dopo
          il consenso.
        </p>
        <p>
          In assenza di consenso possono essere mostrati unicamente annunci non personalizzati o
          limitati, senza profilazione dell’utente; restano i soli trattamenti tecnici necessari alla
          sicurezza e alla prevenzione delle frodi. Il consenso può essere modificato o revocato in
          qualsiasi momento dal link <strong>Preferenze cookie</strong> in fondo alle pagine del sito o
          da <strong>Impostazioni</strong>, sul sito e nelle app, che riaprono la richiesta di Google,
          oppure dalle{' '}
          {extLink('https://adssettings.google.com', 'Impostazioni annunci di Google')}. Le modalità
          con cui Google tratta i dati raccolti sui siti e sulle app dei propri partner sono descritte
          alla pagina{' '}
          {extLink(
            'https://policies.google.com/technologies/partner-sites',
            'policies.google.com/technologies/partner-sites',
          )}
          . Agli abbonati rabar+ non è mostrata pubblicità: sul sito lo script non viene caricato,
          nelle app non vengono richiesti annunci.
        </p>
      </Section>

      <Section title="12. Informazioni per i residenti negli Stati Uniti (CCPA/CPRA)">
        <p>
          Gli utenti residenti in California o in altri Stati con normativa analoga hanno diritto di
          conoscere, correggere e cancellare i dati personali che li riguardano, senza subire
          discriminazioni per l’esercizio di tali diritti. Il Titolare non «vende» dati personali. La
          pubblicità personalizzata può configurare una «condivisione» (<em>sharing</em>) ai sensi
          del CPRA. L’utente può opporvisi in qualsiasi momento: sul sito il Servizio rispetta
          automaticamente il segnale{' '}
          {extLink('https://globalprivacycontrol.org', 'Global Privacy Control')}, che corrisponde al
          meccanismo «Do Not Sell or Share My Personal Information» — se è attivo nel browser lo
          script pubblicitario non viene caricato affatto — mentre nelle app è sufficiente negare il
          consenso o il tracciamento; la personalizzazione può inoltre essere disattivata dalle{' '}
          {extLink('https://adssettings.google.com', 'Impostazioni annunci di Google')}. Per
          l’esercizio dei diritti è possibile scrivere a {privacyMail}.
        </p>
      </Section>

      <Section title="13. Modifiche all’informativa">
        <p>
          La presente informativa può essere aggiornata; la versione vigente è pubblicata su questa
          pagina con l’indicazione della data dell’ultimo aggiornamento.
        </p>
      </Section>
    </LegalLayout>
  );
}

function PrivacyEn() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED_EN}>
      <p>
        This notice, provided under Articles 13 and 14 of Regulation (EU) 2016/679 (the “GDPR”) and,
        for users resident in the United States, under applicable state law (including the California
        Consumer Privacy Act, as amended by the California Privacy Rights Act), describes how the
        personal data of users of the www.rabar.it website and of the rabar apps for Android and iOS
        (the “Service”) are processed.
      </p>

      <Section title="1. Data controller and contact details">
        <Titolare />
        <p>
          Requests concerning the processing of personal data, including the exercise of the rights
          described in section 10, may be sent to {privacyMail}. The same address is the point of
          contact for recipients of the Service under Article 12 of Regulation (EU) 2022/2065 (the
          “DSA”). Communications from authorities and reports of illegal content should be sent to{' '}
          {abuseMail}.
        </p>
      </Section>

      <Section title="2. Categories of data processed">
        <List>
          <li>
            <strong>Account data:</strong> email address, username and password, managed through the
            Supabase Auth authentication service (the password is stored in hashed form and is never
            accessible to the Controller); sign-up date; account type (user, PR, organiser, venue
            manager); the declaration of being of age and the date the Terms were accepted. When
            signing in with Google or Apple, the provider shares the email address (with Apple,
            possibly a relay address) and, where available, the profile picture.
          </li>
          <li>
            <strong>Public profile:</strong> the username, profile picture, badges (rabar+, explorer,
            account type), number of ratings, ice cubes and leaderboard position are{' '}
            <strong>visible to anyone</strong>, including people without an account, together with the
            content published. PRs may optionally provide an Instagram username and a WhatsApp number:
            these are shown publicly on the page of the events the PR takes part in, so that people
            can contact them.
          </li>
          <li>
            <strong>Published content:</strong> ratings on the five criteria (price, drinks quality,
            vibe, variety, opening hours), comments, drink votes, venue managers’ replies to ratings
            and, for organiser accounts, events with their image and location.
          </li>
          <li>
            <strong>Account activity, not public:</strong> saved venues, followed events and
            organisers, notifications received, reports and suggestions of new venues or drinks (with
            any contact detail voluntarily provided), requests for a PR or organiser account and venue
            claims.
          </li>
          <li>
            <strong>Free drink and personal QR codes:</strong> the status of the free drink (granted
            to rabar+ subscribers and explorers, see section 5 of the Terms) and, when it is redeemed,
            the venue, the manager who validated it and the date. The free drink QR code and the event
            entry QR code contain a code linked to the account: whoever scans them (the venue manager
            or the organiser) checks that they are valid and, for events, sees the username.
          </li>
          <li>
            <strong>Location data:</strong> geolocation, if allowed, is processed on the device to
            centre the map. Coordinates are sent to our servers solely to find nearby venues and are
            not stored in the database; they remain only in the technical request logs for the period
            stated in section 7. Coordinates that users voluntarily include in a suggestion or an
            event are recorded.
          </li>
          <li>
            <strong>Verification documents:</strong> files uploaded to claim the management of a
            venue or to request a PR or organiser account (see section 6).
          </li>
          <li>
            <strong>Purchase data:</strong> for rabar+ and boosts we keep the payment channel (Stripe
            on the website, Google Play in the Android app, Apple in the iOS app), the product, plan,
            amount, status, purchase and expiry dates and the identifiers needed to verify the
            purchase and to handle renewals and refunds (Stripe customer and subscription identifiers,
            Google Play purchase token and order number, Apple transaction identifier). Card details
            are processed exclusively by those providers and are never accessible to the Controller.
          </li>
          <li>
            <strong>Technical data:</strong> request logs (IP address, user agent, requested address)
            used for security, abuse prevention and rate limiting; on the website, if the user enables
            notifications, the delivery address provided by the browser.
          </li>
          <li>
            <strong>Usage data:</strong> interactions with venue pages (opening a page, including
            through the QR code or NFC tag displayed at the venue; use of the Directions, Call and
            Website buttons), with date and time, linked to a random identifier generated on the
            device that is <strong>never linked to the account</strong>: for each event we only record
            whether it came from a signed-in user, not which one. The website records in the same way
            that a new rating was published or an account was created from the device, without saying
            which. For registered users, the date they last used the Service is also kept.
          </li>
          <li>
            <strong>Moderation data:</strong> any suspension or block of the account, the reasons for
            it and the log of the actions taken by the staff in charge.
          </li>
        </List>
      </Section>

      <Section title="3. Purposes and legal bases">
        <List>
          <li>
            Provision of the Service, including the public profile, content, events, notifications,
            free drink and paid features: performance of a contract (Art. 6(1)(b) GDPR).
          </li>
          <li>
            Verification of those claiming a venue or requesting an organiser account: performance
            of a contract and legitimate interest in preventing impersonation (Art. 6(1)(b) and (f)
            GDPR).
          </li>
          <li>
            Security of the Service, prevention of spam and abuse, content moderation, including the
            automated screening described in section 4: legitimate interest (Art. 6(1)(f) GDPR) and
            compliance with the obligations laid down by the DSA (Art. 6(1)(c) GDPR).
          </li>
          <li>Tax and accounting obligations relating to sales: legal obligation (Art. 6(1)(c) GDPR).</li>
          <li>
            Establishment, exercise or defence of legal claims, including disputes about moderation
            decisions: legitimate interest (Art. 6(1)(f) GDPR).
          </li>
          <li>
            Statistics on the use of the Service (new sign-ups, active users) and statistics given to
            venue managers about their own page (opens through QR and NFC, reviews, views, button
            use): the Controller’s legitimate interest in measuring how the Service works and in
            giving venues feedback on their presence (Art. 6(1)(f) GDPR). Venue managers only receive{' '}
            <strong>aggregate numbers</strong>, never data that identifies individual users. The device
            identifier is used only to produce those statistics and is neither linked to the account
            nor combined with other data: under the Italian Data Protection Authority’s guidelines of
            10 June 2021 it is therefore treated as a technical tool and requires no consent. As these
            data are not linked to the account, they cannot be traced back to an individual user (Art.
            11 GDPR).
          </li>
          <li>
            Advertising through Google AdSense on the website and Google AdMob in the applications:
            for personalised ads and for the use of advertising cookies and identifiers, consent
            (Art. 6(1)(a) GDPR), which may be withdrawn at any time; for non-personalised or limited
            ads, the Controller’s legitimate interest in funding a Service offered free of charge
            (Art. 6(1)(f) GDPR).
          </li>
        </List>
        <p>
          Account data are required to sign up; without them the Service can still be browsed
          without an account. Providing any other data is optional.
        </p>
      </Section>

      <Section title="4. Recipients and service providers">
        <p>
          To provide the Service the Controller relies on the following providers, acting as
          processors or as independent controllers:
        </p>
        <List>
          <li>
            <strong>Supabase</strong> — authentication, database and file storage. Data are hosted
            in the European Union (Ireland).
          </li>
          <li>
            <strong>Vercel</strong> — hosting of the website and the API, including request logs.
          </li>
          <li>
            <strong>Stripe</strong> — website payments, invoicing and the subscription management
            portal.
          </li>
          <li>
            <strong>Google Play</strong> — payments made in the Android app, renewals, receipts and
            refunds; the Service verifies those purchases through Google’s APIs.
          </li>
          <li>
            <strong>Apple</strong> — payments made in the iOS app and verification of those
            purchases; Sign in with Apple.
          </li>
          <li>
            <strong>Google</strong> — Sign in with Google; in the Android app, QR code scanning through
            the Google Play services scanner, which collects technical data about the device and the
            app for diagnostic purposes.
          </li>
          <li>
            <strong>OpenAI</strong> — automated screening of content submitted for publication
            (the text of ratings, replies and events, event images, usernames), solely to prevent
            the publication of content prohibited by the Terms. It receives the content but not the
            identity of its author and, under the provider’s terms, does not use it to train its
            models.
          </li>
          <li>
            <strong>OpenFreeMap</strong> and <strong>OpenStreetMap</strong> — provide the background
            map, whose tiles are downloaded directly by the user’s device, which therefore discloses
            to those services the IP address and the geographic area being viewed. The website uses
            OpenFreeMap and, if it cannot be reached, the OpenStreetMap servers; the apps use the
            OpenStreetMap servers.
          </li>
          <li>
            The public <strong>Overpass</strong>, <strong>Nominatim</strong> and{' '}
            <strong>Photon (komoot)</strong> servers — venue and place search. They are queried by the
            Service’s servers, never by the user’s device, and receive only the geographic area being
            viewed or the text searched, with no data identifying the user.
          </li>
          <li>
            <strong>Google Fonts</strong> — on the website, typefaces are downloaded from Google’s
            servers, which receive the IP address and technical browser data.
          </li>
          <li>
            <strong>Google AdSense</strong> and <strong>Google AdMob</strong> — advertising on the
            website and in the applications, personalised only with consent. On iOS, use of the
            advertising identifier also requires the tracking authorisation provided by the
            operating system.
          </li>
          <li>
            The browser’s <strong>push notification services</strong> (Google, Mozilla, Apple), if the
            user enables notifications on the website.
          </li>
        </List>
        <p>
          Each provider processes data in accordance with its own privacy policy. Data may also be
          disclosed to the Controller’s advisers bound by confidentiality (for example for tax
          compliance) and to authorities where required by law. Venue managers and organisers only
          receive the data described in sections 2 and 3. Data are not sold.
        </p>
        <p>
          <strong>Automated decision-making.</strong> Automated content screening may prevent a text
          or image from being published, or replace a username with a generic one; it does not
          produce decisions with legal or similarly significant effects within the meaning of
          Article 22 GDPR. The removal of published content and the suspension of accounts are
          decided by people, and every decision can be contested as set out in the Terms.
        </p>
      </Section>

      <Section title="5. Transfers to third countries">
        <p>
          Some providers (Google, Stripe, Vercel, Apple, OpenAI, Supabase) are based in, or operate
          infrastructure in, the United States. Transfers take place on the basis of the adequacy
          decision for the <em>EU–U.S. Data Privacy Framework</em> for participating providers and,
          otherwise, on the basis of the standard contractual clauses adopted by the European
          Commission, together with the supplementary measures required by Chapter V of the GDPR. The
          OpenStreetMap servers are also located in the United Kingdom, which benefits from an
          adequacy decision. A copy of the safeguards may be requested at {privacyMail}.
        </p>
      </Section>

      <Section title="6. Verification documents">
        <p>
          To claim the management of a venue or request a PR or organiser account, users are asked to
          upload one to three files (images or PDF, up to 8 MB each) capable of substantiating their
          statements, such as a business registry extract, an identity document or material relating
          to an event. The processing is based on the performance of a contract and on the
          Controller’s legitimate interest in not granting control of a venue to unauthorised
          persons.
        </p>
        <p>
          Files are stored in a <strong>private</strong> repository with no public addresses. The
          user’s device holds no permanent write credentials: each upload is individually authorised
          by the server and restricted to the user’s own folder. Access is limited to the staff
          reviewing the request, through links that expire automatically.
        </p>
        <p>
          <strong>Retention:</strong> if the request is rejected the files are deleted; if it is
          approved they are retained as evidence of the verification and deleted when the account is
          deleted.
        </p>
      </Section>

      <Section title="7. Retention period">
        <List>
          <li>
            <strong>Account, profile, content and activity:</strong> for as long as the account
            exists, unless the user deletes them earlier; see section 8 for what happens on deletion.
          </li>
          <li>
            <strong>Purchase data:</strong> for as long as the account exists. Tax documents relating
            to sales are kept by the payment providers and in the Controller’s accounts for the period
            required by tax law (ten years).
          </li>
          <li>
            <strong>Request logs</strong> (IP address, user agent, requested address): retained by
            the hosting platform for <strong>one hour</strong>, in accordance with the Vercel plan in
            use. After that period they can no longer be accessed; the Controller keeps no copy and
            does not export them.
          </li>
          <li>
            <strong>Rate limiting:</strong> a counter is kept for each caller. It does not contain the
            IP address but a code derived from it using a secret key held on the server, from which
            the address cannot be reconstructed. The counter resets at the end of its time window
            (usually one minute) and the record is deleted within the following hour.
          </li>
          <li>
            <strong>Usage data:</strong> deleted after <strong>thirteen months</strong>; only daily
            per-venue counts, containing no personal data, are kept.
          </li>
          <li>
            <strong>Moderation data:</strong> for as long as needed to document the decisions taken
            and to handle any complaints, disputes or requests from authorities.
          </li>
        </List>
      </Section>

      <Section id="delete-account" title="8. Deleting your account">
        <p>You can delete your account at any time, free of charge:</p>
        <List>
          <li>
            from the Android app, the iOS app or the website: <strong>Settings → Delete account</strong>;
          </li>
          <li>
            without signing in to or reinstalling the app, by writing to {privacyMail} from the email
            address linked to the account. Requests are handled within thirty days.
          </li>
        </List>
        <p>
          Deletion permanently erases the account and profile data (including Instagram and WhatsApp
          contacts), ratings and votes, saved venues, followed events and organisers, notifications,
          verification requests and their files, and the purchase data held by the Service. A rabar+
          subscription taken out on the website is cancelled automatically; a subscription taken out
          through Google Play must be cancelled in Google Play, as deleting the account does not stop
          it.
        </p>
        <p>
          The following remain, with no link to the account: events already published and replies
          already given as a venue manager; reports and suggestions sent; the record that the free
          drink was redeemed, which prevents a second one; interactions with venue pages, which were
          never linked to the account, until the thirteen months expire. Moderation data and tax documents also remain, for the periods
          stated in section 7.
        </p>
      </Section>

      <Section title="9. Minors">
        <p>
          The Service concerns venues serving alcoholic beverages: the Terms of Service require users
          to be at least eighteen years old, as declared at registration. The Controller does not
          knowingly process data of minors. If you believe a minor has provided their data, please
          notify {privacyMail}: the account will be deactivated and the data deleted.
        </p>
      </Section>

      <Section title="10. Data subject rights">
        <p>
          Data subjects have the right of access, rectification, erasure, restriction of processing,
          data portability and objection (Arts. 15-22 GDPR), and may withdraw any consent given at
          any time, without affecting the lawfulness of prior processing. Two of these rights can be
          exercised directly from <strong>Settings</strong>: <strong>data export</strong> in JSON
          format (Art. 20), on the website and in the Android app, and <strong>account
          deletion</strong> (Art. 17), on the website and in both apps. Any other request may be
          sent to {privacyMail}; the Controller responds within one month of receipt.
        </p>
        <p>
          Data subjects who consider that the processing infringes the GDPR have the right to lodge a
          complaint with the Italian Data Protection Authority (
          {extLink('https://www.garanteprivacy.it', 'www.garanteprivacy.it')}) or with the
          supervisory authority of their Member State of residence.
        </p>
      </Section>

      <Section title="11. Cookies, device storage and tracking technologies">
        <p>
          The website uses the browser’s local storage, and the apps use the device’s storage, for
          technical purposes only (session, language, theme, screens already seen, list of blocked
          users) and to keep the random identifier used for the aggregate statistics described in
          section 3, which is not linked to the account, shared with third parties or used for
          advertising.
        </p>
        <p>
          On the website, consent to advertising is collected through Google’s consent management
          platform, certified under the IAB Transparency and Consent Framework, which is shown on
          the first visit to users located in the European Economic Area, the United Kingdom and
          Switzerland. To display that request, the Google AdSense script is loaded when the site
          is opened, which involves sending Google the IP address and the technical data of the
          connection; <strong>no ad is requested before the user has chosen</strong>, and
          advertising cookies and identifiers are used <strong>only with prior consent</strong>.
          The choice is stored in first-party technical cookies (<code>FCCDCF</code>,{' '}
          <code>FCNEC</code>).
        </p>
        <p>
          In the apps, consent is collected on first launch through Google’s consent message (User
          Messaging Platform). On Android the advertising ID can be reset or deleted from the device
          settings; on iOS it is used only if the user allows it in the system tracking prompt, which
          is shown only after consent.
        </p>
        <p>
          Without consent, only non-personalised or limited ads may be shown, with no profiling of the
          user; the only processing that remains is the technical processing needed for security and
          fraud prevention. Consent may be changed or withdrawn at any time from the{' '}
          <strong>Cookie preferences</strong> link at the bottom of the website pages or from{' '}
          <strong>Settings</strong>, on the website and in the apps, which reopen Google’s request, or
          from {extLink('https://adssettings.google.com', 'Google Ads Settings')}. How Google handles
          the data collected on its partners’ sites and apps is described at{' '}
          {extLink(
            'https://policies.google.com/technologies/partner-sites',
            'policies.google.com/technologies/partner-sites',
          )}
          . rabar+ subscribers are shown no advertising: on the website the script is not loaded, and
          the apps request no ads.
        </p>
      </Section>

      <Section title="12. Information for United States residents (CCPA/CPRA)">
        <p>
          Users resident in California or in other states with comparable legislation have the right
          to know, correct and delete personal data concerning them, without discrimination for
          exercising these rights. The Controller does not “sell” personal data. Personalised
          advertising may constitute “sharing” under the CPRA. Users may opt out at any time: on the
          website the Service automatically honours the{' '}
          {extLink('https://globalprivacycontrol.org', 'Global Privacy Control')} signal, which
          serves as the “Do Not Sell or Share My Personal Information” mechanism — when it is
          enabled in the browser the advertising script is not loaded at all — while in the apps it
          is enough to refuse consent or tracking; personalisation can also be turned off from{' '}
          {extLink('https://adssettings.google.com', 'Google Ads Settings')}. Requests to exercise
          these rights may be sent to {privacyMail}.
        </p>
      </Section>

      <Section title="13. Changes to this notice">
        <p>
          This notice may be updated; the current version is published on this page together with
          the date of the latest update.
        </p>
      </Section>
    </LegalLayout>
  );
}
