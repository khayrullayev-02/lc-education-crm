const mongoose = require('mongoose');

const DirectorProfileSchema = mongoose.Schema(
  {
    // Asosiy foydalanuvchi ma'lumotlariga bog'lanish (UserController tomonidan yaratiladi)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // 'User' modeliga ulanadi
      required: true,
      unique: true, // Har bir foydalanuvchi faqat bitta Director profiliga ega bo'lishi kerak
    },
    // Director lavozimiga xos qo'shimcha ma'lumotlar
    salary: {
      type: Number,
      required: [true, "Directorning oylik maoshi shart."],
      min: [0, "Oylik 0 dan kam bo'lishi mumkin emas."],
    },
    hiringDate: {
      type: Date,
      required: [true, "Ishga qabul qilingan sana shart."],
    },
    // Director butun tizimni boshqaradi, lekin asosiy filialni belgilash mumkin
    // primaryBranch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: false, // Majburiy emas
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

module.exports = mongoose.model('DirectorProfile', DirectorProfileSchema);