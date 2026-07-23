const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Download = require('../models/Download');
const { downloadVideo, isValidUrl, DOWNLOADS_DIR } = require('../services/downloaderService');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * POST /api/download
 * Initiates video download from given URL, records result to MongoDB
 */
router.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Please provide a valid video URL.' });
  }

  const cleanUrl = url.trim();

  if (!isValidUrl(cleanUrl)) {
    return res.status(400).json({ error: 'Invalid URL format. Please paste a full http:// or https:// video link.' });
  }

  try {
    // Attempt download using yt-dlp
    const result = await downloadVideo(cleanUrl);

    // Save successful record in MongoDB if connected
    let record = null;
    if (isDbConnected()) {
      try {
        record = await Download.create({
          originalUrl: cleanUrl,
          title: result.info.title || 'Untitled Resource',
          sourceSite: result.info.extractor || 'Unknown',
          format: result.format || result.info.ext || 'file',
          fileSizeMB: result.fileSizeMB,
          status: 'completed',
          filename: result.filename,
          filePath: result.filePath
        });
      } catch (dbErr) {
        console.error('[Database Warning] Could not save download record:', dbErr.message);
      }
    }

    return res.json({
      downloadId: record ? record._id : null,
      filename: result.filename,
      title: result.info.title,
      sourceSite: result.info.extractor,
      fileSizeMB: result.fileSizeMB,
      format: result.format || result.info.ext || 'file',
      status: 'completed'
    });
  } catch (err) {
    console.error('[Download Error]:', err.message);

    // Record failure in MongoDB if connected
    if (isDbConnected()) {
      try {
        await Download.create({
          originalUrl: cleanUrl,
          title: 'Failed Download',
          sourceSite: 'Unknown',
          status: 'failed',
          errorMessage: err.message || 'Failed to extract or download video.'
        });
      } catch (dbErr) {
        console.error('[Database Warning] Could not log failure record:', dbErr.message);
      }
    }

    let readableMessage = err.message || 'An error occurred while processing the video URL.';
    if (readableMessage.includes('Unsupported URL') || readableMessage.includes('is not a valid URL')) {
      readableMessage = 'The provided URL is unsupported or private. Please check the video link.';
    } else if (readableMessage.includes('Private video') || readableMessage.includes('Sign in')) {
      readableMessage = 'This video is private, age-restricted, or requires login credentials.';
    }

    return res.status(400).json({ error: readableMessage });
  }
});

/**
 * GET /api/file/:filename
 * Serves/streams requested downloaded file
 */
router.get('/file/:filename', (req, res) => {
  const { filename } = req.params;
  const safeFilename = path.basename(filename);
  const targetPath = path.join(DOWNLOADS_DIR, safeFilename);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'File not found or has expired.' });
  }

  res.download(targetPath, safeFilename, (err) => {
    if (err && !res.headersSent) {
      console.error('[File Serve Error]:', err.message);
      res.status(500).json({ error: 'Error sending video file.' });
    }
  });
});

/**
 * GET /api/history
 * Returns last 50 download records, most recent first
 */
router.get('/history', async (req, res) => {
  if (!isDbConnected()) {
    return res.json([]);
  }

  try {
    const history = await Download.find()
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json(history);
  } catch (err) {
    console.error('[History Fetch Error]:', err.message);
    return res.status(500).json({ error: 'Failed to retrieve download history.' });
  }
});

/**
 * DELETE /api/history/:id
 * Removes record from MongoDB and deletes file from disk
 */
router.delete('/history/:id', async (req, res) => {
  const { id } = req.params;

  if (!isDbConnected()) {
    return res.status(400).json({ error: 'Database connection offline.' });
  }

  try {
    const record = await Download.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'History record not found.' });
    }

    // Attempt file deletion if present
    if (record.filename) {
      const targetPath = path.join(DOWNLOADS_DIR, path.basename(record.filename));
      if (fs.existsSync(targetPath)) {
        try {
          fs.unlinkSync(targetPath);
        } catch (fErr) {
          console.error('[File Delete Error]:', fErr.message);
        }
      }
    }

    await Download.findByIdAndDelete(id);
    return res.json({ success: true, message: 'Record and associated file deleted.' });
  } catch (err) {
    console.error('[Record Delete Error]:', err.message);
    return res.status(500).json({ error: 'Failed to delete history record.' });
  }
});

module.exports = router;
