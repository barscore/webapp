import LegalLayout, { Section } from '../components/LegalLayout.jsx';
import { useI18n } from '../i18n/index.js';
import { pageCopy, splitEmails } from '../content/pages.js';

function Para({ text }) {
  return (
    <p>
      {splitEmails(text).map((part, i) =>
        part.email ? (
          <a key={i} href={`mailto:${part.email}`} className="text-ember-ink hover:underline">
            {part.email}
          </a>
        ) : (
          part.text
        ),
      )}
    </p>
  );
}

// /come-funziona, /faq, /chi-siamo, /contatti — copy in src/content/pages.js.
export default function ContentPage({ slug }) {
  const { lang } = useI18n();
  const page = pageCopy(slug, lang);
  return (
    <LegalLayout title={page.title} description={page.description}>
      {page.intro.map((p, i) => (
        <Para key={i} text={p} />
      ))}
      {page.sections.map((s) => (
        <Section key={s.h} title={s.h}>
          {s.p.map((p, i) => (
            <Para key={i} text={p} />
          ))}
        </Section>
      ))}
    </LegalLayout>
  );
}
