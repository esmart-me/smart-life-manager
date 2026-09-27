import { BaseReportResult } from "./report-generator";

/**
 * Escapes a cell value per RFC 4180 CSV standard.
 */
function escapeCSVCell(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Formats a report into a standard, Excel-compatible UTF-8 CSV string.
 */
export function generateCSV(report: BaseReportResult): string {
  const lines: string[] = [];

  // Metadata block
  lines.push(escapeCSVCell("SMART LIFE MANAGER - REPORT EXPORT"));
  lines.push(escapeCSVCell(`Report: ${report.metadata.title}`));
  if (report.metadata.periodLabel) {
    lines.push(escapeCSVCell(`Period: ${report.metadata.periodLabel}`));
  }
  lines.push(escapeCSVCell(`Account: ${report.metadata.userName}`));
  lines.push(escapeCSVCell(`Generated At: ${new Date(report.metadata.generatedAt).toLocaleString()}`));
  lines.push(""); // empty line

  // Summary Metrics
  lines.push(escapeCSVCell("--- SUMMARY METRICS ---"));
  lines.push(["Metric", "Value", "Notes"].map(escapeCSVCell).join(","));
  for (const card of report.summaryCards) {
    lines.push([card.label, card.value, card.subtext || ""].map(escapeCSVCell).join(","));
  }
  lines.push(""); // empty line

  // Sections & Tables
  for (const section of report.sections) {
    lines.push(escapeCSVCell(`--- ${section.title.toUpperCase()} ---`));
    if (section.description) {
      lines.push(escapeCSVCell(section.description));
    }
    lines.push(section.headers.map(escapeCSVCell).join(","));
    for (const row of section.rows) {
      lines.push(row.map(escapeCSVCell).join(","));
    }
    lines.push(""); // empty line between sections
  }

  // Add UTF-8 BOM so Excel opens it with correct formatting
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Creates an attractive, concise, emoji-formatted WhatsApp share message.
 */
export function generateWhatsAppText(report: BaseReportResult): string {
  const lines: string[] = [];

  lines.push(`📊 *${report.metadata.title}*`);
  if (report.metadata.periodLabel) {
    lines.push(`📅 *Period:* ${report.metadata.periodLabel}`);
  }
  lines.push(`👤 *User:* ${report.metadata.userName}`);
  lines.push(`🕒 *Generated:* ${new Date(report.metadata.generatedAt).toLocaleDateString()}`);
  lines.push("");
  lines.push(`*Key Summary:*`);

  for (const card of report.summaryCards) {
    lines.push(`• *${card.label}:* ${card.value}${card.subtext ? ` _(${card.subtext})_` : ""}`);
  }

  // Add top highlights from first section if available
  if (report.sections.length > 0 && report.sections[0].rows.length > 0) {
    const sec = report.sections[0];
    lines.push("");
    lines.push(`*Top Items (${sec.title}):*`);
    const previewRows = sec.rows.slice(0, 5);
    for (const row of previewRows) {
      const name = row[0];
      const val = row[1];
      const extra = row[2] ? ` (${row[2]})` : "";
      lines.push(`▫️ ${name}: *${val}*${extra}`);
    }
    if (sec.rows.length > 5) {
      lines.push(`_...and ${sec.rows.length - 5} more items in full report_`);
    }
  }

  lines.push("");
  lines.push(`🔒 _Generated privately from Smart Life Manager_`);

  return lines.join("\n");
}

/**
 * Generates clean, printer-optimized standalone HTML for PDF printing and downloads.
 */
export function generatePrintableHTML(report: BaseReportResult): string {
  const summaryCardsHtml = report.summaryCards
    .map(
      (c) => `
    <div class="summary-card">
      <div class="summary-label">${escapeHtml(c.label)}</div>
      <div class="summary-value">${escapeHtml(c.value)}</div>
      ${c.subtext ? `<div class="summary-subtext">${escapeHtml(c.subtext)}</div>` : ""}
    </div>`
    )
    .join("");

  const sectionsHtml = report.sections
    .map((s) => {
      const headersHtml = s.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
      const rowsHtml = s.rows
        .map(
          (row) => `
        <tr>
          ${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}
        </tr>`
        )
        .join("");

      return `
      <div class="section-container">
        <h2 class="section-title">${escapeHtml(s.title)}</h2>
        ${s.description ? `<p class="section-desc">${escapeHtml(s.description)}</p>` : ""}
        <table class="report-table">
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="100%" class="empty-cell">No items recorded</td></tr>'}
          </tbody>
        </table>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(report.metadata.title)} - Smart Life Manager</title>
  <style>
    :root {
      --primary: #2563eb;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --bg-card: #f8fafc;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: var(--text);
      background: #ffffff;
      padding: 32px 24px;
      line-height: 1.5;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .summary-card {
        page-break-inside: avoid;
      }
      tr {
        page-break-inside: avoid;
      }
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid var(--primary);
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 12px;
    }
    .brand-title {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--primary);
      font-weight: 700;
      margin-bottom: 4px;
    }
    .report-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--text);
    }
    .meta-block {
      text-align: right;
      font-size: 13px;
      color: var(--text-muted);
    }
    @media (max-width: 600px) {
      .meta-block {
        text-align: left;
      }
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .summary-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .summary-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--text-muted);
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .summary-value {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
    }
    .summary-subtext {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 4px;
    }
    .section-container {
      margin-bottom: 32px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .section-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      text-align: left;
    }
    .report-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 600;
      padding: 10px 12px;
      border: 1px solid var(--border);
    }
    .report-table td {
      padding: 10px 12px;
      border: 1px solid var(--border);
      vertical-align: top;
    }
    .report-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .empty-cell {
      text-align: center;
      color: var(--text-muted);
      padding: 24px;
    }
    .footer {
      border-top: 1px solid var(--border);
      padding-top: 16px;
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      flex-wrap: wrap;
      gap: 8px;
    }
    .print-bar {
      margin-bottom: 24px;
      display: flex;
      gap: 12px;
    }
    .btn-print {
      background: var(--primary);
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-print:hover {
      background: #1d4ed8;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="print-bar no-print">
      <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
      <button class="btn-print" style="background:#64748b" onclick="window.close()">Close</button>
    </div>

    <header class="header">
      <div>
        <div class="brand-title">Smart Life Manager</div>
        <h1 class="report-title">${escapeHtml(report.metadata.title)}</h1>
        ${report.metadata.periodLabel ? `<p style="color:var(--text-muted);font-weight:500">${escapeHtml(report.metadata.periodLabel)}</p>` : ""}
      </div>
      <div class="meta-block">
        <div><strong>Account:</strong> ${escapeHtml(report.metadata.userName)}</div>
        <div><strong>Generated:</strong> ${new Date(report.metadata.generatedAt).toLocaleString()}</div>
        <div><strong>Currency:</strong> ${escapeHtml(report.metadata.currency)}</div>
      </div>
    </header>

    <section class="summary-grid">
      ${summaryCardsHtml}
    </section>

    ${sectionsHtml}

    <footer class="footer">
      <div>Smart Life Manager • Personal Life & Assets Administration</div>
      <div>Confidential • Personal Record</div>
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
