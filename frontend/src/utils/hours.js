// OSM `opening_hours` handling. We only need one question: is a venue open at
// least until 23:00 in local time today? If we CAN'T tell (missing / weird
// format / no rule for today), we show it — better a false positive than an
// empty map, since most OSM bars carry no opening_hours at all.

const DAY_IDX = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 };
const CLOSE_MIN = 23 * 60; // 23:00 in minutes

// "HH:MM" -> minutes past midnight. Supports 24:00+ (48:00 etc.).
function toMin(t) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

// Expand a day selector ("Mo-Fr", "Sa", "Mo,We,Fr", wrap-around "Fr-Mo") into a
// Set of 0..6 indices (0 = Sunday).
function daysInSelector(sel) {
  const set = new Set();
  for (const part of sel.split(',')) {
    const [from, to] = part.split('-');
    if (to != null && DAY_IDX[from] != null && DAY_IDX[to] != null) {
      for (let i = DAY_IDX[from]; ; i = (i + 1) % 7) {
        set.add(i);
        if (i === DAY_IDX[to]) break;
      }
    } else if (DAY_IDX[part] != null) {
      set.add(DAY_IDX[part]);
    }
  }
  return set;
}

/**
 * True unless we can positively determine the venue closes before 23:00 today.
 * @param {string|null|undefined} oh - raw OSM opening_hours string
 * @param {Date} now
 */
export function openUntil23(oh, now = new Date()) {
  if (!oh || typeof oh !== 'string') return true;
  const s = oh.trim();
  if (!s) return true;
  if (/24\s*\/\s*7/.test(s)) return true; // always open

  const today = now.getDay(); // 0 = Sunday

  let sawTodayRule = false; // a rule explicitly covers today
  let todayHasOpen = false; // today has at least one open time range
  let lateEnough = false; // some range today reaches >= 23:00 (or past midnight)

  for (let rule of s.split(';')) {
    rule = rule.trim();
    if (!rule) continue;

    // Leading day selector? e.g. "Mo-Fr 08:00-24:00". PH (public holiday) tokens
    // are ignored — we only care about the weekday.
    let rest = rule;
    let days = null;
    const m = rule.match(/^((?:PH|[A-Za-z]{2})(?:[-,](?:PH|[A-Za-z]{2}))*)\s+(.*)$/);
    if (m && /(Mo|Tu|We|Th|Fr|Sa|Su)/.test(m[1])) {
      days = daysInSelector(m[1].replace(/PH/g, ''));
      rest = m[2].trim();
      if (days.size === 0) continue; // PH-only rule, no weekday — skip
    }

    if (days !== null && !days.has(today)) continue; // rule not for today
    sawTodayRule = true;

    if (/^(off|closed)$/i.test(rest)) continue; // closed today by this rule

    const ranges = rest.match(/\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/g);
    if (!ranges) {
      // Day applies but time is non-numeric (e.g. "sunrise-sunset") — unknown,
      // lean to showing.
      todayHasOpen = true;
      lateEnough = true;
      continue;
    }
    for (const r of ranges) {
      const [a, b] = r.split('-').map(toMin);
      if (a == null || b == null) {
        todayHasOpen = true;
        lateEnough = true;
        continue;
      }
      todayHasOpen = true;
      // b <= a or b >= 24:00 => crosses midnight => open past 23:00.
      if (b <= a || b >= 24 * 60 || b >= CLOSE_MIN) lateEnough = true;
    }
  }

  if (!sawTodayRule) return true; // no rule maps to today — can't tell, show
  if (lateEnough) return true;
  // Today is covered: either explicitly closed, or all ranges close before 23.
  return false;
}
