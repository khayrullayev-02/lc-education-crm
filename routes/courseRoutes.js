const express = require('express');
const router = express.Router();
const {
  getCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
} = require('../controllers/courseController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route GET /api/courses
// @route POST /api/courses
// GET - Barcha kirgan foydalanuvchilar ko'ra oladi
// POST - Director va Manager yaratishi mumkin
router
  .route('/')
  .get(protect, getCourses) 
  .post(protect, authorizeRoles('Director', 'Manager'), createCourse); 

// @route GET /api/courses/:id
// @route PUT /api/courses/:id
// @route DELETE /api/courses/:id
router
  .route('/:id')
  .get(protect, getCourseById) // Barcha kirganlar ko'ra oladi
  .put(protect, authorizeRoles('Director', 'Manager'), updateCourse) // Director va Manager yangilashi mumkin
  .delete(protect, authorizeRoles('Director', 'Manager'), deleteCourse); // Faqat Director o'chirishga ruxsatga ega

module.exports = router;