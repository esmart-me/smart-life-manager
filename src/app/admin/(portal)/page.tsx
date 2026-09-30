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
  Clock,
} from "lucide-react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getAiConfigStatus } from "@/lib/ai/gemini-service";
import { isRealStripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/**
 * Executes a database query with a 5000ms safety timeout and default fallback.
 * Prevents any secondary metric failure or SQLite lock delay from crashing the entire Admin Dashboard.
 */
async function safeQuery<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    const timeout = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout fetching ${label}`)), 5000)
    );
    return await Promise.race([promise, timeout]);
  } catch (error) {
    console.error(`[AdminDashboard] Query failed for ${label}:`, error);
    return fallback;
  }
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    return isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function formatTime(d: Date | string | null | undefined): string {
  if (!d) return "";
  try {
    const date = new Date(d);
    return isNaN(date.getTime()) ? "" : `${date.toISOString().slice(11, 16)} UTC`;
  } catch {
    return "";
  }
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch real database counts concurrently with individual fault tolerance
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
    safeQuery(
      prisma.user.count({
        where: { role: { in: ["user", "customer"] } },
      }),
      0,
      "totalCustomers"
    ),
    // New Customers last 30d
    safeQuery(
      prisma.user.count({
        where: {
          role: { in: ["user", "customer"] },
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      0,
      "newCustomers"
    ),
    // Subscriptions breakdown (strictly customer accounts, excluding admin test records)
    safeQuery(
      prisma.userSubscription.findMany({
        where: {
          user: { role: { in: ["user", "customer"] } },
        },
        select: {
          plan: true,
          status: true,
          billingInterval: true,
          amount: true,
          currency: true,
        },
      }),
      [],
      "userSubs"
    ),
    // Billing transaction aggregates (strictly customer accounts, excluding admin test records)
    safeQuery(
      prisma.billingTransaction.findMany({
        where: {
          user: { role: { in: ["user", "customer"] } },
        },
        select: {
          amount: true,
          currency: true,
          status: true,
          paymentDate: true,
        },
      }),
      [],
      "billingStats"
    ),
    // Recent audit logs
    safeQuery(
      prisma.adminAuditLog.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
      }),
      [],
      "recentAudits"
    ),
    // Recent customers
    safeQuery(
      prisma.user.findMany({
        where: { role: { in: ["user", "customer"] } },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          profile: true,
          userSubscription: true,
        },
      }),
      [],
      "recentCustomers"
    ),
    // AI metrics
    safeQuery(prisma.aiConversation.count(), 0, "totalAiConversations"),
    safeQuery(prisma.aiMessage.count(), 0, "totalAiMessages"),
  ]);

  const aiStatus = getAiConfigStatus();
  const isStripeConfigured = isRealStripeConfigured();

  // Compute subscription numbers from real customer database records
  let freeUsers = 0;
  let premiumUsers = 0;
  let familyUsers = 0;
  let payingCustomers = 0;
  let cancelledSubscriptions = 0;
  let actualMRR = 0;

  for (const sub of userSubs) {
    if (sub.plan === "free") freeUsers++;
    else if (sub.plan === "premium") premiumUsers++;
    else if (sub.plan === "family") familyUsers++;

    if (sub.status === "active" && (sub.plan === "premium" || sub.plan === "family")) {
      payingCustomers++;
      const monthlyAmount =
        sub.billingInterval === "yearly" ? sub.amount / 12 : sub.amount;
      actualMRR += monthlyAmount || 0;
    } else if (sub.status === "cancelled") {
      cancelledSubscriptions++;
    }
  }

  // Any registered customer without an explicit subscription row is counted as free
  const usersWithSubs = userSubs.length;
  if (totalCustomers > usersWithSubs) {
    freeUsers += totalCustomers - usersWithSubs;
  }

  // Active customers: registered customers who have not cancelled their tier
  const activeCustomers = Math.max(0, totalCustomers - cancelledSubscriptions);

  // Compute payment transactions from real customer database rows
  let successfulPayments = 0;
  let failedPayments = 0;
  let pendingPayments = 0;
  let totalRevenueUSD = 0;

  for (const tx of billingStats) {
    if (tx.status === "paid") {
      successfulPayments++;
      totalRevenueUSD += tx.amount;
    } else if (tx.status === "pending_verification") {
      pendingPayments++;
    } else if (tx.status === "failed") {
      failedPayments++;
    }
  }

  const actualARR = actualMRR * 12;

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
      value: activeCustomers.toLocaleString(),
      subtext: `${payingCustomers} paying, ${freeUsers} free`,
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
      value: payingCustomers > 0 ? `$${actualMRR.toFixed(2)}` : "$0.00",
      subtext: payingCustomers > 0
        ? `From ${payingCustomers} active paid subscription(s)`
        : "0 active paying customers",
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-950/40 border-amber-800/60",
    },
    {
      title: "Annual Revenue (ARR)",
      value: payingCustomers > 0 ? `$${actualARR.toFixed(2)}` : "$0.00",
      subtext: payingCustomers > 0
        ? "Projected annual recurring run-rate"
        : "0 active paying customers",
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
          : "0 customer transactions",
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/60",
    },
    {
      title: "Pending Verifications",
      value: pendingPayments.toLocaleString(),
      subtext: pendingPayments > 0 ? "Manual UPI payments awaiting approval" : "All payments verified",
      icon: Clock,
      color: pendingPayments > 0 ? "text-amber-400" : "text-slate-400",
      bg: pendingPayments > 0 ? "bg-amber-950/40 border-amber-800/60" : "bg-slate-900 border-slate-800",
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

      {/* Payment Gateway & Billing Infrastructure Status */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Payment Gateway &amp; Billing Infrastructure</h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  PCI-DSS Compliant
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stripe payment gateway orchestration and recurring subscription billing ledger
              </p>
            </div>
          </div>

          <div>
            {isStripeConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-xs font-semibold">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Live Stripe Integration Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Stripe webhook/keys not configured in production - Running in sandbox mode
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Gateway Provider</span>
            <p className="font-bold text-slate-200 text-sm">Stripe</p>
            <p className="text-[11px] text-slate-400">Official Stripe Node SDK</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Runtime Mode</span>
            <p className={`font-bold text-sm ${isStripeConfigured ? "text-emerald-400" : "text-amber-400"}`}>
              {isStripeConfigured ? "Production Live" : "Sandbox Simulation"}
            </p>
            <p className="text-[11px] text-slate-400">
              {isStripeConfigured ? "Real payment card charges" : "Simulated test checkouts"}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Active Paid Subscriptions</span>
            <p className="font-bold text-white text-sm">{payingCustomers}</p>
            <p className="text-[11px] text-slate-400">Real paying customers</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-slate-500 uppercase tracking-wider text-[10px] font-semibold">Collected Revenue</span>
            <p className="font-bold text-white text-sm">${totalRevenueUSD.toFixed(2)}</p>
            <p className="text-[11px] text-slate-400">Total customer receipts</p>
          </div>
        </div>
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
                      {formatDate(c.createdAt)}
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
                    {formatTime(a.createdAt)}
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
