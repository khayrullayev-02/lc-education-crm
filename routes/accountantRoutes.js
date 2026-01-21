const express = require('express');
const router = express.Router();
const {
  getDashboard,
  getStudentPayments,
  getTeacherSalary,
  getIncome,
  getExpense,
  createEmployeePayment,
} = require('../controllers/accountantController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// READ-ONLY endpoints for Accountant/Admin/Director
router.get('/dashboard', protect, authorizeRoles('Admin', 'Accountant', 'Director'), getDashboard);
router.get('/students/payments', protect, authorizeRoles('Admin', 'Accountant', 'Director'), getStudentPayments);
router.get('/teachers/salary', protect, authorizeRoles('Admin', 'Accountant', 'Director'), getTeacherSalary);
router.get('/income', protect, authorizeRoles('Admin', 'Accountant', 'Director'), getIncome);
router.get('/expense', protect, authorizeRoles('Admin', 'Accountant', 'Director'), getExpense);
router.post('/employee-payment', protect, authorizeRoles('Admin', 'Accountant', 'Director'), createEmployeePayment);

module.exports = router;
