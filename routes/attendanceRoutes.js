const express = require('express');
const router = express.Router();
const {
  createAttendance,
  getAttendanceByGroup,
} = require('../controllers/attendanceController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Davomat yaratish/ko'rish
router
  .route('/')
  .post(protect, authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'), createAttendance); // Davomatni o'qituvchi, manager, director olishi mumkin

// Guruh bo'yicha davomatlarni olish
router
  .route('/:groupId')
  .get(protect, getAttendanceByGroup); // Barcha kirganlar (Teacher ham) ko'ra oladi

// Davomatni o'chirish (Moliyaviy xavf tufayli faqat Directorga ruxsat beriladi)
// YANGI: Davomatni o'chirish uchun Controller'ga funksiya qo'shishimiz kerak.
// Hozircha bu route'ni shunday qoldiramiz va keyingi qadamda AttendanceController'ni to'ldiramiz.

module.exports = router;