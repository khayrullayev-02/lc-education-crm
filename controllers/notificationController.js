const asyncHandler = require('express-async-handler');
const Student = require('../models/StudentModel');
const Group = require('../models/GroupModel');
const Attendance = require('../models/AttendanceModel');

// @desc    Qarzi tugash arafasidagi talabalar ro'yxatini olish
// @route   GET /api/notifications/debt-warning
// @access  Private/Director, Manager
const getDebtWarningStudents = asyncHandler(async (req, res) => {
    // const branch = req.user.branch;
    
    // Qarz limiti (Masalan: -100 000 so'mdan past)
    // -100000 -> 100 000 so'm qarzni anglatadi.
    // Agar debt > -100000 bo'lsa, demak, puli tugash arafasida
    const DEBT_LIMIT_WARNING = -100000; 

    // Faqat faol va puli tugash arafasida bo'lgan talabalarni qidirish
    const students = await Student.find({
        // branch,
        status: 'Active',
        debt: { $gt: DEBT_LIMIT_WARNING } // Qarz 100 000 so'mdan kam bo'lganlar (manfiy tomoni)
    })
    .select('firstName lastName phoneNumber debt group lastPaymentDate')
    .populate('group', 'name');

    res.status(200).json({
        message: `Puli tugash arafasidagi (${Math.abs(DEBT_LIMIT_WARNING)} so'mdan kam qolgan) faol talabalar ro'yxati.`,
        students
    });
});


// @desc    Oldingi darsga kelmagan talabalar ro'yxatini olish
// @route   GET /api/notifications/absent-students
// @access  Private/Director, Manager, Teacher
const getAbsentStudents = asyncHandler(async (req, res) => {
    // const branch = req.user.branch;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // 1. Oxirgi 2 kun ichidagi barcha davomat yozuvlarini olish
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Attendance modelida date String (YYYY-MM-DD) formatida saqlanadi
    const recentAttendances = await Attendance.find({
        // branch,
        date: { $gte: twoDaysAgoStr, $lt: todayStr },
        status: { $in: ['absent', 'late'] } // Faqat kelmagan yoki kechikkan talabalarni olish
    })
    .populate({
        path: 'groupId',
        select: 'name teacher',
        populate: { 
            path: 'teacher', 
            select: 'user',
            populate: { path: 'user', select: 'firstName lastName' }
        }
    })
    .populate('studentId', 'firstName lastName phoneNumber status');
    
    let absentStudents = [];
    
    recentAttendances.forEach(att => {
        // Faqat faol talabalarni qo'shish
        if (att.studentId && att.studentId.status === 'Active') {
            const groupName = att.groupId?.name || 'N/A';
            const teacher = att.groupId?.teacher?.user;
            const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'N/A';
            const attendanceDate = att.date; // Already in YYYY-MM-DD format

            absentStudents.push({
                studentId: att.studentId._id,
                firstName: att.studentId.firstName,
                lastName: att.studentId.lastName,
                phoneNumber: att.studentId.phoneNumber,
                groupName,
                teacherName,
                attendanceDate,
                status: att.status,
                reason: att.reason || '',
            });
        }
    });

    // Takrorlanmas qilish (bir xil talaba bir necha marta bo'lmasligi uchun)
    const uniqueAbsentMap = new Map();
    absentStudents.forEach(item => {
        const key = `${item.studentId}_${item.attendanceDate}`;
        if (!uniqueAbsentMap.has(key)) {
            uniqueAbsentMap.set(key, item);
        }
    });

    const finalAbsentList = Array.from(uniqueAbsentMap.values());

    res.status(200).json({
        message: `Oxirgi 2 kun ichidagi darslarga kelmagan faol talabalar ro'yxati.`,
        absentList: finalAbsentList
    });
});


module.exports = {
  getDebtWarningStudents,
  getAbsentStudents,
};