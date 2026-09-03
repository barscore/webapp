import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';
import { PROOF_ACCEPT, PROOF_EXTS, PROOF_MAX_BYTES, PROOF_MAX_FILES } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

const extOf = (name) => (name.split('.').pop() || '').toLowerCase();
const isImage = (file) => file.type.startsWith('image/');

// Selettore degli allegati di prova (rivendicazione bar, richiesta PR/organizzatore).
// Qui si sceglie soltanto: l'upload lo fa chi invia il form, con uploadProofs().
export default function ProofUpload({ files, onChange, disabled }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [previews, setPreviews] = useState([]);

  // Le object URL vanno revocate: senza, ogni scelta di file lascia un blob
  // appeso finché non si ricarica la pagina.
  useEffect(() => {
    const urls = files.map((f) => (isImage(f) ? URL.createObjectURL(f) : null));
    setPreviews(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [files]);

  function add(picked) {
    setError('');
    const next = [...files];
    for (const f of picked) {
      if (next.length >= PROOF_MAX_FILES) return setError(t('proof.tooMany'));
      if (!PROOF_EXTS.includes(extOf(f.name))) return setError(t('proof.badType'));
      if (f.size > PROOF_MAX_BYTES) return setError(t('proof.tooBig'));
      next.push(f);
    }
    onChange(next);
  }

  return (
    <div>
      <p className="mb-1 text-sm font-semibold text-ember-cream">{t('proof.label')}</p>
      <p className="mb-2 text-[11px] text-ember-muted">{t('proof.hint')}</p>

      {files.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-ember-line/10 p-1.5"
            >
              {previews[i] ? (
                <img src={previews[i]} alt="" className="h-9 w-9 rounded object-cover" />
              ) : (
                <span className="grid h-9 w-9 place-items-center rounded bg-ember-primary/10">
                  <Icon name="link" size={16} className="text-ember-ink" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-xs text-ember-cream">{f.name}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label={t('proof.remove')}
                className="text-ember-muted hover:text-ember-danger disabled:opacity-40"
              >
                <Icon name="trash" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={PROOF_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          add([...e.target.files]);
          e.target.value = ''; // così lo stesso file si può riscegliere dopo un rimuovi
        }}
      />
      <button
        type="button"
        disabled={disabled || files.length >= PROOF_MAX_FILES}
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ember-line/25 py-2.5 text-sm text-ember-cream hover:border-ember-primary/60 disabled:opacity-40"
      >
        <Icon name="camera" size={16} className="text-ember-ink" />
        {t('proof.add')}
      </button>

      {error && <p className="mt-2 text-sm text-ember-danger">{error}</p>}
    </div>
  );
}
