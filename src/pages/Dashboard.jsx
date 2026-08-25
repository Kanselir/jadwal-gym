import { useState, useEffect } from 'react';
import { scheduleData as initialScheduleData } from '../data/schedule';
import { supabase } from '../supabaseClient';
import { CheckCircle2, Clock, AlertCircle, Edit3, RotateCcw, X, CalendarCheck, AlertTriangle, PlusCircle, Dumbbell, Sparkles, LayoutList } from 'lucide-react';
import { format, getISOWeek, getYear } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Dashboard() {
  const [dayIndex, setDayIndex] = useState(new Date().getDay());
  const [todayLogs, setTodayLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all'); // 'all', 'posture', 'main', 'extra'

  // Current week identifier, e.g. "2026-W34"
  const currentWeekKey = `${getYear(new Date())}-W${getISOWeek(new Date())}`;

  // Permanent Custom Workout Schedule
  const [permanentSchedule, setPermanentSchedule] = useState(() => {
    const saved = localStorage.getItem('customWorkoutSchedule');
    return saved ? JSON.parse(saved) : initialScheduleData;
  });

  // Temporary Workout Overrides for THIS week only
  const [temporaryOverrides, setTemporaryOverrides] = useState(() => {
    const saved = localStorage.getItem('tempWorkoutOverrides');
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (parsed.weekKey !== currentWeekKey) {
      localStorage.removeItem('tempWorkoutOverrides');
      return {};
    }
    return parsed.overrides || {};
  });

  // Modal State for Editing Exercise Target
  const [editingExercise, setEditingExercise] = useState(null);
  const [targetInput, setTargetInput] = useState('');
  const [noteInput, setNoteInput] = useState('');

  // Extra Workout Form State
  const [extraExerciseName, setExtraExerciseName] = useState('Push Up');
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [extraAmount, setExtraAmount] = useState('');
  const [extraType, setExtraType] = useState('reps');
  const [submittingExtra, setSubmittingExtra] = useState(false);

  const allAvailableExerciseNames = [
    'Push Up',
    'Gelantungan / Pull Up',
    'Angkat Barbel / Dumbbell',
    'Sit Up',
    'Squat Jump',
    'Lompat Tali / Skipping',
    'Sepeda Statis',
    'Samsak Tinju',
    'Plank',
    'Cobra Pose',
    'Cat-Cow Stretch',
    'Forward Bend',
    'Bridge Pose',
    'Chin Tucks & Wall Angels',
    'Door Frame Stretch',
    'Hip Flexor Stretch',
    'Thoracic Extension',
    'Lainnya (Tulis Sendiri)'
  ];

  // Helper to compute effective schedule
  const getEffectiveSchedule = (scheduleObj, tempObj) => {
    const effective = JSON.parse(JSON.stringify(scheduleObj));
    Object.keys(tempObj).forEach(exId => {
      const override = tempObj[exId];
      const dayIdx = override.dayIdx;
      if (effective[dayIdx] && effective[dayIdx].exercises) {
        effective[dayIdx].exercises = effective[dayIdx].exercises.map(ex => {
          if (ex.id === exId) {
            return { ...ex, ...override.data, isTemporary: true };
          }
          return ex;
        });
      }
    });
    return effective;
  };

  const effectiveSchedule = getEffectiveSchedule(permanentSchedule, temporaryOverrides);
  const schedule = effectiveSchedule[dayIndex] || { title: '', description: '', exercises: [] };

  // Separate exercises into Daily Posture Routines vs Main Day Specific Exercises
  const postureExercises = schedule.exercises.filter(ex => ex.sets === 'Rutinitas Postur');
  const mainExercises = schedule.exercises.filter(ex => ex.sets !== 'Rutinitas Postur');

  useEffect(() => {
    fetchTodayLogs();
  }, [dayIndex]);

  const fetchTodayLogs = async () => {
    setLoading(true);
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

  // Open Edit Modal
  const handleOpenEdit = (ex) => {
    setEditingExercise(ex);
    const targetVal = ex.type === 'reps' ? ex.minReps : ex.minDuration;
    setTargetInput(targetVal || '');
    setNoteInput(ex.note || '');
  };

  // Save Temporary Target (Current Week Only)
  const handleSaveTemporary = (e) => {
    e.preventDefault();
    if (!editingExercise) return;

    const numTarget = parseFloat(targetInput);
    if (isNaN(numTarget) || numTarget <= 0) return;

    const exId = editingExercise.id;
    const isReps = editingExercise.type === 'reps';

    const overrideData = {
      note: noteInput,
      ...(isReps ? { minReps: numTarget } : { minDuration: numTarget })
    };

    const newOverrides = {
      ...temporaryOverrides,
      [exId]: {
        dayIdx: dayIndex,
        data: overrideData
      }
    };

    setTemporaryOverrides(newOverrides);
    localStorage.setItem('tempWorkoutOverrides', JSON.stringify({
      weekKey: currentWeekKey,
      overrides: newOverrides
    }));

    setEditingExercise(null);
  };

  // Save Permanent Target (All Weeks)
  const handleSavePermanent = (e) => {
    e.preventDefault();
    if (!editingExercise) return;

    const numTarget = parseFloat(targetInput);
    if (isNaN(numTarget) || numTarget <= 0) return;

    const exId = editingExercise.id;
    const isReps = editingExercise.type === 'reps';

    const newOverrides = { ...temporaryOverrides };
    delete newOverrides[exId];
    setTemporaryOverrides(newOverrides);
    localStorage.setItem('tempWorkoutOverrides', JSON.stringify({
      weekKey: currentWeekKey,
      overrides: newOverrides
    }));

    const updatedPermanent = { ...permanentSchedule };
    updatedPermanent[dayIndex].exercises = updatedPermanent[dayIndex].exercises.map(ex => {
      if (ex.id === exId) {
        return {
          ...ex,
          note: noteInput,
          ...(isReps ? { minReps: numTarget } : { minDuration: numTarget })
        };
      }
      return ex;
    });

    setPermanentSchedule(updatedPermanent);
    localStorage.setItem('customWorkoutSchedule', JSON.stringify(updatedPermanent));

    setEditingExercise(null);
  };

  const handleClearTemporary = () => {
    localStorage.removeItem('tempWorkoutOverrides');
    setTemporaryOverrides({});
  };

  const handleResetSchedule = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan target olahraga ke jadwal default awal?")) {
      localStorage.removeItem('customWorkoutSchedule');
      localStorage.removeItem('tempWorkoutOverrides');
      setPermanentSchedule(initialScheduleData);
      setTemporaryOverrides({});
    }
  };

  // Handle Submitting Extra Unscheduled Workout
  const handleAddExtraWorkout = async (e) => {
    e.preventDefault();
    const finalName = extraExerciseName === 'Lainnya (Tulis Sendiri)' ? customExerciseName.trim() : extraExerciseName;
    if (!finalName) {
      alert("Tuliskan nama olahraga tambahan.");
      return;
    }
    if (!extraAmount || isNaN(extraAmount) || extraAmount <= 0) return;

    setSubmittingExtra(true);
    const numAmount = parseFloat(extraAmount);

    try {
      const { error } = await supabase.from('workouts').insert([
        {
          exercise_name: finalName,
          amount: numAmount,
          type: extraType,
          target_met: true
        }
      ]);

      if (error) throw error;
      setExtraAmount('');
      if (extraExerciseName === 'Lainnya (Tulis Sendiri)') setCustomExerciseName('');
      fetchTodayLogs();
    } catch (err) {
      console.error("Error inserting extra workout:", err);
      alert("Gagal menyimpan olahraga tambahan.");
    } finally {
      setSubmittingExtra(false);
    }
  };

  const hasTempOverrides = Object.keys(temporaryOverrides).length > 0;

  return (
    <div className="dashboard">
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>{format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}</h1>
          <p>Jadwal hari ini: <strong style={{ color: 'var(--text-primary)' }}>{schedule.title}</strong></p>
          <p className="mt-2">{schedule.description}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {hasTempOverrides && (
            <button 
              onClick={handleClearTemporary} 
              className="toggle-btn"
              title="Hapus perubahan target sementara minggu ini"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <RotateCcw size={16} /> Hapus Edit Minggu Ini
            </button>
          )}
          <button 
            onClick={handleResetSchedule} 
            className="toggle-btn"
            title="Reset Target ke Default"
            style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
          >
            <RotateCcw size={16} /> Reset Target Default
          </button>
        </div>
      </div>

      {hasTempOverrides && (
        <div className="badge success mb-4" style={{ width: '100%', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <AlertTriangle size={18} />
          <span>Ada target olahraga yang di-edit <strong>sementara minggu ini</strong>. Minggu depan akan kembali normal otomatis!</span>
        </div>
      )}

      {/* CATEGORY SUB-TABS (TOMBOL PEMISAH KEGIATAN) */}
      <div className="view-toggle-buttons mb-4" style={{ justifyContent: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button 
          className={`toggle-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <LayoutList size={16} /> Tampilkan Semua
        </button>
        <button 
          className={`toggle-btn ${activeCategory === 'posture' ? 'active' : ''}`}
          onClick={() => setActiveCategory('posture')}
        >
          <Sparkles size={16} /> Rutinitas Postur (Setiap Hari) ({postureExercises.length})
        </button>
        <button 
          className={`toggle-btn ${activeCategory === 'main' ? 'active' : ''}`}
          onClick={() => setActiveCategory('main')}
        >
          <Dumbbell size={16} /> Latihan Utama Hari Ini ({mainExercises.length})
        </button>
        <button 
          className={`toggle-btn ${activeCategory === 'extra' ? 'active' : ''}`}
          onClick={() => setActiveCategory('extra')}
        >
          <PlusCircle size={16} /> Olahraga Ekstra / Tambahan
        </button>
      </div>

      {loading ? (
        <p>Memuat data hari ini...</p>
      ) : (
        <>
          {/* SECTION 1: RUTINITAS FLEKSIBILITAS & POSTUR HARIAN */}
          {(activeCategory === 'all' || activeCategory === 'posture') && postureExercises.length > 0 && (
            <div className="mb-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Sparkles color="#a78bfa" size={22} />
                <h2 style={{ color: 'var(--purple-accent)', margin: 0 }}>🌅 Rutinitas Fleksibilitas & Postur (Setiap Hari)</h2>
              </div>
              <div className="exercises-list">
                {postureExercises.map((exercise) => (
                  <ExerciseCard 
                    key={exercise.id} 
                    exercise={exercise} 
                    logs={todayLogs.filter(log => log.exercise_name === exercise.name)}
                    onSuccess={fetchTodayLogs}
                    onOpenEdit={() => handleOpenEdit(exercise)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: LATIHAN UTAMA HARI INI */}
          {(activeCategory === 'all' || activeCategory === 'main') && (
            <div className="mb-4" style={{ marginTop: activeCategory === 'all' ? '2rem' : '0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Dumbbell color="#60a5fa" size={22} />
                <h2 style={{ color: '#60a5fa', margin: 0 }}>🏋️‍♂️ Latihan Spesifik Hari Ini</h2>
              </div>
              {mainExercises.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <CheckCircle2 size={48} color="var(--success-color)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
                  <h2>Hari Istirahat Total!</h2>
                  <p>Bebaskan tubuh sepenuhnya dari olahraga berat agar hormon pertumbuhan tulang dan pemulihan otot bekerja maksimal saat tidur.</p>
                </div>
              ) : (
                <div className="exercises-list">
                  {mainExercises.map((exercise) => (
                    <ExerciseCard 
                      key={exercise.id} 
                      exercise={exercise} 
                      logs={todayLogs.filter(log => log.exercise_name === exercise.name)}
                      onSuccess={fetchTodayLogs}
                      onOpenEdit={() => handleOpenEdit(exercise)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: OLAHRAGA TAMBAHAN / EKSTRA */}
          {(activeCategory === 'all' || activeCategory === 'extra') && (
            <div className="card mt-4" style={{ border: '1px solid #f59e0b', backgroundColor: 'rgba(30, 41, 59, 0.95)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <PlusCircle color="#f59e0b" size={22} />
                <h3 style={{ color: '#f59e0b' }}>Catat Olahraga Tambahan / Ekstra (Di Luar Jadwal)</h3>
              </div>
              <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                Lakukan latihan ekstra hari ini meski tidak ada di jadwal? Pilih jenis olahraga dan masukkan jumlahnya di bawah untuk menambahkan catatan hari ini:
              </p>

              <form onSubmit={handleAddExtraWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Jenis Olahraga:</label>
                    <select 
                      value={extraExerciseName} 
                      onChange={e => setExtraExerciseName(e.target.value)}
                      style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', width: '100%', fontSize: '0.9rem' }}
                    >
                      {allAvailableExerciseNames.map((name, i) => (
                        <option key={i} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  {extraExerciseName === 'Lainnya (Tulis Sendiri)' && (
                    <div>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nama Olahraga Custom:</label>
                      <input 
                        type="text" 
                        placeholder="Nama olahraga..."
                        value={customExerciseName}
                        onChange={e => setCustomExerciseName(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Satuan:</label>
                    <select 
                      value={extraType} 
                      onChange={e => setExtraType(e.target.value)}
                      style={{ padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', width: '100%', fontSize: '0.9rem' }}
                    >
                      <option value="reps">Repetisi / Pukulan</option>
                      <option value="duration">Menit / Durasi</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Jumlah:</label>
                    <input 
                      type="number"
                      step="any"
                      placeholder="Masukkan jumlah..."
                      value={extraAmount}
                      onChange={e => setExtraAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={submittingExtra}
                  style={{ backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 'bold', marginTop: '0.5rem' }}
                >
                  {submittingExtra ? 'Menyimpan...' : 'Simpan Olahraga Tambahan'}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Modal Edit Target Olahraga */}
      {editingExercise && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="flex-between mb-4">
              <h3>Edit Target Olahraga</h3>
              <button onClick={() => setEditingExercise(null)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p>Olahraga: <strong style={{ color: 'var(--text-primary)' }}>{editingExercise.name}</strong></p>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Target Minimal Total ({editingExercise.type === 'reps' ? 'Repetisi / Pukulan' : 'Menit'}):
                </label>
                <input 
                  type="number" 
                  step="0.5"
                  value={targetInput} 
                  onChange={e => setTargetInput(e.target.value)}
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Catatan Tambahan / Panduan:</label>
                <input 
                  type="text" 
                  value={noteInput} 
                  onChange={e => setNoteInput(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={handleSaveTemporary}
                  style={{ backgroundColor: '#f59e0b', color: '#0f172a', fontWeight: 'bold' }}
                >
                  <Clock size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                  Simpan Sementara (Minggu Ini Saja)
                </button>
                <button 
                  type="button" 
                  onClick={handleSavePermanent}
                  style={{ backgroundColor: 'var(--accent-color)' }}
                >
                  <CalendarCheck size={16} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '6px' }} />
                  Simpan Permanen (Seterusnya)
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingExercise(null)} 
                  style={{ backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', marginTop: '0.25rem' }}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseCard({ exercise, logs, onSuccess, onOpenEdit }) {
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalDone = logs.reduce((sum, log) => sum + log.amount, 0);
  const target = exercise.type === 'reps' ? exercise.minReps : exercise.minDuration;
  const unit = exercise.type === 'reps' ? 'repetisi' : 'menit';
  const isTargetMet = totalDone >= target;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || amount <= 0) return;

    setSubmitting(true);
    const numAmount = parseFloat(amount);
    
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
      onSuccess();
    } catch (error) {
      console.error('Error saving workout:', error.message);
      alert('Gagal menyimpan data.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`card ${exercise.isTemporary ? 'temp-card' : ''}`} style={exercise.isTemporary ? { border: '1px dashed #f59e0b' } : {}}>
      <div className="flex-between mb-4">
        <div>
          <h2 style={{ display: 'inline-block', marginRight: '0.5rem' }}>{exercise.name}</h2>
          {exercise.isTemporary && (
            <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              Minggu Ini Saja
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button 
            onClick={onOpenEdit} 
            className="btn-icon-edit"
            title="Edit Target Olahraga Ini"
          >
            <Edit3 size={16} /> Edit Target
          </button>
          {isTargetMet ? (
            <span className="badge success">
              <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
              Target Tercapai
            </span>
          ) : (
            <span className="badge">Belum Tercapai</span>
          )}
        </div>
      </div>

      <p><strong>Kategori:</strong> {exercise.sets}</p>
      <p><strong>Target Minimal Total:</strong> {target} {unit}</p>
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
              step="any"
              placeholder={`Tambah ${unit}...`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.1"
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
