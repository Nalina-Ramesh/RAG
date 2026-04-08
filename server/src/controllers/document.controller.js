import fs from 'fs/promises';

import { Document } from '../models/document.model.js';
import { Chunk } from '../models/chunk.model.js';
import { User } from '../models/user.model.js';
import { ApiError } from '../utils/api-error.js';
import { indexDocument } from '../services/rag.service.js';

const ensureAdminOwnsDocument = (document, user) => {
  if (!document.companyAdminId || document.companyAdminId.toString() !== user._id.toString()) {
    throw new ApiError(403, 'Forbidden');
  }
};

export const uploadDocument = async (req, res) => {
  if (!req.file) throw new ApiError(400, 'PDF file is required');

  const requestedDepartmentCode = req.body.departmentCode?.trim().toUpperCase();
  if (!requestedDepartmentCode) {
    throw new ApiError(400, 'Department code is required to upload a team document');
  }
  const departmentCode = requestedDepartmentCode;

  const admin = await User.findById(req.user._id);
  if (!admin) throw new ApiError(404, 'Admin user not found');

  const validDepartment = (admin.departmentCodes || []).some((dept) => dept.code === requestedDepartmentCode);
  if (!validDepartment) throw new ApiError(400, 'Invalid department code for admin');

  const document = await Document.create({
    title: req.body.title || req.file.originalname,
    originalName: req.file.originalname,
    storagePath: req.file.path,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
    companyCode: req.user.companyCode,
    departmentCode,
    companyAdminId: req.user._id,
    indexingStatus: 'pending'
  });

  indexDocument(document._id).catch(() => null);

  res.status(201).json({ document });
};

export const listDocuments = async (req, res) => {
  let filter;

  if (req.user.role === 'admin') {
    filter = { companyAdminId: req.user._id };
    if (req.query.departmentCode) {
      filter.departmentCode = req.query.departmentCode.trim().toUpperCase();
    }
  } else {
    const departmentCode = req.user.departmentCode;
    if (!departmentCode) {
      throw new ApiError(403, 'Employee must have department code to list documents');
    }
    filter = {
      companyCode: req.user.companyCode,
      departmentCode
    };
  }

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

