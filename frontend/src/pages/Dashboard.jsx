import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { format, isPast } from 'date-fns';

const StatCard = ({ label, value, color, icon }) => (
  <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' }}>
    <div style={{
      width: 48, height: 48, borderRadius: 12,
      background: `${color}22`, display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 22, flexShrink: 0
    }}>{icon}</div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--mono)' }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </div>
  </div>
);

const STATUS_COLORS = { 'To Do': '#8888a8', 'In Progress': '#38bdf8', 'Done': '#22d3a0' };

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard')
      .then(res => setData(res.data))
      .catch(() => setError('Failed to load dashboard data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-loading">
      <div className="spinner"/><span>Loading dashboard...</span>
    </div>
  );

  if (error) return (
    <div style={{ padding: 40 }}>
      <div className="alert alert-error">{error}</div>
    </div>
  );

  const statusData = data ? Object.entries(data.byStatus).map(([name, value]) => ({ name, value })) : [];
  const perUserData = data?.tasksPerUser?.map(u => ({ name: u.name.split(' ')[0], tasks: u.count })) || [];

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>Overview of all your tasks across projects</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Tasks" value={data.totalTasks} color="#6c63ff" icon="✦" />
        <StatCard label="To Do" value={data.byStatus['To Do']} color="#8888a8" icon="○" />
        <StatCard label="In Progress" value={data.byStatus['In Progress']} color="#38bdf8" icon="◑" />
        <StatCard label="Done" value={data.byStatus['Done']} color="#22d3a0" icon="●" />
        <StatCard label="Overdue" value={data.overdueTasks} color="#ff5c7c" icon="⚠" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>
        {/* Status pie */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Tasks by Status</h3>
          {data.totalTasks === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="icon">📊</div>
              <p>No tasks yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#6c63ff'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                  itemStyle={{ color: 'var(--text)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
            {statusData.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s.name] }}/>
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>

        {/* Tasks per user */}
        <div className="card">
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Tasks per Team Member</h3>
          {perUserData.length === 0 ? (
            <div className="empty-state" style={{ padding: 30 }}>
              <div className="icon">👥</div>
              <p>No assignments yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={perUserData} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: '#8888a8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#8888a8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13 }}
                  itemStyle={{ color: 'var(--text)' }}
                  cursor={{ fill: 'var(--bg-hover)' }}
                />
                <Bar dataKey="tasks" fill="#6c63ff" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Overdue tasks */}
      {data.overdueTasksList?.length > 0 && (
        <div className="card" style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: 'var(--red)' }}>⚠ Overdue Tasks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.overdueTasksList.map(task => (
              <div key={task._id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: 'var(--red-soft)', borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(255,92,124,0.15)'
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{task.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {task.project?.name} {task.assignedTo && `• ${task.assignedTo.name}`}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'var(--mono)' }}>
                  Due {format(new Date(task.dueDate), 'MMM d')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent tasks */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Activity</h3>
          <Link to="/projects" className="btn btn-ghost btn-sm">View projects →</Link>
        </div>
        {data.recentTasks?.length === 0 ? (
          <div className="empty-state" style={{ padding: 30 }}>
            <div className="icon">📝</div>
            <p>No tasks yet. Create a project to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recentTasks.map(task => {
              const statusClass = task.status === 'Done' ? 'badge-done' : task.status === 'In Progress' ? 'badge-progress' : 'badge-todo';
              const prioClass = `badge-${task.priority.toLowerCase()}`;
              const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
              return (
                <div key={task._id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {task.project?.name} {task.assignedTo && `• ${task.assignedTo.name}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <span className={`badge ${prioClass}`}>{task.priority}</span>
                    <span className={`badge ${statusClass}`}>{task.status}</span>
                    {overdue && <span className="badge badge-overdue">Overdue</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
