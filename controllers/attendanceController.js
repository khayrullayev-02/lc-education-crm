const asyncHandler = require('express-async-handler');
const Attendance = require('../models/AttendanceModel');
const Group = require('../models/GroupModel');
const Student = require('../models/StudentModel');
const Course = require('../models/CourseModel');
const Teacher = require('../models/TeacherModel');

// Dushanba=0, Seshanba=1, ... Yakshanba=6 uchun helper
const dayMap = {
    'Yakshanba': 0, 'Dushanba': 1, 'Seshanba': 2, 'Chorshanba': 3,
    'Payshanba': 4, 'Juma': 5, 'Shanba': 6
};

// @desc    Yangi davomatni yaratish (RBAC: Teacher faqat o'z guruhlariga davomat yozadi)
// @route   POST /api/attendance
// @access  Private/Teacher, Admin, Manager
const createAttendance = asyncHandler(async (req, res) => {
    const { group: groupId, date: dateString, records } = req.body;
    // const branch = req.user.branch;
    const recordedBy = req.user._id;

    if (!groupId || !dateString || !records || records.length === 0) {
        res.status(400);
        throw new Error("Guruh, sana va davomat yozuvlari shart.");
    }

    const attendanceDate = new Date(dateString);
    attendanceDate.setHours(0, 0, 0, 0); // Vaqt qismini o'chiramiz

    // 1. Shu kunga davomat allaqachon mavjudligini tekshirish
    // const existingAttendance = await Attendance.findOne({
    //     group: groupId,
    //     date: attendanceDate,
    // });
    const existingAttendance = await Attendance.findOne({
        group: groupId,
        date: {
            $gte: attendanceDate,
            $lte: new Date(attendanceDate.getTime() + 24 * 60 * 60 * 1000 - 1)
        }
    });
    

    if (existingAttendance) {
        res.status(400);
        throw new Error("Bu guruh uchun bugungi davomat allaqachon olingan.");
    }

    // 2. Guruh, kurs va talabalarni olish
    const groupDoc = await Group.findById(groupId).populate('course');
    // const groupDoc = await Group.findById(groupId).populate('course').select('+schedule'); // Schedule maydoni modelda bo'lsa
    
    if (!groupDoc) {
        res.status(404);
        throw new Error('Guruh topilmadi.');
    }

    // RBAC: Teacher faqat o'z guruhlariga davomat yozadi
    if (req.user.role === 'Teacher') {
        const teacherProfile = await Teacher.findOne({ user: req.user._id });
        if (!teacherProfile || teacherProfile._id.toString() !== groupDoc.teacher.toString()) {
            res.status(403);
            throw new Error('Bu guruhga davomat yozish uchun ruxsat yo\'q. Faqat o\'z guruhlaringizga davomat yozishingiz mumkin.');
        }
    }
    // if (groupDoc.branch.toString() !== branch.toString()) {
    //     res.status(403);
    //     throw new Error("Davomat faqat o'z filialidagi guruhlar uchun amalga oshirilishi mumkin.");
    // }

    // 3. Dars jadvalini va vaqtini tekshirish (Faqat Davomat so'rovi Dars kuni va vaqtida bo'lishi kerak)
    
    const currentDayIndex = new Date().getDay(); // 0 (Yakshanba) - 6 (Shanba)
    const currentDayName = Object.keys(dayMap).find(key => dayMap[key] === currentDayIndex);

    const todaySchedule = groupDoc.schedule.find(s => s.day === currentDayName);

    if (!todaySchedule) {
        res.status(400);
        throw new Error(`Bugun (${currentDayName}) bu guruhning darsi yo'q. Davomatni faqat dars kuni olish mumkin.`);
    }

    // Vaqtni tekshirish (Faqat dars boshlanish va tugash oralig'ida ruxsat beriladi)
    const now = new Date();
    const [startHour, startMinute] = todaySchedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = todaySchedule.endTime.split(':').map(Number);
    
    // Dars boshlanadigan va tugaydigan vaqtni bugungi sanaga qo'yish
    const startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute, 0);
    const endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute, 0);
    
    // Agar so'rov vaqti dars oralig'ida bo'lmasa, bloklash (Ixtiyoriy: 30 daqiqa oldin/keyin ruxsat berish mumkin)
    if (now < startTime || now > endTime) {
        // res.status(400);
        // throw new Error(`Davomatni faqat dars vaqtida (${todaySchedule.startTime} - ${todaySchedule.endTime}) olish mumkin.`);
        // Note: Sinov oson bo'lishi uchun, bu blokni hozircha shunchaki console.log qilamiz
        console.warn(`Davomat dars vaqtidan tashqarida yuborildi: ${now.toLocaleTimeString()}`);
    }


    // 4. Moliya hisoboti: Bir dars uchun narxni hisoblash
    const course = await Course.findById(groupDoc.course);
    if (!course) {
        res.status(500);
        throw new Error("Kurs ma'lumotlari topilmadi, narxni hisoblash imkonsiz.");
    }

    // Misol hisobi: Oylik 12 dars (haftada 3 marta)
    const monthlyPrice = course.price;
    const pricePerLesson = monthlyPrice / 12; // Bir dars uchun narx

    let attendanceRecords = [];
    let studentsToUpdate = [];

    for (const record of records) {
        const student = await Student.findById(record.student);
        // if (!student || student.branch.toString() !== branch.toString()) {
        //     continue; // Talaba topilmasa yoki boshqa filialga tegishli bo'lsa o'tkazib yuborish
        // }
        if (!student) {
            continue;
        }
            

        let chargedAmount = 0;
        // let newDebt = student.debt || 0;
        let newDebt = Number(student.debt) || 0;
        
        // Agar talaba kelgan yoki kechikkan bo'lsa (ya'ni darsda qatnashgan bo'lsa)
        if (record.status === 'Present' || record.status === 'Late') {
            
            // Talabaning oldindan to'lovi yoki qarzi borligini tekshirish
            // Agar qarzi manfiy bo'lsa (masalan, -950000), demak pul to'lagan va bu dars uchun puli bor
            if (newDebt >= 0) { // Qarz nol yoki undan katta bo'lsa (Pul tugagan)
                
                // Bu dars uchun qarz hisoblash (minusga kirish)
                chargedAmount = pricePerLesson;
                newDebt -= pricePerLesson; // Masalan: 0 - 79166.66 = -79166.66 (qarz)
                
            } else { // newDebt manfiy bo'lsa (Pul hali bor - qarzni yopish uchun)
                
                // Dars puli mavjud qarzni kamaytiradi
                chargedAmount = pricePerLesson;
                newDebt += pricePerLesson; // Masalan: -950000 + 79166.66 = -870833.34 (qarzi kamaydi)
            }
        } 
        
        // Talaba modelini yangilash uchun ma'lumotlarni yig'ish
        studentsToUpdate.push({
            id: student._id,
            debt: newDebt,
        });

        // Attendance record uchun ma'lumotlarni yig'ish
        attendanceRecords.push({
            student: record.student,
            status: record.status,
            chargedAmount: chargedAmount, // Bu summani Finance Controller ishlatadi
        });
    }

    // 5. Talabalarni bitta so'rovda yangilash (StudentModel.js ni to'g'ri yangilash shart!)
    const bulkOperations = studentsToUpdate.map(update => ({
        updateOne: {
            filter: { _id: update.id },
            update: { $set: { debt: update.debt } }
        }
    }));
    await Student.bulkWrite(bulkOperations);


    // 6. Attendance yozuvini saqlash
    const attendance = await Attendance.create({
        group: groupId,
        date: attendanceDate,
        records: attendanceRecords,
        recordedBy,
        // branch,
    });

    res.status(201).json({
        message: 'Davomat muvaffaqiyatli saqlandi va talabalar qarzi yangilandi.',
        attendance
    });
});

// @desc    Guruh bo'yicha davomatlarni olish (RBAC: Teacher faqat o'z guruhlarining davomatini ko'radi)
// @route   GET /api/attendance/:groupId
// @access  Private
const getAttendanceByGroup = asyncHandler(async (req, res) => {
    const { groupId } = req.params;
    // const branch = req.user.branch;

    const groupDoc = await Group.findById(groupId);
    
    if (!groupDoc) {
        res.status(404);
        throw new Error('Guruh topilmadi.');
    }

    // RBAC: Teacher faqat o'z guruhlarining davomatini ko'radi
    if (req.user.role === 'Teacher') {
        const teacherProfile = await Teacher.findOne({ user: req.user._id });
        if (!teacherProfile || teacherProfile._id.toString() !== groupDoc.teacher.toString()) {
            res.status(403);
            throw new Error('Bu guruhning davomatini ko\'rish uchun ruxsat yo\'q. Faqat o\'z guruhlaringizning davomatini ko\'ra olasiz.');
        }
    }
    // if (!groupDoc || groupDoc.branch.toString() !== branch.toString()) {
    //     res.status(404);
    //     throw new Error('Guruh topilmadi yoki sizning filialingizga tegishli emas.');
    // }

    const attendanceRecords = await Attendance.find({ 
        group: groupId, 
        // branch: branch 
    })
    .populate({
        path: 'records.student',
        select: 'firstName lastName phoneNumber' 
    })
    .select('-__v'); 

    res.status(200).json(attendanceRecords);
});


module.exports = {
  createAttendance,
  getAttendanceByGroup,
  // Davomatni yangilashga/o'chirishga ruxsat bermaymiz, chunki bu moliyaviy hisob-kitobga ta'sir qiladi.
  // Xato qilingan bo'lsa, ma'mur (Director) uni o'chirishi mumkin (DELETE route yaratiladi).
};