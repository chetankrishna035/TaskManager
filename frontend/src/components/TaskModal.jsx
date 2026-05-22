import { useState } from 'react';
import api from '../utils/api';

export default function TaskModal({ projectId, members, task, isAdmin, onClose, onSaved }) {
  const isEdit = !!task;
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'To Do',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    assignedTo: task?.assignedTo?._id || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let res;
      if (isEdit) {
        const payload = isAdmin
          ? { ...form, assignedTo: form.assignedTo || null }
          : { status: form.status };
        res = await api.put(`/tasks/${task._id}`, payload);
      } else {
        res = await api.post('/tasks', {
          ...form,
          projectId,
          assignedTo: form.assignedTo || undefined,
          dueDate: form.dueDate || undefined
        });
      }
      onSaved(res.data.task, isEdit);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Task' : 'New Task'}</span>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(isAdmin || !isEdit) && (
            <>
              <div className="form-group">
                <label>Title *</label>
                <input
                  type="text" placeholder="Task title"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required minLength={2} autoFocus={!isEdit}
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Task details..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} style={{ resize: 'vertical' }}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date" value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Assign To</label>
                <select value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                  <option value="">— Unassigned —</option>
                  {members.map(m => (
                    <option key={m.user._id} value={m.user._id}>{m.user.name} ({m.role})</option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option>To Do</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
