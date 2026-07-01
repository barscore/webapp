import { useCallback, useEffect, useState } from 'react';
import { bookmarksApi } from '../services/api.js';
import { useAuth } from './useAuth.js';

// Saved bars ("Salvati"). When signed in they live on the account (Supabase,
// via the backend) so they follow the user across devices. When signed out we
// fall back to localStorage so the feature still works offline/anonymously.
const KEY = 'rabar:bookmarks';
const SYNC_EVENT = 'rabar:bookmarks';

function readLocal() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeLocal(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
  window.dispatchEvent(new Event(SYNC_EVENT));
}

export function useBookmarks() {
  const { isAuthenticated } = useAuth();
  const [ids, setIds] = useState(() => (isAuthenticated ? new Set() : readLocal()));
  const [savedBars, setSavedBars] = useState([]);
  const [loading, setLoading] = useState(false);

  // Pull the source of truth: the account when signed in, else localStorage.
  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setIds(readLocal());
      setSavedBars([]);
      return;
    }
    setLoading(true);
    try {
      const { bar_ids, bars } = await bookmarksApi.list();
      setIds(new Set(bar_ids));
      setSavedBars(bars ?? []);
    } catch {
      // keep whatever we had; a failed refresh shouldn't wipe the UI
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep every hook instance (Home + BarDetail) in sync after a toggle.
  useEffect(() => {
    const onSync = () => refresh();
    window.addEventListener('storage', onSync);
    window.addEventListener(SYNC_EVENT, onSync);
    return () => {
      window.removeEventListener('storage', onSync);
      window.removeEventListener(SYNC_EVENT, onSync);
    };
  }, [refresh]);

  const toggle = useCallback(
    async (id) => {
      if (!id) return;
      const saving = !ids.has(id);

      // Optimistic local update for instant feedback.
      setIds((prev) => {
        const next = new Set(prev);
        saving ? next.add(id) : next.delete(id);
        if (!isAuthenticated) writeLocal(next);
        return next;
      });

      if (!isAuthenticated) return;

      try {
        if (saving) await bookmarksApi.add(id);
        else await bookmarksApi.remove(id);
      } finally {
        // Notify other instances + reconcile with server truth.
        window.dispatchEvent(new Event(SYNC_EVENT));
      }
    },
    [ids, isAuthenticated],
  );

  const has = useCallback((id) => ids.has(id), [ids]);

  return { ids, has, toggle, count: ids.size, savedBars, loading, refresh };
}
