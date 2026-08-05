import { usePins } from '../utils/pins.js';
import { DISCO_ICON_URL } from '../utils/score.js';

// Brand marker pin sourced from /spritesheet.png (verde | arancione | grigio).
// Renders nothing until the sprite is processed, keeping layout stable.
export default function Pin({ variant = 'grigio', size = 32, className = '', disco = false }) {
  const pins = usePins();
  // Discoteche use dedicated pin art per score band instead of the drink pin.
  const src = disco ? DISCO_ICON_URL[variant] : pins?.[variant];
  return (
    <span
      className={className}
      style={{ display: 'inline-block', width: size, height: size }}
      aria-hidden="true"
    >
      {src && (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          style={{ width: size, height: size, objectFit: 'contain' }}
          className="rabar-pin"
        />
      )}
    </span>
  );
}
