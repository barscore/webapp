import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';

// Terms of service. Generic but real — adjust foro/contatti before publishing.
// Italian is the authoritative version; every other UI language gets the
// English translation.
export default function Tos() {
  const { lang } = useI18n();
  return lang === 'it' ? <TosIt /> : <TosEn />;
}

const abuseMail = (
  <a href="mailto:abuse@rabar.app" className="text-ember-ink hover:underline">
    abuse@rabar.app
  </a>
);

function TosIt() {
  return (
    <LegalLayout title="Termini di servizio" updated="14 luglio 2026">
      <p>
        Questi termini regolano l’uso di rabar. Accedendo o usando l’app dichiari di accettarli. Se
        non li accetti, non usare il servizio.
      </p>

      <Section title="Il servizio">
        <p>
          rabar è una mappa di bar valutati dalla community su prezzo, qualità dei drinks,
          socialità, varietà e orari.
          I dati dei locali provengono da OpenStreetMap; le valutazioni sono contenuti generati dagli
          utenti e non riflettono opinioni del gestore.
        </p>
      </Section>

      <Section title="Account">
        <ul className="list-disc space-y-1 pl-5">
          <li>Devi avere almeno 18 anni (o la maggiore età prevista dove vivi): il servizio riguarda locali che vendono alcolici.</li>
          <li>Sei responsabile delle attività svolte dal tuo account e della riservatezza delle credenziali.</li>
          <li>Un solo account per persona; è vietato impersonare altri.</li>
        </ul>
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

      <Section title="Moderazione">
        <p>
          Possiamo rimuovere contenuti e sospendere o bloccare account che violano questi termini, a
          nostra discrezione e senza preavviso. Per segnalare un abuso scrivi a {abuseMail}.
        </p>
      </Section>

      <Section title="Esclusioni di responsabilità">
        <p>
          Il servizio è fornito “così com’è”, senza garanzie. Le valutazioni sono soggettive; non
          garantiamo l’accuratezza dei dati sui locali (orari, indirizzi, disponibilità). L’uso di
          alcolici è responsabilità dell’utente: bevi responsabilmente.
        </p>
      </Section>

      <Section title="Modifiche">
        <p>
          Possiamo aggiornare questi termini; la versione aggiornata sarà pubblicata su questa pagina
          con la nuova data. L’uso continuato dopo le modifiche ne implica l’accettazione.
        </p>
      </Section>
    </LegalLayout>
  );
}

function TosEn() {
  return (
    <LegalLayout title="Terms of Service" updated="July 14, 2026">
      <p>
        These terms govern the use of rabar. By accessing or using the app you agree to them. If
        you do not agree, do not use the service.
      </p>

      <Section title="The service">
        <p>
          rabar is a map of bars rated by the community on price, drinks quality, vibe, variety
          and opening hours. Venue data comes from OpenStreetMap; ratings are user-generated
          content and do not reflect the operator’s opinions.
        </p>
      </Section>

      <Section title="Account">
        <ul className="list-disc space-y-1 pl-5">
          <li>You must be at least 18 (or the age of majority where you live): the service is about venues that sell alcohol.</li>
          <li>You are responsible for your account’s activity and for keeping your credentials confidential.</li>
          <li>One account per person; impersonating others is forbidden.</li>
        </ul>
      </Section>

      <Section title="Content rules">
        <p>By posting ratings and comments you agree not to submit content that is:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>unlawful, defamatory, offensive, discriminatory or harassing;</li>
          <li>false, misleading or aimed at manipulating a venue’s averages;</li>
          <li>spam, unsolicited advertising or third parties’ personal data.</li>
        </ul>
        <p>
          You grant rabar a non-exclusive license to display the content you post within the
          service.
        </p>
      </Section>

      <Section title="Moderation">
        <p>
          We may remove content and suspend or ban accounts that violate these terms, at our
          discretion and without notice. To report abuse, write to {abuseMail}.
        </p>
      </Section>

      <Section title="Disclaimers">
        <p>
          The service is provided “as is”, without warranties. Ratings are subjective; we do not
          guarantee the accuracy of venue data (hours, addresses, availability). Alcohol
          consumption is the user’s responsibility: drink responsibly.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms; the updated version will be published on this page with the
          new date. Continued use after changes implies acceptance.
        </p>
      </Section>
    </LegalLayout>
  );
}
