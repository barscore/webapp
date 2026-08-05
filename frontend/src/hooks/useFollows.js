import { useEffect, useState } from 'react';
import { useAuth } from './useAuth.js';
import { followsApi } from '../services/api.js';

// Shared follow state: one fetch per session (module-level cache), optimistic
// toggle, every subscribed row re-renders on change. Kinds: 'events' | 'organizers'.
let cache = null;
let inflight = null;
const subs = new Set();
const notifySubs = () => subs.forEach((fn) => fn((v) => v + 1));

function load() {
  inflight ??= followsApi
    .list()
    .then((rows) => {
      cache = { events: new Set(), organizers: new Set() };
      for (const r of rows) {
        if (r.event_id) cache.events.add(r.event_id);
        if (r.organizer_id) cache.organizers.add(r.organizer_id);
      }
    })
    .catch(() => {
      cache = { events: new Set(), organizers: new Set() };
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useFollows() {
  const { isAuthenticated } = useAuth();
  const [, force] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) {
      cache = null; // reset on logout so the next login refetches
      return undefined;
    }
    subs.add(force);
    if (!cache && !inflight) load().then(notifySubs);
    return () => subs.delete(force);
  }, [isAuthenticated]);

  const isFollowing = (kind, id) => !!cache?.[kind]?.has(id);

  async function toggle(kind, id) {
    if (!cache) await load();
    const set = cache[kind];
    const target = kind === 'events' ? { event_id: id } : { organizer_id: id };
    const was = set.has(id);
    if (was) set.delete(id);
    else set.add(id);
    notifySubs();
    try {
      if (was) await followsApi.unfollow(target);
      else await followsApi.follow(target);
    } catch {
      if (was) set.add(id);
      else set.delete(id);
      notifySubs();
    }
  }

  return { isFollowing, toggle, isAuthenticated };
}
