import { useState, useEffect } from 'react';
import Icon from './Icon.jsx';
import { meApi } from '../services/api.js';

export default function PrContactSettings({ profile, onUpdate }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [ig, setIg] = useState('');
  const [wa, setWa] = useState('');
  
  useEffect(() => {
    if (profile) {
      setIg(profile.instagram_username || '');
      setWa(profile.whatsapp_number || '');
    }
  }, [profile]);

  if (!profile) return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setSuccess(false);
    
    try {
      const updated = await meApi.updateProfile({ 
        instagram_username: ig || null, 
        whatsapp_number: wa || null 
      });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Errore salvataggio contatti');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-4 space-y-4">
      <div>
        <h3 className="font-display font-bold text-ember-cream">Contatti PR</h3>
        <p className="text-sm text-ember-muted">I contatti mostrati agli utenti interessati ai tuoi eventi.</p>
      </div>
      
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm text-ember-muted">Nome utente Instagram</label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-ember-muted">@</span>
            <input
              type="text"
              value={ig}
              onChange={(e) => setIg(e.target.value)}
              className="field py-2 pl-8"
              placeholder="username"
            />
          </div>
        </div>
        
        <div>
          <label className="mb-1 block text-sm text-ember-muted">Numero WhatsApp</label>
          <input
            type="tel"
            value={wa}
            onChange={(e) => setWa(e.target.value)}
            className="field py-2"
            placeholder="+39 333 1234567"
          />
        </div>
        
        {err && <div className="text-sm text-ember-danger">{err}</div>}
        {success && <div className="text-sm text-green-400">Contatti salvati!</div>}
        
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full py-2.5"
        >
          {busy ? <Icon name="sync" size={16} className="animate-spin" /> : 'Salva contatti'}
        </button>
      </form>
    </section>
  );
}
