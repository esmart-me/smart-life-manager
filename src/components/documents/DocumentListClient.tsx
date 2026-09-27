"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { DocumentFormModal, DocumentFormData } from "./DocumentFormModal";
import { DocumentDetailModal, DocumentDetailData } from "./DocumentDetailModal";
import { DOCUMENT_TYPES } from "@/lib/documents/constants";
import { DocumentStatusInfo } from "@/lib/documents/status";

export type FilterStatusType = "ALL" | "VALID" | "EXPIRING_SOON" | "CRITICAL" | "EXPIRED";

export interface DocumentListItem {
  id: string;
  title: string;
  category: string;
  documentNumber?: string | null;
  issuedBy?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  hasExpiry: boolean;
  notes?: string | null;
  createdAt: string;
  statusInfo: DocumentStatusInfo;
  files: Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
}

interface DocumentListClientProps {
  initialDocuments: DocumentListItem[];
}

export function DocumentListClient({ initialDocuments }: DocumentListClientProps) {
  const router = useRouter();

  // Search & filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatusType>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<DocumentFormData | null>(null);

  const [detailDoc, setDetailDoc] = useState<DocumentDetailData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Status Counts calculation for quick summary pills
  const statusCounts = useMemo(() => {
    const counts = {
      ALL: initialDocuments.length,
      VALID: 0,
      EXPIRING_SOON: 0,
      CRITICAL: 0,
      EXPIRED: 0,
    };

    initialDocuments.forEach((doc) => {
      const s = doc.statusInfo.status;
      if (s === "VALID") counts.VALID++;
      else if (s === "EXPIRING_SOON") counts.EXPIRING_SOON++;
      else if (s === "CRITICAL") counts.CRITICAL++;
      else if (s === "EXPIRED") counts.EXPIRED++;
    });

    return counts;
  }, [initialDocuments]);

  // Filtered & Searched Documents
  const filteredDocuments = useMemo(() => {
    return initialDocuments.filter((doc) => {
      // 1. Status Filter
      if (statusFilter !== "ALL" && doc.statusInfo.status !== statusFilter) {
        return false;
      }

      // 2. Type Filter
      if (typeFilter !== "ALL" && doc.category !== typeFilter) {
        return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchNumber = doc.documentNumber?.toLowerCase().includes(q) || false;
        const matchCategory = doc.category.toLowerCase().includes(q);
        const matchNotes = doc.notes?.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchNumber && !matchCategory && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }, [initialDocuments, statusFilter, typeFilter, searchQuery]);

  const handleOpenAdd = () => {
    setFormInitialData(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (doc: DocumentListItem | DocumentDetailData) => {
    setFormInitialData({
      id: doc.id,
      title: doc.title,
      category: doc.category,
      documentNumber: doc.documentNumber,
      issuedBy: doc.issuedBy,
      issueDate: doc.issueDate,
      expiryDate: doc.expiryDate,
      notes: doc.notes,
      files: doc.files,
    });
    setIsFormOpen(true);
  };

  const handleOpenDetail = (doc: DocumentListItem) => {
    setDetailDoc(doc);
    setIsDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/documents/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      router.refresh();
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Document Manager
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Encrypted Storage</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Store and monitor passports, Emirates IDs, licences, visas, contracts, and insurance.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleOpenAdd}
          className="min-h-[48px] px-5 py-2.5 text-sm font-semibold shadow-sm inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </Button>
      </div>

      {/* Quick Filter Counts Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
            statusFilter === "ALL"
              ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <span>All Documents</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            {statusCounts.ALL}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("VALID")}
          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
            statusFilter === "VALID"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Valid</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
            {statusCounts.VALID}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("EXPIRING_SOON")}
          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
            statusFilter === "EXPIRING_SOON"
              ? "bg-amber-600 text-white border-amber-600 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Expiring Soon</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
            {statusCounts.EXPIRING_SOON}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("CRITICAL")}
          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all ${
            statusFilter === "CRITICAL"
              ? "bg-rose-600 text-white border-rose-600 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-rose-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Critical</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300">
            {statusCounts.CRITICAL}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter("EXPIRED")}
          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold transition-all col-span-2 sm:col-span-1 ${
            statusFilter === "EXPIRED"
              ? "bg-red-700 text-white border-red-700 shadow-sm"
              : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-red-300"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <AlertOctagon className="w-3.5 h-3.5 text-red-500" />
            <span>Expired</span>
          </span>
          <span className="px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300">
            {statusCounts.EXPIRED}
          </span>
        </button>
      </div>

      {/* Search and Filters Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by document name, number, or notes..."
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="w-full sm:w-48">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ALL">All Types</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {(searchQuery || statusFilter !== "ALL" || typeFilter !== "ALL") && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs whitespace-nowrap"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Document List Presentation */}
      {initialDocuments.length === 0 ? (
        <div className="space-y-4">
          <EmptyState
            icon={FileText}
            title="No documents yet."
            description="Securely store your passport, ID cards, licences, warranties, and insurance policies to automatically track renewal dates."
          />
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={handleOpenAdd}
              className="min-h-[48px] px-6 py-2.5 text-sm font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span>Add Document</span>
            </Button>
          </div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
          <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No matching documents found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No documents matched your current search query or active filter. Try resetting filters.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            Clear Search & Filters
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop Table View (Hidden on mobile) */}
          <div className="hidden lg:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Document Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Files</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocuments.map((doc) => {
                  const hasImage = doc.files.some((f) => f.fileType.startsWith("image/"));
                  const hasPdf = doc.files.some((f) => f.fileType.includes("pdf"));

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(doc)}
                          className="font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 text-left transition-colors"
                        >
                          {doc.title}
                        </button>
                        {doc.documentNumber && (
                          <span className="block text-[11px] font-mono text-slate-400">
                            #{doc.documentNumber}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {doc.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                          {doc.expiryDate
                            ? new Date(doc.expiryDate).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "No Expiry"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <DocumentStatusBadge statusInfo={doc.statusInfo} />
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {hasImage && (
                            <span
                              title="Image attached"
                              className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {hasPdf && (
                            <span
                              title="PDF attached"
                              className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </span>
                          )}
                          {!hasImage && !hasPdf && (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(doc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Edit document"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Delete document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards (Hidden on desktop) */}
          <div className="lg:hidden space-y-3">
            {filteredDocuments.map((doc) => {
              const hasImage = doc.files.some((f) => f.fileType.startsWith("image/"));
              const hasPdf = doc.files.some((f) => f.fileType.includes("pdf"));

              return (
                <div
                  key={doc.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-1">
                        {doc.category}
                      </span>
                      <h3
                        onClick={() => handleOpenDetail(doc)}
                        className="text-sm font-bold text-slate-900 dark:text-white cursor-pointer hover:text-brand-600"
                      >
                        {doc.title}
                      </h3>
                      {doc.documentNumber && (
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                          Doc #: {doc.documentNumber}
                        </p>
                      )}
                    </div>
                    <DocumentStatusBadge statusInfo={doc.statusInfo} size="sm" />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Expiry:{" "}
                        <strong className="text-slate-800 dark:text-slate-200 font-semibold">
                          {doc.expiryDate
                            ? new Date(doc.expiryDate).toLocaleDateString()
                            : "No Expiry"}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {hasImage && <ImageIcon className="w-3.5 h-3.5 text-brand-600" />}
                      {hasPdf && <FileText className="w-3.5 h-3.5 text-rose-600" />}
                    </div>
                  </div>

                  {/* Mobile Touch-Friendly Action Buttons */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDetail(doc)}
                      className="min-h-[44px] text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      <span>View</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(doc)}
                      className="min-h-[44px] text-xs font-semibold"
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      <span>Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      className="min-h-[44px] text-xs font-semibold"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      <span>Delete</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <DocumentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        initialData={formInitialData}
      />

      {/* View Detail Modal */}
      <DocumentDetailModal
        document={detailDoc}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(doc) => handleOpenEdit(doc)}
        onDelete={async (id) => {
          await handleDelete(id);
        }}
      />
    </div>
  );
}
