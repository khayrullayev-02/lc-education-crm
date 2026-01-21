const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');

// --- 1. Kirishni himoyalash (Token tekshiruvi) ---
const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const hasBearer = authHeader.startsWith('Bearer ');
  const token = hasBearer ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role firstName lastName email isActive');

    if (!user || user.isActive === false) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Keep req.user minimal and consistent
    req.user = {
      _id: user._id,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    return next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

// --- 2. Ruxsatni tekshirish (Rollar bo'yicha) ---
// Masalan: authorizeRole('Director', 'Manager')
const authorizeRoles = (...roles) => {
    return asyncHandler(async (req, res, next) => {
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
    });
};


module.exports = { protect, authorizeRoles };