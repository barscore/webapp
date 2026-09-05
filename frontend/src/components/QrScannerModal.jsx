import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import Icon from './Icon.jsx';
import { useNavigate } from 'react-router-dom';

export default function QrScannerModal({ onClose }) {
  const navigate = useNavigate();

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
                const text = result[0].rawValue;
                if (text.includes('/redeem?token=')) {
                  onClose();
                  try {
                    const url = new URL(text);
                    navigate(url.pathname + url.search);
                  } catch(e) {
                    // if relative path
                    navigate(text);
                  }
                }
              }
            }}
            formats={['qr_code']}
          />
        </div>
      </div>
    </div>
  );
}
