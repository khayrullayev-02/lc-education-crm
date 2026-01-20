const express = require('express');
const router = express.Router();
const {
  getRooms,
  createRoom,
  getRoomById,
  updateRoom,
  deleteRoom,
} = require('../controllers/roomController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router
  .route('/')
  .get(protect, getRooms) // Director/Manager/Teacher ko'ra oladi
  .post(protect, authorizeRoles('Director', 'Manager'), createRoom); // Yaratish faqat Director/Manager

router
  .route('/:id')
  .get(protect, getRoomById) // Barcha kirganlar ko'ra oladi
  .put(protect, authorizeRoles('Director', 'Manager'), updateRoom) // Director va Manager yangilashi mumkin
  .delete(protect, authorizeRoles('Director', 'Manager'), deleteRoom); // O'chirish faqat Director/Manager

module.exports = router;
