const express = require('express');
const router = express.Router();
const {
  getManagers,
  createManagerProfile,
  getManagerById,
  updateManagerProfile,
  deleteManagerProfile,
} = require('../controllers/managerController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Barcha Manager profillarini olish (Director) va yangi profil yaratish (Director)
router.route('/')
    .get(protect, authorizeRoles('Director', 'Admin'), getManagers) 
    .post(protect, authorizeRoles('Director', 'Admin'), createManagerProfile);

// Manager profilini ID bo'yicha olish, yangilash va o'chirish
router.route('/:id')
    .get(protect, getManagerById) // Director yoki o'zi
    .put(protect, updateManagerProfile) // Director yoki o'zi (cheklangan)
    .delete(protect, authorizeRoles('Director', 'Admin'), deleteManagerProfile); // Director/Admin

module.exports = router;