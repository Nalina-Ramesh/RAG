import fs from 'fs/promises';

import { Document } from '../models/document.model.js';
import { Chunk } from '../models/chunk.model.js';
import { ApiError } from '../utils/api-error.js';
import { indexDocument } from '../services/rag.service.js';

const ensureAdminOwnsDocument = (document, user) => {
  if (!document.companyAdminId || document.companyAdminId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Forbidden');
  }
};

export const uploadDocument = async (req, res) => {
  if (!req.file) throw new ApiError(400, 'PDF file is required');

  const document = await Document.create({
    title: req.body.title || req.file.originalname,
    originalName: req.file.originalname,
    storagePath: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
    companyCode: req.user.companyCode,
    companyAdminId: req.user._id,
    indexingStatus: 'pending'
  });

  indexDocument(document._id).catch(() => null);

  res.status(201).json({ document });
};

export const listDocuments = async (req, res) => {
  const filter = req.user.role === 'admin'
    ? { companyAdminId: req.user._id }
    : { companyCode: req.user.companyCode };

  const documents = await Document.find(filter)
    .populate('uploadedBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({ documents });
};

export const deleteDocument = async (req, res) => {
  const document = await Document.findById(req.params.documentId);
  if (!document) throw new ApiError(404, 'Document not found');
  ensureAdminOwnsDocument(document, req.user);

  await Chunk.deleteMany({ documentId: document._id });
  await Document.deleteOne({ _id: document._id });

  try {
    await fs.unlink(document.storagePath);
  } catch {
    // ignore missing file
  }

  res.json({ message: 'Document deleted' });
};

export const reindexDocument = async (req, res) => {
  const document = await Document.findById(req.params.documentId);
  if (!document) throw new ApiError(404, 'Document not found');
  ensureAdminOwnsDocument(document, req.user);

  await indexDocument(document._id);
  const updated = await Document.findById(document._id);
  res.json({ document: updated });
};

