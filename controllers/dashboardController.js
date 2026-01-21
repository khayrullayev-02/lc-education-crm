const asyncHandler = require('express-async-handler');
const User = require('../models/UserModel');
const Group = require('../models/GroupModel');
const Student = require('../models/StudentModel');
const Teacher = require('../models/TeacherModel');
const Payment = require('../models/PaymentModel');
const Attendance = require('../models/AttendanceModel');
const Course = require('../models/CourseModel');
const ManagerProfile = require('../models/ManagerProfileModel');
const AdminProfile = require('../models/AdminProfileModel');
const EmployeePayment = require('../models/EmployeePaymentModel');

// @desc    Admin/Director Dashboard
// @route   GET /api/dashboard/admin
// @access  Private (Director, Admin)
const getAdminDashboard = asyncHandler(async (req, res) => {
  const [totalUsers, totalGroups, totalStudents, totalTeachers, totalManagers, payments, expenses] = await Promise.all([
    User.countDocuments({}),
    Group.countDocuments({}),
    Student.countDocuments({}),
    Teacher.countDocuments({}),
    ManagerProfile.countDocuments({}),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    // Expenses: salaries
    Promise.all([
      Teacher.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]),
      ManagerProfile.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]),
      AdminProfile.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]),
    ]),
  ]);

  const totalIncome = payments[0]?.total || 0;
  const totalExpense = expenses.reduce((sum, arr) => sum + (arr[0]?.total || 0), 0);

  // Monthly income (last 6 months)
  const monthlyIncome = await Payment.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } },
        amount: { $sum: '$amount' },
      },
    },
    { $sort: { '_id': -1 } },
    { $limit: 6 },
  ]);
  const monthlyIncomeFormatted = monthlyIncome.map(item => ({
    month: item._id,
    amount: item.amount,
  }));

  // Recent payments (last 10)
  const recentPayments = await Payment.find({})
    .populate('student', 'firstName lastName')
    .populate('group', 'name')
    .sort({ paymentDate: -1 })
    .limit(10)
    .select('amount type paymentDate student group');

  const recentPaymentsFormatted = recentPayments.map(p => ({
    _id: p._id,
    student: p.student,
    amount: p.amount,
    date: p.paymentDate.toISOString().split('T')[0],
    type: p.type,
  }));

  // Student stats
  const allStudents = await Student.find({});
  const paidStudents = allStudents.filter(s => s.debt >= 0 || (s.debt < 0 && Math.abs(s.debt) <= 10000)).length;
  const unpaidStudents = allStudents.length - paidStudents;
  const totalDebt = allStudents.filter(s => s.debt < 0).reduce((sum, s) => sum + Math.abs(s.debt), 0);

  // Group stats
  const allGroups = await Group.find({});
  const activeGroups = allGroups.filter(g => g.status === 'Active').length;
  const pendingGroups = allGroups.filter(g => g.status === 'Pending').length;
  const completedGroups = allGroups.filter(g => g.status === 'Completed').length;

  res.status(200).json({
    totalUsers,
    totalGroups,
    totalStudents,
    totalTeachers,
    totalManagers,
    totalIncome,
    totalExpense,
    profit: totalIncome - totalExpense,
    monthlyIncome: monthlyIncomeFormatted,
    recentPayments: recentPaymentsFormatted,
    studentStats: {
      totalStudents,
      paidStudents,
      unpaidStudents,
      totalPaidAmount: totalIncome,
      totalDebt,
    },
    groupStats: {
      totalGroups,
      activeGroups,
      pendingGroups,
      completedGroups,
    },
  });
});

// @desc    Manager Dashboard
// @route   GET /api/dashboard/manager
// @access  Private (Manager)
const getManagerDashboard = asyncHandler(async (req, res) => {
  const [totalGroups, totalStudents, payments] = await Promise.all([
    Group.countDocuments({}),
    Student.countDocuments({}),
    Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);

  const totalIncome = payments[0]?.total || 0;

  res.status(200).json({
    totalGroups,
    totalStudents,
    totalIncome,
  });
});

// @desc    Teacher Dashboard
// @route   GET /api/dashboard/teacher
// @access  Private (Teacher)
const getTeacherDashboard = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  // Find teacher profile
  const teacherProfile = await Teacher.findOne({ user: currentUser._id });
  if (!teacherProfile) {
    res.status(404);
    throw new Error('O\'qituvchi profili topilmadi.');
  }

  // Get teacher's groups
  const groups = await Group.find({ teacher: teacherProfile._id })
    .populate('course', 'name')
    .select('name course students');

  const myGroups = groups.map(g => ({
    _id: g._id,
    name: g.name,
    totalStudents: g.students?.length || 0,
    courseName: g.course?.name || 'Noma\'lum',
  }));

  // Total students in teacher's groups
  const myStudents = await Student.countDocuments({
    group: { $in: groups.map(g => g._id) },
    status: 'Active',
  });

  // Today's attendance
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todayAttendance = await Attendance.countDocuments({
    teacherId: currentUser._id,
    date: today,
    status: 'present',
  });

  // Pending payments (students with debt in teacher's groups)
  const pendingPayments = await Student.countDocuments({
    group: { $in: groups.map(g => g._id) },
    debt: { $lt: 0 },
    status: 'Active',
  });

  // Teacher stats
  let totalPaidStudents = 0;
  let totalUnpaidStudents = 0;
  for (const group of groups) {
    const groupStudents = await Student.find({ group: group._id, status: 'Active' });
    for (const student of groupStudents) {
      if (student.debt < 0 && Math.abs(student.debt) > 10000) {
        totalUnpaidStudents++;
      } else {
        totalPaidStudents++;
      }
    }
  }

  res.status(200).json({
    myGroups,
    myStudents,
    todayAttendance,
    pendingPayments,
    myStats: {
      totalGroups: groups.length,
      totalStudents: myStudents,
      paidStudents: totalPaidStudents,
      unpaidStudents: totalUnpaidStudents,
    },
  });
});

// @desc    Student Dashboard
// @route   GET /api/dashboard/student
// @access  Private (Student)
const getStudentDashboard = asyncHandler(async (req, res) => {
  const currentUser = req.user;

  // Find student by user ID (assuming Student model has user field, or find by phone/email)
  // For now, let's find by matching user info
  const student = await Student.findOne({
    $or: [
      { phoneNumber: currentUser.email }, // If email matches phone
      // Add other matching logic if needed
    ],
  }).populate('group', 'name course teacher');

  if (!student) {
    // If no student found, return empty dashboard
    return res.status(200).json({
      myGroups: [],
      myPayments: [],
      myDebt: 0,
      myAttendance: [],
    });
  }

  // Get student's groups
  const myGroups = student.group ? [{
    _id: student.group._id,
    name: student.group.name,
    courseName: student.group.course?.name || 'Noma\'lum',
  }] : [];

  // Get student's payments
  const myPayments = await Payment.find({ student: student._id })
    .populate('group', 'name')
    .sort({ paymentDate: -1 })
    .select('amount type paymentDate group');

  // Get student's attendance
  const myAttendance = await Attendance.find({ studentId: student._id })
    .populate('groupId', 'name')
    .sort({ date: -1 })
    .limit(30)
    .select('date status reason groupId');

  res.status(200).json({
    myGroups,
    myPayments,
    myDebt: student.debt || 0,
    myAttendance,
  });
});

// @desc    Accountant Dashboard (minimal stats)
// @route   GET /api/dashboard/accountant
// @access  Private (Accountant, Admin, Director)
const getAccountantDashboard = asyncHandler(async (req, res) => {
  // Total students
  const totalStudents = await Student.countDocuments({});

  // Total income from payments
  const incomeAgg = await Payment.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalIncome = incomeAgg[0]?.total || 0;

  // Total expense from base salaries and employee payments
  const [teacherSalaries, managerSalaries, adminSalaries, employeePaymentAgg] =
    await Promise.all([
      Teacher.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]),
      ManagerProfile.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]),
      AdminProfile.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]),
      EmployeePayment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

  const baseSalariesTotal =
    (teacherSalaries[0]?.total || 0) +
    (managerSalaries[0]?.total || 0) +
    (adminSalaries[0]?.total || 0);

  const employeePaymentsTotal = employeePaymentAgg[0]?.total || 0;

  const totalExpense = baseSalariesTotal + employeePaymentsTotal;

  res.status(200).json({
    totalIncome,
    totalExpense,
    profit: totalIncome - totalExpense,
    totalStudents,
  });
});

module.exports = {
  getAdminDashboard,
  getManagerDashboard,
  getTeacherDashboard,
  getStudentDashboard,
  getAccountantDashboard,
};
