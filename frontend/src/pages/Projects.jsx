import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/api/projects', form);
      onCreated(res.data.project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">New Project</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text" placeholder="e.g. Website Redesign"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required minLength={2} autoFocus
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              placeholder="What is this project about?"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} style={{ resize: 'vertical' }}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    api.get('/api/projects')
      .then(res => setProjects(res.data.projects))
      .finally(() => setLoading(false));
  }, []);

  const getUserRole = (project) => {
    const member = project.members.find(m => m.user._id === user._id);
    return member?.role || 'Member';
  };

  if (loading) return <div className="page-loading"><div className="spinner"/><span>Loading projects...</span></div>;

  return (
    <div style={{ padding: '32px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>Projects</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state card" style={{ padding: 60 }}>
          <div className="icon">📁</div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>No projects yet</h3>
          <p>Create your first project to start managing tasks with your team.</p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map(project => {
            const role = getUserRole(project);
            return (
              <Link
                key={project._id}
                to={`/projects/${project._id}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="card" style={{
                  cursor: 'pointer', transition: 'all 0.2s',
                  ':hover': { borderColor: 'var(--accent)' }
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, background: 'var(--accent-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, flexShrink: 0
                    }}>
                      {project.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`badge badge-${role.toLowerCase()}`}>{role}</span>
                  </div>
                  <h3 style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>{project.name}</h3>
                  {project.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {project.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
                    <div style={{ display: 'flex', gap: -6 }}>
                      {project.members.slice(0, 4).map((m, i) => (
                        <div key={m.user._id} title={m.user.name} style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: `hsl(${(m.user.name.charCodeAt(0) * 37) % 360}, 60%, 50%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 600, color: 'white',
                          border: '2px solid var(--bg-card)', marginLeft: i > 0 ? -8 : 0
                        }}>
                          {m.user.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {project.members.length > 4 && (
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: 'var(--text-muted)', border: '2px solid var(--bg-card)', marginLeft: -8
                        }}>+{project.members.length - 4}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                      {format(new Date(project.createdAt), 'MMM d, yyyy')}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={p => setProjects(prev => [p, ...prev])}
        />
      )}
    </div>
  );
}
