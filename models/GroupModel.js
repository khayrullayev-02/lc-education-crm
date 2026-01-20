const mongoose = require('mongoose');

const GroupSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Guruh nomi shart."],
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, "Kurs identifikatori shart."],
    },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Teacher',
      required: [true, "O'qituvchi identifikatori shart."],
    },
    startDate: {
      type: Date,
      required: [true, "Boshlanish sanasi shart."],
    },
    status: {
      type: String,
      enum: ['Pending', 'Active', 'Completed', 'Canceled'],
      default: 'Pending',
    },
    schedule: [
      {
        day: {
          type: String,
          enum: ['Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba', 'Yakshanba'],
          required: true,
        },
        startTime: {
          type: String,
          required: true, // Masalan: "14:00"
        },
        endTime: {
          type: String,
          required: true, // Masalan: "16:00"
        }
      }
    ],
    // Guruh qaysi filialga tegishli
    // branch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: true,
    // },
    // Qo'shimcha maydonlar (masalan, xona)
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room',
        default: null, // Xona keyinchalik belgilanadi
    },
    students: [ // Guruhdagi talabalar ro'yxati (Populate qilish uchun kerak)
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      }
    ]
  },
  {
    timestamps: true,
  }
);

// Har bir filialda guruh nomi va kurs/teacher/sanasi bo'yicha takrorlanmaslik
// GroupSchema.index({ name: 1, branch: 1 }, { unique: true });
GroupSchema.index({ name: 1 }, { unique: true });

module.exports = mongoose.model('Group', GroupSchema);