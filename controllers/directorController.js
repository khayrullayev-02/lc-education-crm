const asyncHandler = require('express-async-handler');
const DirectorProfile = require('../models/DirectorProfileModel');
const User = require('../models/UserModel');

// @desc    Barcha Director profillarini olish
// @route   GET /api/directors
// @access  Private/Director
const getDirectors = asyncHandler(async (req, res) => {
  const directors = await DirectorProfile.find({})
    .populate({
      path: 'user',
      select: 'firstName lastName email phoneNumber role',
    })
    // .populate('primaryBranch', 'name');

  res.status(200).json(directors);
});

// @desc    Yangi Director profilini yaratish
// @route   POST /api/directors
// @access  Private/Director
const createDirectorProfile = asyncHandler(async (req, res) => {
  // const { userId, salary, hiringDate, primaryBranch } = req.body;
  const { userId, salary, hiringDate } = req.body;

  if (!userId || !salary || !hiringDate) {
    res.status(400);
    throw new Error("Director profili uchun barcha asosiy maydonlar shart.");
  }

  // 1. Foydalanuvchini tekshirish
  const user = await User.findById(userId);

  if (!user || user.role !== 'Director') {
    res.status(400);
    throw new Error("Ko'rsatilgan foydalanuvchi topilmadi yoki u Director rolida emas.");
  }

  // 2. Director profili takrorlanmasligi
  const exists = await DirectorProfile.findOne({ user: userId });
  if (exists) {
    res.status(400);
    throw new Error("Ushbu foydalanuvchi allaqachon Director profiliga ega.");
  }

  // 3. hiringDate fix
  const formattedHiringDate = new Date(hiringDate);

  const directorProfile = await DirectorProfile.create({
    user: userId,
    salary,
    hiringDate: formattedHiringDate,
    // primaryBranch,
  });

  res.status(201).json(directorProfile);
});

// @desc    Director profilini ID bo'yicha olish
// @route   GET /api/directors/:id
// @access  Private
const getDirectorById = asyncHandler(async (req, res) => {
  const director = await DirectorProfile.findById(req.params.id)
    .populate({
      path: 'user',
      select: 'firstName lastName email phoneNumber role',
    })
    // .populate('primaryBranch', 'name');

  if (!director) {
    res.status(404);
    throw new Error('Director profili topilmadi');
  }

  res.json(director);
});

// @desc    Director profilini yangilash
// @route   PUT /api/directors/:id
// @access  Private/Director
const updateDirectorProfile = asyncHandler(async (req, res) => {
  // const { salary, hiringDate, primaryBranch, isActive } = req.body;
  const directorId = req.params.id;

  let director = await DirectorProfile.findById(directorId);

  if (!director) {
    res.status(404);
    throw new Error('Director profili topilmadi');
  }

  // ❗ Director faqat o'zini yangilay olishi kerak
  if (req.user.role === 'Director' && req.user._id.toString() !== director.user.toString()) {
    res.status(403);
    throw new Error("Siz faqat o'zingizning Director profilingizni yangilashingiz mumkin.");
  }

  director.salary = salary ?? director.salary;
  director.hiringDate = hiringDate ? new Date(hiringDate) : director.hiringDate;
  // director.primaryBranch = primaryBranch || director.primaryBranch;
  director.isActive = isActive ?? director.isActive;

  const updated = await director.save();

  res.json(updated);
});

// @desc    Director profilini o'chirish
// @route   DELETE /api/directors/:id
// @access  Private/Director
const deleteDirectorProfile = asyncHandler(async (req, res) => {
  const directorId = req.params.id;

  const director = await DirectorProfile.findById(directorId);

  if (!director) {
    res.status(404);
    throw new Error('Director profili topilmadi');
  }

  // ❗ Director faqat o‘zini o‘chirishi mumkin
  if (req.user.role === 'Director' && req.user._id.toString() !== director.user.toString()) {
    res.status(403);
    throw new Error("Siz faqat o'zingizning Director profilingizni o'chirishingiz mumkin.");
  }

  // ❗ Oxirgi faol direktorni o‘chirib bo‘lmaydi
  const activeCount = await DirectorProfile.countDocuments({ isActive: true });
  if (activeCount <= 1 && director.isActive) {
    res.status(400);
    throw new Error('Tizimda oxirgi faol Directorni o‘chirib bo‘lmaydi.');
  }

  // ❗ User role ni reset qilish shart
  await User.findByIdAndUpdate(director.user, { role: 'User' });

  await DirectorProfile.deleteOne({ _id: directorId });

  res.json({ message: 'Director profili o‘chirildi.' });
});

module.exports = {
  getDirectors,
  createDirectorProfile,
  getDirectorById,
  updateDirectorProfile,
  deleteDirectorProfile,
};
