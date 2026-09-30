export default function AdminDashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-slate-800 rounded-lg" />
          <div className="h-3.5 w-96 bg-slate-850 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 bg-slate-800 rounded-lg" />
          <div className="h-8 w-32 bg-slate-800 rounded-lg" />
        </div>
      </div>

      {/* 10 KPI Cards Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 bg-slate-800 rounded" />
              <div className="w-8 h-8 rounded-xl bg-slate-800/80" />
            </div>
            <div className="space-y-1.5">
              <div className="h-7 w-20 bg-slate-800 rounded-md" />
              <div className="h-2.5 w-32 bg-slate-850 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* System Status Cards Skeleton */}
      <div className="space-y-4">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800" />
              <div className="space-y-1.5">
                <div className="h-4 w-44 bg-slate-800 rounded" />
                <div className="h-3 w-64 bg-slate-850 rounded" />
              </div>
            </div>
            <div className="h-6 w-28 bg-slate-800 rounded-full" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                <div className="h-2.5 w-16 bg-slate-800 rounded" />
                <div className="h-4 w-28 bg-slate-700 rounded" />
                <div className="h-2.5 w-36 bg-slate-850 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Column Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-32 bg-slate-800 rounded" />
            <div className="h-3 w-16 bg-slate-800 rounded" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="py-2.5 flex items-center justify-between border-b border-slate-800/60">
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 bg-slate-800 rounded" />
                  <div className="h-2.5 w-48 bg-slate-850 rounded" />
                </div>
                <div className="h-4 w-16 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 bg-slate-800 rounded" />
            <div className="h-3 w-16 bg-slate-800 rounded" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                <div className="h-3 w-32 bg-slate-800 rounded" />
                <div className="h-2.5 w-44 bg-slate-850 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
