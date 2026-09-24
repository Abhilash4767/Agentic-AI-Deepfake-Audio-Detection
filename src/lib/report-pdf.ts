import { jsPDF } from "jspdf";
import type { Analysis } from "@/lib/analysis";
import { buildXai } from "@/lib/pipeline";
import { getDictionary, type SupportedLanguage } from "@/lib/report-i18n";

const M = 14;

/**
 * Downloads a forensic report as PDF.
 * - For English: uses jsPDF vector generator.
 * - For Indic languages (Kannada, Hindi, Telugu): generates a high-fidelity
 *   printable forensic dossier with native system font shaping (ligatures, conjuncts, matras)
 *   and triggers the browser's native "Save as PDF / Print" dialog.
 */
export function downloadPdfReport(a: Analysis, lang: SupportedLanguage = "en") {
  if (lang === "en") {
    downloadJsPdfEnglish(a);
  } else {
    openPrintableDossier(a, lang);
  }
}

function downloadJsPdfEnglish(a: Analysis) {
  const dict = getDictionary("en");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  let y = M;

  const line = () => {
    doc.setDrawColor(190);
    doc.line(M, y, w - M, y);
    y += 6;
  };
  const guard = (need = 12) => {
    if (y + need > h - M) {
      doc.addPage();
      y = M;
    }
  };
  const body = (text: string, size = 9) => {
    doc.setFont("helvetica", "normal").setFontSize(size).setTextColor(40);
    for (const l of doc.splitTextToSize(text, w - M * 2) as string[]) {
      guard();
      doc.text(l, M, y);
      y += size * 0.5 + 1.4;
    }
  };
  const heading = (text: string) => {
    guard(16);
    y += 3;
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(15);
    doc.text(text.toUpperCase(), M, y);
    y += 4;
    line();
  };

  // Header banner
  doc.setFillColor(12, 22, 28).rect(0, 0, w, 26, "F");
  doc.setFont("helvetica", "bold").setFontSize(14).setTextColor(255);
  doc.text(dict.title, M, 12);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(180);
  doc.text(dict.subtitle, M, 19);
  y = 36;

  heading(dict.caseMetadata);
  const meta: [string, string][] = [
    [dict.analysisId, a.id],
    [dict.fileName, `${a.fileName} · ${a.sizeKb} KB · ${a.durationSec}s`],
    [dict.sampleRate, `${a.sampleRate} Hz`],
    [dict.model, a.model],
    [dict.generatedDate, new Date(a.createdAt).toUTCString()],
  ];
  for (const [k, v] of meta) {
    guard();
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(70);
    doc.text(k, M, y);
    doc.setFont("helvetica", "normal").setTextColor(30);
    doc.text(String(v), M + 40, y);
    y += 5.2;
  }

  heading(dict.verdictTitle);
  doc.setFont("helvetica", "bold").setFontSize(16);
  doc.setTextColor(
    ...((a.verdict === "deepfake"
      ? [180, 40, 40]
      : a.verdict === "suspicious"
        ? [180, 130, 20]
        : [30, 130, 80]) as [number, number, number]),
  );
  doc.text(`${dict.verdicts[a.verdict]?.label || a.verdict.toUpperCase()} — ${a.confidence}% ${dict.confidence.toLowerCase()}`, M, y);
  y += 8;
  body(dict.verdicts[a.verdict]?.summary || a.summary);

  heading(dict.agentTraceTitle);
  for (const g of a.agents) {
    guard(14);
    const ag = dict.agents[g.agent];
    const name = ag?.name ?? g.agent;
    const role = ag?.role ?? g.role;
    const finding =
      a.verdict === "deepfake"
        ? ag?.fakeFinding ?? g.finding
        : a.verdict === "authentic"
          ? ag?.realFinding ?? g.finding
          : g.finding;

    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(20);
    doc.text(`${name} (${role}) — ${g.confidence}%`, M, y);
    y += 4.6;
    body(finding, 9);
    y += 1;
  }

  const xai = buildXai(a);
  heading(dict.shapTitle);
  for (const s of xai.shap) {
    guard();
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
    doc.text(`${s.value > 0 ? "+" : ""}${s.value.toFixed(3)}`, M, y);
    doc.text(dict.featureLabels[s.name] ?? s.name, M + 20, y);
    y += 5;
  }

  heading(dict.limeTitle);
  for (const l of xai.lime) {
    guard();
    doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40);
    doc.text(`${l.weight > 0 ? "+" : ""}${l.weight.toFixed(2)}`, M, y);
    doc.text(`${dict.featureLabels[l.name] ?? l.name} (${l.support})`, M + 20, y);
    y += 5;
  }

  heading(dict.disclaimerTitle);
  body(dict.disclaimerText);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(140);
    doc.text(`${a.id} · ${dict.pageFooter} · ${p}/${pages}`, M, h - 8);
  }

  doc.save(`${a.id}-forensic-report-en.pdf`);
}

/**
 * Renders an official printable forensic dossier with full Indic font shaping
 * (Kannada, Hindi, Telugu, English) and triggers the browser's native Print / Save to PDF.
 */
export function openPrintableDossier(a: Analysis, lang: SupportedLanguage = "en") {
  const dict = getDictionary(lang);
  const xai = buildXai(a);

  const verdictColor =
    a.verdict === "deepfake"
      ? "#dc2626"
      : a.verdict === "suspicious"
        ? "#d97706"
        : "#16a34a";

  const verdictBg =
    a.verdict === "deepfake"
      ? "#fee2e2"
      : a.verdict === "suspicious"
        ? "#fef3c7"
        : "#dcfce7";

  const verdictLabel = dict.verdicts[a.verdict]?.label || a.verdict.toUpperCase();
  const verdictSummary = dict.verdicts[a.verdict]?.summary || a.summary;

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <title>${a.id} — ${dict.title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Kannada:wght@400;600;700&family=Noto+Sans+Telugu:wght@400;600;700&family=Noto+Sans+Devanagari:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Noto Sans Kannada', 'Noto Sans Devanagari', 'Noto Sans Telugu', system-ui, -apple-system, sans-serif;
      color: #1e293b;
      background: #ffffff;
      padding: 24px;
      max-width: 820px;
      margin: 0 auto;
      line-height: 1.5;
      font-size: 13px;
    }
    .header {
      background: #0f172a;
      color: #ffffff;
      padding: 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .header h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; letter-spacing: -0.01em; }
    .header p { font-size: 12px; color: #94a3b8; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 14px;
      color: ${verdictColor};
      background: ${verdictBg};
      margin-top: 8px;
    }
    .section {
      margin-bottom: 24px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px 20px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 12px;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 6px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 8px;
      font-size: 12px;
    }
    .meta-label { font-weight: 600; color: #475569; }
    .meta-value { font-family: ui-monospace, monospace; color: #0f172a; }
    .agent-item {
      margin-bottom: 12px;
      padding-bottom: 10px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .agent-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
    .agent-header { display: flex; justify-content: space-between; font-weight: 600; font-size: 13px; }
    .agent-role { font-size: 11px; text-transform: uppercase; color: #64748b; margin-top: 2px; }
    .agent-finding { margin-top: 4px; color: #334155; font-size: 12.5px; }
    .attribution-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 0;
      border-bottom: 1px solid #f8fafc;
      font-size: 12px;
    }
    .attribution-weight { font-family: ui-monospace, monospace; font-weight: 600; }
    .disclaimer {
      font-size: 11px;
      color: #64748b;
      background: #f8fafc;
      border-left: 3px solid #cbd5e1;
      padding: 12px 14px;
      border-radius: 0 6px 6px 0;
      margin-top: 24px;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 11px;
      color: #94a3b8;
    }
    .print-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 16px;
    }
    .btn {
      background: #2563eb;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-close { background: #f1f5f9; color: #475569; }
    @media print {
      body { padding: 0; }
      .print-actions { display: none !important; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="btn btn-close" onclick="window.close()">Close</button>
    <button class="btn" onclick="window.print()">🖨️ Save as PDF / Print</button>
  </div>

  <div class="header">
    <h1>${dict.title}</h1>
    <p>${dict.subtitle}</p>
    <div class="badge">${verdictLabel} — ${a.confidence}% ${dict.confidence}</div>
  </div>

  <div class="section">
    <div class="section-title">${dict.caseMetadata}</div>
    <div class="meta-grid">
      <div class="meta-label">${dict.analysisId}:</div>
      <div class="meta-value">${a.id}</div>
      <div class="meta-label">${dict.fileName}:</div>
      <div class="meta-value">${a.fileName} (${a.sizeKb} KB · ${a.durationSec}s · ${a.sampleRate} Hz)</div>
      <div class="meta-label">${dict.model}:</div>
      <div class="meta-value">${a.model} [${a.source}]</div>
      <div class="meta-label">${dict.generatedDate}:</div>
      <div class="meta-value">${new Date(a.createdAt).toLocaleString()}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${dict.verdictTitle}</div>
    <p style="font-size: 13px; color: #1e293b; line-height: 1.6;">${verdictSummary}</p>
  </div>

  <div class="section">
    <div class="section-title">${dict.agentTraceTitle}</div>
    ${a.agents
      .map((g) => {
        const ag = dict.agents[g.agent];
        const name = ag?.name ?? g.agent;
        const role = ag?.role ?? g.role;
        const finding =
          a.verdict === "deepfake"
            ? ag?.fakeFinding ?? g.finding
            : a.verdict === "authentic"
              ? ag?.realFinding ?? g.finding
              : g.finding;
        return `
        <div class="agent-item">
          <div class="agent-header">
            <span>${name}</span>
            <span style="font-family: ui-monospace, monospace; color: #2563eb;">${g.confidence}%</span>
          </div>
          <div class="agent-role">${role}</div>
          <div class="agent-finding">${finding}</div>
        </div>`;
      })
      .join("")}
  </div>

  <div class="section">
    <div class="section-title">${dict.shapTitle}</div>
    ${xai.shap
      .map((s) => {
        const name = dict.featureLabels[s.name] ?? s.name;
        const sign = s.value > 0 ? "+" : "";
        const color = s.value > 0 ? "#dc2626" : "#16a34a";
        return `
        <div class="attribution-row">
          <span>${name}</span>
          <span class="attribution-weight" style="color: ${color};">${sign}${s.value.toFixed(3)}</span>
        </div>`;
      })
      .join("")}
  </div>

  <div class="disclaimer">
    <strong>${dict.disclaimerTitle}:</strong> ${dict.disclaimerText}
  </div>

  <div class="footer">
    ${a.id} · ${dict.pageFooter} · VeriVox Forensic Suite
  </div>

  <script>
    // Automatically trigger print dialog on launch
    window.addEventListener('load', () => {
      setTimeout(() => { window.print(); }, 450);
    });
  </script>
</body>
</html>`;

  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  } else {
    // If popup blocked, create an iframe to print
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1000);
      }, 500);
    }
  }
}
