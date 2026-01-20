const express = require('express');
const router = express.Router();
const {
  getDebtWarningStudents,
  getAbsentStudents,
} = require('../controllers/notificationController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Barcha notification API lari himoyalangan

// @route GET /api/notifications/debt-warning
// Puli tugash arafasidagi talabalar (Director, Manager)
router.get('/debt-warning', protect, authorizeRoles('Director', 'Manager', 'Admin'), getDebtWarningStudents);

// @route GET /api/notifications/absent-students
// Darsga kelmagan talabalar (Director, Manager, Teacher)
router.get('/absent-students', protect, authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'), getAbsentStudents);


module.exports = router;