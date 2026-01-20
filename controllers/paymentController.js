const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');
const Student = require('../models/StudentModel'); // Talaba modelini import qilish
const Group = require('../models/GroupModel');     // Guruh modelini import qilish
const Teacher = require('../models/TeacherModel');

// @desc    Yangi to'lovni amalga oshirish va talaba qarzini yangilash
// @route   POST /api/payments
// @access  Private/Director, Manager, Admin
const createPayment = asyncHandler(async (req, res) => {
  const { student, group, amount, type } = req.body;
  // const branch = req.user.branch;
  const paidBy = req.user._id;

  if (!student || !group || !amount) {
    res.status(400);
    throw new Error("Iltimos, talaba, guruh va to'lov summasini kiriting.");
  }

  // 1. Talaba va Guruhning mavjudligini va filialga tegishliligini tekshirish
  const studentDoc = await Student.findById(student);
  const groupDoc = await Group.findById(group).populate('course');
  
  if (!studentDoc || !groupDoc) {
    res.status(404);
    throw new Error("Talaba yoki Guruh topilmadi.");
  }

  // RBAC: Teacher faqat o'z guruhlaridagi o'quvchilar uchun to'lov qiladi
  if (req.user.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: req.user._id });
    if (!teacherProfile || teacherProfile._id.toString() !== groupDoc.teacher.toString()) {
      res.status(403);
      throw new Error('Bu guruh uchun to\'lov qilish uchun ruxsat yo\'q. Faqat o\'z guruhlaringizdagi o\'quvchilar uchun to\'lov qilishingiz mumkin.');
    }
    // Talaba ham shu guruhga tegishli ekanligini tekshirish
    if (studentDoc.group.toString() !== group.toString()) {
      res.status(403);
      throw new Error('Talaba bu guruhga tegishli emas.');
    }
  }
  
  // Xavfsizlik tekshiruvi: Faqat o'z filialidagi ma'lumotlar bilan ishlash
  // if (studentDoc.branch.toString() !== branch.toString() || groupDoc.branch.toString() !== branch.toString()) {
  //     res.status(403);
  //     throw new Error("To'lov faqat o'z filiali talabalari/guruhlari uchun amalga oshirilishi mumkin.");
  // }
  
  // 2. Kurs narxini aniqlash (1 oylik narx)
  const monthlyPrice = groupDoc.course.price; // Kursning umumiy narxi
  
  // 3. To'langan summani saqlash
  const payment = await Payment.create({
    student,
    group,
    amount,
    type,
    // branch,
    paidBy,
  });

  // 4. Talaba qarzini yangilash (debt maydonini yangilaymiz)
  // Talabaning oylik qarzini hisoblash uchun bizda qarz summasi saqlanmagan,
  // Shuning uchun bu yerda yangi to'lovni mavjud qarzga qo'shamiz (yoki undan ayiramiz).
  // Aytaylik, talabaning debt maydoni manfiy (minus) qiymatni bildiradi (qarzni).
  
  // Yangi hisob-kitob uchun Student Modelda 'debt' maydoni mavjudligini taxmin qilamiz.
  
  // Qarzni hisoblash: To'langan summa (amount) qarzni kamaytiradi.
  // Agar 'debt' maydoni bo'lmasa, uni 0 deb olamiz.
  const currentDebt = studentDoc.debt || 0; // Agar 'debt' yo'q bo'lsa, 0 deb olamiz

  // Yangi qarzni hisoblash: To'lov qarzni yopadi.
  const newDebt = currentDebt - amount; 
  
  // Talaba modelini yangilash
  await Student.findByIdAndUpdate(student, 
    { 
        debt: newDebt,
        lastPaymentDate: payment.paymentDate // Oxirgi to'lov sanasini saqlash
    },
    { new: true }
  );

  // 5. Moliya hisoboti uchun yozuv yaratish (Bu keyingi qadamda qilinadi)

  res.status(201).json({
      message: "To'lov muvaffaqiyatli amalga oshirildi va talaba qarzi yangilandi.",
      payment,
      newDebt
  });
});

// @desc    Barcha to'lovlarni olish (RBAC: Teacher faqat o'z guruhlaridagi to'lovlarni ko'radi)
// @route   GET /api/payments
// @access  Private
const getPayments = asyncHandler(async (req, res) => {
  let query = {};

  // RBAC: Teacher faqat o'z guruhlaridagi to'lovlarni ko'radi
  if (req.user.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: req.user._id });
    if (!teacherProfile) {
      res.status(404);
      throw new Error('O\'qituvchi profili topilmadi.');
    }
    // O'qituvchining barcha guruhlarini topish
    const teacherGroups = await Group.find({ teacher: teacherProfile._id }).select('_id');
    const groupIds = teacherGroups.map(g => g._id);
    query.group = { $in: groupIds };
  }
  // Director, Manager, Admin hammasini ko'radi (query bo'sh qoladi)

  const payments = await Payment.find(query)
    .populate('student', 'firstName lastName')
    .populate('group', 'name')
    .select('-__v');
    
  res.status(200).json(payments);
});

// @desc    To'lovni ID bo'yicha o'chirish (Pulni qaytarish)
// @route   DELETE /api/payments/:id
// @access  Private/Director, Manager
const deletePayment = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
        res.status(404);
        throw new Error('To‘lov yozuvi topilmadi');
    }

    // Xavfsizlik tekshiruvi
    // if (payment.branch.toString() !== req.user.branch.toString()) {
    //     res.status(403);
    //     throw new Error("Siz boshqa filial to‘lovini o‘chirishga ruxsatga ega emassiz.");
    // }

    // 1. Talaba qarzini qayta hisoblash (pulni qaytarish: qarzni oshirish)
    const studentDoc = await Student.findById(payment.student);
    
    if (studentDoc) {
        const amountToReturn = payment.amount;
        // O'chirilgan to'lov summasini qarzga qayta qo'shamiz
        const newDebt = (studentDoc.debt || 0) + amountToReturn;
        
        await Student.findByIdAndUpdate(payment.student, 
            { debt: newDebt },
            { new: true }
        );
    }
    
    // 2. To'lovni o'chirish
    await Payment.deleteOne({ _id: req.params.id });
    
    res.json({ message: 'To‘lov yozuvi muvaffaqiyatli o‘chirildi va talaba qarzi yangilandi.' });
});

module.exports = {
  createPayment,
  getPayments,
  deletePayment,
  // Payment'ni yangilashga ruxsat bermaymiz, chunki bu moliyaviy yozuv va uni o'chirib qayta yaratish (delete/create) to'g'riroq.
};