const asyncHandler = require('express-async-handler');
const Student = require('../models/StudentModel');
const Group = require('../models/GroupModel');
const Teacher = require('../models/TeacherModel');

// GET /api/students - Barcha talabalar (RBAC: Teacher faqat o'z guruhlaridagi o'quvchilarni ko'radi)
const getStudents = asyncHandler(async (req, res) => {
  const currentUser = req.user;
  let query = {};

  // RBAC: Teacher faqat o'z guruhlaridagi o'quvchilarni ko'radi
  if (currentUser.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: currentUser._id });
    if (!teacherProfile) {
      res.status(404);
      throw new Error('O\'qituvchi profili topilmadi.');
    }
    // O'qituvchining barcha guruhlarini topish
    const teacherGroups = await Group.find({ teacher: teacherProfile._id }).select('_id');
    const groupIds = teacherGroups.map(g => g._id);
    query.group = { $in: groupIds };
  }
  // Director, Manager, Admin hammasini ko'radi (query bo'sh qoladi)

  const students = await Student.find(query)
    .populate('group', 'name')
    .select('-__v');
  res.status(200).json(students);
});

// POST /api/students - Yangi talaba yaratish
const createStudent = asyncHandler(async (req, res) => {
  const { firstName, lastName, birthDate, phoneNumber, group, status } = req.body;

  if (!firstName || !lastName || !birthDate || !phoneNumber) {
    res.status(400);
    throw new Error("Iltimos, talabaning ism, familiya, sana va telefon raqamini to'ldiring.");
  }

  const studentExists = await Student.findOne({ phoneNumber });
  if (studentExists) {
    res.status(400);
    throw new Error('Bu telefon raqami allaqachon tizimda ro‘yxatdan o‘tgan.');
  }

  if (group) {
    const existingGroup = await Group.findById(group);
    if (!existingGroup) {
      res.status(400);
      throw new Error("Belgilangan guruh topilmadi.");
    }
  }

  // 1️⃣ Studentni yaratamiz
  const student = await Student.create({
    firstName,
    lastName,
    birthDate,
    phoneNumber,
    group: group || null,
    status: status || 'Pending',
  });

  // 2️⃣ Studentni groupga push qilamiz
  if (group) {
    await Group.findByIdAndUpdate(group, {
      $push: { students: student._id }
    });
  }

  res.status(201).json(student);
});



// GET /api/students/:id - Talabani ID bo'yicha olish (RBAC: Teacher faqat o'z guruhidagi o'quvchini ko'radi)
const getStudentById = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id).populate('group', 'name teacher');

  if (!student) {
    res.status(404);
    throw new Error('Talaba topilmadi');
  }

  // RBAC: Teacher faqat o'z guruhidagi o'quvchini ko'radi
  const currentUser = req.user;
  if (currentUser.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: currentUser._id });
    if (!teacherProfile) {
      res.status(404);
      throw new Error('O\'qituvchi profili topilmadi.');
    }
    // Talaba guruhga tegishli bo'lsa va o'qituvchi o'sha guruhning o'qituvchisi bo'lsa
    if (!student.group || student.group.teacher.toString() !== teacherProfile._id.toString()) {
      res.status(403);
      throw new Error('Bu talabani ko\'rish uchun ruxsat yo\'q. Faqat o\'z guruhlaringizdagi talabalarni ko\'ra olasiz.');
    }
  }

  res.json(student);
});

// PUT /api/students/:id - Talabani yangilash
// PUT /api/students/:id - Talabani yangilash
const updateStudent = asyncHandler(async (req, res) => {
  const { firstName, lastName, birthDate, phoneNumber, group, status, isActive } = req.body;

  const student = await Student.findById(req.params.id);

  if (!student) {
    res.status(404);
    throw new Error('Talaba topilmadi');
  }

  // Telefon raqami duplicate tekshiruvi
  if (phoneNumber && phoneNumber !== student.phoneNumber) {
    const phoneExists = await Student.findOne({ phoneNumber });
    if (phoneExists) {
      res.status(400);
      throw new Error('Bu telefon raqami allaqachon tizimda ro‘yxatdan o‘tgan.');
    }
  }

  const oldGroupId = student.group?.toString();
  const newGroupId = group?.toString();

  // Agar group o'zgargan bo'lsa
  if (group && newGroupId !== oldGroupId) {
    const existingGroup = await Group.findById(group);
    if (!existingGroup) {
      res.status(400);
      throw new Error("Yangi belgilangan guruh topilmadi.");
    }

    // 1️⃣ Eski guruhdan studentni olib tashlash
    if (oldGroupId) {
      await Group.findByIdAndUpdate(oldGroupId, {
        $pull: { students: student._id }
      });
    }

    // 2️⃣ Yangi guruhga studentni qo‘shish
    await Group.findByIdAndUpdate(newGroupId, {
      $addToSet: { students: student._id } // duplicate bo'lmasligi uchun
    });

    student.group = newGroupId;
  }

  // Agar group null qilib yuborilsa
  if (group === null && oldGroupId) {
    await Group.findByIdAndUpdate(oldGroupId, {
      $pull: { students: student._id }
    });
    student.group = null;
  }

  // Oddiy fieldlar
  student.firstName = firstName ?? student.firstName;
  student.lastName = lastName ?? student.lastName;
  student.birthDate = birthDate ?? student.birthDate;
  student.phoneNumber = phoneNumber ?? student.phoneNumber;
  student.status = status ?? student.status;
  student.isActive = isActive ?? student.isActive;

  const updatedStudent = await student.save();

  res.json(updatedStudent);
});
  

// DELETE /api/students/:id - Talabani o'chirish
const deleteStudent = asyncHandler(async (req, res) => {
  const student = await Student.findById(req.params.id);

  if (!student) {
    res.status(404);
    throw new Error('Talaba topilmadi');
  }

  // if (student.branch.toString() !== req.user.branch.toString()) {
  //   res.status(403);
  //   throw new Error("Siz boshqa filial talabasini o'chirishga ruxsatga ega emassiz.");
  // }

  await Student.deleteOne({ _id: req.params.id });
  res.json({ message: 'Talaba muvaffaqiyatli o‘chirildi' });
});

module.exports = {
  getStudents,
  createStudent,
  getStudentById,
  updateStudent,
  deleteStudent,
};
