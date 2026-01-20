const express = require('express');
const router = express.Router();
const {
  getTeacherStats,
  getGroupStats,
  getEmployeeStats,
} = require('../controllers/statsController');
const { protect } = require('../middleware/authMiddleware');

// O'qituvchi statistikasi
router.get('/teacher/:teacherId', protect, getTeacherStats);

// Guruh statistikasi
router.get('/group/:groupId', protect, getGroupStats);

// Xodimlar statistikasi (Director/Admin)
router.get('/employees', protect, getEmployeeStats);

module.exports = router;
