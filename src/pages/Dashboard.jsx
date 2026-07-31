import { useState, useEffect } from 'react';
import { scheduleData } from '../data/schedule';
import { supabase } from '../supabaseClient';
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Dashboard() {
  const [dayIndex, setDayIndex] = useState(new Date().getDay());
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const schedule = scheduleData[dayIndex];

  useEffect(() => {
    fetchTodayLogs();
  }, [dayIndex]);

  const fetchTodayLogs = async () => {
    setLoading(true);
    // Get start and end of today in ISO
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    try {
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;
      setTodayLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="mb-4">
        <h1>{format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}</h1>
        <p>Jadwal hari ini: <strong style={{ color: 'var(--text-primary)' }}>{schedule.title}</strong></p>
        <p className="mt-2">{schedule.description}</p>
      </div>

      {loading ? (
        <p>Memuat data hari ini...</p>
      ) : schedule.exercises.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle2 size={48} color="var(--success-color)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
          <h2>Hari Istirahat!</h2>
          <p>Nikmati waktu istirahat Anda. Otot berkembang saat Anda beristirahat.</p>
        </div>
      ) : (
        <div className="exercises-list">
          {schedule.exercises.map((exercise) => (
            <ExerciseCard 
              key={exercise.id} 
              exercise={exercise} 
              logs={todayLogs.filter(log => log.exercise_name === exercise.name)}
              onSuccess={fetchTodayLogs}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, logs, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate total amount done today for this exercise
  const totalDone = logs.reduce((sum, log) => sum + log.amount, 0);
  const target = exercise.type === 'reps' ? exercise.minReps : exercise.minDuration;
  const unit = exercise.type === 'reps' ? 'repetisi' : 'menit';
  const isTargetMet = totalDone >= target;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    const numAmount = parseInt(amount);
    
    // Check if after this submit, target is met
    const newTotal = totalDone + numAmount;
    const targetMet = newTotal >= target;

    try {
      const { error } = await supabase.from('workouts').insert([
        {
          exercise_name: exercise.name,
          amount: numAmount,
          type: exercise.type,
          target_met: targetMet
        }
      ]);

      if (error) throw error;
      setAmount('');
      onSuccess(); // Refresh logs
    } catch (error) {
      console.error('Error saving workout:', error.message);
      alert('Gagal menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="flex-between mb-4">
        <h2>{exercise.name}</h2>
        {isTargetMet ? (
          <span className="badge success">
            <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
            Target Tercapai
          </span>
        ) : (
          <span className="badge">Belum Tercapai</span>
        )}
      </div>

      <p><strong>Set:</strong> {exercise.sets}</p>
      <p><strong>Target Minimal:</strong> {target} {unit}</p>
      {exercise.note && <p className="mt-2" style={{ fontSize: '0.875rem' }}><em>Catatan: {exercise.note}</em></p>}

      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
        <div className="flex-between">
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Telah dilakukan hari ini:</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              {totalDone} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>{unit}</span>
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="input-group" style={{ marginTop: 0 }}>
            <input 
              type="number" 
              placeholder={`Tambah ${unit}...`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              disabled={submitting}
            />
            <button type="submit" disabled={submitting || !amount}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
          </form>
        </div>
      </div>

      {logs.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem' }}>Riwayat input hari ini:</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={12} />
                {format(new Date(log.created_at), 'HH:mm')} : +{log.amount} {unit}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
