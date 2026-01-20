const express = require('express');
const router = express.Router();
const {
  getBranches,
  createBranch,
  getBranchById,
  updateBranch,
  deleteBranch,
} = require('../controllers/branchController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getBranches) // barcha kirgan foydalanuvchilar ko'ra oladi
  .post(protect, authorizeRoles('Director'), createBranch); // faqat Director qo'shishi mumkin

router.route('/:id')
  .get(protect, getBranchById)
  .put(protect, authorizeRoles('Director'), updateBranch)
  .delete(protect, authorizeRoles('Director'), deleteBranch);

module.exports = router;
