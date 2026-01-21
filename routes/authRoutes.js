const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const generateToken = require('../utils/generateToken');

// --- Public Register route (for self-registration) ---
router.post('/register', asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, password, role = 'Student' } = req.body;

  // Boshlang'ich majburiy maydonlarni tekshirish
  if (!firstName || !lastName || !username || !email || !password) {
    res.status(400);
    throw new Error("Iltimos, Ism, Familiya, Username, Email, va Parol maydonlarini to'ldiring.");
  }

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
    role, // Default: Student, lekin user boshqa role tanlashi mumkin
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } else {
    res.status(400);
    throw new Error('Yaroqsiz foydalanuvchi ma\'lumotlari.');
  }
}));

// --- Public Login route ---
router.post('/login', asyncHandler(async (req, res) => {
  const { identifier, password } = req.body; // identifier: username yoki email

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
  }

  return res.status(401).json({ message: 'Unauthorized' });
}));

module.exports = router;
