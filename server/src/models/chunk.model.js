import mongoose from 'mongoose';

const citationSchema = new mongoose.Schema(
  {
    page: { type: Number, required: true },
    section: { type: String, default: 'Unknown Section' }
  },
  { _id: false }
);

const chunkSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    citation: { type: citationSchema, required: true },
    companyCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    departmentCode: { type: String, required: true, uppercase: true, trim: true, index: true }
  },
  { timestamps: true }
);

chunkSchema.index({ documentId: 1, 'citation.page': 1 });

export const Chunk = mongoose.model('Chunk', chunkSchema);

