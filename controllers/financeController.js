const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');
const Student = require('../models/StudentModel');
const AdminProfile = require('../models/AdminProfileModel');
const ManagerProfile = require('../models/ManagerProfileModel');
const TeacherProfile = require('../models/TeacherModel');

// @desc    Umumiy kirim (income) hisobotini olish
// @route   GET /api/finance/income
// @access  Private/Director, Manager
const getIncomeReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query; 

    let matchQuery = {}; // branch filteri olib tashlandi

    if (startDate && endDate) {
        matchQuery.paymentDate = { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
        };
    }

    const income = await Payment.aggregate([
        { $match: matchQuery },
        { 
            $group: {
                _id: null,
                totalAmount: { $sum: '$amount' },
                count: { $sum: 1 }
            }
        }
    ]);

    const detailedIncome = await Payment.find(matchQuery)
        .populate('student', 'firstName lastName phoneNumber')
        .populate('group', 'name')
        .sort({ paymentDate: -1 });

    res.status(200).json({
        total: income[0] ? income[0].totalAmount : 0,
        detailedIncome,
        message: startDate && endDate ? `${startDate} dan ${endDate} gacha bo'lgan kirim hisoboti` : "Umumiy kirim hisoboti"
    });
});

// @desc    Umumiy chiqim (outcome) hisobotini olish (Maoshlar va O'qituvchi ulushi)
// @route   GET /api/finance/outcome
// @access  Private/Director, Admin
const getOutcomeReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error("startDate va endDate majburiy (YYYY-MM-DD).");
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    res.status(400);
    throw new Error("startDate va endDate qiymatlari noto'g'ri.");
  }

  const daysInPeriod = (end - start) / (1000 * 60 * 60 * 24);
  const daysInMonth = 30;
  const monthlyRatio = daysInPeriod / daysInMonth;

  let totalOutcome = 0;
  const detailedOutcome = [];

  // --- 1. O'qituvchi (Teacher) maoshlari ---
  const [teachers, managers, admins] = await Promise.all([
    TeacherProfile.find({}).populate('user', 'firstName lastName'),
    ManagerProfile.find({}).populate('user', 'firstName lastName'),
    AdminProfile.find({}).populate('user', 'firstName lastName'),
  ]);

  teachers.forEach((teacher) => {
    const baseSalary = teacher.salary || 0;
    const salaryPortion = baseSalary * monthlyRatio;
    totalOutcome += salaryPortion;

    detailedOutcome.push({
      id: teacher._id,
      name: `${teacher.user.firstName} ${teacher.user.lastName}`,
      role: 'Teacher (Oylik)',
      totalAmount: salaryPortion,
      monthlySalary: baseSalary,
      periodDays: daysInPeriod,
    });
  });

  // --- 2. Manager maoshlarini hisoblash ---
  managers.forEach((manager) => {
    const baseSalary = manager.salary || 0;
    const salaryPortion = baseSalary * monthlyRatio;
    totalOutcome += salaryPortion;

    detailedOutcome.push({
      id: manager._id,
      name: `${manager.user.firstName} ${manager.user.lastName}`,
      role: 'Manager (Oylik)',
      totalAmount: salaryPortion,
      monthlySalary: baseSalary,
      periodDays: daysInPeriod,
    });
  });

  // --- 3. Admin maoshlarini hisoblash ---
  admins.forEach((admin) => {
    const baseSalary = admin.salary || 0;
    const salaryPortion = baseSalary * monthlyRatio;
    totalOutcome += salaryPortion;

    detailedOutcome.push({
      id: admin._id,
      name: `${admin.user.firstName} ${admin.user.lastName}`,
      role: 'Admin (Oylik)',
      totalAmount: salaryPortion,
      monthlySalary: baseSalary,
      periodDays: daysInPeriod,
    });
  });

  res.status(200).json({
    total: totalOutcome,
    detailedOutcome,
    message: `${startDate} dan ${endDate} gacha bo'lgan jami chiqim hisoboti (Maoshlar)`,
  });
});

// @desc    Talabalarning umumiy qarzini olish
// @route   GET /api/finance/debt
// @access  Private/Director, Manager
const getDebtReport = asyncHandler(async (req, res) => {
    const activeStudents = await Student.find({ status: 'Active' }) // branch filteri olib tashlandi
        .select('firstName lastName debt group phoneNumber'); 

    let totalDebt = 0;
    let studentsWithDebt = [];

    activeStudents.forEach(student => {
        if (student.debt < 0) {
            const absoluteDebt = Math.abs(student.debt);
            totalDebt += absoluteDebt;
            studentsWithDebt.push({
                ...student.toObject(),
                debtAmount: absoluteDebt
            });
        }
    });

    res.status(200).json({
        totalDebt,
        studentsWithDebt,
        message: "Faol talabalarning umumiy qarz hisoboti"
    });
});


module.exports = {
  getIncomeReport,
  getOutcomeReport,
  getDebtReport,
};
