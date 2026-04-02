const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();

const splitIntoPages = (rawText) => {
  const pages = rawText.split(/\f+/g).map((p) => p.trim()).filter(Boolean);
  if (pages.length === 0) return [{ page: 1, text: rawText }];
  return pages.map((text, index) => ({ page: index + 1, text }));
};

const detectSection = (chunkText) => {
  const lines = chunkText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const heading = lines.find((line) => /^[A-Z][A-Z\s\-:]{5,}$/.test(line) || /^\d+(\.\d+)*\s+/.test(line));
  return heading ? heading.slice(0, 140) : 'General';
};

export const chunkDocumentText = (rawText, chunkSize = 1000, overlap = 100) => {
  const pages = splitIntoPages(rawText);
  const chunks = [];

  for (const page of pages) {
    const text = normalizeWhitespace(page.text);
    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const content = text.slice(start, end).trim();
      if (content.length > 50) {
        chunks.push({
          content,
          citation: {
            page: page.page,
            section: detectSection(content)
          }
        });
      }

      if (end >= text.length) break;
      start = Math.max(0, end - overlap);
    }
  }

  return chunks;
};

