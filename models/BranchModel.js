const mongoose = require('mongoose');

const branchSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Filial nomi shart."], // Filial nomi majburiy
      unique: true, // Nom takrorlanmasligi kerak
    },
    address: {
      type: String,
      required: [true, "Filial manzili shart."], // Manzil majburiy
    },
    phone: {
      type: String,
      required: [true, "Telefon raqami shart."], // Telefon raqami majburiy
      unique: true, // Telefon raqami takrorlanmasligi kerak
    },
    isActive: {
      type: Boolean,
      default: true, // Sukut bo'yicha faol (active)
    },
    // Qo'shimcha maydonlar (keyinchalik qo'shilishi mumkin)
  },
  {
    timestamps: true, // createdAt va updatedAt avtomatik qo'shiladi
  }
);

module.exports = mongoose.model('Branch', branchSchema);