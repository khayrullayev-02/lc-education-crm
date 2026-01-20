const express = require('express');
const router = express.Router();
const {
  getGroups,
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
} = require('../controllers/groupController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// @route GET /api/groups
// @route POST /api/groups
// GET - Barcha kirganlar (Teacher/Manager/Director) ko'ra oladi
// POST - Director va Manager yaratishi mumkin
router
  .route('/')
  .get(protect, getGroups)
  .post(protect, authorizeRoles('Director', 'Manager', 'Admin'), createGroup);

// @route GET /api/groups/:id
// @route PUT /api/groups/:id
// @route DELETE /api/groups/:id
router
  .route('/:id')
  .get(protect, getGroupById) // Barcha kirganlar ko'ra oladi
  .put(protect, authorizeRoles('Director', 'Manager', 'Admin'), updateGroup) // Director va Manager yangilashi mumkin
  .delete(protect, authorizeRoles('Director', 'Manager'), deleteGroup); // Faqat Director o'chirishga ruxsatga ega

module.exports = router;