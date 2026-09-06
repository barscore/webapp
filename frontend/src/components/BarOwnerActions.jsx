import { useState } from 'react';
import Icon from './Icon.jsx';
import ClaimModal from './ClaimModal.jsx';
import BoostModal from './BoostModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useI18n } from '../i18n/index.js';

// Azioni del proprietario su un bar: rivendicalo se non ha un owner, mettilo in
// evidenza se sei tu l'owner.
//
// Vive in un componente suo perché il bar si apre da DUE schermate — il sheet
// della home (`BarSheet`) e la pagina `/bar/:id` — e il pulsante deve stare su
// entrambe: metterlo solo sulla pagina lo rendeva irraggiungibile, visto che
// dalla home ci si arriva soltanto al sheet.
//
// Fuori dalla striscia di chip a scorrimento orizzontale di proposito: lì
// finiva oltre il bordo, senza scrollbar a dirlo.
export default function BarOwnerActions({ bar, onToast }) {
  const { t } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const [claimOpen, setClaimOpen] = useState(false);
  const [boostOpen, setBoostOpen] = useState(false);
  const [freeDrinksOpen, setFreeDrinksOpen] = useState(false);

  if (!isAuthenticated || !bar?.id) return null;

  const isOwner = !!user && bar.owner_id === user.id;
  const canClaim = !bar.owner_id;
  if (!canClaim && !isOwner) return null;

  return (
    <>
      {canClaim && (
        <button
          type="button"
          onClick={() => setClaimOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ember-line/15 py-2.5 text-sm font-semibold text-ember-cream hover:border-ember-primary/60"
        >
          <Icon name="pin" size={15} className="text-ember-ink" />
          {t('claim.cta')}
        </button>
      )}

      {isOwner && !bar.sponsored && (
        <button
          type="button"
          onClick={() => setBoostOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ember-line/15 py-2.5 text-sm font-semibold text-ember-cream hover:border-ember-primary/60"
        >
          <Icon name="euro" size={15} className="text-ember-ink" />
          {t('ot.boost')}
        </button>
      )}

      {isOwner && (
        <button
          type="button"
          onClick={() => setFreeDrinksOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-ember-line/15 py-2.5 text-sm font-semibold text-ember-cream hover:border-ember-primary/60"
        >
          <Icon name="cocktail" size={15} className="text-ember-ink" />
          Impostazioni Free Drink
        </button>
      )}

      {claimOpen && (
        <ClaimModal
          bar={bar}
          onClose={() => setClaimOpen(false)}
          onSent={() => onToast?.({ msg: t('claim.sent'), icon: 'check' })}
        />
      )}
      {boostOpen && (
        <BoostModal
          target={{ bar_id: bar.id }}
          label={bar.name}
          onClose={() => setBoostOpen(false)}
        />
      )}
      {freeDrinksOpen && (
        <FreeDrinksModal
          bar={bar}
          onClose={() => setFreeDrinksOpen(false)}
          onToast={onToast}
        />
      )}
    </>
  );
}

function FreeDrinksModal({ bar, onClose, onToast }) {
  const [accepts, setAccepts] = useState(bar.accepts_free_drinks ?? false);
  
  // Parse existing hours like "18:00 - 20:00"
  const existingHours = bar.free_drinks_hours?.split(' - ') || [];
  const [startHour, setStartHour] = useState(existingHours[0] || '');
  const [endHour, setEndHour] = useState(existingHours[1] || '');
  
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const hours = startHour && endHour ? `${startHour} - ${endHour}` : null;
      const { barsApi } = await import('../services/api.js');
      await barsApi.updateFreeDrinks(bar.id, { accepts_free_drinks: accepts, free_drinks_hours: hours });
      bar.accepts_free_drinks = accepts;
      bar.free_drinks_hours = hours;
      onToast?.({ msg: 'Impostazioni aggiornate', icon: 'check' });
      onClose();
    } catch {
      onToast?.({ msg: 'Errore durante il salvataggio', icon: 'info' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[3px]" onClick={onClose}>
      <div className="glass-flat fade-in relative w-full max-w-sm rounded-card p-6" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 p-1 text-ember-muted hover:text-ember-cream"
        >
          <Icon name="close" size={18} />
        </button>
        <h3 className="mb-4 font-display text-xl font-bold text-ember-cream">Free Drink Promo</h3>
        <label className="flex items-center gap-2 text-sm text-ember-cream mb-4">
          <input
            type="checkbox"
            checked={accepts}
            onChange={(e) => setAccepts(e.target.checked)}
            className="rounded border-ember-line/10 bg-ember-card text-ember-primary"
          />
          Accetta free drink
        </label>
        {accepts && (
          <div className="mb-4">
            <label className="block text-xs font-semibold text-ember-muted mb-2">
              Fasce orarie (opzionale)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="time"
                value={startHour}
                onChange={(e) => setStartHour(e.target.value)}
                className="field flex-1 text-sm bg-ember-card"
              />
              <span className="text-ember-muted text-sm font-semibold">a</span>
              <input
                type="time"
                value={endHour}
                onChange={(e) => setEndHour(e.target.value)}
                className="field flex-1 text-sm bg-ember-card"
              />
            </div>
            {((startHour && !endHour) || (!startHour && endHour)) && (
              <p className="mt-2 text-xs text-ember-danger">Inserisci sia l'inizio che la fine per impostare la fascia oraria.</p>
            )}
          </div>
        )}
        <button
          onClick={save}
          disabled={saving || (accepts && ((startHour && !endHour) || (!startHour && endHour)))}
          className="btn-primary w-full py-2 disabled:opacity-50"
        >
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>
    </div>
  );
}
