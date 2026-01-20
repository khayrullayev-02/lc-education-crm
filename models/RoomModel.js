const mongoose = require('mongoose');

const RoomSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Xona nomi shart."],
      trim: true,
      unique: true, 
    },
    capacity: {
      type: Number,
      required: [true, "Xona sig'imi shart."],
      min: [1, "Sig'im kamida 1 kishi bo'lishi kerak."],
    },
    // branch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: true,
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

// Har bir filialda xona nomi takrorlanmasligini ta'minlash
// RoomSchema.index({ name: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('Room', RoomSchema);
