const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

/**
 * Validates a PDF file or buffer.
 * Ensures the file exists, is non-empty, is not password protected, and is not corrupted.
 *
 * @param {Buffer|string} pdfSource
 * @param {string} [label='PDF']
 * @returns {Promise<{ pageCount: number, buffer: Buffer }>}
 */
async function validatePdf(pdfSource, label = 'PDF') {
  let buffer;

  if (Buffer.isBuffer(pdfSource)) {
    buffer = pdfSource;
  } else if (typeof pdfSource === 'string') {
    if (!fs.existsSync(pdfSource)) {
      throw new Error(`[Validation Error] File not found for ${label}: ${pdfSource}`);
    }
    const stat = fs.statSync(pdfSource);
    if (stat.size === 0) {
      throw new Error(`[Validation Error] File is empty (0 bytes) for ${label}: ${pdfSource}`);
    }
    buffer = fs.readFileSync(pdfSource);
  } else {
    throw new Error(`[Validation Error] Invalid source format for ${label}`);
  }

  // Check PDF header
  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    throw new Error(`[Validation Error] File for ${label} is not a valid PDF (invalid magic header).`);
  }

  // Attempt loading with pdf-lib to test corruption or encryption
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    const pageCount = doc.getPageCount();

    if (pageCount === 0) {
      throw new Error(`[Validation Error] ${label} has 0 pages.`);
    }

    return { pageCount, buffer };
  } catch (err) {
    if (err.message && err.message.toLowerCase().includes('encrypted')) {
      throw new Error(`[Validation Error] ${label} is password-protected or encrypted. Please provide an unencrypted PDF.`);
    }
    throw new Error(`[Validation Error] Failed to parse ${label}: ${err.message}`);
  }
}

/**
 * Validates multiple sections configuration before generation.
 *
 * @param {Array<{ id: string, title: string, file?: string, buffer?: Buffer }>} sections
 */
async function validateSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new Error('[Validation Error] At least one section with a PDF must be provided.');
  }

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const label = `Section ${i + 1} ("${sec.title || 'Untitled'}")`;

    if (!sec.file && !sec.buffer) {
      throw new Error(`[Validation Error] No PDF file or buffer provided for ${label}.`);
    }

    await validatePdf(sec.buffer || sec.file, label);
  }
}

module.exports = {
  validatePdf,
  validateSections,
};

