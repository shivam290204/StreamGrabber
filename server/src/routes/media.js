const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Download = require('../models/Download');
const { fetchMediaInfo, downloadMedia, isValidUrl, DOWNLOADS_DIR } = require('../utils/ytdlp');

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Step 1: POST /api/info
 * Validates URL and returns metadata preview + format lists
 */
router.post('/info', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Please provide a valid video or media URL.' });
  }

  const cleanUrl = url.trim();

  if (!isValidUrl(cleanUrl)) {
    return res.status(400).json({ error: 'Invalid URL format. Please enter a valid http:// or https:// link.' });
  }

  try {
    const info = await fetchMediaInfo(cleanUrl);
    return res.json(info);
  } catch (err) {
    console.error('[Media Info Error]:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to extract media information.' });
  }
});

/**
 * Step 2: POST /api/download
 * Downloads video or converts audio with chosen quality/format, logs result to MongoDB
 */
router.post('/download', async (req, res) => {
  const { url, type = 'video', formatId, audioFormat = 'mp3', audioQuality = '0' } = req.body;

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'Please provide a valid media URL.' });
  }

  const cleanUrl = url.trim();

  if (!isValidUrl(cleanUrl)) {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  try {
    const result = await downloadMedia({
      url: cleanUrl,
      type,
      formatId,
      audioFormat,
      audioQuality
    });

    let record = null;
    if (isDbConnected()) {
      try {
        record = await Download.create({
          originalUrl: cleanUrl,
          title: result.info.title || 'Untitled Resource',
          sourceSite: result.info.sourceSite || 'Web',
          type: type,
          format: result.format,
          resolutionOrBitrate: result.resolutionOrBitrate,
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
      sourceSite: result.info.sourceSite,
      type: type,
      format: result.format,
      resolutionOrBitrate: result.resolutionOrBitrate,
      fileSizeMB: result.fileSizeMB,
      status: 'completed'
    });
  } catch (err) {
    console.error('[Download Error]:', err.message);

    if (isDbConnected()) {
      try {
        await Download.create({
          originalUrl: cleanUrl,
          title: 'Failed Download',
          sourceSite: 'Web',
          type: type,
          format: type === 'audio' ? audioFormat : (type === 'file' ? 'file' : 'mp4'),
          resolutionOrBitrate: 'N/A',
          status: 'failed',
          errorMessage: err.message || 'Download failed.'
        });
      } catch (dbErr) {
        console.error('[Database Warning] Could not log failure record:', dbErr.message);
      }
    }

    let readableMessage = err.message || 'An error occurred while downloading the media file.';
    if (readableMessage.includes('Unsupported URL')) {
      readableMessage = "This website isn't supported or the link is invalid.";
    } else if (readableMessage.includes('Private video') || readableMessage.includes('Sign in')) {
      readableMessage = 'This video is private or region-locked.';
    }

    return res.status(400).json({ error: readableMessage });
  }
});

/**
 * GET /api/file/:filename
 * Streams requested file as an attachment download
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
      res.status(500).json({ error: 'Error serving file.' });
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
    return res.status(500).json({ error: 'Failed to load history.' });
  }
});

/**
 * DELETE /api/history/:id
 * Deletes record from DB and purges file from disk
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
    console.error('[Delete Error]:', err.message);
    return res.status(500).json({ error: 'Failed to delete record.' });
  }
});

module.exports = router;
