const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');
const Attendance = require('../models/AttendanceModel');
const Student = require('../models/StudentModel');
const Group = require('../models/GroupModel');
const Course = require('../models/CourseModel');
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
    
    const daysInPeriod = (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24);
    const daysInMonth = 30; 
    const monthlyRatio = daysInPeriod / daysInMonth; 

    let totalOutcome = 0;
    let detailedOutcome = [];

    // --- 1. O'qituvchi ulushini hisoblash ---
    let attendanceMatchQuery = {}; // branch filteri olib tashlandi
    if (startDate && endDate) {
        attendanceMatchQuery.date = { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
        };
    }
    
    const attendances = await Attendance.find(attendanceMatchQuery)
        .populate({
            path: 'group',
            select: 'teacher course students',
            populate: [
                { path: 'teacher', select: 'firstName lastName' },
                { path: 'course', select: 'price' }
            ]
        })
        .select('records date');

    let teacherPayouts = {};
    
    attendances.forEach(att => {
        const group = att.group;
        if (!group || !group.teacher || !group.course || !group.students) return;

        const teacherId = group.teacher._id.toString();
        const teacherName = `${group.teacher.firstName} ${group.teacher.lastName}`;
        const monthlyPrice = group.course.price;
        
        const teacherShareRate = 0.4; 
        const teacherSharePerLesson = (monthlyPrice * teacherShareRate) / 12; 
        const activeStudentsCount = att.records.length; 
        const lessonCost = activeStudentsCount * teacherSharePerLesson;

        totalOutcome += lessonCost;

        if (!teacherPayouts[teacherId]) {
            teacherPayouts[teacherId] = {
                id: teacherId,
                name: teacherName,
                role: 'Teacher (Ulush)',
                totalAmount: 0,
                lessonCount: 0,
            };
        }
        
        teacherPayouts[teacherId].totalAmount += lessonCost;
        teacherPayouts[teacherId].lessonCount += 1;
    });

    detailedOutcome = [...Object.values(teacherPayouts)];

    // --- 2. Manager maoshlarini hisoblash ---
    const managers = await ManagerProfile.find({}) // branch filteri olib tashlandi
        .populate('user', 'firstName lastName');

    managers.forEach(manager => {
        const salaryPortion = manager.salary * monthlyRatio; 
        totalOutcome += salaryPortion;

        detailedOutcome.push({
            id: manager._id,
            name: `${manager.user.firstName} ${manager.user.lastName}`,
            role: 'Manager (Oylik)',
            totalAmount: salaryPortion,
            monthlySalary: manager.salary,
            periodDays: daysInPeriod,
        });
    });

    // --- 3. Admin maoshlarini hisoblash ---
    const admins = await AdminProfile.find({})
        .populate('user', 'firstName lastName');

    admins.forEach(admin => {
        const salaryPortion = admin.salary * monthlyRatio; 
        totalOutcome += salaryPortion;

        detailedOutcome.push({
            id: admin._id,
            name: `${admin.user.firstName} ${admin.user.lastName}`,
            role: 'Admin (Oylik)',
            totalAmount: salaryPortion,
            monthlySalary: admin.salary,
            periodDays: daysInPeriod,
        });
    });

    res.status(200).json({
        total: totalOutcome,
        detailedOutcome,
        message: startDate && endDate 
            ? `${startDate} dan ${endDate} gacha bo'lgan jami chiqim hisoboti (O'qituvchi ulushi + Maoshlar)` 
            : "Umumiy chiqim hisoboti"
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
