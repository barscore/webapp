import { useEffect, useState } from 'react';

// App-wide color themes. Palettes are defined as CSS variables in index.css
// and switched via data-theme on <html>; index.html applies the saved theme
// before first paint so there is no flash. This hook is the single writer:
// it persists the choice and keeps the PWA theme-color meta in sync.

const STORAGE_KEY = 'rabar-theme';

export const THEMES = [
  {
    id: 'rabar',
    label: 'Rabar',
    // Swatches for the theme picker: [background, primary, accent].
    swatch: ['#1D1D1E', '#E07B1A', '#FF4F30'],
    metaColor: '#E07B1A',
  },
  {
    id: 'midnight-red',
    label: 'Midnight Red',
    swatch: ['#0F0C12', '#C94060', '#F5A623'],
    metaColor: '#C94060',
  },
  {
    id: 'gold-rush',
    label: 'Gold Rush',
    swatch: ['#111111', '#FFB800', '#FF5741'],
    metaColor: '#FFB800',
  },
  {
    id: 'electric-blue',
    label: 'Electric Blue',
    swatch: ['#0A0E16', '#5B8CFF', '#FF6B4A'],
    metaColor: '#5B8CFF',
  },
  {
    id: 'aperitif',
    label: 'Aperitif',
    swatch: ['#F8F2E4', '#D6452C', '#E89005'],
    metaColor: '#D6452C',
  },
];

const DEFAULT_THEME = 'rabar';
const VALID_IDS = new Set(THEMES.map((t) => t.id));

export function getTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return VALID_IDS.has(saved) ? saved : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

function applyTheme(id) {
  const root = document.documentElement;
  if (id === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = id;

  const meta = document.querySelector('meta[name="theme-color"]');
  const theme = THEMES.find((t) => t.id === id);
  if (meta && theme) meta.setAttribute('content', theme.metaColor);
}

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);

  // Re-apply on mount: index.html only sets data-theme, not the meta color.
  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setTheme(id) {
    if (!VALID_IDS.has(id)) return;
    setThemeState(id);
    applyTheme(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* private mode: theme just won't persist */
    }
  }

  return { theme, setTheme, themes: THEMES };
}
