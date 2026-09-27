"use client";

import { useState } from "react";
import {
  X,
  FileText,
  Calendar,
  Clock,
  Shield,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  Bell,
  CheckCircle2,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { DocumentStatusInfo } from "@/lib/documents/status";

export interface DocumentDetailData {
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
  reminders?: Array<{
    id: string;
    title: string;
    dueDate: string;
    priority: string;
    status: string;
  }>;
}

interface DocumentDetailModalProps {
  document: DocumentDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (doc: DocumentDetailData) => void;
  onDelete: (id: string) => Promise<void>;
}

export function DocumentDetailModal({
  document,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: DocumentDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen || !document) return null;

  const imageFiles = document.files.filter((f) => f.fileType.startsWith("image/"));
  const pdfFiles = document.files.filter((f) => f.fileType.includes("pdf"));

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(document.id);
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="space-y-1 pr-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {document.category}
              </span>
              <DocumentStatusBadge statusInfo={document.statusInfo} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {document.title}
            </h2>
            {document.documentNumber && (
              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Doc #: {document.documentNumber}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close document details"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5">Issue Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {document.issueDate
                  ? new Date(document.issueDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Not Specified"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Expiry Date</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {document.expiryDate
                  ? new Date(document.expiryDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "No Expiry"}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block mb-0.5">Issuing Body</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {document.issuedBy || "Not Specified"}
              </span>
            </div>
          </div>

          {/* Notes */}
          {document.notes && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Notes & Instructions
              </h3>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {document.notes}
              </div>
            </div>
          )}

          {/* Attached Files (Secure Access) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Protected File Attachments ({document.files.length})</span>
              </h3>
              <span className="text-[11px] text-slate-400">
                Stored in private encrypted directory
              </span>
            </div>

            {document.files.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No files attached to this document.
              </div>
            ) : (
              <div className="space-y-3">
                {/* Images Preview */}
                {imageFiles.map((file) => {
                  const secureUrl = `/api/documents/${document.id}/files/${file.id}`;
                  const downloadUrl = `${secureUrl}?download=true`;
                  return (
                    <div
                      key={file.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate pr-2">
                          <File className="w-4 h-4 text-brand-600 shrink-0" />
                          <span className="font-semibold text-slate-900 dark:text-white truncate">
                            {file.fileName}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            ({formatFileSize(file.fileSize)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <a
                            href={secureUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View</span>
                          </a>
                          <a
                            href={downloadUrl}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 hover:bg-brand-100"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </div>
                      </div>

                      {/* Image Preview Container */}
                      <div className="relative rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700 bg-slate-900/5 dark:bg-slate-950 max-h-56 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={secureUrl}
                          alt={file.fileName}
                          className="max-h-56 w-auto object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  );
                })}

                {/* PDF Files */}
                {pdfFiles.map((file) => {
                  const secureUrl = `/api/documents/${document.id}/files/${file.id}`;
                  const downloadUrl = `${secureUrl}?download=true`;
                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-xs"
                    >
                      <div className="flex items-center gap-2.5 truncate pr-2">
                        <div className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-lg shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {file.fileName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            PDF Document • {formatFileSize(file.fileSize)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={secureUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open PDF</span>
                        </a>
                        <a
                          href={downloadUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-brand-600 text-white hover:bg-brand-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Scheduled Reminders */}
          {document.reminders && document.reminders.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-brand-500" />
                <span>Active Expiry Reminders ({document.reminders.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {document.reminders.map((rem) => (
                  <div
                    key={rem.id}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40"
                  >
                    <span className="truncate pr-2 font-medium text-slate-700 dark:text-slate-300">
                      {rem.title}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {new Date(rem.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
          <div>
            {showConfirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 font-semibold">Confirm delete?</span>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={isDeleting}
                >
                  Yes, Delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setShowConfirmDelete(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Delete</span>
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                onEdit(document);
              }}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              <span>Edit Document</span>
            </Button>
            <Button type="button" variant="primary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
