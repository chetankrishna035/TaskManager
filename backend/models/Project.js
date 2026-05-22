const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['Admin', 'Member'],
    default: 'Member'
  }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    minlength: [2, 'Project name must be at least 2 characters'],
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  members: [memberSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

// Helper: get the raw string ID whether populated or not
const toId = (val) => {
  if (!val) return '';
  if (typeof val === 'object' && val._id) return val._id.toString();
  return val.toString();
};

// Helper: check if user is admin
projectSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(m => toId(m.user) === userId.toString());
  return member && member.role === 'Admin';
};

// Helper: check if user is member
projectSchema.methods.isMember = function(userId) {
  return this.members.some(m => toId(m.user) === userId.toString());
};

module.exports = mongoose.model('Project', projectSchema);
