const express = require('express');
const router = express.Router();
const {
  bulkUpsertAttendance,
  getAttendanceTable,
  getAttendanceByDate,
  deleteAttendance,
} = require('../controllers/attendanceController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Bulk create/update (table save)
router.post(
  '/bulk',
  protect,
  authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'),
  bulkUpsertAttendance
);

// Attendance table (students x dates)
router.get(
  '/table/:groupId',
  protect,
  authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'),
  getAttendanceTable
);

// Attendance by date
router.get(
  '/group/:groupId/date/:date',
  protect,
  authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'),
  getAttendanceByDate
);

// Delete attendance (Admin/Director)
router.delete(
  '/:id',
  protect,
  authorizeRoles('Director', 'Admin'),
  deleteAttendance
);

module.exports = router;