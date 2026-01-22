const asyncHandler = require('express-async-handler');
const Payment = require('../models/PaymentModel');
const Student = require('../models/StudentModel'); // Talaba modelini import qilish
const Group = require('../models/GroupModel');     // Guruh modelini import qilish
const Teacher = require('../models/TeacherModel');

// @desc    Yangi to'lovni amalga oshirish va talaba qarzini yangilash
// @route   POST /api/payments
// @access  Private/Director, Manager, Admin
const createPayment = asyncHandler(async (req, res) => {
  const { student, group, amount, type, date } = req.body;
  // const branch = req.user.branch;
  const paidBy = req.user._id;

  if (!student || !group || !amount) {
    res.status(400);
    throw new Error("Iltimos, talaba, guruh va to'lov summasini kiriting.");
  }

  // Sana maydonini tekshirish va formatlash
  let paymentDate = new Date();
  if (date) {
    // YYYY-MM-DD formatini tekshirish
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400);
      throw new Error("Sana formati noto'g'ri. YYYY-MM-DD formatida kiriting.");
    }
    paymentDate = new Date(date);
    if (isNaN(paymentDate.getTime())) {
      res.status(400);
      throw new Error("Yaroqsiz sana.");
    }
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
    if (studentDoc.group && studentDoc.group.toString() !== group.toString()) {
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
    paymentDate, // Sana maydoni (optional, default: hozirgi sana)
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

  const paymentResponse = {
    ...payment.toObject(),
    date: payment.paymentDate ? payment.paymentDate.toISOString().split('T')[0] : undefined,
  };

  res.status(201).json({
      message: "To'lov muvaffaqiyatli amalga oshirildi va talaba qarzi yangilandi.",
      payment: paymentResponse,
      newDebt
  });
});

// @desc    Barcha to'lovlarni olish (filtrlar bilan, paginatsiya bilan)
// @route   GET /api/payments
// @access  Private
// Query:
//  - student: STUDENT_ID
//  - group: GROUP_ID
//  - from: YYYY-MM-DD
//  - to: YYYY-MM-DD
//  - page, limit (ixtiyoriy, default: 1, 50)
// Response:
//  {
//    items: [ { ...payment, student: { ... }, group: { ... } } ],
//    total: 0
//  }
const getPayments = asyncHandler(async (req, res) => {
  const { student, group, from, to } = req.query;
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const query = {};
  let teacherGroupIds = null;

  // RBAC: Teacher faqat o'z guruhlaridagi to'lovlarni ko'radi
  if (req.user.role === 'Teacher') {
    const teacherProfile = await Teacher.findOne({ user: req.user._id });
    if (!teacherProfile) {
      res.status(404);
      throw new Error('O\'qituvchi profili topilmadi.');
    }
    const teacherGroups = await Group.find({ teacher: teacherProfile._id }).select('_id');
    teacherGroupIds = teacherGroups.map((g) => g._id.toString());
  }

  if (student) {
    query.student = student;
  }

  if (group) {
    // Teacher faqat o'z guruhlaridan birini ko'rishi mumkin
    if (teacherGroupIds && !teacherGroupIds.includes(group.toString())) {
      res.status(403);
      throw new Error('Bu guruh bo‘yicha to‘lovlarni ko‘rish uchun ruxsat yo‘q.');
    }
    query.group = group;
  } else if (teacherGroupIds) {
    // Teacher uchun barcha o'z guruhlari
    query.group = { $in: teacherGroupIds };
  }
  if (from || to) {
    query.paymentDate = {};
    if (from) query.paymentDate.$gte = new Date(from);
    if (to) query.paymentDate.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    Payment.find(query)
      .populate('student', 'firstName lastName')
      .populate('group', 'name')
      .select('-__v')
      .sort({ paymentDate: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(query),
  ]);

  const mapped = items.map((p) => ({
    _id: p._id,
    student: p.student ? { _id: p.student._id, firstName: p.student.firstName, lastName: p.student.lastName } : null,
    group: p.group ? { _id: p.group._id, name: p.group.name } : null,
    amount: p.amount,
    type: p.type,
    date: p.paymentDate ? p.paymentDate.toISOString().split('T')[0] : undefined,
    paymentDate: p.paymentDate,
  }));

  res.status(200).json({ items: mapped, total });
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

// @desc    To'lovni yangilash
// @route   PATCH /api/payments/:id
// @access  Private/Director, Manager
const updatePayment = asyncHandler(async (req, res) => {
  const { amount, date, type, note } = req.body;
  
  const payment = await Payment.findById(req.params.id);
  
  if (!payment) {
    res.status(404);
    throw new Error('To\'lov topilmadi');
  }

  // Eskirgan qarzni qayta hisoblash uchun talabani olish
  const student = await Student.findById(payment.student);
  
  // Agar summa o'zgargan bo'lsa, qarzni yangilash
  if (amount && amount !== payment.amount) {
    const difference = amount - payment.amount;
    const newDebt = (student.debt || 0) - difference;
    
    await Student.findByIdAndUpdate(payment.student, 
      { debt: newDebt },
      { new: true }
    );
  }

  // To'lovni yangilash
  if (amount) payment.amount = amount;
  if (date) {
    // YYYY-MM-DD formatini tekshirish
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400);
      throw new Error("Sana formati noto'g'ri. YYYY-MM-DD formatida kiriting.");
    }
    const paymentDate = new Date(date);
    if (isNaN(paymentDate.getTime())) {
      res.status(400);
      throw new Error("Yaroqsiz sana.");
    }
    payment.paymentDate = paymentDate;
  }
  if (type) payment.type = type;
  if (note) payment.note = note;
  
  payment.updatedAt = new Date();
  
  await payment.save();
  
  const updatedPayment = await Payment.findById(payment._id)
    .populate('student', 'firstName lastName')
    .populate('group', 'name');
  
  res.json(updatedPayment);
});

module.exports = {
  createPayment,
  getPayments,
  updatePayment,
  deletePayment,
};