import { useState } from 'react';
import { KeyRound, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleChangePassword = (e) => {
    e.preventDefault();
    const currentSaved = localStorage.getItem('customPassword') || import.meta.env.VITE_APP_PASSWORD || 'gym123';

    if (oldPassword !== currentSaved) {
      setMessage({ text: 'Password lama Anda salah!', type: 'danger' });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ text: 'Password baru minimal 4 karakter!', type: 'danger' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ text: 'Konfirmasi password baru tidak cocok!', type: 'danger' });
      return;
    }

    localStorage.setItem('customPassword', newPassword);
    setMessage({ text: 'Password berhasil diperbarui! Gunakan password baru ini untuk login berikutnya.', type: 'success' });
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleResetPassword = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan password ke default (gym123)?")) {
      localStorage.removeItem('customPassword');
      setMessage({ text: 'Password berhasil dikembalikan ke default (gym123).', type: 'success' });
    }
  };

  return (
    <div className="settings-page">
      <div className="mb-4">
        <h1>Pengaturan & Keamanan</h1>
        <p>Kelola password aplikasi dan konfigurasi akun Anda.</p>
      </div>

      <div className="card">
        <div className="flex-between mb-4">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <KeyRound color="#60a5fa" size={24} />
            <h2>Ubah Password App</h2>
          </div>
          <button 
            type="button" 
            onClick={handleResetPassword}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
          >
            <RotateCcw size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
            Reset Password
          </button>
        </div>

        {message.text && (
          <div className={`badge ${message.type === 'success' ? 'success' : 'danger'}`} style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
            {message.type === 'success' && <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />}
            {message.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Password Lama</label>
            <input 
              type="password"
              placeholder="Masukkan password lama Anda..."
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Password Baru</label>
            <input 
              type="password"
              placeholder="Masukkan password baru..."
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', display: 'block' }}>Konfirmasi Password Baru</label>
            <input 
              type="password"
              placeholder="Ulangi password baru..."
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" style={{ marginTop: '0.5rem' }}>
            Simpan Password Baru
          </button>
        </form>
      </div>
    </div>
  );
}
