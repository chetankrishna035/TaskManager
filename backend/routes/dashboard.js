const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const auth = require('../middleware/auth');

// GET /api/dashboard?projectId=xxx - Get dashboard stats
router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;

    let projectFilter = {};
    let taskFilter = {};

    if (projectId) {
      const project = await Project.findById(projectId).populate('members.user', 'name email');
      if (!project) return res.status(404).json({ message: 'Project not found.' });
      if (!project.isMember(req.user._id)) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      taskFilter.project = projectId;
    } else {
      // Get all projects user is part of
      const userProjects = await Project.find({ 'members.user': req.user._id }).select('_id');
      const projectIds = userProjects.map(p => p._id);
      taskFilter.project = { $in: projectIds };
    }

    const tasks = await Task.find(taskFilter)
      .populate('assignedTo', 'name email')
      .populate('project', 'name');

    const now = new Date();

    // Stats
    const totalTasks = tasks.length;
    const byStatus = {
      'To Do': tasks.filter(t => t.status === 'To Do').length,
      'In Progress': tasks.filter(t => t.status === 'In Progress').length,
      'Done': tasks.filter(t => t.status === 'Done').length
    };

    const overdueTasks = tasks.filter(t =>
      t.dueDate && new Date(t.dueDate) < now && t.status !== 'Done'
    );

    // Tasks per user
    const tasksPerUser = {};
    tasks.forEach(task => {
      if (task.assignedTo) {
        const userId = task.assignedTo._id.toString();
        const userName = task.assignedTo.name;
        if (!tasksPerUser[userId]) {
          tasksPerUser[userId] = { name: userName, count: 0, tasks: [] };
        }
        tasksPerUser[userId].count++;
        tasksPerUser[userId].tasks.push({
          _id: task._id,
          title: task.title,
          status: task.status,
          priority: task.priority
        });
      }
    });

    // Recent activity (last 5 updated tasks)
    const recentTasks = await Task.find(taskFilter)
      .populate('assignedTo', 'name email')
      .populate('project', 'name')
      .sort({ updatedAt: -1 })
      .limit(5);

    res.json({
      totalTasks,
      byStatus,
      overdueTasks: overdueTasks.length,
      overdueTasksList: overdueTasks.map(t => ({
        _id: t._id,
        title: t.title,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo,
        project: t.project
      })),
      tasksPerUser: Object.values(tasksPerUser),
      recentTasks
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching dashboard data.', error: err.message });
  }
});

module.exports = router;
