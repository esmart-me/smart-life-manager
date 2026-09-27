"use client";

import { useState, useRef } from "react";
import {
  X,
  Upload,
  Camera,
  FileText,
  Image as ImageIcon,
  Calendar,
  AlertCircle,
  Check,
  Bell,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { DOCUMENT_TYPES, REMINDER_MILESTONES, DEFAULT_REMINDER_DAYS } from "@/lib/documents/constants";

export interface DocumentFormData {
  id?: string;
  title: string;
  category: string;
  documentNumber?: string | null;
  issuedBy?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  notes?: string | null;
  reminderMilestones?: number[];
  files?: Array<{ id: string; fileName: string; fileType: string; fileSize: number }>;
}

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: DocumentFormData | null;
}

export function DocumentFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}: DocumentFormModalProps) {
  const isEditing = Boolean(initialData?.id);

  // Form states
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState(initialData?.category || "Passport");
  const [documentNumber, setDocumentNumber] = useState(initialData?.documentNumber || "");
  const [issuedBy, setIssuedBy] = useState(initialData?.issuedBy || "");
  const [issueDate, setIssueDate] = useState(
    initialData?.issueDate ? initialData.issueDate.split("T")[0] : ""
  );
  const [expiryDate, setExpiryDate] = useState(
    initialData?.expiryDate ? initialData.expiryDate.split("T")[0] : ""
  );
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [selectedMilestones, setSelectedMilestones] = useState<number[]>(
    initialData?.reminderMilestones || [...DEFAULT_REMINDER_DAYS]
  );

  // File uploads
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const toggleMilestone = (milestone: number) => {
    setSelectedMilestones((prev) =>
      prev.includes(milestone) ? prev.filter((m) => m !== milestone) : [...prev, milestone]
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage("Image exceeds 15MB limit");
        return;
      }
      setImageFile(file);
      setErrorMessage(null);
    }
  };

  const handlePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        setErrorMessage("PDF exceeds 15MB limit");
        return;
      }
      setPdfFile(file);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Please enter a document name.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("category", category);
      if (documentNumber.trim()) formData.append("documentNumber", documentNumber.trim());
      if (issuedBy.trim()) formData.append("issuedBy", issuedBy.trim());
      if (issueDate) formData.append("issueDate", issueDate);
      if (expiryDate) formData.append("expiryDate", expiryDate);
      if (notes.trim()) formData.append("notes", notes.trim());
      formData.append("reminderMilestones", JSON.stringify(selectedMilestones));

      if (imageFile) {
        formData.append("image", imageFile);
      }
      if (pdfFile) {
        formData.append("pdf", pdfFile);
      }

      const url = isEditing ? `/api/documents/${initialData?.id}` : "/api/documents";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save document");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong saving the document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? "Edit Document" : "Add New Document"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Securely store identity documents, licences, certificates, and warranties.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <AlertBanner
              type="error"
              title="Error saving document"
              message={errorMessage}
            />
          )}

          {/* Section 1: Classification & Identification */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="doc-type-select"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Document Type <span className="text-rose-500">*</span>
              </label>
              <select
                id="doc-type-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {DOCUMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="doc-name-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Document Name <span className="text-rose-500">*</span>
              </label>
              <Input
                id="doc-name-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. My UAE Resident Passport, John's Visa"
                required
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Custom recognizable title for quick lookup
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="doc-number-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Document Number (Optional)
              </label>
              <Input
                id="doc-number-input"
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g. 784-1990-1234567-1, A12345678"
              />
            </div>

            <div>
              <label
                htmlFor="doc-issuer-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Issuing Authority / Provider (Optional)
              </label>
              <Input
                id="doc-issuer-input"
                type="text"
                value={issuedBy}
                onChange={(e) => setIssuedBy(e.target.value)}
                placeholder="e.g. ICP, RTA, Ministry of Health"
              />
            </div>
          </div>

          {/* Section 2: Expiry & Issue Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
            <div>
              <label
                htmlFor="doc-issue-date"
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Issue Date</span>
              </label>
              <Input
                id="doc-issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="doc-expiry-date"
                className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-rose-500" />
                <span>Expiry Date (Required for Alerts)</span>
              </label>
              <Input
                id="doc-expiry-date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                Smart Life Manager automatically monitors expiry countdowns
              </span>
            </div>
          </div>

          {/* Section 3: Reminder Milestones */}
          {expiryDate && (
            <div className="p-4 rounded-xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/40 dark:bg-brand-950/20 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-900 dark:text-brand-300">
                <Bell className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <span>Automated Expiry Reminders</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Select when Smart Life Manager should notify you before expiry. Duplicate reminders are automatically prevented.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {REMINDER_MILESTONES.map((days) => {
                  const isChecked = selectedMilestones.includes(days);
                  return (
                    <button
                      type="button"
                      key={days}
                      onClick={() => toggleMilestone(days)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition-all ${
                        isChecked
                          ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                          : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:border-brand-400"
                      }`}
                    >
                      <span>{days} {days === 1 ? "day" : "days"}</span>
                      {isChecked && <Check className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Secure File Attachments */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Document Attachments (Stored Privately)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Document Image / Camera Upload */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-brand-400 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Document Photo / Scan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Upload JPG, PNG or take a photo with your device camera.
                </p>

                {imageFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-xs">
                    <span className="truncate max-w-[160px] font-medium text-brand-900 dark:text-brand-300">
                      {imageFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setImageFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {/* File Upload Button */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Choose Image</span>
                    </button>

                    {/* Camera Capture Button */}
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
                      title="Use Camera"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Camera</span>
                    </button>
                  </div>
                )}

                {/* Hidden Image Inputs */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Document PDF Upload */}
              <div className="p-3.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-brand-400 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    Document PDF
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                  Upload official electronic document or contract (PDF max 15MB).
                </p>

                {pdfFile ? (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 text-xs">
                    <span className="truncate max-w-[160px] font-medium text-brand-900 dark:text-brand-300">
                      {pdfFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPdfFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                      title="Remove PDF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose PDF File</span>
                  </button>
                )}

                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handlePdfChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Notes */}
          <div>
            <label
              htmlFor="doc-notes-input"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Notes & Renewal Instructions (Optional)
            </label>
            <textarea
              id="doc-notes-input"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Renew at embassy 3 months prior; requires recent biometric photo..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              {isEditing ? "Save Changes" : "Save Document"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
