import { useEffect, useState } from 'react';
import Icon from './Icon.jsx';
import { drinksApi, placesApi, barsApi } from '../services/api.js';
import { barKey, parseOsmToken } from '../utils/score.js';

// Shared drink-vote flow, opened from both entry points:
//   from a bar view    → pass `bar`,   the user picks the drink;
//   from a drink page  → pass `drink`, the user picks the bar (searched
//                        globally; OSM-only places are materialized via
//                        POST /bars/resolve so the vote has a real uuid).
// Vote is a single 1–5, upserted server-side: same submit for create and edit.
// Render only for authenticated users (callers gate on isAuthenticated).
export default function DrinkVoteModal({ drink, bar, onClose, onVoted, onPropose }) {
  const [pickedDrink, setPickedDrink] = useState(drink ?? null);
  const [pickedBar, setPickedBar] = useState(bar ?? null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [rating, setRating] = useState(0);
  const [existing, setExisting] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickingDrink = !pickedDrink;
  const pickingBar = !pickingDrink && !pickedBar;

  // Debounced picker search: drinks catalog or global bar search.
  useEffect(() => {
    if (!pickingDrink && !pickingBar) return;
    const q = search.trim();
    // Drinks: empty query shows the catalog; bars: search needs ≥2 chars.
    if (pickingBar && q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      const req = pickingDrink
        ? drinksApi.list({ q: q || undefined, limit: 25 }).then((r) => r.drinks)
        : placesApi.searchBars({ q });
      req
        .then((data) => !cancelled && setResults(data))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setSearching(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [pickingDrink, pickingBar, search]);

  // Prefill the caller's existing vote once both sides are picked.
  useEffect(() => {
    if (!pickedDrink?.id || !pickedBar?.id) return;
    let cancelled = false;
    drinksApi
      .myVotes({ drink_id: pickedDrink.id, bar_id: pickedBar.id })
      .then((votes) => {
        if (cancelled) return;
        setExisting(votes[0] ?? null);
        if (votes[0]) setRating(votes[0].rating);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pickedDrink?.id, pickedBar?.id]);

  async function pickBar(place) {
    setError('');
    if (place.id) return setPickedBar(place);
    // OSM-only place: materialize it so the vote has a bar uuid to attach to.
    setBusy(true);
    try {
      const resolved = await barsApi.resolve({ ...parseOsmToken(barKey(place)), ...place });
      setPickedBar(resolved);
    } catch {
      setError('Bar non disponibile, riprova');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!rating) return setError('Scegli un voto da 1 a 5');
    setBusy(true);
    setError('');
    try {
      await drinksApi.vote(pickedDrink.id, { bar_id: pickedBar.id, rating });
      onVoted?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Voto non riuscito, riprova');
    } finally {
      setBusy(false);
    }
  }

  async function removeVote() {
    setBusy(true);
    setError('');
    try {
      await drinksApi.removeVote(pickedDrink.id, pickedBar.id);
      onVoted?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Eliminazione non riuscita');
    } finally {
      setBusy(false);
    }
  }

  const title = pickingDrink
    ? 'Quale drink vuoi valutare?'
    : pickingBar
      ? 'Dove lo fanno?'
      : 'Il tuo voto';

  return (
    <div className="fixed inset-0 z-[2100] flex items-end justify-center bg-black/50 p-4 backdrop-blur-[3px] sm:items-center" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-flat fade-in flex max-h-[80dvh] w-full max-w-md flex-col rounded-sheet p-5"
      >
        <div className="flex items-center gap-2">
          <Icon name="cocktail" size={20} className="text-ember-ink" />
          <h3 className="font-display text-lg font-bold text-ember-cream">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="ml-auto text-ember-muted hover:text-ember-cream">
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Context line: what's fixed so far. */}
        <p className="mt-1 truncate text-sm text-ember-muted">
          {pickedDrink && <span className="font-semibold text-ember-cream">{pickedDrink.name}</span>}
          {pickedDrink && pickedBar && ' da '}
          {pickedBar && <span className="font-semibold text-ember-cream">{pickedBar.name}</span>}
        </p>

        {(pickingDrink || pickingBar) && (
          <>
            <div className="mt-3 flex items-center gap-2 rounded-full border border-ember-line/10 bg-ember-line/[0.04] px-3 py-2.5">
              <Icon name="search" size={18} className="text-ember-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={pickingDrink ? 'Cerca un drink…' : 'Cerca un bar…'}
                autoFocus
                className="w-full bg-transparent text-sm text-ember-cream outline-none placeholder:text-ember-muted"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Pulisci ricerca" className="text-ember-muted hover:text-ember-cream">
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>

            <div className="no-scrollbar mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto">
              {searching && (
                <p className="flex items-center gap-2 px-1 py-2 text-sm text-ember-muted">
                  <Icon name="reload" size={14} className="animate-spin" /> Ricerca…
                </p>
              )}
              {!searching && results.length === 0 && (
                <p className="px-1 py-2 text-sm text-ember-muted">
                  {pickingBar && search.trim().length < 2
                    ? 'Scrivi almeno 2 lettere per cercare il bar.'
                    : 'Nessun risultato.'}
                </p>
              )}
              {!searching &&
                results.map((item) => (
                  <button
                    key={pickingDrink ? item.id : barKey(item)}
                    type="button"
                    disabled={busy}
                    onClick={() => (pickingDrink ? setPickedDrink(item) : pickBar(item))}
                    className="flex w-full items-center gap-2 rounded-xl border border-ember-line/5 bg-ember-line/[0.03] px-3 py-2.5 text-left text-sm transition hover:border-ember-line/10 hover:bg-ember-line/[0.06] disabled:opacity-50"
                  >
                    <Icon name={pickingDrink ? 'cocktail' : 'pin'} size={15} className="shrink-0 text-ember-ink" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ember-cream">{item.name}</span>
                      <span className="block truncate text-xs text-ember-muted">
                        {pickingDrink
                          ? item.description || ''
                          : [item.address, item.city].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </button>
                ))}
              {pickingDrink && onPropose && (
                <button
                  type="button"
                  onClick={onPropose}
                  className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ember-line/15 px-3 py-2.5 text-sm text-ember-muted transition hover:text-ember-cream"
                >
                  <Icon name="plus" size={15} /> Non trovi il drink? Proponilo
                </button>
              )}
            </div>
          </>
        )}

        {!pickingDrink && !pickingBar && (
          <>
            {/* 1–5 star picker */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRating(v)}
                  aria-label={`${v} su 5`}
                  aria-pressed={rating >= v}
                  className={`rounded-lg p-1.5 transition active:scale-95 ${
                    rating >= v ? 'text-ember-ink' : 'text-ember-line/20 hover:text-ember-line/40'
                  }`}
                >
                  <Icon name="star" size={30} />
                </button>
              ))}
            </div>

            {/* Change picked side (only the one this modal picked). */}
            <div className="mt-2 text-center">
              {!drink && (
                <button
                  type="button"
                  onClick={() => {
                    setPickedDrink(null);
                    setSearch('');
                    setRating(0);
                    setExisting(null);
                  }}
                  className="text-xs text-ember-muted underline hover:text-ember-cream"
                >
                  Cambia drink
                </button>
              )}
              {!bar && (
                <button
                  type="button"
                  onClick={() => {
                    setPickedBar(null);
                    setSearch('');
                    setRating(0);
                    setExisting(null);
                  }}
                  className="text-xs text-ember-muted underline hover:text-ember-cream"
                >
                  Cambia bar
                </button>
              )}
            </div>

            {error && <p className="mt-3 text-center text-sm text-ember-danger">{error}</p>}

            <div className="mt-4 flex items-center gap-2">
              {existing && (
                <button
                  type="button"
                  onClick={removeVote}
                  disabled={busy}
                  aria-label="Elimina il tuo voto"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-ember-line/5 text-ember-danger disabled:opacity-50"
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={busy}
                className="btn-primary flex-1 py-3"
              >
                <Icon name={busy ? 'reload' : 'check'} size={18} className={busy ? 'animate-spin' : ''} />
                {busy ? 'Salvataggio…' : existing ? 'Aggiorna voto' : 'Vota'}
              </button>
            </div>
          </>
        )}

        {(pickingDrink || pickingBar) && error && (
          <p className="mt-3 text-sm text-ember-danger">{error}</p>
        )}
      </div>
    </div>
  );
}
