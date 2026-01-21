const express = require('express');
const router = express.Router();
const {
  getTeacherStats,
  getGroupStats,
  getEmployeeStats,
  getStudentsStats,
  getSummaryStats,
} = require('../controllers/statsController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// O'qituvchi statistikasi
router.get('/teacher/:teacherId', protect, getTeacherStats);

// Guruh statistikasi
router.get('/group/:groupId', protect, getGroupStats);

// Xodimlar statistikasi (Director/Admin)
router.get('/employees', protect, getEmployeeStats);

// O'quvchilar statistikasi (Admin, Director, Accountant, Manager)
router.get('/students', protect, authorizeRoles('Director', 'Admin', 'Accountant', 'Manager'), getStudentsStats);

// Umumiy statistika (Admin, Director, Accountant)
router.get('/summary', protect, authorizeRoles('Director', 'Admin', 'Accountant'), getSummaryStats);

module.exports = router;
