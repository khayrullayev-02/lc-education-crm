const express = require('express');
const router = express.Router();
const {
  getTeachers,
  createTeacherProfile,
  getTeacherById,
  updateTeacherProfile,
  deleteTeacherProfile,
} = require('../controllers/teachersController'); // YO'L O'ZGARTIRILDI: 'teachersController' deb taxmin qilindi
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Barcha o'qituvchilarni olish va yangi profil yaratish
router.route('/')
    .get(protect, getTeachers) // Barcha ro'yxatni ko'rish
    .post(protect, authorizeRoles('Director', 'Manager'), createTeacherProfile); // Profil yaratish

// Profilni ID bo'yicha olish, yangilash va o'chirish
router.route('/:id')
    .get(protect, getTeacherById) // Profilni ko'rish (o'zi yoki Director/Manager)
    .put(protect, updateTeacherProfile) // Profilni yangilash (o'zi yoki Director/Manager)
    .delete(protect, authorizeRoles('Director', 'Manager'), deleteTeacherProfile); // Profilni o'chirish

module.exports = router;