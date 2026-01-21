const mongoose = require('mongoose');

/**
 * Attendance (Davomat) — one document per (student + group + date)
 *
 * Frontend table:
 * - Rows = students
 * - Columns = dates
 * - Each cell = status + optional reason
 *
 * IMPORTANT RULE:
 * - ONE attendance per (student + group + date)
 */
const AttendanceSchema = mongoose.Schema(
  {
    // Legacy fields (older schema)
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      index: true,
      default: null,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      index: true,
      default: null,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Guruh identifikatori shart.'],
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Talaba identifikatori shart.'],
      index: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "O'qituvchi identifikatori shart."],
      index: true,
    },
    // Stored as YYYY-MM-DD for simple month queries from UI (e.g. month=2026-01)
    date: {
      type: String,
      required: [true, 'Davomat sanasi shart (YYYY-MM-DD).'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Sana formati noto‘g‘ri (YYYY-MM-DD).'],
      index: true,
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'excused', 'late'],
      required: [true, 'Davomat holati shart.'],
    },
    reason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

// Prevent duplicates: one attendance per (student + group + date)
AttendanceSchema.index(
  { groupId: 1, studentId: 1, date: 1 },
  { unique: true, name: 'uniq_group_student_date' }
);

// Legacy-compatible unique index (for old controllers/queries)
AttendanceSchema.index(
  { group: 1, student: 1, date: 1 },
  { unique: true, sparse: true, name: 'uniq_group_student_date_legacy' }
);

// Keep legacy/new fields in sync
AttendanceSchema.pre('validate', function () {
  if (this.groupId && !this.group) this.group = this.groupId;
  if (this.studentId && !this.student) this.student = this.studentId;
  if (this.group && !this.groupId) this.groupId = this.group;
  if (this.student && !this.studentId) this.studentId = this.student;
});

module.exports = mongoose.model('Attendance', AttendanceSchema);