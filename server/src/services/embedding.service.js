import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';

const genai = new GoogleGenAI({ apiKey: env.GOOGLE_API_KEY });

let localEmbedder = null;

async function getLocalEmbedder() {
  if (localEmbedder) return localEmbedder;

  const { pipeline } = await import('@xenova/transformers');
  localEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return localEmbedder;
}

export const embedText = async (text) => {
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid text input for embedding');
  }

  if (env.USE_LOCAL_EMBEDDING === 'true') {
    const model = await getLocalEmbedder();
    const output = await model(text, { pooling: 'mean', normalize: true });
    const vector = Array.from(output.data ?? []);
    return vector;
  }

  const res = await genai.models.embedContent({
    model: env.EMBEDDING_MODEL,
    contents: text
  });

  return res.embeddings?.[0]?.values ?? [];
};

