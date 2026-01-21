const mongoose = require('mongoose');

const EmployeePaymentSchema = mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "Xodim identifikatori shart."],
    },
    employeeType: {
      type: String,
      enum: ['Teacher', 'Manager', 'Admin'],
      required: [true, "Xodim turi shart."],
    },
    amount: {
      type: Number,
      required: [true, "To'langan summa shart."],
      min: [1, "Summa musbat bo'lishi kerak."],
    },
    paymentDate: {
      type: Date,
      required: [true, "To'lov sanasi shart."],
      default: Date.now,
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    category: {
      type: String,
      enum: ['teacherSalary', 'managerSalary', 'adminSalary'],
      required: [true, "Kategoriya shart."],
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "To'lovni kim amalga oshirganligi shart."],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('EmployeePayment', EmployeePaymentSchema);
