"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Plus,
  Gift,
  Heart,
  Repeat,
  Sparkles,
  Trash2,
  Edit2,
  Clock,
  Filter,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ComputedDateInfo } from "@/lib/dates/calculations";
import { IMPORTANT_DATE_CATEGORIES, ImportantDateCategory } from "@/lib/dates/constants";
import { ImportantDateFormModal, ImportantDateFormData } from "./ImportantDateFormModal";
import { formatShortDate } from "@/lib/utils";

export interface ImportantDateRecord {
  id: string;
  title: string;
  eventDate: string | Date;
  category: string;
  recurrence: string;
  reminderDaysBefore: number;
  notes?: string | null;
  computed: ComputedDateInfo;
}

interface ImportantDateListClientProps {
  initialDates: ImportantDateRecord[];
}

export function ImportantDateListClient({ initialDates }: ImportantDateListClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<ImportantDateFormData | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleRefresh = () => {
    router.refresh();
  };

  const handleOpenAdd = () => {
    setSelectedDate(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (date: ImportantDateRecord) => {
    setSelectedDate({
      id: date.id,
      title: date.title,
      eventDate: String(date.eventDate),
      category: date.category,
      recurrence: date.recurrence,
      reminderDaysBefore: date.reminderDaysBefore,
      notes: date.notes,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (date: ImportantDateRecord) => {
    if (!confirm(`Are you sure you want to delete "${date.title}"? Associated reminders will also be removed.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/dates/${date.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        handleRefresh();
      } else {
        alert(data.error?.message || "Failed to delete date");
      }
    } catch (err) {
      console.error("[Delete Date Error]:", err);
      alert("Network error deleting date");
    }
  };

  const filtered = initialDates.filter((d) => {
    if (categoryFilter !== "all" && d.category.toLowerCase() !== categoryFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchNotes = (d.notes || "").toLowerCase().includes(q);
      const matchCat = d.category.toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchCat) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Important Dates & Milestones
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Never forget a birthday, anniversary, wedding, or recurring life event.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Important Date</span>
        </Button>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dates, milestones, notes..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        {/* Filter Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setCategoryFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              categoryFilter === "all"
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
            }`}
          >
            All Dates ({initialDates.length})
          </button>

          {IMPORTANT_DATE_CATEGORIES.map((cat) => {
            const count = initialDates.filter((d) => d.category.toLowerCase() === cat.value.toLowerCase()).length;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setCategoryFilter(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat.value
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {initialDates.length === 0 ? (
        <div className="p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No important dates scheduled
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record upcoming birthdays, wedding anniversaries, and personal milestones.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAdd}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
          >
            Add First Important Date
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-2">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            No important dates match your search or filter
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
            }}
            className="text-xs text-rose-600 hover:underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map((item) => {
            const { nextOccurrence, daysRemaining, isToday, yearsCount, label } = item.computed;

            const categoryIcons: Record<string, typeof Gift> = {
              birthday: Gift,
              anniversary: Heart,
              wedding: Heart,
              renewal: Repeat,
              custom: Calendar,
            };
            const Icon = categoryIcons[item.category.toLowerCase()] || Calendar;

            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {item.category} • Next: {formatShortDate(nextOccurrence)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      isToday
                        ? "bg-rose-600 text-white animate-pulse"
                        : daysRemaining <= 7
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200"
                        : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {label}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {yearsCount && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/40">
                      <Sparkles className="w-3 h-3" />
                      <span>
                        {yearsCount}
                        {yearsCount === 1 ? "st" : yearsCount === 2 ? "nd" : yearsCount === 3 ? "rd" : "th"} Year Milestone
                      </span>
                    </span>
                  )}

                  {item.recurrence !== "none" && (
                    <span className="flex items-center gap-1 text-slate-400 text-[11px]">
                      <Repeat className="w-3 h-3" />
                      <span className="capitalize">{item.recurrence}</span>
                    </span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg">
                    {item.notes}
                  </p>
                )}

                {/* Footer Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Remind {item.reminderDaysBefore}d ahead
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit date"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      title="Delete date"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <ImportantDateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleRefresh}
        initialData={selectedDate}
      />
    </div>
  );
}
