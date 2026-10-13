import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';
import { entity, identificativi, mancante, sedeCompleta } from '../legal/entity.js';

// Informativa privacy (GDPR + CCPA/CPRA). I dati del titolare vivono in
// src/legal/entity.js: compilarli lì, non qui. L'italiano è la versione
// autorevole; ogni altra lingua della UI riceve la traduzione inglese.
export default function Privacy() {
  const { lang } = useI18n();
  return lang === 'it' ? <PrivacyIt /> : <PrivacyEn />;
}

const UPDATED_IT = '13 ottobre 2026';
const UPDATED_EN = 'October 13, 2026';

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
        utenti del sito web e delle applicazioni rabar (di seguito, il «Servizio»).
      </p>

      <Section title="1. Titolare del trattamento e contatti">
        <Titolare />
        <p>
          Le richieste relative al trattamento dei dati personali, ivi compreso l’esercizio dei
          diritti di cui alla sezione 9, possono essere inviate all’indirizzo {privacyMail}. Il
          medesimo indirizzo costituisce il punto di contatto per i destinatari del Servizio ai sensi
          dell’art. 12 del Regolamento (UE) 2022/2065 (di seguito, «DSA»). Le comunicazioni delle
          autorità e le segnalazioni di contenuti illeciti vanno invece indirizzate a {abuseMail}.
        </p>
      </Section>

      <Section title="2. Categorie di dati trattati">
        <List>
          <li>
            <strong>Dati dell’account:</strong> indirizzo email e nome utente, gestiti tramite il
            servizio di autenticazione Supabase Auth. In caso di accesso con Google o Apple, il
            fornitore trasmette l’indirizzo email e, ove disponibile, l’immagine del profilo.
          </li>
          <li>
            <strong>Contenuti pubblicati:</strong> valutazioni sui cinque criteri (prezzo, qualità dei
            drink, socialità, varietà, orari), commenti, voti sui drink, locali salvati, segnalazioni
            e, per gli account organizzatore, gli eventi pubblicati.
          </li>
          <li>
            <strong>Dati di posizione:</strong> la geolocalizzazione è elaborata sul dispositivo per
            centrare la mappa. Le coordinate sono trasmesse ai nostri server, e da questi ai servizi
            cartografici, al solo fine di individuare i locali nelle vicinanze, e non vengono
            conservate. Sono invece registrate le coordinate che l’utente inserisce volontariamente
            in una segnalazione.
          </li>
          <li>
            <strong>Documentazione di verifica:</strong> i file caricati per rivendicare la gestione
            di un locale o per richiedere un account PR od organizzatore (si veda la sezione 5).
          </li>
          <li>
            <strong>Dati di pagamento:</strong> in caso di sottoscrizione di rabar+ o di acquisto di
            un boost, i dati della carta sono trattati esclusivamente da Stripe e non sono mai
            accessibili al Titolare. Sono conservati l’esito della transazione, il piano scelto, la
            data di scadenza e l’identificativo cliente Stripe necessario per l’accesso al portale di
            gestione.
          </li>
          <li>
            <strong>Dati tecnici:</strong> registri delle richieste (indirizzo IP, user agent)
            utilizzati per finalità di sicurezza, prevenzione degli abusi e limitazione del numero di
            richieste.
          </li>
        </List>
      </Section>

      <Section title="3. Finalità e basi giuridiche del trattamento">
        <List>
          <li>
            Erogazione del Servizio, incluse le funzionalità a pagamento: esecuzione del contratto
            (art. 6, par. 1, lett. b GDPR).
          </li>
          <li>
            Verifica dell’identità di chi rivendica un locale o richiede un account organizzatore:
            esecuzione del contratto e legittimo interesse a prevenire sostituzioni di persona (art.
            6, par. 1, lett. b e f GDPR).
          </li>
          <li>
            Sicurezza del Servizio, prevenzione di spam e abusi, moderazione dei contenuti:
            legittimo interesse (art. 6, par. 1, lett. f GDPR).
          </li>
          <li>
            Adempimenti fiscali e contabili connessi alle vendite: obbligo di legge (art. 6, par. 1,
            lett. c GDPR).
          </li>
          <li>
            Pubblicità tramite Google AdSense sul sito web e Google AdMob nelle applicazioni:
            per gli annunci personalizzati e per l’uso di cookie e identificatori pubblicitari,
            consenso dell’interessato (art. 6, par. 1, lett. a GDPR), revocabile in qualsiasi
            momento; per gli annunci non personalizzati, legittimo interesse del Titolare a
            sostenere economicamente un Servizio offerto gratuitamente (art. 6, par. 1, lett. f
            GDPR).
          </li>
        </List>
      </Section>

      <Section title="4. Destinatari e fornitori di servizi">
        <p>
          Per l’erogazione del Servizio il Titolare si avvale dei seguenti fornitori, che operano in
          qualità di responsabili del trattamento o di titolari autonomi:
        </p>
        <List>
          <li>
            <strong>Supabase</strong> — autenticazione, database e archiviazione dei file.
          </li>
          <li>
            <strong>Vercel</strong> — hosting del sito web e dell’API, inclusi i registri delle
            richieste.
          </li>
          <li>
            <strong>Stripe</strong> — elaborazione dei pagamenti di rabar+ e dei boost, fatturazione e
            portale di gestione dell’abbonamento.
          </li>
          <li>
            <strong>Apple</strong> — verifica degli acquisti effettuati nell’applicazione iOS.
          </li>
          <li>
            <strong>OpenFreeMap</strong> — fornisce la mappa di sfondo. Le sue porzioni sono
            scaricate direttamente dal dispositivo dell’utente, che comunica pertanto a tale
            servizio l’indirizzo IP e l’area geografica visualizzata. Qualora OpenFreeMap non sia
            raggiungibile, la mappa è richiesta con le stesse modalità ai server di{' '}
            <strong>OpenStreetMap</strong>.
          </li>
          <li>
            I server <strong>Overpass</strong>, <strong>Nominatim</strong> e{' '}
            <strong>Photon (komoot)</strong> — ricerca dei locali e dei luoghi. Sono interrogati dai
            server del Servizio e ricevono unicamente l’area geografica visualizzata o il testo
            cercato, al fine di restituire i locali corrispondenti.
          </li>
          <li>
            <strong>Google AdSense</strong> e <strong>Google AdMob</strong> — pubblicità sul sito web
            e nelle applicazioni, personalizzata soltanto previo consenso. Su iOS l’utilizzo
            dell’identificativo pubblicitario richiede inoltre l’autorizzazione al tracciamento
            prevista dal sistema operativo.
          </li>
          <li>
            I <strong>servizi di notifica push</strong> del browser o del sistema operativo (Google,
            Mozilla, Apple), qualora l’utente attivi le notifiche.
          </li>
        </List>
        <p>Ciascun fornitore tratta i dati in conformità alla propria informativa.</p>
      </Section>

      <Section title="5. Documentazione di verifica">
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

      <Section title="6. Trasferimenti di dati verso paesi terzi">
        <p>
          Alcuni fornitori (Google, Stripe, Vercel, Apple) hanno sede o infrastrutture negli Stati
          Uniti. I trasferimenti avvengono sulla base della decisione di adeguatezza relativa all’
          <em>EU–U.S. Data Privacy Framework</em> per i fornitori aderenti e, in mancanza, sulla base
          delle clausole contrattuali standard adottate dalla Commissione europea, integrate dalle
          misure supplementari previste dal capo V del GDPR. Copia delle garanzie adottate può essere
          richiesta all’indirizzo {privacyMail}.
        </p>
      </Section>

      <Section title="7. Periodo di conservazione">
        <p>
          I dati dell’account sono conservati per tutta la durata dello stesso. L’utente può
          eliminare l’account dalla sezione <strong>Impostazioni</strong> o richiederne la
          cancellazione via email; i contenuti associati e la documentazione di verifica sono rimossi
          di conseguenza. I dati relativi alle vendite sono conservati per il periodo prescritto dalla
          normativa fiscale (dieci anni).
        </p>
        <p>
          I <strong>registri delle richieste</strong> (indirizzo IP, user agent) sono conservati
          dalla piattaforma di hosting per <strong>un’ora</strong>, conformemente al piano Vercel in
          uso. Decorso tale termine non sono più consultabili; il Titolare non ne conserva copia né li
          esporta.
        </p>
        <p>
          Ai fini della limitazione delle richieste automatizzate è mantenuto un contatore per
          ciascun chiamante, che non contiene l’indirizzo IP bensì un codice da esso derivato mediante
          una chiave segreta custodita sul server, dal quale l’indirizzo non è ricostruibile. Il
          contatore si azzera al termine della relativa finestra temporale (di norma un minuto) e il
          record è eliminato entro l’ora successiva.
        </p>
      </Section>

      <Section title="8. Minori">
        <p>
          Il Servizio riguarda locali che somministrano bevande alcoliche: i Termini di servizio
          richiedono il compimento del diciottesimo anno di età, dichiarato in fase di registrazione.
          Il Titolare non tratta consapevolmente dati di minori. Resta fermo che, in Italia, il
          consenso del minore ai servizi della società dell’informazione è valido a partire dai
          quattordici anni (art. 2-quinquies D.Lgs. 196/2003, introdotto dal D.Lgs. 101/2018).
          Qualora si ritenga che un minore abbia fornito i propri dati, è possibile darne
          comunicazione a {privacyMail}: i dati saranno cancellati.
        </p>
      </Section>

      <Section title="9. Diritti dell’interessato">
        <p>
          L’interessato ha diritto di accesso, rettifica, cancellazione, limitazione del trattamento,
          portabilità dei dati e opposizione (artt. 15-22 GDPR). Due di tali diritti possono essere
          esercitati direttamente dalla sezione <strong>Impostazioni</strong>: l’
          <strong>esportazione dei dati</strong> in formato JSON (art. 20) e l’
          <strong>eliminazione dell’account</strong> (art. 17). Per ogni altra richiesta è possibile
          scrivere a {privacyMail}; il Titolare fornisce riscontro entro un mese dal ricevimento.
        </p>
        <p>
          L’interessato che ritenga il trattamento non conforme al GDPR ha diritto di proporre
          reclamo al Garante per la protezione dei dati personali (
          {extLink('https://www.garanteprivacy.it', 'www.garanteprivacy.it')}) o all’autorità di
          controllo dello Stato membro di residenza.
        </p>
      </Section>

      <Section title="10. Cookie e strumenti di tracciamento">
        <p>
          Il Servizio utilizza la memoria locale del browser esclusivamente per finalità tecniche
          (sessione, lingua, tema grafico).
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
          In assenza di consenso possono essere mostrati unicamente annunci non personalizzati,
          senza profilazione dell’utente; restano i soli trattamenti tecnici necessari alla
          sicurezza e alla prevenzione delle frodi. Il consenso può essere modificato o revocato in
          qualsiasi momento dal link <strong>Preferenze cookie</strong> in fondo alle pagine o da{' '}
          <strong>Impostazioni → Preferenze cookie</strong>, che riaprono la richiesta di Google,
          oppure dalle{' '}
          {extLink('https://adssettings.google.com', 'Impostazioni annunci di Google')}. Le modalità
          con cui Google tratta i dati raccolti sui siti dei propri partner sono descritte alla
          pagina{' '}
          {extLink(
            'https://policies.google.com/technologies/partner-sites',
            'policies.google.com/technologies/partner-sites',
          )}
          . Agli abbonati rabar+ non è mostrata pubblicità e lo script non viene caricato.
        </p>
      </Section>

      <Section title="11. Informazioni per i residenti negli Stati Uniti (CCPA/CPRA)">
        <p>
          Gli utenti residenti in California o in altri Stati con normativa analoga hanno diritto di
          conoscere, correggere e cancellare i dati personali che li riguardano, senza subire
          discriminazioni per l’esercizio di tali diritti. Il Titolare non «vende» dati personali. La
          pubblicità personalizzata può configurare una «condivisione» (<em>sharing</em>) ai sensi
          del CPRA. L’utente può opporvisi in qualsiasi momento: il Servizio rispetta
          automaticamente il segnale{' '}
          {extLink('https://globalprivacycontrol.org', 'Global Privacy Control')}, che corrisponde al
          meccanismo «Do Not Sell or Share My Personal Information» — se è attivo nel browser lo
          script pubblicitario non viene caricato affatto — e la personalizzazione può essere
          disattivata dalle{' '}
          {extLink('https://adssettings.google.com', 'Impostazioni annunci di Google')}. Per
          l’esercizio dei diritti è possibile scrivere a {privacyMail}.
        </p>
      </Section>

      <Section title="12. Modifiche all’informativa">
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
        personal data of users of the rabar website and applications (the “Service”) are processed.
      </p>

      <Section title="1. Data controller and contact details">
        <Titolare />
        <p>
          Requests concerning the processing of personal data, including the exercise of the rights
          described in section 9, may be sent to {privacyMail}. The same address is the point of
          contact for recipients of the Service under Article 12 of Regulation (EU) 2022/2065 (the
          “DSA”). Communications from authorities and reports of illegal content should be sent to{' '}
          {abuseMail}.
        </p>
      </Section>

      <Section title="2. Categories of data processed">
        <List>
          <li>
            <strong>Account data:</strong> email address and username, managed through the Supabase
            Auth authentication service. When signing in with Google or Apple, the provider shares
            the email address and, where available, the profile picture.
          </li>
          <li>
            <strong>Published content:</strong> ratings on the five criteria (price, drinks quality,
            vibe, variety, opening hours), comments, drink votes, saved venues, reports and, for
            organiser accounts, published events.
          </li>
          <li>
            <strong>Location data:</strong> geolocation is processed on the device to centre the map.
            Coordinates are sent to our servers, and from there to mapping services, solely to find
            nearby venues, and are not stored. Coordinates that users voluntarily include in a report
            are recorded.
          </li>
          <li>
            <strong>Verification documents:</strong> files uploaded to claim the management of a
            venue or to request a PR or organiser account (see section 5).
          </li>
          <li>
            <strong>Payment data:</strong> when subscribing to rabar+ or purchasing a boost, card
            details are processed exclusively by Stripe and are never accessible to the Controller.
            We retain the transaction outcome, the chosen plan, the expiry date and the Stripe
            customer identifier needed to access the management portal.
          </li>
          <li>
            <strong>Technical data:</strong> request logs (IP address, user agent) used for security,
            abuse prevention and rate limiting.
          </li>
        </List>
      </Section>

      <Section title="3. Purposes and legal bases">
        <List>
          <li>
            Provision of the Service, including paid features: performance of a contract (Art.
            6(1)(b) GDPR).
          </li>
          <li>
            Verification of those claiming a venue or requesting an organiser account: performance
            of a contract and legitimate interest in preventing impersonation (Art. 6(1)(b) and (f)
            GDPR).
          </li>
          <li>
            Security of the Service, prevention of spam and abuse, content moderation: legitimate
            interest (Art. 6(1)(f) GDPR).
          </li>
          <li>Tax and accounting obligations relating to sales: legal obligation (Art. 6(1)(c) GDPR).</li>
          <li>
            Advertising through Google AdSense on the website and Google AdMob in the applications:
            for personalised ads and for the use of advertising cookies and identifiers, consent
            (Art. 6(1)(a) GDPR), which may be withdrawn at any time; for non-personalised ads, the
            Controller’s legitimate interest in funding a Service offered free of charge
            (Art. 6(1)(f) GDPR).
          </li>
        </List>
      </Section>

      <Section title="4. Recipients and service providers">
        <p>
          To provide the Service the Controller relies on the following providers, acting as
          processors or as independent controllers:
        </p>
        <List>
          <li>
            <strong>Supabase</strong> — authentication, database and file storage.
          </li>
          <li>
            <strong>Vercel</strong> — hosting of the website and the API, including request logs.
          </li>
          <li>
            <strong>Stripe</strong> — payment processing for rabar+ and boosts, invoicing and the
            subscription management portal.
          </li>
          <li>
            <strong>Apple</strong> — verification of purchases made in the iOS application.
          </li>
          <li>
            <strong>OpenFreeMap</strong> — provides the background map. Its tiles are downloaded
            directly by the user’s device, which therefore discloses to that service the IP address
            and the geographic area being viewed. If OpenFreeMap cannot be reached, the map is
            requested in the same way from the <strong>OpenStreetMap</strong> servers.
          </li>
          <li>
            The <strong>Overpass</strong>, <strong>Nominatim</strong> and{' '}
            <strong>Photon (komoot)</strong> servers — venue and place search. They are queried by
            the Service’s servers and receive only the geographic area being viewed or the text
            searched, in order to return the matching venues.
          </li>
          <li>
            <strong>Google AdSense</strong> and <strong>Google AdMob</strong> — advertising on the
            website and in the applications, personalised only with consent. On iOS, use of the
            advertising identifier also requires the tracking authorisation provided by the
            operating system.
          </li>
          <li>
            The <strong>push notification services</strong> of the browser or operating system
            (Google, Mozilla, Apple), if the user enables notifications.
          </li>
        </List>
        <p>Each provider processes data in accordance with its own privacy policy.</p>
      </Section>

      <Section title="5. Verification documents">
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

      <Section title="6. Transfers to third countries">
        <p>
          Some providers (Google, Stripe, Vercel, Apple) are based in, or operate infrastructure in,
          the United States. Transfers take place on the basis of the adequacy decision for the{' '}
          <em>EU–U.S. Data Privacy Framework</em> for participating providers and, otherwise, on the
          basis of the standard contractual clauses adopted by the European Commission, together with
          the supplementary measures required by Chapter V of the GDPR. A copy of the safeguards may
          be requested at {privacyMail}.
        </p>
      </Section>

      <Section title="7. Retention period">
        <p>
          Account data are retained for as long as the account exists. Users may delete their account
          from <strong>Settings</strong> or request its deletion by email; associated content and
          verification documents are removed accordingly. Sales data are retained for the period
          required by tax law (ten years).
        </p>
        <p>
          <strong>Request logs</strong> (IP address, user agent) are retained by the hosting platform
          for <strong>one hour</strong>, in accordance with the Vercel plan in use. After that period
          they can no longer be accessed; the Controller keeps no copy and does not export them.
        </p>
        <p>
          For rate limiting of automated requests, a counter is kept for each caller. It does not
          contain the IP address but a code derived from it using a secret key held on the server,
          from which the address cannot be reconstructed. The counter resets at the end of its time
          window (usually one minute) and the record is deleted within the following hour.
        </p>
      </Section>

      <Section title="8. Minors">
        <p>
          The Service concerns venues serving alcoholic beverages: the Terms of Service require users
          to be at least eighteen years old, as declared at registration. The Controller does not
          knowingly process data of minors. In Italy, a minor’s consent to information society
          services is in any event valid from the age of fourteen (Art. 2-quinquies of Legislative
          Decree 196/2003, as introduced by Legislative Decree 101/2018). If you believe a minor has
          provided their data, please notify {privacyMail} and the data will be deleted.
        </p>
      </Section>

      <Section title="9. Data subject rights">
        <p>
          Data subjects have the right of access, rectification, erasure, restriction of processing,
          data portability and objection (Arts. 15-22 GDPR). Two of these rights can be exercised
          directly from <strong>Settings</strong>: <strong>data export</strong> in JSON format (Art.
          20) and <strong>account deletion</strong> (Art. 17). Any other request may be sent to{' '}
          {privacyMail}; the Controller responds within one month of receipt.
        </p>
        <p>
          Data subjects who consider that the processing infringes the GDPR have the right to lodge a
          complaint with the Italian Data Protection Authority (
          {extLink('https://www.garanteprivacy.it', 'www.garanteprivacy.it')}) or with the
          supervisory authority of their Member State of residence.
        </p>
      </Section>

      <Section title="10. Cookies and tracking technologies">
        <p>
          The Service uses the browser’s local storage for technical purposes only (session,
          language, theme).
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
          Without consent, only non-personalised ads may be shown, with no profiling of the user;
          the only processing that remains is the technical processing needed for security and
          fraud prevention. Consent may be changed or withdrawn at any time from the{' '}
          <strong>Cookie preferences</strong> link at the bottom of the pages or from{' '}
          <strong>Settings → Cookie preferences</strong>, which reopen Google’s request, or from{' '}
          {extLink('https://adssettings.google.com', 'Google Ads Settings')}. How Google handles
          the data collected on its partners’ sites is described at{' '}
          {extLink(
            'https://policies.google.com/technologies/partner-sites',
            'policies.google.com/technologies/partner-sites',
          )}
          . rabar+ subscribers are shown no advertising and the script is not loaded.
        </p>
      </Section>

      <Section title="11. Information for United States residents (CCPA/CPRA)">
        <p>
          Users resident in California or in other states with comparable legislation have the right
          to know, correct and delete personal data concerning them, without discrimination for
          exercising these rights. The Controller does not “sell” personal data. Personalised
          advertising may constitute “sharing” under the CPRA. Users may opt out at any time: the
          Service automatically honours the{' '}
          {extLink('https://globalprivacycontrol.org', 'Global Privacy Control')} signal, which
          serves as the “Do Not Sell or Share My Personal Information” mechanism — when it is
          enabled in the browser the advertising script is not loaded at all — and personalisation
          can be turned off from{' '}
          {extLink('https://adssettings.google.com', 'Google Ads Settings')}. Requests to exercise
          these rights may be sent to {privacyMail}.
        </p>
      </Section>

      <Section title="12. Changes to this notice">
        <p>
          This notice may be updated; the current version is published on this page together with
          the date of the latest update.
        </p>
      </Section>
    </LegalLayout>
  );
}
