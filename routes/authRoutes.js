const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

// --- Register route ---
router.post('/register', asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, password, role } = req.body;

  // Foydalanuvchi mavjudligini tekshirish
  const userExists = await User.findOne({ username });
  if (userExists) {
    res.status(400);
    throw new Error('Foydalanuvchi allaqachon mavjud');
  }

  // Foydalanuvchi yaratish (password pre('save') orqali hash bo‘ladi)
  const user = await User.create({
    firstName,
    lastName,
    username,
    email,
    password,
    role,
  });

  // JWT token yaratish
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.status(201).json({
    token,
    user: { id: user._id, username: user.username, role: user.role },
  });
}));

// --- Login route ---
router.post('/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (user && (await user.matchPassword(password))) {
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, role: user.role },
    });
  } else {
    res.status(401);
    throw new Error('Username yoki parol noto‘g‘ri');
  }
}));

module.exports = router;
