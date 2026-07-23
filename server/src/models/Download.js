const mongoose = require('mongoose');

const downloadSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: [true, 'Original URL is required'],
    trim: true
  },
  title: {
    type: String,
    default: 'Untitled Resource'
  },
  sourceSite: {
    type: String,
    default: 'Unknown'
  },
  type: {
    type: String,
    enum: ['video', 'audio', 'file'],
    default: 'video'
  },
  format: {
    type: String,
    default: 'mp4'
  },
  resolutionOrBitrate: {
    type: String,
    default: 'Best'
  },
  fileSizeMB: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['completed', 'failed', 'expired'],
    default: 'completed'
  },
  filename: {
    type: String
  },
  filePath: {
    type: String
  },
  errorMessage: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Download', downloadSchema);
