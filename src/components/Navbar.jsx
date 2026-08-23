import { Link, useLocation } from 'react-router-dom';
import { Dumbbell, GraduationCap, BookOpen, LineChart, Settings, LogOut } from 'lucide-react';

export default function Navbar({ onLogout }) {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <span>RoutineTracker</span>
      </div>
      <div className="nav-links">
        <Link 
          to="/workout" 
          className={`nav-link ${location.pathname === '/workout' || location.pathname === '/' ? 'active' : ''}`}
        >
          <Dumbbell size={18} />
          <span>Olahraga</span>
        </Link>

        <Link 
          to="/college" 
          className={`nav-link ${location.pathname === '/college' ? 'active' : ''}`}
        >
          <GraduationCap size={18} />
          <span>Kuliah</span>
        </Link>

        <Link 
          to="/study" 
          className={`nav-link ${location.pathname === '/study' ? 'active' : ''}`}
        >
          <BookOpen size={18} />
          <span>Belajar</span>
        </Link>

        <Link 
          to="/history" 
          className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}
        >
          <LineChart size={18} />
          <span>Riwayat</span>
        </Link>

        <Link 
          to="/settings" 
          className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`}
          title="Pengaturan & Ganti Password"
        >
          <Settings size={18} />
        </Link>

        <button onClick={onLogout} className="nav-logout-btn" title="Kunci / Logout">
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
