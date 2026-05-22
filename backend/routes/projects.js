const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// GET /api/projects - Get all projects for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ 'members.user': req.user._id })
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ projects });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching projects.', error: err.message });
  }
});

// POST /api/projects - Create a new project
router.post('/', auth, [
  body('name').trim().isLength({ min: 2 }).withMessage('Project name must be at least 2 characters'),
  body('description').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { name, description } = req.body;

    const project = new Project({
      name,
      description,
      createdBy: req.user._id,
      members: [{ user: req.user._id, role: 'Admin' }]
    });

    await project.save();
    await project.populate('members.user', 'name email');
    await project.populate('createdBy', 'name email');

    res.status(201).json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Error creating project.', error: err.message });
  }
});

// GET /api/projects/:id - Get a single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members.user', 'name email')
      .populate('createdBy', 'name email');

    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isMember(req.user._id)) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching project.', error: err.message });
  }
});

// PUT /api/projects/:id - Update project (Admin only)
router.put('/:id', auth, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('description').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can update projects.' });
    }

    const { name, description } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;
    await project.save();
    await project.populate('members.user', 'name email');

    res.json({ project });
  } catch (err) {
    res.status(500).json({ message: 'Error updating project.', error: err.message });
  }
});

// DELETE /api/projects/:id - Delete project (Admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can delete projects.' });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ message: 'Project and all its tasks deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting project.', error: err.message });
  }
});

// POST /api/projects/:id/members - Add member (Admin only)
router.post('/:id/members', auth, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['Admin', 'Member']).withMessage('Role must be Admin or Member')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can add members.' });
    }

    const { email, role = 'Member' } = req.body;
    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ message: 'User with this email not found.' });

    if (project.isMember(userToAdd._id)) {
      return res.status(400).json({ message: 'User is already a member of this project.' });
    }

    project.members.push({ user: userToAdd._id, role });
    await project.save();
    await project.populate('members.user', 'name email');

    res.json({ project, message: `${userToAdd.name} added as ${role}.` });
  } catch (err) {
    res.status(500).json({ message: 'Error adding member.', error: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId - Remove member (Admin only)
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found.' });
    if (!project.isAdmin(req.user._id)) {
      return res.status(403).json({ message: 'Only admins can remove members.' });
    }

    const userIdToRemove = req.params.userId;
    if (userIdToRemove === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot remove yourself from the project.' });
    }

    const memberIndex = project.members.findIndex(m => m.user.toString() === userIdToRemove);
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in this project.' });
    }

    project.members.splice(memberIndex, 1);
    await project.save();
    await project.populate('members.user', 'name email');

    res.json({ project, message: 'Member removed successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error removing member.', error: err.message });
  }
});

module.exports = router;
