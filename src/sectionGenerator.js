const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { COLOR_BLUE } = require('./coverGenerator');

/**
 * Word-wraps text so each line fits within maxWidth.
 * Preserves user-provided newlines as separate paragraphs.
 *
 * @param {string} text
 * @param {PDFFont} font
 * @param {number} fontSize
 * @param {number} maxWidth
 * @returns {string[]}
 */
function wrapText(text, font, fontSize, maxWidth) {
  const paragraphs = String(text || '')
    .split(/\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return ['SECTION REPORT'];

  const lines = [];

  for (const para of paragraphs) {
    const cleanPara = para.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-').toUpperCase();
    const words = cleanPara.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;

    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const testLine = `${currentLine} ${words[i]}`;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generates a clean, professional section divider cover PDF page with automatic text wrapping.
 * Matches the divider page layout in SEP_REPORT.pdf and OCT_REPORT.pdf.
 *
 * @param {string} titleText - The title to display
 * @param {Object} [options]
 * @param {number} [options.maxLineWidth=480] - Maximum printable text width before wrapping
 * @param {number} [options.initialFontSize=38] - Starting font size
 * @returns {Promise<PDFDocument>}
 */
async function generateSectionCover(titleText, options = {}) {
  const pdfDoc = await PDFDocument.create();
  const pageWidth = 595.56;
  const pageHeight = 842.04;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const maxWidth = options.maxLineWidth || 480;

  // Determine initial font size and wrap lines
  let fontSize = options.initialFontSize || 38;
  let lines = wrapText(titleText, boldFont, fontSize, maxWidth);

  // If any single word or line still exceeds maxWidth or if there are too many lines, scale down font
  while (
    fontSize > 20 &&
    (lines.some((line) => boldFont.widthOfTextAtSize(line, fontSize) > maxWidth) || lines.length > 4)
  ) {
    fontSize -= 2;
    lines = wrapText(titleText, boldFont, fontSize, maxWidth);
  }

  const lineSpacing = fontSize + 12;
  const totalBlockHeight = (lines.length - 1) * lineSpacing + fontSize;
  // Page vertical center is pageHeight / 2 (~ 421)
  const startY = pageHeight / 2 + totalBlockHeight / 2 - fontSize * 0.75;

  lines.forEach((line, index) => {
    const textWidth = boldFont.widthOfTextAtSize(line, fontSize);
    const x = (pageWidth - textWidth) / 2;
    const y = startY - index * lineSpacing;

    page.drawText(line, {
      x,
      y,
      size: fontSize,
      font: boldFont,
      color: COLOR_BLUE,
    });
  });

  return pdfDoc;
}

module.exports = {
  generateSectionCover,
  wrapText,
};
