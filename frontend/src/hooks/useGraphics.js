import { useEffect, useState } from 'react';

// Graphics quality preference. "simple" (the default) is the low-end profile:
// no backdrop blur, no map-tile filter, no animations/transitions — see the
// [data-graphics='simple'] block in index.css. "rich" restores the full look.
// Applied via data-graphics on <html>; index.html sets it before first paint
// so weak devices never render the heavy visuals first.

const STORAGE_KEY = 'rabar-graphics';
const VALID_IDS = new Set(['simple', 'rich']);
const DEFAULT_GRAPHICS = 'simple';

export function getGraphics() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_IDS.has(saved) ? saved : DEFAULT_GRAPHICS;
  } catch {
    return DEFAULT_GRAPHICS;
  }
}

function applyGraphics(id) {
  document.documentElement.dataset.graphics = id;
}

export function useGraphics() {
  const [graphics, setGraphicsState] = useState(getGraphics);

  // Re-assert on mount: index.html sets the attribute, but keep React the
  // single source of truth once the app is live.
  useEffect(() => {
    applyGraphics(graphics);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setGraphics(id) {
    if (!VALID_IDS.has(id)) return;
    setGraphicsState(id);
    applyGraphics(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* private mode: choice just won't persist */
    }
  }

  return { graphics, setGraphics };
}
