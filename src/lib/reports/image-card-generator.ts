import { BaseReportResult } from "./report-generator";

/**
 * Renders a high-resolution, mobile-optimized (1080x1350) branded Report Card on an HTML5 canvas
 * and returns it as a PNG data URL or Blob.
 */
export async function renderReportCardToBlob(report: BaseReportResult): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const width = 1080;
  const height = 1350;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to initialize canvas 2D rendering context");
  }

  // 1. Background fill
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, "#0f172a"); // slate-900
  bgGrad.addColorStop(0.3, "#1e293b"); // slate-800
  bgGrad.addColorStop(1, "#090d16");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Decorative ambient circles
  ctx.save();
  ctx.fillStyle = "rgba(37, 99, 235, 0.15)"; // brand blue
  ctx.beginPath();
  ctx.arc(width - 100, 150, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(16, 185, 129, 0.1)"; // emerald
  ctx.beginPath();
  ctx.arc(100, height - 150, 250, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 2. Top App Brand Bar
  ctx.save();
  // Pill badge
  drawRoundedRect(ctx, 60, 60, 240, 48, 24, "rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.2)");
  ctx.fillStyle = "#38bdf8"; // sky-400
  ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText("SMART LIFE MANAGER", 84, 92);

  // Date on right
  ctx.fillStyle = "#94a3b8"; // slate-400
  ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(new Date(report.metadata.generatedAt).toLocaleDateString(), width - 60, 92);
  ctx.restore();

  // 3. Report Title & Subtitle
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 44px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(report.metadata.title, 60, 175);

  ctx.fillStyle = "#cbd5e1"; // slate-300
  ctx.font = "500 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const subtitle = `${report.metadata.periodLabel ? `${report.metadata.periodLabel} • ` : ""}User: ${report.metadata.userName} • Currency: ${report.metadata.currency}`;
  ctx.fillText(subtitle, 60, 215);
  ctx.restore();

  // Divider
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 250);
  ctx.lineTo(width - 60, 250);
  ctx.stroke();

  // 4. Metric Cards (2x2 grid)
  const cardWidth = (width - 120 - 24) / 2;
  const cardHeight = 160;
  const startY = 280;

  const topCards = report.summaryCards.slice(0, 4);
  topCards.forEach((card, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const x = 60 + col * (cardWidth + 24);
    const y = startY + row * (cardHeight + 20);

    drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 16, "rgba(30, 41, 59, 0.8)", "rgba(255, 255, 255, 0.1)");

    ctx.save();
    // Label
    ctx.fillStyle = "#94a3b8";
    ctx.font = "600 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(card.label.toUpperCase(), x + 24, y + 42);

    // Value
    let valColor = "#ffffff";
    if (card.variant === "danger") valColor = "#f43f5e";
    else if (card.variant === "warning") valColor = "#fbbf24";
    else if (card.variant === "success") valColor = "#34d399";
    else if (card.variant === "info") valColor = "#38bdf8";

    ctx.fillStyle = valColor;
    ctx.font = "bold 38px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText(card.value, x + 24, y + 95);

    // Subtext
    if (card.subtext) {
      ctx.fillStyle = "#64748b";
      ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.fillText(card.subtext, x + 24, y + 130);
    }
    ctx.restore();
  });

  // 5. Highlights Table Section
  const tableY = startY + 2 * (cardHeight + 20) + 20;
  drawRoundedRect(ctx, 60, tableY, width - 120, 520, 20, "rgba(15, 23, 42, 0.9)", "rgba(255, 255, 255, 0.12)");

  ctx.save();
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  const sectionTitle = report.sections[0]?.title || "Key Items Overview";
  ctx.fillText(sectionTitle, 90, tableY + 50);

  // Table Headers
  const headers = report.sections[0]?.headers || ["Item", "Value", "Status"];
  ctx.fillStyle = "#94a3b8";
  ctx.font = "600 19px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.fillText(headers[0]?.toUpperCase() || "ITEM", 90, tableY + 95);
  ctx.textAlign = "right";
  ctx.fillText((headers[1] || "VALUE").toUpperCase(), width - 90, tableY + 95);
  ctx.restore();

  // Separator
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, tableY + 115);
  ctx.lineTo(width - 90, tableY + 115);
  ctx.stroke();

  // Rows (up to 5 items)
  const rows = report.sections[0]?.rows?.slice(0, 5) || [];
  let rowY = tableY + 160;

  if (rows.length === 0) {
    ctx.save();
    ctx.fillStyle = "#64748b";
    ctx.font = "500 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No items currently logged for this period.", width / 2, tableY + 280);
    ctx.restore();
  } else {
    rows.forEach((r, i) => {
      ctx.save();
      if (i % 2 === 1) {
        drawRoundedRect(ctx, 80, rowY - 32, width - 160, 56, 8, "rgba(255, 255, 255, 0.03)");
      }

      ctx.fillStyle = "#f1f5f9";
      ctx.font = "600 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      const col1 = String(r[0] || "");
      const truncatedCol1 = col1.length > 28 ? col1.slice(0, 25) + "..." : col1;
      ctx.fillText(truncatedCol1, 90, rowY + 4);

      if (r[2]) {
        ctx.fillStyle = "#64748b";
        ctx.font = "500 17px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        ctx.fillText(String(r[2]), 90, rowY + 26);
      }

      ctx.fillStyle = "#38bdf8"; // bright accent for amount/metric
      ctx.font = "bold 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(r[1] || ""), width - 90, rowY + 4);

      ctx.restore();
      rowY += 68;
    });
  }

  // 6. Footer Brand Note
  ctx.save();
  ctx.fillStyle = "#64748b";
  ctx.font = "500 18px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Personal & Confidential • Exported from Smart Life Manager", width / 2, height - 50);
  ctx.restore();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to convert canvas to blob"));
    }, "image/png");
  });
}

/**
 * Triggers a download of the rendered report card as a PNG file.
 */
export async function downloadReportImage(report: BaseReportResult) {
  const blob = await renderReportCardToBlob(report);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safeName = report.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
  a.href = url;
  a.download = `slm-${safeName}-${new Date().toISOString().split("T")[0]}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers a native Web Share on mobile with the generated image if supported,
 * falling back to download.
 */
export async function shareReportImage(report: BaseReportResult, shareText: string): Promise<boolean> {
  try {
    const blob = await renderReportCardToBlob(report);
    const file = new File([blob], `${report.metadata.title}.png`, { type: "image/png" });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: report.metadata.title,
        text: shareText,
        files: [file],
      });
      return true;
    }
  } catch (err) {
    console.warn("Native file share unsupported or cancelled, falling back:", err);
  }
  return false;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillColor?: string,
  strokeColor?: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();
}
