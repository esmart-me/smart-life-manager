import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { generateReport, ReportType } from "@/lib/reports/report-generator";
import { generateCSV, generatePrintableHTML, generateWhatsAppText } from "@/lib/reports/export-formatters";

interface RouteParams {
  params: Promise<{ type: string }>;
}

const VALID_REPORT_TYPES: ReportType[] = [
  "monthly_expense",
  "category_spending",
  "payment_history",
  "upcoming_payments",
  "document_expiry",
  "vehicle_renewal",
  "subscription_summary",
];

export async function GET(request: Request, { params }: RouteParams) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { type } = await params;
  if (!VALID_REPORT_TYPES.includes(type as ReportType)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_REPORT_TYPE",
          message: `Invalid report type "${type}". Allowed: ${VALID_REPORT_TYPES.join(", ")}`,
        },
      },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "json").toLowerCase();
  const month = searchParams.get("month") || undefined;

  try {
    const reportData = await generateReport(user.id, type as ReportType, { month });

    // 1. CSV Download Format
    if (format === "csv") {
      const csvContent = generateCSV(reportData);
      const safeTitle = reportData.metadata.title.toLowerCase().replace(/[^a-z0-9]/g, "-");
      const filename = `slm-${safeTitle}-${new Date().toISOString().split("T")[0]}.csv`;

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // 2. Printable HTML format for PDF Generation
    if (format === "html" || format === "pdf") {
      const htmlContent = generatePrintableHTML(reportData);
      return new NextResponse(htmlContent, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // 3. JSON with WhatsApp text payload
    const shareText = generateWhatsAppText(reportData);

    return NextResponse.json({
      success: true,
      data: {
        ...reportData,
        report: reportData,
        type: reportData.metadata.type,
        metadata: reportData.metadata,
        summary: {
          totalExpense: (reportData.rawData as any)?.totalAmount || 0,
        },
        summaryCards: reportData.summaryCards,
        shareText,
      },
    });
  } catch (error) {
    console.error("[Report API Error]:", error);
    return NextResponse.json(
      { success: false, error: { code: "REPORT_FAILED", message: "Failed to generate report" } },
      { status: 500 }
    );
  }
}
