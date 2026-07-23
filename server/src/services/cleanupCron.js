const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const Download = require('../models/Download');
const { DOWNLOADS_DIR } = require('./downloaderService');

/**
 * Initializes cron job to delete downloaded files older than 24 hours
 * and mark their database status as 'expired'.
 * Runs every hour on the hour (0 * * * *).
 */
const initCleanupCron = () => {
  cron.schedule('0 * * * *', async () => {
    console.log('[Cleanup Cron] Running 24-hour expired files cleanup job...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    try {
      // Find completed downloads created more than 24h ago
      const expiredDownloads = await Download.find({
        status: 'completed',
        createdAt: { $lt: twentyFourHoursAgo }
      });

      console.log(`[Cleanup Cron] Found ${expiredDownloads.length} expired record(s).`);

      for (const record of expiredDownloads) {
        // Delete file from disk if it exists
        if (record.filePath && fs.existsSync(record.filePath)) {
          try {
            fs.unlinkSync(record.filePath);
            console.log(`[Cleanup Cron] Removed file from disk: ${record.filename}`);
          } catch (fileErr) {
            console.error(`[Cleanup Cron] Failed to delete file ${record.filename}:`, fileErr.message);
          }
        } else if (record.filename) {
          // Fallback check in downloads directory
          const fallbackPath = path.join(DOWNLOADS_DIR, record.filename);
          if (fs.existsSync(fallbackPath)) {
            try {
              fs.unlinkSync(fallbackPath);
              console.log(`[Cleanup Cron] Removed file via fallback path: ${record.filename}`);
            } catch (e) {
              console.error(`[Cleanup Cron] Fallback file delete failed:`, e.message);
            }
          }
        }

        // Update record status in MongoDB
        record.status = 'expired';
        await record.save();
      }

      console.log('[Cleanup Cron] Cleanup cycle completed.');
    } catch (err) {
      console.error('[Cleanup Cron] Error during cleanup execution:', err);
    }
  });

  console.log('[Cleanup Cron] Scheduled cleanup service initialized (Hourly trigger).');
};

module.exports = initCleanupCron;
