const asyncHandler = require('express-async-handler');
const ManagerProfile = require('../models/ManagerProfileModel');
const User = require('../models/UserModel');

// Barcha Manager profillarini olish
const getManagers = asyncHandler(async (req, res) => {
  const managers = await ManagerProfile.find({})
    .populate({ path: 'user', select: 'firstName lastName email phoneNumber' })
    // .populate('branch', 'name');
  res.status(200).json(managers);
});

// Yangi Manager profilini yaratish
const createManagerProfile = asyncHandler(async (req, res) => {
  // const { userId, salary, hiringDate, branch } = req.body;
  const { userId, salary, hiringDate } = req.body;
  // if (!userId || !salary || !hiringDate || !branch) {
  if (!userId || !salary || !hiringDate) {
    res.status(400);
    throw new Error("Manager profili uchun barcha maydonlar shart.");
  }

  const user = await User.findById(userId);
  if (!user || user.role !== 'Manager') {
    res.status(400);
    throw new Error("Foydalanuvchi topilmadi yoki rol Manager emas.");
  }

  const exists = await ManagerProfile.findOne({ user: userId });
  if (exists) {
    res.status(400);
    throw new Error("Ushbu foydalanuvchi allaqachon Manager profiliga ega.");
  }

  const managerProfile = await ManagerProfile.create({
    user: userId,
    salary,
    hiringDate: new Date(hiringDate),
    // branch,
  });

  res.status(201).json(managerProfile);
});

// Manager profilini ID bo‘yicha olish
const getManagerById = asyncHandler(async (req, res) => {
  const manager = await ManagerProfile.findById(req.params.id)
    .populate({ path: 'user', select: 'firstName lastName email phoneNumber role' })
    // .populate('branch', 'name');

  if (!manager) {
    res.status(404);
    throw new Error('Manager profili topilmadi');
  }

  const isOwner = req.user.role === 'Manager' && manager.user._id.toString() === req.user._id.toString();
  const canView = req.user.role === 'Director' || isOwner;

  if (!canView) {
    res.status(403);
    throw new Error('Bu profilni ko‘rish uchun ruxsat yo‘q.');
  }

  res.json(manager);
});

// Manager profilini yangilash
const updateManagerProfile = asyncHandler(async (req, res) => {
  // const { salary, hiringDate, branch, isActive } = req.body;
  const { salary, hiringDate, isActive } = req.body;
  const managerId = req.params.id;

  const manager = await ManagerProfile.findById(managerId);
  if (!manager) {
    res.status(404);
    throw new Error('Manager profili topilmadi');
  }

  const isOwner = manager.user.toString() === req.user._id.toString();
  const canUpdate = req.user.role === 'Director' || (req.user.role === 'Manager' && isOwner);

  if (!canUpdate) {
    res.status(403);
    throw new Error('Sizda ushbu profilni yangilash uchun ruxsat yo‘q.');
  }

  // Manager o‘z profilidagi salary, branch, hiringDate va isActive ni o‘zgartira olmaydi
  if (req.user.role === 'Manager' && isOwner) {
    if (salary || branch || hiringDate || isActive) {
      res.status(403);
      throw new Error('Manager o‘z profilidagi ushbu maydonlarni o‘zgartira olmaydi.');
    }
  }

  manager.salary = salary ?? manager.salary;
  manager.hiringDate = hiringDate ? new Date(hiringDate) : manager.hiringDate;
  // manager.branch = branch || manager.branch;
  manager.isActive = isActive ?? manager.isActive;

  const updated = await manager.save();
  res.json(updated);
});

// Manager profilini o‘chirish
const deleteManagerProfile = asyncHandler(async (req, res) => {
  const managerId = req.params.id;
  const manager = await ManagerProfile.findById(managerId);

  if (!manager) {
    res.status(404);
    throw new Error('Manager profili topilmadi');
  }

  // User rolini reset qilish
  // NOTE: UserModel enum'ida 'User' yo'q. Default holatga qaytaramiz.
  await User.findByIdAndUpdate(manager.user, { role: 'Student' });

  await ManagerProfile.deleteOne({ _id: managerId });

  res.json({ message: 'Manager profili muvaffaqiyatli o‘chirildi' });
});

module.exports = {
  getManagers,
  createManagerProfile,
  getManagerById,
  updateManagerProfile,
  deleteManagerProfile,
};
