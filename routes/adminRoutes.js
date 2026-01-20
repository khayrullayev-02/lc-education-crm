const express = require('express');
const router = express.Router();
const {
  getAdmins,
  createAdminProfile,
  getAdminById,
  updateAdminProfile,
  deleteAdminProfile,
} = require('../controllers/adminController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Barcha Admin profillarini olish va yangi profil yaratish
router.route('/')
    .get(protect, authorizeRoles('Director', 'Admin'), getAdmins) 
    .post(protect, authorizeRoles('Director', 'Admin'), createAdminProfile);

// Admin profilini ID bo'yicha olish, yangilash va o'chirish
router.route('/:id')
    .get(protect, authorizeRoles('Director', 'Admin'), getAdminById)
    .put(protect, authorizeRoles('Director', 'Admin'), updateAdminProfile)
    .delete(protect, authorizeRoles('Director'), deleteAdminProfile); // O'chirishni faqat Director'ga beramiz

module.exports = router;