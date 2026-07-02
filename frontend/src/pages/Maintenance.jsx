import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return (d > 0 ? `${d}g ` : '') + `${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
}

// Lock screen for the two emergency switches (see App.jsx):
//   default    — maintenance_mode: shown to non-admins.
//   beta       — beta_mode: shown to anyone who isn't admin/moderator/
//                betatester while the private beta runs.
// /login stays reachable so a privileged user can sign in.
export default function Maintenance({ reason, eta, beta = false }) {
  const etaMs = eta ? new Date(eta).getTime() : 0;
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!etaMs) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [etaMs]);

  const remaining = etaMs - now;

  return (
    <div className="grid min-h-full place-items-center bg-ember-bg p-6">
      <div className="w-full max-w-md rounded-card border border-white/5 bg-ember-card p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo size="sm" />
        </div>
        <div className="mb-4 flex justify-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-ember-accent/15">
            <Icon name="bell" size={26} className="text-ember-accent" />
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-ember-cream">
          {beta ? 'Beta test in corso' : 'Sito in manutenzione'}
        </h1>
        <p className="mt-3 text-sm text-ember-muted">
          {beta
            ? 'rabar è in beta privata: l’accesso è momentaneamente riservato ai beta tester. Torna a trovarci per il lancio!'
            : 'Stiamo effettuando lavori di manutenzione. Il sito è temporaneamente in sola lettura e alcune funzioni non sono disponibili.'}
        </p>

        {reason && (
          <div className="mt-4 rounded-lg bg-white/[0.03] p-3 text-left text-sm">
            <div className="text-xs uppercase tracking-wide text-ember-muted">Motivo</div>
            <div className="mt-0.5 text-ember-cream">{reason}</div>
          </div>
        )}

        {etaMs > 0 && (
          <div className="mt-3 rounded-lg bg-white/[0.03] p-3 text-sm">
            <div className="text-xs uppercase tracking-wide text-ember-muted">Tempo stimato</div>
            {remaining > 0 ? (
              <>
                <div className="mt-0.5 font-display text-lg font-bold tabular-nums text-ember-primary">
                  {fmt(remaining)}
                </div>
                <div className="text-xs text-ember-muted">
                  ritorno previsto {new Date(etaMs).toLocaleString('it-IT')}
                </div>
              </>
            ) : (
              <div className="mt-0.5 text-ember-cream">A breve — grazie per la pazienza.</div>
            )}
          </div>
        )}

        <Link
          to="/login"
          className="mt-6 inline-block rounded-lg border border-white/10 px-4 py-2 text-sm text-ember-muted hover:border-ember-primary/50 hover:text-ember-cream"
        >
          {beta ? 'Sei un beta tester? Accedi' : 'Sei un amministratore? Accedi'}
        </Link>
      </div>
    </div>
  );
}
