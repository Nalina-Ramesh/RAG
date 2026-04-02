import mongoose from 'mongoose';
import { connectDB } from './src/config/db.js';
import { retrieveRelevantChunks } from './src/services/rag.service.js';

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

  const found = target === 'skills'
    ? segments.find((s) => s.marker === 'technical skills') || segments.find((s) => s.marker === 'skills')
    : segments.find((s) => s.marker === target);
  if (!found?.body) return '';

  return found.body
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, 650);
};

(async () => {
  await connectDB();
  const contexts = await retrieveRelevantChunks('projects', 5, 'T3L0UR0A');
  console.log('contexts', contexts.length);
  console.log('section candidates:');
  contexts.forEach((c,i)=>console.log(i, c.citation, c.content.substring(0,200)));
  const block = extractSectionBlock('projects', contexts);
  console.log('extractSectionBlock:', block);
  await mongoose.disconnect();
})();
