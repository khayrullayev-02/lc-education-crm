const express = require('express');
const router = express.Router();
const {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
} = require('../controllers/studentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getStudents)
  .post(protect, authorizeRoles('Director', 'Manager', 'Admin'), createStudent);

router
  .route('/:id')
  .get(protect, getStudentById)
  .put(protect, authorizeRoles('Director', 'Manager', 'Teacher', 'Admin'), updateStudent)
  .delete(protect, authorizeRoles('Director', 'Manager'), deleteStudent);

module.exports = router;
