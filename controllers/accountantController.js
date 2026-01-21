const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Payment = require('../models/PaymentModel');
const Student = require('../models/StudentModel');
const Teacher = require('../models/TeacherModel');
const Group = require('../models/GroupModel');
const Course = require('../models/CourseModel');
const Attendance = require('../models/AttendanceModel');
const ManagerProfile = require('../models/ManagerProfileModel');
const AdminProfile = require('../models/AdminProfileModel');
const EmployeePayment = require('../models/EmployeePaymentModel');
const User = require('../models/UserModel');

// Helper to parse month range
const monthRange = (monthStr) => {
  // monthStr: YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(monthStr)) return {};
  const start = new Date(`${monthStr}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { $gte: start, $lt: end };
};

// Dashboard top statistics
// GET /api/accountant/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const [totalStudents, totalTeachers, totalGroups, totalCourses, incomeAgg, paymentAgg] =
    await Promise.all([
      Student.countDocuments({}),
      Teacher.countDocuments({}),
      Group.countDocuments({}),
      Course.countDocuments({}),
      Payment.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Payment.aggregate([
        { $group: { _id: { month: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } } }, total: { $sum: '$amount' } } },
      ]),
    ]);

  const totalIncome = incomeAgg[0]?.total || 0;

  // Expense: salaries only (teachers + managers + admins) — other categories 0 by default
  const teacherSalaries = await Teacher.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]);
  const managerSalaries = await ManagerProfile.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]);
  const adminSalaries = await AdminProfile.aggregate([{ $group: { _id: null, total: { $sum: '$salary' } } }]);
  const totalExpense =
    (teacherSalaries[0]?.total || 0) +
    (managerSalaries[0]?.total || 0) +
    (adminSalaries[0]?.total || 0);

  // Employee salaries from EmployeePayment
  const employeePaymentExpense = await EmployeePayment.aggregate([
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const employeePaymentTotal = employeePaymentExpense[0]?.total || 0;

  // Combine with salary expenses
  const totalExpenseWithPayments = totalExpense + employeePaymentTotal;

  // Get all students with their payments
  const allStudents = await Student.find({})
    .populate('group', 'name')
    .select('firstName lastName phoneNumber group debt status')
    .lean();

  // Calculate total paid for each student
  const studentsWithPayments = await Promise.all(
    allStudents.map(async (student) => {
      const studentPayments = await Payment.aggregate([
        { $match: { student: student._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      return {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        phoneNumber: student.phoneNumber,
        group: student.group,
        debt: student.debt || 0,
        totalPaid: studentPayments[0]?.total || 0,
        status: student.status,
      };
    })
  );

  res.status(200).json({
    totalStudents,
    totalTeachers,
    totalGroups,
    totalCourses,
    totalIncome,
    totalExpense: totalExpenseWithPayments,
    profit: totalIncome - totalExpenseWithPayments,
    employeeSalaries: {
      teachers: teacherSalaries[0]?.total || 0,
      managers: managerSalaries[0]?.total || 0,
      admins: adminSalaries[0]?.total || 0,
    },
    expenses: {
      rent: 0,
      advertising: 0,
      other: 0,
    },
    students: studentsWithPayments,
  });
});

// Student payment reports (monthly)
// GET /api/accountant/students/payments?month=YYYY-MM
const getStudentPayments = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const range = monthRange(month);

  const groups = await Group.find({})
    .populate('course', 'price name')
    .select('name course');

  const groupMap = {};
  groups.forEach((g) => (groupMap[g._id.toString()] = g));

  const payments = await Payment.aggregate([
    ...(range.$gte ? [{ $match: { paymentDate: range } }] : []),
    {
      $group: {
        _id: { student: '$student', group: '$group' },
        paidAmount: { $sum: '$amount' },
      },
    },
  ]);

  const studentIds = payments.map((p) => p._id.student);
  const students = await Student.find({ _id: { $in: studentIds } }).select('firstName lastName group debt');
  const studentMap = {};
  students.forEach((s) => (studentMap[s._id.toString()] = s));

  const report = payments.map((p) => {
    const student = studentMap[p._id.student.toString()];
    const group = groupMap[p._id.group.toString()];
    const coursePrice = group?.course?.price || 0;
    const debt = student?.debt ?? 0;
    const paymentStatus = p.paidAmount >= coursePrice ? 'paid' : 'unpaid';
    return {
      studentName: student ? `${student.firstName} ${student.lastName}` : 'N/A',
      groupName: group?.name || 'N/A',
      coursePrice,
      paidAmount: p.paidAmount,
      debt,
      paymentStatus,
    };
  });

  res.status(200).json(report);
});

// Teacher salary reports (attendance-based + fixed salary)
// GET /api/accountant/teachers/salary?month=YYYY-MM
const getTeacherSalary = asyncHandler(async (req, res) => {
  const { month } = req.query;
  const range = monthRange(month);
  const dateMatch = range.$gte ? { date: { $regex: `^${month}` } } : {};

  // Get all teachers
  const allTeachers = await Teacher.find({}).populate('user', 'firstName lastName _id');
  
  // Attendance per teacher
  const attendanceAgg = await Attendance.aggregate([
    { $match: dateMatch },
    { $group: { _id: { teacherId: '$teacherId', groupId: '$groupId' }, lessonsCount: { $sum: 1 } } },
  ]);

  // Group teacher mapping
  const teacherMap = {};
  allTeachers.forEach((t) => {
    if (t.user) {
      teacherMap[t.user._id.toString()] = t;
    }
  });

  // Group info for price
  const groupIds = [...new Set(attendanceAgg.map((a) => a._id.groupId))];
  const groups = await Group.find({ _id: { $in: groupIds } })
    .populate('course', 'price')
    .select('course students');
  const groupMap = {};
  groups.forEach((g) => (groupMap[g._id.toString()] = g));

  // Employee payments for each teacher (for the month)
  let employeePaymentMatch = { category: 'teacherSalary' };
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    employeePaymentMatch.paymentDate = { $gte: start, $lt: end };
  }

  const employeePayments = await EmployeePayment.find(employeePaymentMatch)
    .select('employeeId amount paymentDate description')
    .lean();

  // Group payments by employee
  const paymentsByEmployee = {};
  employeePayments.forEach((p) => {
    const empId = p.employeeId.toString();
    if (!paymentsByEmployee[empId]) {
      paymentsByEmployee[empId] = [];
    }
    paymentsByEmployee[empId].push({
      _id: p._id,
      amount: p.amount,
      paymentDate: p.paymentDate.toISOString().split('T')[0],
      description: p.description,
    });
  });

  const reportMap = {};
  
  // Initialize all teachers
  allTeachers.forEach((teacher) => {
    if (teacher.user) {
      const teacherId = teacher.user._id.toString();
      reportMap[teacherId] = {
        teacherId: teacherId,
        teacherName: `${teacher.user.firstName} ${teacher.user.lastName}`,
        groupsCount: 0,
        studentsCount: 0,
        lessonsCount: 0,
        baseSalary: teacher.salary || 0,
        payments: paymentsByEmployee[teacherId] || [],
        totalPaid: (paymentsByEmployee[teacherId] || []).reduce((sum, p) => sum + p.amount, 0),
        remainingSalary: 0,
      };
    }
  });

  // Update with attendance data
  attendanceAgg.forEach((rec) => {
    const teacherId = rec._id.teacherId.toString();
    const lessons = rec.lessonsCount;
    const group = groupMap[rec._id.groupId?.toString()];
    
    if (reportMap[teacherId]) {
      reportMap[teacherId].groupsCount += 1;
      reportMap[teacherId].lessonsCount += lessons;
      if (group) {
        reportMap[teacherId].studentsCount += group.students?.length || 0;
      }
    }
  });

  // Calculate remaining salary
  Object.values(reportMap).forEach((item) => {
    item.remainingSalary = Math.max(0, item.baseSalary - item.totalPaid);
  });

  const report = Object.values(reportMap);
  res.status(200).json(report);
});

// Income reports (aggregated by day & month for charts)
// GET /api/accountant/income?from=YYYY-MM-DD&to=YYYY-MM-DD
const getIncome = asyncHandler(async (req, res) => {
  const { from, to } = req.query;
  const match = {};
  if (from || to) {
    match.paymentDate = {};
    if (from) match.paymentDate.$gte = new Date(from);
    if (to) match.paymentDate.$lte = new Date(to);
  }

  // Aggregate income by day & month as required by accountant frontend:
  // [
  //   { _id: { day: 'YYYY-MM-DD', month: 'YYYY-MM' }, total: Number }
  // ]
  const income = await Payment.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
          month: { $dateToString: { format: '%Y-%m', date: '$paymentDate' } },
        },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.day': 1 } },
  ]);

  res.status(200).json(income);
});

// Expense reports (simplified categories)
// GET /api/accountant/expense?month=YYYY-MM
const getExpense = asyncHandler(async (req, res) => {
  const { month } = req.query;
  
  // Date range for month filter
  let dateMatch = {};
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    dateMatch.paymentDate = { $gte: start, $lt: end };
  }

  // Employee payments for the month
  const employeePayments = await EmployeePayment.find(dateMatch)
    .populate('employeeId', 'firstName lastName')
    .populate('paidBy', 'firstName lastName')
    .sort({ paymentDate: -1 })
    .select('employeeId employeeType amount paymentDate description category paidBy');

  // Calculate totals by category
  const categoryTotals = await EmployeePayment.aggregate([
    { $match: dateMatch },
    {
      $group: {
        _id: '$category',
        total: { $sum: '$amount' },
      },
    },
  ]);

  const categoryMap = {};
  categoryTotals.forEach(item => {
    categoryMap[item._id] = item.total;
  });

  // Total expense
  const totalExpenseAgg = await EmployeePayment.aggregate([
    { $match: dateMatch },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  const totalExpense = totalExpenseAgg[0]?.total || 0;

  res.status(200).json({
    month: month || 'all',
    totalExpense,
    categories: {
      teacherSalary: categoryMap['teacherSalary'] || 0,
      managerSalary: categoryMap['managerSalary'] || 0,
      adminSalary: categoryMap['adminSalary'] || 0,
      rent: 0,
      advertising: 0,
      other: 0,
    },
    employeePayments,
  });
});

// @desc    Xodimlarga pul berish
// @route   POST /api/accountant/employee-payment
// @access  Private (Accountant, Admin, Director)
const createEmployeePayment = asyncHandler(async (req, res) => {
  const { employeeId, employeeType, amount, paymentDate, description, category } = req.body;
  const paidBy = req.user._id;

  if (!employeeId || !employeeType || !amount || !category) {
    res.status(400);
    throw new Error("Iltimos, barcha majburiy maydonlarni to'ldiring.");
  }

  // Validate employeeType and category match
  const typeCategoryMap = {
    'Teacher': 'teacherSalary',
    'Manager': 'managerSalary',
    'Admin': 'adminSalary',
  };

  if (typeCategoryMap[employeeType] !== category) {
    res.status(400);
    throw new Error(`EmployeeType va Category mos kelmaydi. ${employeeType} uchun ${typeCategoryMap[employeeType]} bo'lishi kerak.`);
  }

  // Validate employee exists and has correct role
  const employee = await User.findById(employeeId);
  if (!employee) {
    res.status(404);
    throw new Error('Xodim topilmadi.');
  }

  if (employee.role !== employeeType) {
    res.status(400);
    throw new Error(`Xodim roli ${employeeType} emas.`);
  }

  // Parse payment date
  let parsedPaymentDate = new Date();
  if (paymentDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(paymentDate)) {
      res.status(400);
      throw new Error("Sana formati noto'g'ri. YYYY-MM-DD formatida kiriting.");
    }
    parsedPaymentDate = new Date(paymentDate);
    if (isNaN(parsedPaymentDate.getTime())) {
      res.status(400);
      throw new Error("Yaroqsiz sana.");
    }
  }

  // Create employee payment
  const employeePayment = await EmployeePayment.create({
    employeeId,
    employeeType,
    amount,
    paymentDate: parsedPaymentDate,
    description: description || '',
    category,
    paidBy,
  });

  // Populate for response
  const populatedPayment = await EmployeePayment.findById(employeePayment._id)
    .populate('employeeId', 'firstName lastName email role')
    .populate('paidBy', 'firstName lastName');

  res.status(201).json({
    message: 'Xodimga to\'lov muvaffaqiyatli amalga oshirildi.',
    payment: populatedPayment,
  });
});

module.exports = {
  getDashboard,
  getStudentPayments,
  getTeacherSalary,
  getIncome,
  getExpense,
  createEmployeePayment,
};
