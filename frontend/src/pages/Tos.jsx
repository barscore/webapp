import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';
import { entity, identificativi, mancante, sedeCompleta } from '../legal/entity.js';

// Termini di servizio. I dati del prestatore vivono in src/legal/entity.js.
// L'italiano è la versione autorevole; ogni altra lingua della UI riceve la
// traduzione inglese.
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
        del sito web e delle applicazioni rabar (di seguito, il «Servizio»). L’accesso al Servizio o
        il suo utilizzo comportano l’accettazione dei Termini; chi non intende accettarli è tenuto a
        non utilizzare il Servizio.
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
          criteri: prezzo, qualità dei drink, socialità, varietà e orari. I dati relativi ai locali
          provengono da OpenStreetMap; le valutazioni costituiscono contenuti generati dagli utenti e
          non esprimono l’opinione del prestatore.
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
            l’accesso a tutti i temi grafici e l’assenza di pubblicità. Il prezzo è di{' '}
            <strong>1,99 € a settimana</strong>, <strong>3,99 € al mese</strong> oppure{' '}
            <strong>29,99 € all’anno</strong>, IVA inclusa.
          </li>
          <li>
            <strong>Boost</strong> — servizio di messa in evidenza di un locale rivendicato o di un
            evento pubblicato dall’utente. Il prezzo è di <strong>3 € per 3 giorni</strong>,{' '}
            <strong>6 € per 7 giorni</strong> oppure <strong>20 € per 30 giorni</strong>, IVA
            inclusa. Per i locali è possibile definire un raggio di visibilità compreso tra 1 e 50
            km, con un sovrapprezzo di 1,5 centesimi di euro per chilometro al giorno. Il boost è un
            acquisto singolo e non prevede rinnovo automatico.
          </li>
        </List>
        <p>
          <strong>Rinnovo e disdetta.</strong> L’abbonamento rabar+ si rinnova automaticamente alla
          scadenza del periodo prescelto, salvo disdetta. La disdetta e il cambio di piano si
          effettuano tramite il portale clienti Stripe, accessibile dalla sezione{' '}
          <strong>Impostazioni</strong>, e producono effetto dalla scadenza del periodo già pagato,
          che resta interamente fruibile. Le ricevute sono disponibili nel medesimo portale.
        </p>
        <p>
          <strong>Diritto di recesso.</strong> Il consumatore dispone di un termine di quattordici
          giorni per recedere dal contratto senza indicarne le ragioni (artt. 52-59 D.Lgs. 206/2005,
          «Codice del consumo»). Poiché rabar+ e i boost consistono nella fornitura di contenuti
          digitali la cui esecuzione ha inizio immediatamente, al momento dell’acquisto è richiesto
          all’utente di confermare espressamente di voler ottenere l’esecuzione immediata del
          servizio e di essere consapevole che, in tal caso, il diritto di recesso si estingue con
          l’avvio dell’esecuzione (art. 59, comma 1, lett. o, Codice del consumo). In assenza di tale
          conferma il pagamento non viene effettuato. Qualora la conferma non sia stata prestata, o
          l’esecuzione non sia ancora iniziata, il recesso può essere esercitato scrivendo a{' '}
          {generalMail}; il rimborso è effettuato entro quattordici giorni dalla richiesta, con il
          medesimo mezzo di pagamento utilizzato.
        </p>
        <p>
          <strong>Acquisti tramite App Store.</strong> Nell’applicazione iOS i boost sono venduti come
          acquisti in-app; le relative richieste di rimborso sono gestite da Apple secondo le proprie
          procedure. L’abbonamento rabar+ non è acquistabile dall’applicazione iOS, nella quale è
          soltanto riconosciuto se sottoscritto altrove.
        </p>
      </Section>

      <Section title="5. Contenuti pubblicati dagli utenti">
        <p>Pubblicando valutazioni e commenti, l’utente si impegna a non inserire contenuti:</p>
        <List>
          <li>illeciti, diffamatori, offensivi, discriminatori o molesti;</li>
          <li>falsi, ingannevoli o finalizzati ad alterare la valutazione di un locale;</li>
          <li>costituenti spam, pubblicità non richiesta o contenenti dati personali di terzi.</li>
        </List>
        <p>
          L’utente concede al prestatore una licenza non esclusiva e gratuita per la visualizzazione,
          all’interno del Servizio, dei contenuti pubblicati.
        </p>
      </Section>

      <Section title="6. Funzionamento delle valutazioni e ordinamento dei risultati">
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

      <Section title="7. Moderazione">
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
          sostituzione del nome utente o di limitazione dell’account, l’utente riceve una comunicazione contenente i motivi della
          decisione e le modalità per contestarla (art. 17 DSA). Il reclamo può essere presentato a{' '}
          {abuseMail} ed è esaminato da una persona diversa da quella che ha assunto la decisione.
        </p>
        <p>
          <strong>Segnalazione di contenuti illeciti.</strong> Chiunque, anche senza account, può
          segnalare un contenuto ritenuto illecito scrivendo a {abuseMail} o, dall’applicazione,
          tramite la funzione «Segnala» del menu account, indicando il contenuto, la sua collocazione
          e le ragioni della segnalazione. Il prestatore conferma la ricezione e comunica l’esito
          della valutazione (art. 16 DSA).
        </p>
      </Section>

      <Section title="8. Limitazione di responsabilità">
        <p>
          Il Servizio è fornito «così com’è», senza garanzie ulteriori rispetto a quelle riconosciute
          al consumatore dalla legge. Le valutazioni hanno carattere soggettivo; il prestatore non
          garantisce l’esattezza dei dati relativi ai locali (orari, indirizzi, disponibilità), che
          provengono da OpenStreetMap. Il consumo di bevande alcoliche avviene sotto la
          responsabilità dell’utente, che è invitato a farlo in modo responsabile.
        </p>
      </Section>

      <Section title="9. Legge applicabile e foro competente">
        <p>
          I presenti Termini sono regolati dalla legge italiana. Qualora l’utente rivesta la qualità
          di consumatore, è competente in via inderogabile il giudice del luogo di residenza o di
          domicilio elettivo dello stesso (art. 66-bis Codice del consumo), fermo restando il livello
          di tutela garantito dalle norme imperative del paese di residenza.
        </p>
      </Section>

      <Section title="10. Modifiche ai termini">
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
        These terms and conditions (the “Terms”) govern access to and use of the rabar website and
        applications (the “Service”). Accessing or using the Service constitutes acceptance of the
        Terms; anyone who does not accept them must not use the Service.
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
          drinks quality, vibe, variety and opening hours. Venue data are sourced from OpenStreetMap;
          ratings are user-generated content and do not reflect the views of the provider.
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
        </List>
      </Section>

      <Section title="4. Paid services">
        <p>Use of the Service is free of charge. The following paid services are optionally available:</p>
        <List>
          <li>
            <strong>rabar+</strong> — a subscription including the “+” badge on the profile, access to
            all colour themes and an ad-free experience. The price is <strong>€1.99 per week</strong>,{' '}
            <strong>€3.99 per month</strong> or <strong>€29.99 per year</strong>, VAT included.
          </li>
          <li>
            <strong>Boost</strong> — a service that highlights a venue claimed or an event published
            by the user. The price is <strong>€3 for 3 days</strong>, <strong>€6 for 7 days</strong>{' '}
            or <strong>€20 for 30 days</strong>, VAT included. For venues, a visibility radius of 1
            to 50 km may be set, with a surcharge of €0.015 per kilometre per day. A boost is a
            one-off purchase and does not renew automatically.
          </li>
        </List>
        <p>
          <strong>Renewal and cancellation.</strong> The rabar+ subscription renews automatically at
          the end of the chosen period unless cancelled. Cancellation and plan changes are made
          through the Stripe customer portal, accessible from <strong>Settings</strong>, and take
          effect at the end of the period already paid for, which remains fully available. Receipts
          are available in the same portal.
        </p>
        <p>
          <strong>Right of withdrawal.</strong> Consumers have fourteen days to withdraw from the
          contract without giving any reason (Arts. 52-59 of Italian Legislative Decree 206/2005, the
          “Consumer Code”). Since rabar+ and boosts consist of the supply of digital content whose
          performance begins immediately, at the time of purchase users are asked to expressly
          confirm that they request immediate performance and acknowledge that, in that case, the
          right of withdrawal is lost once performance has begun (Art. 59(1)(o) of the Consumer
          Code). Without this confirmation no payment is taken. Where the confirmation has not been
          given, or performance has not yet begun, the right of withdrawal may be exercised by
          writing to {generalMail}; refunds are made within fourteen days of the request, using the
          same means of payment.
        </p>
        <p>
          <strong>App Store purchases.</strong> In the iOS application, boosts are sold as in-app
          purchases; refund requests are handled by Apple under its own procedures. The rabar+
          subscription cannot be purchased in the iOS application, where it is only recognised if
          subscribed elsewhere.
        </p>
      </Section>

      <Section title="5. User content">
        <p>By publishing ratings and comments, users undertake not to post content that is:</p>
        <List>
          <li>unlawful, defamatory, offensive, discriminatory or harassing;</li>
          <li>false, misleading or intended to distort a venue’s rating;</li>
          <li>spam or unsolicited advertising, or that contains personal data of third parties.</li>
        </List>
        <p>
          Users grant the provider a non-exclusive, royalty-free licence to display the content they
          publish within the Service.
        </p>
      </Section>

      <Section title="6. How ratings work and how results are ranked">
        <p>
          Ratings are written by users. The provider <strong>does not verify</strong> that the author
          of a rating actually visited the venue. To limit the influence of individual users, each
          account may rate a venue <strong>only once</strong>, and any edit replaces the previous
          rating; content is also moderated after publication, following a report or on the
          provider’s own initiative. Averages are calculated automatically by the system with every
          new rating and are not subject to manual intervention.
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

      <Section title="7. Moderation">
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
          or an account is restricted, the user receives a notice setting out the reasons for the decision and how to
          contest it (Art. 17 DSA). Complaints may be submitted to {abuseMail} and are reviewed by a
          person other than the one who took the decision.
        </p>
        <p>
          <strong>Reporting illegal content.</strong> Anyone, including those without an account,
          may report content they consider illegal by writing to {abuseMail} or, within the
          application, through the “Report” function in the account menu, stating the content, its
          location and the reasons for the report. The provider acknowledges receipt and
          communicates the outcome of its assessment (Art. 16 DSA).
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          The Service is provided “as is”, without warranties beyond those granted to consumers by
          law. Ratings are subjective; the provider does not guarantee the accuracy of venue data
          (opening hours, addresses, availability), which are sourced from OpenStreetMap. The
          consumption of alcoholic beverages is the sole responsibility of the user, who is
          encouraged to drink responsibly.
        </p>
      </Section>

      <Section title="9. Governing law and jurisdiction">
        <p>
          These Terms are governed by Italian law. Where the user is a consumer, the courts of the
          user’s place of residence or elected domicile have mandatory jurisdiction (Art. 66-bis of
          the Consumer Code), without prejudice to the level of protection afforded by the mandatory
          provisions of the country of residence.
        </p>
      </Section>

      <Section title="10. Changes to the Terms">
        <p>
          The provider may update these Terms; the updated version is published on this page with the
          date of the update. Changes affecting paid services to which the user has subscribed are
          notified with reasonable advance notice, and the user may cancel before they take effect.
        </p>
      </Section>
    </LegalLayout>
  );
}
