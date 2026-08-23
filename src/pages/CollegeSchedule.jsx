import { useState, useEffect } from 'react';
import { scheduleData as initialScheduleData, unscheduledClasses } from '../data/schedule';
import { supabase } from '../supabaseClient';
import { BookOpen, Clock, MapPin, User, CheckCircle2, Calendar, Edit3, RotateCcw, X, AlertTriangle, CalendarCheck } from 'lucide-react';
import { format, getISOWeek, getYear } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CollegeSchedule() {
  const [dayIndex, setDayIndex] = useState(new Date().getDay());
  const [viewMode, setViewMode] = useState('today'); // 'today' or 'week'
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);

  // Current week identifier, e.g. "2026-W34"
  const currentWeekKey = `${getYear(new Date())}-W${getISOWeek(new Date())}`;

  // Permanently saved custom schedule
  const [permanentSchedule, setPermanentSchedule] = useState(() => {
    const saved = localStorage.getItem('customCollegeSchedule');
    return saved ? JSON.parse(saved) : initialScheduleData;
  });

  // Temporary schedule overrides for THIS week only
  const [temporaryOverrides, setTemporaryOverrides] = useState(() => {
    const saved = localStorage.getItem('tempCollegeOverrides');
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    // If saved overrides belong to an old week, automatically discard them!
    if (parsed.weekKey !== currentWeekKey) {
      localStorage.removeItem('tempCollegeOverrides');
      return {};
    }
    return parsed.overrides || {};
  });

  // Modal State
  const [editingClass, setEditingClass] = useState(null); // { dayIdx, classObj }
  const [formData, setFormData] = useState({ name: '', code: '', time: '', room: '', lecturer: '' });

  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  // Helper to compute effective schedule considering permanent schedule + temporary overrides
  const getEffectiveSchedule = (scheduleObj, tempObj) => {
    const effective = JSON.parse(JSON.stringify(scheduleObj));
    Object.keys(tempObj).forEach(classId => {
      const override = tempObj[classId];
      const dayIdx = override.dayIdx;
      if (effective[dayIdx] && effective[dayIdx].classes) {
        effective[dayIdx].classes = effective[dayIdx].classes.map(cls => {
          if (cls.id === classId) {
            return { ...cls, ...override.data, isTemporary: true };
          }
          return cls;
        });
      }
    });
    return effective;
  };

  const effectiveSchedule = getEffectiveSchedule(permanentSchedule, temporaryOverrides);
  const todaySchedule = effectiveSchedule[dayIndex] || { classes: [] };

  useEffect(() => {
    fetchTodayAttendance();
  }, [dayIndex]);

  const fetchTodayAttendance = async () => {
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
        .lte('created_at', end.toISOString())
        .eq('type', 'attendance');

      if (!error && data) {
        const attObj = {};
        data.forEach(item => {
          attObj[item.exercise_name] = true;
        });
        setAttendance(attObj);
      }
    } catch (err) {
      console.warn("Could not fetch attendance", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = async (className) => {
    const isAttended = !attendance[className];
    setAttendance(prev => ({ ...prev, [className]: isAttended }));

    try {
      if (isAttended) {
        await supabase.from('workouts').insert([
          {
            exercise_name: className,
            amount: 1,
            type: 'attendance',
            target_met: true
          }
        ]);
      }
    } catch (err) {
      console.error("Error updating attendance:", err);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (dIdx, cls) => {
    setEditingClass({ dayIdx: dIdx, id: cls.id, isTemporary: !!cls.isTemporary });
    setFormData({
      name: cls.name,
      code: cls.code || '',
      time: cls.time,
      room: cls.room,
      lecturer: cls.lecturer
    });
  };

  // Save as Temporary (Current Week Only)
  const handleSaveTemporary = (e) => {
    e.preventDefault();
    if (!editingClass) return;

    const { dayIdx, id } = editingClass;
    const newOverrides = {
      ...temporaryOverrides,
      [id]: {
        dayIdx,
        data: formData
      }
    };

    setTemporaryOverrides(newOverrides);
    localStorage.setItem('tempCollegeOverrides', JSON.stringify({
      weekKey: currentWeekKey,
      overrides: newOverrides
    }));

    setEditingClass(null);
  };

  // Save as Permanent (All Weeks)
  const handleSavePermanent = (e) => {
    e.preventDefault();
    if (!editingClass) return;

    const { dayIdx, id } = editingClass;

    // Remove any temporary override for this class if saving permanently
    const newOverrides = { ...temporaryOverrides };
    delete newOverrides[id];
    setTemporaryOverrides(newOverrides);
    localStorage.setItem('tempCollegeOverrides', JSON.stringify({
      weekKey: currentWeekKey,
      overrides: newOverrides
    }));

    // Update permanent schedule
    const updatedPermanent = { ...permanentSchedule };
    updatedPermanent[dayIdx].classes = updatedPermanent[dayIdx].classes.map(cls => {
      if (cls.id === id) {
        return { ...cls, ...formData };
      }
      return cls;
    });

    setPermanentSchedule(updatedPermanent);
    localStorage.setItem('customCollegeSchedule', JSON.stringify(updatedPermanent));

    setEditingClass(null);
  };

  // Reset all temporary changes
  const handleClearTemporary = () => {
    localStorage.removeItem('tempCollegeOverrides');
    setTemporaryOverrides({});
  };

  // Reset to default schedule
  const handleResetSchedule = () => {
    if (window.confirm("Apakah Anda yakin ingin mengembalikan seluruh jadwal ke versi awal? Semua perubahan akan dihapus.")) {
      localStorage.removeItem('customCollegeSchedule');
      localStorage.removeItem('tempCollegeOverrides');
      setPermanentSchedule(initialScheduleData);
      setTemporaryOverrides({});
    }
  };

  const hasTempOverrides = Object.keys(temporaryOverrides).length > 0;

  return (
    <div className="college-schedule-page">
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Jadwal Kuliah</h1>
          <p>{format(new Date(), 'EEEE, d MMMM yyyy', { locale: id })}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {hasTempOverrides && (
            <button 
              onClick={handleClearTemporary} 
              className="toggle-btn"
              title="Hapus perubahan sementara minggu ini"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <RotateCcw size={16} /> Hapus Perubahan Minggu Ini
            </button>
          )}
          <button 
            onClick={handleResetSchedule} 
            className="toggle-btn"
            title="Reset ke Jadwal Default Awal"
            style={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }}
          >
            <RotateCcw size={16} /> Reset Default
          </button>
          <div className="view-toggle-buttons">
            <button 
              className={`toggle-btn ${viewMode === 'today' ? 'active' : ''}`}
              onClick={() => setViewMode('today')}
            >
              <Clock size={16} /> Hari Ini
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              <Calendar size={16} /> Minggu Ini
            </button>
          </div>
        </div>
      </div>

      {hasTempOverrides && (
        <div className="badge success mb-4" style={{ width: '100%', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <AlertTriangle size={18} />
          <span>Ada perubahan jadwal <strong>sementara minggu ini</strong>. Minggu depan akan kembali normal otomatis!</span>
        </div>
      )}

      {viewMode === 'today' ? (
        <div className="today-classes-section">
          {todaySchedule.classes.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <BookOpen size={48} color="var(--accent-color)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
              <h2>Tidak Ada Kuliah Hari Ini!</h2>
              <p>Tidak ada jadwal matakuliah untuk hari {dayNames[dayIndex]}.</p>
            </div>
          ) : (
            <div className="classes-grid">
              {todaySchedule.classes.map((cls) => {
                const isAttended = !!attendance[cls.name];
                return (
                  <div key={cls.id} className={`card class-card ${isAttended ? 'attended' : ''}`} style={cls.isTemporary ? { border: '1px dashed #f59e0b' } : {}}>
                    <div className="flex-between mb-2">
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                          {cls.code}
                        </span>
                        {cls.isTemporary && (
                          <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                            Minggu Ini Saja
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button 
                          onClick={() => handleOpenEdit(dayIndex, cls)} 
                          className="btn-icon-edit"
                          title="Edit Jam & Ruangan"
                        >
                          <Edit3 size={16} /> Edit
                        </button>
                        {isAttended ? (
                          <span className="badge success">
                            <CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '4px' }} />
                            Hadir
                          </span>
                        ) : (
                          <span className="badge">Belum Presensi</span>
                        )}
                      </div>
                    </div>

                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{cls.name}</h2>

                    <div className="class-meta">
                      <p><Clock size={16} /> <strong>Jam:</strong> {cls.time}</p>
                      <p><MapPin size={16} /> <strong>Ruangan:</strong> {cls.room}</p>
                      <p><User size={16} /> <strong>Dosen:</strong> {cls.lecturer}</p>
                    </div>

                    <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        onClick={() => handleToggleAttendance(cls.name)}
                        className={isAttended ? 'btn-attended' : 'btn-mark-present'}
                        style={{ width: '100%' }}
                      >
                        {isAttended ? 'Batal Presensi' : 'Tandai Hadir Kuliah'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Matakuliah Tanpa Jadwal */}
          <div className="card mt-4">
            <div className="flex-between">
              <h3>Matakuliah Tanpa Jadwal</h3>
              <span className="badge">Belum Ada Jadwal</span>
            </div>
            {unscheduledClasses.map(uc => (
              <div key={uc.id} className="mt-2" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                <strong>{uc.name}</strong> ({uc.code}) - Dosen: {uc.lecturer}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Full Week View */
        <div className="week-classes-section">
          {[1, 2, 3, 4, 5].map((dIdx) => {
            const dayData = effectiveSchedule[dIdx] || { classes: [] };
            return (
              <div key={dIdx} className="card mb-4">
                <h3 style={{ color: dIdx === dayIndex ? 'var(--accent-color)' : 'var(--text-primary)', marginBottom: '1rem' }}>
                  {dayNames[dIdx]} {dIdx === dayIndex ? '(Hari Ini)' : ''}
                </h3>
                
                {dayData.classes.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', fontStyle: 'italic' }}>Tidak ada perkuliahan</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {dayData.classes.map(cls => (
                      <div key={cls.id} style={{ padding: '0.75rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', border: cls.isTemporary ? '1px dashed #f59e0b' : '1px solid var(--border-color)' }}>
                        <div className="flex-between">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <strong>{cls.name}</strong>
                            {cls.isTemporary && (
                              <span style={{ fontSize: '0.7rem', color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem' }}>
                                Sementara
                              </span>
                            )}
                          </div>
                          <button onClick={() => handleOpenEdit(dIdx, cls)} className="btn-icon-edit" style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}>
                            <Edit3 size={14} /> Edit
                          </button>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#60a5fa', marginTop: '0.25rem' }}>
                          ⏰ Jam: {cls.time} | 📍 Ruang: {cls.room}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                          👨‍🏫 {cls.lecturer}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Edit Jadwal Kuliah */}
      {editingClass && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="flex-between mb-4">
              <h3>Edit Jadwal Kuliah</h3>
              <button onClick={() => setEditingClass(null)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nama Matakuliah</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Jam Kuliah</label>
                <input 
                  type="text" 
                  placeholder="Contoh: 08:00 - 10:30"
                  value={formData.time} 
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Ruangan</label>
                <input 
                  type="text" 
                  placeholder="Contoh: SI 4201"
                  value={formData.room} 
                  onChange={e => setFormData({ ...formData, room: e.target.value })}
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nama Dosen</label>
                <input 
                  type="text" 
                  value={formData.lecturer} 
                  onChange={e => setFormData({ ...formData, lecturer: e.target.value })}
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
                  onClick={() => setEditingClass(null)} 
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
