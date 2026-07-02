import LegalLayout, { Section } from '../components/LegalLayout.jsx';

// Privacy policy (GDPR). Generic but real — adjust the titolare/contatti and the
// third-party list to your actual deploy before publishing.
export default function Privacy() {
  return (
    <LegalLayout title="Informativa sulla privacy" updated="2 luglio 2026">
      <p>
        La presente informativa descrive come rabar (“noi”) tratta i dati personali degli utenti
        ai sensi del Regolamento (UE) 2016/679 (“GDPR”). Usando l’app accetti quanto qui descritto.
      </p>

      <Section title="Titolare del trattamento">
        <p>
          Titolare è il gestore di rabar. Per qualsiasi richiesta relativa ai tuoi dati scrivici a{' '}
          <a href="mailto:privacy@rabar.app" className="text-ember-primary hover:underline">privacy@rabar.app</a>.
        </p>
      </Section>

      <Section title="Dati che trattiamo">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account:</strong> email e username, gestiti tramite Supabase Auth (anche login Google).</li>
          <li><strong>Contenuti:</strong> valutazioni (prezzo, qualità, socialità), commenti, bar salvati.</li>
          <li><strong>Posizione:</strong> la geolocalizzazione è usata solo sul dispositivo per centrare la mappa; non la conserviamo lato server salvo tu la invii in una segnalazione.</li>
          <li><strong>Dati tecnici:</strong> log di richiesta (indirizzo IP, user-agent) per sicurezza e anti-abuso.</li>
        </ul>
      </Section>

      <Section title="Finalità e base giuridica">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fornire il servizio (esecuzione del contratto).</li>
          <li>Sicurezza, prevenzione spam e abusi (legittimo interesse).</li>
          <li>Pubblicità tramite Google AdSense (consenso, dove richiesto).</li>
        </ul>
      </Section>

      <Section title="Servizi di terze parti">
        <p>
          Ci appoggiamo a: <strong>Supabase</strong> (autenticazione e database),{' '}
          <strong>OpenStreetMap</strong> / Overpass / Nominatim (mappe e ricerca luoghi),{' '}
          <strong>Google AdSense</strong> (pubblicità, che può usare cookie per la
          personalizzazione degli annunci). Ciascun fornitore tratta i dati secondo la propria
          informativa.
        </p>
      </Section>

      <Section title="Cookie">
        <p>
          Usiamo lo storage locale del browser per mantenere la sessione e le preferenze. Se abilitata,
          la pubblicità di Google può impostare cookie: puoi gestirli dalle impostazioni del browser o
          da <a href="https://adssettings.google.com" target="_blank" rel="noreferrer" className="text-ember-primary hover:underline">Impostazioni annunci Google</a>.
        </p>
      </Section>

      <Section title="Conservazione">
        <p>
          Conserviamo i dati dell’account finché l’account esiste. Puoi eliminare l’account dalle
          impostazioni o richiedendone la cancellazione via email; i contenuti collegati vengono
          rimossi di conseguenza.
        </p>
      </Section>

      <Section title="I tuoi diritti">
        <p>
          Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione.
          Per esercitarli scrivi a{' '}
          <a href="mailto:privacy@rabar.app" className="text-ember-primary hover:underline">privacy@rabar.app</a>.
          Puoi inoltre proporre reclamo al Garante per la protezione dei dati personali.
        </p>
      </Section>
    </LegalLayout>
  );
}
