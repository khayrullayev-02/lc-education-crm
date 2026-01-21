const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Attendance = require('../models/AttendanceModel');
const Group = require('../models/GroupModel');
const Student = require('../models/StudentModel');
const Teacher = require('../models/TeacherModel');

// RBAC helper: Teacher faqat o'z guruhiga ishlay oladi, boshqalar (Admin/Director/Manager) hammasini ko'radi
const assertTeacherOwnsGroup = async (user, groupDoc) => {
  if (['Admin', 'Director', 'Manager'].includes(user.role)) return;
  if (user.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: user._id });
    if (!teacherProfile || teacherProfile._id.toString() !== groupDoc.teacher._id.toString()) {
      const err = new Error('Bu guruhga ruxsat yo\'q (faqat o\'z guruhlaringiz).');
      err.statusCode = 403;
      throw err;
    }
  }
};

// @desc    CREATE/UPDATE attendance bulk (table save)
// @route   POST /api/attendance/bulk
// @access  Teacher (own group) + Admin/Director/Manager
const bulkUpsertAttendance = asyncHandler(async (req, res) => {
  // Accept legacy keys: groupId/group, studentId/student
  const bodyGroupId = req.body.groupId || req.body.group;
  const { date, records } = req.body;
  const groupId = bodyGroupId;
  
  // Validate required fields
  if (!groupId) {
    res.status(400);
    throw new Error('groupId majburiy.');
  }
  if (!date) {
    res.status(400);
    throw new Error('date majburiy.');
  }
  if (!records || !Array.isArray(records)) {
    res.status(400);
    throw new Error('records majburiy va array bo\'lishi kerak.');
  }
  if (records.length === 0) {
    res.status(400);
    throw new Error('records bo\'sh bo\'lmasligi kerak.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400);
    throw new Error('Sana formati YYYY-MM-DD bo\'lishi kerak.');
  }

  // Validate each record
  const validStatuses = ['present', 'absent', 'excused', 'late'];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const studentId = rec.studentId || rec.student;
    if (!studentId) {
      res.status(400);
      throw new Error(`Record ${i + 1}: studentId majburiy.`);
    }
    if (!rec.status) {
      res.status(400);
      throw new Error(`Record ${i + 1}: status majburiy.`);
    }
    if (!validStatuses.includes(rec.status)) {
      res.status(400);
      throw new Error(`Record ${i + 1}: status faqat ${validStatuses.join(', ')} bo'lishi mumkin. Berilgan: "${rec.status}"`);
    }
    // Validate studentId format
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      res.status(400);
      throw new Error(`Record ${i + 1}: studentId formati yaroqsiz.`);
    }
  }

  // Validate groupId format
  if (!mongoose.Types.ObjectId.isValid(groupId)) {
    res.status(400);
    throw new Error('groupId formati yaroqsiz.');
  }

  const groupDoc = await Group.findById(groupId).populate({
    path: 'teacher',
    populate: { path: 'user', select: '_id firstName lastName role' },
  });
  if (!groupDoc) {
    res.status(404);
    throw new Error('Guruh topilmadi.');
  }

  await assertTeacherOwnsGroup(req.user, groupDoc);
  const teacherUserId = groupDoc.teacher?.user?._id;
  if (!teacherUserId) {
    res.status(400);
    throw new Error('Guruh uchun o\'qituvchi user bog\'lanmagan.');
  }

  // De-duplicate by (studentId + date) inside the same payload to avoid E11000 errors
  const dedupMap = new Map();
  records.forEach((rec) => {
    const studentId = rec.studentId || rec.student;
    const key = `${studentId}|${date}`;
    dedupMap.set(key, { ...rec, studentId });
  });
  const dedupedRecords = Array.from(dedupMap.values());

  // Create bulk operations
  const ops = dedupedRecords.map((rec) => ({
    updateOne: {
      filter: {
        date,
        $or: [
          {
            groupId: new mongoose.Types.ObjectId(groupId),
            studentId: new mongoose.Types.ObjectId(rec.studentId),
          },
          {
            group: new mongoose.Types.ObjectId(groupId),
            student: new mongoose.Types.ObjectId(rec.studentId),
          },
        ],
      },
      update: {
        $set: {
          teacherId: teacherUserId,
          status: rec.status,
          reason: rec.reason || '',
          // write both schemas to avoid null group in legacy indexes
          groupId: new mongoose.Types.ObjectId(groupId),
          studentId: new mongoose.Types.ObjectId(rec.studentId),
          group: new mongoose.Types.ObjectId(groupId),
          student: new mongoose.Types.ObjectId(rec.studentId),
        },
      },
      upsert: true,
    },
  }));

  try {
    const result = await Attendance.bulkWrite(ops, { ordered: false });
    
    const updated = await Attendance.find({ groupId, date })
      .populate('studentId', 'firstName lastName')
      .lean();

    res.status(200).json({
      message: 'Davomat saqlandi (bulk upsert).',
      count: updated.length,
      records: updated,
      bulkWriteResult: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      },
    });
  } catch (error) {
    console.error('Bulk write error:', error);
    const message = error.message || 'Davomatni saqlashda xato';
    // Duplicate key or validation errors should still surface as client-friendly 400
    return res.status(400).json({ message });
  }
});

// @desc    Attendance table for UI (students x dates)
// @route   GET /api/attendance/table/:groupId?month=YYYY-MM
// @access  Teacher (own group) + Admin/Director/Manager
const getAttendanceTable = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const { month } = req.query; // YYYY-MM

  const groupDoc = await Group.findById(groupId).populate({
    path: 'teacher',
    populate: { path: 'user', select: '_id firstName lastName role' },
  });
  if (!groupDoc) {
    res.status(404);
    throw new Error('Guruh topilmadi.');
  }
  await assertTeacherOwnsGroup(req.user, groupDoc);

  const students = await Student.find({ group: groupId, status: { $ne: 'Dropped' } })
    .select('firstName lastName')
    .lean();

  const query = { groupId };
  if (month) query.date = { $regex: `^${month}` };

  const attendances = await Attendance.find(query)
    .select('studentId date status reason')
    .lean();

  const attendanceMap = {};
  attendances.forEach((a) => {
    const sId = a.studentId.toString();
    if (!attendanceMap[sId]) attendanceMap[sId] = {};
    attendanceMap[sId][a.date] = { status: a.status, reason: a.reason };
  });

  const response = {
    students: students.map((s) => ({
      studentId: s._id,
      fullName: `${s.firstName} ${s.lastName}`,
      attendance: attendanceMap[s._id.toString()] || {},
    })),
  };

  res.status(200).json(response);
});

// @desc    Get attendance by date for group
// @route   GET /api/attendance/group/:groupId/date/:date
// @access  Teacher (own group) + Admin/Director/Manager
const getAttendanceByDate = asyncHandler(async (req, res) => {
  const { groupId, date } = req.params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400);
    throw new Error('Sana formati noto\'g\'ri (YYYY-MM-DD).');
  }

  const groupDoc = await Group.findById(groupId).populate({
    path: 'teacher',
    populate: { path: 'user', select: '_id role' },
  });
  if (!groupDoc) {
    res.status(404);
    throw new Error('Guruh topilmadi.');
  }
  await assertTeacherOwnsGroup(req.user, groupDoc);

  // Guruhda barcha talabalarni olish
  const students = await Student.find({ group: groupId, status: { $ne: 'Dropped' } })
    .select('firstName lastName phoneNumber')
    .lean();

  // Mavjud davomatlarni olish
  const attendances = await Attendance.find({ groupId, date })
    .populate('studentId', 'firstName lastName phoneNumber')
    .lean();

  // Attendance map yaratish
  const attendanceMap = {};
  attendances.forEach(a => {
    if (a.studentId) {
      attendanceMap[a.studentId._id.toString()] = a;
    }
  });

  // Barcha talabalar uchun davomat ro'yxatini shakllantirish
  const result = students.map(student => {
    const existing = attendanceMap[student._id.toString()];
    if (existing) {
      return existing;
    }
    // Davomat yo'q bo'lsa, default qiymat qaytarish
    return {
      _id: null,
      groupId,
      studentId: student,
      date,
      status: null, // Hali belgilanmagan
      reason: '',
    };
  });

  res.status(200).json(result);
});

// @desc    Delete attendance record (Admin/Director)
// @route   DELETE /api/attendance/:id
// @access  Admin/Director
const deleteAttendance = asyncHandler(async (req, res) => {
  if (!['Admin', 'Director'].includes(req.user.role)) {
    res.status(403);
    throw new Error('Faqat Admin/Director o\'chira oladi.');
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400);
    throw new Error('Attendance ID yaroqsiz.');
  }
  const deleted = await Attendance.findByIdAndDelete(req.params.id);
  if (!deleted) {
    res.status(404);
    throw new Error('Attendance topilmadi.');
  }
  res.json({ message: 'Attendance o\'chirildi', id: req.params.id });
});

module.exports = {
  bulkUpsertAttendance,
  getAttendanceTable,
  getAttendanceByDate,
  deleteAttendance,
};
