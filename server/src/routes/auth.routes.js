import { Router } from 'express';

import { asyncHandler } from '../utils/async-handler.js';
import { createDepartmentCode, login, me, rotateCompanyCode, signup } from '../controllers/auth.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/signup', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.get('/me', asyncHandler(requireAuth), asyncHandler(me));
router.post('/company-code/rotate', asyncHandler(requireAuth), asyncHandler(requireRole('admin')), asyncHandler(rotateCompanyCode));
router.post('/company-code/department', asyncHandler(requireAuth), asyncHandler(requireRole('admin')), asyncHandler(createDepartmentCode));

export default router;

