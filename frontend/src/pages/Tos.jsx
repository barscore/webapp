import LegalLayout, { Section } from '../components/LegalLayout.jsx';

// Terms of service. Generic but real — adjust foro/contatti before publishing.
export default function Tos() {
  return (
    <LegalLayout title="Termini di servizio" updated="2 luglio 2026">
      <p>
        Questi termini regolano l’uso di rabar. Accedendo o usando l’app dichiari di accettarli. Se
        non li accetti, non usare il servizio.
      </p>

      <Section title="Il servizio">
        <p>
          rabar è una mappa di bar valutati dalla community su prezzo, qualità dell’alcol e socialità.
          I dati dei locali provengono da OpenStreetMap; le valutazioni sono contenuti generati dagli
          utenti e non riflettono opinioni del gestore.
        </p>
      </Section>

      <Section title="Account">
        <ul className="list-disc space-y-1 pl-5">
          <li>Devi avere almeno 18 anni: il servizio riguarda locali che vendono alcolici.</li>
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
          nostra discrezione e senza preavviso. Per segnalare un abuso scrivi a{' '}
          <a href="mailto:abuse@rabar.app" className="text-ember-primary hover:underline">abuse@rabar.app</a>.
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
