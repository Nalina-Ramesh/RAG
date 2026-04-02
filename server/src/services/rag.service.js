import fs from 'fs/promises';
import pdf from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { Chunk } from '../models/chunk.model.js';
import { Document } from '../models/document.model.js';
import { embedText } from './embedding.service.js';
import { chunkDocumentText } from './chunking.service.js';

const genai = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });

const cosineSimilarity = (a, b) => {
  if (!a.length || !b.length || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return -1;
  return dot / denom;
};

const lexicalSimilarity = (query, text) => {
  const queryTerms = (query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((t) => t.length > 2);

  const textTerms = new Set(
    (text || '')
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .filter((t) => t.length > 2)
  );

  if (!queryTerms.length || !textTerms.size) return 0;
  const hits = queryTerms.filter((t) => textTerms.has(t)).length;
  return hits / queryTerms.length;
};

const normalizeToken = (token) => {
  const base = (token || '').toLowerCase().trim();
  if (base.length > 4 && base.endsWith('ies')) return `${base.slice(0, -3)}y`;
  if (base.length > 4 && base.endsWith('es')) return base.slice(0, -2);
  if (base.length > 3 && base.endsWith('s')) return base.slice(0, -1);
  return base;
};

const tokenize = (text) =>
  (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map(normalizeToken)
    .filter((t) => t.length > 2);

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'into', 'your', 'about', 'what', 'when', 'where',
  'which', 'who', 'whom', 'why', 'how', 'are', 'was', 'were', 'been', 'being', 'can', 'could', 'should', 'would',
  'will', 'shall', 'than', 'then', 'them', 'they', 'their', 'there', 'here', 'also', 'only', 'very', 'more', 'most',
  'such', 'any', 'all', 'each', 'few', 'our', 'his', 'her', 'its', 'you', 'use', 'used', 'using', 'is', 'of', 'to',
  'in', 'on', 'at', 'by', 'as', 'an', 'or'
]);

const extractKeywords = (text) => tokenize(text).filter((t) => !STOP_WORDS.has(t));

const keywordCoverage = (query, text) => {
  const terms = extractKeywords(query);
  if (!terms.length) return 0;
  const textTerms = new Set(tokenize(text));
  let covered = 0;
  for (const term of terms) {
    if (textTerms.has(term)) covered += 1;
  }
  return covered / terms.length;
};

const phraseScore = (query, text) => {
  const keywords = extractKeywords(query);
  if (keywords.length < 2) return 0;
  const lowered = (text || '').toLowerCase();

  let best = 0;
  for (let size = Math.min(4, keywords.length); size >= 2; size -= 1) {
    for (let i = 0; i + size <= keywords.length; i += 1) {
      const phrase = keywords.slice(i, i + size).join(' ');
      if (lowered.includes(phrase)) {
        best = Math.max(best, size / Math.min(4, keywords.length));
      }
    }
    if (best > 0) break;
  }

  return best;
};

const escapeRegex = (text) =>
  String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isSectionHeaderCandidate = (text, target) => {
  if (!text || !target) return false;

  const normalized = String(text).replace(/\r\n/g, '\n');
  const heading = target.toUpperCase();
  const headerRx = new RegExp(`(?:^|\\n)\\s*${escapeRegex(heading)}\\s*(?:[:\\-]\\s*|\\n|$)`, 'm');
  return headerRx.test(normalized);
};

const keywordOnlyFallback = (query, chunks, limit = 4) => {
  const keywords = extractKeywords(query);
  if (!keywords.length) return [];

  const ranked = chunks
    .map((chunk) => {
      const lowered = (chunk.content || '').toLowerCase();
      const hits = keywords.filter((kw) => lowered.includes(kw)).length;
      const hitRatio = hits / keywords.length;
      const lex = lexicalSimilarity(query, chunk.content);
      const coverage = keywordCoverage(query, chunk.content);
      const phrase = phraseScore(query, chunk.content);
      const score = hitRatio * 0.45 + coverage * 0.25 + lex * 0.2 + phrase * 0.1;
      return { ...chunk, keywordHits: hits, score };
    })
    .filter((item) => item.keywordHits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked;
};

const splitSentences = (text) => {
  const base = (text || '')
    .split(/[\n\r]+|(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const windows = [];
  for (const sentence of base) {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= 50) {
      windows.push(sentence);
      continue;
    }
    for (let i = 0; i < words.length; i += 20) {
      const chunk = words.slice(i, i + 35).join(' ').trim();
      if (chunk.length > 40) windows.push(chunk);
      if (i + 35 >= words.length) break;
    }
  }

  return windows;
};

const queryAwareExtractiveAnswer = (query, contexts) => {
  const candidates = [];
  const queryKeywords = extractKeywords(query);

  for (const context of contexts) {
    const sentences = splitSentences(context.content);
    for (const sentence of sentences) {
      const lowered = sentence.toLowerCase();
      const lex = lexicalSimilarity(query, sentence);
      const coverage = keywordCoverage(query, sentence);
      const phrase = phraseScore(query, sentence);
      const keywordHits = queryKeywords.filter((kw) => lowered.includes(kw)).length;
      const keywordRatio = queryKeywords.length ? keywordHits / queryKeywords.length : 0;
      const startsWithKeyword = queryKeywords.some((kw) => lowered.startsWith(kw)) ? 0.08 : 0;
      const score = lex * 0.3 + coverage * 0.35 + phrase * 0.2 + keywordRatio * 0.15 + startsWithKeyword;
      candidates.push({ sentence, score });
    }
  }

  const top = candidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => c.score > 0.06)
    .slice(0, 3)
    .map((c) => c.sentence);

  if (!top.length) {
    return "I don't know based on the available SOPs";
  }

  return top.join(' ');
};

const selectBestEvidenceSentences = (query, content, maxSentences = 3) => {
  const asksContactInfo = /\b(email|phone|mobile|contact|linkedin|github|address)\b/i.test(query || '');
  const queryKeywords = extractKeywords(query);
  const candidates = splitSentences(content)
    .map((sentence) => {
      const lowered = sentence.toLowerCase();
      const hasSensitiveContact = /(@|\+\d{1,3}|linkedin\.com|github\.com|\b\d{10}\b)/i.test(sentence);
      if (hasSensitiveContact && !asksContactInfo) {
        return null;
      }

      const lex = lexicalSimilarity(query, sentence);
      const coverage = keywordCoverage(query, sentence);
      const phrase = phraseScore(query, sentence);
      const keywordHits = queryKeywords.length
        ? queryKeywords.filter((kw) => lowered.includes(kw)).length / queryKeywords.length
        : 0;

      if (queryKeywords.length && keywordHits === 0 && phrase === 0) {
        return null;
      }

      return {
        sentence,
        score: lex * 0.3 + coverage * 0.35 + phrase * 0.2 + keywordHits * 0.15
      };
    })
    .filter(Boolean)
    .filter((c) => c.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .map((c) => c.sentence.trim());

  return candidates;
};

const SECTION_MARKERS = [
  'summary',
  'education',
  'experience',
  'technical skills',
  'skills',
  'projects',
  'certifications'
];

const normalizeSectionQuery = (query) => {
  const lowered = (query || '').toLowerCase();
  if (lowered.includes('skills')) return 'skills';
  for (const marker of SECTION_MARKERS) {
    if (lowered.includes(marker)) return marker;
  }
  return '';
};

const isSectionLookupQuery = (query) => {
  const cleaned = (query || '').toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;

  if (SECTION_MARKERS.includes(cleaned)) return true;
  if (cleaned === 'technical skills') return true;

  const tokens = cleaned.split(' ');
  if (tokens.length > 3) return false;

  return SECTION_MARKERS.some((marker) => cleaned === marker || cleaned === `show ${marker}` || cleaned === `list ${marker}`);
};

const extractSectionBlock = (query, contexts) => {
  const target = normalizeSectionQuery(query);
  if (!target) return '';

  const joined = contexts.map((c) => c.content || '').join('\n');
  if (!joined.trim()) return '';

  const escapedMarkers = [...SECTION_MARKERS]
    .sort((a, b) => b.length - a.length)
    .map((marker) => marker.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
  const sectionRx = new RegExp(`\\b(${escapedMarkers.join('|')})\\b\\s*[:\\-]?`, 'gi');

  const normalized = joined.replace(sectionRx, (_full, marker) => `\n@@SECTION:${String(marker).toLowerCase()}@@ `);

  const segments = normalized
    .split(/\n@@SECTION:/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const idx = segment.indexOf('@@');
      if (idx <= 0) return null;
      const marker = segment.slice(0, idx).trim().toLowerCase();
      const body = segment.slice(idx + 2).trim();
      return { marker, body };
    })
    .filter(Boolean);

  let found = null;
  if (target === 'skills') {
    found = segments.find((s) => s.marker === 'technical skills') || segments.find((s) => s.marker === 'skills');
  } else {
    const markerCandidates = segments.filter((s) => s.marker === target);
    if (markerCandidates.length) {
      markerCandidates.sort((a, b) => b.body.length - a.body.length);
      found = markerCandidates[0];
    }
  }

  if (found?.body) {
    return found.body
      .replace(/\s{2,}/g, ' ')
      .replace(/\n{2,}/g, '\n')
      .trim()
      .slice(0, 650);
  }

  // fallback: prioritize chunks that look like section headers.
  const headerContext = contexts.find((ctx) => isSectionHeaderCandidate(ctx.content, target));
  if (headerContext) {
    const content = headerContext.content || '';
    const lower = content.toLowerCase();
    const idx = lower.indexOf(target);
    if (idx >= 0) {
      const start = Math.max(0, idx - 80);
      const end = Math.min(content.length, idx + 520);
      return content.slice(start, end).replace(/\s{2,}/g, ' ').trim();
    }
  }

  // fallback: direct word match if no header candidate exists.
  const markerRx = new RegExp(`\\b${escapeRegex(target)}\\b`, 'i');
  for (const context of contexts) {
    const content = context.content || '';
    if (!markerRx.test(content)) continue;

    const lower = content.toLowerCase();
    const idx = lower.indexOf(target);
    if (idx < 0) continue;

    const start = Math.max(0, idx - 80);
    const end = Math.min(content.length, idx + 520);
    return content.slice(start, end).replace(/\s{2,}/g, ' ').trim();
  }

  return '';
};

const extractSectionSnippet = (query, contexts) => {
  const queryKeywords = extractKeywords(query);
  if (!queryKeywords.length) return '';

  for (const context of contexts) {
    const text = context.content || '';
    const lowered = text.toLowerCase();

    let firstMatchIndex = -1;
    for (const keyword of queryKeywords) {
      const idx = lowered.indexOf(keyword);
      if (idx >= 0 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
        firstMatchIndex = idx;
      }
    }

    if (firstMatchIndex >= 0) {
      const start = Math.max(0, firstMatchIndex - 40);
      const end = Math.min(text.length, firstMatchIndex + 520);
      return text.slice(start, end).trim();
    }
  }

  return '';
};

const extractStrictSectionAnswer = (query, contexts) => {
  const keywords = extractKeywords(query);
  if (!keywords.length) return '';

  const sentences = contexts
    .flatMap((ctx) => splitSentences(ctx.content || ''))
    .map((sentence) => {
      const lowered = sentence.toLowerCase();
      const hits = keywords.filter((kw) => lowered.includes(kw)).length;
      const phrase = phraseScore(query, sentence);
      const coverage = keywordCoverage(query, sentence);
      const score = (keywords.length ? hits / keywords.length : 0) * 0.5 + phrase * 0.3 + coverage * 0.2;
      return { sentence: sentence.trim(), hits, score };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.sentence);

  return sentences.join('. ');
};

export const indexDocument = async (documentId) => {
  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found');

  document.indexingStatus = 'processing';
  await document.save();

  try {
    const buffer = await fs.readFile(document.storagePath);
    const parsed = await pdf(buffer);
    const chunks = chunkDocumentText(parsed.text, 1000, 100);

    await Chunk.deleteMany({ documentId: document._id });

    const records = [];
    for (const chunk of chunks) {
      let embedding = [];
      try {
        embedding = await embedText(chunk.content);
      } catch (error) {
        logger.error('Chunk embedding failed, storing chunk without embedding', error);
      }

      records.push({
        documentId: document._id,
        content: chunk.content,
        embedding,
        citation: chunk.citation
      });
    }

    if (records.length) {
      await Chunk.insertMany(records, { ordered: false });
    }

    document.totalChunks = records.length;
    document.indexingStatus = 'ready';
    await document.save();
    logger.info(`Indexed document ${document._id} with ${records.length} chunks`);
  } catch (error) {
    document.indexingStatus = 'failed';
    await document.save();
    logger.error('Indexing failed', error);
    throw error;
  }
};

export const retrieveRelevantChunks = async (query, topK = 8, companyCode) => {
  const queryKeywords = extractKeywords(query);

  let queryEmbedding = [];
  try {
    queryEmbedding = await embedText(query);
  } catch (error) {
    logger.error('Query embedding failed, using lexical fallback retrieval', error);
  }

  // Prefer Atlas vector search with a dedicated index if available
  let scopedChunks = [];
  if (queryEmbedding.length) {
    try {
      const pipeline = [
        {
          $vectorSearch: {
            index: 'default',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: 200,
            limit: topK
          }
        }
      ];

      if (companyCode) {
        pipeline.push({
          $match: {
            'documentId.companyCode': companyCode
          }
        });
      }

      pipeline.push(
        {
          $addFields: {
            semanticScore: { $meta: 'vectorSearchScore' }
          }
        },
        { $sort: { semanticScore: -1 } },
        { $limit: topK }
      );

      const vectorChunks = await Chunk.aggregate(pipeline);
      if (vectorChunks?.length) {
        scopedChunks = vectorChunks;
      }
    } catch (error) {
      logger.warn('Vector search unavailable or failed, falling back to manual retrieval', error);
    }
  }

  if (!scopedChunks.length) {
    const chunks = await Chunk.find({})
      .populate('documentId', 'originalName title companyCode')
      .lean();

    scopedChunks = companyCode
      ? chunks.filter((chunk) => chunk.documentId?.companyCode === companyCode)
      : chunks;
  }

  const sectionTarget = normalizeSectionQuery(query);
  if (isSectionLookupQuery(query) && sectionTarget) {
    const headerMatches = scopedChunks.filter((chunk) => isSectionHeaderCandidate(chunk.content, sectionTarget));
    if (headerMatches.length) {
      return headerMatches.slice(0, topK);
    }

    const sectionMatches = scopedChunks.filter((chunk) => {
      const content = chunk.content || '';
      return new RegExp(`\\b${escapeRegex(sectionTarget)}\\b`, 'i').test(content);
    });

    if (sectionMatches.length) {
      return sectionMatches.slice(0, topK);
    }
  }

  const ranked = scopedChunks
    .map((chunk) => ({
      ...chunk,
      semanticScore: queryEmbedding.length ? cosineSimilarity(queryEmbedding, chunk.embedding || []) : -1,
      lexicalScore: lexicalSimilarity(query, chunk.content),
      coverageScore: keywordCoverage(query, chunk.content),
      phraseMatchScore: phraseScore(query, chunk.content),
      keywordHits: queryKeywords.length
        ? queryKeywords.filter((kw) => chunk.content?.toLowerCase().includes(kw)).length
        : 0
    }))
    .map((chunk) => ({
      ...chunk,
      score:
        Math.max(chunk.semanticScore, 0) * 0.45 +
        Math.max(chunk.lexicalScore, 0) * 0.2 +
        Math.max(chunk.coverageScore, 0) * 0.2 +
        Math.max(chunk.phraseMatchScore, 0) * 0.1 +
        (queryKeywords.length ? chunk.keywordHits / queryKeywords.length : 0) * 0.05
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const topScore = ranked[0]?.score ?? 0;
  const hasGoodSignal = ranked.some((item) => item.keywordHits > 0 || item.phraseMatchScore > 0 || item.semanticScore > 0.35);

  if (queryKeywords.length && (topScore < 0.08 || !hasGoodSignal)) {
    const fallback = keywordOnlyFallback(query, scopedChunks, Math.min(4, topK));
    if (fallback.length) {
      logger.warn('Semantic retrieval weak, using keyword fallback', {
        companyCode,
        topFallbackScore: fallback[0]?.score ?? null,
        queryKeywords: queryKeywords.slice(0, 8)
      });
      return fallback;
    }

    logger.warn('No reliable retrieval signal for query', {
      companyCode,
      topScore,
      queryKeywords: queryKeywords.slice(0, 8)
    });
    return [];
  }

  const confident = ranked.filter(
    (item) => item.score > 0.1 && (!queryKeywords.length || item.keywordHits > 0 || item.phraseMatchScore > 0)
  );
  if (confident.length) {
    const relativeCutoff = (confident[0]?.score || 0) * 0.72;
    return confident.filter((item) => item.score >= relativeCutoff).slice(0, topK);
  }

  if (ranked.length) {
    const nonZero = ranked.filter(
      (item) => item.score > 0.06 && (!queryKeywords.length || item.keywordHits > 0 || item.phraseMatchScore > 0)
    );
    if (nonZero.length) {
      return nonZero.slice(0, Math.min(3, topK));
    }

    logger.warn('Low-confidence retrieval, skipping answer to avoid incorrect response', {
      topScore: ranked[0]?.score ?? null,
      companyCode,
      topK
    });
    return [];
  }

  return [];
};

const instruction = `You are OpsMind AI, an enterprise SOP assistant.
Rules:
1) Answer strictly and only from provided context.
2) If context does not contain the answer, respond exactly: I don't know based on the available SOPs
3) Keep answer concise, factual, and operational.
4) Do not invent policy names, numbers, or steps.
5) Do not copy document titles, chapter headings, or source labels unless user asks.
6) Answer in clear formatting:
   - First line: direct answer in 1 sentence.
   - Then 2-4 bullet points with only query-relevant facts.
   - If algorithms/methods are asked, return only algorithm names as bullets.
7) Never dump long paragraphs from source.
8) Do not include extra background that is not asked in USER QUESTION.`;

const removeUnaskedSensitiveInfo = (query, text) => {
  const asksContactInfo = /\b(email|phone|mobile|contact|linkedin|github|address)\b/i.test(query || '');
  if (asksContactInfo) return text;

  return (text || '')
    .split(/\r?\n/)
    .filter((line) => !/(@|\+\d{1,3}|linkedin\.com|github\.com|\b\d{10}\b)/i.test(line))
    .join('\n');
};

const stripHeadingNoise = (text) => {
  const lines = (text || '').split(/\r?\n/);
  const cleaned = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^source\s*:/i.test(line))
    .filter((line) => !/^chapter\s*\d+/i.test(line))
    .filter((line) => !/^domain\s*:/i.test(line))
    .filter((line) => !/^problem\s*:/i.test(line));

  return cleaned.join('\n');
};

const formatAnswerText = (query, text) => {
  const normalized = removeUnaskedSensitiveInfo(query, stripHeadingNoise(text))
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!normalized) return normalized;

  const hasBullets = /(^|\n)\s*[-•]\s+/m.test(normalized);
  if (hasBullets) {
    const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const headline = lines.find((l) => !/^[-•]\s+/.test(l));
    const bullets = lines.filter((l) => /^[-•]\s+/.test(l)).slice(0, 3);

    if (headline) {
      return [headline, ...bullets].join('\n');
    }

    return bullets.join('\n');
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return normalized;

  const head = sentences[0];
  const bullets = sentences.slice(1, 4).map((s) => `- ${s}`);
  return [head, ...bullets].join('\n');
};

const buildPrompt = (query, contexts) => {
  const contextText = contexts
    .map(
      (c, index) => {
        const focused = selectBestEvidenceSentences(query, c.content, 3);
        const focusedText = focused.length ? focused.join(' ') : c.content.slice(0, 500);
        return `[CTX-${index + 1}] ${focusedText}\nSource: ${c.documentId?.title || c.documentId?.originalName || 'Document'} | Page ${c.citation.page} | Section ${c.citation.section}`;
      }
    )
    .join('\n\n');

  return `${instruction}\n\nCONTEXT:\n${contextText}\n\nUSER QUESTION:\n${query}\n\nReturn only final formatted answer text.`;
};

const extractiveFallbackAnswer = (query, contexts) => {
  if (!contexts.length) return "I don't know based on the available SOPs";

  const isShortSectionQuery = isSectionLookupQuery(query);
  if (isShortSectionQuery) {
    const sectionBlock = extractSectionBlock(query, contexts);
    if (sectionBlock) return formatAnswerText(query, sectionBlock);

    const strictSection = extractStrictSectionAnswer(query, contexts);
    if (strictSection) return formatAnswerText(query, strictSection);

    const sectionSnippet = extractSectionSnippet(query, contexts);
    if (sectionSnippet) return formatAnswerText(query, sectionSnippet);
  }

  const extracted = queryAwareExtractiveAnswer(query, contexts);
  if (!/i\s+don't\s+know/i.test(extracted)) {
    return formatAnswerText(query, extracted);
  }

  return "I don't know based on the available SOPs";
};

export const generateAnswer = async (query, contexts) => {
  if (!contexts.length) {
    return "I don't know based on the available SOPs";
  }

  const isShortSectionQuery = isSectionLookupQuery(query);
  if (isShortSectionQuery) {
    const sectionBlock = extractSectionBlock(query, contexts);
    if (sectionBlock) {
      return formatAnswerText(query, sectionBlock);
    }

    return "I don't know based on the available SOPs";
  }

  try {
    const prompt = buildPrompt(query, contexts);
    const response = await genai.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt
    });

    const text = response.text?.trim();
    if (!text) {
      logger.warn('generateAnswer: empty LLM text, using extractive fallback');
      return extractiveFallbackAnswer(query, contexts);
    }

    const formatted = formatAnswerText(query, text);
    if (/i\s+don't\s+know/i.test(formatted)) {
      return extractiveFallbackAnswer(query, contexts);
    }

    return formatted;
  } catch (error) {
    logger.error('Answer generation failed', error);
    return extractiveFallbackAnswer(query, contexts);
  }
};

export const streamAnswer = async (query, contexts, onChunk) => {
  if (!contexts.length) {
    onChunk("I don't know based on the available SOPs");
    return "I don't know based on the available SOPs";
  }

  const isShortSectionQuery = isSectionLookupQuery(query);
  if (isShortSectionQuery) {
    const sectionBlock = extractSectionBlock(query, contexts);
    if (sectionBlock) {
      const formatted = formatAnswerText(query, sectionBlock);
      onChunk(formatted);
      return formatted;
    }

    const strictSection = extractStrictSectionAnswer(query, contexts);
    if (strictSection) {
      const formatted = formatAnswerText(query, strictSection);
      onChunk(formatted);
      return formatted;
    }

    const sectionSnippet = extractSectionSnippet(query, contexts);
    if (sectionSnippet) {
      const formatted = formatAnswerText(query, sectionSnippet);
      onChunk(formatted);
      return formatted;
    }

    const extracted = queryAwareExtractiveAnswer(query, contexts);
    if (!/i\s+don't\s+know/i.test(extracted)) {
      const formatted = formatAnswerText(query, extracted);
      onChunk(formatted);
      return formatted;
    }

    onChunk("I don't know based on the available SOPs");
    return "I don't know based on the available SOPs";
  }

  const prompt = buildPrompt(query, contexts);
  let finalText = '';

  try {
    const stream = await genai.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents: prompt
    });

    for await (const part of stream) {
      const text = part.text || '';
      if (text) {
        finalText += text;
        onChunk(text);
      }
    }
  } catch (error) {
    logger.error('Streaming answer failed', error);
    try {
      const fallback = extractiveFallbackAnswer(query, contexts);
      finalText = fallback;
      onChunk(fallback);
    } catch (fallbackError) {
      logger.error('Fallback answer failed', fallbackError);
      finalText = "I don't know based on the available SOPs";
      onChunk(finalText);
    }
  }

  const normalized = formatAnswerText(query, finalText.trim());
  if (!normalized || /i\s+don't\s+know/i.test(normalized)) {
    return "I don't know based on the available SOPs";
  }

  return normalized;
};

export const buildCitations = (contexts) =>
  contexts.map((c) => ({
    documentId: c.documentId?._id,
    documentName: c.documentId?.title || c.documentId?.originalName || 'SOP Document',
    page: c.citation.page,
    section: c.citation.section,
    snippet: c.content.slice(0, 280)
  }));

