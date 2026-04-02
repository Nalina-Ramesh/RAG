import { z } from 'zod';

import { ChatSession } from '../models/chat-session.model.js';
import { ApiError } from '../utils/api-error.js';
import { buildCitations, retrieveRelevantChunks, streamAnswer } from '../services/rag.service.js';

const askSchema = z.object({
  sessionId: z.string().optional(),
  question: z.string().min(4).max(4000)
});

export const listSessions = async (req, res) => {
  const sessions = await ChatSession.find({ userId: req.user._id })
    .select('title updatedAt createdAt')
    .sort({ updatedAt: -1 });

  res.json({ sessions });
};

export const getSession = async (req, res) => {
  const session = await ChatSession.findOne({
    _id: req.params.sessionId,
    userId: req.user._id
  });
  if (!session) throw new ApiError(404, 'Session not found');
  res.json({ session });
};

const ensureSession = async (userId, sessionId, question) => {
  if (sessionId) {
    const existing = await ChatSession.findOne({ _id: sessionId, userId });
    if (!existing) throw new ApiError(404, 'Session not found');
    return existing;
  }

  return ChatSession.create({
    userId,
    title: question.slice(0, 60),
    messages: []
  });
};

export const askQuestionSSE = async (req, res) => {
  const { question, sessionId } = askSchema.parse(req.body);
  const session = await ensureSession(req.user._id, sessionId, question);

  session.messages.push({ role: 'user', content: question, citations: [] });
  await session.save();

  const contexts = await retrieveRelevantChunks(question, 5, req.user.companyCode);
  const citations = buildCitations(contexts);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let answerText = '';

  const emit = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  emit('meta', { sessionId: session._id, citations });

  answerText = await streamAnswer(question, contexts, (token) => {
    emit('token', { token });
  });

  session.messages.push({
    role: 'assistant',
    content: answerText,
    citations
  });
  await session.save();

  emit('done', {
    answer: answerText,
    citations,
    sessionId: session._id
  });

  res.end();
};

