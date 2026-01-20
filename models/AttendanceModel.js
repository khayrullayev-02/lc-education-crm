const mongoose = require('mongoose');

const AttendanceSchema = mongoose.Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, "Guruh identifikatori shart."],
    },
    date: {
      type: Date,
      required: [true, "Davomat sanasi shart."],
    },
    // Har bir talaba uchun davomat holati
    records: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Student',
          required: true,
        },
        status: {
          type: String,
          enum: ['Present', 'Absent', 'Late'], // Keldi, Kelmadi, Kechikdi
          default: 'Absent',
        },
        // Agar talaba kelmasa, uning dars uchun hisoblangan qarzi
        // (Pul to'lanmagan bo'lsa) saqlanadi.
        chargedAmount: {
            type: Number,
            default: 0,
        },
      },
    ],
    // Davomatni amalga oshirgan xodim
    recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // branch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: true,
    // },
  },
  {
    timestamps: true,
  }
);

// Bir guruhga bir kunda faqat bir marta davomat qilish mumkinligini ta'minlash
AttendanceSchema.index({ group: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);