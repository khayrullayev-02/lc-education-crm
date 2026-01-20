const asyncHandler = require('express-async-handler');
const Room = require('../models/RoomModel');

// @desc    Barcha xonalarni olish (Faqat kirgan filialga tegishli)
// @route   GET /api/rooms
// @access  Private
const getRooms = asyncHandler(async (req, res) => {
  // const rooms = await Room.find({ branch: req.user.branch }).select('-__v');
  const rooms = await Room.find().select('-__v');
  res.status(200).json(rooms);
});

// @desc    Yangi xona yaratish
// @route   POST /api/rooms
// @access  Private/Director, Manager
const createRoom = asyncHandler(async (req, res) => {
  const { name, capacity } = req.body;
  // const branch = req.user.branch;

  if (!name || !capacity) {
    res.status(400);
    throw new Error("Iltimos, xona nomi va sig'imini kiriting.");
  }

  // const roomExists = await Room.findOne({ name, branch });
  const roomExists = await Room.findOne({ name });
  if (roomExists) {
    res.status(400);
    throw new Error(`Bu nomli xona ('${name}') allaqachon filialda mavjud.`);
  }

  // const room = await Room.create({ name, capacity, branch });
  const room = await Room.create({ name, capacity });
  res.status(201).json(room);
});

// @desc    Xonani ID bo'yicha olish
// @route   GET /api/rooms/:id
// @access  Private
const getRoomById = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
    res.status(404);
    throw new Error('Xona topilmadi');
  }

  // if (room.branch.toString() !== req.user.branch.toString()) {
  //     res.status(403);
  //     throw new Error("Siz boshqa filial xonasini ko'rishga ruxsatga ega emassiz.");
  // }

  res.json(room);
});

// @desc    Xonani yangilash
// @route   PUT /api/rooms/:id
// @access  Private/Director, Manager
const updateRoom = asyncHandler(async (req, res) => {
  const { name, capacity, isActive } = req.body;
  const room = await Room.findById(req.params.id);

  if (!room) {
      res.status(404);
      throw new Error('Xona topilmadi');
  }

  // if (room.branch.toString() !== req.user.branch.toString()) {
  //     res.status(403);
  //     throw new Error("Siz boshqa filial xonasini yangilashga ruxsatga ega emassiz.");
  // }

  if (name && name !== room.name) {
      // const roomExists = await Room.findOne({ name, branch: room.branch });
      const roomExists = await Room.findOne({ name });
      if (roomExists) {
          res.status(400);
          // throw new Error(`Bu nomli xona ('${name}') filialda allaqachon mavjud.`);
          throw new Error(`Bu nomli xona ('${name}') allaqachon mavjud.`);
      }
      room.name = name;
  }

  room.capacity = capacity || room.capacity;
  room.isActive = isActive !== undefined ? isActive : room.isActive;

  const updatedRoom = await room.save();
  res.json(updatedRoom);
});

// @desc    Xonani o'chirish
// @route   DELETE /api/rooms/:id
// @access  Private/Director
const deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) {
      res.status(404);
      throw new Error('Xona topilmadi');
  }

  // if (room.branch.toString() !== req.user.branch.toString()) {
  //     res.status(403);
  //     throw new Error("Siz boshqa filial xonasini o'chirishga ruxsatga ega emassiz.");
  // }

  await Room.deleteOne({ _id: req.params.id });
  res.json({ message: 'Xona muvaffaqiyatli o‘chirildi' });
});

module.exports = {
  getRooms,
  createRoom,
  getRoomById,
  updateRoom,
  deleteRoom,
};
