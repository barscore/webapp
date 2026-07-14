import { Component } from 'react';

// Chunk-load failures after a redeploy: the old index.html (often held by the
// service worker cache) points at asset hashes that no longer exist on the
// server. `serve -s` then answers the missing chunk with index.html (200,
// text/html), so the dynamic import rejects with one of these messages.
function isStaleChunkError(err) {
  const msg = String(err?.message || err || '');
  return (
    /dynamically imported module/i.test(msg) ||
    /importing a module script failed/i.test(msg) ||
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk .* failed/i.test(msg) ||
    /'text\/html'/i.test(msg)
  );
}

// Wipe every cache + service worker so the next load fetches the fresh
// index.html and its current asset hashes.
async function bustCaches() {
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  } catch {
    /* best effort */
  }
}

// Without a boundary, any render/effect throw unmounts the whole React tree and
// the user is left staring at the bare body background (a grey screen). This
// catches it: stale-chunk errors self-heal with a one-shot cache-bust + reload;
// everything else shows the actual message so the failure is diagnosable even
// on devices without dev tools (e.g. iPad).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    if (isStaleChunkError(error) && !sessionStorage.getItem('rabar-chunk-reload')) {
      // One-shot guard: never loop-reload if the fresh build is genuinely broken.
      sessionStorage.setItem('rabar-chunk-reload', '1');
      bustCaches().finally(() => window.location.reload());
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // A stale-chunk error is mid-reload — show a neutral message, not the stack.
    const stale = isStaleChunkError(error);

    return (
      <div className="grid min-h-[100dvh] place-items-center bg-ember-bg p-6 text-ember-cream">
        <div className="w-full max-w-md rounded-2xl border border-ember-line/10 bg-ember-card p-6 text-center">
          <h1 className="font-display text-xl font-bold">
            {stale ? 'Aggiornamento in corso…' : 'Qualcosa è andato storto'}
          </h1>
          <p className="mt-2 text-sm text-ember-muted">
            {stale
              ? 'Sto ricaricando la versione aggiornata dell’app.'
              : 'L’app ha riscontrato un errore imprevisto.'}
          </p>
          {!stale && (
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-ember-line/10 p-3 text-left text-xs text-ember-ink">
              {String(error?.message || error)}
            </pre>
          )}
          <button
            type="button"
            onClick={async () => {
              await bustCaches();
              sessionStorage.removeItem('rabar-chunk-reload');
              window.location.reload();
            }}
            className="mt-5 inline-block rounded-lg border border-ember-line/10 px-4 py-2 text-sm hover:border-ember-primary/50"
          >
            Ricarica l’app
          </button>
        </div>
      </div>
    );
  }
}
