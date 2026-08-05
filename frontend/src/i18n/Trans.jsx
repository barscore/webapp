import { Fragment } from 'react';
import { useI18n } from './index.js';

// Renders a translated string where **segments** become <strong>. Used by the
// tutorial and install-hint copy, whose emphasis must survive translation.
export default function Trans({ k, params, strongClass = '' }) {
  const { t } = useI18n();
  const parts = t(k, params).split('**');
  return parts.map((p, i) =>
    i % 2 ? (
      <strong key={i} className={strongClass}>
        {p}
      </strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  );
}
