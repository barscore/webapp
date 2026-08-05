import { useSyncExternalStore } from 'react';
import it from './locales/it.js';

// UI language store. External to React (useSyncExternalStore) so:
//   - t() works from plain modules too (utils/score.js, utils/share.js);
//   - memoized components (BarRow, DrinkRow, Map) still re-render on language
//     change by subscribing via useI18n(), bypassing their memo props check.
// Domain field names (prezzo, qualita_drinks, …) stay Italian — this only
// translates the UI copy.

export const LANGUAGES = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

// Only Italian (the source copy and t() fallback) ships in the eager bundle;
// the other dictionaries (~70 KB total) are code-split and fetched on demand —
// a user only ever needs one. Explicit loader map so Vite emits one chunk each.
const DICTS = { it };
const LOADERS = {
  en: () => import('./locales/en.js'),
  es: () => import('./locales/es.js'),
  ru: () => import('./locales/ru.js'),
  zh: () => import('./locales/zh.js'),
};

// Locale tags for Intl date/number formatting per UI language.
export const DATE_LOCALES = { it: 'it-IT', en: 'en-US', es: 'es-ES', ru: 'ru-RU', zh: 'zh-CN' };

const STORAGE_KEY = 'rabar-lang';
const VALID = new Set(['it', ...Object.keys(LOADERS)]);

// ---------------------------------------------------------------------------
// Default-language detection: the language of the country the user is in.
// Countries whose language isn't offered fall back to English.
// Primary country signal is the device IANA timezone (no permission prompt,
// tracks physical location); secondary is the region subtag of the browser
// locales. No IP-geolocation service — the app uses no paid/external APIs.
// ---------------------------------------------------------------------------

// Countries → offered language.
const COUNTRY_LANG = {
  IT: 'it', SM: 'it', VA: 'it',
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', VE: 'es', CL: 'es',
  EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es',
  SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', PR: 'es', GQ: 'es',
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh',
};

// IANA timezone → country, for the countries above (plus nothing else: an
// unlisted zone simply means "country not covered → English", per spec).
const TZ_COUNTRY = {
  'Europe/Rome': 'IT', 'Europe/Vatican': 'VA', 'Europe/San_Marino': 'SM',
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES',
  'America/Mexico_City': 'MX', 'America/Cancun': 'MX', 'America/Merida': 'MX',
  'America/Monterrey': 'MX', 'America/Chihuahua': 'MX', 'America/Hermosillo': 'MX',
  'America/Tijuana': 'MX', 'America/Mazatlan': 'MX', 'America/Ojinaga': 'MX',
  'America/Bogota': 'CO', 'America/Lima': 'PE', 'America/Guayaquil': 'EC',
  'America/Caracas': 'VE', 'America/La_Paz': 'BO', 'America/Santiago': 'CL',
  'America/Punta_Arenas': 'CL', 'America/Asuncion': 'PY', 'America/Montevideo': 'UY',
  'America/Guatemala': 'GT', 'America/El_Salvador': 'SV', 'America/Tegucigalpa': 'HN',
  'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA',
  'America/Havana': 'CU', 'America/Santo_Domingo': 'DO', 'America/Puerto_Rico': 'PR',
  'Europe/Moscow': 'RU', 'Europe/Kaliningrad': 'RU', 'Europe/Samara': 'RU',
  'Europe/Volgograd': 'RU', 'Europe/Saratov': 'RU', 'Europe/Astrakhan': 'RU',
  'Europe/Ulyanovsk': 'RU', 'Europe/Kirov': 'RU', 'Asia/Yekaterinburg': 'RU',
  'Asia/Omsk': 'RU', 'Asia/Novosibirsk': 'RU', 'Asia/Barnaul': 'RU',
  'Asia/Tomsk': 'RU', 'Asia/Novokuznetsk': 'RU', 'Asia/Krasnoyarsk': 'RU',
  'Asia/Irkutsk': 'RU', 'Asia/Chita': 'RU', 'Asia/Yakutsk': 'RU',
  'Asia/Khandyga': 'RU', 'Asia/Vladivostok': 'RU', 'Asia/Ust-Nera': 'RU',
  'Asia/Magadan': 'RU', 'Asia/Sakhalin': 'RU', 'Asia/Srednekolymsk': 'RU',
  'Asia/Kamchatka': 'RU', 'Asia/Anadyr': 'RU', 'Europe/Minsk': 'BY',
  'Asia/Almaty': 'KZ', 'Asia/Aqtobe': 'KZ', 'Asia/Aqtau': 'KZ',
  'Asia/Atyrau': 'KZ', 'Asia/Oral': 'KZ', 'Asia/Qostanay': 'KZ',
  'Asia/Qyzylorda': 'KZ', 'Asia/Bishkek': 'KG',
  'Asia/Shanghai': 'CN', 'Asia/Urumqi': 'CN', 'Asia/Taipei': 'TW',
  'Asia/Hong_Kong': 'HK', 'Asia/Macau': 'MO',
};

function detectCountry() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      if (TZ_COUNTRY[tz]) return TZ_COUNTRY[tz];
      // Argentina has a dozen zones under one prefix.
      if (tz.startsWith('America/Argentina/') || tz === 'America/Buenos_Aires') return 'AR';
    }
  } catch {
    /* Intl unavailable — fall through */
  }
  // Secondary country evidence: region subtag of the browser locales
  // (e.g. "es-MX" → MX). Language-only tags carry no country, skip them.
  for (const tag of navigator.languages || [navigator.language]) {
    const region = String(tag || '').split('-')[1];
    if (region && region.length === 2) return region.toUpperCase();
  }
  return null;
}

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (VALID.has(saved)) return saved;
  } catch {
    /* private mode */
  }
  const country = detectCountry();
  return (country && COUNTRY_LANG[country]) || 'en';
}

let lang = detectLang();
const listeners = new Set();
// Store revision: bumped on language change AND on async dictionary arrival,
// so useSyncExternalStore re-renders subscribers in both cases (the lang
// string alone wouldn't change when a pending dictionary finishes loading).
let rev = 0;

function notify() {
  rev += 1;
  listeners.forEach((fn) => fn());
}

const pendingDicts = new Set();
function ensureDict(code) {
  if (DICTS[code] || pendingDicts.has(code) || !LOADERS[code]) return;
  pendingDicts.add(code);
  LOADERS[code]()
    .then((m) => {
      DICTS[code] = m.default;
      if (code === lang) notify();
    })
    .catch(() => {
      /* fetch failed (offline before first load) — Italian fallback stays;
         removing from pending lets a later setLang retry */
    })
    .finally(() => pendingDicts.delete(code));
}

function apply(code) {
  document.documentElement.lang = code;
}
apply(lang);
ensureDict(lang);

export function getLang() {
  return lang;
}

export function setLang(code) {
  if (!VALID.has(code) || code === lang) return;
  lang = code;
  apply(code);
  ensureDict(code);
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode: choice just won't persist */
  }
  notify();
}

// Translate. Falls back to Italian (the source copy), then to the key itself.
// Params interpolate "{name}" placeholders: t('home.radius', { n: 2 }).
export function t(key, params) {
  let s = DICTS[lang]?.[key] ?? DICTS.it[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

// Intl locale tag for the current language (dates, list joins…).
export function dateLocale() {
  return DATE_LOCALES[lang];
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Hook: subscribes the component to language changes and to async dictionary
// arrivals (works inside memo()).
export function useI18n() {
  useSyncExternalStore(subscribe, () => rev);
  return { lang, t, setLang, dateLocale: DATE_LOCALES[lang] };
}
