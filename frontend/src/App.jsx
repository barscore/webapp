import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import { supabase } from './services/supabase.js';
import Home from './pages/Home.jsx';
import BarDetail from './pages/BarDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';
import MyRatings from './pages/MyRatings.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Admin from './pages/Admin.jsx';
import Privacy from './pages/Privacy.jsx';
import Tos from './pages/Tos.jsx';
import Maintenance from './pages/Maintenance.jsx';
import BanBanner from './components/BanBanner.jsx';

export default function App() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const [maint, setMaint] = useState(null); // { maintenance_mode, maintenance_reason, maintenance_eta }

  // Poll the maintenance switch on every navigation so a non-admin user gets
  // locked out (and released) without a manual reload.
  useEffect(() => {
    let active = true;
    supabase
      .from('app_settings')
      .select('maintenance_mode, maintenance_reason, maintenance_eta')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (data) return setMaint(data);
        // Fallback: if the reason/eta columns aren't there yet, still read the
        // switch alone so the screen isn't silently skipped.
        if (error) {
          supabase
            .from('app_settings')
            .select('maintenance_mode')
            .eq('id', 1)
            .maybeSingle()
            .then(({ data: d }) => {
              if (active && d) setMaint(d);
            });
        }
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  // Block non-admins during maintenance. /login stays open so an admin can sign
  // in; admins reach everything (incl. /admin to flip it back off).
  if (!loading && maint?.maintenance_mode && !isAdmin && location.pathname !== '/login') {
    return <Maintenance reason={maint.maintenance_reason} eta={maint.maintenance_eta} />;
  }

  return (
    <>
      <BanBanner />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/bar/:id" element={<BarDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/impostazioni" element={<Settings />} />
      <Route path="/le-tue-valutazioni" element={<MyRatings />} />
      <Route path="/classifica" element={<Leaderboard />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/tos" element={<Tos />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
