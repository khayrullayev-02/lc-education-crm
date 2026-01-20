const asyncHandler = require('express-async-handler');
const Teacher = require('../models/TeacherModel');
const User = require('../models/UserModel');

// @desc    Barcha o'qituvchi profillarini olish
// @route   GET /api/teachers
// @access  Private (Kirgan har qanday foydalanuvchi)
const getTeachers = asyncHandler(async (req, res) => {
    const teachers = await Teacher.find({})
        .populate({
            path: 'user',
            select: '-password',
            // populate: {
            //     path: 'branch',
            //     select: 'name'
            // }
        });
    
    const formattedTeachers = teachers.map(teacher => ({
        _id: teacher._id,
        user: {
            _id: teacher.user._id,
            firstName: teacher.user.firstName,
            lastName: teacher.user.lastName,
            email: teacher.user.email,
            phone: teacher.phone,
            // branch: teacher.user.branch ? teacher.user.branch.name : 'Noma\'lum',
        },
        salary: teacher.salary,
        experience: teacher.experience,
        certificates: teacher.certificates,
        subjects: teacher.subjects,
        createdAt: teacher.createdAt,
    }));
    
    res.status(200).json(formattedTeachers);
});

// @desc    Yangi o'qituvchi profilini yaratish
// @route   POST /api/teachers
// @access  Private (Faqat Director/Manager)
const createTeacherProfile = asyncHandler(async (req, res) => {
    if (req.user.role !== 'Director' && req.user.role !== 'Manager') {
        res.status(403);
        throw new Error('O\'qituvchi profilini yaratish uchun ruxsat yo\'q.');
    }

    const { userId, phone, salary, experience, certificates, subjects } = req.body;

    // User mavjudligini tekshirish va role 'Teacher' ekanligini tekshirish
    const user = await User.findById(userId);
    if (!user || user.role !== 'Teacher') {
        res.status(400);
        throw new Error('Ko\'rsatilgan ID bilan \'Teacher\' rolli foydalanuvchi topilmadi.');
    }

    // Agar profil allaqachon mavjud bo‘lsa
    const profileExists = await Teacher.findOne({ user: userId });
    if (profileExists) {
        res.status(400);
        throw new Error('Bu foydalanuvchi uchun o\'qituvchi profili allaqachon yaratilgan.');
    }

    // Teacher profile yaratish
    const teacherProfile = await Teacher.create({
        user: userId,
        phone,
        salary: salary || 0,
        experience: experience || 0,
        certificates: certificates || [],
        subjects: subjects || [],
    });

    // Full populated response
    const populatedProfile = await Teacher.findById(teacherProfile._id).populate({
        path: 'user',
        select: '-password',
        // populate: {
        //     path: 'branch',
        //     select: 'name'
        // }
    });

    res.status(201).json(populatedProfile);
});

// @desc    O'qituvchi profilini ID bo'yicha olish
// @route   GET /api/teachers/:id
// @access  Private
const getTeacherById = asyncHandler(async (req, res) => {
    const teacher = await Teacher.findById(req.params.id).populate({
        path: 'user',
        select: '-password',
        // populate: {
        //     path: 'branch',
        //     select: 'name'
        // }
    });

    if (!teacher) {
        res.status(404);
        throw new Error('O\'qituvchi profili topilmadi.');
    }

    const isOwner = req.user._id.toString() === teacher.user._id.toString();
    const isAuthorized = req.user.role === 'Director' || req.user.role === 'Manager';

    if (!isOwner && !isAuthorized) {
        res.status(403);
        throw new Error('Bu profil ma\'lumotlarini ko\'rish uchun ruxsat yo\'q.');
    }

    res.status(200).json(teacher);
});

// @desc    O'qituvchi profilini yangilash
// @route   PUT /api/teachers/:id
// @access  Private (Faqat Director/Manager yoki o'zi)
const updateTeacherProfile = asyncHandler(async (req, res) => {
    let teacher = await Teacher.findById(req.params.id).populate('user');

    if (!teacher) {
        res.status(404);
        throw new Error('O\'qituvchi profili topilmadi.');
    }
    
    const isOwner = req.user._id.toString() === teacher.user._id.toString();
    const isAuthorized = req.user.role === 'Director' || req.user.role === 'Manager';

    if (!isOwner && !isAuthorized) {
        res.status(403);
        throw new Error('Bu profilni yangilash uchun ruxsat yo\'q.');
    }
    
    if (req.body.salary !== undefined && !isAuthorized) {
        res.status(403);
        throw new Error('Maoshni yangilash uchun ruxsat yo\'q. Faqat Director/Manager mumkin.');
    }

    teacher.salary = req.body.salary !== undefined ? req.body.salary : teacher.salary;
    teacher.experience = req.body.experience !== undefined ? req.body.experience : teacher.experience;
    teacher.certificates = req.body.certificates || teacher.certificates;
    teacher.subjects = req.body.subjects || teacher.subjects;
    teacher.phone = req.body.phone !== undefined ? req.body.phone : teacher.phone;

    const updatedProfile = await teacher.save();
    
    const populatedProfile = await Teacher.findById(updatedProfile._id).populate({
        path: 'user',
        select: '-password',
        // populate: {
        //     path: 'branch',
        //     select: 'name'
        // }
    });

    res.status(200).json(populatedProfile);
});

// @desc    O'qituvchi profilini o'chirish
// @route   DELETE /api/teachers/:id
// @access  Private (Faqat Director/Manager)
const deleteTeacherProfile = asyncHandler(async (req, res) => {
    if (req.user.role !== 'Director' && req.user.role !== 'Manager') {
        res.status(403);
        throw new Error('O\'qituvchi profilini o\'chirish uchun ruxsat yo\'q.');
    }

    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
        res.status(404);
        throw new Error('O\'qituvchi profili topilmadi');
    }

    await Teacher.deleteOne({ _id: req.params.id }); 
    res.json({ message: 'O\'qituvchi profili muvaffaqiyatli o\'chirildi' });
});

module.exports = {
  getTeachers,
  createTeacherProfile,
  getTeacherById,
  updateTeacherProfile,
  deleteTeacherProfile,
};
