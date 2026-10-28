import { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import Icon from './Icon.jsx';
import { useNavigate } from 'react-router-dom';
import Toast from './Toast.jsx';

// I QR che lo scanner apre: free drink da riscattare e ingresso alle feste
// (pass firmato `pass`, o il vecchio `user_id`). Si naviga solo sul loro path
// interno: il testo di un QR lo decide chi lo stampa, e un navigate() con un
// URL qualunque può uscire dal sito (vedi hooks/useAuthReturn.js#safePath).
const SCANNABLE = {
  '/redeem': ['token'],
  '/party-entry': ['pass', 'user_id'],
};

function scannedPath(text) {
  try {
    const url = new URL(text, window.location.origin);
    const params = SCANNABLE[url.pathname];
    return params?.some((k) => url.searchParams.has(k)) ? url.pathname + url.search : null;
  } catch {
    return null;
  }
}

export default function QrScannerModal({ onClose }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("qr-reader");
    let isScanning = false;

    html5QrCode.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        if (!isScanning) return;
        let text = decodedText;
        try { text = decodeURIComponent(text); } catch(e) {}
        
        const path = scannedPath(text);
        if (path) {
          isScanning = false;
          const open = () => {
            onClose();
            navigate(path);
          };
          html5QrCode.stop().then(open).catch(open);
        } else {
          setToast({ msg: 'QR code non riconosciuto.', icon: 'info' });
        }
      },
      (errorMessage) => {
        // frame decoding errors are expected continuously while finding a QR
      }
    ).then(() => {
      isScanning = true;
    }).catch((err) => {
      setToast({ msg: `Impossibile avviare la fotocamera: ${err?.message || err}`, icon: 'info' });
    });

    return () => {
      isScanning = false;
      try {
        html5QrCode.stop().catch(() => {});
      } catch (e) {}
    };
  }, [navigate, onClose]);

  return (
    <div className="fixed inset-0 z-[1500] flex items-end justify-center bg-black/80 sm:items-center">
      <div className="w-full max-w-md rounded-t-2xl bg-ember-card p-6 shadow-xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-ember-cream">Scansiona Drink</h2>
            <p className="mt-1 text-sm text-ember-muted">
              Inquadra il QR code del cliente per convalidare un Free Drink o l'ingresso a un evento.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full bg-ember-bg p-2 text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={20} />
          </button>
        </div>
        
        <div className="overflow-hidden rounded-xl bg-black">
          <div id="qr-reader" className="w-full"></div>
        </div>
      </div>
      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}
