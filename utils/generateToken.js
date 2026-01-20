const jwt = require('jsonwebtoken');

/**
 * Foydalanuvchi ma'lumotlari asosida JWT (JSON Web Token) yaratadi.
 *
 * @param {{_id: any, role?: string}} user - Foydalanuvchi (kamida _id)
 * @returns {string} - Yaratilgan JWT tokeni
 */
const generateToken = (user) => {
  // .env faylida JWT_SECRET ni aniqlaganingizga ishonch hosil qiling!
  // Misol: JWT_SECRET=sizning_juda_maxfiy_kalitingiz
  
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET env topilmadi. .env faylni tekshiring.');
  }

  const id = user?._id ?? user?.id ?? user;
  const role = user?.role;

  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    // Tokenga amal qilish muddati: 30 kun
    expiresIn: '1d', 
  });
};

module.exports = generateToken;