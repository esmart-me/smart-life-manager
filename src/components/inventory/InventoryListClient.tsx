"use client";

import React, { useState, useMemo } from "react";
import {
  Package,
  Plus,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Clock,
  MapPin,
  DollarSign,
  Archive,
  ArchiveRestore,
  Trash2,
  Edit2,
  ExternalLink,
  Wrench,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { InventoryFormModal } from "./InventoryFormModal";
import { InventoryDetailModal } from "./InventoryDetailModal";

interface InventoryListClientProps {
  initialItems: any[];
  initialMetrics: {
    totalCount: number;
    activeWarranties: number;
    expiringSoonWarranties: number;
    expiredWarranties: number;
    valuationByCurrency: Record<string, number>;
  };
  initialFilters: {
    categories: string[];
    locations: string[];
  };
}

export function InventoryListClient({
  initialItems,
  initialMetrics,
  initialFilters,
}: InventoryListClientProps) {
  const [items, setItems] = useState<any[]>(initialItems);
  const [metrics, setMetrics] = useState(initialMetrics);
  const [categories, setCategories] = useState(initialFilters.categories);
  const [locations, setLocations] = useState(initialFilters.locations);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all"); // "all" | "active" | "expiring_soon" | "expired" | "archived"

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingItem, setViewingItem] = useState<any | null>(null);

  const fetchItems = async () => {
    try {
      const isArchived = selectedStatus === "archived";
      const statusParam = isArchived ? "all" : selectedStatus;
      const res = await fetch(
        `/api/inventory?category=${selectedCategory}&location=${selectedLocation}&status=${statusParam}&archived=${isArchived}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setItems(json.data.items);
          setMetrics(json.data.metrics);
          setCategories(json.data.filters.categories);
          setLocations(json.data.filters.locations);
        }
      }
    } catch (err) {
      console.error("Failed to refresh inventory:", err);
    }
  };

  const handleSaveItem = async (formData: FormData) => {
    const itemId = formData.get("id");
    if (itemId) {
      const res = await fetch(`/api/inventory/${itemId}`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to update item");
      }
    } else {
      const res = await fetch("/api/inventory", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Failed to add item");
      }
    }
    await fetchItems();
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm(`Are you sure you want to delete "${item.name}" and all its service history?`)) return;

    // Optimistic UI update
    setItems((prev) => prev.filter((i) => i.id !== item.id));

    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await fetchItems();
      }
    } catch {
      await fetchItems();
    }
  };

  const handleToggleArchive = async (item: any) => {
    const nextArchived = !item.isArchived;
    try {
      const res = await fetch(`/api/inventory/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: nextArchived }),
      });
      if (res.ok) {
        await fetchItems();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilterStatus = (statusKey: string) => {
    setSelectedStatus(statusKey);
    setTimeout(() => {
      fetchItems();
    }, 0);
  };

  // Client-side search filtering
  const visibleItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase().trim();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.brand && it.brand.toLowerCase().includes(q)) ||
        (it.modelNumber && it.modelNumber.toLowerCase().includes(q)) ||
        (it.serialNumber && it.serialNumber.toLowerCase().includes(q)) ||
        (it.location && it.location.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl glass-card border border-theme-border shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-theme-accent-subtle text-theme-accent flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-theme-text-primary block leading-none">
              {metrics.totalCount}
            </span>
            <span className="text-xs text-theme-text-muted">Total Items</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-theme-border shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-theme-text-primary block leading-none">
              {metrics.activeWarranties}
            </span>
            <span className="text-xs text-theme-text-muted">Active Warranties</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-theme-border shadow-2xs flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            metrics.expiringSoonWarranties > 0 ? "bg-amber-500/10 text-amber-500" : "bg-slate-500/10 text-theme-text-muted"
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className={`text-xl font-bold block leading-none ${
              metrics.expiringSoonWarranties > 0 ? "text-amber-500" : "text-theme-text-primary"
            }`}>
              {metrics.expiringSoonWarranties}
            </span>
            <span className="text-xs text-theme-text-muted">Expiring Soon (30d)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl glass-card border border-theme-border shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="truncate">
            <span className="text-sm font-bold text-theme-text-primary block leading-none truncate">
              {Object.keys(metrics.valuationByCurrency).length > 0
                ? Object.entries(metrics.valuationByCurrency)
                    .map(([curr, val]) => `${curr} ${Math.round(val).toLocaleString()}`)
                    .join(", ")
                : "No values recorded"}
            </span>
            <span className="text-xs text-theme-text-muted">Total Valuation</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-theme-glass-subtle border border-theme-border self-start">
          {[
            { key: "all", label: "All Items" },
            { key: "active", label: `Active (${metrics.activeWarranties})` },
            { key: "expiring_soon", label: `Expiring Soon (${metrics.expiringSoonWarranties})`, alert: metrics.expiringSoonWarranties > 0 },
            { key: "expired", label: `Expired (${metrics.expiredWarranties})` },
            { key: "archived", label: "Archived" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleFilterStatus(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedStatus === tab.key
                  ? "bg-theme-accent text-white shadow-2xs"
                  : tab.alert
                  ? "text-amber-600 dark:text-amber-400 hover:text-amber-500"
                  : "text-theme-text-secondary hover:text-theme-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Add Button */}
        <div className="flex items-center gap-2.5">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-text-muted" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items, brands, serials..."
              className="pl-8 h-9 text-xs"
            />
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setIsFormModalOpen(true);
            }}
            className="text-xs h-9 gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Item</span>
          </Button>
        </div>
      </div>

      {/* Dropdown Filters (Category & Location) */}
      {(categories.length > 0 || locations.length > 0) && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {categories.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-theme-text-muted">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setTimeout(fetchItems, 0);
                }}
                className="h-8 px-2.5 rounded-lg border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {locations.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-theme-text-muted">Location:</span>
              <select
                value={selectedLocation}
                onChange={(e) => {
                  setSelectedLocation(e.target.value);
                  setTimeout(fetchItems, 0);
                }}
                className="h-8 px-2.5 rounded-lg border border-theme-border bg-theme-bg-elevated text-xs text-theme-text-primary"
              >
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Items Grid */}
      {visibleItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={`glass-panel border rounded-2xl p-4 transition-all duration-150 hover:border-theme-accent/30 flex flex-col justify-between ${
                item.isArchived
                  ? "opacity-60 bg-theme-glass-subtle/50 border-theme-border"
                  : item.warrantyStatus === "expiring_soon"
                  ? "border-amber-500/30 bg-amber-500/[0.02]"
                  : "border-theme-border bg-theme-glass"
              }`}
            >
              <div>
                {/* Header row: Category & Warranty status badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-theme-accent uppercase tracking-wider">
                    {item.category}
                  </span>
                  {item.warrantyStatus === "active" && (
                    <Badge variant="success">Active</Badge>
                  )}
                  {item.warrantyStatus === "expiring_soon" && (
                    <Badge variant="warning">Expiring Soon</Badge>
                  )}
                  {item.warrantyStatus === "expired" && (
                    <Badge variant="danger">Expired</Badge>
                  )}
                  {item.warrantyStatus === "unknown" && (
                    <Badge variant="default">No Warranty</Badge>
                  )}
                </div>

                {/* Title & Brand */}
                <h4 className="text-sm font-bold text-theme-text-primary tracking-tight truncate mb-1">
                  {item.name}
                </h4>
                <p className="text-xs text-theme-text-muted truncate mb-3">
                  {item.brand ? `${item.brand} ` : ""}
                  {item.modelNumber ? `• ${item.modelNumber}` : ""}
                </p>

                {/* Info Pills: Location & Price */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-theme-text-secondary mb-3">
                  {item.location && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-glass-subtle border border-theme-border text-[11px]">
                      <MapPin className="w-3 h-3 text-sky-500" />
                      <span>{item.location}</span>
                    </span>
                  )}
                  {item.purchasePrice !== null && item.purchasePrice !== undefined && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-theme-glass-subtle border border-theme-border text-[11px] font-medium">
                      <span>{item.currency || "USD"} {Number(item.purchasePrice).toFixed(2)}</span>
                    </span>
                  )}
                </div>

                {/* Warranty Summary Label */}
                <div className="p-2.5 rounded-xl bg-theme-bg-elevated/60 border border-theme-border/60 text-xs flex items-center justify-between mb-3">
                  <span className="text-theme-text-muted text-[11px]">Coverage:</span>
                  <span className="font-medium text-theme-text-primary text-[11px]">
                    {item.warrantyLabel || "No expiry set"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-theme-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewingItem(item);
                    setIsDetailModalOpen(true);
                  }}
                  className="text-xs h-7 px-2.5 gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Specs & Service ({item.serviceLogs?.length || 0})</span>
                </Button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(item);
                      setIsFormModalOpen(true);
                    }}
                    className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle"
                    title="Edit item"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleArchive(item)}
                    className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle"
                    title={item.isArchived ? "Unarchive item" : "Archive item"}
                  >
                    {item.isArchived ? <ArchiveRestore className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item)}
                    className="p-1.5 rounded-lg text-theme-text-muted hover:text-rose-500 hover:bg-rose-500/10"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Package}
          title="No inventory items found"
          description={
            searchQuery
              ? `No items match "${searchQuery}". Clear your search query to see all items.`
              : selectedStatus === "archived"
              ? "No archived items in your inventory."
              : selectedStatus === "expiring_soon"
              ? "Good news! None of your warranties are expiring in the next 30 days."
              : "Track your home appliances, electronics, warranty expiry dates, serial numbers, and service history."
          }
          actionText="+ Add Your First Item"
          onAction={() => {
            setEditingItem(null);
            setIsFormModalOpen(true);
          }}
        />
      )}

      {/* Add / Edit Form Modal */}
      <InventoryFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSave={handleSaveItem}
        initialData={editingItem}
      />

      {/* Details & Service History Modal */}
      <InventoryDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        item={viewingItem}
        onRefreshItem={async () => {
          if (viewingItem) {
            const res = await fetch(`/api/inventory/${viewingItem.id}`);
            if (res.ok) {
              const json = await res.json();
              if (json.success) {
                setViewingItem(json.data);
              }
            }
          }
          await fetchItems();
        }}
      />
    </div>
  );
}
