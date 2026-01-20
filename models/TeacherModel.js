const mongoose = require('mongoose');

const teacherSchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true, // Bitta User faqat bitta Teacher profiliga ega bo'lishi kerak
    },
    phone: {
      type: String,
      required: [true, 'Telefon raqam shart.'],
    },
    salary: {
      type: Number,
      default: 0,
    },
    experience: {
      type: Number, // yil hisobida
      default: 0,
    },
    certificates: {
      type: [String], // sertifikatlar array
      default: [],
    },
    subjects: {
      type: [String], // o‘rgatadigan fanlar
      default: [],
    },
  },
  { timestamps: true }
);

const Teacher = mongoose.model('Teacher', teacherSchema);

module.exports = Teacher;