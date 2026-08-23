import { useState } from 'react';
import { Lock, Eye, EyeOff, Dumbbell, BookOpen } from 'lucide-react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const savedPassword = localStorage.getItem('customPassword') || import.meta.env.VITE_APP_PASSWORD || 'gym123';
    
    if (password === savedPassword) {
      sessionStorage.setItem('isLoggedIn', 'true');
      onLogin();
    } else {
      setError('Password salah! Silakan coba lagi.');
    }
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon-badge">
            <Dumbbell size={24} color="#3b82f6" />
            <BookOpen size={24} color="#a78bfa" />
          </div>
          <h2>Jadwal & Tracker</h2>
          <p>Masukkan password untuk mengakses jadwal Anda.</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="password-input-wrapper">
            <Lock size={18} className="input-icon-left" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Masukkan Password..."
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              autoFocus
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className="login-error-message">{error}</div>}

          <button type="submit" className="login-submit-btn">
            Masuk ke Aplikasi
          </button>
        </form>
        <div className="login-hint">
          <small>Password bawaan: <code>gym123</code> (bisa diganti di dalam menu Pengaturan)</small>
        </div>
      </div>
    </div>
  );
}
