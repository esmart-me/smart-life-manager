"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  X,
  FileText,
  Bell,
  Wallet,
  Car,
  RefreshCw,
  Calendar,
  ExternalLink,
  ChevronRight,
  Filter,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SearchCategory, SearchResultItem, GlobalSearchResponse } from "@/lib/search/search-service";

const CATEGORY_TABS: Array<{ id: SearchCategory; label: string; icon: any }> = [
  { id: "all", label: "All Items", icon: Sparkles },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "expenses", label: "Expenses", icon: Wallet },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "subscriptions", label: "Subscriptions", icon: RefreshCw },
  { id: "dates", label: "Important Dates", icon: Calendar },
];

export function GlobalSearchPageClient() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<SearchCategory>("all");
  const [results, setResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearching, startTransition] = useTransition();
  const [hasSearched, setHasSearched] = useState(false);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}&category=${activeCategory}`);
          const data = await res.json();
          if (data.success) {
            setResults(data.data);
            setHasSearched(true);
          }
        } catch (err) {
          console.error("Global search error:", err);
        }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query, activeCategory]);

  const categoryCounts = results?.categoryCounts || {
    all: 0,
    documents: 0,
    reminders: 0,
    payments: 0,
    expenses: 0,
    vehicles: 0,
    subscriptions: 0,
    dates: 0,
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Search className="w-6 h-6 text-brand-600 dark:text-brand-400" />
          Global Search
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Instantly search across your documents, reminders, bills, expenses, vehicles, subscriptions, and milestones.
        </p>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anything (e.g. Passport, Rent, Insurance, BMW, Netflix, Birthday)..."
            autoFocus
            className="w-full pl-12 pr-10 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-xs transition-all"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = categoryCounts[tab.id] || 0;
          const isActive = activeCategory === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? "bg-brand-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {hasSearched && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search State Indicator */}
      {isSearching && (
        <div className="flex items-center justify-center py-8 text-sm text-slate-500 gap-2">
          <div className="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span>Searching your life records...</span>
        </div>
      )}

      {/* Results View */}
      {!isSearching && hasSearched && results && (
        <div className="space-y-6">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
            <span>
              Found <strong className="text-slate-900 dark:text-white font-semibold">{results.total}</strong> results for &ldquo;{query}&rdquo;
            </span>
            {activeCategory !== "all" && (
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className="text-brand-600 dark:text-brand-400 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>

          {results.total === 0 ? (
            <Card className="p-8 text-center bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No records found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                No items matched &ldquo;{query}&rdquo; in {activeCategory === "all" ? "any category" : activeCategory}. Try a different keyword or check your spelling.
              </p>
            </Card>
          ) : activeCategory === "all" ? (
            // Grouped results when "All Items" is selected
            <div className="space-y-6">
              {Object.entries(results.grouped).map(([catKey, catItems]) => {
                if (catItems.length === 0) return null;
                const tabInfo = CATEGORY_TABS.find((t) => t.id === catKey);
                const Icon = tabInfo?.icon || FileText;

                return (
                  <div key={catKey} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        {tabInfo?.label || catKey} ({catItems.length})
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveCategory(catKey as SearchCategory)}
                        className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-0.5"
                      >
                        View all <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {catItems.slice(0, 4).map((item) => (
                        <SearchResultCard key={`${item.category}-${item.id}`} item={item} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            // Filtered flat grid
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {results.items.map((item) => (
                <SearchResultCard key={`${item.category}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial Clean State */}
      {!hasSearched && (
        <Card className="p-8 text-center border-dashed border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">What are you looking for?</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            Type a few characters to search across all your documents, expiries, scheduled reminders, bills, expenses, cars, subscriptions, and anniversaries.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mt-5 text-xs text-slate-600 dark:text-slate-400">
            <span className="font-medium text-slate-400">Try searching:</span>
            {["Passport", "Internet Bill", "Car Service", "Netflix", "Grocery", "Insurance"].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setQuery(sample)}
                className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-500 transition-colors shadow-2xs"
              >
                {sample}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SearchResultCard({ item }: { item: SearchResultItem }) {
  return (
    <Link
      href={item.url}
      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-brand-500 dark:hover:border-brand-500 hover:shadow-xs transition-all flex flex-col justify-between group"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
            {item.categoryLabel}
          </span>
          {item.badgeText && (
            <Badge variant={item.badgeVariant || "default"}>{item.badgeText}</Badge>
          )}
        </div>

        <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors line-clamp-1">
          {item.title}
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
          {item.subtitle}
        </p>
      </div>

      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {item.date && <span>{item.date}</span>}
          {item.amount && (
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {item.amount}
            </span>
          )}
        </div>
        <span className="text-brand-600 dark:text-brand-400 font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
          Open <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
