const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant']
  },
  text: {
    type: String,
    required: true
  },
  explanation: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const chatHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    default: 'New Chat'
  },
  context: {
    crop: { type: String, default: '' },
    stage: { type: String, default: '' },
    location: { type: String, default: '' },
    season: { type: String, default: '' }
  },
  messages: [messageSchema],
  productContext: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for fast user-based queries
chatHistorySchema.index({ user: 1, updatedAt: -1 });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
