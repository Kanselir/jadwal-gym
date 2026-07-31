import { Link, useLocation } from 'react-router-dom';
import { Calendar, LineChart } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="nav-brand">GymTracker</div>
      <div className="nav-links">
        <Link 
          to="/" 
          className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
        >
          <Calendar size={20} />
          <span>Hari Ini</span>
        </Link>
        <Link 
          to="/history" 
          className={`nav-link ${location.pathname === '/history' ? 'active' : ''}`}
        >
          <LineChart size={20} />
          <span>Riwayat</span>
        </Link>
      </div>
    </nav>
  );
}
