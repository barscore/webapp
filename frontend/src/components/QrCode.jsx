import { useEffect, useState } from 'react';

// QR generato nel browser: il contenuto (token di riscatto, id utente) non
// deve mai uscire verso un servizio terzo come faceva api.qrserver.com.
export default function QrCode({ value, alt, className }) {
  const [src, setSrc] = useState(null);

  useEffect(() => {
    let alive = true;
    // Import dinamico: la lib serve solo quando si apre un QR, non nel bundle iniziale.
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(value, { width: 256, margin: 1 }))
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => { alive = false; };
  }, [value]);

  return src ? <img src={src} alt={alt} className={className} /> : <div className={className} />;
}
