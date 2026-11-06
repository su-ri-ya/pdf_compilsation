const path = require('path');

module.exports = {
  // Master Report Metadata
  company: 'Nanneer Consultancy',
  project: 'PRESTIGE POLYGON',
  system: 'STP – 240 KLD',
  month: 'SEPTEMBER',
  year: '2026',

  // Input & Output Paths
  inputDir: path.resolve(__dirname, '../input'),
  outputDir: path.resolve(__dirname, '../output'),
  assetsDir: path.resolve(__dirname, 'assets'),
  defaultLogoPath: path.resolve(__dirname, 'assets/logo.png'),

  // Default output filename generator
  getOutputFileName(project, system, month, year) {
    const clean = (str) =>
      String(str || '')
        .trim()
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .toUpperCase();
    return `${clean(project)}_${clean(system)}_${clean(month)}_${clean(year)}.pdf`;
  },

  // Default Sections Configuration (Used for CLI or initial UI state)
  defaultSections: [
    {
      id: 'section-1',
      title: 'WATER CONSUMPTION',
      file: 'water-consumption.pdf',
      required: true,
    },
    {
      id: 'section-2',
      title: 'TANK LEVEL',
      file: 'tank-level.pdf',
      required: true,
    },
    {
      id: 'section-3',
      title: 'WATER QUALITY',
      file: 'water-quality.pdf',
      required: true,
    },
    {
      id: 'section-4',
      title: 'WHATSAPP\nCOMMUNICATION\nCOMPILATION',
      file: 'whatsapp-report.pdf',
      required: false,
    },
    {
      id: 'section-5',
      title: 'PLANT MANPOWER &\nOPERATION REPORT',
      file: 'manpower-report.pdf',
      required: false,
      isManpower: true,
      manpowerMode: 'auto', // 'auto' | 'manual'
      manpowerPage: null, // 1-based index if manual
    },
  ],
};

