const asyncHandler = require('express-async-handler');
const Teacher = require('../models/TeacherModel');
const Group = require('../models/GroupModel');
const Student = require('../models/StudentModel');
const Payment = require('../models/PaymentModel');
const Course = require('../models/CourseModel');
const Attendance = require('../models/AttendanceModel');
const ManagerProfile = require('../models/ManagerProfileModel');
const AdminProfile = require('../models/AdminProfileModel');

// @desc    O'qituvchi statistikasi (o'z guruhlari va o'quvchilari)
// @route   GET /api/stats/teacher/:teacherId
// @access  Private (Teacher o'zi yoki Director/Manager/Admin)
const getTeacherStats = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  const currentUser = req.user;

  // Teacher profilini topish
  const teacher = await Teacher.findById(teacherId).populate('user');
  if (!teacher) {
    res.status(404);
    throw new Error('O\'qituvchi profili topilmadi.');
  }

  // RBAC: Teacher faqat o'z statistikasini ko'radi
  const isOwner = currentUser._id.toString() === teacher.user._id.toString();
  const isAuthorized = ['Director', 'Manager', 'Admin'].includes(currentUser.role);
  
  if (!isOwner && !isAuthorized) {
    res.status(403);
    throw new Error('Bu statistikani ko\'rish uchun ruxsat yo\'q.');
  }

  // O'qituvchining barcha guruhlarini olish
  const groups = await Group.find({ teacher: teacherId })
    .populate('course', 'name price')
    .populate('students');

  let totalStudents = 0;
  let paidStudents = 0; // To'laganlar (debt >= 0 yoki debt < 0 va to'lov qilingan)
  let unpaidStudents = 0; // To'lamaganlar (debt < 0 va mutlaq qiymati katta)
  let totalExpectedPayment = 0; // Jami to'lanishi kerak bo'lgan summa
  let totalPaidAmount = 0; // Jami to'langan summa
  let groupStats = [];

  for (const group of groups) {
    const groupStudents = await Student.find({ group: group._id, status: 'Active' });
    const coursePrice = group.course?.price || 0;
    
    let groupPaid = 0;
    let groupUnpaid = 0;
    let groupExpected = 0;
    let groupPaidAmount = 0;

    for (const student of groupStudents) {
      totalStudents++;
      groupExpected += coursePrice;
      totalExpectedPayment += coursePrice;

      // Student to'lovlarini hisoblash
      const studentPayments = await Payment.find({ student: student._id, group: group._id });
      const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
      groupPaidAmount += totalPaid;
      totalPaidAmount += totalPaid;

      // Debt < 0 va mutlaq qiymati katta bo'lsa, to'lamagan deb hisoblaymiz
      // Debt >= 0 yoki to'lov qilingan bo'lsa, to'lagan deb hisoblaymiz
      if (student.debt < 0 && Math.abs(student.debt) > 10000) {
        // Qarz katta (to'lamagan)
        unpaidStudents++;
        groupUnpaid++;
      } else {
        // To'lagan yoki qarzi yo'q
        paidStudents++;
        groupPaid++;
      }
    }

    groupStats.push({
      groupId: group._id,
      groupName: group.name,
      courseName: group.course?.name || 'Noma\'lum',
      coursePrice,
      totalStudents: groupStudents.length,
      paidStudents: groupPaid,
      unpaidStudents: groupUnpaid,
      expectedPayment: groupExpected,
      paidAmount: groupPaidAmount,
      remainingAmount: groupExpected - groupPaidAmount,
    });
  }

  res.status(200).json({
    teacher: {
      _id: teacher._id,
      name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      email: teacher.user.email,
    },
    summary: {
      totalGroups: groups.length,
      totalStudents,
      paidStudents,
      unpaidStudents,
      totalExpectedPayment,
      totalPaidAmount,
      totalRemainingAmount: totalExpectedPayment - totalPaidAmount,
    },
    groupStats,
  });
});

// @desc    Guruh statistikasi
// @route   GET /api/stats/group/:groupId
// @access  Private (Teacher o'z guruhini, Director/Manager/Admin hammasini ko'radi)
const getGroupStats = asyncHandler(async (req, res) => {
  const { groupId } = req.params;
  const currentUser = req.user;

  const group = await Group.findById(groupId)
    .populate('course', 'name price')
    .populate('teacher', 'user')
    .populate('students');

  if (!group) {
    res.status(404);
    throw new Error('Guruh topilmadi.');
  }

  // RBAC: Teacher faqat o'z guruhini ko'radi
  const teacherProfile = await Teacher.findOne({ user: currentUser._id });
  const isGroupTeacher = teacherProfile && teacherProfile._id.toString() === group.teacher._id.toString();
  const isAuthorized = ['Director', 'Manager', 'Admin'].includes(currentUser.role);

  if (!isGroupTeacher && !isAuthorized) {
    res.status(403);
    throw new Error('Bu guruh statistikasini ko\'rish uchun ruxsat yo\'q.');
  }

  const students = await Student.find({ group: groupId, status: 'Active' });
  const coursePrice = group.course?.price || 0;
  
  let paidStudents = 0;
  let unpaidStudents = 0;
  let totalExpectedPayment = students.length * coursePrice;
  let totalPaidAmount = 0;
  const studentDetails = [];

  for (const student of students) {
    const studentPayments = await Payment.find({ student: student._id, group: groupId });
    const totalPaid = studentPayments.reduce((sum, p) => sum + p.amount, 0);
    totalPaidAmount += totalPaid;

    const isPaid = student.debt >= 0 || (student.debt < 0 && Math.abs(student.debt) <= 10000);
    
    if (isPaid) {
      paidStudents++;
    } else {
      unpaidStudents++;
    }

    studentDetails.push({
      _id: student._id,
      firstName: student.firstName,
      lastName: student.lastName,
      phoneNumber: student.phoneNumber,
      debt: student.debt,
      totalPaid,
      expectedPayment: coursePrice,
      remainingAmount: coursePrice - totalPaid,
      status: isPaid ? 'paid' : 'unpaid',
    });
  }

  res.status(200).json({
    group: {
      _id: group._id,
      name: group.name,
      courseName: group.course?.name || 'Noma\'lum',
      coursePrice,
      teacher: `${group.teacher.user.firstName} ${group.teacher.user.lastName}`,
    },
    summary: {
      totalStudents: students.length,
      paidStudents,
      unpaidStudents,
      totalExpectedPayment,
      totalPaidAmount,
      totalRemainingAmount: totalExpectedPayment - totalPaidAmount,
    },
    students: studentDetails,
  });
});

// @desc    Xodimlar maoshlari statistikasi
// @route   GET /api/stats/employees
// @access  Private (Director/Admin)
const getEmployeeStats = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  if (!['Director', 'Admin'].includes(currentUser.role)) {
    res.status(403);
    throw new Error('Xodimlar statistikasini ko\'rish uchun ruxsat yo\'q.');
  }

  const teachers = await Teacher.find({}).populate('user', 'firstName lastName email');
  const managers = await ManagerProfile.find({}).populate('user', 'firstName lastName email');
  const admins = await AdminProfile.find({}).populate('user', 'firstName lastName email');

  const employeeStats = {
    teachers: teachers.map(t => ({
      _id: t._id,
      name: `${t.user.firstName} ${t.user.lastName}`,
      email: t.user.email,
      salary: t.salary,
      role: 'Teacher',
    })),
    managers: managers.map(m => ({
      _id: m._id,
      name: `${m.user.firstName} ${m.user.lastName}`,
      email: m.user.email,
      salary: m.salary,
      role: 'Manager',
    })),
    admins: admins.map(a => ({
      _id: a._id,
      name: `${a.user.firstName} ${a.user.lastName}`,
      email: a.user.email,
      salary: a.salary,
      role: 'Admin',
    })),
  };

  const totalSalary = 
    teachers.reduce((sum, t) => sum + (t.salary || 0), 0) +
    managers.reduce((sum, m) => sum + (m.salary || 0), 0) +
    admins.reduce((sum, a) => sum + (a.salary || 0), 0);

  res.status(200).json({
    summary: {
      totalEmployees: teachers.length + managers.length + admins.length,
      totalTeachers: teachers.length,
      totalManagers: managers.length,
      totalAdmins: admins.length,
      totalMonthlySalary: totalSalary,
    },
    employees: employeeStats,
  });
});

module.exports = {
  getTeacherStats,
  getGroupStats,
  getEmployeeStats,
};
