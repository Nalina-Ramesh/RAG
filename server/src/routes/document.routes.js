import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

import { asyncHandler } from '../utils/async-handler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  deleteDocument,
  listDocuments,
  reindexDocument,
  uploadDocument
} from '../controllers/document.controller.js';

const router = Router();

const uploadDir = path.resolve('server/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

router.use(asyncHandler(requireAuth));

router.get('/', asyncHandler(listDocuments));
router.post('/', asyncHandler(requireRole('admin')), upload.single('file'), asyncHandler(uploadDocument));
router.delete('/:documentId', asyncHandler(requireRole('admin')), asyncHandler(deleteDocument));
router.post('/:documentId/reindex', asyncHandler(requireRole('admin')), asyncHandler(reindexDocument));

export default router;

