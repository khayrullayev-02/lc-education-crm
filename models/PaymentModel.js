const mongoose = require('mongoose');

const PaymentSchema = mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, "Talaba identifikatori shart."],
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, "Guruh identifikatori shart."],
    },
    amount: {
      type: Number,
      required: [true, "To'langan summa shart."],
      min: [1, "Summa musbat bo'lishi kerak."],
    },
    type: {
      type: String,
      enum: ['Cash', 'Card', 'Transfer'],
      default: 'Cash',
    },
    paymentDate: {
      type: Date,
      default: Date.now,
    },
    // To'lov qaysi filialga tegishli (Admin/Manager/Director tokenidan olinadi)
    // branch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: true,
    // },
    // Ushbu to'lovni kim amalga oshirdi (Admin/Manager/Director)
    paidBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Payment', PaymentSchema);