import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { scheduleData } from '../data/schedule';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { Dumbbell, GraduationCap, BookOpen, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

export default function History() {
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [collegeLogs, setCollegeLogs] = useState([]);
  const [studyLogs, setStudyLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('week'); // week, month, year
  const [activeTab, setActiveTab] = useState('workout'); // 'workout', 'college', 'study'

  useEffect(() => {
    fetchHistory();
  }, [filter]);

  const fetchHistory = async () => {
    setLoading(true);
    let start, end = new Date();

    if (filter === 'week') {
      start = startOfWeek(end, { weekStartsOn: 1 });
    } else if (filter === 'month') {
      start = startOfMonth(end);
    } else {
      start = startOfYear(end);
    }

    try {
      // 1. Fetch Workout Logs
      const { data: wData } = await supabase
        .from('workouts')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      setWorkoutLogs(wData || []);

      // 2. Fetch College Attendance Logs from separate table
      const { data: cData } = await supabase
        .from('college_attendance')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      setCollegeLogs(cData || []);

      // 3. Fetch Study Logs from separate table
      const { data: sData } = await supabase
        .from('study_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      setStudyLogs(sData || []);

    } catch (error) {
      console.error('Error fetching history:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Workout Data Processing
  const workoutData = useMemo(() => {
    const validLogs = workoutLogs.filter(l => l.type === 'reps' || l.type === 'duration');
    if (!validLogs.length) return { chartData: [], stats: [], missedCount: 0 };

    const dailyStats = {};
    let totalMissed = 0;
    const exerciseTotals = {};

    validLogs.forEach(log => {
      const dateStr = format(parseISO(log.created_at), 'yyyy-MM-dd');
      
      if (!dailyStats[dateStr]) dailyStats[dateStr] = {};
      if (!dailyStats[dateStr][log.exercise_name]) dailyStats[dateStr][log.exercise_name] = 0;
      
      dailyStats[dateStr][log.exercise_name] += log.amount;

      if (!exerciseTotals[log.exercise_name]) exerciseTotals[log.exercise_name] = { sum: 0, unit: log.type === 'reps' ? 'Repetisi' : 'Menit' };
      exerciseTotals[log.exercise_name].sum += log.amount;
    });

    const chartData = Object.keys(dailyStats).map(date => {
      const dayData = { date: format(parseISO(date), 'dd MMM', { locale: id }) };
      const dateObj = parseISO(date);
      const dayIndex = dateObj.getDay();
      const schedule = scheduleData[dayIndex];
      
      if (schedule && schedule.exercises) {
        schedule.exercises.forEach(ex => {
          const totalDone = dailyStats[date][ex.name] || 0;
          dayData[ex.name] = totalDone;
          
          const target = ex.type === 'reps' ? ex.minReps : ex.minDuration;
          if (totalDone < target) {
            totalMissed++;
          }
        });
      }

      return dayData;
    });

    const stats = Object.keys(exerciseTotals).map(name => ({
      name,
      sum: exerciseTotals[name].sum,
      unit: exerciseTotals[name].unit
    }));

    return { chartData, stats, missedCount: totalMissed };
  }, [workoutLogs]);

  // College Attendance Data Processing (Hadir, Izin, Absen)
  const collegeData = useMemo(() => {
    let totalHadir = 0;
    let totalIzin = 0;
    let totalAbsen = 0;

    const classStats = {}; // { [subject_name]: { hadir: 0, izin: 0, absen: 0 } }

    collegeLogs.forEach(log => {
      const subject = log.subject_name;
      if (!classStats[subject]) {
        classStats[subject] = { hadir: 0, izin: 0, absen: 0 };
      }

      if (log.status === 'hadir') {
        totalHadir++;
        classStats[subject].hadir++;
      } else if (log.status === 'izin') {
        totalIzin++;
        classStats[subject].izin++;
      } else if (log.status === 'absen') {
        totalAbsen++;
        classStats[subject].absen++;
      }
    });

    return {
      totalHadir,
      totalIzin,
      totalAbsen,
      logs: collegeLogs,
      classStats
    };
  }, [collegeLogs]);

  // Study Data Processing
  const studyData = useMemo(() => {
    return {
      totalLogs: studyLogs.length,
      logs: studyLogs
    };
  }, [studyLogs]);

  return (
    <div className="history-page">
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Riwayat & Progres</h1>
          <p>Pantau catatan aktivitas Anda berdasarkan kategori</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            <option value="week">Minggu Ini</option>
            <option value="month">Bulan Ini</option>
            <option value="year">Tahun Ini</option>
          </select>
        </div>
      </div>

      {/* Categories Sub-Tabs */}
      <div className="view-toggle-buttons mb-4" style={{ justifyContent: 'flex-start' }}>
        <button 
          className={`toggle-btn ${activeTab === 'workout' ? 'active' : ''}`}
          onClick={() => setActiveTab('workout')}
        >
          <Dumbbell size={16} /> Riwayat Gym
        </button>
        <button 
          className={`toggle-btn ${activeTab === 'college' ? 'active' : ''}`}
          onClick={() => setActiveTab('college')}
        >
          <GraduationCap size={16} /> Presensi Kuliah
        </button>
        <button 
          className={`toggle-btn ${activeTab === 'study' ? 'active' : ''}`}
          onClick={() => setActiveTab('study')}
        >
          <BookOpen size={16} /> Riwayat Belajar
        </button>
      </div>

      {loading ? (
        <p>Memuat data riwayat...</p>
      ) : activeTab === 'workout' ? (
        /* WORKOUT HISTORY TAB */
        workoutData.stats.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Belum ada data olahraga untuk periode ini.</p>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card" style={{ border: '1px solid var(--danger-color)' }}>
                <div className="stat-label">Target Tidak Terpenuhi</div>
                <div className="stat-value" style={{ color: 'var(--danger-color)' }}>{workoutData.missedCount}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>kali dalam periode ini</div>
              </div>
              
              {workoutData.stats.map(stat => (
                <div className="stat-card" key={stat.name}>
                  <div className="stat-label">Total {stat.name}</div>
                  <div className="stat-value">{stat.sum}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{stat.unit}</div>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>Grafik Progres Olahraga</h2>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workoutData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {Array.from(new Set(workoutData.stats.map(s => s.name))).map((name, index) => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                      return <Bar key={name} dataKey={name} stackId="a" fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )
      ) : activeTab === 'college' ? (
        /* COLLEGE HISTORY TAB */
        <div className="college-history-section">
          {/* Top 3 Summary Cards */}
          <div className="stats-grid mb-4">
            <div className="stat-card" style={{ border: '1px solid var(--success-color)' }}>
              <div className="stat-label">Total Hadir</div>
              <div className="stat-value" style={{ color: 'var(--success-color)' }}>{collegeData.totalHadir}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>sesi perkuliahan</div>
            </div>

            <div className="stat-card" style={{ border: '1px solid #f59e0b' }}>
              <div className="stat-label">Total Izin</div>
              <div className="stat-value" style={{ color: '#f59e0b' }}>{collegeData.totalIzin}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>sesi berketerangan</div>
            </div>

            <div className="stat-card" style={{ border: '1px solid var(--danger-color)' }}>
              <div className="stat-label">Total Absen / Alpa</div>
              <div className="stat-value" style={{ color: 'var(--danger-color)' }}>{collegeData.totalAbsen}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>sesi tidak hadir</div>
            </div>
          </div>

          {/* Breakdown Per Matakuliah */}
          <div className="card mb-4">
            <h2>Rincian Kehadiran Per Matakuliah</h2>
            {Object.keys(collegeData.classStats).length === 0 ? (
              <p style={{ fontStyle: 'italic', marginTop: '0.5rem' }}>Belum ada data presensi yang dicatat pada periode ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                {Object.keys(collegeData.classStats).map(className => {
                  const stat = collegeData.classStats[className];
                  return (
                    <div key={className} style={{ padding: '0.85rem 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                      <div className="flex-between mb-2">
                        <strong style={{ color: 'var(--text-primary)', fontSize: '1.05rem' }}>{className}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem' }}>
                        <span style={{ color: 'var(--success-color)' }}>🟢 Hadir: <strong>{stat.hadir}</strong></span>
                        <span style={{ color: '#f59e0b' }}>🟡 Izin: <strong>{stat.izin}</strong></span>
                        <span style={{ color: 'var(--danger-color)' }}>🔴 Absen: <strong>{stat.absen}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Logs Table */}
          <div className="card">
            <h2>Riwayat Presensi Harian</h2>
            {collegeData.logs.length === 0 ? (
              <p style={{ fontStyle: 'italic', marginTop: '1rem' }}>Belum ada presensi kuliah yang dicatat untuk periode ini.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                {collegeData.logs.map((item, idx) => {
                  let statusBadge = <span className="badge success">🟢 Hadir</span>;
                  if (item.status === 'izin') statusBadge = <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}>🟡 Izin</span>;
                  if (item.status === 'absen') statusBadge = <span className="badge danger">🔴 Absen</span>;

                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-color)', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {statusBadge}
                        <strong style={{ color: 'var(--text-primary)' }}>{item.subject_name}</strong>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Clock size={14} /> {format(parseISO(item.created_at), 'EEEE, d MMM yyyy - HH:mm', { locale: id })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STUDY HISTORY TAB */
        <div className="study-history-section">
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <BookOpen size={48} color="var(--purple-accent)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
            <h2>Riwayat Belajar Mandiri</h2>
            {studyData.totalLogs === 0 ? (
              <p>Belum ada riwayat belajar yang dicatat. Tabel `study_logs` sudah siap digunakan begitu Anda menambahkan fitur belajar.</p>
            ) : (
              <p>Total sesi belajar: {studyData.totalLogs}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
