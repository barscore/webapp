import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';
import { boostsApi } from '../services/api.js';

// Pagina di ritorno da Stripe Checkout (/boost/esito?session_id=…). Lo stato
// arriva dal backend (webhook), mai dal query param: il pagamento è confermato
// solo quando l'ordine risulta "paid".
export default function BoostResult() {
  const [state, setState] = useState('loading'); // loading | paid | pending | error

  useEffect(() => {
    const sid = new URLSearchParams(window.location.search).get('session_id');
    if (!sid) return setState('error');
    let tries = 0;
    let stop = false;
    const poll = () =>
      boostsApi
        .session(sid)
        .then((o) => {
          if (stop) return;
          if (o.status === 'paid') setState('paid');
          else if (++tries < 10) setTimeout(poll, 2000); // il webhook può arrivare dopo il redirect
          else setState('pending');
        })
        .catch(() => !stop && setState('error'));
    poll();
    return () => {
      stop = true;
    };
  }, []);

  const content = {
    loading: { icon: 'reload', spin: true, title: 'Verifica del pagamento…', body: 'Un attimo.' },
    paid: {
      icon: 'check',
      title: 'Boost attivo!',
      body: 'Il pagamento è andato a buon fine: da ora appari in cima alla lista con l\'etichetta "Sponsorizzato".',
    },
    pending: {
      icon: 'info',
      title: 'Pagamento in elaborazione',
      body: 'Stripe sta ancora confermando il pagamento. Il boost si attiverà automaticamente entro pochi minuti.',
    },
    error: {
      icon: 'close',
      title: 'Qualcosa è andato storto',
      body: 'Non troviamo questo ordine. Se il pagamento è stato addebitato, il boost si attiverà comunque; altrimenti riprova.',
    },
  }[state];

  return (
    <div className="grid min-h-full place-items-center bg-ember-bg p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <Logo size="sm" />
        </div>
        <div className="card p-6">
          <Icon
            name={content.icon}
            size={34}
            className={`mx-auto text-ember-ink ${content.spin ? 'animate-spin' : ''}`}
          />
          <h1 className="mt-3 font-display text-xl font-bold text-ember-cream">{content.title}</h1>
          <p className="mt-2 text-sm text-ember-muted">{content.body}</p>
          <Link to="/?tab=eventi" className="btn-primary mt-5 inline-flex px-5 py-2">
            <Icon name="arrow-left" size={16} /> Torna agli eventi
          </Link>
        </div>
      </div>
    </div>
  );
}
