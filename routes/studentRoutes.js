const express = require('express');
const router = express.Router();
const {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
  transferStudent,
} = require('../controllers/studentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getStudents)
  .post(protect, authorizeRoles('Director', 'Manager', 'Admin', 'Teacher'), createStudent);

router
  .route('/:id')
  .get(protect, getStudentById)
  .put(protect, authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'), updateStudent)
  .delete(protect, authorizeRoles('Director', 'Manager'), deleteStudent);

// @route POST /api/students/:id/transfer
// O'quvchini boshqa guruhga o'tkazish
router
  .route('/:id/transfer')
  .post(protect, authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'), transferStudent);

module.exports = router;
