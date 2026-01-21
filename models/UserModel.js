const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'Ism shart.'],
    },
    lastName: {
      type: String,
      required: [true, 'Familiya shart.'],
    },
    username: {
      type: String,
      required: [true, 'Login (username) shart.'],
      unique: true,
    },
    email: {
      type: String,
      required: [true, 'Email shart.'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Parol shart.'],
    },
    role: {
      type: String,
      required: true,
      // NOTE: Controllerlarda 'Admin' roli ishlatiladi — enumda ham bo'lishi shart.
      enum: ['SuperAdmin', 'Admin', 'Director', 'Manager', 'Teacher', 'Student', 'Accountant'],
      default: 'Student',
    },
    // Frontend kontrakti uchun: yaratilganda plain parolni vaqtinchalik saqlash (faqat ko'rsatish uchun).
    // Eslatma: bu xavfsizlik nuqtai nazaridan minimal foydalanish uchun mo'ljallangan.
    plainPassword: {
      type: String,
      default: undefined,
    },
    // branch: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: 'Branch',
    //   required: function() {
    //     return this.role !== 'Director';
    //   },
    // },
    salary: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Parolni saqlashdan oldin hash qilish
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) {
//     return next(); // return qo‘shish muhim
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });
// userSchema.pre('save', async function() {
//   if (!this.isModified('password')) {
//     return; // oldingi holatda hech narsa qilmasdan chiqish
//   }
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
// });
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Parolni taqqoslash usuli
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
