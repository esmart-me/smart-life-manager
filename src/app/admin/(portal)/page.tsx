import { prisma } from "@/lib/db/prisma";
import {
  Users,
  CreditCard,
  XCircle,
  CheckCircle,
  DollarSign,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  Bot,
  AlertCircle,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getAiConfigStatus } from "@/lib/ai/gemini-service";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  await requireAdmin();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch real database counts concurrently
  const [
    totalCustomers,
    newCustomers,
    userSubs,
    billingStats,
    recentAudits,
    recentCustomers,
    totalAiConversations,
    totalAiMessages,
  ] = await Promise.all([
    // Customers (non-admin accounts)
    prisma.user.count({
      where: { role: { in: ["user", "customer"] } },
    }),
    // New Customers last 30d
    prisma.user.count({
      where: {
        role: { in: ["user", "customer"] },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // Subscriptions breakdown (real DB rows)
    prisma.userSubscription.findMany({
      select: {
        plan: true,
        status: true,
        billingInterval: true,
        amount: true,
        currency: true,
      },
    }),
    // Billing transaction aggregates
    prisma.billingTransaction.findMany({
      select: {
        amount: true,
        currency: true,
        status: true,
        paymentDate: true,
      },
    }),
    // Recent audit logs
    prisma.adminAuditLog.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
    }),
    // Recent customers
    prisma.user.findMany({
      where: { role: { in: ["user", "customer"] } },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        profile: true,
        userSubscription: true,
      },
    }),
    // AI metrics
    prisma.aiConversation.count(),
    prisma.aiMessage.count(),
  ]);

  const aiStatus = getAiConfigStatus();

  // Compute subscription numbers from real database records
  let freeUsers = 0;
  let premiumUsers = 0;
  let familyUsers = 0;
  let activeSubscriptions = 0;
  let cancelledSubscriptions = 0;
  let actualMRR = 0;

  for (const sub of userSubs) {
    if (sub.plan === "free") freeUsers++;
    else if (sub.plan === "premium") premiumUsers++;
    else if (sub.plan === "family") familyUsers++;

    if (sub.status === "active" && (sub.plan === "premium" || sub.plan === "family")) {
      activeSubscriptions++;
      const monthlyAmount =
        sub.billingInterval === "yearly" ? sub.amount / 12 : sub.amount;
      actualMRR += monthlyAmount || 0;
    } else if (sub.status === "cancelled") {
      cancelledSubscriptions++;
    }
  }

  // Any user without an explicit subscription row is counted as free
  const usersWithSubs = userSubs.length;
  if (totalCustomers > usersWithSubs) {
    freeUsers += totalCustomers - usersWithSubs;
  }

  // Active customers: users with an active status
  const activeCustomers = totalCustomers - cancelledSubscriptions;

  // Compute payment transactions from real database rows
  let successfulPayments = 0;
  let failedPayments = 0;
  let totalRevenueUSD = 0;

  for (const tx of billingStats) {
    if (tx.status === "paid") {
      successfulPayments++;
      totalRevenueUSD += tx.amount;
    } else if (tx.status === "failed") {
      failedPayments++;
    }
  }

  const actualARR = actualMRR * 12;
  const hasRevenueData = actualMRR > 0 || totalRevenueUSD > 0;

  const kpis = [
    {
      title: "Total Customers",
      value: totalCustomers.toLocaleString(),
      subtext: totalCustomers === 0 ? "No registered customers yet" : `${newCustomers} new in last 30 days`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-950/40 border-blue-800/60",
    },
    {
      title: "Active Customers",
      value: (activeCustomers > 0 ? activeCustomers : totalCustomers).toLocaleString(),
      subtext: `${activeSubscriptions} paying, ${freeUsers} free`,
      icon: Activity,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/60",
    },
    {
      title: "Free Users",
      value: freeUsers.toLocaleString(),
      subtext: "Free Starter tier accounts",
      icon: Sparkles,
      color: "text-slate-400",
      bg: "bg-slate-900 border-slate-800",
    },
    {
      title: "Premium Users",
      value: premiumUsers.toLocaleString(),
      subtext: "Life Pro Premium active accounts",
      icon: CreditCard,
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-800/60",
    },
    {
      title: "Family Users",
      value: familyUsers.toLocaleString(),
      subtext: "Family Circle Plus active accounts",
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-950/40 border-purple-800/60",
    },
    {
      title: "Monthly Recurring (MRR)",
      value: hasRevenueData ? `$${actualMRR.toFixed(2)}` : "$0.00",
      subtext: hasRevenueData
        ? `From ${activeSubscriptions} active paid subscription(s)`
        : "Revenue data not configured",
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-950/40 border-amber-800/60",
    },
    {
      title: "Annual Revenue (ARR)",
      value: hasRevenueData ? `$${actualARR.toFixed(2)}` : "$0.00",
      subtext: hasRevenueData
        ? "Projected annual recurring run-rate"
        : "Revenue data not configured",
      icon: TrendingUp,
      color: "text-cyan-400",
      bg: "bg-cyan-950/40 border-cyan-800/60",
    },
    {
      title: "Successful Payments",
      value: successfulPayments.toLocaleString(),
      subtext:
        totalRevenueUSD > 0
          ? `$${totalRevenueUSD.toFixed(2)} total collected`
          : "Revenue data not configured",
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/60",
    },
    {
      title: "Failed Payments",
      value: failedPayments.toLocaleString(),
      subtext: failedPayments === 0 ? "Zero payment faults" : "Attention needed",
      icon: XCircle,
      color: failedPayments > 0 ? "text-rose-400" : "text-slate-400",
      bg: failedPayments > 0 ? "bg-rose-950/40 border-rose-800/60" : "bg-slate-900 border-slate-800",
    },
    {
      title: "Cancelled Subscriptions",
      value: cancelledSubscriptions.toLocaleString(),
      subtext: "Churned or non-renewing plans",
      icon: XCircle,
      color: cancelledSubscriptions > 0 ? "text-rose-400" : "text-slate-400",
      bg: cancelledSubscriptions > 0 ? "bg-rose-950/40 border-rose-800/60" : "bg-slate-900 border-slate-800",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Administrator Overview
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time database metrics across customer accounts, subscription health, and regional revenues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/customers"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-600/30 transition-all"
          >
            <span>Manage Customers</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/plans"
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <span>Regional Pricing</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* KPI Grid - 10 Core Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-5 rounded-2xl border ${kpi.bg} flex flex-col justify-between space-y-3 transition-all`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  {kpi.title}
                </span>
                <div className={`p-2 rounded-xl bg-slate-950/50 ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {kpi.value}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {kpi.subtext}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Assistant Architecture & Status (Phase 11 Foundation) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-md shadow-brand-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">AI Assistant Architecture</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  Read-Only Mode
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Grounding &amp; tenant-isolation security engine for Smart Life Manager
              </p>
            </div>
          </div>

          <div>
            {aiStatus.configured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Operational ({aiStatus.model})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Awaiting Configuration
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">AI Provider</span>
            <p className="font-bold text-slate-200 text-sm">{aiStatus.provider}</p>
            <p className="text-[11px] text-slate-400 font-mono">Model: {aiStatus.model}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Tenant Isolation</span>
            <p className="font-bold text-emerald-400 text-sm">Enforced</p>
            <p className="text-[11px] text-slate-400">Strict per-user data scoping</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Conversations</span>
            <p className="font-bold text-white text-sm">{totalAiConversations}</p>
            <p className="text-[11px] text-slate-400">Total active chat threads</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Messages Grounded</span>
            <p className="font-bold text-white text-sm">{totalAiMessages}</p>
            <p className="text-[11px] text-slate-400">Total processed AI turns</p>
          </div>
        </div>

        {!aiStatus.configured && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs space-y-2">
            <div className="font-semibold text-amber-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>How to Configure Google Gemini API</span>
            </div>
            <p className="text-slate-300">
              The AI Assistant securely uses server-side environment variables. To activate:
            </p>
            <div className="p-2.5 rounded bg-slate-950 font-mono text-[11px] text-amber-300 border border-slate-800">
              GEMINI_API_KEY=&quot;your-google-gemini-api-key&quot;
            </div>
            <p className="text-[11px] text-slate-400">
              Add this to your server environment (.env) and restart the application. The key is never exposed to browser bundles or network clients.
            </p>
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Customers & Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Customers */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Recent Customers</span>
            </h3>
            <Link
              href="/admin/customers"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              View All &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-800/80">
            {recentCustomers.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-300">
                  No registered customers yet
                </p>
                <p className="text-[11px] text-slate-500">
                  When new customers sign up, their profile and subscription will appear here.
                </p>
              </div>
            ) : (
              recentCustomers.map((c) => (
                <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold text-slate-200">
                      {c.profile?.displayName || c.email}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {c.email} &bull; {c.profile?.country || "US"}
                    </p>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        c.userSubscription?.plan === "family"
                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                          : c.userSubscription?.plan === "premium"
                          ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {c.userSubscription?.plan || "free"}
                    </span>
                    <p className="text-[10px] text-slate-500">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Audit Log */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Admin Activity & Security Audit</span>
            </h3>
            <Link
              href="/admin/audit"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Full Log &rarr;
            </Link>
          </div>

          <div className="space-y-2.5">
            {recentAudits.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                No administrative actions logged yet.
              </p>
            ) : (
              recentAudits.map((a) => (
                <div
                  key={a.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-slate-300 font-mono">
                      {a.action}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      by {a.adminEmail} &bull; {a.ipAddress}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(a.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
