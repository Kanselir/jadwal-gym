import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { scheduleData } from '../data/schedule';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

export default function History() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('week'); // week, month, year

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
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching history:', error.message);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts and stats
  const processedData = useMemo(() => {
    if (!logs.length) return { chartData: [], stats: [], missedCount: 0 };

    // Group by Date -> Exercise -> sum
    const dailyStats = {};
    let totalMissed = 0;
    
    // For aggregating totals per exercise (for stats cards)
    const exerciseTotals = {};

    logs.forEach(log => {
      const dateStr = format(parseISO(log.created_at), 'yyyy-MM-dd');
      
      if (!dailyStats[dateStr]) dailyStats[dateStr] = {};
      if (!dailyStats[dateStr][log.exercise_name]) dailyStats[dateStr][log.exercise_name] = 0;
      
      dailyStats[dateStr][log.exercise_name] += log.amount;

      if (!exerciseTotals[log.exercise_name]) exerciseTotals[log.exercise_name] = { sum: 0, unit: log.type === 'reps' ? 'Repetisi' : 'Menit' };
      exerciseTotals[log.exercise_name].sum += log.amount;
    });

    // Create chart data and calculate missed targets
    const chartData = Object.keys(dailyStats).map(date => {
      const dayData = { date: format(parseISO(date), 'dd MMM', { locale: id }) };
      
      // Calculate if missed target for this day
      // We need to know what day of week it was to know the target, but we can also just find the exercise in scheduleData
      const dateObj = parseISO(date);
      const dayIndex = dateObj.getDay();
      const schedule = scheduleData[dayIndex];
      
      if (schedule && schedule.exercises) {
        schedule.exercises.forEach(ex => {
          const totalDone = dailyStats[date][ex.name] || 0;
          dayData[ex.name] = totalDone; // for chart
          
          const target = ex.type === 'reps' ? ex.minReps : ex.minDuration;
          // If total done is less than target, and it's an exercise they were supposed to do
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
  }, [logs]);

  return (
    <div className="history">
      <div className="flex-between mb-4">
        <h1>Riwayat & Progres</h1>
        <div>
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

      {loading ? (
        <p>Memuat riwayat...</p>
      ) : processedData.stats.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Belum ada data olahraga untuk periode ini.</p>
        </div>
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card" style={{ border: '1px solid var(--danger-color)' }}>
              <div className="stat-label">Target Tidak Terpenuhi</div>
              <div className="stat-value" style={{ color: 'var(--danger-color)' }}>{processedData.missedCount}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>kali dalam periode ini</div>
            </div>
            
            {processedData.stats.map(stat => (
              <div className="stat-card" key={stat.name}>
                <div className="stat-label">Total {stat.name}</div>
                <div className="stat-value">{stat.sum}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{stat.unit}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>Grafik Progres Harian</h2>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={processedData.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  {/* Dynamically create bars based on available exercises in data */}
                  {Array.from(new Set(processedData.stats.map(s => s.name))).map((name, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
                    return <Bar key={name} dataKey={name} stackId="a" fill={colors[index % colors.length]} radius={[4, 4, 0, 0]} />
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
