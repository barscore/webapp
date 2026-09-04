import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';
import { entity, mancante, sedeCompleta } from '../legal/entity.js';

// Informativa privacy (GDPR + CCPA/CPRA). I dati del titolare vivono in
// src/legal/entity.js: compilarli lì, non qui. L'italiano è la versione
// autorevole; ogni altra lingua della UI riceve la traduzione inglese.
export default function Privacy() {
  const { lang } = useI18n();
  return lang === 'it' ? <PrivacyIt /> : <PrivacyEn />;
}

const UPDATED_IT = '3 settembre 2026';
const UPDATED_EN = 'September 3, 2026';

const mailTo = (address) => (
  <a href={`mailto:${address}`} className="text-ember-ink hover:underline">
    {address}
  </a>
);

const privacyMail = mailTo(entity.emailPrivacy);
const abuseMail = mailTo(entity.emailAbuse);

// Un segnaposto non compilato deve saltare all'occhio, non sparire: è il modo
// in cui il buco resta visibile finché qualcuno non lo chiude.
function Campo({ value }) {
  return mancante(value) ? (
    <mark className="rounded bg-ember-danger/20 px-1 font-semibold text-ember-danger">{value}</mark>
  ) : (
    <>{value}</>
  );
}

/** Blocco identificativo del titolare, uguale in entrambe le lingue. */
function Titolare() {
  return (
    <ul className="list-none space-y-0.5 pl-0">
      <li>
        <Campo value={entity.denominazione} />
      </li>
      <li>
        <Campo value={entity.indirizzo} /> — <Campo value={entity.citta} />, {entity.paese}
      </li>
      <li>
        P. IVA <Campo value={entity.partitaIva} /> · C.F. <Campo value={entity.codiceFiscale} /> ·
        REA <Campo value={entity.rea} />
      </li>
    </ul>
  );
}

function PrivacyIt() {
  return (
    <LegalLayout title="Informativa sulla privacy" updated={UPDATED_IT}>
      <p>
        Questa informativa descrive come rabar tratta i dati personali di chi usa il sito e le app,
        ai sensi del Regolamento (UE) 2016/679 (“GDPR”) e, per i residenti negli Stati Uniti, delle
        normative statali applicabili (tra cui il California Consumer Privacy Act).
      </p>

      <Section title="Titolare del trattamento">
        <Titolare />
        <p>
          Per qualsiasi richiesta sui tuoi dati, incluso l’esercizio dei diritti descritti più
          sotto, scrivi a {privacyMail}. Lo stesso indirizzo è il punto di contatto per gli utenti
          ai sensi dell’art. 12 del regolamento sui servizi digitali (DSA); per le autorità e per le
          segnalazioni di contenuti illeciti vale invece {abuseMail}.
        </p>
      </Section>

      <Section title="Dati che trattiamo">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account:</strong> email e username, gestiti tramite Supabase Auth. Se accedi con
            Google o con Apple riceviamo dal fornitore l’email e, quando disponibile, l’immagine del
            profilo.
          </li>
          <li>
            <strong>Contenuti:</strong> valutazioni sui cinque assi (prezzo, qualità dei drinks,
            socialità, varietà, orari), commenti, voti sui drink, bar salvati, segnalazioni,
            eventi pubblicati se hai un account organizzatore.
          </li>
          <li>
            <strong>Posizione:</strong> la geolocalizzazione resta sul dispositivo per centrare la
            mappa. Le coordinate raggiungono i nostri server, e da lì i servizi di mappa, solo per
            cercare i bar vicini: non le conserviamo. Restano invece registrate le coordinate che
            invii volontariamente dentro una segnalazione.
          </li>
          <li>
            <strong>Allegati di verifica:</strong> i file che carichi per rivendicare un bar o per
            chiedere un account PR/organizzatore. Vedi la sezione dedicata.
          </li>
          <li>
            <strong>Pagamenti:</strong> se sottoscrivi rabar+ o acquisti un boost, i dati della
            carta li tratta esclusivamente Stripe — noi non li vediamo mai. Conserviamo l’esito, il
            piano scelto, la scadenza e l’identificativo cliente Stripe che serve ad aprirti il
            portale di gestione.
          </li>
          <li>
            <strong>Dati tecnici:</strong> log di richiesta (indirizzo IP, user-agent) per
            sicurezza, anti-abuso e limitazione delle richieste.
          </li>
        </ul>
      </Section>

      <Section title="Finalità e base giuridica">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fornire il servizio, incluse le funzioni a pagamento — esecuzione del contratto.</li>
          <li>
            Verificare chi rivendica un bar o chiede un account organizzatore — esecuzione del
            contratto e legittimo interesse a impedire che qualcuno si spacci per un altro.
          </li>
          <li>Sicurezza, prevenzione di spam e abusi, moderazione — legittimo interesse.</li>
          <li>Adempimenti fiscali e contabili sulle vendite — obbligo di legge.</li>
          <li>
            Pubblicità tramite Google AdSense sul web e Google AdMob nelle app — solo previo tuo
            consenso, che puoi revocare in ogni momento.
          </li>
        </ul>
      </Section>

      <Section title="Servizi di terze parti">
        <p>Per far funzionare rabar ci appoggiamo a:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — autenticazione, database e archiviazione dei file.
          </li>
          <li>
            <strong>Vercel</strong> — hosting del sito e dell’API, e quindi i log di richiesta.
          </li>
          <li>
            <strong>Stripe</strong> — pagamenti di rabar+ e dei boost, fatturazione e portale di
            gestione dell’abbonamento.
          </li>
          <li>
            <strong>Apple</strong> — verifica degli acquisti effettuati dentro l’app iOS.
          </li>
          <li>
            <strong>OpenStreetMap</strong>, i mirror <strong>Overpass</strong>,{' '}
            <strong>Nominatim</strong> e <strong>Photon (komoot)</strong> — mappe e ricerca dei
            luoghi. Ricevono l’area attorno al punto che stai guardando, per restituire i bar che ci
            stanno dentro.
          </li>
          <li>
            <strong>Google AdSense</strong> e <strong>Google AdMob</strong> — pubblicità sul web e
            nelle app, caricate solo dopo il tuo consenso. Su iOS l’identificativo pubblicitario
            richiede anche il permesso di tracciamento del sistema.
          </li>
          <li>
            I <strong>servizi di notifica push</strong> del tuo browser o sistema operativo (Google,
            Mozilla, Apple), se attivi le notifiche.
          </li>
        </ul>
        <p>Ciascun fornitore tratta i dati secondo la propria informativa.</p>
      </Section>

      <Section title="Allegati di verifica">
        <p>
          Per rivendicare un bar o per chiedere un account PR/organizzatore ti chiediamo da uno a
          tre file (immagini o PDF, fino a 8 MB ciascuno) che provino quello che dichiari — una
          visura, un documento, il materiale di una serata. La base giuridica è l’esecuzione del
          contratto, insieme al nostro legittimo interesse a non consegnare il controllo di un
          locale a chi non c’entra.
        </p>
        <p>
          I file finiscono in un archivio <strong>privato</strong>: non esiste un indirizzo pubblico
          per raggiungerli, e il tuo dispositivo non ha le credenziali per scriverci direttamente —
          gliele firmiamo noi, una alla volta, solo per la tua cartella. Li vede soltanto lo staff
          che esamina la richiesta, tramite collegamenti che scadono da soli.
        </p>
        <p>
          <strong>Conservazione:</strong> se la richiesta viene rifiutata gli allegati vengono
          cancellati. Se viene approvata restano come prova della verifica, e vengono cancellati
          quando elimini l’account.
        </p>
      </Section>

      <Section title="Trasferimenti fuori dall’Unione europea">
        <p>
          Alcuni fornitori hanno sede o infrastrutture negli Stati Uniti: Google, Stripe, Vercel e
          Apple. I trasferimenti avvengono sulla base della decisione di adeguatezza per il{' '}
          <em>EU–US Data Privacy Framework</em> per i fornitori che vi aderiscono, e altrimenti
          sulla base delle clausole contrattuali standard adottate dalla Commissione europea, con le
          misure supplementari previste dal capo V del GDPR. Puoi chiederci copia delle garanzie
          scrivendo a {privacyMail}.
        </p>
      </Section>

      <Section title="Conservazione">
        <p>
          I dati dell’account restano finché l’account esiste. Puoi eliminarlo da{' '}
          <strong>Impostazioni</strong> o chiederne la cancellazione via email: i contenuti
          collegati e gli allegati di verifica vengono rimossi di conseguenza. I dati delle vendite
          li conserviamo per il tempo imposto dalla normativa fiscale (dieci anni).
        </p>
        <p>
          I <strong>log di richiesta</strong> (indirizzo IP, user-agent) li conserva la piattaforma
          di hosting per <strong>un’ora</strong>, che è la finestra prevista dal piano Vercel su cui
          gira rabar. Passata quell’ora non sono più consultabili, da noi né da altri: non ne
          teniamo copia e non li esportiamo da nessuna parte.
        </p>
        <p>
          Per limitare le richieste automatiche teniamo un contatore per chiamante. Non contiene il
          tuo indirizzo IP: contiene un suo codice derivato con una chiave segreta che resta sul
          nostro server, dal quale l’indirizzo non è ricostruibile. Il contatore si azzera alla fine
          della sua finestra (un minuto nella maggior parte dei casi) e la riga viene cancellata
          entro l’ora successiva.
        </p>
      </Section>

      <Section title="I tuoi diritti (GDPR)">
        <p>
          Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione.
          Due li eserciti direttamente dall’app, senza aspettare nessuno: da{' '}
          <strong>Impostazioni</strong> puoi <strong>esportare i tuoi dati</strong> in un file JSON
          (art. 20) ed <strong>eliminare l’account</strong> (art. 17). Per tutto il resto scrivi a{' '}
          {privacyMail}: rispondiamo entro un mese.
        </p>
        <p>
          Se ritieni che il trattamento violi il GDPR puoi proporre reclamo al Garante per la
          protezione dei dati personali (garanteprivacy.it) o all’autorità del tuo Stato di
          residenza.
        </p>
      </Section>

      <Section title="Minori">
        <p>
          rabar riguarda locali che vendono alcolici: i Termini richiedono almeno 18 anni, e
          all’iscrizione ti viene chiesto di dichiararlo. Non trattiamo consapevolmente dati di chi
          non li ha. In Italia il consenso digitale del minore è comunque valido dai 14 anni
          (D.Lgs. 101/2018, art. 2-quinquies). Se pensi che un minore ci abbia fornito i suoi dati,
          scrivici a {privacyMail} e li cancelleremo.
        </p>
      </Section>

      <Section title="Cookie e consenso">
        <p>
          Usiamo lo storage locale del browser solo per finalità tecniche (sessione, lingua, tema,
          scelta sul consenso). La pubblicità di Google — e i relativi cookie — viene caricata{' '}
          <strong>solo se acconsenti</strong> tramite il banner: se rifiuti o non scegli, lo script
          pubblicitario non viene proprio eseguito, quindi non parte nessuna richiesta e non nasce
          nessun cookie. Puoi cambiare idea in ogni momento da{' '}
          <strong>Impostazioni → Preferenze cookie</strong> o da{' '}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noreferrer"
            className="text-ember-ink hover:underline"
          >
            Impostazioni annunci Google
          </a>
          . Chi ha rabar+ non vede pubblicità e lo script non viene caricato affatto.
        </p>
      </Section>

      <Section title="Residenti negli Stati Uniti (CCPA/CPRA)">
        <p>
          Se risiedi in California o in un altro Stato USA con normativa analoga, hai diritto di
          conoscere, correggere e cancellare i dati personali che ti riguardano, senza
          discriminazioni per l’esercizio di questi diritti. Non “vendiamo” dati personali. La
          pubblicità personalizzata può costituire “condivisione” (sharing) ai sensi del CPRA:
          avviene <strong>solo con il tuo consenso</strong> e puoi revocarla in ogni momento da
          Impostazioni → Preferenze cookie (equivale al “Do Not Sell or Share My Personal
          Information”). Rispettiamo automaticamente il segnale{' '}
          <a
            href="https://globalprivacycontrol.org"
            target="_blank"
            rel="noreferrer"
            className="text-ember-ink hover:underline"
          >
            Global Privacy Control
          </a>
          : se è attivo nel tuo browser, la pubblicità personalizzata resta disattivata. Per
          esercitare i tuoi diritti scrivi a {privacyMail}.
        </p>
      </Section>
    </LegalLayout>
  );
}

function PrivacyEn() {
  return (
    <LegalLayout title="Privacy Policy" updated={UPDATED_EN}>
      <p>
        This notice describes how rabar processes the personal data of people who use the website
        and the apps, under Regulation (EU) 2016/679 (“GDPR”) and, for US residents, applicable
        state laws (including the California Consumer Privacy Act).
      </p>

      <Section title="Data controller">
        <Titolare />
        <p>
          For any request about your data, including the rights described below, write to{' '}
          {privacyMail}. That address is also the point of contact for users under Article 12 of the
          Digital Services Act; for authorities and for reports of illegal content, use {abuseMail}.
        </p>
      </Section>

      <Section title="Data we process">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Account:</strong> email and username, handled through Supabase Auth. If you sign
            in with Google or Apple we receive your email from the provider and, where available,
            your profile picture.
          </li>
          <li>
            <strong>Content:</strong> ratings on the five axes (price, drinks quality, vibe,
            variety, opening hours), comments, drink votes, saved bars, reports, and events you
            publish if you hold an organizer account.
          </li>
          <li>
            <strong>Location:</strong> geolocation stays on your device to centre the map. Your
            coordinates reach our servers, and from there the map services, only to look for nearby
            bars — we do not store them. Coordinates you deliberately attach to a report are stored.
          </li>
          <li>
            <strong>Verification attachments:</strong> the files you upload to claim a bar or to
            request a PR/organizer account. See the dedicated section.
          </li>
          <li>
            <strong>Payments:</strong> if you subscribe to rabar+ or buy a boost, card details are
            handled solely by Stripe — we never see them. We keep the outcome, the chosen plan, its
            expiry and the Stripe customer id needed to open your billing portal.
          </li>
          <li>
            <strong>Technical data:</strong> request logs (IP address, user agent) for security,
            abuse prevention and rate limiting.
          </li>
        </ul>
      </Section>

      <Section title="Purposes and legal bases">
        <ul className="list-disc space-y-1 pl-5">
          <li>Providing the service, paid features included — performance of the contract.</li>
          <li>
            Verifying who claims a bar or requests an organizer account — performance of the
            contract, and our legitimate interest in preventing impersonation.
          </li>
          <li>Security, spam and abuse prevention, moderation — legitimate interest.</li>
          <li>Tax and accounting obligations on sales — legal obligation.</li>
          <li>
            Advertising through Google AdSense on the web and Google AdMob in the apps — only with
            your consent, which you can withdraw at any time.
          </li>
        </ul>
      </Section>

      <Section title="Third-party services">
        <p>rabar relies on:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — authentication, database and file storage.
          </li>
          <li>
            <strong>Vercel</strong> — hosting for the site and the API, and therefore request logs.
          </li>
          <li>
            <strong>Stripe</strong> — payments for rabar+ and boosts, invoicing and the subscription
            management portal.
          </li>
          <li>
            <strong>Apple</strong> — verification of purchases made inside the iOS app.
          </li>
          <li>
            <strong>OpenStreetMap</strong>, the <strong>Overpass</strong> mirrors,{' '}
            <strong>Nominatim</strong> and <strong>Photon (komoot)</strong> — maps and place search.
            They receive the area around the point you are looking at, in order to return the bars
            inside it.
          </li>
          <li>
            <strong>Google AdSense</strong> and <strong>Google AdMob</strong> — advertising on the
            web and in the apps, loaded only after your consent. On iOS the advertising identifier
            also requires the system tracking permission.
          </li>
          <li>
            Your browser’s or operating system’s <strong>push notification services</strong>{' '}
            (Google, Mozilla, Apple), if you turn notifications on.
          </li>
        </ul>
        <p>Each provider processes data under its own privacy policy.</p>
      </Section>

      <Section title="Verification attachments">
        <p>
          To claim a bar or request a PR/organizer account we ask for one to three files (images or
          PDFs, up to 8 MB each) backing up what you state — a company record, an ID, material from
          an event you ran. The legal basis is performance of the contract, together with our
          legitimate interest in not handing control of a venue to someone unrelated to it.
        </p>
        <p>
          The files go into a <strong>private</strong> store: there is no public address that
          reaches them, and your device holds no credentials to write there — we sign one upload URL
          at a time, scoped to your own folder. Only the staff reviewing the request can see them,
          through links that expire on their own.
        </p>
        <p>
          <strong>Retention:</strong> if the request is rejected the attachments are deleted. If it
          is approved they remain as the record of the verification, and are deleted when you delete
          your account.
        </p>
      </Section>

      <Section title="Transfers outside the European Union">
        <p>
          Some providers are based or run infrastructure in the United States: Google, Stripe,
          Vercel and Apple. Transfers rely on the adequacy decision for the{' '}
          <em>EU–US Data Privacy Framework</em> for providers certified under it, and otherwise on
          the standard contractual clauses adopted by the European Commission, with the supplementary
          measures required by Chapter V GDPR. You can ask us for a copy of the safeguards at{' '}
          {privacyMail}.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          Account data is kept for as long as the account exists. You can delete it from{' '}
          <strong>Settings</strong>, or ask us to by email: linked content and verification
          attachments are removed accordingly. Sales records are kept for the period required by tax
          law (ten years).
        </p>
        <p>
          <strong>Request logs</strong> (IP address, user agent) are kept by the hosting platform
          for <strong>one hour</strong> — the window provided by the Vercel plan rabar runs on.
          After that hour they can no longer be consulted, by us or anyone else: we keep no copy and
          export them nowhere.
        </p>
        <p>
          To limit automated requests we keep a per-caller counter. It does not hold your IP
          address: it holds a code derived from it with a secret key that never leaves our server,
          from which the address cannot be reconstructed. The counter resets at the end of its
          window (one minute in most cases) and the row is deleted within the following hour.
        </p>
      </Section>

      <Section title="Your rights (GDPR)">
        <p>
          You have the right of access, rectification, erasure, restriction, portability and
          objection. Two of them you exercise directly in the app, without waiting for anyone: from{' '}
          <strong>Settings</strong> you can <strong>export your data</strong> as a JSON file
          (Art. 20) and <strong>delete your account</strong> (Art. 17). For everything else write to{' '}
          {privacyMail}: we reply within one month.
        </p>
        <p>
          If you believe the processing infringes the GDPR you may lodge a complaint with the
          Italian Data Protection Authority (garanteprivacy.it) or with the authority of your country
          of residence.
        </p>
      </Section>

      <Section title="Minors">
        <p>
          rabar is about venues that sell alcohol: the Terms require you to be at least 18, and you
          are asked to declare it at sign-up. We do not knowingly process data of anyone younger. In
          Italy a minor’s digital consent is in any case valid from age 14 (Legislative Decree
          101/2018, Art. 2-quinquies). If you believe a minor has given us their data, write to{' '}
          {privacyMail} and we will delete it.
        </p>
      </Section>

      <Section title="Cookies and consent">
        <p>
          We use browser local storage for technical purposes only (session, language, theme,
          consent choice). Google advertising — and its cookies — is loaded{' '}
          <strong>only if you agree</strong> through the banner: if you decline or make no choice,
          the ad script is never executed at all, so no request is made and no cookie is created.
          You can change your mind at any time from <strong>Settings → Cookie preferences</strong>{' '}
          or from{' '}
          <a
            href="https://adssettings.google.com"
            target="_blank"
            rel="noreferrer"
            className="text-ember-ink hover:underline"
          >
            Google Ads Settings
          </a>
          . rabar+ subscribers see no advertising and the script is not loaded at all.
        </p>
      </Section>

      <Section title="US residents (CCPA/CPRA)">
        <p>
          If you live in California or another US state with comparable law, you have the right to
          know, correct and delete personal data about you, without discrimination for exercising
          these rights. We do not “sell” personal data. Personalised advertising may constitute
          “sharing” under the CPRA: it happens <strong>only with your consent</strong> and you can
          withdraw it at any time from Settings → Cookie preferences (this is our “Do Not Sell or
          Share My Personal Information”). We automatically honour the{' '}
          <a
            href="https://globalprivacycontrol.org"
            target="_blank"
            rel="noreferrer"
            className="text-ember-ink hover:underline"
          >
            Global Privacy Control
          </a>{' '}
          signal: if it is enabled in your browser, personalised advertising stays off. To exercise
          your rights write to {privacyMail}.
        </p>
      </Section>
    </LegalLayout>
  );
}
