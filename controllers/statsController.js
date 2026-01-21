const asyncHandler = require('express-async-handler');
const Teacher = require('../models/TeacherModel');
const Group = require('../models/GroupModel');
const Student = require('../models/StudentModel');
const Payment = require('../models/PaymentModel');
const Course = require('../models/CourseModel');
const Attendance = require('../models/AttendanceModel');
const ManagerProfile = require('../models/ManagerProfileModel');
const AdminProfile = require('../models/AdminProfileModel');
const EmployeePayment = require('../models/EmployeePaymentModel');

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

    const studentIds = groupStudents.map((s) => s._id);
    const paymentsAgg = await Payment.aggregate([
      { $match: { group: group._id, student: { $in: studentIds } } },
      { $group: { _id: '$student', totalPaid: { $sum: '$amount' } } },
    ]);
    const paymentMap = {};
    paymentsAgg.forEach((p) => (paymentMap[p._id.toString()] = p.totalPaid));

    let groupPaid = 0;
    let groupUnpaid = 0;
    let groupExpected = coursePrice * groupStudents.length;
    let groupPaidAmount = 0;

    for (const student of groupStudents) {
      totalStudents++;
      const paid = paymentMap[student._id.toString()] || 0;
      groupPaidAmount += paid;
      totalPaidAmount += paid;

      const isPaid = paid >= coursePrice;
      if (isPaid) {
        paidStudents++;
        groupPaid++;
      } else {
        unpaidStudents++;
        groupUnpaid++;
      }
    }
    totalExpectedPayment += groupExpected;

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

  const studentIds = students.map((s) => s._id);
  const paymentsAgg = await Payment.aggregate([
    { $match: { group: group._id, student: { $in: studentIds } } },
    { $group: { _id: '$student', totalPaid: { $sum: '$amount' } } },
  ]);
  const paymentMap = {};
  paymentsAgg.forEach((p) => (paymentMap[p._id.toString()] = p.totalPaid));
  
  let paidStudents = 0;
  let unpaidStudents = 0;
  let totalExpectedPayment = students.length * coursePrice;
  let totalPaidAmount = 0;
  const studentDetails = [];

  for (const student of students) {
    const totalPaid = paymentMap[student._id.toString()] || 0;
    totalPaidAmount += totalPaid;

    const isPaid = totalPaid >= coursePrice;
    
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

// @desc    Umumiy o'quvchilar statistikasi
// @route   GET /api/stats/students
// @access  Private (Admin, Director, Accountant, Manager)
const getStudentsStats = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  if (!['Director', 'Admin', 'Accountant', 'Manager'].includes(currentUser.role)) {
    res.status(403);
    throw new Error('O\'quvchilar statistikasini ko\'rish uchun ruxsat yo\'q.');
  }

  // Barcha talabalar statistikasi
  const allStudents = await Student.find({});
  const activeStudents = allStudents.filter(s => s.status === 'Active').length;
  const pendingStudents = allStudents.filter(s => s.status === 'Pending').length;
  const droppedStudents = allStudents.filter(s => s.status === 'Dropped').length;
  const graduatedStudents = allStudents.filter(s => s.status === 'Graduated').length;

  // To'lovlar statistikasi
  const payments = await Payment.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalPaidAmount = payments[0]?.total || 0;

  // Qarz statistikasi
  const debtStudents = allStudents.filter(s => s.debt < 0);
  const totalDebt = debtStudents.reduce((sum, s) => sum + Math.abs(s.debt), 0);
  const paidStudents = allStudents.filter(s => s.debt >= 0 || (s.debt < 0 && Math.abs(s.debt) <= 10000)).length;
  const unpaidStudents = allStudents.length - paidStudents;

  // Guruh bo'yicha statistika
  const groups = await Group.find({})
    .populate('course', 'name price')
    .select('name course students');

  const byGroup = [];
  for (const group of groups) {
    const groupStudents = await Student.find({ group: group._id, status: 'Active' });
    const groupPayments = await Payment.aggregate([
      { $match: { group: group._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const groupPaid = groupStudents.filter(s => s.debt >= 0 || (s.debt < 0 && Math.abs(s.debt) <= 10000)).length;
    const groupDebt = groupStudents.filter(s => s.debt < 0).reduce((sum, s) => sum + Math.abs(s.debt), 0);

    byGroup.push({
      groupId: group._id,
      groupName: group.name,
      totalStudents: groupStudents.length,
      paidStudents: groupPaid,
      unpaidStudents: groupStudents.length - groupPaid,
      totalPaid: groupPayments[0]?.total || 0,
      totalDebt: groupDebt,
    });
  }

  res.status(200).json({
    summary: {
      totalStudents: allStudents.length,
      activeStudents,
      pendingStudents,
      droppedStudents,
      graduatedStudents,
      totalPaidAmount,
      totalDebt,
      paidStudents,
      unpaidStudents,
    },
    byGroup,
  });
});

// @desc    Umumiy statistika (summary)
// @route   GET /api/stats/summary
// @access  Private (Admin, Director, Accountant)
const getSummaryStats = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  if (!['Director', 'Admin', 'Accountant'].includes(currentUser.role)) {
    res.status(403);
    throw new Error('Umumiy statistikani ko\'rish uchun ruxsat yo\'q.');
  }

  // Students
  const allStudents = await Student.find({});
  const activeStudents = allStudents.filter(s => s.status === 'Active').length;
  const pendingStudents = allStudents.filter(s => s.status === 'Pending').length;
  const droppedStudents = allStudents.filter(s => s.status === 'Dropped').length;
  const graduatedStudents = allStudents.filter(s => s.status === 'Graduated').length;
  const paidStudentsCount = allStudents.filter(s => s.debt >= 0 || (s.debt < 0 && Math.abs(s.debt) <= 10000)).length;
  const unpaidStudentsCount = allStudents.length - paidStudentsCount;

  const studentPayments = await Payment.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const totalPaid = studentPayments[0]?.total || 0;
  const totalDebt = allStudents.filter(s => s.debt < 0).reduce((sum, s) => sum + Math.abs(s.debt), 0);

  // Teachers
  const teachers = await Teacher.find({});
  const totalTeacherSalary = teachers.reduce((sum, t) => sum + (t.salary || 0), 0);
  
  // Employee payments
  const EmployeePayment = require('../models/EmployeePaymentModel');
  const teacherPayments = await EmployeePayment.aggregate([
    { $match: { category: 'teacherSalary' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  const paidTeacherSalary = teacherPayments[0]?.total || 0;

  // Groups
  const allGroups = await Group.find({});
  const activeGroups = allGroups.filter(g => g.status === 'Active').length;
  const pendingGroups = allGroups.filter(g => g.status === 'Pending').length;
  const completedGroups = allGroups.filter(g => g.status === 'Completed').length;

  // Finance
  const totalIncome = totalPaid;
  const managers = await ManagerProfile.find({});
  const admins = await AdminProfile.find({});
  const totalExpense = totalTeacherSalary + 
    managers.reduce((sum, m) => sum + (m.salary || 0), 0) +
    admins.reduce((sum, a) => sum + (a.salary || 0), 0);

  res.status(200).json({
    students: {
      total: allStudents.length,
      active: activeStudents,
      pending: pendingStudents,
      dropped: droppedStudents,
      graduated: graduatedStudents,
      paidCount: paidStudentsCount,
      unpaidCount: unpaidStudentsCount,
      totalPaid,
      totalDebt,
    },
    teachers: {
      total: teachers.length,
      totalSalary: totalTeacherSalary,
      paidSalary: paidTeacherSalary,
      unpaidSalary: totalTeacherSalary - paidTeacherSalary,
    },
    groups: {
      total: allGroups.length,
      active: activeGroups,
      pending: pendingGroups,
      completed: completedGroups,
    },
    finance: {
      totalIncome,
      totalExpense,
      profit: totalIncome - totalExpense,
    },
  });
});

module.exports = {
  getTeacherStats,
  getGroupStats,
  getEmployeeStats,
  getStudentsStats,
  getSummaryStats,
};
