import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Download,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Layers,
  Eye,
} from 'lucide-react';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

export default function App() {
  // Main Front Page Customer Metadata
  const [project, setProject] = useState('');
  const [system, setSystem] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [customLogo, setCustomLogo] = useState(null);

  // Default 3 sections ready for customer files
  const [sections, setSections] = useState([
    {
      id: 'sec-1',
      title: '',
      file: null,
      skipCover: false,
    },
    {
      id: 'sec-2',
      title: '',
      file: null,
      skipCover: false,
    },
    {
      id: 'sec-3',
      title: '',
      file: null,
      skipCover: false,
    },
  ]);

  // Generation status & result
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Add new section
  const handleAddSection = () => {
    const newId = `sec-${Date.now()}`;
    setSections([
      ...sections,
      {
        id: newId,
        title: '',
        file: null,
        skipCover: false,
      },
    ]);
  };

  // Remove section
  const handleRemoveSection = (index) => {
    if (sections.length <= 1) {
      alert('You must keep at least 1 section.');
      return;
    }
    const updated = sections.filter((_, i) => i !== index);
    setSections(updated);
  };

  // Move section Up/Down
  const handleMoveSection = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const updated = [...sections];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setSections(updated);
  };

  // Update Section Field
  const updateSection = (index, field, value) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], [field]: value };
    setSections(updated);
  };

  // Submit and compile
  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setResult(null);

    // Form validation
    if (!project.trim()) {
      setError('Please enter the Customer Project Name.');
      setIsGenerating(false);
      return;
    }

    if (!system.trim()) {
      setError('Please enter the System / Capacity.');
      setIsGenerating(false);
      return;
    }

    if (!month) {
      setError('Please select a Reporting Month.');
      setIsGenerating(false);
      return;
    }

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.title.trim()) {
        setError(`Please enter a Front Page Cover Title for Section #${i + 1}.`);
        setIsGenerating(false);
        return;
      }
      if (!s.file) {
        setError(`Please upload a PDF file for Section #${i + 1} ("${s.title}").`);
        setIsGenerating(false);
        return;
      }
    }

    setProgressMsg('Uploading PDF files and preparing compilation...');

    try {
      const formData = new FormData();
      formData.append('project', project);
      formData.append('system', system);
      formData.append('month', month);
      formData.append('year', year);

      if (customLogo) {
        formData.append('logoFile', customLogo);
      }

      // Prepare sections metadata
      const sectionsMeta = sections.map((sec, idx) => ({
        id: sec.id,
        title: sec.title,
        skipCover: sec.skipCover,
      }));

      formData.append('sections', JSON.stringify(sectionsMeta));

      // Append uploaded files
      sections.forEach((sec, idx) => {
        if (sec.file) {
          formData.append(`sectionFile_${idx}`, sec.file);
        }
      });

      setProgressMsg('Generating covers, merging pages, and compiling master PDF...');

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate master report.');
      }

      setResult(data);
      setProgressMsg('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred during generation.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container">
      {/* Header */}
      <header>
        <div className="header-brand">
          <img
            src="/logo.png"
            alt="Nanneer Logo"
            className="header-logo"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <div className="header-title">
            <h1>STP Monthly PDF Report Generator</h1>
            <p>Automated Engineering Master Report Compilation</p>
          </div>
        </div>
      </header>

      {/* Generation Result Banner if successful */}
      {result && (
        <div className="card status-success" style={{ borderColor: 'var(--success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <CheckCircle size={36} color="var(--success)" />
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>Master PDF Generated Successfully!</h3>
                <p style={{ margin: '4px 0 0', opacity: 0.9 }}>
                  <strong>File:</strong> {result.fileName} &bull; <strong>Pages:</strong> {result.totalPages} &bull; <strong>Size:</strong> {result.fileSizeMb} MB
                </p>
              </div>
            </div>
            <div className="result-actions" style={{ display: 'flex', gap: 10 }}>
              <a
                href={result.previewUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <Eye size={16} /> Preview in New Tab
              </a>
              <a
                href={result.downloadUrl}
                download={result.fileName}
                className="btn btn-primary"
              >
                <Download size={16} /> Download Master PDF
              </a>
            </div>
          </div>

          {/* Section Page Summary Table */}
          {result.sectionStats && result.sectionStats.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 8 }}>Compiled Section Breakdown:</h4>
              <div className="table-responsive">
                <table className="table-stats">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Section Cover Title</th>
                      <th>Divider Added</th>
                      <th>Pages Copied</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sectionStats.map((s, idx) => (
                      <tr key={idx}>
                        <td><strong>{s.index}</strong></td>
                        <td>{s.title}</td>
                        <td>{s.hasDivider ? '✓ Yes' : '— Skipped'}</td>
                        <td><strong>{s.pagesIncluded}</strong> / {s.sourceTotalPages}</td>
                        <td><span style={{ fontSize: '0.8rem', opacity: 0.85 }}>{s.note}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Embedded Viewer */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 10 }}>Document Live Preview:</h4>
            <iframe
              src={result.previewUrl}
              title="Master PDF Preview"
              className="preview-iframe"
              style={{ width: '100%', height: '520px', border: '1px solid #cbd5e1', borderRadius: 8, background: '#fff' }}
            />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="status-banner status-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={24} />
            <div>
              <strong>Error compiling report:</strong>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem', marginTop: 4 }}>{error}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate}>
        {/* Card 1: Main Front Page Info */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">
              <FileText size={20} color="var(--primary)" /> 1. Main Front Page Cover Configuration
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Uses default company header logo
            </span>
          </div>

          <div className="grid-2">
            {/* Left Column: Form Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  placeholder="Enter Customer Project Name (e.g. PRESTIGE POLYGON)"
                  required
                />
              </div>

              <div className="form-group">
                <label>System / Plant Capacity</label>
                <input
                  type="text"
                  value={system}
                  onChange={(e) => setSystem(e.target.value)}
                  placeholder="Enter System / Capacity (e.g. STP – 240 KLD)"
                  required
                />
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label>Reporting Month</label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                  >
                    <option value="">-- Select Reporting Month --</option>
                    {MONTHS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Reporting Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="e.g. 2026"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Custom Header Logo (Optional, default is Nanneer logo)</label>
                <input
                  type="file"
                  accept="image/png, image/jpeg"
                  onChange={(e) => setCustomLogo(e.target.files[0] || null)}
                  style={{ fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Right Column: Live Cover Design Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label>Live Front Cover Design Preview</label>
              <div className="cover-preview">
                <div className="cover-preview-badge">A4 Standard</div>
                <img
                  src="/logo.png"
                  alt="Logo"
                  style={{ position: 'absolute', top: 10, right: 14, height: 26, objectFit: 'contain' }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div style={{ marginTop: 24 }}>
                  <div className="preview-project">{project || 'PROJECT NAME'}</div>
                  <div className="preview-system">{system || 'STP CAPACITY'}</div>
                  <div className="preview-date">{(month || 'MONTH') + ' ' + (year || 'YEAR')}</div>
                  <div className="preview-report">REPORT</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: PDF Sections Management */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">
                <Layers size={20} color="var(--primary)" /> 2. Report Sections &amp; Dividers ({sections.length} Sections)
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4 }}>
                Enter the front cover title for each section and upload the corresponding PDF.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddSection}
              className="btn btn-secondary"
            >
              <Plus size={16} /> Add Another PDF Section
            </button>
          </div>

          {/* Sections List */}
          {sections.map((section, index) => (
            <div key={section.id} className="section-item">
              <div className="section-item-header">
                <div className="section-badge">
                  <span className="section-num">#{index + 1}</span>
                  <strong>{section.title.split('\n')[0] || `Section #${index + 1}`}</strong>
                </div>
                <div className="section-actions">
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, -1)}
                    disabled={index === 0}
                    className="btn btn-sm btn-secondary"
                    title="Move Section Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveSection(index, 1)}
                    disabled={index === sections.length - 1}
                    className="btn btn-sm btn-secondary"
                    title="Move Section Down"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveSection(index)}
                    className="btn btn-danger-outline"
                    title="Remove Section"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>

              <div className="grid-2" style={{ alignItems: 'flex-start' }}>
                {/* Title Input */}
                <div className="form-group">
                  <label>Front Page Cover Title</label>
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => updateSection(index, 'title', e.target.value)}
                    placeholder={
                      index === 0
                        ? "Enter Front Page Cover Title (e.g. WATER CONSUMPTION)"
                        : index === 1
                        ? "Enter Front Page Cover Title (e.g. TANK LEVEL)"
                        : index === 2
                        ? "Enter Front Page Cover Title (e.g. WATER QUALITY)"
                        : `Enter Front Page Cover Title for Section #${index + 1}`
                    }
                    required
                  />
                  <div style={{ marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', textTransform: 'none' }}>
                      <input
                        type="checkbox"
                        checked={section.skipCover}
                        onChange={(e) => updateSection(index, 'skipCover', e.target.checked)}
                      />
                      Skip section divider cover (if PDF already has its own front page)
                    </label>
                  </div>
                </div>

                {/* PDF File Upload */}
                <div className="form-group">
                  <label>Upload PDF Document for Section #{index + 1}</label>
                  {section.file ? (
                    <div className="file-selected">
                      <span>📄 <strong>{section.file.name}</strong> ({(section.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button
                        type="button"
                        onClick={() => updateSection(index, 'file', null)}
                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => updateSection(index, 'file', e.target.files[0] || null)}
                        style={{ display: 'block', width: '100%', fontSize: '0.85rem' }}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Add Another Section Button */}
          <button
            type="button"
            onClick={handleAddSection}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: 8 }}
          >
            <Plus size={16} />Add Another PDF Section
          </button>
        </div>

        {/* Generate Button Card */}
        <div className="card" style={{ textAlign: 'center', padding: 28, background: '#f8fafc' }}>
          <button
            type="submit"
            disabled={isGenerating}
            className="btn btn-primary btn-submit-main"
            style={{ fontSize: '1.1rem', padding: '14px 36px', minWidth: '280px' }}
          >
            {isGenerating ? (
              <>
                <div className="spinner"></div> Generating Master Report...
              </>
            ) : (
              <>
                <Download size={20} /> Generate &amp; Compile Master PDF
              </>
            )}
          </button>

          {isGenerating && (
            <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {progressMsg}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
