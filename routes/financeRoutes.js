const express = require('express');
const router = express.Router();
const {
  getIncomeReport,
  getOutcomeReport,
  getDebtReport,
} = require('../controllers/financeController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route GET /api/finance/income
// Kirim hisoboti: Director, Manager
router.route('/income').get(protect, authorizeRoles('Director', 'Admin', 'Manager'), getIncomeReport); 

// @route GET /api/finance/outcome
// Chiqim (Maoshlar) hisoboti: Faqat Director va Admin
router.route('/outcome').get(protect, authorizeRoles('Director', 'Admin'), getOutcomeReport); 

// @route GET /api/finance/debt
// Qarz hisoboti: Director, Manager
router.route('/debt').get(protect, authorizeRoles('Director', 'Admin', 'Manager'), getDebtReport);

module.exports = router;