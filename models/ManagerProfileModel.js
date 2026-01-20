const mongoose = require('mongoose');

const ManagerProfileSchema = mongoose.Schema(
  {
    // Asosiy foydalanuvchi ma'lumotlariga bog'lanish (UserController tomonidan yaratiladi)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // 'User' modeliga ulanadi
      required: true,
      unique: true, // Har bir foydalanuvchi faqat bitta Manager profiliga ega bo'lishi kerak
    },
    // Manager lavozimiga xos qo'shimcha ma'lumotlar
    salary: {
      type: Number,
      required: [true, "Managerning oylik maoshi shart."],
      min: [0, "Oylik 0 dan kam bo'lishi mumkin emas."],
    },
    hiringDate: {
      type: Date,
      required: [true, "Ishga qabul qilingan sana shart."],
    },
    // branch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: [true, "Manager qaysi filialga biriktirilganligi shart."],
    // },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('ManagerProfile', ManagerProfileSchema);