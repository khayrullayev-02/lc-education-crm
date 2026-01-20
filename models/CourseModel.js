const mongoose = require('mongoose');

const courseSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Kurs nomi shart."],
      unique: true, // Kurs nomi takrorlanmasligi kerak
    },
    durationMonths: {
      type: Number,
      required: [true, "Kurs davomiyligi (oylarda) shart."],
    },
    price: {
      type: Number,
      required: [true, "Kurs narxi shart."],
    },
    // Filialga bog'lanish: har bir kurs ma'lum filialga tegishli
    // branch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: [true, "Kurs qaysi filialga tegishli ekanligi shart."],
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

module.exports = mongoose.model('Course', courseSchema);