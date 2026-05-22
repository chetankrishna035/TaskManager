import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import TaskModal from '../components/TaskModal';

function AddMemberModal({ projectId, onClose, onAdded }) {
  const [form, setForm] = useState({ email: '', role: 'Member' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post(`/api/projects/${projectId}/members`, form);
      onAdded(res.data.project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <span className="modal-title">Add Member</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email" placeholder="member@example.com"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required autoFocus
            />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const statusClass = { 'To Do': 'badge-todo', 'In Progress': 'badge-progress', 'Done': 'badge-done' };
const prioClass = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('tasks');
  const [filter, setFilter] = useState({ status: '', priority: '', assignedTo: '' });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);

  const isAdmin = project?.members?.some(m => m.user._id === user._id && m.role === 'Admin');

  useEffect(() => {
    Promise.all([
      api.get(`/api/projects/${id}`),
      api.get(`/api/tasks?projectId=${id}`)
    ]).then(([pRes, tRes]) => {
      setProject(pRes.data.project);
      setTasks(tRes.data.tasks);
    }).catch(err => {
      setError(err.response?.data?.message || 'Failed to load project.');
    }).finally(() => setLoading(false));
  }, [id]);

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the project?')) return;
    try {
      const res = await api.delete(`/api/projects/${id}/members/${userId}`);
      setProject(res.data.project);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/api/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete task.');
    }
  };

  const handleDeleteProject = async () => {
    if (!confirm(`Delete project "${project.name}" and all its tasks?`)) return;
    try {
      await api.delete(`/api/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project.');
    }
  };

  const handleTaskSaved = (task, isEdit) => {
    if (isEdit) {
      setTasks(prev => prev.map(t => t._id === task._id ? task : t));
    } else {
      setTasks(prev => [task, ...prev]);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.priority && t.priority !== filter.priority) return false;
    if (filter.assignedTo && t.assignedTo?._id !== filter.assignedTo) return false;
    return true;
  });

  if (loading) return <div className="page-loading"><div className="spinner"/><span>Loading project...</span></div>;
  if (error) return <div style={{ padding: 40 }}><div className="alert alert-error">{error}</div></div>;

  const tasksByStatus = (status) => filteredTasks.filter(t => t.status === status);

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: 'var(--accent-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, fontWeight: 700, color: 'var(--accent)'
              }}>{project.name.charAt(0)}</div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.3px' }}>{project.name}</h1>
                {project.description && (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>{project.description}</p>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {isAdmin && (
              <>
                <button className="btn btn-primary btn-sm" onClick={() => setShowTaskModal(true)}>+ Task</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddMember(true)}>+ Member</button>
                <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>Delete</button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginTop: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          {['tasks', 'members'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 500, fontFamily: 'var(--font)',
              color: activeTab === tab ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.2s', textTransform: 'capitalize'
            }}>{tab} {tab === 'tasks' ? `(${tasks.length})` : `(${project.members.length})`}</button>
          ))}
        </div>
      </div>

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
            <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
              style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}>
              <option value="">All Statuses</option>
              <option>To Do</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
            <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
              style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}>
              <option value="">All Priorities</option>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
            <select value={filter.assignedTo} onChange={e => setFilter(f => ({ ...f, assignedTo: e.target.value }))}
              style={{ width: 'auto', padding: '7px 12px', fontSize: 13 }}>
              <option value="">All Members</option>
              {project.members.map(m => (
                <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
              ))}
            </select>
            {(filter.status || filter.priority || filter.assignedTo) && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilter({ status: '', priority: '', assignedTo: '' })}>
                Clear filters
              </button>
            )}
          </div>

          {/* Kanban columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {['To Do', 'In Progress', 'Done'].map(status => {
              const cols = tasksByStatus(status);
              const headerColor = status === 'Done' ? 'var(--green)' : status === 'In Progress' ? 'var(--blue)' : 'var(--text-muted)';
              return (
                <div key={status}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: headerColor }}>{status}</span>
                    <span style={{
                      background: 'var(--bg-hover)', color: 'var(--text-muted)',
                      fontSize: 11, padding: '2px 8px', borderRadius: 100, fontFamily: 'var(--mono)'
                    }}>{cols.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 80 }}>
                    {cols.length === 0 ? (
                      <div style={{
                        border: '1px dashed var(--border)', borderRadius: 'var(--radius-sm)',
                        padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13
                      }}>No tasks</div>
                    ) : cols.map(task => {
                      const overdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done';
                      const canEdit = isAdmin || (task.assignedTo?._id === user._id);
                      return (
                        <div key={task._id} className="card" style={{ padding: 14, position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.4 }}>{task.title}</div>
                              {task.description && (
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4,
                                  overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                  {task.description}
                                </div>
                              )}
                            </div>
                            {canEdit && (
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditingTask(task); setShowTaskModal(true); }}
                                  title="Edit" style={{ padding: 4, fontSize: 13 }}>✎</button>
                                {isAdmin && (
                                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteTask(task._id)}
                                    title="Delete" style={{ padding: 4, fontSize: 13, color: 'var(--red)' }}>✕</button>
                                )}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                            <span className={`badge ${prioClass[task.priority]}`}>{task.priority}</span>
                            {overdue && <span className="badge badge-overdue">Overdue</span>}
                          </div>
                          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {task.assignedTo ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{
                                  width: 22, height: 22, borderRadius: '50%',
                                  background: `hsl(${(task.assignedTo.name.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 10, fontWeight: 600, color: 'white'
                                }}>{task.assignedTo.name.charAt(0)}</div>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.assignedTo.name.split(' ')[0]}</span>
                              </div>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Unassigned</span>
                            )}
                            {task.dueDate && (
                              <span style={{ fontSize: 11, color: overdue ? 'var(--red)' : 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                                {format(new Date(task.dueDate), 'MMM d')}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {project.members.map(m => (
            <div key={m.user._id} className="card" style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px'
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `hsl(${(m.user.name.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 600, color: 'white'
              }}>{m.user.name.charAt(0)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>
                  {m.user.name}
                  {m.user._id === user._id && <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 6 }}>(you)</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>{m.user.email}</div>
              </div>
              <span className={`badge badge-${m.role.toLowerCase()}`}>{m.role}</span>
              {isAdmin && m.user._id !== user._id && (
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemoveMember(m.user._id)}
                >Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showTaskModal && (
        <TaskModal
          projectId={id}
          members={project.members}
          task={editingTask}
          isAdmin={isAdmin}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={handleTaskSaved}
        />
      )}
      {showAddMember && (
        <AddMemberModal
          projectId={id}
          onClose={() => setShowAddMember(false)}
          onAdded={p => setProject(p)}
        />
      )}
    </div>
  );
}
