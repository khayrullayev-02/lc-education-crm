const mongoose = require('mongoose');

const StudentSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Ismi shart."],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Familiyasi shart."],
      trim: true,
    },
    birthDate: {
      type: Date,
      required: [true, "Tug‘ilgan sana shart."],
    },
    phoneNumber: {
      type: String,
      required: [true, "Telefon raqami shart."],
      unique: true,
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, "Guruh identifikatori shart."],
    },
    debt: {
      type: Number,
      default: 0,
    },
    lastPaymentDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Active', 'Pending', 'Dropped', 'Graduated'],
      default: 'Active',
    },
    isActive: {
      type: Boolean,
      default: true,
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

module.exports = mongoose.model('Student', StudentSchema);
