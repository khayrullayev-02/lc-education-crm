const asyncHandler = require('express-async-handler');
const generateToken = require('../utils/generateToken');
const User = require('../models/UserModel');
const mongoose = require('mongoose'); // ID tekshiruvi uchun qo'shildi

// @desc    Tizimga kirish/Auth
// @route   POST /api/users/login
// @access  Public
const authUser = asyncHandler(async (req, res) => {
  // Foydalanuvchi "username" yoki "email" orqali kirishi mumkinligini hisobga olgan holda.
  const { identifier, password } = req.body; // "identifier" - username yoki email

  // "identifier" ni username yoki email sifatida qidirish
  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  if (user && (await user.matchPassword(password))) {
    return res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } else {
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

// @desc    Yangi foydalanuvchi/O'qituvchi/Manager ro'yxatdan o'tkazish
// @route   POST /api/users
// @access  Private (Faqat Director/Admin)

const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, password, role } = req.body;

  // Ruxsat berilgan rollar (kontrakt)
  const allowedRoles = ['Director', 'Admin', 'Manager', 'Teacher', 'Accountant', 'Student'];
  if (role && !allowedRoles.includes(role)) {
    res.status(400);
    throw new Error('Noto\'g\'ri role qiymati.');
  }
  const finalRole = role && allowedRoles.includes(role) ? role : 'Student';

  // Boshlang'ich majburiy maydonlarni tekshirish
  if (!firstName || !lastName || !username || !email || !password) {
    res.status(400);
    throw new Error("Iltimos, Ism, Familiya, Username, Email va Parol maydonlarini to'ldiring.");
  }
  
  // Rolga qarab qo'shimcha majburiy maydonlarni tekshirish (masalan, Branch ID)
  // Teacher, Manager va Student uchun branch ID majburiy
  // if (['Teacher', 'Manager', 'Student'].includes(role) && !branch) {
  //     res.status(400);
  //     throw new Error(`"${role}" roli uchun Filial (branch) ID majburiydir.`);
  // }

  // Email allaqachon mavjudligini tekshirish
  const userExistsByEmail = await User.findOne({ email });
  if (userExistsByEmail) {
    res.status(400);
    throw new Error('Bu email orqali foydalanuvchi allaqachon ro\'yxatdan o\'tgan.');
  }
  
  // Username allaqachon mavjudligini tekshirish
  const userExistsByUsername = await User.findOne({ username });
  if (userExistsByUsername) {
    res.status(400);
    throw new Error('Bu username allaqachon band qilingan.');
  }
  const user = await User.create({
    firstName,
    lastName,
    username,
    email,
    password,
    plainPassword: password,
    role: finalRole,
    // branch, // Agar Director yoki Admin bo'lsa, bu 'undefined' bo'lishi mumkin (yaxshi)
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      // branch: user.branch,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Yaroqsiz foydalanuvchi ma\'lumotlari.');
  }
});


// @desc    Foydalanuvchi profilini olish
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  // const user = await User.findById(req.user._id).select('-password').populate('branch', 'name');
  const user = await User.findById(req.user._id).select('-password');

  if (user) {
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      // branch: user.branch,
      isActive: user.isActive,
    });
  } else {
    res.status(404);
    throw new Error('Foydalanuvchi topilmadi');
  }
});

// @desc    Foydalanuvchi profilini yangilash (faqat o'zini)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    // Parolni yangilash
    if (req.body.password) {
      user.password = req.body.password;
      user.plainPassword = req.body.password;
    }
    
    // Username yangilanishini tekshirish (agar o'zgartirilgan bo'lsa)
    if (req.body.username && req.body.username !== user.username) {
        const userExistsByUsername = await User.findOne({ username: req.body.username });
        if (userExistsByUsername) {
          res.status(400);
          throw new Error('Bu username allaqachon band qilingan.');
        }
        user.username = req.body.username;
    }
    
    // Email yangilanishini tekshirish (agar o'zgartirilgan bo'lsa)
    if (req.body.email && req.body.email !== user.email) {
        const userExistsByEmail = await User.findOne({ email: req.body.email });
        if (userExistsByEmail) {
          res.status(400);
          throw new Error('Bu email boshqa foydalanuvchi tomonidan ishlatilgan.');
        }
        user.email = req.body.email;
    }

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    
    // Rol, filial va isActive ni profil route orqali o'zgartirishga ruxsat berilmaydi.

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      // branch: updatedUser.branch,
      isActive: updatedUser.isActive,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404);
    throw new Error('Foydalanuvchi topilmadi');
  }
});

// ===================================================

// @desc    Barcha foydalanuvchilarni olish
// @route   GET /api/users
// @access  Private (Faqat Director/Admin)
const getAllUsers = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Director' && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('Barcha foydalanuvchilar ro\'yxatini ko\'rish uchun ruxsat yo\'q. Faqat Director yoki Admin.');
  }
  // Parolni tashlab, filial nomini qo'shib olamiz
  // const users = await User.find({}).select('-password').populate('branch', 'name'); 
  const users = await User.find({}).select('-password');
  res.status(200).json(users);
});


// @desc    Foydalanuvchini ID bo'yicha olish
// @route   GET /api/users/:id
// @access  Private
const getUserById = asyncHandler(async (req, res) => {
  // Faqat o'z profilini, yoki Director/Manager/Admin boshqalarni ko'rishi mumkin
  if (req.user._id.toString() !== req.params.id && req.user.role !== 'Director' && req.user.role !== 'Manager' && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('Boshqa foydalanuvchi ma\'lumotlarini ko\'rish uchun ruxsat yo\'q.');
  }
  
  // ID formatini tekshirish
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Noto\'g\'ri foydalanuvchi ID formati.');
  }

  // const user = await User.findById(req.params.id).select('-password').populate('branch', 'name');
  const user = await User.findById(req.params.id).select('-password');

  if (user) {
    res.json(user);
  } else {
    res.status(404);
    throw new Error('Foydalanuvchi topilmadi');
  }
});


// @desc    Foydalanuvchi profilini yangilash (Director/Admin tomonidan)
// @route   PUT /api/users/:id
// @access  Private (Faqat Director/Admin)
const updateUser = asyncHandler(async (req, res) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('Foydalanuvchi topilmadi');
  }

  // Faqat Director yoki Admin boshqa foydalanuvchini o'zgartira oladi
  // va foydalanuvchi faqat o'zini o'zgartira oladi (Bu qism updateUserProfile'da hal qilingan).
  // Bu route faqat Director/Admin uchun mo'ljallangan
  if (req.user.role !== 'Director' && req.user.role !== 'Admin') {
    res.status(403);
    throw new Error('Bu foydalanuvchi ma\'lumotlarini yangilash uchun ruxsat yo\'q. Faqat Director/Admin ruxsat beradi.');
  }
  
  // Username yangilanishini tekshirish (agar o'zgartirilgan bo'lsa)
    if (req.body.username && req.body.username !== user.username) {
        const userExistsByUsername = await User.findOne({ username: req.body.username });
        if (userExistsByUsername) {
          res.status(400);
          throw new Error('Bu username allaqachon band qilingan.');
        }
        user.username = req.body.username;
    }
    
    // Email yangilanishini tekshirish (agar o'zgartirilgan bo'lsa)
    if (req.body.email && req.body.email !== user.email) {
        const userExistsByEmail = await User.findOne({ email: req.body.email });
        if (userExistsByEmail) {
          res.status(400);
          throw new Error('Bu email boshqa foydalanuvchi tomonidan ishlatilgan.');
        }
        user.email = req.body.email;
    }
  
  // Boshqa maydonlarni yangilash
  user.firstName = req.body.firstName || user.firstName;
  user.lastName = req.body.lastName || user.lastName;
  
  // Rol, filial va isActive ni Director/Admin o'zgartirishi mumkin
  const allowedRoles = ['Director', 'Admin', 'Manager', 'Teacher', 'Accountant', 'Student'];
  if (req.body.role) {
    if (!allowedRoles.includes(req.body.role)) {
      res.status(400);
      throw new Error('Noto\'g\'ri role qiymati.');
    }
    user.role = req.body.role;
  }
  // user.branch = req.body.branch || user.branch;
  user.isActive = req.body.isActive !== undefined ? req.body.isActive : user.isActive;
  
  // Parol yangilanishi
  if (req.body.password) {
      user.password = req.body.password;
      user.plainPassword = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    username: updatedUser.username,
    email: updatedUser.email,
    role: updatedUser.role,
    // branch: updatedUser.branch,
    isActive: updatedUser.isActive,
  });
});


// @desc    Foydalanuvchini o'chirish
// @route   DELETE /api/users/:id
// @access  Private (Faqat Director/Admin)
const deleteUser = asyncHandler(async (req, res) => {
    // Faqat Director yoki Admin ruxsati bor
    if (req.user.role !== 'Director' && req.user.role !== 'Admin') {
        res.status(403);
        throw new Error('Foydalanuvchini o‘chirish uchun faqat Director yoki Admin ruxsatiga ega.');
    }
    
    // ID formatini tekshirish
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error('Noto\'g\'ri foydalanuvchi ID formati.');
    }
    
    const user = await User.findById(req.params.id);

    if (user) {
        // O'zini o'chirishga ruxsat yo'q (xavfsizlik uchun)
        if (user._id.toString() === req.user._id.toString()) {
            res.status(400);
            throw new Error('Siz o‘zingizni o‘chira olmaysiz.');
        }
        
        // Agar o'chirilayotgan foydalanuvchi Teacher/Student/Manager bo'lsa, tegishli modeldagi profilni ham o'chirish kerak.
        // Bu mantiqni keyinroq Teacher/Student controllerlarida hal qilamiz. Hozir faqat User ni o'chiramiz.
        await User.deleteOne({ _id: req.params.id });
        res.json({ message: 'Foydalanuvchi muvaffaqiyatli o‘chirildi' });
    } else {
        res.status(404);
        throw new Error('Foydalanuvchi topilmadi');
    }
});


// @desc    Logout (token o'chirish - frontend'da localStorage'dan o'chiriladi)
// @route   POST /api/users/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
  // Backend'da token blacklist qilish kerak bo'lsa, bu yerda qilinadi
  // Hozircha faqat muvaffaqiyat xabari qaytaramiz
  // Frontend localStorage'dan tokenni o'chiradi
  res.status(200).json({ message: 'Muvaffaqiyatli chiqildi' });
});

module.exports = {
  authUser,
  registerUser,
  getUserProfile, 
  updateUserProfile, 
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  logoutUser,
};