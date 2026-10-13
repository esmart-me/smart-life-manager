"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  Tag,
  DollarSign,
  User,
  AlertCircle,
  PackageCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface ShoppingItem {
  id: string;
  item: string;
  quantity: string | null;
  category: string;
  isPurchased: boolean;
  estimatedCost: number | null;
  notes: string | null;
  assignedMemberName: string | null;
}

export function FamilyShoppingSection() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    item: "",
    quantity: "",
    category: "groceries",
    estimatedCost: "",
    assignedMemberName: "",
    notes: "",
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/family/shopping");
      const data = await res.json();
      if (data.success) {
        setItems(data.data || []);
      }
    } catch (err) {
      console.error("Failed to load shopping list:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      item: "",
      quantity: "",
      category: "groceries",
      estimatedCost: "",
      assignedMemberName: "",
      notes: "",
    });
    setShowModal(true);
  };

  const openEditModal = (item: ShoppingItem) => {
    setEditingItem(item);
    setFormData({
      item: item.item,
      quantity: item.quantity || "",
      category: item.category || "groceries",
      estimatedCost: item.estimatedCost ? item.estimatedCost.toString() : "",
      assignedMemberName: item.assignedMemberName || "",
      notes: item.notes || "",
    });
    setShowModal(true);
  };

  const handleTogglePurchased = async (item: ShoppingItem) => {
    try {
      const nextStatus = !item.isPurchased;
      const res = await fetch(`/api/family/shopping/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPurchased: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, isPurchased: nextStatus } : i
          )
        );
      }
    } catch (err) {
      console.error("Toggle purchased error:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item.trim()) return;

    try {
      setSubmitting(true);
      setNotification(null);

      const url = editingItem
        ? `/api/family/shopping/${editingItem.id}`
        : "/api/family/shopping";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: editingItem
            ? "Item updated successfully!"
            : "Item added to family shopping list!",
        });
        setShowModal(false);
        fetchItems();
      } else {
        setNotification({
          type: "error",
          message: data.error?.message || "Failed to save item.",
        });
      }
    } catch (err) {
      console.error("Save item error:", err);
      setNotification({
        type: "error",
        message: "Network error saving item.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}" from shopping list?`)) return;

    try {
      const res = await fetch(`/api/family/shopping/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: "Item removed from shopping list.",
        });
        fetchItems();
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const filteredItems = items.filter((i) => {
    if (filterCategory === "all") return true;
    return i.category === filterCategory;
  });

  const totalCost = items.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
  const purchasedCount = items.filter((i) => i.isPurchased).length;

  return (
    <div className="space-y-6">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Items
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {items.length}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/50 text-brand-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Purchased
            </span>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {purchasedCount} / {items.length}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
            <PackageCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Estimated Total
            </span>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              ${totalCost.toFixed(2)}
            </p>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {["all", "groceries", "home", "pharmacy", "kids", "other"].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all shrink-0 ${
                  filterCategory === cat
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={openCreateModal}
          className="text-xs font-semibold gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Shopping Item</span>
        </Button>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Shopping Items List */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400 animate-pulse">
          Loading shopping list...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <ShoppingCart className="w-10 h-10 mx-auto text-slate-400 mb-3" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Your shopping list is clear!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Keep track of groceries, home supplies, pharmacy items, and kids essentials in one shared list.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            className="mt-4 text-xs"
          >
            Add First Item
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 group ${
                item.isPurchased
                  ? "border-emerald-200/50 dark:border-emerald-950/30 bg-emerald-50/20 dark:bg-emerald-950/10 opacity-70"
                  : "border-slate-200/80 dark:border-slate-800/80 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => handleTogglePurchased(item)}
                  className="text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                >
                  {item.isPurchased ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-sm font-semibold text-slate-900 dark:text-white truncate ${
                        item.isPurchased
                          ? "line-through text-slate-400 dark:text-slate-500"
                          : ""
                      }`}
                    >
                      {item.item}
                    </span>
                    {item.quantity && (
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {item.quantity}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-300 font-medium capitalize">
                      {item.category}
                    </span>
                    {item.estimatedCost && (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        ${item.estimatedCost.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {(item.assignedMemberName || item.notes) && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {item.assignedMemberName && (
                        <span className="inline-flex items-center gap-1 font-medium text-brand-600 dark:text-brand-400">
                          <User className="w-3 h-3" />
                          {item.assignedMemberName}
                        </span>
                      )}
                      {item.notes && <span className="truncate">{item.notes}</span>}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => openEditModal(item)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit item"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.item)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Delete item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shopping Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
              {editingItem ? "Edit Shopping Item" : "Add Shopping Item"}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.item}
                  onChange={(e) =>
                    setFormData({ ...formData, item: e.target.value })
                  }
                  placeholder="e.g. Organic Almond Milk or Air Filters"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="text"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="e.g. 2 packs, 1 gallon"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="groceries">Groceries</option>
                    <option value="home">Home & Cleaning</option>
                    <option value="pharmacy">Pharmacy & Health</option>
                    <option value="kids">Kids & Baby</option>
                    <option value="other">Other Supplies</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Estimated Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.estimatedCost}
                    onChange={(e) =>
                      setFormData({ ...formData, estimatedCost: e.target.value })
                    }
                    placeholder="e.g. 14.50"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Assigned Member
                  </label>
                  <input
                    type="text"
                    value={formData.assignedMemberName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedMemberName: e.target.value,
                      })
                    }
                    placeholder="Who will buy this?"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes / Preferred Brand
                </label>
                <input
                  type="text"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="e.g. Unsweetened, glass bottle"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={submitting}
                  className="text-xs font-semibold"
                >
                  {submitting ? "Saving..." : editingItem ? "Save Changes" : "Add Item"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
