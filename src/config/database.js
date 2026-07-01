const mongoose = require("mongoose");

/**
 * Connects to MongoDB Atlas using the connection string from env.
 * Mongoose handles connection pooling automatically.
 * On failure, the process exits so the container/service can restart cleanly.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
