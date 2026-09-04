import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';
import { entity, mancante } from '../legal/entity.js';

// Termini di servizio. I dati del prestatore vivono in src/legal/entity.js.
// L'italiano è la versione autorevole; ogni altra lingua della UI riceve la
// traduzione inglese.
export default function Tos() {
  const { lang } = useI18n();
  return lang === 'it' ? <TosIt /> : <TosEn />;
}

const UPDATED_IT = '3 settembre 2026';
const UPDATED_EN = 'September 3, 2026';

const mailTo = (address) => (
  <a href={`mailto:${address}`} className="text-ember-ink hover:underline">
    {address}
  </a>
);

const abuseMail = mailTo(entity.emailAbuse);
const generalMail = mailTo(entity.emailGenerale);

function Campo({ value }) {
  return mancante(value) ? (
    <mark className="rounded bg-ember-danger/20 px-1 font-semibold text-ember-danger">{value}</mark>
  ) : (
    <>{value}</>
  );
}

function Prestatore() {
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

function TosIt() {
  return (
    <LegalLayout title="Termini di servizio" updated={UPDATED_IT}>
      <p>
        Questi termini regolano l’uso di rabar. Accedendo o usando il servizio dichiari di
        accettarli. Se non li accetti, non usare il servizio.
      </p>

      <Section title="Chi eroga il servizio">
        <Prestatore />
        <p>
          Contatto generale: {generalMail}. Per segnalare un abuso o un contenuto illecito:{' '}
          {abuseMail} — è anche il punto di contatto per le autorità ai sensi degli artt. 11-12 del
          regolamento sui servizi digitali (DSA).
        </p>
      </Section>

      <Section title="Il servizio">
        <p>
          rabar è una mappa di bar valutati dalla community su prezzo, qualità dei drinks,
          socialità, varietà e orari. I dati dei locali provengono da OpenStreetMap; le valutazioni
          sono contenuti generati dagli utenti e non riflettono opinioni del gestore.
        </p>
      </Section>

      <Section title="Account">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Devi avere almeno 18 anni (o la maggiore età prevista dove vivi): il servizio riguarda
            locali che vendono alcolici.
          </li>
          <li>
            Sei responsabile delle attività svolte dal tuo account e della riservatezza delle
            credenziali.
          </li>
          <li>Un solo account per persona; è vietato impersonare altri.</li>
        </ul>
      </Section>

      <Section title="Servizi a pagamento">
        <p>
          rabar è gratuito. Due cose si pagano, e sono facoltative.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>rabar+</strong> — abbonamento che dà il badge “+”, tutti i temi e nessuna
            pubblicità. Costa <strong>1,99 € a settimana</strong>, <strong>3,99 € al mese</strong> o{' '}
            <strong>29,99 € all’anno</strong>, IVA inclusa.
          </li>
          <li>
            <strong>Boost</strong> — mette in evidenza un bar che hai rivendicato o un evento che
            hai pubblicato. Costa <strong>3 € per 3 giorni</strong>, <strong>6 € per 7 giorni</strong>{' '}
            o <strong>20 € per 30 giorni</strong>, IVA inclusa. Per i bar puoi scegliere anche un
            raggio di visibilità da 1 a 50 km, con un sovrapprezzo di 1,5 centesimi per chilometro
            al giorno. È un acquisto singolo, non si rinnova.
          </li>
        </ul>
        <p>
          <strong>Rinnovo e disdetta.</strong> rabar+ si rinnova automaticamente alla scadenza del
          periodo scelto, finché non lo disdici. La disdetta e il cambio di piano si fanno dal
          portale clienti Stripe, che apri da <strong>Impostazioni</strong>: hanno effetto dalla
          scadenza del periodo già pagato, che resta tuo fino in fondo. Le ricevute si scaricano
          dallo stesso portale.
        </p>
        <p>
          <strong>Diritto di recesso.</strong> Come consumatore hai quattordici giorni per
          ripensarci, senza doverne dire il motivo (D.Lgs. 206/2005, artt. 52-59). Poiché rabar+ e i
          boost sono contenuti digitali che iniziano a funzionare <em>subito</em>, al momento
          dell’acquisto ti chiediamo di confermare due cose insieme: che vuoi che il servizio parta
          immediatamente, e che sai che così facendo il diritto di recesso si esaurisce con
          l’erogazione (art. 59, comma 1, lettera o). È una spunta esplicita: senza, il pagamento
          non parte. Se non la dai, o se il servizio non è ancora partito, puoi recedere scrivendo a{' '}
          {generalMail}: rimborsiamo entro quattordici giorni dalla richiesta, con lo stesso mezzo di
          pagamento.
        </p>
        <p>
          <strong>Sull’App Store.</strong> Nell’app iOS i boost si comprano come acquisti in-app: i
          rimborsi li gestisce Apple secondo le sue procedure, non noi. rabar+ non si vende dall’app
          iOS: lì l’abbonamento si legge soltanto.
        </p>
      </Section>

      <Section title="Regole sui contenuti">
        <p>Pubblicando valutazioni e commenti ti impegni a non inserire contenuti che siano:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>illeciti, diffamatori, offensivi, discriminatori o molesti;</li>
          <li>falsi, ingannevoli o volti a manipolare le medie di un locale;</li>
          <li>spam, pubblicità non richiesta o dati personali di terzi.</li>
        </ul>
        <p>
          Concedi a rabar una licenza non esclusiva per mostrare i contenuti che pubblichi
          all’interno del servizio.
        </p>
      </Section>

      <Section title="Come funzionano le valutazioni">
        <p>
          Le valutazioni le scrivono gli utenti. <strong>Non verifichiamo</strong> che chi scrive sia
          stato davvero nel locale: non abbiamo modo di saperlo, e preferiamo dirlo piuttosto che
          lasciarlo intendere. Quello che facciamo è limitare l’effetto di una singola persona —
          ogni account può valutare un bar <strong>una volta sola</strong>, e la modifica sostituisce
          il voto precedente invece di aggiungersi — e intervenire dopo la pubblicazione su
          segnalazione o d’ufficio. Le medie che vedi sono ricalcolate dal database a ogni voto, non
          scritte a mano.
        </p>
        <p>
          <strong>Come ordiniamo i risultati.</strong> Nella mappa e negli elenchi vengono prima i
          bar e gli eventi <strong>sponsorizzati</strong>, cioè quelli per cui il proprietario o
          l’organizzatore ha pagato un boost; sono sempre contrassegnati dall’etichetta
          “Sponsorizzato”. Dopo di quelli conta la distanza da te, e nelle classifiche dei drink la
          media dei voti. Un bar sponsorizzato può comparirti anche se è fuori dal raggio che hai
          impostato, fino alla distanza che il proprietario ha pagato. Nessun altro criterio
          influenza l’ordine, e la posizione non è mai in vendita al di fuori dei boost.
        </p>
      </Section>

      <Section title="Moderazione">
        <p>
          Le decisioni di moderazione le prendono <strong>persone</strong>: non usiamo sistemi
          automatici per rimuovere contenuti o limitare account. Possiamo rimuovere un contenuto o
          sospendere e bloccare un account che viola questi termini o la legge.
        </p>
        <p>
          <strong>Se ti riguarda, te lo diciamo.</strong> Quando rimuoviamo una tua valutazione o
          limitiamo il tuo account ricevi una notifica con il motivo e l’indirizzo a cui contestare
          la decisione (art. 17 DSA). Scrivendo a {abuseMail} la decisione viene riesaminata da una
          persona diversa da quella che l’ha presa.
        </p>
        <p>
          <strong>Segnalare un contenuto illecito.</strong> Chiunque può farlo, anche senza account,
          scrivendo a {abuseMail}, oppure dall’app con “Segnala” nel menu dell’account. Indica il
          contenuto, dove si trova e perché lo ritieni illecito. Confermiamo la ricezione e ti
          comunichiamo l’esito (art. 16 DSA).
        </p>
      </Section>

      <Section title="Esclusioni di responsabilità">
        <p>
          Il servizio è fornito “così com’è”, senza garanzie ulteriori rispetto a quelle che la legge
          riconosce al consumatore. Le valutazioni sono soggettive; non garantiamo l’accuratezza dei
          dati sui locali (orari, indirizzi, disponibilità), che arrivano da OpenStreetMap. L’uso di
          alcolici è responsabilità dell’utente: bevi responsabilmente.
        </p>
      </Section>

      <Section title="Legge applicabile e foro">
        <p>
          Si applica la legge italiana. Se sei un consumatore, resta ferma la competenza del giudice
          del luogo in cui risiedi o hai eletto domicilio (art. 66-bis del Codice del consumo), e
          resta fermo il livello di tutela che la legge del tuo paese di residenza ti garantisce.
        </p>
      </Section>

      <Section title="Modifiche">
        <p>
          Possiamo aggiornare questi termini; la versione aggiornata sarà pubblicata su questa pagina
          con la nuova data. Se una modifica incide sui servizi a pagamento a cui sei abbonato, te lo
          comunichiamo in anticipo e puoi disdire prima che abbia effetto.
        </p>
      </Section>
    </LegalLayout>
  );
}

function TosEn() {
  return (
    <LegalLayout title="Terms of Service" updated={UPDATED_EN}>
      <p>
        These terms govern the use of rabar. By accessing or using the service you agree to them. If
        you do not agree, do not use the service.
      </p>

      <Section title="Who provides the service">
        <Prestatore />
        <p>
          General contact: {generalMail}. To report abuse or illegal content: {abuseMail} — this is
          also the point of contact for authorities under Articles 11-12 of the Digital Services Act.
        </p>
      </Section>

      <Section title="The service">
        <p>
          rabar is a map of bars rated by the community on price, drinks quality, vibe, variety and
          opening hours. Venue data comes from OpenStreetMap; ratings are user-generated content and
          do not reflect the operator’s opinions.
        </p>
      </Section>

      <Section title="Account">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            You must be at least 18 (or the age of majority where you live): the service is about
            venues that sell alcohol.
          </li>
          <li>
            You are responsible for your account’s activity and for keeping your credentials
            confidential.
          </li>
          <li>One account per person; impersonating others is forbidden.</li>
        </ul>
      </Section>

      <Section title="Paid services">
        <p>rabar is free. Two things are paid for, and both are optional.</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>rabar+</strong> — a subscription giving the “+” badge, all themes and no
            advertising. It costs <strong>€1.99 per week</strong>, <strong>€3.99 per month</strong>{' '}
            or <strong>€29.99 per year</strong>, VAT included.
          </li>
          <li>
            <strong>Boost</strong> — highlights a bar you have claimed or an event you published. It
            costs <strong>€3 for 3 days</strong>, <strong>€6 for 7 days</strong> or{' '}
            <strong>€20 for 30 days</strong>, VAT included. For bars you can also pick a visibility
            radius from 1 to 50 km, at a surcharge of 1.5 cents per kilometre per day. It is a
            one-off purchase and does not renew.
          </li>
        </ul>
        <p>
          <strong>Renewal and cancellation.</strong> rabar+ renews automatically at the end of each
          period until you cancel. Cancelling and changing plan are done through the Stripe customer
          portal, which you open from <strong>Settings</strong>: they take effect at the end of the
          period you have already paid for, which stays yours in full. Receipts are downloaded from
          the same portal.
        </p>
        <p>
          <strong>Right of withdrawal.</strong> As a consumer you have fourteen days to change your
          mind, without giving a reason (Legislative Decree 206/2005, Arts. 52-59, implementing
          Directive 2011/83/EU). Because rabar+ and boosts are digital content that starts working{' '}
          <em>immediately</em>, at the moment of purchase we ask you to confirm two things together:
          that you want the service to start straight away, and that you understand the right of
          withdrawal is therefore lost once it has been supplied (Art. 59(1)(o)). It is an explicit
          tick box: without it the payment does not start. If you do not give it, or the service has
          not started yet, you can withdraw by writing to {generalMail}: we refund within fourteen
          days of the request, using the same payment method.
        </p>
        <p>
          <strong>On the App Store.</strong> In the iOS app, boosts are bought as in-app purchases:
          refunds are handled by Apple under its own procedures, not by us. rabar+ is not sold from
          the iOS app; there the subscription is only read.
        </p>
      </Section>

      <Section title="Content rules">
        <p>By posting ratings and comments you agree not to submit content that is:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>unlawful, defamatory, offensive, discriminatory or harassing;</li>
          <li>false, misleading or aimed at manipulating a venue’s averages;</li>
          <li>spam, unsolicited advertising or third parties’ personal data.</li>
        </ul>
        <p>
          You grant rabar a non-exclusive license to display the content you post within the service.
        </p>
      </Section>

      <Section title="How ratings work">
        <p>
          Ratings are written by users. <strong>We do not verify</strong> that the author actually
          visited the venue: we have no way of knowing, and we would rather say so than let you
          assume otherwise. What we do is limit any one person’s effect — each account can rate a bar{' '}
          <strong>only once</strong>, and editing replaces the previous vote instead of adding to it
          — and act after publication, on report or on our own initiative. The averages you see are
          recomputed by the database on every vote, never written by hand.
        </p>
        <p>
          <strong>How we rank results.</strong> On the map and in listings,{' '}
          <strong>sponsored</strong> bars and events come first — those whose owner or organizer paid
          for a boost; they always carry the “Sponsored” label. After those, distance from you
          decides, and in drink rankings the average score. A sponsored bar may appear even when it
          falls outside the radius you set, up to the distance its owner paid for. No other criterion
          affects the order, and placement is never for sale outside boosts.
        </p>
      </Section>

      <Section title="Moderation">
        <p>
          Moderation decisions are made by <strong>people</strong>: we do not use automated systems
          to remove content or restrict accounts. We may remove content and suspend or ban an account
          that breaches these terms or the law.
        </p>
        <p>
          <strong>If it concerns you, we tell you.</strong> When we remove one of your ratings or
          restrict your account you receive a notification with the reason and the address at which
          to challenge the decision (Art. 17 DSA). Writing to {abuseMail} gets the decision reviewed
          by someone other than whoever made it.
        </p>
        <p>
          <strong>Reporting illegal content.</strong> Anyone can do it, with or without an account,
          by writing to {abuseMail} or from the app via “Report” in the account menu. State the
          content, where it is and why you believe it is unlawful. We confirm receipt and tell you
          the outcome (Art. 16 DSA).
        </p>
      </Section>

      <Section title="Disclaimers">
        <p>
          The service is provided “as is”, without warranties beyond those the law grants consumers.
          Ratings are subjective; we do not guarantee the accuracy of venue data (hours, addresses,
          availability), which comes from OpenStreetMap. Alcohol consumption is the user’s
          responsibility: drink responsibly.
        </p>
      </Section>

      <Section title="Governing law and jurisdiction">
        <p>
          Italian law applies. If you are a consumer, the courts of the place where you reside or
          have elected domicile remain competent (Art. 66-bis of the Italian Consumer Code), and the
          level of protection granted by the law of your country of residence is unaffected.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms; the updated version will be published on this page with the new
          date. If a change affects paid services you subscribe to, we tell you in advance and you
          can cancel before it takes effect.
        </p>
      </Section>
    </LegalLayout>
  );
}
