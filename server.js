const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');
const { compileMasterReport } = require('./src/pdfMerger');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Storage configuration with 500MB limit per file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500 MB
  },
});

// Serve static assets (e.g. logos)
app.use('/assets', express.static(path.join(__dirname, 'src/assets')));

// API: Get initial configuration and available sample files
app.get('/api/config', (req, res) => {
  try {
    const inputFiles = fs.existsSync(config.inputDir)
      ? fs.readdirSync(config.inputDir).filter((f) => f.toLowerCase().endsWith('.pdf'))
      : [];

    res.json({
      success: true,
      company: config.company,
      project: config.project,
      system: config.system,
      month: config.month,
      year: config.year,
      defaultSections: config.defaultSections.slice(0, 3), // Default 3 sections as requested!
      allSampleSections: config.defaultSections,
      availableSampleFiles: inputFiles,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get sample files list
app.get('/api/sample-files', (req, res) => {
  try {
    const files = fs.existsSync(config.inputDir)
      ? fs.readdirSync(config.inputDir).filter((f) => f.toLowerCase().endsWith('.pdf'))
      : [];
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Generate & Compile Master PDF
app.post('/api/generate', upload.any(), async (req, res) => {
  try {
    const {
      company = config.company,
      project = config.project,
      system = config.system,
      month = config.month,
      year = config.year,
    } = req.body;

    let sectionsMeta = [];
    if (req.body.sections) {
      try {
        sectionsMeta = JSON.parse(req.body.sections);
      } catch {
        sectionsMeta = [];
      }
    }

    if (!Array.isArray(sectionsMeta) || sectionsMeta.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'At least one section must be configured.',
      });
    }

    // Map uploaded files by fieldname
    const filesMap = {};
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((f) => {
        filesMap[f.fieldname] = f;
      });
    }

    // Process each section
    const resolvedSections = [];
    for (let i = 0; i < sectionsMeta.length; i++) {
      const meta = sectionsMeta[i];
      const fieldKey = `sectionFile_${i}`;
      let buffer = null;

      if (filesMap[fieldKey]) {
        buffer = filesMap[fieldKey].buffer;
      } else if (meta.sampleFile) {
        // Load from server input dir
        const samplePath = path.resolve(config.inputDir, meta.sampleFile);
        if (fs.existsSync(samplePath)) {
          buffer = fs.readFileSync(samplePath);
        }
      }

      if (!buffer) {
        return res.status(400).json({
          success: false,
          error: `No PDF file uploaded or selected for Section ${i + 1} ("${meta.title || 'Untitled'}").`,
        });
      }

      resolvedSections.push({
        id: meta.id || `sec-${i + 1}`,
        title: meta.title || `Section ${i + 1}`,
        buffer,
        isManpower: !!meta.isManpower,
        manpowerMode: meta.manpowerMode || 'auto',
        manpowerPage: meta.manpowerPage || null,
        skipCover: !!meta.skipCover,
      });
    }

    // Check custom logo or main cover
    let logoBuffer = null;
    if (filesMap['logoFile']) {
      logoBuffer = filesMap['logoFile'].buffer;
    }

    let mainCoverPdf = null;
    if (filesMap['mainCoverFile']) {
      mainCoverPdf = filesMap['mainCoverFile'].buffer;
    }

    const result = await compileMasterReport({
      project,
      system,
      month,
      year,
      logoBufferOrPath: logoBuffer,
      mainCoverPdf,
      sections: resolvedSections,
      outputDir: config.outputDir,
    });

    res.json({
      success: true,
      fileName: result.fileName,
      totalPages: result.totalPages,
      fileSizeMb: result.fileSizeMb,
      downloadUrl: `/api/download/${encodeURIComponent(result.fileName)}`,
      previewUrl: `/api/preview/${encodeURIComponent(result.fileName)}`,
      sectionStats: result.sectionStats,
    });
  } catch (err) {
    console.error('[API /api/generate Error]:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Report generation failed.',
    });
  }
});

// API: Download Master PDF
app.get('/api/download/:fileName', (req, res) => {
  const filePath = path.join(config.outputDir, req.params.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath, req.params.fileName);
});

// API: Preview Master PDF in browser
app.get('/api/preview/:fileName', (req, res) => {
  const filePath = path.join(config.outputDir, req.params.fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${req.params.fileName}"`);
  fs.createReadStream(filePath).pipe(res);
});

// Serve frontend build if available
const clientDist = path.join(__dirname, 'client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    // If not matching an api route, serve index.html
    if (!req.path.startsWith('/api')) {
      return res.sendFile(path.join(clientDist, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🌐 STP Monthly PDF Report Generator Server Running`);
  console.log(`🔗 Web UI & API Server: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
