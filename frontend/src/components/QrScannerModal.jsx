import { useState } from 'react';
import { Scanner, setZXingModuleOverrides } from '@yudiel/react-qr-scanner';
import Icon from './Icon.jsx';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast.jsx';

// Forza il caricamento del WASM da unpkg nel caso in cui jsdelivr sia bloccato.
setZXingModuleOverrides({
  locateFile: (path, prefix) => {
    if (path.endsWith('.wasm')) {
      return `https://unpkg.com/zxing-wasm@3.1.3/dist/reader/${path}`;
    }
    return prefix + path;
  },
});

export default function QrScannerModal({ onClose }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  // Example tracker function to draw a green box around detected barcodes
  const tracker = (detectedCodes, ctx) => {
    detectedCodes.forEach((detectedCode) => {
      const { boundingBox } = detectedCode;
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 4;
      ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);
    });
  };

  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/80 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-ember-card p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Scansiona Drink</h2>
            <p className="mt-1 text-sm text-ember-muted">
              Inquadra il QR code del cliente per convalidare il Free Drink.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ember-bg p-2 text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={20} />
          </button>
        </div>
        
        <div className="overflow-hidden rounded-xl bg-black">
          <Scanner 
            onScan={(result) => {
              if (result && result.length > 0) {
                let text = result[0].rawValue;
                try { text = decodeURIComponent(text); } catch(e) {}
                if (text.includes('/redeem?token=')) {
                  onClose();
                  try {
                    const url = new URL(text);
                    navigate(url.pathname + url.search);
                  } catch(e) {
                    navigate(text);
                  }
                } else {
                  setToast({ msg: 'QR code non valido per il Free Drink.', icon: 'info' });
                }
              }
            }}
            onError={(err) => {
              console.error(err);
              setToast({ msg: `Errore lettore: ${err.message || err}`, icon: 'info' });
            }}
            components={{ tracker }}
            allowMultiple={true}
            scanDelay={2000}
          />
        </div>
      </div>
      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
