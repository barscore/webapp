import { useState } from 'react';
import Icon from './Icon.jsx';

// Foto profilo in un cerchio, con l'icona utente al posto di un'immagine
// mancante o che non si carica (un URL di Google scaduto, un file rimosso).
export default function Avatar({ url, size = 32, className = '' }) {
  const [broken, setBroken] = useState(false);
  const style = { width: size, height: size };
  if (url && !broken) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        style={style}
        className={`shrink-0 rounded-full bg-ember-card object-cover ${className}`}
      />
    );
  }
  return (
    <span
      style={style}
      className={`grid shrink-0 place-items-center rounded-full bg-ember-card text-ember-ink ${className}`}
      aria-hidden="true"
    >
      <Icon name="user" size={Math.round(size * 0.5)} />
    </span>
  );
}
