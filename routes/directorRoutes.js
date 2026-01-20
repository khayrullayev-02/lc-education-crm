const express = require('express');
const router = express.Router();
const {
  getDirectors,
  createDirectorProfile,
  getDirectorById,
  updateDirectorProfile,
  deleteDirectorProfile,
} = require('../controllers/directorController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Barcha Director profillarini olish va yangi profil yaratish (Faqat Directorlar)
router.route('/')
    .get(protect, authorizeRoles('Director'), getDirectors) 
    .post(protect, authorizeRoles('Director'), createDirectorProfile);

// Director profilini ID bo'yicha olish, yangilash va o'chirish (Faqat Directorlar)
router.route('/:id')
    .get(protect, authorizeRoles('Director'), getDirectorById)
    .put(protect, authorizeRoles('Director'), updateDirectorProfile)
    .delete(protect, authorizeRoles('Director'), deleteDirectorProfile);

module.exports = router;