const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// GET /api/tasks?projectId=xxx - Get tasks for a project
router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ message: 'projectId query param is required.' });

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ tasks });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tasks.', error: err.message });
  }
});

// POST /api/tasks - Create a task (Admin only)
router.post('/', auth, [
  body('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('dueDate').optional().isISO8601().withMessage('Invalid date format'),
  body('assignedTo').optional().isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, description, projectId, priority, dueDate, assignedTo } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can create tasks.' });
    }

    // Validate assignedTo is a project member
    if (assignedTo && !project.isMember(assignedTo)) {
      return res.status(400).json({ message: 'Assigned user must be a project member.' });
    }

    const task = new Task({
      title,
      description,
      project: projectId,
      priority: priority || 'Medium',
      dueDate: dueDate || null,
      assignedTo: assignedTo || null,
      createdBy: req.user._id
    });

    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    res.status(201).json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Error creating task.', error: err.message });
  }
});

// GET /api/tasks/:id - Get a single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name members');

    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = await Project.findById(task.project._id);
    if (!project.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching task.', error: err.message });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', auth, [
  body('title').optional().trim().isLength({ min: 2 }),
  body('status').optional().isIn(['To Do', 'In Progress', 'Done']),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = await Project.findById(task.project);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const isAdmin = project.isAdmin(req.user._id);
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ message: 'You can only update tasks assigned to you.' });
    }

    // Members can only update status
    if (!isAdmin) {
      const { status } = req.body;
      if (!status) return res.status(400).json({ message: 'Members can only update task status.' });
      task.status = status;
    } else {
      // Admins can update everything
      const { title, description, status, priority, dueDate, assignedTo } = req.body;
      if (title !== undefined) task.title = title;
      if (description !== undefined) task.description = description;
      if (status !== undefined) task.status = status;
      if (priority !== undefined) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate;
      if (assignedTo !== undefined) {
        if (assignedTo && !project.isMember(assignedTo)) {
          return res.status(400).json({ message: 'Assigned user must be a project member.' });
        }
        task.assignedTo = assignedTo || null;
      }
    }

    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');

    res.json({ task });
  } catch (err) {
    res.status(500).json({ message: 'Error updating task.', error: err.message });
  }
});

// DELETE /api/tasks/:id - Delete task (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const project = await Project.findById(task.project);
    if (!project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can delete tasks.' });
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting task.', error: err.message });
  }
});

module.exports = router;
