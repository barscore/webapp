import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home.jsx';
import BarDetail from './pages/BarDetail.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/bar/:id" element={<BarDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
