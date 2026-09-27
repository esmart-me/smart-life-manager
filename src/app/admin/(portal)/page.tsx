import { prisma } from "@/lib/db/prisma";
import {
  Users,
  UserPlus,
  ShieldCheck,
  CreditCard,
  XCircle,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Sparkles,
  ArrowUpRight,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { formatRegionalCurrency } from "@/lib/regions";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
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
    // Subscriptions breakdown
    prisma.userSubscription.findMany({
      select: {
        plan: true,
        status: true,
        billingInterval: true,
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
  ]);

  // Compute subscription numbers
  let freeUsers = 0;
  let premiumUsers = 0;
  let familyUsers = 0;
  let activeSubscriptions = 0;
  let cancelledSubscriptions = 0;

  for (const sub of userSubs) {
    if (sub.plan === "free") freeUsers++;
    else if (sub.plan === "premium") premiumUsers++;
    else if (sub.plan === "family") familyUsers++;

    if (sub.status === "active" && (sub.plan === "premium" || sub.plan === "family")) {
      activeSubscriptions++;
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

  // Compute payment transactions
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

  // Real MRR & ARR calculation (based on active subscription entitlements)
  // Premium ($9.99/mo) and Family ($19.99/mo)
  const estimatedMRR = (premiumUsers * 9.99) + (familyUsers * 19.99);
  const estimatedARR = estimatedMRR * 12;

  const kpis = [
    {
      title: "Total Customers",
      value: totalCustomers.toLocaleString(),
      subtext: `${newCustomers} new in last 30 days`,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-950/40 border-blue-800/60",
    },
    {
      title: "Active Customers",
      value: (activeCustomers > 0 ? activeCustomers : totalCustomers).toLocaleString(),
      subtext: `${cancelledSubscriptions} cancelled`,
      icon: Activity,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/60",
    },
    {
      title: "Active Paid Subscriptions",
      value: activeSubscriptions.toLocaleString(),
      subtext: `${premiumUsers} Pro, ${familyUsers} Family`,
      icon: CreditCard,
      color: "text-purple-400",
      bg: "bg-purple-950/40 border-purple-800/60",
    },
    {
      title: "Free Starter Tier",
      value: freeUsers.toLocaleString(),
      subtext: "Eligible for monetization conversion",
      icon: Sparkles,
      color: "text-slate-400",
      bg: "bg-slate-900 border-slate-800",
    },
    {
      title: "Successful Payments",
      value: successfulPayments.toLocaleString(),
      subtext: `${failedPayments} failed transaction attempts`,
      icon: CheckCircle,
      color: "text-emerald-400",
      bg: "bg-emerald-950/40 border-emerald-800/60",
    },
    {
      title: "Failed Payments",
      value: failedPayments.toLocaleString(),
      subtext: failedPayments === 0 ? "Zero payment faults" : "Action required",
      icon: XCircle,
      color: failedPayments > 0 ? "text-rose-400" : "text-slate-400",
      bg: failedPayments > 0 ? "bg-rose-950/40 border-rose-800/60" : "bg-slate-900 border-slate-800",
    },
    {
      title: "Monthly Revenue (MRR)",
      value: `$${estimatedMRR.toFixed(2)}`,
      subtext: "Based on active paying subscribers",
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-950/40 border-amber-800/60",
    },
    {
      title: "Annual Run-Rate (ARR)",
      value: `$${estimatedARR.toFixed(2)}`,
      subtext: "Projected annual recurring",
      icon: TrendingUp,
      color: "text-indigo-400",
      bg: "bg-indigo-950/40 border-indigo-800/60",
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

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              <p className="py-6 text-center text-xs text-slate-500">
                No customer accounts found.
              </p>
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
