// src/app/admin/(portal)/customers/[id]/page.tsx
// Dedicated Customer Detail View — Central Control Plane Only.
// Strictly obeys the Privacy Boundary: ZERO queries to private customer data.

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { getCentralCustomerDetail } from "@/lib/supabase/server";
import { CustomerDetailView } from "@/components/admin/CustomerDetailView";

export const dynamic = "force-dynamic";

interface CustomerDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AdminCustomerDetailPage({ params }: CustomerDetailPageProps) {
  await requireAdmin();
  const { id } = await params;

  // 1. Fetch user account and subscription from local database
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      profile: true,
      userSubscription: true,
      billingTransactions: {
        orderBy: { paymentDate: "desc" },
        take: 50,
      },
    },
  });

  // 2. Fetch authoritative Central Control data from Supabase
  const central = await getCentralCustomerDetail(id);

  if (!user && !central.profile) {
    notFound();
  }

  // Derive Display Name
  const name =
    user?.profile?.displayName ||
    `${user?.profile?.firstName || ""} ${user?.profile?.lastName || ""}`.trim() ||
    central.profile?.full_name ||
    user?.email?.split("@")[0] ||
    central.profile?.email?.split("@")[0] ||
    "Customer";

  const email = user?.email || central.profile?.email || "Unknown";
  const accountStatus = user?.status || central.profile?.account_status || "active";

  // Derive Subscription & Entitlements
  const plan =
    central.subscription?.plan_id ||
    user?.userSubscription?.plan ||
    "basic";

  const planName =
    user?.userSubscription?.planName ||
    (plan === "family"
      ? "Family Circle Plus"
      : plan === "premium" || plan === "pro"
      ? "Life Pro Premium"
      : "Basic Free Tier");

  const subStatus = central.subscription?.status || user?.userSubscription?.status || "active";
  const expiryDate =
    central.subscription?.expires_at ||
    (user?.userSubscription?.currentPeriodEnd
      ? user.userSubscription.currentPeriodEnd.toISOString()
      : null);

  const startDate =
    central.subscription?.starts_at ||
    (user?.userSubscription?.currentPeriodStart
      ? user.userSubscription.currentPeriodStart.toISOString()
      : user?.createdAt?.toISOString() || new Date().toISOString());

  const isExpired = expiryDate ? new Date(expiryDate).getTime() < Date.now() : false;
  const isPremiumTier = plan === "premium" || plan === "pro" || plan === "family";
  const premiumEnabled = isPremiumTier && subStatus === "active" && !isExpired;

  const daysRemaining = expiryDate
    ? Math.max(0, Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  // Merge payment ledger: central Supabase payments + local billing transactions
  const paymentsList: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    referenceId: string;
    method?: string;
  }> = [];

  if (central.payments && central.payments.length > 0) {
    for (const p of central.payments) {
      paymentsList.push({
        id: p.id,
        amount: Number(p.amount) || 0,
        currency: p.currency || "USD",
        status: p.status || "completed",
        date: p.created_at || new Date().toISOString(),
        referenceId: p.reference_id || p.id,
        method: p.payment_method || "central",
      });
    }
  } else if (user?.billingTransactions) {
    for (const bt of user.billingTransactions) {
      paymentsList.push({
        id: bt.id,
        amount: bt.amount,
        currency: bt.currency,
        status: bt.status,
        date: bt.paymentDate.toISOString(),
        referenceId: bt.utrNumber || bt.transactionId,
        method: bt.paymentProvider,
      });
    }
  }

  // Devices & Login Events from central telemetry
  const devicesList = (central.devices || []).map((d: any) => ({
    id: d.id,
    deviceId: d.device_id,
    os: d.os || "windows",
    appVersion: d.app_version || "1.0.0",
    firstSeen: d.first_seen || new Date().toISOString(),
    lastSeen: d.last_seen || new Date().toISOString(),
    isActive: Boolean(d.is_active),
  }));

  const loginHistoryList = (central.loginEvents || []).map((l: any) => ({
    id: l.id,
    timestamp: l.created_at || new Date().toISOString(),
    loginMethod: l.login_method || "password",
    deviceId: l.device_id || "desktop",
    os: l.os || "windows",
    appVersion: l.app_version || "1.0.0",
  }));

  const customerData = {
    account: {
      id,
      name,
      email,
      loginMethod: loginHistoryList[0]?.loginMethod || "password",
      accountStatus,
      createdDate: user?.createdAt?.toISOString() || central.profile?.created_at || new Date().toISOString(),
      firstLogin: user?.createdAt?.toISOString() || central.profile?.created_at || new Date().toISOString(),
      lastLogin: user?.lastLoginAt?.toISOString() || central.profile?.last_login_at || null,
      lastActive: central.profile?.last_active_at || user?.updatedAt?.toISOString() || new Date().toISOString(),
      country: user?.profile?.country || "US",
      region: user?.profile?.region || "US",
      currency: user?.profile?.currency || user?.userSubscription?.currency || "USD",
      timezone: user?.profile?.timezone || "UTC",
    },
    subscription: {
      plan,
      planName,
      status: subStatus,
      startDate,
      expiryDate,
      premiumEnabled,
      daysRemaining,
      billingInterval: user?.userSubscription?.billingInterval || "monthly",
      amount: user?.userSubscription?.amount || 0,
      currency: user?.userSubscription?.currency || "USD",
      provider: user?.userSubscription?.provider || "manual",
      cancelAtPeriodEnd: Boolean(user?.userSubscription?.cancelAtPeriodEnd),
    },
    payments: paymentsList,
    devices: devicesList,
    loginHistory: loginHistoryList,
  };

  return <CustomerDetailView customer={customerData} />;
}
