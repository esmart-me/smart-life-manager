"use client";

import React, { useState } from "react";
import {
  X,
  Package,
  ShieldCheck,
  Calendar,
  DollarSign,
  MapPin,
  Eye,
  EyeOff,
  Copy,
  Check,
  FileText,
  Wrench,
  Plus,
  Trash2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface InventoryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any | null;
  onRefreshItem: () => Promise<void>;
}

export function InventoryDetailModal({
  isOpen,
  onClose,
  item,
  onRefreshItem,
}: InventoryDetailModalProps) {
  const [showSerial, setShowSerial] = useState(false);
  const [copiedSerial, setCopiedSerial] = useState(false);

  // New Service Log Form State
  const [isAddingService, setIsAddingService] = useState(false);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [provider, setProvider] = useState("");
  const [cost, setCost] = useState("");
  const [nextServiceDate, setNextServiceDate] = useState("");
  const [serviceNotes, setServiceNotes] = useState("");
  const [isSubmittingService, setIsSubmittingService] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleCopySerial = () => {
    if (item.serialNumber) {
      navigator.clipboard.writeText(item.serialNumber);
      setCopiedSerial(true);
      setTimeout(() => setCopiedSerial(false), 2000);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setServiceError("Description is required");
      return;
    }

    try {
      setIsSubmittingService(true);
      setServiceError(null);
      const res = await fetch(`/api/inventory/${item.id}/services`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceDate,
          description: description.trim(),
          provider: provider.trim() || undefined,
          cost: cost ? Number(cost) : undefined,
          currency: item.currency || "USD",
          nextServiceDate: nextServiceDate || undefined,
          notes: serviceNotes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to add service record");
      }

      setIsAddingService(false);
      setDescription("");
      setProvider("");
      setCost("");
      setNextServiceDate("");
      setServiceNotes("");
      await onRefreshItem();
    } catch (err: any) {
      setServiceError(err.message || "Failed to save service record");
    } finally {
      setIsSubmittingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to remove this service record?")) return;
    try {
      const res = await fetch(`/api/inventory/${item.id}/services/${serviceId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await onRefreshItem();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getWarrantyBadge = () => {
    switch (item.warrantyStatus) {
      case "active":
        return <Badge variant="success">Active Coverage</Badge>;
      case "expiring_soon":
        return <Badge variant="warning">Expiring Soon</Badge>;
      case "expired":
        return <Badge variant="danger">Warranty Expired</Badge>;
      default:
        return <Badge variant="default">No Warranty</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl glass-card border border-theme-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle flex items-center justify-center text-theme-accent border border-theme-accent/20">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 id="detail-modal-title" className="text-base font-semibold text-theme-text-primary">
                {item.name}
              </h2>
              <div className="flex items-center gap-2 text-xs text-theme-text-muted">
                <span>{item.brand ? `${item.brand} • ` : ""}{item.category}</span>
                {getWarrantyBadge()}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Item Overview Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border">
              <span className="text-[11px] text-theme-text-muted block">Location</span>
              <span className="text-xs font-semibold text-theme-text-primary">
                {item.location || "Not specified"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border">
              <span className="text-[11px] text-theme-text-muted block">Purchase Price</span>
              <span className="text-xs font-semibold text-theme-text-primary">
                {item.purchasePrice !== null && item.purchasePrice !== undefined
                  ? `${item.currency || "USD"} ${Number(item.purchasePrice).toFixed(2)}`
                  : "N/A"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border">
              <span className="text-[11px] text-theme-text-muted block">Purchase Date</span>
              <span className="text-xs font-semibold text-theme-text-primary">
                {item.purchaseDate ? new Date(item.purchaseDate).toLocaleDateString() : "N/A"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border">
              <span className="text-[11px] text-theme-text-muted block">Retailer</span>
              <span className="text-xs font-semibold text-theme-text-primary truncate block">
                {item.retailer || "N/A"}
              </span>
            </div>
          </div>

          {/* Model & Protected Serial Number */}
          <div className="p-3.5 rounded-xl bg-theme-bg-elevated/60 border border-theme-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-theme-text-secondary">Model Number:</span>
              <span className="text-xs font-mono font-medium text-theme-text-primary">
                {item.modelNumber || "Not recorded"}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-theme-border/50">
              <span className="text-xs font-medium text-theme-text-secondary">Serial Number:</span>
              <div className="flex items-center gap-1.5">
                {item.serialNumber ? (
                  <>
                    <span className="text-xs font-mono font-medium text-theme-text-primary">
                      {showSerial ? item.serialNumber : "••••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSerial(!showSerial)}
                      className="p-1 rounded text-theme-text-muted hover:text-theme-text-primary"
                      title={showSerial ? "Hide serial number" : "Reveal serial number"}
                    >
                      {showSerial ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopySerial}
                      className="p-1 rounded text-theme-text-muted hover:text-theme-text-primary"
                      title="Copy serial number"
                    >
                      {copiedSerial ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-theme-text-muted">Not recorded</span>
                )}
              </div>
            </div>
          </div>

          {/* Warranty Details Card */}
          <div className="p-4 rounded-xl bg-theme-glass-subtle border border-theme-border space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-semibold text-theme-text-primary">
                  Warranty Status
                </span>
              </div>
              <span className="text-xs text-theme-text-secondary font-medium">
                {item.warrantyLabel || "No warranty information"}
              </span>
            </div>

            {item.warrantyExpiry && (
              <div className="text-xs text-theme-text-muted flex items-center justify-between pt-1">
                <span>Coverage Expiration:</span>
                <span className="font-medium text-theme-text-primary">
                  {new Date(item.warrantyExpiry).toLocaleDateString()}
                </span>
              </div>
            )}

            {item.warrantyNotes && (
              <p className="text-xs text-theme-text-secondary pt-1 border-t border-theme-border/50">
                {item.warrantyNotes}
              </p>
            )}
          </div>

          {/* Attachments (Receipt & Photo) */}
          {(item.receiptUrl || item.photoUrl) && (
            <div className="p-3.5 rounded-xl bg-theme-glass-subtle border border-theme-border space-y-2">
              <span className="text-xs font-semibold text-theme-text-primary block">
                Saved Documents & Media
              </span>
              <div className="flex flex-wrap gap-2">
                {item.receiptUrl && (
                  <a
                    href={item.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-bg-elevated border border-theme-border text-xs font-medium text-theme-accent hover:border-theme-accent transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Receipt Attachment</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                {item.photoUrl && (
                  <a
                    href={item.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-theme-bg-elevated border border-theme-border text-xs font-medium text-theme-accent hover:border-theme-accent transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Product Photo</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Service History Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-theme-accent" />
                <h3 className="text-sm font-semibold text-theme-text-primary">
                  Service & Maintenance History
                </h3>
                <span className="text-xs text-theme-text-muted">
                  ({item.serviceLogs?.length || 0})
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingService(!isAddingService)}
                className="text-xs h-8 gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAddingService ? "Cancel" : "Add Service"}</span>
              </Button>
            </div>

            {/* Add Service Inline Form */}
            {isAddingService && (
              <form onSubmit={handleAddService} className="p-4 rounded-xl bg-theme-bg-elevated border border-theme-border space-y-3 animate-in fade-in">
                {serviceError && (
                  <div className="text-xs text-rose-500 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{serviceError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                      Service Date *
                    </label>
                    <Input
                      type="date"
                      value={serviceDate}
                      onChange={(e) => setServiceDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                      Service Provider / Technician
                    </label>
                    <Input
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      placeholder="e.g., Authorized Samsung Care, Local Repair"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                    Description of Work *
                  </label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Water filter replaced, Motherboard repaired under warranty"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                      Cost ({item.currency || "USD"})
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cost}
                      onChange={(e) => setCost(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                      Next Service Due Date
                    </label>
                    <Input
                      type="date"
                      value={nextServiceDate}
                      onChange={(e) => setNextServiceDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingService(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={isSubmittingService}
                  >
                    {isSubmittingService ? "Recording..." : "Save Record"}
                  </Button>
                </div>
              </form>
            )}

            {/* List of Previous Services */}
            {item.serviceLogs && item.serviceLogs.length > 0 ? (
              <div className="space-y-2">
                {item.serviceLogs.map((log: any) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-theme-glass-subtle border border-theme-border flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-theme-text-primary">
                          {log.description}
                        </span>
                        {log.cost !== null && log.cost !== undefined && (
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {log.currency} {Number(log.cost).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-theme-text-muted">
                        <span>Date: {new Date(log.serviceDate).toLocaleDateString()}</span>
                        {log.provider && <span>Provider: {log.provider}</span>}
                        {log.nextServiceDate && (
                          <span className="text-sky-500 font-medium">
                            Next due: {new Date(log.nextServiceDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(log.id)}
                      className="p-1 rounded text-theme-text-muted hover:text-rose-500 hover:bg-rose-500/10"
                      title="Delete service log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-theme-text-muted py-3 text-center">
                No maintenance or service history recorded yet.
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-theme-border flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
