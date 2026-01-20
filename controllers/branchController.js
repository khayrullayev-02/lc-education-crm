const Branch = require('../models/BranchModel');

// Barcha filiallarni olish
const getBranches = async (req, res, next) => {
  try {
    const branches = await Branch.find({});
    res.status(200).json(branches);
  } catch (error) {
    next(error);
  }
};

// Yangi filial yaratish
const createBranch = async (req, res, next) => {
  const { name, address, phone } = req.body;

  try {
    if (!name || !address || !phone) {
      res.status(400);
      throw new Error("Iltimos, Filialning barcha maydonlarini to'ldiring: nomi, manzili va telefon raqami.");
    }

    const branch = await Branch.create({ name, address, phone });
    res.status(201).json(branch);

  } catch (error) {
    if (error.code === 11000) {
      res.status(400);
      if (error.keyPattern.name) throw new Error('Bu Filial nomi allaqachon tizimda mavjud.');
      if (error.keyPattern.phone) throw new Error('Bu telefon raqami allaqachon boshqa filialda mavjud.');
    }
    next(error);
  }
};

// Filialni ID bo'yicha olish
const getBranchById = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      res.status(404);
      throw new Error('Filial topilmadi');
    }
    res.json(branch);
  } catch (error) {
    next(error);
  }
};

// Filialni yangilash
const updateBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      res.status(404);
      throw new Error('Filial topilmadi');
    }

    branch.name = req.body.name || branch.name;
    branch.address = req.body.address || branch.address;
    branch.phone = req.body.phone || branch.phone;
    branch.isActive = req.body.isActive !== undefined ? req.body.isActive : branch.isActive;

    const updatedBranch = await branch.save();
    res.json(updatedBranch);

  } catch (error) {
    if (error.code === 11000) {
      res.status(400);
      if (error.keyPattern.name) throw new Error('Yangilash uchun tanlangan Filial nomi allaqachon mavjud.');
      if (error.keyPattern.phone) throw new Error('Yangilash uchun tanlangan telefon raqami allaqachon mavjud.');
    }
    next(error);
  }
};

// Filialni o'chirish
const deleteBranch = async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id);
    if (!branch) {
      res.status(404);
      throw new Error('Filial topilmadi');
    }

    await Branch.deleteOne({ _id: req.params.id });
    res.json({ message: 'Filial muvaffaqiyatli o‘chirildi' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBranches,
  createBranch,
  getBranchById,
  updateBranch,
  deleteBranch,
};
