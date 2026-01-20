const asyncHandler = require('express-async-handler');
const Student = require('../models/StudentModel');
const Group = require('../models/GroupModel')
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

    // 1. Oxirgi 2 kun ichidagi barcha davomat yozuvlarini olish
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2); 

    const recentAttendances = await Attendance.find({
        // branch,
        date: { $gte: twoDaysAgo, $lt: today }
    })
    .populate({
        path: 'group',
        select: 'name teacher',
        populate: { path: 'teacher', select: 'firstName lastName' }
    });
    
    let absentStudents = [];
    
    recentAttendances.forEach(att => {
        const groupName = att.group.name;
        const teacherName = `${att.group.teacher.firstName} ${att.group.teacher.lastName}`;
        const attendanceDate = att.date.toLocaleDateString('uz-UZ');

        att.records.forEach(record => {
            // Agar talaba kelmagan bo'lsa
            if (record.status === 'Absent') {
                absentStudents.push({
                    studentId: record.student,
                    groupName,
                    teacherName,
                    attendanceDate,
                });
            }
        });
    });

    // Student ID bo'yicha ma'lumotlarni yuklash va takrorlanmas qilish
    const uniqueAbsentStudentIds = [...new Set(absentStudents.map(a => a.studentId.toString()))];
    
    const studentDetails = await Student.find({ 
        _id: { $in: uniqueAbsentStudentIds },
        status: 'Active'
    }).select('firstName lastName phoneNumber');
    
    const studentMap = studentDetails.reduce((acc, student) => {
        acc[student._id.toString()] = student;
        return acc;
    }, {});
    
    // Natijani formatlash
    const finalAbsentList = absentStudents
        .filter(a => studentMap[a.studentId.toString()]) // Faqat faol studentlarni qoldirish
        .map(a => ({
            ...a,
            firstName: studentMap[a.studentId.toString()].firstName,
            lastName: studentMap[a.studentId.toString()].lastName,
            phoneNumber: studentMap[a.studentId.toString()].phoneNumber,
            studentId: undefined, // Keraksiz maydonni o'chirish
        }));


    res.status(200).json({
        message: `Oxirgi 2 kun ichidagi darslarga kelmagan faol talabalar ro'yxati.`,
        absentList: finalAbsentList
    });
});


module.exports = {
  getDebtWarningStudents,
  getAbsentStudents,
};