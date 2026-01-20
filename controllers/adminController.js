const asyncHandler = require('express-async-handler');
const AdminProfile = require('../models/AdminProfileModel');
const User = require('../models/UserModel'); // User modelini import qilish shart

// @desc    Barcha Admin profillarini olish
// @route   GET /api/admins
// @access  Private/Director, SuperAdmin
const getAdmins = asyncHandler(async (req, res) => {
  const admins = await AdminProfile.find({})
    .populate({
      path: 'user',
      select: 'firstName lastName email phoneNumber',
    })
    .populate('primaryOffice', 'name');

  res.status(200).json(admins);
});

// @desc    Yangi Admin profilini yaratish
// @route   POST /api/admins
// @access  Private/Director, SuperAdmin
const createAdminProfile = asyncHandler(async (req, res) => {
  const { userId, salary, hiringDate, primaryOffice } = req.body; 

  if (!userId || !salary || !hiringDate) {
    res.status(400);
    throw new Error("Admin profili uchun barcha asosiy maydonlar shart.");
  }

  // 1. Foydalanuvchi "Admin" rolida ekanligini tekshirish
  const user = await User.findById(userId);

  if (!user || user.role !== 'Admin') {
    res.status(400);
    throw new Error("Ko'rsatilgan IDga ega foydalanuvchi topilmadi yoki u 'Admin' rolida emas.");
  }

  // 2. Takroriy profil mavjudligini tekshirish
  const profileExists = await AdminProfile.findOne({ user: userId });
  if (profileExists) {
    res.status(400);
    throw new Error("Ushbu foydalanuvchi allaqachon Admin profiliga ega.");
  }

  // 3. Profilni yaratish
  const adminProfile = await AdminProfile.create({
    user: userId,
    salary,
    hiringDate,
    primaryOffice,
  });

  res.status(201).json(adminProfile);
});

// @desc    Admin profilini ID bo'yicha olish
// @route   GET /api/admins/:id
// @access  Private/Director, Admin
const getAdminById = asyncHandler(async (req, res) => {
  const admin = await AdminProfile.findById(req.params.id)
    .populate({
      path: 'user',
      select: 'firstName lastName email phoneNumber role',
    })
    .populate('primaryOffice', 'name');

  if (admin) {
    res.json(admin);
  } else {
    res.status(404);
    throw new Error('Admin profili topilmadi');
  }
});

// @desc    Admin profilini yangilash
// @route   PUT /api/admins/:id
// @access  Private/Director, Admin
const updateAdminProfile = asyncHandler(async (req, res) => {
  const { salary, hiringDate, primaryOffice, isActive } = req.body;
  const adminId = req.params.id;

  let admin = await AdminProfile.findById(adminId);

  if (!admin) {
    res.status(404);
    throw new Error('Admin profili topilmadi');
  }
  
  // Faqat Director va boshqa Adminlar yangilay oladi
  if (req.user.role !== 'Director' && req.user.role !== 'Admin') {
      res.status(403);
      throw new Error('Sizda bu Admin profilini yangilash uchun ruxsat yo‘q.');
  }

  admin.salary = salary !== undefined ? salary : admin.salary;
  admin.hiringDate = hiringDate || admin.hiringDate;
  admin.primaryOffice = primaryOffice || admin.primaryOffice;
  admin.isActive = isActive !== undefined ? isActive : admin.isActive;

  const updatedAdmin = await admin.save();

  res.json(updatedAdmin);
});

// @desc    Admin profilini o'chirish
// @route   DELETE /api/admins/:id
// @access  Private/Director, SuperAdmin
const deleteAdminProfile = asyncHandler(async (req, res) => {
  const adminId = req.params.id;

  const admin = await AdminProfile.findById(adminId);

  if (!admin) {
    res.status(404);
    throw new Error('Admin profili topilmadi');
  }
  
  // O'chirishdan oldin xavfsizlik tekshiruvi (eng kamida bitta Admin qolishi kerak)

  await AdminProfile.deleteOne({ _id: adminId });
  
  // OPTIONAL: Bog'langan Userning rolini ham o'zgartirish kerak.

  res.json({ message: 'Admin profili muvaffaqiyatli o‘chirildi' });
});

module.exports = {
  getAdmins,
  createAdminProfile,
  getAdminById,
  updateAdminProfile,
  deleteAdminProfile,
};