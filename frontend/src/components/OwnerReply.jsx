import { useState } from 'react';
import Icon from './Icon.jsx';
import { ratingsApi } from '../services/api.js';
import { useI18n } from '../i18n/index.js';

/**
 * La risposta del proprietario sotto a una recensione: lettura per tutti,
 * scrittura per chi possiede il bar (`bars.owner_id`), rimozione anche per
 * l'admin (moderazione).
 *
 * Controlli qui dentro e non nelle pagine perché le recensioni si leggono in
 * tre punti (BarDetail, BarSheet, MyRatings): il tasto deve comparire ovunque
 * senza copiare l'editor tre volte.
 *
 * `onChanged('saved' | 'deleted' | 'error')` — il ricaricamento e il toast
 * restano al chiamante, che sa quale lista deve rileggere.
 */
export default function OwnerReply({ rating, barId, isOwner = false, isAdmin = false, onChanged }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const risposta = rating?.risposta;
  if (!rating || (!risposta && !isOwner)) return null;

  async function save() {
    const testo = text.trim();
    if (!testo) return;
    setBusy(true);
    try {
      await ratingsApi.reply(barId, rating.id, testo);
      setEditing(false);
      onChanged?.('saved');
    } catch {
      onChanged?.('error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t('bar.replyDeleteConfirm'))) return;
    setBusy(true);
    try {
      await ratingsApi.removeReply(barId, rating.id);
      onChanged?.('deleted');
    } catch {
      onChanged?.('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {risposta && (
        <div className="mt-2 rounded-lg border-l-2 border-ember-ink bg-ember-bg/50 p-2">
          <p className="flex items-center gap-1 text-xs font-medium text-ember-ink">
            <Icon name="review" size={12} />
            {t('bar.ownerReply')}
          </p>
          <p className="mt-0.5 text-ember-muted">{risposta}</p>
        </div>
      )}

      {isOwner && editing && (
        <div className="mt-2">
          <textarea
            value={text}
            maxLength={500}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            className="field py-2 text-sm"
            placeholder={t('bar.replyPlaceholder')}
          />
          <div className="mt-1 flex gap-2">
            <button
              onClick={save}
              disabled={busy || !text.trim()}
              className="rounded-lg bg-ember-ink px-3 py-1.5 text-xs font-medium text-ember-bg disabled:opacity-40"
            >
              {busy ? t('common.saving') : t('common.save')}
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded-lg bg-ember-card px-3 py-1.5 text-xs text-ember-cream"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {!editing && (isOwner || (isAdmin && risposta)) && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          {isOwner && (
            <button
              onClick={() => {
                setText(risposta || '');
                setEditing(true);
              }}
              className="flex items-center gap-1 text-ember-ink hover:text-ember-cream"
            >
              <Icon name="review" size={13} />
              {risposta ? t('bar.replyEdit') : t('bar.reply')}
            </button>
          )}
          {risposta && (
            <button
              onClick={remove}
              disabled={busy}
              className="text-ember-danger hover:text-ember-cream disabled:opacity-40"
            >
              {t('common.delete')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
