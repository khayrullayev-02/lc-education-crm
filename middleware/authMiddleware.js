const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');

// --- 1. Kirishni himoyalash (Token tekshiruvi) ---
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Headerda "Bearer Token" borligini tekshirish
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Tokenni ajratib olish
      token = req.headers.authorization.split(' ')[1];

      // Tokenni tasdiqlash
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Foydalanuvchini bazadan topish (parolni chiqarmasdan)
      const user = await User.findById(decoded.id).select('-password');
      if (!user) {
        res.status(401);
        throw new Error('Kirishga ruxsat yo‘q, foydalanuvchi topilmadi.');
      }
      if (user.isActive === false) {
        res.status(401);
        throw new Error('Kirishga ruxsat yo‘q, foydalanuvchi bloklangan.');
      }

      // req.user ga qo'shish
      req.user = user;

      next(); // Keyingi middleware yoki controllerga o'tkazish
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Kirishga ruxsat yo‘q, token yaroqsiz.');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Kirishga ruxsat yo‘q, token topilmadi.');
  }
});

// --- 2. Ruxsatni tekshirish (Rollar bo'yicha) ---
// Masalan: authorizeRole('Director', 'Manager')
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        // req.user yuqoridagi 'protect' funktsiyasidan keladi
        if (!req.user) {
          res.status(401);
          throw new Error('Kirishga ruxsat yo‘q, user topilmadi.');
        }
        if (!roles.includes(req.user.role)) {
            res.status(403);
            throw new Error(`Sizning rolingiz (${req.user.role}) bu amalni bajarish uchun ruxsatga ega emas.`);
        }
        next();
    };
};


module.exports = { protect, authorizeRoles };