import { useState, useEffect, useMemo } from 'react';
import { scheduleData as initialScheduleData } from '../data/schedule';
import { supabase } from '../supabaseClient';
import { 
  CheckCircle2, Clock, Calendar, PlusCircle, Edit3, Trash2, AlertTriangle, 
  Search, Filter, BookOpen, AlertCircle, CheckSquare, Square, ChevronRight,
  GraduationCap, CalendarCheck, MapPin, User, X, Cloud, RefreshCw, Check, Database
} from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { id } from 'date-fns/locale';

export default function CollegeSchedule() {
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'class_schedule'
  
  // Predefined College Subjects
  const defaultSubjects = [
    'Logika dan Struktur Diskrit (B)',
    'Design Thinking (B)',
    'Pengantar Ekonomi dan Bisnis (B)',
    'Infrastruktur TI (B)',
    'Organisasi dan Fungsional Bisnis (B)',
    'Matematika (2)',
    'Pengantar Teknologi Elektro dan Informatika Cerdas (P)'
  ];

  // Tasks State (Loaded directly from Supabase college_tasks table)
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('college_assignments_cache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [syncing, setSyncing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState('syncing'); // 'synced', 'syncing', 'offline'
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal State for Add/Edit Task
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [submittingTask, setSubmittingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    subject: defaultSubjects[0],
    customSubject: '',
    deadline: '',
    priority: 'medium',
    notes: ''
  });

  // Reference Class Schedule State
  const [dayIndex, setDayIndex] = useState(new Date().getDay());
  const [classSchedule] = useState(() => {
    const saved = localStorage.getItem('customCollegeSchedule');
    return saved ? JSON.parse(saved) : initialScheduleData;
  });

  // Fetch from Supabase and Subscribe to Realtime Updates
  useEffect(() => {
    fetchTasksFromCloud();

    // Supabase Realtime Listener
    const channel = supabase
      .channel('college_tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'college_tasks' }, () => {
        fetchTasksFromCloud();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasksFromCloud = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('college_tasks')
        .select('*')
        .order('deadline', { ascending: true, nullsFirst: false });

      if (error) throw error;

      if (data) {
        setTasks(data);
        localStorage.setItem('college_assignments_cache', JSON.stringify(data));
        setCloudStatus('synced');
        setLastSyncTime(new Date());
      }
    } catch (err) {
      console.warn("Error fetching from college_tasks table:", err.message);
      setCloudStatus('offline');
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(23, 59, 0, 0);
    
    setTaskForm({
      title: '',
      subject: defaultSubjects[0],
      customSubject: '',
      deadline: tomorrow.toISOString().slice(0, 16),
      priority: 'medium',
      notes: ''
    });
    setShowTaskModal(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    const isCustom = !defaultSubjects.includes(task.subject);
    const formattedDeadline = task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : '';
    
    setTaskForm({
      title: task.title,
      subject: isCustom ? 'custom' : task.subject,
      customSubject: isCustom ? task.subject : '',
      deadline: formattedDeadline,
      priority: task.priority || 'medium',
      notes: task.notes || ''
    });
    setShowTaskModal(true);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    setSubmittingTask(true);
    const finalSubject = taskForm.subject === 'custom' ? (taskForm.customSubject.trim() || 'Lainnya') : taskForm.subject;
    const isoDeadline = taskForm.deadline ? new Date(taskForm.deadline).toISOString() : null;

    try {
      if (editingTask) {
        // UPDATE task in Supabase
        const { error } = await supabase
          .from('college_tasks')
          .update({
            title: taskForm.title.trim(),
            subject: finalSubject,
            deadline: isoDeadline,
            priority: taskForm.priority,
            notes: taskForm.notes.trim()
          })
          .eq('id', editingTask.id);

        if (error) throw error;

        setTasks(prev => prev.map(t => t.id === editingTask.id ? {
          ...t,
          title: taskForm.title.trim(),
          subject: finalSubject,
          deadline: isoDeadline,
          priority: taskForm.priority,
          notes: taskForm.notes.trim()
        } : t));
      } else {
        // INSERT new task in Supabase
        const { data, error } = await supabase
          .from('college_tasks')
          .insert([{
            title: taskForm.title.trim(),
            subject: finalSubject,
            deadline: isoDeadline,
            priority: taskForm.priority,
            completed: false,
            notes: taskForm.notes.trim()
          }])
          .select();

        if (error) throw error;
        if (data?.[0]) {
          setTasks(prev => [data[0], ...prev]);
        }
      }

      setShowTaskModal(false);
      setCloudStatus('synced');
    } catch (err) {
      console.error("Error saving task to Supabase:", err);
      alert("Gagal menyimpan ke database Supabase: " + err.message);
    } finally {
      setSubmittingTask(false);
    }
  };

  const handleToggleTask = async (taskId) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    const newCompleted = !targetTask.completed;

    // Optimistic UI Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: newCompleted } : t));

    // Update in Supabase
    try {
      const { error } = await supabase
        .from('college_tasks')
        .update({ completed: newCompleted })
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      console.error("Could not update task in Supabase:", err);
      // Revert if error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !newCompleted } : t));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus tugas ini? Data akan terhapus dari Supabase.")) return;

    // Optimistic UI Update
    const prevTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== taskId));

    // Delete in Supabase
    try {
      const { error } = await supabase
        .from('college_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (err) {
      console.error("Could not delete from Supabase:", err);
      alert("Gagal menghapus dari database: " + err.message);
      setTasks(prevTasks);
    }
  };

  // Filtered and Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchStatus = statusFilter === 'all' ? true : statusFilter === 'completed' ? t.completed : !t.completed;
      const matchSubject = subjectFilter === 'all' ? true : t.subject === subjectFilter;
      const matchSearch = t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchStatus && matchSubject && matchSearch;
    }).sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline) - new Date(b.deadline);
    });
  }, [tasks, statusFilter, subjectFilter, searchTerm]);

  // Statistics
  const totalTasks = tasks.length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;

  const getDeadlineBadge = (deadlineStr, isCompleted) => {
    if (isCompleted) {
      return <span className="badge success">✅ Selesai</span>;
    }
    if (!deadlineStr) return null;

    const d = new Date(deadlineStr);
    const now = new Date();

    if (isPast(d) && !isToday(d)) {
      return <span className="badge danger" style={{ animation: 'pulse 1.5s infinite' }}>⚠️ Terlewat Deadline!</span>;
    }
    if (isToday(d)) {
      return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid #f59e0b' }}>🔥 Deadline Hari Ini!</span>;
    }

    const daysLeft = differenceInDays(d, now);
    if (daysLeft <= 2) {
      return <span className="badge" style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308' }}>⏳ Sisa {daysLeft + 1} hari lagi</span>;
    }
    return <span className="badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>📅 {daysLeft} hari lagi</span>;
  };

  const getPriorityBadge = (priority) => {
    if (priority === 'high') {
      return <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔴 Prioritas Tinggi</span>;
    }
    if (priority === 'medium') {
      return <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>🟡 Prioritas Sedang</span>;
    }
    return <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-color)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>🟢 Prioritas Rendah</span>;
  };

  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const todayClasses = classSchedule[dayIndex]?.classes || [];

  return (
    <div className="college-tasks-page">
      {/* Page Header */}
      <div className="flex-between mb-4" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database size={26} color="#60a5fa" />
            Jadwal Tugas Kuliah
          </h1>
          <p>Terhubung langsung ke Cloud Database Supabase (Tersinkron di Laptop, HP, & Tablet)</p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Cloud Database Status */}
          <button 
            onClick={fetchTasksFromCloud}
            disabled={syncing}
            className="toggle-btn"
            title="Klik untuk menyinkronkan data langsung dari tabel college_tasks Supabase"
            style={{ 
              backgroundColor: cloudStatus === 'synced' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
              color: cloudStatus === 'synced' ? 'var(--success-color)' : '#f59e0b',
              border: `1px solid ${cloudStatus === 'synced' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}
          >
            {syncing ? <RefreshCw size={14} className="spin" /> : <Database size={14} />}
            <span>{syncing ? 'Menyinkronkan...' : '☁️ Database Aktif'}</span>
          </button>

          <button 
            onClick={handleOpenAddModal}
            className="toggle-btn"
            style={{ backgroundColor: 'var(--accent-color)', color: 'white', fontWeight: 'bold' }}
          >
            <PlusCircle size={16} /> Tambah Tugas Baru
          </button>
        </div>
      </div>

      {/* Primary Sub-Tabs: Tugas Kuliah vs Jadwal Kelas */}
      <div className="view-toggle-buttons mb-4">
        <button 
          className={`toggle-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <CheckSquare size={16} /> Daftar Tugas ({pendingTasks} Menunggu)
        </button>
        <button 
          className={`toggle-btn ${activeTab === 'class_schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('class_schedule')}
        >
          <GraduationCap size={16} /> Referensi Jadwal Kelas Kuliah
        </button>
      </div>

      {activeTab === 'tasks' ? (
        <div className="tasks-container">
          {/* Statistics Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div className="card" style={{ padding: '0.85rem 1rem', textAlign: 'center', backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)' }}>
              <small style={{ color: 'var(--text-secondary)', display: 'block' }}>Total Tugas di Database</small>
              <strong style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>{totalTasks}</strong>
            </div>
            <div className="card" style={{ padding: '0.85rem 1rem', textAlign: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <small style={{ color: '#f59e0b', display: 'block' }}>Belum Selesai</small>
              <strong style={{ fontSize: '1.6rem', color: '#f59e0b' }}>{pendingTasks}</strong>
            </div>
            <div className="card" style={{ padding: '0.85rem 1rem', textAlign: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <small style={{ color: 'var(--success-color)', display: 'block' }}>Sudah Selesai</small>
              <strong style={{ fontSize: '1.6rem', color: 'var(--success-color)' }}>{completedTasks}</strong>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="card mb-4" style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', alignItems: 'center' }}>
              {/* Status Filter */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Status Tugas:</label>
                <select 
                  value={statusFilter} 
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">⏳ Belum Selesai ({pendingTasks})</option>
                  <option value="completed">✅ Sudah Selesai ({completedTasks})</option>
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Mata Kuliah:</label>
                <select 
                  value={subjectFilter} 
                  onChange={e => setSubjectFilter(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--surface-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                >
                  <option value="all">Semua Mata Kuliah</option>
                  {defaultSubjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Cari Tugas:</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text"
                    placeholder="Ketik judul tugas..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ width: '100%', paddingLeft: '2.2rem', fontSize: '0.85rem', padding: '0.5rem 0.75rem 0.5rem 2.2rem' }}
                  />
                  <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Task Cards List */}
          {filteredTasks.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <BookOpen size={48} color="var(--accent-color)" style={{ margin: '0 auto', marginBottom: '1rem' }} />
              <h2>Tidak Ada Tugas di Database</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                {searchTerm || statusFilter !== 'all' || subjectFilter !== 'all'
                  ? 'Tidak ada tugas yang cocok dengan filter pencarian Anda.'
                  : 'Belum ada tugas di database Supabase atau semua tugas sudah terselesaikan!'}
              </p>
              <button onClick={handleOpenAddModal} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <PlusCircle size={16} /> Tambahkan Tugas Pertama ke Database
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTasks.map((task) => {
                const deadlineDate = task.deadline ? new Date(task.deadline) : null;
                return (
                  <div 
                    key={task.id} 
                    className="card"
                    style={{
                      borderLeft: task.completed ? '4px solid var(--success-color)' : task.priority === 'high' ? '4px solid var(--danger-color)' : '4px solid var(--accent-color)',
                      opacity: task.completed ? 0.75 : 1,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div className="flex-between mb-2" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flex: 1 }}>
                        {/* Completion Checkbox */}
                        <button 
                          onClick={() => handleToggleTask(task.id)}
                          style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: task.completed ? 'var(--success-color)' : 'var(--text-secondary)', marginTop: '2px' }}
                          title={task.completed ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                        >
                          {task.completed ? <CheckSquare size={22} color="var(--success-color)" /> : <Square size={22} />}
                        </button>

                        <div>
                          <h3 style={{ 
                            fontSize: '1.2rem', 
                            color: 'var(--text-primary)', 
                            margin: 0,
                            textDecoration: task.completed ? 'line-through' : 'none' 
                          }}>
                            {task.title}
                          </h3>
                          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.35rem' }}>
                            <span className="badge" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)', color: '#60a5fa' }}>
                              🎓 {task.subject}
                            </span>
                            {getPriorityBadge(task.priority)}
                            {getDeadlineBadge(task.deadline, task.completed)}
                          </div>
                        </div>
                      </div>

                      {/* Edit and Delete Actions */}
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button 
                          onClick={() => handleOpenEditModal(task)} 
                          className="btn-icon-edit"
                          title="Edit Tugas"
                        >
                          <Edit3 size={15} /> Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)} 
                          className="nav-logout-btn"
                          title="Hapus Tugas dari Supabase"
                        >
                          <Trash2 size={15} color="var(--danger-color)" />
                        </button>
                      </div>
                    </div>

                    {/* Deadline Details & Notes */}
                    {deadlineDate && (
                      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                          <Clock size={14} />
                          <span>Deadline: <strong>{format(deadlineDate, 'EEEE, d MMMM yyyy - HH:mm', { locale: id })} WIB</strong></span>
                        </div>
                      </div>
                    )}

                    {task.notes && (
                      <div style={{ marginTop: '0.5rem', backgroundColor: 'var(--bg-color)', padding: '0.6rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        📝 <strong>Catatan / Instruksi:</strong> {task.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* REFERENCE COLLEGE CLASS SCHEDULE */
        <div className="class-schedule-reference">
          <div className="card mb-4" style={{ border: '1px solid var(--border-color)' }}>
            <div className="flex-between mb-3" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2>Jadwal Jam & Ruang Kuliah</h2>
              <div className="view-toggle-buttons">
                {dayNames.map((dName, idx) => (
                  <button 
                    key={idx}
                    className={`toggle-btn ${dayIndex === idx ? 'active' : ''}`}
                    onClick={() => setDayIndex(idx)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  >
                    {dName}
                  </button>
                ))}
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Informasi mata kuliah, ruangan, jam, dan dosen pengampu untuk hari <strong>{dayNames[dayIndex]}</strong>:
            </p>

            {todayClasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-secondary)' }}>
                <CheckCircle2 size={36} color="var(--success-color)" style={{ margin: '0 auto', marginBottom: '0.5rem' }} />
                <p>Tidak ada jadwal kelas kuliah pada hari {dayNames[dayIndex]}.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {todayClasses.map((cls, i) => (
                  <div key={i} style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                    <div className="flex-between mb-1">
                      <strong style={{ fontSize: '1.1rem', color: '#60a5fa' }}>{cls.name}</strong>
                      <span className="badge">{cls.code || 'Mata Kuliah'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                      <div>🕒 Waktu: <strong>{cls.time}</strong></div>
                      <div>📍 Ruang: <strong>{cls.room}</strong></div>
                      <div>👨‍🏫 Dosen: <strong>{cls.lecturer}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Add / Edit Task */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="flex-between mb-4">
              <h3>{editingTask ? 'Edit Tugas di Database' : 'Tambah Tugas Baru ke Database'}</h3>
              <button onClick={() => setShowTaskModal(false)} className="btn-close">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Judul Tugas:
                </label>
                <input 
                  type="text" 
                  placeholder="Contoh: Tugas Makalah Bab 3 atau Laporan Praktikum"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Mata Kuliah:
                </label>
                <select 
                  value={taskForm.subject}
                  onChange={e => setTaskForm({ ...taskForm, subject: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                >
                  {defaultSubjects.map((s, idx) => (
                    <option key={idx} value={s}>{s}</option>
                  ))}
                  <option value="custom">-- Mata Kuliah Lainnya (Tulis Sendiri) --</option>
                </select>
              </div>

              {taskForm.subject === 'custom' && (
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Nama Mata Kuliah Baru:
                  </label>
                  <input 
                    type="text" 
                    placeholder="Masukkan nama mata kuliah..."
                    value={taskForm.customSubject}
                    onChange={e => setTaskForm({ ...taskForm, customSubject: e.target.value })}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Tenggat Waktu (Deadline):
                  </label>
                  <input 
                    type="datetime-local" 
                    value={taskForm.deadline}
                    onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })}
                    required
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                    Tingkat Prioritas:
                  </label>
                  <select 
                    value={taskForm.priority}
                    onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                  >
                    <option value="high">🔴 Prioritas Tinggi (Mendesak)</option>
                    <option value="medium">🟡 Prioritas Sedang</option>
                    <option value="low">🟢 Prioritas Rendah</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>
                  Catatan / Detail Instruksi Tugas (Opsional):
                </label>
                <textarea 
                  rows={3}
                  placeholder="Ketik instruksi pengerjaan, format pengumpulan, atau link terkait..."
                  value={taskForm.notes}
                  onChange={e => setTaskForm({ ...taskForm, notes: e.target.value })}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.875rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" disabled={submittingTask} style={{ flex: 1, backgroundColor: 'var(--accent-color)', fontWeight: 'bold' }}>
                  {submittingTask ? 'Menyimpan ke Supabase...' : (editingTask ? 'Simpan Perubahan' : 'Tambahkan Tugas ke Database')}
                </button>
                <button type="button" onClick={() => setShowTaskModal(false)} style={{ backgroundColor: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
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
