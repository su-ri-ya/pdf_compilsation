const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let pdfjsModule = null;

async function getPdfJs() {
  if (!pdfjsModule) {
    const legacyPath = path.resolve(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.mjs');
    const fileUrl = pathToFileURL(legacyPath).href;
    pdfjsModule = await import(fileUrl);
  }
  return pdfjsModule;
}

/**
 * Extracts text from all pages of a PDF document using pdfjs-dist.
 *
 * @param {Buffer|Uint8Array} dataBuffer
 * @returns {Promise<Array<{ pageNumber: number, text: string }>>}
 */
async function extractAllPagesText(dataBuffer) {
  const pdfjs = await getPdfJs();
  const uint8Data = new Uint8Array(dataBuffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8Data,
    useSystemFonts: true,
    verbosity: 0,
  });

  const pdf = await loadingTask.promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item) => item.str).join(' ');
    pages.push({
      pageNumber: i,
      text: text.trim(),
    });
  }

  return pages;
}

/**
 * Resolves which pages to copy from the Manpower & Operation report.
 * Supports automatic text detection or explicit page selection.
 *
 * @param {Buffer|string} pdfSource - PDF Buffer or file path
 * @param {string} targetMonth - e.g. "SEPTEMBER"
 * @param {Object} [options]
 * @param {'auto'|'manual'} [options.mode='auto']
 * @param {number|null} [options.page=null] - 1-based page index if manual
 * @returns {Promise<{ selectedPages: number[], totalPages: number, detectionSummary: string }>}
 *   selectedPages is 0-based page indices suitable for pdf-lib copyPages
 */
async function resolveManpowerPages(pdfSource, targetMonth = 'SEPTEMBER', options = {}) {
  let buffer;
  if (Buffer.isBuffer(pdfSource)) {
    buffer = pdfSource;
  } else if (typeof pdfSource === 'string') {
    if (!fs.existsSync(pdfSource)) {
      throw new Error(`Manpower report PDF not found at path: ${pdfSource}`);
    }
    buffer = fs.readFileSync(pdfSource);
  } else {
    throw new Error('Invalid PDF source provided to resolveManpowerPages');
  }

  const { mode = 'auto', page = null } = options;

  // Extract text from all pages
  const pagesText = await extractAllPagesText(buffer);
  const totalPages = pagesText.length;

  if (totalPages === 0) {
    throw new Error('Manpower report PDF has 0 pages or cannot be read.');
  }

  // If only 1 page in document, select it directly
  if (totalPages === 1) {
    return {
      selectedPages: [0],
      totalPages: 1,
      detectionSummary: 'Single page manpower report detected (Page 1).',
    };
  }

  // Manual Mode
  if (mode === 'manual' || page !== null) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
      throw new Error(
        `Invalid manpower page configured: ${page}. The document only has ${totalPages} pages.`
      );
    }
    return {
      selectedPages: [pageNum - 1],
      totalPages,
      detectionSummary: `Manually configured page ${pageNum} of ${totalPages} selected.`,
    };
  }

  // Auto Mode: Detect target month
  const targetLower = targetMonth.toLowerCase().trim();
  const matchedPages = [];

  for (const p of pagesText) {
    const textLower = p.text.toLowerCase();
    // Check if target month is explicitly mentioned
    if (textLower.includes(targetLower)) {
      matchedPages.push(p.pageNumber);
    }
  }

  if (matchedPages.length === 1) {
    const sel = matchedPages[0];
    return {
      selectedPages: [sel - 1],
      totalPages,
      detectionSummary: `Auto-detected ${targetMonth} report on Page ${sel} of ${totalPages} via text inspection.`,
    };
  }

  if (matchedPages.length > 1) {
    // If multiple pages match, try stricter check for "Reporting Period: <Month>"
    const strictMatches = pagesText.filter((p) => {
      const txt = p.text.toLowerCase();
      return (
        txt.includes(`reporting period: ${targetLower}`) ||
        txt.includes(`reporting period:   ${targetLower}`) ||
        txt.includes(`${targetLower} 2026`) ||
        txt.includes(`${targetLower}-2026`)
      );
    });

    if (strictMatches.length === 1) {
      const sel = strictMatches[0].pageNumber;
      return {
        selectedPages: [sel - 1],
        totalPages,
        detectionSummary: `Strict match found for ${targetMonth} on Page ${sel} of ${totalPages}.`,
      };
    }

    throw new Error(
      `Multiple pages in the manpower report mention "${targetMonth}" (Pages: ${matchedPages.join(', ')} of ${totalPages}). Please configure the exact manpower page.`
    );
  }

  // 0 matches found
  const pageSummaries = pagesText
    .map((p) => `Page ${p.pageNumber}: "${p.text.slice(0, 60).replace(/\s+/g, ' ')}..."`)
    .join('\n');

  throw new Error(
    `Could not locate target month "${targetMonth}" in the manpower report (${totalPages} total pages).\n` +
    `Found pages:\n${pageSummaries}\n` +
    `Please configure the exact manpower page to include.`
  );
}

module.exports = {
  extractAllPagesText,
  resolveManpowerPages,
};

