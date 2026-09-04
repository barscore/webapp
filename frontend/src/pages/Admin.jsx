import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { adminApi, suggestionsApi, reportsApi, drinksApi, organizerAdminApi } from '../services/api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';
import { copyText } from '../utils/share.js';

const TABS = [
  { key: 'users', label: 'Utenti', icon: 'user' },
  { key: 'ratings', label: 'Valutazioni', icon: 'review' },
  { key: 'suggestions', label: 'Segnalazioni', icon: 'pin' },
  { key: 'reports', label: 'Report', icon: 'info' },
  { key: 'drinks', label: 'Drinks', icon: 'cocktail' },
  { key: 'organizers', label: 'Organizzatori', icon: 'star' },
  { key: 'security', label: 'Sicurezza', icon: 'filters' },
  { key: 'emergency', label: 'Emergenza', icon: 'bell' },
];

// Admin control panel. Gated to role=admin (backend re-checks every call).
export default function Admin() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg, icon = 'check') => setToast({ msg, icon }), []);

  useEffect(() => {
    if (!loading && !isAdmin) navigate('/');
  }, [loading, isAdmin, navigate]);

  const loadStats = useCallback(() => {
    adminApi.stats().then(setStats).catch(() => {});
  }, []);
  useEffect(() => {
    if (isAdmin) loadStats();
  }, [isAdmin, loadStats]);

  if (loading || !isAdmin) return null;

  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
            <Icon name="arrow-left" size={15} /> Mappa
          </Link>
          <div className="mb-4">
            <Logo size="sm" />
          </div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ember-cream">
            <Icon name="filters" size={22} className="text-ember-ink" /> Pannello admin
          </h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="Utenti" value={stats?.users} />
          <Stat label="Valutazioni" value={stats?.ratings} />
          <Stat label="Bar" value={stats?.bars} />
          <Stat label="Bannati" value={stats?.banned} accent />
          <Stat label="Sospesi" value={stats?.suspended} accent />
        </div>

        {/* Tabs */}
        <div className="card flex gap-1 overflow-x-auto p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-ember-primary text-ember-on-primary'
                  : 'text-ember-muted hover:text-ember-cream'
              }`}
            >
              <Icon name={t.icon} size={15} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab notify={notify} onChange={loadStats} />}
        {tab === 'ratings' && <RatingsTab notify={notify} onChange={loadStats} />}
        {tab === 'suggestions' && <SuggestionsTab notify={notify} />}
        {tab === 'reports' && <ReportsTab notify={notify} />}
        {tab === 'drinks' && <DrinkSuggestionsTab notify={notify} />}
        {tab === 'organizers' && <OrganizersTab notify={notify} />}
        {tab === 'security' && <SecurityTab notify={notify} />}
        {tab === 'emergency' && <EmergencyTab notify={notify} onChange={loadStats} />}
      </div>

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div className="card p-3 text-center">
      <div className={`font-display text-xl font-bold ${accent ? 'text-ember-danger' : 'text-ember-cream'}`}>
        {value ?? '…'}
      </div>
      <div className="text-xs text-ember-muted">{label}</div>
    </div>
  );
}

// =========================================================================
// Users
// =========================================================================
function UsersTab({ notify, onChange }) {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [role, setRole] = useState(''); // '' = tutti
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null); // { kind, user }

  const load = useCallback(() => {
    setBusy(true);
    adminApi
      .users({ q: q || undefined, role: role || undefined, limit: 100 })
      .then((r) => setUsers(r.users))
      .catch(() => notify('Errore caricamento utenti', 'info'))
      .finally(() => setBusy(false));
  }, [q, role, notify]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function run(fn, okMsg) {
    try {
      await fn();
      notify(okMsg);
      setModal(null);
      load();
      onChange?.();
    } catch (e) {
      notify(e?.response?.data?.error || 'Operazione fallita', 'info');
    }
  }

  return (
    <section className="space-y-3">
      <SearchBar value={q} onChange={setQ} placeholder="Cerca username o email…" />

      {/* Role filter */}
      <div className="flex gap-1.5">
        {[
          { v: '', label: 'Tutti' },
          { v: 'user', label: 'User' },
          { v: 'betatester', label: 'Betatester' },
          { v: 'organizer', label: 'Organizer' },
          { v: 'moderator', label: 'Moderator' },
          { v: 'admin', label: 'Admin' },
        ].map((r) => (
          <button
            key={r.v}
            onClick={() => setRole(r.v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              role === r.v ? 'bg-ember-primary text-ember-on-primary' : 'bg-ember-card text-ember-muted hover:text-ember-cream'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ember-line/5 overflow-hidden">
        {busy && !users.length && <p className="p-4 text-sm text-ember-muted">Caricamento…</p>}
        {!busy && !users.length && <p className="p-4 text-sm text-ember-muted">Nessun utente.</p>}
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-ember-cream">@{u.username}</span>
                <RoleBadge role={u.role} />
                {u.banned && <Tag color="accent">bannato</Tag>}
                {u.suspended && <Tag color="accent">sospeso</Tag>}
              </div>
              <div className="truncate text-xs text-ember-muted">{u.email}</div>
              <button
                onClick={async () => {
                  const ok = await copyText(u.id);
                  notify(ok ? 'UUID copiato' : 'Copia non riuscita', ok ? 'check' : 'info');
                }}
                title="Copia UUID"
                className="flex max-w-full items-center gap-1 font-mono text-[10px] text-ember-muted/70 hover:text-ember-ink"
              >
                <Icon name="link" size={11} />
                <span className="truncate">{u.id}</span>
              </button>
              <div className="text-xs text-ember-muted">
                {u.ratings_count} valutazioni
                {u.suspended && u.suspended_until && (
                  <> · fino al {new Date(u.suspended_until).toLocaleString('it-IT')}</>
                )}
              </div>
            </div>

            {/* Kebab (3 dots) menu — rendered via portal so it isn't clipped
                by the list's overflow-hidden. */}
            <KebabMenu
              disabled={u.id === me?.id}
              title={u.id === me?.id ? 'Non puoi moderare te stesso' : 'Azioni'}
              items={[
                { icon: 'bell', label: 'Sospendi…', onClick: () => setModal({ kind: 'suspend', user: u }) },
                { icon: 'close', label: 'Banna', onClick: () => setModal({ kind: 'ban', user: u }) },
                ...(u.banned || u.suspended
                  ? [{ icon: 'check', label: 'Sblocca', onClick: () => run(() => adminApi.unbanUser(u.id), 'Utente sbloccato') }]
                  : []),
                { icon: 'user', label: 'Cambia ruolo…', onClick: () => setModal({ kind: 'role', user: u }) },
                { icon: 'trash', label: 'Elimina account', danger: true, onClick: () => setModal({ kind: 'delete', user: u }) },
              ]}
            />
          </div>
        ))}
      </div>

      {modal?.kind === 'suspend' && (
        <SuspendModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={(hours, reason) =>
            run(() => adminApi.suspendUser(modal.user.id, hours, reason), 'Utente sospeso')
          }
        />
      )}
      {modal?.kind === 'ban' && (
        <ReasonModal
          title={`Banna @${modal.user.username}`}
          desc="L'account sarà bloccato finché non lo sblocchi."
          confirmLabel="Banna"
          danger
          onClose={() => setModal(null)}
          onConfirm={(reason) => run(() => adminApi.banUser(modal.user.id, reason), 'Utente bannato')}
        />
      )}
      {modal?.kind === 'role' && (
        <RoleModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={(role, orgType) =>
            run(() => adminApi.setRole(modal.user.id, role, orgType), 'Ruolo aggiornato')
          }
        />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmModal
          title={`Elimina @${modal.user.username}?`}
          desc="Operazione irreversibile: account, valutazioni e dati collegati saranno cancellati."
          confirmLabel="Elimina definitivamente"
          danger
          onClose={() => setModal(null)}
          onConfirm={() => run(() => adminApi.deleteUser(modal.user.id), 'Account eliminato')}
        />
      )}
    </section>
  );
}

// =========================================================================
// Ratings
// =========================================================================
function RatingsTab({ notify, onChange }) {
  const [q, setQ] = useState('');
  const [ratings, setRatings] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    setBusy(true);
    adminApi
      .ratings({ q: q || undefined, limit: 100 })
      .then((r) => setRatings(r.ratings))
      .catch(() => notify('Errore caricamento valutazioni', 'info'))
      .finally(() => setBusy(false));
  }, [q, notify]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function del(id) {
    try {
      await adminApi.deleteRating(id);
      notify('Valutazione eliminata');
      setConfirm(null);
      load();
      onChange?.();
    } catch {
      notify('Eliminazione fallita', 'info');
    }
  }

  return (
    <section className="space-y-3">
      <SearchBar value={q} onChange={setQ} placeholder="Cerca nei commenti…" />
      <div className="card divide-y divide-ember-line/5 overflow-hidden">
        {busy && !ratings.length && <p className="p-4 text-sm text-ember-muted">Caricamento…</p>}
        {!busy && !ratings.length && <p className="p-4 text-sm text-ember-muted">Nessuna valutazione.</p>}
        {ratings.map((r) => (
          <div key={r.id} className="flex items-start gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-ember-cream">@{r.username || '—'}</span>
                <span className="text-ember-muted">su</span>
                <Link to={`/bar/${r.bar_id}`} className="text-ember-ink hover:underline">
                  {r.bar_name || 'bar'}
                </Link>
              </div>
              <div className="mt-0.5 text-xs text-ember-muted">
                P {r.prezzo} · D {r.qualita_drinks} · S {r.socialita} · V {r.varieta ?? '—'} · O{' '}
                {r.orari ?? '—'} ·{' '}
                {new Date(r.created_at).toLocaleDateString('it-IT')}
              </div>
              {r.commento && <p className="mt-1 text-sm text-ember-cream/90">{r.commento}</p>}
            </div>
            <button
              onClick={() => setConfirm(r)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ember-muted hover:bg-ember-line/5 hover:text-ember-danger"
              title="Elimina"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmModal
          title="Elimina valutazione?"
          desc="La valutazione sarà rimossa e le medie del bar ricalcolate."
          confirmLabel="Elimina"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => del(confirm.id)}
        />
      )}
    </section>
  );
}

// =========================================================================
// Suggestions ("segnala il tuo bar" leads)
// =========================================================================
const SUGGESTION_FILTERS = [
  { v: 'new', label: 'Da gestire' },
  { v: 'done', label: 'Aggiunti' },
  { v: 'rejected', label: 'Rifiutati' },
  { v: '', label: 'Tutte' },
];

function SuggestionsTab({ notify }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('new');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    setBusy(true);
    suggestionsApi
      .list({ q: q || undefined, status: status || undefined, limit: 100 })
      .then((r) => setItems(r.suggestions))
      .catch(() => notify('Errore caricamento segnalazioni', 'info'))
      .finally(() => setBusy(false));
  }, [q, status, notify]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function setState(id, next, okMsg) {
    const admin_note = window.prompt('Nota per l’utente (opzionale):') || undefined;
    try {
      await suggestionsApi.setStatus(id, next, admin_note);
      notify(okMsg);
      load();
    } catch {
      notify('Operazione fallita', 'info');
    }
  }

  async function del(id) {
    try {
      await suggestionsApi.remove(id);
      notify('Segnalazione eliminata');
      setConfirm(null);
      load();
    } catch {
      notify('Eliminazione fallita', 'info');
    }
  }

  return (
    <section className="space-y-3">
      <SearchBar value={q} onChange={setQ} placeholder="Cerca nome o città…" />

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTION_FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              status === f.v ? 'bg-ember-primary text-ember-on-primary' : 'bg-ember-card text-ember-muted hover:text-ember-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ember-line/5 overflow-hidden">
        {busy && !items.length && <p className="p-4 text-sm text-ember-muted">Caricamento…</p>}
        {!busy && !items.length && <p className="p-4 text-sm text-ember-muted">Nessuna segnalazione.</p>}
        {items.map((s) => (
          <div key={s.id} className="p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ember-cream">{s.name}</span>
                  {s.city && <span className="text-xs text-ember-muted">· {s.city}</span>}
                  {s.status !== 'new' && (
                    <Tag color={s.status === 'done' ? 'primary' : 'accent'}>
                      {s.status === 'done' ? 'aggiunto' : 'rifiutato'}
                    </Tag>
                  )}
                </div>
                {s.note && <p className="mt-1 text-sm text-ember-cream/90">{s.note}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ember-muted">
                  {s.contact && (
                    <span className="flex items-center gap-1">
                      <Icon name="link" size={11} /> {s.contact}
                    </span>
                  )}
                  {s.lat != null && s.lng != null && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=17/${s.lat}/${s.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 hover:text-ember-ink"
                    >
                      <Icon name="pin" size={11} /> posizione
                    </a>
                  )}
                  <span>{new Date(s.created_at).toLocaleDateString('it-IT')}</span>
                </div>
              </div>
              <button
                onClick={() => setConfirm(s)}
                title="Elimina"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ember-muted hover:bg-ember-line/5 hover:text-ember-danger"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>

            {s.status !== 'done' && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setState(s.id, 'done', 'Segnata come aggiunta')}
                  className="flex-1 rounded-lg bg-ember-primary/15 py-1.5 text-xs font-semibold text-ember-ink hover:bg-ember-primary/25"
                >
                  Segna come aggiunto
                </button>
                {s.status !== 'rejected' && (
                  <button
                    onClick={() => setState(s.id, 'rejected', 'Segnalazione rifiutata')}
                    className="flex-1 rounded-lg bg-ember-line/5 py-1.5 text-xs font-semibold text-ember-muted hover:text-ember-cream"
                  >
                    Rifiuta
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmModal
          title="Elimina segnalazione?"
          desc="La segnalazione sarà rimossa definitivamente."
          confirmLabel="Elimina"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => del(confirm.id)}
        />
      )}
    </section>
  );
}

// =========================================================================
// User reports ("segnala" from the account menu)
// =========================================================================
const REPORT_FILTERS = [
  { v: 'new', label: 'Nuovi' },
  { v: 'done', label: 'Risolti' },
  { v: 'rejected', label: 'Scartati' },
  { v: '', label: 'Tutti' },
];

const REPORT_TYPE_LABELS = {
  bug: 'Bug',
  contenuto: 'Contenuto inappropriato',
  account: 'Account',
  suggerimento: 'Suggerimento',
  altro: 'Altro',
};

function ReportsTab({ notify }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('new');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    setBusy(true);
    reportsApi
      .list({ q: q || undefined, status: status || undefined, limit: 100 })
      .then((r) => setItems(r.reports))
      .catch(() => notify('Errore caricamento report', 'info'))
      .finally(() => setBusy(false));
  }, [q, status, notify]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function setState(id, next, okMsg) {
    const admin_note = window.prompt('Nota per l’utente (opzionale):') || undefined;
    try {
      await reportsApi.setStatus(id, next, admin_note);
      notify(okMsg);
      load();
    } catch {
      notify('Operazione fallita', 'info');
    }
  }

  async function del(id) {
    try {
      await reportsApi.remove(id);
      notify('Report eliminato');
      setConfirm(null);
      load();
    } catch {
      notify('Eliminazione fallita', 'info');
    }
  }

  return (
    <section className="space-y-3">
      <SearchBar value={q} onChange={setQ} placeholder="Cerca nel testo…" />

      <div className="flex flex-wrap gap-1.5">
        {REPORT_FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              status === f.v ? 'bg-ember-primary text-ember-on-primary' : 'bg-ember-card text-ember-muted hover:text-ember-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ember-line/5 overflow-hidden">
        {busy && !items.length && <p className="p-4 text-sm text-ember-muted">Caricamento…</p>}
        {!busy && !items.length && <p className="p-4 text-sm text-ember-muted">Nessun report.</p>}
        {items.map((r) => (
          <div key={r.id} className="p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag color="primary">{REPORT_TYPE_LABELS[r.type] || r.type}</Tag>
                  {r.status !== 'new' && (
                    <Tag color={r.status === 'done' ? 'primary' : 'accent'}>
                      {r.status === 'done' ? 'risolto' : 'scartato'}
                    </Tag>
                  )}
                </div>
                <p className="mt-1 text-sm text-ember-cream/90">{r.message}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ember-muted">
                  {r.profiles?.username && (
                    <span className="flex items-center gap-1">
                      <Icon name="user" size={11} /> @{r.profiles.username}
                    </span>
                  )}
                  <span>{new Date(r.created_at).toLocaleDateString('it-IT')}</span>
                </div>
              </div>
              <button
                onClick={() => setConfirm(r)}
                title="Elimina"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ember-muted hover:bg-ember-line/5 hover:text-ember-danger"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>

            {r.status !== 'done' && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setState(r.id, 'done', 'Segnato come risolto')}
                  className="flex-1 rounded-lg bg-ember-primary/15 py-1.5 text-xs font-semibold text-ember-ink hover:bg-ember-primary/25"
                >
                  Segna come risolto
                </button>
                {r.status !== 'rejected' && (
                  <button
                    onClick={() => setState(r.id, 'rejected', 'Report scartato')}
                    className="flex-1 rounded-lg bg-ember-line/5 py-1.5 text-xs font-semibold text-ember-muted hover:text-ember-cream"
                  >
                    Scarta
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmModal
          title="Elimina report?"
          desc="Il report sarà rimosso definitivamente."
          confirmLabel="Elimina"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => del(confirm.id)}
        />
      )}
    </section>
  );
}

// =========================================================================
// Drink suggestions ("proponi un drink" — moderated; approval materializes
// the drink into the catalog server-side)
// =========================================================================
const DRINK_FILTERS = [
  { v: 'new', label: 'Da gestire' },
  { v: 'done', label: 'Approvati' },
  { v: 'rejected', label: 'Rifiutati' },
  { v: '', label: 'Tutte' },
];

function DrinkSuggestionsTab({ notify }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('new');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(() => {
    setBusy(true);
    drinksApi
      .suggestions({ q: q || undefined, status: status || undefined, limit: 100 })
      .then((r) => setItems(r.suggestions))
      .catch(() => notify('Errore caricamento proposte', 'info'))
      .finally(() => setBusy(false));
  }, [q, status, notify]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function setState(id, next, okMsg) {
    const admin_note = window.prompt('Nota per l’utente (opzionale):') || undefined;
    try {
      await drinksApi.setSuggestionStatus(id, next, admin_note);
      notify(okMsg);
      load();
    } catch {
      notify('Operazione fallita', 'info');
    }
  }

  async function del(id) {
    try {
      await drinksApi.removeSuggestion(id);
      notify('Proposta eliminata');
      setConfirm(null);
      load();
    } catch {
      notify('Eliminazione fallita', 'info');
    }
  }

  return (
    <section className="space-y-3">
      <SearchBar value={q} onChange={setQ} placeholder="Cerca un drink…" />

      <div className="flex flex-wrap gap-1.5">
        {DRINK_FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              status === f.v ? 'bg-ember-primary text-ember-on-primary' : 'bg-ember-card text-ember-muted hover:text-ember-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-ember-line/5 overflow-hidden">
        {busy && !items.length && <p className="p-4 text-sm text-ember-muted">Caricamento…</p>}
        {!busy && !items.length && <p className="p-4 text-sm text-ember-muted">Nessuna proposta.</p>}
        {items.map((s) => (
          <div key={s.id} className="p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Icon name="cocktail" size={14} className="text-ember-ink" />
                  <span className="font-semibold text-ember-cream">{s.name}</span>
                  {s.status !== 'new' && (
                    <Tag color={s.status === 'done' ? 'primary' : 'accent'}>
                      {s.status === 'done' ? 'approvato' : 'rifiutato'}
                    </Tag>
                  )}
                </div>
                {s.note && <p className="mt-1 text-sm text-ember-cream/90">{s.note}</p>}
                <div className="mt-1 text-xs text-ember-muted">
                  {new Date(s.created_at).toLocaleDateString('it-IT')}
                </div>
              </div>
              <button
                onClick={() => setConfirm(s)}
                title="Elimina"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ember-muted hover:bg-ember-line/5 hover:text-ember-danger"
              >
                <Icon name="trash" size={16} />
              </button>
            </div>

            {s.status !== 'done' && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => setState(s.id, 'done', 'Drink aggiunto al catalogo')}
                  className="flex-1 rounded-lg bg-ember-primary/15 py-1.5 text-xs font-semibold text-ember-ink hover:bg-ember-primary/25"
                >
                  Approva
                </button>
                {s.status !== 'rejected' && (
                  <button
                    onClick={() => setState(s.id, 'rejected', 'Proposta rifiutata')}
                    className="flex-1 rounded-lg bg-ember-line/5 py-1.5 text-xs font-semibold text-ember-muted hover:text-ember-cream"
                  >
                    Rifiuta
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmModal
          title="Elimina proposta?"
          desc="La proposta sarà rimossa definitivamente."
          confirmLabel="Elimina"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={() => del(confirm.id)}
        />
      )}
    </section>
  );
}

// =========================================================================
// Security settings
// =========================================================================
function SecurityTab({ notify }) {
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    adminApi.settings().then(setSettings).catch(() => notify('Errore caricamento', 'info'));
  }, [notify]);

  async function toggle(key) {
    const next = !settings[key];
    setSettings((s) => ({ ...s, [key]: next })); // optimistic
    try {
      const saved = await adminApi.updateSettings({ [key]: next });
      setSettings(saved);
      notify('Impostazione salvata');
    } catch {
      setSettings((s) => ({ ...s, [key]: !next })); // revert
      notify('Salvataggio fallito', 'info');
    }
  }

  if (!settings) return <p className="p-4 text-sm text-ember-muted">Caricamento…</p>;

  return (
    <section className="space-y-2">
      <Switch
        label="Registrazioni aperte"
        desc="Consenti la creazione di nuovi account."
        checked={settings.registration_open}
        onChange={() => toggle('registration_open')}
      />
      <Switch
        label="Valutazioni abilitate"
        desc="Consenti l'invio e la modifica delle valutazioni."
        checked={settings.ratings_enabled}
        onChange={() => toggle('ratings_enabled')}
      />
    </section>
  );
}

// =========================================================================
// Emergency
// =========================================================================
// ISO → value for <input type="datetime-local"> (local time, no seconds).
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EmergencyTab({ notify, onChange }) {
  const [settings, setSettings] = useState(null);
  const [reason, setReason] = useState('');
  const [eta, setEta] = useState(''); // datetime-local string
  const [purgeId, setPurgeId] = useState('');
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    adminApi
      .settings()
      .then((s) => {
        setSettings(s);
        setReason(s.maintenance_reason || '');
        setEta(toLocalInput(s.maintenance_eta));
      })
      .catch(() => {});
  }, []);

  async function toggleMaintenance() {
    const next = !settings.maintenance_mode;
    try {
      const patch = { maintenance_mode: next };
      if (next) {
        patch.maintenance_reason = reason.trim() || null;
        patch.maintenance_eta = eta ? new Date(eta).toISOString() : null;
      }
      const saved = await adminApi.updateSettings(patch);
      setSettings(saved);
      notify(next ? 'Modalità manutenzione ATTIVA' : 'Modalità manutenzione disattivata');
    } catch {
      notify('Operazione fallita', 'info');
    }
  }

  // Save reason/eta without flipping the switch (edit details while already on).
  async function saveDetails() {
    try {
      const saved = await adminApi.updateSettings({
        maintenance_reason: reason.trim() || null,
        maintenance_eta: eta ? new Date(eta).toISOString() : null,
      });
      setSettings(saved);
      notify('Dettagli manutenzione salvati');
    } catch {
      notify('Salvataggio fallito', 'info');
    }
  }

  // Beta program switch: app locked for everyone except admin/moderator/
  // betatester (frontend lock screen + backend write block).
  async function toggleBeta() {
    try {
      const saved = await adminApi.updateSettings({ beta_mode: !settings.beta_mode });
      setSettings(saved);
      notify(saved.beta_mode ? 'Beta test ATTIVO — app riservata ai beta tester' : 'Beta test terminato — app pubblica');
    } catch {
      notify('Operazione fallita', 'info');
    }
  }

  async function purge() {
    try {
      const r = await adminApi.purgeUserRatings(purgeId.trim());
      notify(`Eliminate ${r.deleted} valutazioni`);
      setConfirm(null);
      setPurgeId('');
      onChange?.();
    } catch (e) {
      notify(e?.response?.data?.error || 'Purge fallito', 'info');
    }
  }

  return (
    <section className="space-y-4">
      <div className={`rounded-card border p-4 ${settings?.maintenance_mode ? 'border-ember-danger/60 bg-ember-danger/10' : 'border-ember-line/5 bg-ember-card'}`}>
        <div className="flex items-center gap-2 font-display font-bold text-ember-cream">
          <Icon name="bell" size={18} className="text-ember-danger" /> Modalità manutenzione
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          Kill switch: blocca tutte le scritture (valutazioni, salvataggi, eventi) per gli utenti
          non admin. La mappa resta consultabile.
        </p>

        <label className="mt-3 block text-xs text-ember-muted">Motivo (mostrato agli utenti)</label>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Es. aggiornamento database"
          maxLength={500}
          className="field mt-1 py-2 text-sm"
        />
        <label className="mt-2 block text-xs text-ember-muted">Ritorno stimato (opzionale)</label>
        <input
          type="datetime-local"
          value={eta}
          onChange={(e) => setEta(e.target.value)}
          className="field mt-1 py-2 text-sm"
        />

        <div className="mt-3 flex gap-2">
          {settings?.maintenance_mode && (
            <button
              onClick={saveDetails}
              className="flex-1 rounded-lg bg-ember-line/10 py-2 font-semibold text-ember-cream hover:bg-ember-line/15"
            >
              Salva dettagli
            </button>
          )}
          <button
            onClick={toggleMaintenance}
            disabled={!settings}
            className={`flex-1 rounded-lg py-2 font-semibold ${
              settings?.maintenance_mode
                ? 'bg-ember-primary text-ember-on-primary'
                : 'bg-ember-accent text-black'
            } disabled:opacity-50`}
          >
            {settings?.maintenance_mode ? 'Disattiva manutenzione' : 'Attiva manutenzione'}
          </button>
        </div>
      </div>

      {/* Beta test — private beta gate, separate from maintenance. */}
      <div className={`rounded-card border p-4 ${settings?.beta_mode ? 'border-ember-primary/60 bg-ember-primary/10' : 'border-ember-line/5 bg-ember-card'}`}>
        <div className="flex items-center gap-2 font-display font-bold text-ember-cream">
          <Icon name="star" size={18} className="text-ember-ink" /> Beta test
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          Beta privata: l'app resta accessibile solo ad admin, moderator e betatester. Gli altri
          vedono la schermata di beta e le loro scritture sono bloccate. Assegna il ruolo
          betatester dalla scheda Utenti.
        </p>
        <button
          onClick={toggleBeta}
          disabled={!settings}
          className={`mt-3 w-full rounded-lg py-2 font-semibold ${
            settings?.beta_mode ? 'bg-ember-primary text-ember-on-primary' : 'bg-ember-line/10 text-ember-cream hover:bg-ember-line/15'
          } disabled:opacity-50`}
        >
          {settings?.beta_mode ? 'Termina beta test' : 'Avvia beta test'}
        </button>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 font-display font-bold text-ember-cream">
          <Icon name="trash" size={18} className="text-ember-danger" /> Elimina valutazioni utente
        </div>
        <p className="mt-1 text-sm text-ember-muted">
          Cancella tutte le valutazioni di un account (spam cleanup). Serve l'ID utente.
        </p>
        <input
          value={purgeId}
          onChange={(e) => setPurgeId(e.target.value)}
          placeholder="UUID utente"
          className="mt-3 field py-2 text-sm"
        />
        <button
          onClick={() => setConfirm(true)}
          disabled={!purgeId.trim()}
          className="btn mt-2 w-full bg-ember-accent py-2 text-black"
        >
          Elimina valutazioni
        </button>
      </div>

      {confirm && (
        <ConfirmModal
          title="Eliminare tutte le valutazioni?"
          desc="Operazione irreversibile per l'utente indicato."
          confirmLabel="Elimina"
          danger
          onClose={() => setConfirm(null)}
          onConfirm={purge}
        />
      )}
    </section>
  );
}

// =========================================================================
// Shared bits
// =========================================================================
const ORG_FILTERS = [
  { v: 'pending', label: 'In attesa' },
  { v: 'approved', label: 'Approvate' },
  { v: 'rejected', label: 'Rifiutate' },
  { v: 'all', label: 'Tutte' },
];

// Allegati di verifica: il backend manda signed URL a scadenza (bucket privato),
// quindi qui si mostrano e basta. I PDF non hanno anteprima: si aprono.
function Proofs({ items }) {
  if (!items?.length) return <p className="text-sm text-ember-muted">Nessun allegato.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((p) =>
        p.pdf ? (
          <a
            key={p.path}
            href={p.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-ember-line/15 text-[10px] text-ember-cream hover:border-ember-primary/60"
          >
            <Icon name="link" size={18} className="text-ember-ink" />
            PDF
          </a>
        ) : (
          <a key={p.path} href={p.url} target="_blank" rel="noreferrer">
            <img
              src={p.url}
              alt=""
              className="h-20 w-20 rounded-lg border border-ember-line/15 object-cover"
            />
          </a>
        ),
      )}
    </div>
  );
}

// Richieste account PR/organizzatore + rivendicazioni bar (con allegati).
function OrganizersTab({ notify }) {
  const [status, setStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [claims, setClaims] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    Promise.all([
      organizerAdminApi.requests({ status }),
      organizerAdminApi.claims({ status }),
    ])
      .then(([r, c]) => {
        setRequests(r);
        setClaims(c);
      })
      .catch(() => notify('Errore caricamento richieste', 'info'))
      .finally(() => setBusy(false));
  }, [status, notify]);

  useEffect(load, [load]);

  async function review(kind, id, action) {
    const admin_note =
      window.prompt(
        action === 'reject'
          ? 'Motivo del rifiuto per l’utente (opzionale):'
          : 'Nota per l’utente (opzionale):',
      ) || undefined;
    try {
      if (kind === 'request') await organizerAdminApi.reviewRequest(id, action, admin_note);
      else await organizerAdminApi.reviewClaim(id, action, admin_note);
      notify(action === 'approve' ? 'Approvata' : 'Rifiutata');
      load();
    } catch (err) {
      notify(err?.response?.data?.error || 'Operazione fallita', 'info');
    }
  }

  const Actions = ({ kind, id }) => (
    <div className="mt-2 flex gap-2">
      <button
        onClick={() => review(kind, id, 'approve')}
        className="rounded-lg bg-ember-primary px-3 py-1 text-xs font-semibold text-ember-on-primary"
      >
        Approva
      </button>
      <button
        onClick={() => review(kind, id, 'reject')}
        className="rounded-lg border border-ember-danger px-3 py-1 text-xs font-semibold text-ember-danger"
      >
        Rifiuta
      </button>
    </div>
  );

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {ORG_FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setStatus(f.v)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              status === f.v
                ? 'bg-ember-primary text-ember-on-primary'
                : 'bg-ember-card text-ember-muted hover:text-ember-cream'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <h3 className="px-1 font-display text-sm font-bold uppercase tracking-wide text-ember-cream">
        Richieste account
      </h3>
      <div className="card divide-y divide-ember-line/5 overflow-hidden">
        {busy && !requests.length && <p className="p-4 text-sm text-ember-muted">Caricamento…</p>}
        {!busy && !requests.length && (
          <p className="p-4 text-sm text-ember-muted">Nessuna richiesta.</p>
        )}
        {requests.map((r) => (
          <div key={r.id} className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ember-cream">@{r.username ?? r.user_id}</span>
              <Tag color="primary">{r.requested_type}</Tag>
              {r.status !== 'pending' && (
                <Tag color={r.status === 'approved' ? 'primary' : 'accent'}>
                  {r.status === 'approved' ? 'approvata' : 'rifiutata'}
                </Tag>
              )}
              <span className="ml-auto text-xs text-ember-muted">
                {new Date(r.created_at).toLocaleDateString('it-IT')}
              </span>
            </div>
            {r.collaborations && (
              <>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ember-muted">
                  Collaborazioni
                </p>
                <p className="whitespace-pre-wrap text-sm text-ember-cream/90">
                  {r.collaborations}
                </p>
              </>
            )}
            {r.note && (
              <>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ember-muted">
                  Nota
                </p>
                <p className="whitespace-pre-wrap text-sm text-ember-cream/90">{r.note}</p>
              </>
            )}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ember-muted">
              Allegati
            </p>
            <div className="mt-1">
              <Proofs items={r.proofs} />
            </div>
            {r.admin_note && (
              <p className="mt-1 text-xs text-ember-muted">Nota: {r.admin_note}</p>
            )}
            {r.status === 'pending' && <Actions kind="request" id={r.id} />}
          </div>
        ))}
      </div>

      <h3 className="px-1 pt-2 font-display text-sm font-bold uppercase tracking-wide text-ember-cream">
        Rivendicazioni bar
      </h3>
      <div className="card divide-y divide-ember-line/5 overflow-hidden">
        {busy && !claims.length && <p className="p-4 text-sm text-ember-muted">Caricamento…</p>}
        {!busy && !claims.length && (
          <p className="p-4 text-sm text-ember-muted">Nessuna rivendicazione.</p>
        )}
        {claims.map((cl) => (
          <div key={cl.id} className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ember-cream">@{cl.username ?? cl.user_id}</span>
              <span className="text-xs text-ember-muted">
                → {cl.bar_name ?? cl.bar_id}
                {cl.bar_city ? ` (${cl.bar_city})` : ''}
              </span>
              {cl.status !== 'pending' && (
                <Tag color={cl.status === 'approved' ? 'primary' : 'accent'}>
                  {cl.status === 'approved' ? 'approvata' : 'rifiutata'}
                </Tag>
              )}
              <span className="ml-auto text-xs text-ember-muted">
                {new Date(cl.created_at).toLocaleDateString('it-IT')}
              </span>
            </div>
            {cl.note && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-ember-cream/90">{cl.note}</p>
            )}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-ember-muted">
              Allegati
            </p>
            <div className="mt-1">
              <Proofs items={cl.proofs} />
            </div>
            {cl.admin_note && (
              <p className="mt-1 text-xs text-ember-muted">Nota: {cl.admin_note}</p>
            )}
            {cl.status === 'pending' && <Actions kind="claim" id={cl.id} />}
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-ember-line/5 bg-ember-card px-3">
      <Icon name="search" size={16} className="text-ember-muted" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent py-2 text-sm text-ember-cream outline-none"
      />
    </div>
  );
}

// Kebab (⋮) button + dropdown. The menu renders into document.body with fixed
// positioning, so an ancestor's overflow-hidden can't clip it.
function KebabMenu({ items, disabled, title }) {
  const btnRef = useRef(null);
  const [pos, setPos] = useState(null); // { top, left } or null (closed)

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = 208; // w-52
    setPos({ top: r.bottom + 4, left: Math.max(8, r.right - width) });
  }, []);

  useLayoutEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => (pos ? setPos(null) : place())}
        disabled={disabled}
        title={title}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg leading-none text-ember-muted hover:bg-ember-line/5 hover:text-ember-cream disabled:opacity-30"
      >
        ⋮
      </button>
      {pos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[1900]" onClick={() => setPos(null)} />
            <div
              className="fixed z-[2000] w-52 overflow-hidden rounded-xl border border-ember-line/10 bg-ember-card shadow-xl"
              style={{ top: pos.top, left: pos.left }}
            >
              {items.map((it, i) => (
                <MenuItem
                  key={i}
                  icon={it.icon}
                  danger={it.danger}
                  onClick={() => {
                    setPos(null);
                    it.onClick();
                  }}
                >
                  {it.label}
                </MenuItem>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}

function MenuItem({ icon, children, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-ember-line/5 ${
        danger ? 'text-ember-danger' : 'text-ember-cream'
      }`}
    >
      <Icon name={icon} size={15} className={danger ? 'text-ember-danger' : 'text-ember-ink'} />
      {children}
    </button>
  );
}

function RoleBadge({ role }) {
  if (role === 'user') return null;
  return <Tag color="primary">{role}</Tag>;
}

function Tag({ children, color = 'muted' }) {
  const cls =
    color === 'accent'
      ? 'bg-ember-danger/15 text-ember-danger'
      : color === 'primary'
        ? 'bg-ember-primary/15 text-ember-ink'
        : 'bg-ember-line/5 text-ember-muted';
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>{children}</span>;
}

function Switch({ label, desc, checked, onChange }) {
  return (
    <div className="flex items-center gap-3 card p-4">
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-ember-cream">{label}</div>
        <div className="text-sm text-ember-muted">{desc}</div>
      </div>
      <button
        onClick={onChange}
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-ember-primary' : 'bg-ember-line/15'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function ModalShell({ title, desc, children, onClose }) {
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-ember-line/10 bg-ember-card p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold text-ember-cream">{title}</h3>
        {desc && <p className="mt-1 text-sm text-ember-muted">{desc}</p>}
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ title, desc, confirmLabel, danger, onClose, onConfirm }) {
  return (
    <ModalShell title={title} desc={desc} onClose={onClose}>
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg bg-ember-line/5 py-2 font-semibold text-ember-cream">
          Annulla
        </button>
        <button
          onClick={onConfirm}
          className={`flex-1 rounded-lg py-2 font-semibold ${danger ? 'bg-ember-accent text-black' : 'bg-ember-primary text-ember-on-primary'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function ReasonModal({ title, desc, confirmLabel, danger, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  return (
    <ModalShell title={title} desc={desc} onClose={onClose}>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opzionale)"
        maxLength={500}
        className="mt-3 field py-2 text-sm"
      />
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg bg-ember-line/5 py-2 font-semibold text-ember-cream">
          Annulla
        </button>
        <button
          onClick={() => onConfirm(reason.trim() || undefined)}
          className={`flex-1 rounded-lg py-2 font-semibold ${danger ? 'bg-ember-accent text-black' : 'bg-ember-primary text-ember-on-primary'}`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

const DURATIONS = [
  { label: '1 ora', hours: 1 },
  { label: '24 ore', hours: 24 },
  { label: '7 giorni', hours: 24 * 7 },
  { label: '30 giorni', hours: 24 * 30 },
];

function SuspendModal({ user, onClose, onConfirm }) {
  const [hours, setHours] = useState(24);
  const [reason, setReason] = useState('');
  return (
    <ModalShell title={`Sospendi @${user.username}`} desc="L'account resterà bloccato per la durata scelta." onClose={onClose}>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d.hours}
            onClick={() => setHours(d.hours)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              hours === d.hours ? 'bg-ember-primary text-ember-on-primary' : 'bg-ember-line/5 text-ember-cream'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs text-ember-muted">Oppure ore personalizzate</label>
      <input
        type="number"
        min={1}
        value={hours}
        onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))}
        className="field mt-1 py-2 text-sm"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opzionale)"
        maxLength={500}
        className="mt-2 field py-2 text-sm"
      />
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg bg-ember-line/5 py-2 font-semibold text-ember-cream">
          Annulla
        </button>
        <button
          onClick={() => onConfirm(hours, reason.trim() || undefined)}
          className="btn-primary flex-1 py-2"
        >
          Sospendi
        </button>
      </div>
    </ModalShell>
  );
}

const ROLES = ['user', 'betatester', 'organizer', 'moderator', 'admin'];
const ORGANIZER_TYPES = ['pr', 'organizzatore', 'proprietario'];

function RoleModal({ user, onClose, onConfirm }) {
  const [role, setRole] = useState(user.role);
  const [orgType, setOrgType] = useState(user.organizer_type || 'pr');
  return (
    <ModalShell title={`Ruolo di @${user.username}`} onClose={onClose}>
      <div className="mt-3 space-y-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold transition ${
              role === r ? 'bg-ember-primary text-ember-on-primary' : 'bg-ember-line/5 text-ember-cream'
            }`}
          >
            <span className="capitalize">{r}</span>
            {role === r && <Icon name="check" size={15} />}
          </button>
        ))}
      </div>
      {role === 'organizer' && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs text-ember-muted">Tipo organizzatore</p>
          <div className="grid grid-cols-3 gap-2">
            {ORGANIZER_TYPES.map((tp) => (
              <button
                key={tp}
                onClick={() => setOrgType(tp)}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold capitalize transition ${
                  orgType === tp
                    ? 'bg-ember-primary text-ember-on-primary'
                    : 'bg-ember-line/5 text-ember-cream'
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg bg-ember-line/5 py-2 font-semibold text-ember-cream">
          Annulla
        </button>
        <button
          onClick={() => onConfirm(role, role === 'organizer' ? orgType : undefined)}
          disabled={role === user.role && (role !== 'organizer' || orgType === user.organizer_type)}
          className="btn-primary flex-1 py-2"
        >
          Salva
        </button>
      </div>
    </ModalShell>
  );
}
