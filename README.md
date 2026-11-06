# STP Monthly Master PDF Report Generator

An automated, enterprise-grade engineering report compilation system built with **Node.js**, **Express**, **`pdf-lib`**, and a modern **React Web UI**.

This tool compiles multiple individual sewage treatment plant (STP) reports into a single, cohesive, publication-ready master PDF report. It reproduces the exact typography, standard A4 dimensions (`595.56 × 842.04 pt`), official brand colors (`#005b9e`, `#46505a`, `#5a636d`), and section-divider layouts of the reference master report (`SEP_REPORT.pdf`).

---

## 📖 How It Works (Step-by-Step)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        1. User Inputs (Web UI)                         │
│  - Customer Project Name (e.g. PRESTIGE POLYGON)                       │
│  - System / Plant Capacity (e.g. STP – 240 KLD)                        │
│  - Reporting Month & Year                                              │
│  - Default Company Header Logo (Nanneer Consultancy)                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    2. Report Sections Configuration                    │
│  - Default 3 Sections + Unlimited Additions ("+ Add Another Section")  │
│  - Editable Front Page Cover Titles                                    │
│  - Drag & Drop / File Upload for each section's PDF                    │
│  - Order adjustment (Move Up / Move Down)                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  3. Automated Cover & Divider Engine                   │
│  - Main Front Cover: Centers project & system text with header logo    │
│  - Section Dividers: Automatic word-wrapping (breaks titles cleanly)   │
│  - Auto-scaling font size fallback (prevents edge clipping)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                   4. Vector PDF Merging & Compilation                  │
│  - Iterates through sections in order                                  │
│  - Inserts generated divider cover page                                │
│  - Copies all source PDF pages (100% vector, zero resolution loss)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    5. Master Output & Live Preview                     │
│  - Generates standard output filename                                  │
│  - Embedded in-browser PDF viewer for instant verification             │
│  - 1-click Download for formal submission                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Step 1: Customer & Period Configuration

The user enters customer-specific details in the web interface:
- **Project Name**: The site or client facility (e.g., `PRESTIGE POLYGON`).
- **System / Capacity**: The operational plant rating (e.g., `STP – 240 KLD`).
- **Reporting Month & Year**: Select the reporting month from the dropdown and input the year.
- **Branding**: The official company logo (`nanneer_consultancy_logo.png`) is positioned in the top-right corner by default. A custom logo can also be uploaded if needed.
- **Live Preview**: The right-hand preview card automatically updates to show the master cover layout.

---

### Step 2: Customizing Sections & Front Page Cover Titles

- **Default 3 Sections**: The application starts with 3 empty sections ready for your reports (e.g. *Water Consumption*, *Tank Level*, *Water Quality*).
- **Add Unlimited Sections**: Click **`+ Add Another PDF Section`** to include any additional documents (such as *WhatsApp Communication Compilation*, *Plant Manpower & Operation Report*, *Sludge Dewatering*, etc.).
- **Editable Cover Names**: Enter the exact title you want printed on the front divider page for that section.
- **PDF Upload**: Select or drag-and-drop the PDF document corresponding to each section.
- **Reordering**: Use the **↑** and **↓** buttons to arrange the sections in the required sequence.
- **Skip Cover Option**: Check *"Skip section divider cover"* if a specific PDF already contains its own cover page.

---

### Step 3: Smart Word-Wrapping & Text Scaling

Previous manual tools often suffered from long titles clipping or overflowing the page margins (e.g., `PLANT MANPOWER & OPERATION REPORT` getting cut off).

This application includes a built-in text measurement and wrapping engine:
1. **Width Measurement**: Measures text width against the printable page width (`480 pt` max width).
2. **Word Wrapping**: Automatically wraps long lines into balanced, natural phrases:
   ```text
   PLANT MANPOWER &
   OPERATION REPORT
   ```
3. **Dynamic Scaling**: If a title contains exceptionally long words or many lines, the engine automatically scales font size down (from `38pt` down to `22pt`) so text never clips.
4. **Centering**: Centers every line horizontally and vertically on a clean white A4 page (`595.56 × 842.04 pt`).

---

### Step 4: High-Performance Vector Merging

- Merges pages using `pdf-lib` without rasterizing or converting to images.
- Tables, high-resolution charts, text, and vector graphics remain sharp and fully searchable.
- Handles massive documents with hundreds of pages (such as 340+ page site chat reports) with low memory overhead.

---

### Step 5: Compilation Summary, Live Preview & Download

Once you click **"Generate & Compile Master PDF"**:
1. Files are validated (checks for valid PDF headers, corruption, or encryption).
2. The master document is compiled and saved inside the `output/` folder using the standard naming convention:
   ```text
   [PROJECT]_[SYSTEM]_[MONTH]_[YEAR].pdf
   (e.g., PRESTIGE_POLYGON_STP_240_KLD_SEPTEMBER_2026.pdf)
   ```
3. **In-Browser Preview**: View the generated document immediately in the embedded previewer.
4. **Section Breakdown Table**: Displays exact page counts contributed by each section and divider statuses.
5. **Download**: Instant 1-click download of the complete master PDF.

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** (v18 or newer)
- **npm** (v9 or newer)

### Installation Steps

```bash
# 1. Navigate to the generator folder
cd c:\Users\suriya\pdf\stp-report-generator

# 2. Install backend dependencies
npm install

# 3. Install frontend dependencies and build the UI
cd client
npm install
npm run build
cd ..
```

---

## 💻 How to Run the Application

### Method 1: Web Interface (Recommended)

The Web Interface provides an interactive, visual workflow to customize covers, reorder sections, upload files, and preview the generated document directly in your browser.

#### Step 1: Open Terminal / Command Prompt
Navigate to the project root directory:
```bash
cd c:\Users\suriya\pdf\stp-report-generator
```

#### Step 2: Start the Application Server
Run the start command:
```bash
npm start
```
*(Alternatively, you can run `node server.js`)*

You will see the confirmation message in your terminal:
```text
======================================================
🌐 STP Monthly PDF Report Generator Server Running
🔗 Web UI & API Server: http://localhost:5000
======================================================
```

#### Step 3: Open in Browser
Open Google Chrome, Microsoft Edge, or any modern web browser and navigate to:
```
http://localhost:5000
```

#### Step 4: Generate Your Report
1. **Fill Front Cover Info**:
   - Type your **Customer Project Name** (e.g. `PRESTIGE POLYGON`).
   - Type the **System / Plant Capacity** (e.g. `STP – 240 KLD`).
   - Select the **Reporting Month** (e.g. `SEPTEMBER`) and **Year** (e.g. `2026`).
2. **Configure Sections**:
   - The app comes with 3 default sections.
   - Enter your **Front Page Cover Title** for each section (e.g., `WATER CONSUMPTION`, `TANK LEVEL`, `WATER QUALITY`).
   - Click to upload or drag-and-drop the PDF for each section.
   - Need more sections? Click **`+ Add Another PDF Section`** to add any additional sections (e.g., `WHATSAPP COMMUNICATION COMPILATION`, `PLANT MANPOWER & OPERATION REPORT`).
   - Reorder any section using the **↑** (Up) and **↓** (Down) buttons.
3. **Compile Master PDF**:
   - Click the blue **"Generate & Compile Master PDF"** button.
   - Watch the progress indicator as covers are generated, text wrapped, and pages merged.
4. **Live Preview & Download**:
   - An embedded document viewer will display the compiled master PDF directly on the page.
   - Click **"Preview in New Tab"** or **"Download Master PDF"** to save the file.

#### Step 5: How to Stop the Server
When finished, return to your terminal window and press:
```bash
Ctrl + C
```

---

### Method 2: Command Line (CLI Batch Execution)

If you prefer automated or headless execution without opening a web browser:

1. Place your monthly PDFs into the `input/` folder:
   - `input/water-consumption.pdf`
   - `input/tank-level.pdf`
   - `input/water-quality.pdf`
   - `input/whatsapp-report.pdf`
   - `input/manpower-report.pdf`
2. Run the build command:
   ```bash
   npm run build
   ```
   *(or run `node generate-report.js`)*
3. The compiled PDF will automatically be created in the `output/` folder:
   ```text
   output/PRESTIGE_POLYGON_STP_240_KLD_SEPTEMBER_2026.pdf
   ```

---

### ⚙️ Useful Configuration & Troubleshooting

- **Changing the Port**: By default, the server runs on port `5000`. To run on a different port (e.g., `8080`):
  - On Windows PowerShell:
    ```powershell
    $env:PORT=8080; npm start
    ```
  - On Mac / Linux / Git Bash:
    ```bash
    PORT=8080 npm start
    ```
- **Large WhatsApp Logs (300+ Pages)**: The backend supports files up to `500 MB` per upload. Memory streaming ensures seamless processing of large chat reports.
- **Modifying CLI Defaults**: Edit `src/config.js` to change default project names, system ratings, or reporting periods for batch runs.

---

## 📁 Project File Structure

```
stp-report-generator/
├── client/                     # React UI (Vite + Modern CSS)
│   ├── src/
│   │   ├── App.jsx             # Interactive form, section manager & preview
│   │   └── index.css           # Styling system & responsive layout
│   └── vite.config.js
├── input/                      # Input PDFs folder
├── output/                     # Generated master PDFs
│   └── PRESTIGE_POLYGON_STP_240_KLD_SEPTEMBER_2026.pdf
├── src/
│   ├── assets/
│   │   └── logo.png            # Default company header logo
│   ├── config.js               # Central configuration defaults
│   ├── coverGenerator.js       # Master front cover generator (with logo & auto-wrap)
│   ├── sectionGenerator.js     # Section divider generator (with smart word-wrapping)
│   ├── validator.js            # PDF validation & error checking
│   └── pdfMerger.js            # Core merging & compilation pipeline
├── generate-report.js          # CLI script
├── server.js                   # Express server hosting API & React frontend
├── package.json
└── README.md
```

---

## 🛡️ Error Handling & Validation

The application guards against common report errors:
- **Missing Inputs**: Highlights unselected months, empty project names, or sections without attached PDFs.
- **Corrupted / Invalid PDFs**: Detects files missing `%PDF-` headers and aborts with a clear descriptive message.
- **Password-Protected Documents**: Detects encrypted files and informs the user to provide an unlocked PDF.
- **Never Silently Incomplete**: Every section is validated and verified before writing the final master file.
- **Native Navigation Panel (Table of Contents)**: Automatically generates PDF Outlines/Bookmarks and sets `/PageMode /UseOutlines` so opening the PDF in any viewer (Adobe Acrobat, Chrome, Edge) automatically opens the Table of Contents sidebar for 1-click navigation without adding any extra printed pages.
