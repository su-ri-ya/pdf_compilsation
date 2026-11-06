const fs = require('fs');
const path = require('path');
const { PDFDocument, PDFName, PDFString } = require('pdf-lib');
const config = require('./config');
const { generateMainCover } = require('./coverGenerator');
const { generateSectionCover } = require('./sectionGenerator');
const { resolveManpowerPages } = require('./manpowerProcessor');
const { validatePdf, validateSections } = require('./validator');

/**
 * Compiles a master STP monthly PDF report with native PDF Table of Contents bookmarks.
 *
 * @param {Object} options
 * @param {string} [options.project]
 * @param {string} [options.system]
 * @param {string} [options.month]
 * @param {string} [options.year]
 * @param {Buffer|string} [options.logoBufferOrPath]
 * @param {Buffer|string} [options.mainCoverPdf] - Optional pre-existing main cover PDF
 * @param {Array<Object>} options.sections - List of sections to compile in order
 * @param {string} [options.outputDir]
 * @param {string} [options.outputFileName]
 * @param {Function} [options.onProgress] - Optional progress callback
 * @returns {Promise<{ outputPath: string, totalPages: number, fileSize: number, fileName: string, sectionStats: Array<Object>, pdfBuffer: Buffer }>}
 */
async function compileMasterReport(options = {}) {
  const project = options.project || config.project;
  const system = options.system || config.system;
  const month = options.month || config.month;
  const year = options.year || config.year;
  const outputDir = options.outputDir || config.outputDir;
  const onProgress = options.onProgress || (() => {});

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const sections = options.sections && options.sections.length > 0
    ? options.sections
    : config.defaultSections;

  console.log(`\n======================================================`);
  console.log(`🚀 Starting STP Master Report Compilation`);
  console.log(`📌 Project: ${project}`);
  console.log(`⚙️  System : ${system}`);
  console.log(`📅 Period : ${month} ${year}`);
  console.log(`📑 Total Sections to process: ${sections.length}`);
  console.log(`======================================================\n`);

  onProgress({ stage: 'validating', message: 'Validating input files and PDF structures...' });

  // 1. Validate all input PDFs
  await validateSections(sections);

  // 2. Initialize Master PDF
  const masterDoc = await PDFDocument.create();
  masterDoc.setTitle(`${project} - ${system} - ${month} ${year} Monthly Report`);
  masterDoc.setAuthor('Nanneer Consultancy');
  masterDoc.setCreator('STP Monthly PDF Report Generator');

  const sectionStats = [];
  const bookmarks = [];

  // 3. Process Main Cover
  onProgress({ stage: 'main_cover', message: 'Generating Main Cover Page...' });
  console.log(`[Step 1/3] Generating Main Cover Page...`);

  if (options.mainCoverPdf) {
    console.log(`  -> Using supplied main-cover.pdf`);
    const { buffer } = await validatePdf(options.mainCoverPdf, 'Supplied Main Cover');
    const userCoverDoc = await PDFDocument.load(buffer);
    const [userCoverPage] = await masterDoc.copyPages(userCoverDoc, [0]);
    masterDoc.addPage(userCoverPage);
  } else {
    console.log(`  -> Dynamically rendering reference-matching cover page...`);
    const coverDoc = await generateMainCover({
      project,
      system,
      month,
      year,
      logoBufferOrPath: options.logoBufferOrPath,
    });
    const [coverPage] = await masterDoc.copyPages(coverDoc, [0]);
    masterDoc.addPage(coverPage);
  }

  console.log(`  ✓ Main cover page added successfully.`);

  // 4. Process Each Section in Order
  console.log(`\n[Step 2/3] Processing ${sections.length} Sections...`);

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const secNum = i + 1;
    const secTitle = sec.title || `Section ${secNum}`;
    const cleanTitle = secTitle.replace(/\r?\n/g, ' ');

    console.log(`\n▶ Section ${secNum}/${sections.length}: "${cleanTitle}"`);
    onProgress({
      stage: 'section',
      sectionIndex: i,
      totalSections: sections.length,
      message: `Processing Section ${secNum}: ${cleanTitle}...`,
    });

    let sectionStartPageRef = null;

    // 4a. Add Section Divider Cover (unless explicitly skipped)
    if (!sec.skipCover) {
      const dividerDoc = await generateSectionCover(secTitle);
      const [dividerPage] = await masterDoc.copyPages(dividerDoc, [0]);
      masterDoc.addPage(dividerPage);
      sectionStartPageRef = dividerPage.ref;
      console.log(`  + Divider cover generated and inserted.`);
    }

    // 4b. Load Section PDF
    const { buffer: secBuffer } = await validatePdf(sec.buffer || sec.file, `Section ${secNum}`);
    const sourceDoc = await PDFDocument.load(secBuffer);
    const sourceTotalPages = sourceDoc.getPageCount();

    // 4c. Select pages to copy (Special logic for Manpower report if configured)
    let pagesToCopy = [];
    let note = '';

    const isManpowerSection =
      sec.isManpower ||
      cleanTitle.toLowerCase().includes('manpower') ||
      (typeof sec.file === 'string' && sec.file.toLowerCase().includes('manpower'));

    if (isManpowerSection && sourceTotalPages > 1) {
      console.log(`  🔍 Analyzing Manpower report pages...`);
      const manpowerResult = await resolveManpowerPages(secBuffer, month, {
        mode: sec.manpowerMode || 'auto',
        page: sec.manpowerPage || null,
      });
      pagesToCopy = manpowerResult.selectedPages;
      note = manpowerResult.detectionSummary;
      console.log(`  ✓ ${note}`);
    } else {
      for (let p = 0; p < sourceTotalPages; p++) {
        pagesToCopy.push(p);
      }
      note = `Copied all ${sourceTotalPages} pages.`;
    }

    // Copy selected pages
    const copiedPages = await masterDoc.copyPages(sourceDoc, pagesToCopy);
    copiedPages.forEach((p) => masterDoc.addPage(p));

    if (!sectionStartPageRef && copiedPages.length > 0) {
      sectionStartPageRef = copiedPages[0].ref;
    }

    // Register section bookmark for PDF outline sidebar
    if (sectionStartPageRef) {
      bookmarks.push({
        title: cleanTitle,
        pageRef: sectionStartPageRef,
      });
    }

    console.log(`  ✓ Added ${copiedPages.length} source page(s) to master.`);

    sectionStats.push({
      index: secNum,
      title: cleanTitle,
      sourceTotalPages,
      pagesIncluded: copiedPages.length,
      hasDivider: !sec.skipCover,
      note,
    });
  }

  // 5. Generate Native PDF Outlines / Table of Contents in Navigation Panel
  if (bookmarks.length > 0) {
    try {
      const outlinesRef = masterDoc.context.nextRef();
      const itemRefs = bookmarks.map(() => masterDoc.context.nextRef());

      itemRefs.forEach((itemRef, i) => {
        const itemDict = {
          Title: PDFString.of(bookmarks[i].title),
          Parent: outlinesRef,
          Dest: [bookmarks[i].pageRef, 'XYZ', null, null, null],
        };
        if (i > 0) itemDict.Prev = itemRefs[i - 1];
        if (i < itemRefs.length - 1) itemDict.Next = itemRefs[i + 1];

        masterDoc.context.assign(itemRef, masterDoc.context.obj(itemDict));
      });

      const outlinesDict = masterDoc.context.obj({
        Type: 'Outlines',
        First: itemRefs[0],
        Last: itemRefs[itemRefs.length - 1],
        Count: itemRefs.length,
      });
      masterDoc.context.assign(outlinesRef, outlinesDict);

      masterDoc.catalog.set(PDFName.of('Outlines'), outlinesRef);
      masterDoc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'));
      console.log(`  ✓ Native PDF Table of Contents bookmarks created (${bookmarks.length} navigation points).`);
    } catch (err) {
      console.warn('[PDFMerger] Notice: Could not set outlines:', err.message);
    }
  }

  // 6. Final Save and Verification
  console.log(`\n[Step 3/3] Saving and Verifying Master PDF...`);
  onProgress({ stage: 'saving', message: 'Saving compiled master PDF...' });

  const finalFileName =
    options.outputFileName || config.getOutputFileName(project, system, month, year);
  const finalOutputPath = path.join(outputDir, finalFileName);

  const pdfBytes = await masterDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);
  fs.writeFileSync(finalOutputPath, pdfBuffer);

  const finalPageCount = masterDoc.getPageCount();
  const fileStat = fs.statSync(finalOutputPath);
  const fileSizeMb = (fileStat.size / (1024 * 1024)).toFixed(2);

  console.log(`\n🎉 Report Successfully Generated!`);
  console.log(`📁 File Location : ${finalOutputPath}`);
  console.log(`📄 Total Pages   : ${finalPageCount}`);
  console.log(`💾 File Size     : ${fileSizeMb} MB (${fileStat.size} bytes)`);

  return {
    outputPath: finalOutputPath,
    totalPages: finalPageCount,
    fileSize: fileStat.size,
    fileSizeMb,
    fileName: finalFileName,
    sectionStats,
    pdfBuffer,
  };
}

module.exports = {
  compileMasterReport,
};
