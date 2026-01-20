const asyncHandler = require('express-async-handler');
const Group = require('../models/GroupModel');
const Course = require('../models/CourseModel'); 
const Teacher = require('../models/TeacherModel'); 
const Room = require('../models/RoomModel')
const mongoose = require('mongoose'); // ID formatini tekshirish uchun qo'shildi

// @desc    Barcha guruhlarni olish (RBAC: Teacher faqat o'z guruhlarini ko'radi)
// @route   GET /api/groups
// @access  Private
const getGroups = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  let query = {};

  // RBAC: Teacher faqat o'z guruhlarini ko'radi
  if (currentUser.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: currentUser._id });
    if (!teacherProfile) {
      res.status(404);
      throw new Error('O\'qituvchi profili topilmadi.');
    }
    query.teacher = teacherProfile._id;
  }
  // Director, Manager, Admin hammasini ko'radi (query bo'sh qoladi)

  const groups = await Group.find(query)
    .populate('course', 'name')
    .populate({
        path: 'teacher',
        select: 'user specialization',
        populate: { path: 'user', select: 'firstName lastName username' }
    })
    .populate('room', 'name capacity')
    .populate('students', 'firstName lastName phoneNumber');

  res.status(200).json(groups);
});

// @desc    Yangi guruh yaratish
// @route   POST /api/groups
// @access  Private/Director, Manager
const createGroup = asyncHandler(async (req, res) => {
  const { name, course, teacher, startDate, status, schedule, room } = req.body; 
  // const authUserBranch = req.user.branch ? req.user.branch.toString() : null; 

  if (!name || !course || !teacher || !startDate || !schedule) {
    res.status(400);
    throw new Error("Iltimos, barcha guruh ma'lumotlarini to'ldiring va foydalanuvchining filiali mavjudligiga ishonch hosil qiling.");
  }
  
  if (!mongoose.Types.ObjectId.isValid(course)) {
      res.status(400);
      throw new Error(`Kiritilgan kurs ID formati yaroqsiz: ${course}`);
  }

  const courseDoc = await Course.findById(course);
  if (!courseDoc) {
      res.status(400);
      throw new Error("Kurs topilmadi.");
  }
  
  if (!mongoose.Types.ObjectId.isValid(teacher)) {
      res.status(400);
      throw new Error(`Kiritilgan o'qituvchi ID formati yaroqsiz: ${teacher}`);
  }

  const teacherProfile = await Teacher.findById(teacher).populate('user'); 

  if (!teacherProfile) {
      res.status(404);
      throw new Error("O'qituvchi profili topilmadi.");
  }

  if (!teacherProfile.user || teacherProfile.user.role !== 'Teacher') {
      res.status(400);
      throw new Error("Tayinlangan profilning asosiy User roli 'Teacher' emas.");
  }

  const roomDoc = await Room.findById(room);
  if (!roomDoc) {
    res.status(404);
    throw new Error("Xona topilmadi.");
  }

  // const groupExists = await Group.findOne({ name, course, branch: authUserBranch });
  const groupExists = await Group.findOne({ name, course });
  if (groupExists) {
    res.status(400);
    throw new Error('Bu kurs bo‘yicha bu nomdagi guruh allaqachon mavjud.');
  }


  const group = await Group.create({
    name,
    course,
    teacher,
    startDate,
    status: status || 'Pending', 
    schedule,
    room
    // branch: authUserBranch,
  });

  res.status(201).json(group);
});

// @desc    Guruhni ID bo'yicha olish (RBAC: Teacher faqat o'z guruhini ko'radi)
// @route   GET /api/groups/:id
// @access  Private
const getGroupById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error(`Guruh ID formati yaroqsiz: ${req.params.id}`);
  }
  
  const group = await Group.findById(req.params.id)
    .populate('course', 'name')
    .populate({
        path: 'teacher',
        select: 'user specialization',
        populate: { path: 'user', select: 'firstName lastName username' }
    })
    .populate('room', 'name capacity')

  if (!group) {
    res.status(404);
    throw new Error('Guruh topilmadi');
  }

  // RBAC: Teacher faqat o'z guruhini ko'radi
  const currentUser = req.user;
  if (currentUser.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: currentUser._id });
    if (!teacherProfile || teacherProfile._id.toString() !== group.teacher._id.toString()) {
      res.status(403);
      throw new Error('Bu guruhni ko\'rish uchun ruxsat yo\'q. Faqat o\'z guruhlaringizni ko\'ra olasiz.');
    }
  }

  res.json(group);
});

// @desc    Guruhni yangilash
// @route   PUT /api/groups/:id
// @access  Private/Director, Manager
const updateGroup = asyncHandler(async (req, res) => {
    const { name, course, teacher, startDate, status, isActive, schedule, room } = req.body; 
    
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error(`Guruh ID formati yaroqsiz: ${req.params.id}`);
    }
    
    let group = await Group.findById(req.params.id);

    if (!group) {
        res.status(404);
        throw new Error('Guruh topilmadi');
    }
    
    // const authUserBranch = req.user.branch.toString();
    // if (group.branch.toString() !== authUserBranch) {
    //     res.status(403);
    //     throw new Error("Siz boshqa filial guruhini yangilashga ruxsatga ega emassiz.");
    // }

    // Teacher va course tekshiruvlari qoladi, branch tekshiruvi olib tashlandi
    if (teacher && teacher.toString() !== group.teacher.toString()) {
        if (!mongoose.Types.ObjectId.isValid(teacher)) {
             res.status(400);
             throw new Error(`Yangi o'qituvchi ID formati yaroqsiz: ${teacher}`);
        }
        
        const teacherProfile = await Teacher.findById(teacher).populate('user');
        
        if (!teacherProfile) {
            res.status(404);
            throw new Error("Yangi tayinlangan o'qituvchi profili topilmadi.");
        }
        
        if (!teacherProfile.user || teacherProfile.user.role !== 'Teacher') {
            res.status(400);
            throw new Error("Yangi tayinlangan profilning asosiy User roli 'Teacher' emas.");
        }
    }
    
    if (course && course.toString() !== group.course.toString()) {
        if (!mongoose.Types.ObjectId.isValid(course)) {
             res.status(400);
             throw new Error(`Yangi kurs ID formati yaroqsiz: ${course}`);
        }
        
        const courseDoc = await Course.findById(course);
        if (!courseDoc) {
            res.status(400);
            throw new Error("Yangi tanlangan kurs topilmadi.");
        }
    }

    group.name = name !== undefined ? name : group.name;
    group.course = course !== undefined ? course : group.course;
    group.teacher = teacher !== undefined ? teacher : group.teacher;
    group.startDate = startDate !== undefined ? startDate : group.startDate;
    group.status = status !== undefined ? status : group.status;
    group.schedule = schedule !== undefined ? schedule : group.schedule;
    group.isActive = isActive !== undefined ? isActive : group.isActive;
    group.room = room !== undefined ? room : group.room;

    const updatedGroup = await group.save();
    res.json(updatedGroup);
});

// @desc    Guruhni o'chirish
// @route   DELETE /api/groups/:id
// @access  Private/Director
const deleteGroup = asyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error(`Guruh ID formati yaroqsiz: ${req.params.id}`);
    }
    
    const group = await Group.findById(req.params.id);

    if (!group) {
        res.status(404);
        throw new Error('Guruh topilmadi');
    }

    // if (group.branch.toString() !== req.user.branch.toString()) {
    //     res.status(403);
    //     throw new Error("Siz boshqa filial guruhini o'chirishga ruxsatga ega emassiz.");
    // }

    await Group.deleteOne({ _id: req.params.id });
    res.json({ message: 'Guruh muvaffaqiyatli o‘chirildi' });
});


module.exports = {
  getGroups,
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
};
