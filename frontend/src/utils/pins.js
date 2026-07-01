// Map/list marker pins are the first three sprites of /spritesheet.png:
//   cell 0 → verde     (green)  — ben valutato
//   cell 1 → arancione (orange) — sotto la sufficienza
//   cell 2 → grigio    (grey)   — non valutato
//
// The sheet cells sit on an opaque near-black background, so we crop each cell
// onto a canvas and key that background out to transparent, then cache the
// result as a data URL. Single source of truth = the spritesheet itself.

import { useEffect, useState } from 'react';

const SHEET_URL = '/spritesheet.png';
const CELL = 64; // 512×448 sheet → 8×7 grid of 64px cells
const VARIANTS = { verde: 0, arancione: 1, grigio: 2 };

let cache = null; // { verde, arancione, grigio } of data URLs, once ready
let pending = null; // in-flight extraction promise

function extract() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = SHEET_URL;
    img.onload = () => {
      const out = {};
      for (const [name, col] of Object.entries(VARIANTS)) {
        const cv = document.createElement('canvas');
        cv.width = CELL;
        cv.height = CELL;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, col * CELL, 0, CELL, CELL, 0, 0, CELL, CELL);
        const frame = ctx.getImageData(0, 0, CELL, CELL);
        const d = frame.data;
        // Punch the dark cell background to transparent; pin colours (green,
        // orange, grey, cream strokes) are all well above this threshold.
        for (let i = 0; i < d.length; i += 4) {
          if (d[i] < 45 && d[i + 1] < 45 && d[i + 2] < 45) d[i + 3] = 0;
        }
        ctx.putImageData(frame, 0, 0);
        out[name] = cv.toDataURL('image/png');
      }
      cache = out;
      resolve(out);
    };
    img.onerror = () => resolve((cache = {}));
  });
  return pending;
}

/** Returns the pin data-URL map, or null until the sprite has been processed. */
export function usePins() {
  const [pins, setPins] = useState(cache);
  useEffect(() => {
    if (!cache) extract().then(setPins);
  }, []);
  return pins;
}

// Kick off extraction eagerly so pins are usually ready by first paint.
if (typeof document !== 'undefined') extract();
