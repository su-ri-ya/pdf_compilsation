const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const COLOR_BLUE = rgb(0 / 255, 91 / 255, 158 / 255);    // #005b9e
const COLOR_SLATE = rgb(70 / 255, 80 / 255, 90 / 255);   // #46505a
const COLOR_GRAY = rgb(90 / 255, 99 / 255, 109 / 255);   // #5a636d

/**
 * Helper to auto-wrap or scale text to fit within maxWidth
 */
function wrapOrScaleText(text, font, initialSize, maxWidth, maxLines = 2) {
  let fontSize = initialSize;
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return { lines: [''], fontSize };

  while (fontSize > 18) {
    const lines = [];
    let currentLine = words[0];
    let fits = true;

    for (let i = 1; i < words.length; i++) {
      const testLine = `${currentLine} ${words[i]}`;
      if (font.widthOfTextAtSize(testLine, fontSize) <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);

    if (lines.length <= maxLines && lines.every((l) => font.widthOfTextAtSize(l, fontSize) <= maxWidth)) {
      return { lines, fontSize };
    }
    fontSize -= 2;
  }

  return { lines: [text], fontSize };
}

/**
 * Generates the master front cover PDF.
 * Matches the layout, typography, colors, and logo positioning of SEP_REPORT.pdf / OCT_REPORT.pdf.
 *
 * @param {Object} options
 * @param {string} options.project - e.g. "PRESTIGE POLYGON"
 * @param {string} options.system - e.g. "STP – 240 KLD"
 * @param {string} options.month - e.g. "SEPTEMBER"
 * @param {string} options.year - e.g. "2026"
 * @param {Buffer|string} [options.logoBufferOrPath] - Optional custom logo file path or Buffer
 * @returns {Promise<PDFDocument>}
 */
async function generateMainCover(options = {}) {
  const project = (options.project || config.project).toUpperCase();
  const system = (options.system || config.system).toUpperCase();
  const month = (options.month || config.month).toUpperCase();
  const year = String(options.year || config.year).toUpperCase();
  const dateLine = `${month} ${year}`;

  const pdfDoc = await PDFDocument.create();
  const pageWidth = 595.56;
  const pageHeight = 842.04;
  const page = pdfDoc.addPage([pageWidth, pageHeight]);

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // 1. Embed Logo at Top Right if available
  let logoBuffer = null;
  if (options.logoBuffer && Buffer.isBuffer(options.logoBuffer)) {
    logoBuffer = options.logoBuffer;
  } else if (typeof options.logoBufferOrPath === 'string' && fs.existsSync(options.logoBufferOrPath)) {
    logoBuffer = fs.readFileSync(options.logoBufferOrPath);
  } else if (fs.existsSync(config.defaultLogoPath)) {
    logoBuffer = fs.readFileSync(config.defaultLogoPath);
  }

  if (logoBuffer) {
    try {
      let logoImage;
      try {
        logoImage = await pdfDoc.embedPng(logoBuffer);
      } catch {
        logoImage = await pdfDoc.embedJpg(logoBuffer);
      }

      const imgWidth = 158.15;
      const imgHeight = (logoImage.height / logoImage.width) * imgWidth;
      const imgX = pageWidth - imgWidth - 20;
      const imgY = pageHeight - imgHeight - 20;

      page.drawImage(logoImage, {
        x: imgX,
        y: imgY,
        width: imgWidth,
        height: imgHeight,
      });
    } catch (err) {
      console.warn('[CoverGenerator] Warning: Could not embed logo image:', err.message);
    }
  }

  const maxContentWidth = 500;

  // 2. Draw Project Name with Text Wrapping (e.g. "PRESTIGE POLYGON")
  const projectWrapped = wrapOrScaleText(project, boldFont, 42, maxContentWidth, 2);
  const projLineSpacing = projectWrapped.fontSize + 10;
  const projStartY = 540 + (projectWrapped.lines.length > 1 ? projLineSpacing / 2 : 0);

  projectWrapped.lines.forEach((line, idx) => {
    const textWidth = boldFont.widthOfTextAtSize(line, projectWrapped.fontSize);
    const x = (pageWidth - textWidth) / 2;
    const y = projStartY - idx * projLineSpacing;
    page.drawText(line, {
      x,
      y,
      size: projectWrapped.fontSize,
      font: boldFont,
      color: COLOR_BLUE,
    });
  });

  // 3. Draw System / Capacity with Text Wrapping (e.g. "STP - 240 KLD")
  const cleanSystem = system.replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-');
  const systemWrapped = wrapOrScaleText(cleanSystem, boldFont, 38, maxContentWidth, 2);
  const sysLineSpacing = systemWrapped.fontSize + 8;
  const sysStartY = 465;

  systemWrapped.lines.forEach((line, idx) => {
    const textWidth = boldFont.widthOfTextAtSize(line, systemWrapped.fontSize);
    const x = (pageWidth - textWidth) / 2;
    const y = sysStartY - idx * sysLineSpacing;
    page.drawText(line, {
      x,
      y,
      size: systemWrapped.fontSize,
      font: boldFont,
      color: COLOR_SLATE,
    });
  });

  // 4. Draw Reporting Month & Year (e.g. "SEPTEMBER 2026")
  const dateFontSize = 42;
  const dateTextWidth = boldFont.widthOfTextAtSize(dateLine, dateFontSize);
  const dateX = (pageWidth - dateTextWidth) / 2;
  const dateY = 350;
  page.drawText(dateLine, {
    x: dateX,
    y: dateY,
    size: dateFontSize,
    font: boldFont,
    color: COLOR_BLUE,
  });

  // 5. Draw "REPORT"
  const reportText = 'REPORT';
  const reportFontSize = 42;
  const reportTextWidth = regularFont.widthOfTextAtSize(reportText, reportFontSize);
  const reportX = (pageWidth - reportTextWidth) / 2;
  const reportY = 285;
  page.drawText(reportText, {
    x: reportX,
    y: reportY,
    size: reportFontSize,
    font: regularFont,
    color: COLOR_GRAY,
  });

  return pdfDoc;
}

module.exports = {
  generateMainCover,
  COLOR_BLUE,
  COLOR_SLATE,
  COLOR_GRAY,
};
