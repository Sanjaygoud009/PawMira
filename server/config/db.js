const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[DB_CONNECTED] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[DB_ERROR] ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
