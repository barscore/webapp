import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { supabase } from '../services/supabase.js';
import { meApi } from '../services/api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import Toast from '../components/Toast.jsx';

const ROLE_LABELS = { user: 'Utente', moderator: 'Moderatore', admin: 'Amministratore' };

// Account settings: read-only account details + credential changes (email /
// password) via supabase-js. Credential updates never go through the backend.
export default function Settings() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [toast, setToast] = useState(null);

  const [email, setEmail] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailErr, setEmailErr] = useState('');

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    meApi
      .profile()
      .then((p) => {
        setProfile(p);
        setEmail(p.email || '');
      })
      .catch(() => setToast({ msg: 'Impossibile caricare l’account', icon: 'info' }));
  }, [isAuthenticated]);

  async function changeEmail(e) {
    e.preventDefault();
    setEmailBusy(true);
    setEmailErr('');
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      setToast({ msg: 'Controlla la mail per confermare', icon: 'check' });
    } catch (err) {
      setEmailErr(err.message || 'Errore durante l’aggiornamento');
    } finally {
      setEmailBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    if (password.length < 6) return setPwErr('Minimo 6 caratteri');
    if (password !== password2) return setPwErr('Le password non coincidono');
    setPwBusy(true);
    setPwErr('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword('');
      setPassword2('');
      setToast({ msg: 'Password aggiornata', icon: 'check' });
    } catch (err) {
      setPwErr(err.message || 'Errore durante l’aggiornamento');
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-ember-bg p-4">
      <div className="mx-auto w-full max-w-lg space-y-5">
        <div>
          <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-ember-muted">
            <Icon name="arrow-left" size={15} /> Mappa
          </Link>
          <div className="mb-5">
            <Logo size="sm" />
          </div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-ember-cream">
            <Icon name="filters" size={22} className="text-ember-primary" /> Impostazioni
          </h1>
        </div>

        {/* Account details */}
        <section className="rounded-card border border-white/5 bg-ember-card p-4">
          <h2 className="mb-3 font-display font-bold text-ember-cream">Dettagli account</h2>
          <dl className="space-y-2 text-sm">
            <Detail icon="user" label="Username" value={profile ? `@${profile.username}` : '…'} />
            <Detail icon="link" label="Email" value={profile?.email || '…'} />
            <Detail
              icon="star"
              label="Ruolo"
              value={profile ? ROLE_LABELS[profile.role] || profile.role : '…'}
            />
            <Detail
              icon="review"
              label="Valutazioni"
              value={profile ? String(profile.ratings_count) : '…'}
            />
            <Detail
              icon="info"
              label="Iscritto dal"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('it-IT') : '…'}
            />
          </dl>
        </section>

        {/* Change email */}
        <form onSubmit={changeEmail} className="space-y-3 rounded-card border border-white/5 bg-ember-card p-4">
          <h2 className="font-display font-bold text-ember-cream">Cambia email</h2>
          <SettingsField label="Nuova email" type="email" value={email} onChange={setEmail} />
          {emailErr && <p className="text-sm text-ember-accent">{emailErr}</p>}
          <button
            type="submit"
            disabled={emailBusy}
            className="w-full rounded-lg bg-ember-primary py-2 font-semibold text-ember-bg disabled:opacity-50"
          >
            {emailBusy ? 'Salvataggio…' : 'Aggiorna email'}
          </button>
        </form>

        {/* Change password */}
        <form onSubmit={changePassword} className="space-y-3 rounded-card border border-white/5 bg-ember-card p-4">
          <h2 className="font-display font-bold text-ember-cream">Cambia password</h2>
          <SettingsField label="Nuova password" type="password" value={password} onChange={setPassword} />
          <SettingsField label="Conferma password" type="password" value={password2} onChange={setPassword2} />
          {pwErr && <p className="text-sm text-ember-accent">{pwErr}</p>}
          <button
            type="submit"
            disabled={pwBusy}
            className="w-full rounded-lg bg-ember-primary py-2 font-semibold text-ember-bg disabled:opacity-50"
          >
            {pwBusy ? 'Salvataggio…' : 'Aggiorna password'}
          </button>
        </form>
      </div>

      <Toast message={toast?.msg} icon={toast?.icon} onDone={() => setToast(null)} />
    </div>
  );
}

function Detail({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2 text-ember-muted">
        <Icon name={icon} size={15} className="text-ember-primary" />
        {label}
      </dt>
      <dd className="truncate text-ember-cream">{value}</dd>
    </div>
  );
}

function SettingsField({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-ember-muted">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-lg bg-ember-bg p-2 text-ember-cream outline-none ring-ember-primary focus:ring-2"
      />
    </div>
  );
}
