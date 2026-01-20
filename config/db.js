const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MONGO_URI ni .env faylidan yuklaymiz
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`🔌 MongoDB ulandi: ${conn.connection.host}`);
  } catch (error) {
    console.error(`🔴 MongoDB ulanish xatosi: ${error.message}`);
    // Ulanishda muammo bo'lsa, serverni to'xtatamiz
    process.exit(1); 
  }
};

module.exports = connectDB;