require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const mediaRoutes = require('./routes/media');
const initCleanupCron = require('./services/cleanupCron');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS configuration - allow Vite frontend access
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Express middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve downloads statically if needed
app.use('/downloads', express.static(path.join(__dirname, '../downloads')));

// Mount API routes under /api
app.use('/api', mediaRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Video Downloader API', time: new Date() });
});

// Start cleanup cron job
initCleanupCron();

// Start Express server
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`  🚀 Server running on http://localhost:${PORT}`);
  console.log(`  📁 Downloads dir: ${path.join(__dirname, '../downloads')}`);
  console.log(`===========================================`);
});
