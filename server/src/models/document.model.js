import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    originalName: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    departmentCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    companyAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    indexingStatus: {
      type: String,
      enum: ['pending', 'processing', 'ready', 'failed'],
      default: 'pending'
    },
    totalChunks: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const Document = mongoose.model('Document', documentSchema);

