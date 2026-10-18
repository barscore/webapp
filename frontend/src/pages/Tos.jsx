import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';
import { entity, identificativi, mancante, sedeCompleta } from '../legal/entity.js';

// Termini di servizio. I dati del prestatore vivono in src/legal/entity.js.
// L'italiano è la versione autorevole; ogni altra lingua della UI riceve la
// traduzione inglese. Valgono per sito, app Android e app iOS: i canali di
// pagamento diversi sono descritti qui, non in copie per piattaforma.
export default function Tos() {
  const { lang } = useI18n();
  return lang === 'it' ? <TosIt /> : <TosEn />;
}

const UPDATED_IT = '17 ottobre 2026';
const UPDATED_EN = 'October 17, 2026';

const mailTo = (address) => (
  <a href={`mailto:${address}`} className="text-ember-ink hover:underline">
    {address}
  </a>
);

const abuseMail = mailTo(entity.emailAbuse);
const generalMail = mailTo(entity.emailGenerale);

// Campi ancora DA_COMPILARE in legal/entity.js: nascosti per ora, non
// evidenziati. Restano da compilare lì.
function Campo({ value }) {
  return mancante(value) ? null : <>{value}</>;
}

function Prestatore() {
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

function TosIt() {
  return (
    <LegalLayout title="Termini e condizioni di servizio" updated={UPDATED_IT}>
      <p>
        I presenti termini e condizioni (di seguito, i «Termini») disciplinano l’accesso e l’utilizzo
        del sito web www.rabar.it e delle applicazioni rabar per Android e iOS (di seguito, il
        «Servizio»). L’accesso al Servizio o il suo utilizzo comportano l’accettazione dei Termini;
        chi non intende accettarli è tenuto a non utilizzare il Servizio.
      </p>

      <Section title="1. Prestatore del servizio">
        <Prestatore />
        <p>
          Per comunicazioni di carattere generale è possibile scrivere a {generalMail}. Le
          segnalazioni di abusi o di contenuti illeciti vanno inviate a {abuseMail}, indirizzo che
          costituisce altresì il punto di contatto per le autorità ai sensi degli artt. 11 e 12 del
          Regolamento (UE) 2022/2065 (di seguito, «DSA»).
        </p>
      </Section>

      <Section title="2. Oggetto del servizio">
        <p>
          rabar è una mappa di bar e locali valutati dalla comunità degli utenti secondo cinque
          criteri: prezzo, qualità dei drink, socialità, varietà e orari. Il Servizio consente inoltre
          di votare i drink, consultare e seguire gli eventi della zona, ottenere un free drink nei
          locali aderenti e, per i gestori dei locali e gli organizzatori, gestire la propria scheda,
          rispondere alle valutazioni, pubblicare eventi e consultare le statistiche della propria
          presenza.
        </p>
        <p>
          I dati relativi ai locali provengono da OpenStreetMap; le valutazioni costituiscono
          contenuti generati dagli utenti e non esprimono l’opinione del prestatore. rabar{' '}
          <strong>non vende né somministra bevande</strong> e non è parte dei rapporti tra gli utenti
          e i locali, gli organizzatori o i PR, compresa la vendita di prevendite e di ingressi.
        </p>
      </Section>

      <Section title="3. Registrazione e account">
        <List>
          <li>
            L’utilizzo del Servizio è riservato a persone che abbiano compiuto diciotto anni, o l’età
            maggiore prevista dall’ordinamento del paese di residenza, in quanto il Servizio riguarda
            locali che somministrano bevande alcoliche.
          </li>
          <li>
            L’utente è responsabile delle attività svolte tramite il proprio account e della
            riservatezza delle proprie credenziali di accesso.
          </li>
          <li>
            È consentito un solo account per persona. È vietato utilizzare l’identità altrui o
            fornire dati non veritieri.
          </li>
          <li>
            L’utente può eliminare l’account in qualsiasi momento dalla sezione{' '}
            <strong>Impostazioni</strong> o scrivendo all’indirizzo indicato nell’informativa privacy.
            In caso di violazione dei Termini il prestatore può sospendere o disattivare l’account,
            secondo quanto previsto dalla sezione 9.
          </li>
        </List>
      </Section>

      <Section title="4. Servizi a pagamento">
        <p>
          L’utilizzo del Servizio è gratuito. Sono disponibili, in via facoltativa, i seguenti servizi
          a pagamento:
        </p>
        <List>
          <li>
            <strong>rabar+</strong> — abbonamento che comprende il contrassegno «+» sul profilo,
            l’accesso a tutti i temi grafici, l’assenza di pubblicità e un free drink nei locali
            aderenti, alle condizioni della sezione 5. Sul sito il prezzo è di{' '}
            <strong>1,99 € a settimana</strong>, <strong>3,99 € al mese</strong> oppure{' '}
            <strong>29,99 € all’anno</strong>, IVA inclusa.
          </li>
          <li>
            <strong>Boost</strong> — servizio di messa in evidenza di un locale rivendicato o di un
            evento pubblicato dall’utente, per 3, 7 o 30 giorni. Sul sito il prezzo è di{' '}
            <strong>3 € per 3 giorni</strong>, <strong>6 € per 7 giorni</strong> oppure{' '}
            <strong>20 € per 30 giorni</strong>, IVA inclusa; per i locali è possibile definire un
            raggio di visibilità compreso tra 1 e 50 km, con un sovrapprezzo di 1,5 centesimi di euro
            per chilometro al giorno. Un boost acquistato per un locale, se non rimborsato, dà
            inoltre accesso senza scadenza alle statistiche complete di quel locale. Il boost è un acquisto singolo e
            non prevede rinnovo automatico.
          </li>
        </List>
        <p>
          <strong>Canali di pagamento.</strong> Sul sito i pagamenti sono gestiti da Stripe;
          nell’app Android da Google Play; nell’app iOS da Apple. Nelle app il prezzo, la valuta e le
          imposte applicabili sono quelli indicati dallo store prima della conferma dell’acquisto.
          Nell’app iOS sono in vendita i soli boost; l’abbonamento rabar+ sottoscritto altrove vi è
          comunque riconosciuto.
        </p>
        <p>
          <strong>Rinnovo e disdetta.</strong> L’abbonamento rabar+ si rinnova automaticamente alla
          scadenza del periodo prescelto, salvo disdetta, che interrompe i rinnovi successivi e lascia
          interamente fruibile il periodo già pagato. L’abbonamento sottoscritto sul sito si disdice,
          e il piano si cambia, dal portale clienti Stripe, accessibile dalla pagina rabar+ e dalla
          sezione <strong>Impostazioni</strong>, dove sono disponibili anche le ricevute.
          L’abbonamento sottoscritto nell’app Android si gestisce da Google Play → Pagamenti e
          abbonamenti → Abbonamenti, raggiungibile anche da rabar+ → Gestisci abbonamento; ricevute e
          rimborsi sono gestiti da Google Play.
        </p>
        <p>
          <strong>Eliminazione dell’account.</strong> L’eliminazione dell’account annulla
          immediatamente l’abbonamento sottoscritto sul sito, senza rimborso del periodo residuo, e fa
          venire meno i vantaggi in corso. Non annulla invece l’abbonamento sottoscritto tramite
          Google Play, che va disdetto da Google Play; lo stesso vale per la disinstallazione
          dell’app.
        </p>
        <p>
          <strong>Diritto di recesso.</strong> Il consumatore dispone di un termine di quattordici
          giorni per recedere dal contratto senza indicarne le ragioni (artt. 52-59 D.Lgs. 206/2005,
          «Codice del consumo»). Poiché rabar+ e i boost consistono nella fornitura di contenuti e
          servizi digitali la cui esecuzione ha inizio immediatamente, al momento dell’acquisto sul
          sito è richiesto all’utente di confermare espressamente di voler ottenere l’esecuzione
          immediata e di essere consapevole che, in tal caso, il diritto di recesso si estingue con
          l’avvio dell’esecuzione (art. 59, comma 1, lett. o, Codice del consumo); in assenza di tale
          conferma il pagamento non viene effettuato. Qualora la conferma non sia stata prestata, o
          l’esecuzione non sia ancora iniziata, il recesso può essere esercitato scrivendo a{' '}
          {generalMail}; il rimborso è effettuato entro quattordici giorni dalla richiesta, con il
          medesimo mezzo di pagamento utilizzato. Per gli acquisti effettuati tramite Google Play o
          Apple, recesso e rimborsi sono gestiti dallo store secondo le proprie condizioni.
        </p>
        <p>
          <strong>Disponibilità.</strong> Il prestatore può sospendere temporaneamente la vendita dei
          servizi a pagamento. La sospensione non incide sugli abbonamenti e sui boost già acquistati,
          che restano validi fino alla loro scadenza.
        </p>
      </Section>

      <Section title="5. Free drink">
        <List>
          <li>
            Il free drink spetta, <strong>una sola volta per account</strong>, agli abbonati rabar+ e
            agli utenti che hanno attivato la promozione «esploratore», tramite i codici QR diffusi da
            rabar, e hanno pubblicato almeno cinque valutazioni. Per gli abbonati è una delle
            prestazioni comprese in rabar+; per gli esploratori è gratuito e non richiede alcun
            acquisto. Se, prima del riscatto, l’esploratore elimina valutazioni e scende sotto tale
            soglia, il free drink non è più disponibile finché non la raggiunge di nuovo.
          </li>
          <li>
            Il free drink è <strong>offerto dal locale aderente</strong>, nelle fasce orarie da esso
            indicate nel Servizio, che ne stabilisce la composizione. Si riscatta mostrando al gestore
            il codice QR personale presente nell’app, che il gestore convalida con il proprio account.
            La disponibilità dipende dai locali che aderiscono all’iniziativa, visibili nella mappa.
          </li>
          <li>
            Il locale non somministra bevande alcoliche ai minori di diciotto anni né a persone in
            evidente stato di ubriachezza, e può pertanto rifiutare il riscatto o offrire una bevanda
            analcolica. Il free drink non è cedibile, non è convertibile in denaro né in altri beni e
            non è cumulabile.
          </li>
          <li>
            Il prestatore può modificare o terminare l’iniziativa per il futuro, dandone notizia nel
            Servizio; i free drink già ottenuti restano riscattabili nei locali che continuano ad
            aderire.
          </li>
        </List>
      </Section>

      <Section title="6. Gestori, organizzatori e PR">
        <List>
          <li>
            La gestione di un locale si ottiene rivendicandolo con documentazione idonea, e gli
            account PR e organizzatore su richiesta motivata; le richieste sono esaminate da persone.
            Chi rivendica un locale dichiara di esserne titolare o di essere autorizzato a
            rappresentarlo.
          </li>
          <li>
            Il gestore è responsabile della correttezza delle informazioni che pubblica sul proprio
            locale, delle risposte alle valutazioni e dell’onorare i free drink nelle fasce orarie
            dichiarate. Gli organizzatori e i PR sono responsabili degli eventi che pubblicano e dei
            contatti che indicano.
          </li>
          <li>
            Prevendite e ingressi sono venduti direttamente dai PR e dagli organizzatori, al di fuori
            del Servizio: rabar non incassa alcun importo e non risponde dell’esecuzione di tali
            accordi.
          </li>
          <li>
            Le statistiche fornite ai gestori consistono in dati aggregati, che non consentono di
            identificare i singoli utenti.
          </li>
        </List>
      </Section>

      <Section title="7. Contenuti pubblicati dagli utenti">
        <p>
          Pubblicando valutazioni, commenti, risposte, eventi e immagini, l’utente si impegna a non
          inserire contenuti:
        </p>
        <List>
          <li>illeciti, diffamatori, offensivi, discriminatori o molesti;</li>
          <li>falsi, ingannevoli o finalizzati ad alterare la valutazione di un locale;</li>
          <li>
            costituenti spam o pubblicità non richiesta, o contenenti dati personali di terzi;
          </li>
          <li>che violino diritti di terzi, compresi i diritti d’autore sulle immagini.</li>
        </List>
        <p>
          L’utente concede al prestatore una licenza non esclusiva e gratuita per la visualizzazione,
          all’interno del Servizio, dei contenuti pubblicati, per tutta la durata della loro
          pubblicazione.
        </p>
      </Section>

      <Section title="8. Funzionamento delle valutazioni e ordinamento dei risultati">
        <p>
          Le valutazioni sono redatte dagli utenti. Il prestatore <strong>non verifica</strong> che
          l’autore di una valutazione abbia effettivamente frequentato il locale. Per limitare
          l’incidenza di singoli utenti, ciascun account può valutare un locale{' '}
          <strong>una sola volta</strong> e l’eventuale modifica sostituisce la valutazione
          precedente; i contenuti sono inoltre moderati successivamente alla pubblicazione, su
          segnalazione o d’ufficio. I valori medi sono calcolati automaticamente dal sistema a ogni
          nuova valutazione e non sono soggetti a interventi manuali.
        </p>
        <p>
          <strong>Incentivi.</strong> Ogni valutazione fa guadagnare ice cubes, che determinano la
          posizione nella classifica degli utenti, e conta ai fini del free drink degli esploratori.
          Tali vantaggi non dipendono in alcun modo dal punteggio né dal contenuto della valutazione,
          e né i locali né il prestatore possono offrire compensi in cambio di valutazioni positive.
        </p>
        <p>
          <strong>Criteri di ordinamento.</strong> Nella mappa e negli elenchi sono presentati per
          primi i locali e gli eventi <strong>sponsorizzati</strong>, ossia quelli per i quali il
          gestore o l’organizzatore ha acquistato un boost, sempre contrassegnati dall’indicazione
          «Sponsorizzato». Per i restanti risultati rilevano la distanza dall’utente e, nelle
          classifiche dei drink, la media delle valutazioni. Un locale sponsorizzato può essere
          mostrato anche oltre il raggio impostato dall’utente, entro la distanza acquistata dal
          gestore. Nessun altro criterio incide sull’ordinamento e il posizionamento non è in alcun
          modo acquistabile al di fuori dei boost.
        </p>
      </Section>

      <Section title="9. Moderazione">
        <p>
          La rimozione di contenuti già pubblicati e la sospensione o disattivazione degli account
          sono decise da <strong>persone fisiche</strong>, in caso di violazione dei presenti
          Termini o della normativa vigente.
        </p>
        <p>
          <strong>Controllo automatico.</strong> Al momento dell’invio, i contenuti destinati alla
          pubblicazione (valutazioni, commenti, risposte dei gestori, eventi e relative immagini,
          nomi utente) sono esaminati da un sistema automatizzato, composto da un elenco di termini e
          da un classificatore fornito da OpenAI, che ne impedisce la pubblicazione in presenza di
          incitamento all’odio, molestie gravi o minacce, contenuti sessuali espliciti, istigazione
          all’autolesionismo o violenza esplicita. Le critiche, anche severe, a un locale non sono
          bloccate. L’utente è informato subito che il contenuto non è stato pubblicato e può
          modificarlo; un nome utente che non supera il controllo è sostituito con un nome generico,
          con comunicazione all’interessato.
        </p>
        <p>
          <strong>Motivazione delle decisioni.</strong> In caso di rimozione di una valutazione, di
          sostituzione del nome utente o di limitazione dell’account, l’utente riceve una
          comunicazione contenente i motivi della decisione e le modalità per contestarla (art. 17
          DSA). Il reclamo può essere presentato a {abuseMail} entro sei mesi dalla decisione ed è
          esaminato da una persona diversa da quella che l’ha assunta.
        </p>
        <p>
          <strong>Segnalazione di contenuti illeciti.</strong> Chiunque, anche senza account, può
          segnalare un contenuto ritenuto illecito scrivendo a {abuseMail} o, dall’applicazione,
          tramite la funzione «Segnala», indicando il contenuto, la sua collocazione e le ragioni
          della segnalazione. Il prestatore conferma la ricezione e comunica l’esito della
          valutazione (art. 16 DSA). Nelle app è inoltre possibile bloccare un utente, nascondendone i
          contenuti sul proprio dispositivo.
        </p>
      </Section>

      <Section title="10. Limitazione di responsabilità">
        <p>
          Il Servizio è fornito «così com’è», senza garanzie ulteriori rispetto a quelle riconosciute
          al consumatore dalla legge. Le valutazioni hanno carattere soggettivo; il prestatore non
          garantisce l’esattezza dei dati relativi ai locali e agli eventi (orari, indirizzi,
          disponibilità), che provengono da OpenStreetMap o dai gestori e dagli organizzatori. Il
          consumo di bevande alcoliche avviene sotto la responsabilità dell’utente, che è invitato a
          farlo in modo responsabile e a non mettersi alla guida dopo aver bevuto.
        </p>
      </Section>

      <Section title="11. Legge applicabile e foro competente">
        <p>
          I presenti Termini sono regolati dalla legge italiana. Qualora l’utente rivesta la qualità
          di consumatore, è competente in via inderogabile il giudice del luogo di residenza o di
          domicilio elettivo dello stesso (art. 66-bis Codice del consumo), fermo restando il livello
          di tutela garantito dalle norme imperative del paese di residenza.
        </p>
      </Section>

      <Section title="12. Modifiche ai termini">
        <p>
          Il prestatore può aggiornare i presenti Termini; la versione aggiornata è pubblicata su
          questa pagina con l’indicazione della data di aggiornamento. Le modifiche che incidono sui
          servizi a pagamento sottoscritti sono comunicate con congruo preavviso, e l’utente può
          esercitare la disdetta prima della loro entrata in vigore.
        </p>
      </Section>
    </LegalLayout>
  );
}

function TosEn() {
  return (
    <LegalLayout title="Terms and Conditions of Service" updated={UPDATED_EN}>
      <p>
        These terms and conditions (the “Terms”) govern access to and use of the www.rabar.it website
        and the rabar apps for Android and iOS (the “Service”). Accessing or using the Service
        constitutes acceptance of the Terms; anyone who does not accept them must not use the
        Service.
      </p>

      <Section title="1. Service provider">
        <Prestatore />
        <p>
          General enquiries may be sent to {generalMail}. Reports of abuse or illegal content should
          be sent to {abuseMail}, which is also the point of contact for authorities under Articles
          11 and 12 of Regulation (EU) 2022/2065 (the “DSA”).
        </p>
      </Section>

      <Section title="2. Purpose of the Service">
        <p>
          rabar is a map of bars and venues rated by its community of users on five criteria: price,
          drinks quality, vibe, variety and opening hours. The Service also lets users vote on
          drinks, browse and follow local events, get a free drink at participating venues and, for
          venue managers and organisers, manage their page, reply to ratings, publish events and view
          statistics about their presence.
        </p>
        <p>
          Venue data are sourced from OpenStreetMap; ratings are user-generated content and do not
          reflect the views of the provider. rabar <strong>does not sell or serve drinks</strong> and
          is not a party to any dealings between users and venues, organisers or PRs, including the
          sale of presale tickets and entries.
        </p>
      </Section>

      <Section title="3. Registration and accounts">
        <List>
          <li>
            Use of the Service is restricted to persons aged eighteen or over, or the higher age of
            majority provided for in their country of residence, as the Service concerns venues
            serving alcoholic beverages.
          </li>
          <li>
            Users are responsible for all activity carried out through their account and for keeping
            their login credentials confidential.
          </li>
          <li>
            Only one account per person is permitted. Impersonating others or providing false
            information is prohibited.
          </li>
          <li>
            Users may delete their account at any time from <strong>Settings</strong> or by writing
            to the address given in the privacy policy. In the event of a breach of the Terms the
            provider may suspend or deactivate the account, as set out in section 9.
          </li>
        </List>
      </Section>

      <Section title="4. Paid services">
        <p>Use of the Service is free of charge. The following paid services are optionally available:</p>
        <List>
          <li>
            <strong>rabar+</strong> — a subscription including the “+” badge on the profile, access to
            all colour themes, an ad-free experience and one free drink at participating venues, on
            the terms of section 5. On the website the price is <strong>€1.99 per week</strong>,{' '}
            <strong>€3.99 per month</strong> or <strong>€29.99 per year</strong>, VAT included.
          </li>
          <li>
            <strong>Boost</strong> — a service that highlights a venue claimed or an event published
            by the user for 3, 7 or 30 days. On the website the price is{' '}
            <strong>€3 for 3 days</strong>, <strong>€6 for 7 days</strong> or{' '}
            <strong>€20 for 30 days</strong>, VAT included; for venues, a visibility radius of 1 to 50
            km may be set, with a surcharge of €0.015 per kilometre per day. A boost purchased for a
            venue, unless refunded, also unlocks the full statistics of that venue with no expiry. A
            boost is a one-off purchase and does not renew automatically.
          </li>
        </List>
        <p>
          <strong>Payment channels.</strong> On the website payments are handled by Stripe; in the
          Android app by Google Play; in the iOS app by Apple. In the apps, the price, currency and
          applicable taxes are those shown by the store before the purchase is confirmed. Only boosts
          are sold in the iOS app; a rabar+ subscription taken out elsewhere is recognised there.
        </p>
        <p>
          <strong>Renewal and cancellation.</strong> The rabar+ subscription renews automatically at
          the end of the chosen period unless cancelled; cancellation stops subsequent renewals and
          the period already paid for remains fully available. Website subscriptions are cancelled,
          and plans changed, through the Stripe customer portal, accessible from the rabar+ page and
          from <strong>Settings</strong>, where receipts are also available. Subscriptions taken out
          in the Android app are managed in Google Play → Payments and subscriptions → Subscriptions,
          also reachable from rabar+ → Manage subscription; receipts and refunds are handled by
          Google Play.
        </p>
        <p>
          <strong>Account deletion.</strong> Deleting the account immediately cancels a subscription
          taken out on the website, without a refund of the remaining period, and ends any current
          benefits. It does not cancel a subscription taken out through Google Play, which must be
          cancelled in Google Play; the same applies to uninstalling the app.
        </p>
        <p>
          <strong>Right of withdrawal.</strong> Consumers have fourteen days to withdraw from the
          contract without giving any reason (Arts. 52-59 of Italian Legislative Decree 206/2005, the
          “Consumer Code”). Since rabar+ and boosts consist of the supply of digital content and
          services whose performance begins immediately, when purchasing on the website users are
          asked to expressly confirm that they request immediate performance and acknowledge that,
          in that case, the right of withdrawal is lost once performance has begun (Art. 59(1)(o) of
          the Consumer Code); without this confirmation no payment is taken. Where the confirmation
          has not been given, or performance has not yet begun, the right of withdrawal may be
          exercised by writing to {generalMail}; refunds are made within fourteen days of the
          request, using the same means of payment. For purchases made through Google Play or Apple,
          withdrawal and refunds are handled by the store under its own terms.
        </p>
        <p>
          <strong>Availability.</strong> The provider may temporarily suspend the sale of paid
          services. A suspension does not affect subscriptions and boosts already purchased, which
          remain valid until they expire.
        </p>
      </Section>

      <Section title="5. Free drink">
        <List>
          <li>
            The free drink is granted <strong>once per account</strong> to rabar+ subscribers and to
            users who have activated the “explorer” promotion, through the QR codes distributed by
            rabar, and have published at least five ratings. For subscribers it is one of the features
            included in rabar+; for explorers it is free and requires no purchase. If, before redeeming
            it, an explorer deletes ratings and falls below that threshold, the free drink is no longer
            available until the threshold is reached again.
          </li>
          <li>
            The free drink is <strong>offered by the participating venue</strong>, during the time
            slots it states in the Service, which decides what it consists of. It is redeemed by
            showing the venue manager the personal QR code in the app, which the manager validates
            with their own account. Availability depends on the venues taking part in the initiative,
            shown on the map.
          </li>
          <li>
            Venues do not serve alcoholic beverages to anyone under eighteen or visibly intoxicated,
            and may therefore refuse the redemption or offer a non-alcoholic drink. The free drink is
            not transferable, cannot be exchanged for cash or other goods and cannot be combined.
          </li>
          <li>
            The provider may change or end the initiative for the future, giving notice in the
            Service; free drinks already obtained can still be redeemed at venues that continue to
            take part.
          </li>
        </List>
      </Section>

      <Section title="6. Venue managers, organisers and PRs">
        <List>
          <li>
            Management of a venue is obtained by claiming it with suitable documentation, and PR and
            organiser accounts on a reasoned request; requests are reviewed by people. Anyone claiming
            a venue declares that they own it or are authorised to represent it.
          </li>
          <li>
            Venue managers are responsible for the accuracy of the information they publish about
            their venue, for their replies to ratings and for honouring free drinks during the time
            slots they state. Organisers and PRs are responsible for the events they publish and the
            contact details they provide.
          </li>
          <li>
            Presale tickets and entries are sold directly by PRs and organisers, outside the Service:
            rabar collects no money and is not liable for the performance of those arrangements.
          </li>
          <li>
            The statistics provided to venue managers consist of aggregate data that do not identify
            individual users.
          </li>
        </List>
      </Section>

      <Section title="7. User content">
        <p>
          By publishing ratings, comments, replies, events and images, users undertake not to post
          content that is:
        </p>
        <List>
          <li>unlawful, defamatory, offensive, discriminatory or harassing;</li>
          <li>false, misleading or intended to distort a venue’s rating;</li>
          <li>spam or unsolicited advertising, or that contains personal data of third parties;</li>
          <li>in breach of third-party rights, including copyright in images.</li>
        </List>
        <p>
          Users grant the provider a non-exclusive, royalty-free licence to display the content they
          publish within the Service, for as long as it remains published.
        </p>
      </Section>

      <Section title="8. How ratings work and how results are ranked">
        <p>
          Ratings are written by users. The provider <strong>does not verify</strong> that the author
          of a rating actually visited the venue. To limit the influence of individual users, each
          account may rate a venue <strong>only once</strong>, and any edit replaces the previous
          rating; content is also moderated after publication, following a report or on the
          provider’s own initiative. Averages are calculated automatically by the system with every
          new rating and are not subject to manual intervention.
        </p>
        <p>
          <strong>Incentives.</strong> Each rating earns ice cubes, which determine the user’s
          position in the leaderboard, and counts towards the explorers’ free drink. These benefits do
          not depend in any way on the score or content of the rating, and neither venues nor the
          provider may offer any reward in exchange for positive ratings.
        </p>
        <p>
          <strong>Ranking criteria.</strong> On the map and in lists, <strong>sponsored</strong>{' '}
          venues and events — those for which the owner or organiser has purchased a boost — are
          shown first and are always labelled “Sponsored”. For the remaining results, distance from
          the user applies and, in drink rankings, the average rating. A sponsored venue may be shown
          beyond the radius set by the user, up to the distance purchased by the owner. No other
          criterion affects ranking, and placement cannot be purchased in any way other than through
          boosts.
        </p>
      </Section>

      <Section title="9. Moderation">
        <p>
          The removal of content already published and the suspension or deactivation of accounts
          are decided by <strong>human staff</strong>, in the event of a breach of these Terms or of
          applicable law.
        </p>
        <p>
          <strong>Automated screening.</strong> When submitted, content intended for publication
          (ratings, comments, owner replies, events and their images, usernames) is screened by an
          automated system, made up of a list of terms and a classifier provided by OpenAI, which
          prevents its publication where it contains hate speech, serious harassment or threats,
          sexually explicit material, encouragement of self-harm or graphic violence. Criticism of a
          venue, however harsh, is not blocked. The user is told immediately that the content was
          not published and may edit it; a username that fails the screening is replaced with a
          generic one and the user is notified.
        </p>
        <p>
          <strong>Statement of reasons.</strong> Where a rating is removed, a username is replaced
          or an account is restricted, the user receives a notice setting out the reasons for the
          decision and how to contest it (Art. 17 DSA). Complaints may be submitted to {abuseMail}{' '}
          within six months of the decision and are reviewed by a person other than the one who took
          it.
        </p>
        <p>
          <strong>Reporting illegal content.</strong> Anyone, including those without an account,
          may report content they consider illegal by writing to {abuseMail} or, within the
          application, through the “Report” function, stating the content, its location and the
          reasons for the report. The provider acknowledges receipt and communicates the outcome of
          its assessment (Art. 16 DSA). In the apps, users can also block another user, hiding their
          content on their own device.
        </p>
      </Section>

      <Section title="10. Limitation of liability">
        <p>
          The Service is provided “as is”, without warranties beyond those granted to consumers by
          law. Ratings are subjective; the provider does not guarantee the accuracy of venue and
          event data (opening hours, addresses, availability), which are sourced from OpenStreetMap
          or from venue managers and organisers. The consumption of alcoholic beverages is the sole
          responsibility of the user, who is encouraged to drink responsibly and not to drive after
          drinking.
        </p>
      </Section>

      <Section title="11. Governing law and jurisdiction">
        <p>
          These Terms are governed by Italian law. Where the user is a consumer, the courts of the
          user’s place of residence or elected domicile have mandatory jurisdiction (Art. 66-bis of
          the Consumer Code), without prejudice to the level of protection afforded by the mandatory
          provisions of the country of residence.
        </p>
      </Section>

      <Section title="12. Changes to the Terms">
        <p>
          The provider may update these Terms; the updated version is published on this page with the
          date of the update. Changes affecting paid services to which the user has subscribed are
          notified with reasonable advance notice, and the user may cancel before they take effect.
        </p>
      </Section>
    </LegalLayout>
  );
}
