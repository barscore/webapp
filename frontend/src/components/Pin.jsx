import { usePins } from '../utils/pins.js';

// Brand marker pin sourced from /spritesheet.png (verde | arancione | grigio).
// Renders nothing until the sprite is processed, keeping layout stable.
export default function Pin({ variant = 'grigio', size = 32, className = '' }) {
  const pins = usePins();
  const src = pins?.[variant];
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
