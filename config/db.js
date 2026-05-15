const mongoose = require('mongoose');
const keys = require('./keys');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(keys.mongoURI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
