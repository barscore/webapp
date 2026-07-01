import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import BarDetail from './pages/BarDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Settings from './pages/Settings.jsx';
import MyRatings from './pages/MyRatings.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/bar/:id" element={<BarDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/impostazioni" element={<Settings />} />
      <Route path="/le-tue-valutazioni" element={<MyRatings />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
