const mongoose = require('mongoose');

const AdminProfileSchema = mongoose.Schema(
  {
    // Asosiy foydalanuvchi ma'lumotlariga bog'lanish (UserController tomonidan yaratiladi)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // 'User' modeliga ulanadi
      required: true,
      unique: true, // Har bir foydalanuvchi faqat bitta Admin profiliga ega bo'lishi kerak
    },
    // Admin lavozimiga xos qo'shimcha ma'lumotlar
    salary: {
      type: Number,
      required: [true, "Adminning oylik maoshi shart."],
      min: [0, "Oylik 0 dan kam bo'lishi mumkin emas."],
    },
    hiringDate: {
      type: Date,
      required: [true, "Ishga qabul qilingan sana shart."],
    },
    // Admin butun tizimni boshqaradi, lekin asosiy ofisni belgilash mumkin
    primaryOffice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: false, // Majburiy emas
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('AdminProfile', AdminProfileSchema);