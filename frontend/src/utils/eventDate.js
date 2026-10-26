// Date helpers shared by the event card and the event page. Everything is in
// the reader's UI locale; "oggi"/"domani" come from the dictionary, the rest
// from Intl, so a Russian reader gets "пт" and not "ven".

function toDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** 'today' | 'tomorrow' | null, against the device clock. */
export function relativeDay(iso) {
  const d = toDate(iso);
  if (!d) return null;
  const now = new Date();
  if (sameDay(d, now)) return 'today';
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return sameDay(d, tomorrow) ? 'tomorrow' : null;
}

/** The pieces the cards are drawn from: "30", "OTT", "ven", "21:00". */
export function eventParts(iso, locale) {
  const d = toDate(iso);
  if (!d) return null;
  return {
    day: new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(d),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(d).replace('.', ''),
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d).replace('.', ''),
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(d),
  };
}

/** "Oggi · 21:00", "Domani · 21:00", "ven · 21:00". */
export function shortWhen(iso, locale, t) {
  const parts = eventParts(iso, locale);
  if (!parts) return '';
  const rel = relativeDay(iso);
  const day = rel ? t(rel === 'today' ? 'ev.today' : 'ev.tomorrow') : parts.weekday;
  return `${day} · ${parts.time}`;
}

/** "venerdì 30 ottobre" — the long date of the event page. */
export function longDate(iso, locale) {
  const d = toDate(iso);
  if (!d) return '';
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(d);
}

/** "21:00 – 02:00", or just "21:00" without an end. */
export function timeRange(startIso, endIso, locale) {
  const fmt = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' });
  const start = toDate(startIso);
  if (!start) return '';
  const end = toDate(endIso);
  return end ? `${fmt.format(start)} – ${fmt.format(end)}` : fmt.format(start);
}

/** Over: past its end, or six hours past its start when it has none. */
export function isPast(startIso, endIso) {
  const end = toDate(endIso) ?? (toDate(startIso) && new Date(toDate(startIso).getTime() + 6 * 3600_000));
  return !!end && end.getTime() < Date.now();
}

/** "350 m" under a kilometre, "1.2 km" above. */
export function distanceLabel(km) {
  if (km == null) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${Number(km.toFixed(1))} km`;
}
