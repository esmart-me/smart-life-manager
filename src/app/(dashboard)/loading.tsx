export default function DashboardLoading() {
  return (
    <div
      role="status"
      aria-label="Loading page content"
      className="space-y-6 animate-pulse"
    >
      <span className="sr-only">Loading page content...</span>

      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-theme-border pb-5">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-3.5 w-72 rounded-lg bg-slate-200/50 dark:bg-slate-800/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-9 w-28 rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="h-9 w-32 rounded-xl bg-slate-200/80 dark:bg-slate-800/80" />
        </div>
      </div>

      {/* KPI / Summary Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-theme-border glass-card flex flex-col justify-between space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 rounded-md bg-slate-200/60 dark:bg-slate-800/60" />
              <div className="w-8 h-8 rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
            </div>
            <div className="space-y-2">
              <div className="h-6 w-28 rounded-lg bg-slate-200/80 dark:bg-slate-700/80" />
              <div className="h-3 w-36 rounded-md bg-slate-200/50 dark:bg-slate-800/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div className="p-3.5 rounded-2xl border border-theme-border glass-panel flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
        <div className="h-9 w-full sm:w-72 rounded-xl bg-slate-200/60 dark:bg-slate-800/60" />
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="h-8 w-20 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="h-8 w-24 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
          <div className="h-8 w-20 rounded-lg bg-slate-200/60 dark:bg-slate-800/60" />
        </div>
      </div>

      {/* Content List / Table Skeleton */}
      <div className="rounded-2xl border border-theme-border glass-card p-5 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-theme-border">
          <div className="h-4 w-32 rounded-md bg-slate-200/70 dark:bg-slate-800/70" />
          <div className="h-3 w-16 rounded-md bg-slate-200/50 dark:bg-slate-800/50" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-3.5 rounded-xl border border-theme-border/60 glass-subtle flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-200/70 dark:bg-slate-800/70 shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <div className="h-3.5 w-40 sm:w-56 rounded-md bg-slate-200/80 dark:bg-slate-700/80" />
                <div className="h-2.5 w-24 sm:w-36 rounded-md bg-slate-200/50 dark:bg-slate-800/50" />
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="h-6 w-16 rounded-full bg-slate-200/60 dark:bg-slate-800/60 hidden sm:block" />
              <div className="h-4 w-12 rounded-md bg-slate-200/70 dark:bg-slate-750/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
