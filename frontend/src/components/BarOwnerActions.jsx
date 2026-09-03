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
    </>
  );
}
