import { Router } from 'express';

import { asyncHandler } from '../utils/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { askQuestionSSE, getSession, listSessions } from '../controllers/chat.controller.js';

const router = Router();

router.use(asyncHandler(requireAuth));
router.get('/sessions', asyncHandler(listSessions));
router.get('/sessions/:sessionId', asyncHandler(getSession));
router.post('/ask/stream', asyncHandler(askQuestionSSE));

export default router;

