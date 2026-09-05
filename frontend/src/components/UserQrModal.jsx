import Icon from './Icon.jsx';

export default function UserQrModal({ userId, onClose }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`https://rabar.it/party-entry?user_id=${userId}`)}`;

  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/80 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-ember-card p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Il tuo QR Code</h2>
            <p className="mt-1 text-sm text-ember-muted">
              Mostra questo QR code agli organizzatori per l'ingresso alle feste aderenti.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ember-bg p-2 text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={20} />
          </button>
        </div>
        
        <div className="mb-6 flex justify-center bg-white p-4 rounded-xl">
          <img src={qrUrl} alt="User QR Code" className="w-64 h-64 object-contain" />
        </div>
        
        <p className="text-center text-xs text-ember-muted">
          Questo QR code è associato al tuo account in modo permanente. Non ha limiti di utilizzo ma non è valido in caso di sospensione.
        </p>
      </div>
    </div>
  );
}
