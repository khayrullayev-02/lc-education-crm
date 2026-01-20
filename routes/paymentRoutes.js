const express = require('express');
const router = express.Router();
const {
  createPayment,
  getPayments,
  deletePayment,
} = require('../controllers/paymentController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route POST /api/payments
// @route GET /api/payments
// POST - To'lovni amalga oshirish: Director, Manager, Admin yoki Teacher
// GET - Barcha to'lovlarni ko'rish: Director, Manager, Admin yoki Teacher
router
  .route('/')
  .post(protect, createPayment) // Role'ni tekshirmaymiz, chunki authMiddleware orqali har qanday kirgan foydalanuvchi (shu jumladan Admin va Teacher) to'lov qilishi mumkin.
  .get(protect, getPayments);

// @route DELETE /api/payments/:id
// To'lovni o'chirish (pulni qaytarish) faqat yuqori rollarga ruxsat beriladi
router
  .route('/:id')
  .delete(protect, authorizeRoles('Director', 'Manager'), deletePayment);

module.exports = router;