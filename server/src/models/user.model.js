import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'employee'], required: true },
    companyCode: { type: String, uppercase: true, trim: true, index: true },
    companyAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    departmentCodes: [
      {
        name: { type: String, trim: true, required: true },
        code: { type: String, uppercase: true, trim: true, required: true }
      }
    ],
    departmentCode: { type: String, uppercase: true, trim: true }
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);

