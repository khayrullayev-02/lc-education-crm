const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // MONGO_URI ni .env faylidan yuklaymiz
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`🔌 MongoDB ulandi: ${conn.connection.host}`);

    // Fix legacy/bad indexes for Attendance (drop old unique index group_1_date_1)
    try {
      // Lazy-require to avoid circular deps
      const Attendance = require('../models/AttendanceModel');
      const indexes = await Attendance.collection.indexes();
      const hasBadIndex = indexes.some((i) => i.name === 'group_1_date_1');
      if (hasBadIndex) {
        await Attendance.collection.dropIndex('group_1_date_1');
        console.log('🧹 Dropped legacy bad index: attendances.group_1_date_1');
      }
      // Ensure indexes match the schema (will create compound unique indexes)
      await Attendance.syncIndexes();
      console.log('✅ Attendance indexes synced.');
    } catch (e) {
      console.warn('⚠️ Attendance index sync skipped/failed:', e.message);
    }
  } catch (error) {
    console.error(`🔴 MongoDB ulanish xatosi: ${error.message}`);
    // Ulanishda muammo bo'lsa, serverni to'xtatamiz
    process.exit(1); 
  }
};

module.exports = connectDB;