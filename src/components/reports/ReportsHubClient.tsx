"use client";

import { useState, useEffect, useTransition } from "react";
import {
  FileBarChart2,
  Calendar,
  Download,
  Share2,
  Printer,
  Image as ImageIcon,
  DollarSign,
  PieChart,
  History,
  Clock,
  ShieldAlert,
  Car,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ReportType, BaseReportResult } from "@/lib/reports/report-generator";
import { downloadReportImage, shareReportImage } from "@/lib/reports/image-card-generator";

interface ReportTabConfig {
  type: ReportType;
  title: string;
  shortTitle: string;
  description: string;
  icon: any;
  hasMonthFilter: boolean;
  category: "finance" | "assets" | "vault";
}

const REPORT_CONFIGS: ReportTabConfig[] = [
  {
    type: "monthly_expense",
    title: "Monthly Expense Report",
    shortTitle: "Monthly Expenses",
    description: "Detailed breakdown of expenditures, payment methods, and transaction ledger.",
    icon: DollarSign,
    hasMonthFilter: true,
    category: "finance",
  },
  {
    type: "category_spending",
    title: "Category Spending & Budget",
    shortTitle: "Category Spending",
    description: "Compare category expenditures against budget limits to track overspending.",
    icon: PieChart,
    hasMonthFilter: true,
    category: "finance",
  },
  {
    type: "payment_history",
    title: "Payment History",
    shortTitle: "Payment History",
    description: "Audit trail of cleared bills, past recurring payments, and payees.",
    icon: History,
    hasMonthFilter: false,
    category: "finance",
  },
  {
    type: "upcoming_payments",
    title: "Upcoming Payment Obligations",
    shortTitle: "Upcoming Payments",
    description: "Schedule of future bills, overdue obligations, and projected liabilities.",
    icon: Clock,
    hasMonthFilter: false,
    category: "finance",
  },
  {
    type: "document_expiry",
    title: "Document Expiry Report",
    shortTitle: "Document Expiry",
    description: "Urgency audit of passports, IDs, visas, licenses, and contracts.",
    icon: ShieldAlert,
    hasMonthFilter: false,
    category: "vault",
  },
  {
    type: "vehicle_renewal",
    title: "Vehicle Renewal Report",
    shortTitle: "Vehicle Renewals",
    description: "Status of vehicle registrations, insurance policies, and service intervals.",
    icon: Car,
    hasMonthFilter: false,
    category: "assets",
  },
  {
    type: "subscription_summary",
    title: "Subscription Burn Rate",
    shortTitle: "Subscriptions",
    description: "Analysis of recurring memberships, monthly burn rate, and annual projections.",
    icon: RefreshCw,
    hasMonthFilter: false,
    category: "assets",
  },
];

export function ReportsHubClient() {
  const [selectedType, setSelectedType] = useState<ReportType>("monthly_expense");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [reportData, setReportData] = useState<BaseReportResult | null>(null);
  const [shareText, setShareText] = useState("");
  const [isLoading, startTransition] = useTransition();
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const activeConfig = REPORT_CONFIGS.find((c) => c.type === selectedType) || REPORT_CONFIGS[0];

  // Fetch report data
  const loadReport = (type: ReportType, month: string) => {
    startTransition(async () => {
      try {
        const queryParams = new URLSearchParams();
        if (activeConfig.hasMonthFilter) {
          queryParams.set("month", month);
        }
        const res = await fetch(`/api/reports/${type}?${queryParams.toString()}`);
        const data = await res.json();
        if (data.success) {
          setReportData(data.data.report);
          setShareText(data.data.shareText);
        }
      } catch (err) {
        console.error("Failed to load report:", err);
      }
    });
  };

  useEffect(() => {
    loadReport(selectedType, currentMonth);
  }, [selectedType, currentMonth]);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const prev = new Date(y, m - 2, 1);
    setCurrentMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentMonth.split("-").map(Number);
    const next = new Date(y, m, 1);
    setCurrentMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  // Export Handlers
  const handleDownloadCSV = () => {
    const queryParams = new URLSearchParams({ format: "csv" });
    if (activeConfig.hasMonthFilter) {
      queryParams.set("month", currentMonth);
    }
    window.location.href = `/api/reports/${selectedType}?${queryParams.toString()}`;
  };

  const handleOpenPrintPDF = () => {
    const queryParams = new URLSearchParams({ format: "html" });
    if (activeConfig.hasMonthFilter) {
      queryParams.set("month", currentMonth);
    }
    window.open(`/api/reports/${selectedType}?${queryParams.toString()}`, "_blank");
  };

  const handleDownloadImage = async () => {
    if (!reportData) return;
    setIsExportingImage(true);
    try {
      await downloadReportImage(reportData);
    } catch (err) {
      console.error("Image export error:", err);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (!reportData) return;

    // Try native share first (mobile)
    const shared = await shareReportImage(reportData, shareText);
    if (!shared) {
      // Fallback to WhatsApp URL
      const encoded = encodeURIComponent(shareText);
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
    }

    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileBarChart2 className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            Reports & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate clean, audit-ready reports from your real records with instant PDF, CSV, and WhatsApp sharing.
          </p>
        </div>

        {/* Global Export Bar */}
        {reportData && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              title="Download CSV Spreadsheet"
              className="gap-1.5 text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenPrintPDF}
              title="Open Printable PDF"
              className="gap-1.5 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>PDF</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadImage}
              disabled={isExportingImage}
              title="Download Mobile Card PNG"
              className="gap-1.5 text-xs"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>{isExportingImage ? "Rendering..." : "Image"}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleShareWhatsApp}
              title="Share via WhatsApp"
              className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copiedShare ? "Shared!" : "WhatsApp"}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {REPORT_CONFIGS.map((config) => {
          const Icon = config.icon;
          const isSelected = selectedType === config.type;

          return (
            <button
              key={config.type}
              type="button"
              onClick={() => setSelectedType(config.type)}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? "bg-brand-50/80 dark:bg-brand-950/40 border-brand-500 dark:border-brand-500 shadow-xs ring-1 ring-brand-500"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center mb-2 ${
                  isSelected
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div>
                <h3
                  className={`text-xs font-semibold line-clamp-1 ${
                    isSelected ? "text-brand-900 dark:text-brand-200" : "text-slate-900 dark:text-white"
                  }`}
                >
                  {config.shortTitle}
                </h3>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  {config.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Period Filter Bar (if relevant) */}
      {activeConfig.hasMonthFilter && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Report Period:
            </span>
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
              {reportData?.metadata.periodLabel || currentMonth}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="py-16 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span>Generating {activeConfig.title}...</span>
        </div>
      )}

      {/* Live Report Display */}
      {!isLoading && reportData && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {reportData.summaryCards.map((card, i) => (
              <Card
                key={i}
                className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              >
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.label}
                </span>

                <div className="my-1.5">
                  <span
                    className={`text-xl sm:text-2xl font-bold tracking-tight ${
                      card.variant === "danger"
                        ? "text-rose-600 dark:text-rose-400"
                        : card.variant === "warning"
                        ? "text-amber-600 dark:text-amber-400"
                        : card.variant === "success"
                        ? "text-emerald-600 dark:text-emerald-400"
                        : card.variant === "info"
                        ? "text-sky-600 dark:text-sky-400"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {card.value}
                  </span>
                </div>

                {card.subtext && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
                    {card.subtext}
                  </span>
                )}
              </Card>
            ))}
          </div>

          {/* Report Sections & Tables */}
          {reportData.sections.map((section, sIdx) => (
            <Card
              key={sIdx}
              className="p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                  {section.title}
                </h3>
                {section.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {section.description}
                  </p>
                )}
              </div>

              {section.rows.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No records logged for this period.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {section.headers.map((h, hIdx) => (
                          <th key={hIdx} className="px-3.5 py-2.5 font-semibold whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {section.rows.map((row, rIdx) => (
                        <tr
                          key={rIdx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {row.map((cell, cIdx) => (
                            <td
                              key={cIdx}
                              className={`px-3.5 py-2.5 whitespace-nowrap ${
                                cIdx === 0
                                  ? "font-medium text-slate-900 dark:text-white"
                                  : "text-slate-600 dark:text-slate-300"
                              }`}
                            >
                              {String(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
