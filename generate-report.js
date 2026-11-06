const path = require('path');
const fs = require('fs');
const config = require('./src/config');
const { compileMasterReport } = require('./src/pdfMerger');

async function run() {
  try {
    console.log('Starting CLI Report Generation...');

    // Resolve file paths for default sections
    const sections = config.defaultSections.map((sec) => {
      const fullPath = path.resolve(config.inputDir, sec.file);
      return {
        ...sec,
        file: fullPath,
      };
    });

    const optionalMainCover = path.resolve(config.inputDir, 'main-cover.pdf');
    const mainCoverPdf = fs.existsSync(optionalMainCover) ? optionalMainCover : null;

    const result = await compileMasterReport({
      project: config.project,
      system: config.system,
      month: config.month,
      year: config.year,
      mainCoverPdf,
      sections,
      outputDir: config.outputDir,
    });

    console.log('\n================ Compilation Summary ================');
    console.log(`Report File: ${result.fileName}`);
    console.log(`Destination: ${result.outputPath}`);
    console.log(`Total Pages: ${result.totalPages}`);
    console.log(`File Size  : ${result.fileSizeMb} MB`);
    console.log('-----------------------------------------------------');
    result.sectionStats.forEach((s) => {
      console.log(
        `Section ${s.index}: [${s.title}] -> Divider: ${s.hasDivider ? 'Yes' : 'No'} | Pages: ${s.pagesIncluded}/${s.sourceTotalPages} (${s.note})`
      );
    });
    console.log('=====================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('\n❌ Compilation Failed:');
    console.error(err.message || err);
    process.exit(1);
  }
}

run();

