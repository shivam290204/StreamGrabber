const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/videodownloader';
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s if DB server is unreachable
    });
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Warning] Database connection failed: ${error.message}`);
    console.error(`[MongoDB Hint] Downloads will still work! DB features (history/records) will be skipped until DB is reachable.`);
  }
};

module.exports = connectDB;
