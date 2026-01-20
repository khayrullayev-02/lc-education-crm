const asyncHandler = require('express-async-handler');
const Course = require('../models/CourseModel');

// @desc    Barcha kurslarni olish (faqat kirgan foydalanuvchi filialiga tegishli)
// @route   GET /api/courses
// @access  Private
const getCourses = asyncHandler(async (req, res) => {
  // Filial ID'si foydalanuvchining tokenidan olinadi (req.user.branch)
  // const courses = await Course.find({ branch: req.user.branch }).populate('branch', 'name');
  const courses = await Course.find();
  res.status(200).json(courses);
});

// @desc    Yangi kurs yaratish
// @route   POST /api/courses
// @access  Private/Director, Manager
const createCourse = asyncHandler(async (req, res) => {
  const { name, durationMonths, price } = req.body;
  // const branch = req.user.branch; // Kursni yaratayotgan foydalanuvchining filial ID'si

  if (!name || !durationMonths || !price) {
    res.status(400);
    throw new Error("Iltimos, barcha kurs ma'lumotlarini to'ldiring: nomi, davomiyligi va narxi.");
  }

  // Kurs nomi takrorlanmasligini qo'shimcha tekshirish (faqat bitta filial ichida)
  // const courseExists = await Course.findOne({ name, branch });
  const courseExists = await Course.findOne({ name });
  if (courseExists) {
    res.status(400);
    throw new Error('Bu nomdagi kurs sizning filialingizda allaqachon mavjud.');
  }

  const course = await Course.create({
    name,
    durationMonths,
    price,
    // branch,
  });

  res.status(201).json(course);
});

// @desc    Kursni ID bo'yicha olish
// @route   GET /api/courses/:id
// @access  Private
const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id);

  if (!course) {
    res.status(404);
    throw new Error('Kurs topilmadi');
  }
  
  // Xavfsizlik tekshiruvi: Kurs faqat foydalanuvchining filialiga tegishli bo'lishi kerak
  // if (course.branch.toString() !== req.user.branch.toString()) {
  //     res.status(403);
  //     throw new Error("Siz boshqa filial kursini ko'rishga ruxsatga ega emassiz.");
  // }

  res.json(course);
});

// @desc    Kursni yangilash
// @route   PUT /api/courses/:id
// @access  Private/Director, Manager
const updateCourse = asyncHandler(async (req, res) => {
    const { name, durationMonths, price, isActive } = req.body;
    let course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error('Kurs topilmadi');
    }
    
    // Xavfsizlik tekshiruvi
    // if (course.branch.toString() !== req.user.branch.toString()) {
    //     res.status(403);
    //     throw new Error("Siz boshqa filial kursini yangilashga ruxsatga ega emassiz.");
    // }
    
    // Yangilanishni bajarish
    course.name = name || course.name;
    course.durationMonths = durationMonths || course.durationMonths;
    course.price = price || course.price;
    course.isActive = isActive !== undefined ? isActive : course.isActive;

    const updatedCourse = await course.save();
    res.json(updatedCourse);
});

// @desc    Kursni o'chirish
// @route   DELETE /api/courses/:id
// @access  Private/Director
const deleteCourse = asyncHandler(async (req, res) => {
    const course = await Course.findById(req.params.id);

    if (!course) {
        res.status(404);
        throw new Error('Kurs topilmadi');
    }

    // Xavfsizlik tekshiruvi
    // if (course.branch.toString() !== req.user.branch.toString()) {
    //     res.status(403);
    //     throw new Error("Siz boshqa filial kursini o'chirishga ruxsatga ega emassiz.");
    // }

    await Course.deleteOne({ _id: req.params.id });
    res.json({ message: 'Kurs muvaffaqiyatli o‘chirildi' });
});


module.exports = {
  getCourses,
  createCourse,
  getCourseById,
  updateCourse,
  deleteCourse,
};