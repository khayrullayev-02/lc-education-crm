const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getManagerDashboard,
  getTeacherDashboard,
  getStudentDashboard,
  getAccountantDashboard,
} = require('../controllers/dashboardController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Admin/Director Dashboard
router.get('/admin', protect, authorizeRoles('Director', 'Admin'), getAdminDashboard);

// Manager Dashboard
router.get('/manager', protect, authorizeRoles('Manager'), getManagerDashboard);

// Teacher Dashboard
router.get('/teacher', protect, authorizeRoles('Teacher'), getTeacherDashboard);

// Student Dashboard
router.get('/student', protect, authorizeRoles('Student'), getStudentDashboard);

// Accountant Dashboard
router.get(
  '/accountant',
  protect,
  authorizeRoles('Accountant', 'Admin', 'Director'),
  getAccountantDashboard
);

module.exports = router;
