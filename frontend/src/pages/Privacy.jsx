import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';

// Privacy policy (GDPR + CCPA/CPRA). Generic but real — adjust the
// titolare/contatti and the third-party list to your actual deploy before
// publishing. Italian is the authoritative version; every other UI language
// gets the English translation.
export default function Privacy() {
  const { lang } = useI18n();
  return lang === 'it' ? <PrivacyIt /> : <PrivacyEn />;
}

const mail = (
  <a href="mailto:privacy@rabar.app" className="text-ember-primary hover:underline">
    privacy@rabar.app
  </a>
);

function PrivacyIt() {
  return (
    <LegalLayout title="Informativa sulla privacy" updated="14 luglio 2026">
      <p>
        La presente informativa descrive come rabar (“noi”) tratta i dati personali degli utenti
        ai sensi del Regolamento (UE) 2016/679 (“GDPR”) e, per i residenti negli Stati Uniti,
        delle normative statali applicabili (tra cui il California Consumer Privacy Act).
      </p>

      <Section title="Titolare del trattamento">
        <p>
          Titolare è il gestore di rabar. Per qualsiasi richiesta relativa ai tuoi dati scrivici a{' '}
          {mail}.
        </p>
      </Section>

      <Section title="Dati che trattiamo">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account:</strong> email e username, gestiti tramite Supabase Auth (anche login Google).</li>
          <li><strong>Contenuti:</strong> valutazioni (prezzo, qualità dei drinks, socialità, varietà, orari), commenti, bar salvati.</li>
          <li><strong>Posizione:</strong> la geolocalizzazione è usata solo sul dispositivo per centrare la mappa; le coordinate raggiungono i nostri server solo per la ricerca dei bar vicini (senza essere conservate) o se le invii in una segnalazione.</li>
          <li><strong>Dati tecnici:</strong> log di richiesta (indirizzo IP, user-agent) per sicurezza e anti-abuso.</li>
        </ul>
      </Section>

      <Section title="Finalità e base giuridica">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fornire il servizio (esecuzione del contratto).</li>
          <li>Sicurezza, prevenzione spam e abusi (legittimo interesse).</li>
          <li>Pubblicità tramite Google AdSense (solo con il tuo consenso).</li>
        </ul>
      </Section>

      <Section title="Servizi di terze parti">
        <p>
          Ci appoggiamo a: <strong>Supabase</strong> (autenticazione e database),{' '}
          <strong>OpenStreetMap</strong> / Overpass / Nominatim (mappe e ricerca luoghi),{' '}
          <strong>Google AdSense</strong> (pubblicità, caricata solo dopo il tuo consenso).
          Ciascun fornitore tratta i dati secondo la propria informativa.
        </p>
      </Section>

      <Section title="Cookie e consenso">
        <p>
          Usiamo lo storage locale del browser solo per finalità tecniche (sessione, lingua, tema,
          scelta sul consenso). La pubblicità di Google — e i relativi cookie — viene caricata{' '}
          <strong>solo se acconsenti</strong> tramite il banner: se rifiuti o non scegli, nessuno
          script pubblicitario viene eseguito. Puoi cambiare idea in ogni momento da{' '}
          <strong>Impostazioni → Preferenze cookie</strong> o da{' '}
          <a href="https://adssettings.google.com" target="_blank" rel="noreferrer" className="text-ember-primary hover:underline">Impostazioni annunci Google</a>.
        </p>
      </Section>

      <Section title="Conservazione">
        <p>
          Conserviamo i dati dell’account finché l’account esiste. Puoi eliminare l’account dalle
          impostazioni o richiedendone la cancellazione via email; i contenuti collegati vengono
          rimossi di conseguenza.
        </p>
      </Section>

      <Section title="I tuoi diritti (GDPR)">
        <p>
          Hai diritto di accesso, rettifica, cancellazione, limitazione, portabilità e opposizione.
          Per esercitarli scrivi a {mail}. Puoi inoltre proporre reclamo al Garante per la
          protezione dei dati personali.
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
          <a href="https://globalprivacycontrol.org" target="_blank" rel="noreferrer" className="text-ember-primary hover:underline">Global Privacy Control</a>:
          se è attivo nel tuo browser, la pubblicità personalizzata resta disattivata. Per
          esercitare i tuoi diritti scrivi a {mail}.
        </p>
      </Section>
    </LegalLayout>
  );
}

function PrivacyEn() {
  return (
    <LegalLayout title="Privacy Policy" updated="July 14, 2026">
      <p>
        This notice describes how rabar (“we”) processes users’ personal data under Regulation
        (EU) 2016/679 (“GDPR”) and, for US residents, applicable state laws (including the
        California Consumer Privacy Act).
      </p>

      <Section title="Data controller">
        <p>The controller is the operator of rabar. For any request about your data, write to {mail}.</p>
      </Section>

      <Section title="Data we process">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Account:</strong> email and username, managed via Supabase Auth (including Google sign-in).</li>
          <li><strong>Content:</strong> ratings (price, drinks quality, vibe, variety, opening hours), comments, saved bars.</li>
          <li><strong>Location:</strong> geolocation is used on-device to center the map; coordinates reach our servers only for the nearby-bars search (not stored) or if you include them in a suggestion.</li>
          <li><strong>Technical data:</strong> request logs (IP address, user-agent) for security and anti-abuse.</li>
        </ul>
      </Section>

      <Section title="Purposes and legal basis">
        <ul className="list-disc space-y-1 pl-5">
          <li>Providing the service (performance of the contract).</li>
          <li>Security, spam and abuse prevention (legitimate interest).</li>
          <li>Advertising via Google AdSense (only with your consent).</li>
        </ul>
      </Section>

      <Section title="Third-party services">
        <p>
          We rely on: <strong>Supabase</strong> (authentication and database),{' '}
          <strong>OpenStreetMap</strong> / Overpass / Nominatim (maps and place search),{' '}
          <strong>Google AdSense</strong> (advertising, loaded only after your consent). Each
          provider processes data under its own privacy policy.
        </p>
      </Section>

      <Section title="Cookies and consent">
        <p>
          We use the browser’s local storage for technical purposes only (session, language,
          theme, consent choice). Google advertising — and its cookies — is loaded{' '}
          <strong>only if you consent</strong> via the banner: if you decline or make no choice,
          no advertising script runs at all. You can change your mind at any time from{' '}
          <strong>Settings → Cookie preferences</strong> or from{' '}
          <a href="https://adssettings.google.com" target="_blank" rel="noreferrer" className="text-ember-primary hover:underline">Google Ads Settings</a>.
        </p>
      </Section>

      <Section title="Retention">
        <p>
          We keep account data for as long as the account exists. You can delete your account
          from the settings or by requesting erasure via email; linked content is removed
          accordingly.
        </p>
      </Section>

      <Section title="Your rights (GDPR)">
        <p>
          You have the right of access, rectification, erasure, restriction, portability and
          objection. To exercise them, write to {mail}. You may also lodge a complaint with your
          supervisory authority.
        </p>
      </Section>

      <Section title="US residents (CCPA/CPRA)">
        <p>
          If you reside in California or another US state with similar laws, you have the right
          to know, correct and delete the personal information we hold about you, without being
          discriminated against for exercising those rights. We do not “sell” personal
          information. Personalized advertising may qualify as “sharing” under the CPRA: it
          happens <strong>only with your consent</strong> and you can withdraw it at any time
          from Settings → Cookie preferences (this acts as “Do Not Sell or Share My Personal
          Information”). We automatically honor the{' '}
          <a href="https://globalprivacycontrol.org" target="_blank" rel="noreferrer" className="text-ember-primary hover:underline">Global Privacy Control</a>{' '}
          signal: when enabled in your browser, personalized advertising stays off. To exercise
          your rights, write to {mail}.
        </p>
      </Section>
    </LegalLayout>
  );
}
