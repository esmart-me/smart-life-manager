"use client";

import React, { useState, useEffect } from "react";
import { X, Package, ShieldCheck, DollarSign, Calendar, Upload, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export interface InventoryFormData {
  id?: string;
  name: string;
  category: string;
  brand?: string;
  modelNumber?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  currency: string;
  retailer?: string;
  location?: string;
  warrantyStart?: string;
  warrantyExpiry?: string;
  warrantyNotes?: string;
  notes?: string;
  syncReminder?: boolean;
  advanceReminderDays?: number;
  receiptFile?: File | null;
  photoFile?: File | null;
}

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => Promise<void>;
  initialData?: any | null;
}

export function InventoryFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
}: InventoryFormModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("electronics");
  const [brand, setBrand] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [retailer, setRetailer] = useState("");
  const [location, setLocation] = useState("");
  const [warrantyStart, setWarrantyStart] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");
  const [warrantyNotes, setWarrantyNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [syncReminder, setSyncReminder] = useState(true);
  const [advanceDays, setAdvanceDays] = useState(30);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setCategory(initialData.category || "electronics");
      setBrand(initialData.brand || "");
      setModelNumber(initialData.modelNumber || "");
      setSerialNumber(initialData.serialNumber || "");
      setPurchaseDate(initialData.purchaseDate ? initialData.purchaseDate.split("T")[0] : "");
      setPurchasePrice(initialData.purchasePrice !== null && initialData.purchasePrice !== undefined ? String(initialData.purchasePrice) : "");
      setCurrency(initialData.currency || "USD");
      setRetailer(initialData.retailer || "");
      setLocation(initialData.location || "");
      setWarrantyStart(initialData.warrantyStart ? initialData.warrantyStart.split("T")[0] : "");
      setWarrantyExpiry(initialData.warrantyExpiry ? initialData.warrantyExpiry.split("T")[0] : "");
      setWarrantyNotes(initialData.warrantyNotes || "");
      setNotes(initialData.notes || "");
      setSyncReminder(false);
    } else {
      setName("");
      setCategory("electronics");
      setBrand("");
      setModelNumber("");
      setSerialNumber("");
      setPurchaseDate("");
      setPurchasePrice("");
      setCurrency("USD");
      setRetailer("");
      setLocation("");
      setWarrantyStart("");
      setWarrantyExpiry("");
      setWarrantyNotes("");
      setNotes("");
      setSyncReminder(true);
      setAdvanceDays(30);
    }
    setReceiptFile(null);
    setPhotoFile(null);
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Item name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const fd = new FormData();
      if (initialData?.id) {
        fd.append("id", initialData.id);
      }
      fd.append("name", name.trim());
      fd.append("category", category);
      if (brand.trim()) fd.append("brand", brand.trim());
      if (modelNumber.trim()) fd.append("modelNumber", modelNumber.trim());
      if (serialNumber.trim()) fd.append("serialNumber", serialNumber.trim());
      if (purchaseDate) fd.append("purchaseDate", purchaseDate);
      if (purchasePrice) fd.append("purchasePrice", purchasePrice);
      fd.append("currency", currency);
      if (retailer.trim()) fd.append("retailer", retailer.trim());
      if (location.trim()) fd.append("location", location.trim());
      if (warrantyStart) fd.append("warrantyStart", warrantyStart);
      if (warrantyExpiry) fd.append("warrantyExpiry", warrantyExpiry);
      if (warrantyNotes.trim()) fd.append("warrantyNotes", warrantyNotes.trim());
      if (notes.trim()) fd.append("notes", notes.trim());
      fd.append("syncReminder", String(syncReminder));
      fd.append("advanceReminderDays", String(advanceDays));

      if (receiptFile) fd.append("receiptFile", receiptFile);
      if (photoFile) fd.append("photoFile", photoFile);

      await onSave(fd);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save inventory item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl glass-card border border-theme-border rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inventory-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle flex items-center justify-center text-theme-accent border border-theme-accent/20">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 id="inventory-modal-title" className="text-base font-semibold text-theme-text-primary">
                {initialData ? "Edit Inventory Item" : "Add Inventory Item"}
              </h2>
              <p className="text-xs text-theme-text-muted">
                Track appliances, gadgets, warranties, and receipts
              </p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Samsung French Door Refrigerator"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent"
              >
                <option value="appliances">Appliances</option>
                <option value="electronics">Electronics & AV</option>
                <option value="furniture">Furniture & Decor</option>
                <option value="tools">Tools & Hardware</option>
                <option value="smart_home">Smart Home & IoT</option>
                <option value="other">Other Assets</option>
              </select>
            </div>
          </div>

          {/* Brand, Model, Serial */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Brand / Manufacturer
              </label>
              <Input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Sony, LG, Bosch"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Model Number
              </label>
              <Input
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="e.g., OLED65C3PUA"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Serial Number
              </label>
              <Input
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g., SN-98234-A7"
              />
            </div>
          </div>

          {/* Location & Retailer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Location in Home
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Kitchen, Living Room, Home Office, Garage"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Retailer / Store
              </label>
              <Input
                value={retailer}
                onChange={(e) => setRetailer(e.target.value)}
                placeholder="e.g., Best Buy, Amazon, Home Depot"
              />
            </div>
          </div>

          {/* Purchase Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Purchase Date
              </label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Purchase Price
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>
          </div>

          {/* Warranty Section */}
          <div className="p-3.5 rounded-xl bg-theme-glass-subtle border border-theme-border space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-theme-text-primary">
                Warranty & Coverage Information
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                  Warranty Start Date
                </label>
                <Input
                  type="date"
                  value={warrantyStart}
                  onChange={(e) => setWarrantyStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                  Warranty Expiry Date
                </label>
                <Input
                  type="date"
                  value={warrantyExpiry}
                  onChange={(e) => setWarrantyExpiry(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Coverage Details / Warranty Notes
              </label>
              <Input
                value={warrantyNotes}
                onChange={(e) => setWarrantyNotes(e.target.value)}
                placeholder="e.g., 2-year manufacturer parts & labor, 10-year compressor warranty"
              />
            </div>

            {warrantyExpiry && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="invWarrantyReminder"
                  checked={syncReminder}
                  onChange={(e) => setSyncReminder(e.target.checked)}
                  className="w-4 h-4 rounded border-theme-border text-theme-accent focus:ring-theme-accent"
                />
                <label htmlFor="invWarrantyReminder" className="text-xs text-theme-text-secondary cursor-pointer">
                  Schedule advance alert {advanceDays} days before warranty expires
                </label>
              </div>
            )}
          </div>

          {/* File Attachments */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Receipt / Invoice Attachment
              </label>
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-theme-text-secondary file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-theme-glass-subtle file:text-theme-text-primary hover:file:bg-theme-glass"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-theme-text-secondary mb-1">
                Product Photo (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-theme-text-secondary file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-medium file:bg-theme-glass-subtle file:text-theme-text-primary hover:file:bg-theme-glass"
              />
            </div>
          </div>

          {/* General Notes */}
          <div>
            <label className="block text-xs font-medium text-theme-text-secondary mb-1">
              General Notes & Specifications
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Filter size, dimensions, user manual link, or maintenance notes..."
              className="w-full p-3 rounded-xl border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary focus:outline-hidden focus:ring-2 focus:ring-theme-accent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-theme-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : initialData ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
