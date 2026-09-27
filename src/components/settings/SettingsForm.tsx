"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import Link from "next/link";
import {
  User,
  Globe,
  Bell,
  Shield,
  Database,
  Sparkles,
  Save,
  Trash2,
  AlertTriangle,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Lock,
  CreditCard,
  Calendar,
  DollarSign,
  XCircle,
  RotateCcw,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Badge } from "@/components/ui/Badge";
import { SUPPORTED_REGIONS, getRegion, formatRegionalCurrency } from "@/lib/regions";

export interface SettingsTransactionDTO {
  id: string;
  transactionId: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  billingCycle: string;
  paymentDate: string;
  paymentProvider: string;
  failureReason?: string | null;
}

export interface SettingsSubscriptionDTO {
  plan: string;
  planName?: string;
  status: string;
  billingInterval: string;
  billingCycle?: string;
  amount?: number;
  currency?: string;
  provider?: string;
  startedAt?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  cancelledAt?: string | null;
}

interface SettingsFormProps {
  initialProfile: {
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    phoneNumber: string;
    timezone: string;
    country: string;
    region: string;
    currency: string;
  };
  initialSettings: {
    theme: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    reminderDaysBefore: number;
    weeklyDigest: boolean;
    securityAlerts: boolean;
  };
  subscriptionInfo: SettingsSubscriptionDTO;
  initialTransactions?: SettingsTransactionDTO[];
}

type SettingsTab =
  | "profile"
  | "region"
  | "notifications"
  | "privacy"
  | "data"
  | "subscription";

export function SettingsForm({
  initialProfile,
  initialSettings,
  subscriptionInfo,
  initialTransactions = [],
}: SettingsFormProps) {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState(initialProfile);
  const [settings, setSettings] = useState(initialSettings);
  const [currentSub, setCurrentSub] = useState(subscriptionInfo);
  const [transactions, setTransactions] = useState(initialTransactions);

  // Subscription action states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancellingSub, setIsCancellingSub] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  // Clear Data Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [isClearing, setIsClearing] = useState(false);

  // Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCancelSubscription = async () => {
    try {
      setIsCancellingSub(true);
      const res = await fetch("/api/subscription/cancel", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCurrentSub((prev) => ({
          ...prev,
          status: "cancelled",
          cancelAtPeriodEnd: true,
        }));
        setShowCancelModal(false);
        setSuccessMessage(
          "Your subscription has been scheduled for cancellation. Access continues through the end of your current billing cycle."
        );
      } else {
        setErrorMessage(data.error?.message || "Failed to cancel subscription.");
      }
    } catch (err: any) {
      setErrorMessage("An unexpected error occurred while cancelling subscription.");
    } finally {
      setIsCancellingSub(false);
    }
  };

  const handleOpenBillingPortal = async () => {
    try {
      setIsOpeningPortal(true);
      const res = await fetch("/api/subscription/portal", { method: "POST" });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      }
    } catch (err: any) {
      setErrorMessage("Could not load customer billing portal.");
    } finally {
      setIsOpeningPortal(false);
    }
  };

  // When country is selected, auto-suggest default currency & locale
  const handleCountryChange = (newCountryCode: string) => {
    const reg = getRegion(newCountryCode);
    setProfile((prev) => ({
      ...prev,
      country: reg.countryCode,
      region: reg.countryCode,
      currency: reg.currencyCode,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          settings,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update settings");
      }

      setSuccessMessage("Settings updated successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearData = async () => {
    if (clearConfirmText !== "CLEAR") {
      setErrorMessage('Please type "CLEAR" exactly to confirm.');
      return;
    }

    try {
      setIsClearing(true);
      setErrorMessage(null);
      const res = await fetch("/api/user/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "CLEAR" }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to clear records");
      }

      setShowClearModal(false);
      setClearConfirmText("");
      setSuccessMessage("Personal data cleared successfully. Your account remains active.");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to clear data");
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      setErrorMessage('Please type "DELETE" exactly to confirm permanent deletion.');
      return;
    }

    try {
      setIsDeleting(true);
      setErrorMessage(null);
      const res = await fetch("/api/user/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmation: "DELETE",
          password: deletePassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to delete account");
      }

      // Redirect immediately to register/login after deletion
      window.location.href = "/login?deleted=true";
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete account");
      setIsDeleting(false);
    }
  };

  const currentRegion = getRegion(profile.country || profile.region);

  const tabs: Array<{ id: SettingsTab; label: string; icon: any }> = [
    { id: "profile", label: "Profile", icon: User },
    { id: "region", label: "Region & Currency", icon: Globe },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "privacy", label: "Privacy & Theme", icon: Shield },
    { id: "data", label: "Data Management", icon: Database },
    { id: "subscription", label: "Subscription", icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      {/* Toast Notifications */}
      {successMessage && (
        <AlertBanner type="success" title="Success" message={successMessage} />
      )}
      {errorMessage && (
        <AlertBanner type="error" title="Notice" message={errorMessage} />
      )}

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                isActive
                  ? "bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: PROFILE */}
        {activeTab === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Profile</CardTitle>
              <CardDescription className="text-xs">
                Manage your identity and contact details used for notifications and document signing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  disabled
                  value={profile.email}
                  className="bg-slate-50 dark:bg-slate-800/50 cursor-not-allowed opacity-75"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Your email is your unique account identifier.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    First Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Alexander"
                    value={profile.firstName}
                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Last Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Morgan"
                    value={profile.lastName}
                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Alex M."
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number (Optional)
                  </label>
                  <Input
                    type="tel"
                    placeholder="e.g. +971 50 123 4567"
                    value={profile.phoneNumber}
                    onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Timezone
                </label>
                <select
                  value={profile.timezone}
                  onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                  className="w-full px-3 py-2 text-base sm:text-sm min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST +4:00)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (AST +3:00)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET +1:00)</option>
                  <option value="America/New_York">America/New_York (EST -5:00)</option>
                  <option value="America/Chicago">America/Chicago (CST -6:00)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST -8:00)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit" isLoading={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 2: REGION & CURRENCY */}
        {activeTab === "region" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Region & Multi-Currency Settings</CardTitle>
              <CardDescription className="text-xs">
                Configure your country of residence and default currency for expenses, vehicle maintenance, and plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Country / Region
                  </label>
                  <select
                    value={profile.country || "US"}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-sm min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    {SUPPORTED_REGIONS.map((reg) => (
                      <option key={reg.countryCode} value={reg.countryCode}>
                        {reg.flag} {reg.country} ({reg.currencyCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Display Currency
                  </label>
                  <div className="relative">
                    <Input
                      type="text"
                      value={profile.currency}
                      onChange={(e) => setProfile({ ...profile, currency: e.target.value.toUpperCase() })}
                      className="uppercase font-semibold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">
                      {currentRegion.currencySymbol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Regional Formatting Preview */}
              <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 block">
                  Regional Format Preview ({currentRegion.country})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Sample Amount</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {formatRegionalCurrency(12500.5, profile.currency, currentRegion.locale)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Date Format</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {currentRegion.dateFormat}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Locale Tag</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {currentRegion.locale}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" isLoading={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  <span>Update Regional Preferences</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === "notifications" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification & Reminder Rules</CardTitle>
              <CardDescription className="text-xs">
                Control alert timing and channels for document expiries, bills, and vehicle renewals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      Email Expiry Alerts
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Receive advance notices before passports, visas, and bills expire.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications}
                    onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      In-App Dashboard Alerts
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Show urgent items in the Attention Required banner.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.pushNotifications}
                    onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      Weekly Life Digest
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Summary of upcoming milestones and expenses for the week ahead.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.weeklyDigest}
                    onChange={(e) => setSettings({ ...settings, weeklyDigest: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Default Advance Warning Window
                </label>
                <select
                  value={settings.reminderDaysBefore}
                  onChange={(e) => setSettings({ ...settings, reminderDaysBefore: Number(e.target.value) })}
                  className="w-full sm:w-64 px-3 py-2 text-base sm:text-sm min-h-[42px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="1">1 day in advance</option>
                  <option value="3">3 days in advance</option>
                  <option value="7">7 days in advance</option>
                  <option value="14">14 days in advance</option>
                  <option value="30">30 days in advance</option>
                </select>
              </div>

              <div className="pt-2">
                <Button type="submit" isLoading={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  <span>Save Notification Rules</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 4: PRIVACY & THEME */}
        {activeTab === "privacy" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Privacy & Appearance</CardTitle>
              <CardDescription className="text-xs">
                Theme display options and account security privacy settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Theme Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Interface Theme
                </label>
                <div className="grid grid-cols-3 gap-3 max-w-md">
                  <button
                    type="button"
                    onClick={() => {
                      setTheme("light");
                      setSettings({ ...settings, theme: "light" });
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition-all ${
                      theme === "light"
                        ? "border-brand-600 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>Light</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTheme("dark");
                      setSettings({ ...settings, theme: "dark" });
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition-all ${
                      theme === "dark"
                        ? "border-brand-600 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Dark</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTheme("system");
                      setSettings({ ...settings, theme: "system" });
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold gap-1.5 transition-all ${
                      theme === "system"
                        ? "border-brand-600 bg-brand-50 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500/20"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              {/* Privacy Toggles */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 cursor-pointer">
                  <div>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                      Critical Security Alerts
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Alert you upon password changes, new device logins, or account modifications.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.securityAlerts}
                    onChange={(e) => setSettings({ ...settings, securityAlerts: e.target.checked })}
                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                  />
                </label>
              </div>

              <div className="pt-2">
                <Button type="submit" isLoading={isSaving} className="gap-2">
                  <Save className="w-4 h-4" />
                  <span>Save Privacy Settings</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* TAB 5: DATA MANAGEMENT */}
        {activeTab === "data" && (
          <div className="space-y-6">
            {/* Clear Personal Data Card */}
            <Card className="border-amber-200 dark:border-amber-900/50">
              <CardHeader>
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <Database className="w-5 h-5" />
                  <CardTitle className="text-base">Clear My Application Data</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Remove your documents, reminders, bills, expenses, vehicles, and subscriptions while keeping your login account active.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Use this option if you want a fresh start. Your uploaded files, recorded milestones, and custom records will be permanently deleted. Your profile, settings, and subscription tier will remain intact.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowClearModal(true)}
                  className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Clear My Personal Data...
                </Button>
              </CardContent>
            </Card>

            {/* Delete Account Card */}
            <Card className="border-rose-200 dark:border-rose-900/50">
              <CardHeader>
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                  <CardTitle className="text-base">Permanently Delete Account</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Permanently delete your account, authentication credentials, and all associated information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-rose-600/90 dark:text-rose-400/90">
                  Warning: This action is permanent and cannot be undone. You will be signed out immediately and all sessions revoked.
                </p>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => setShowDeleteModal(true)}
                  className="text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />
                  Delete My Account...
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 6: SUBSCRIPTION */}
        {activeTab === "subscription" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Subscription & Monetization</CardTitle>
                    <CardDescription className="text-xs">
                      Manage your active subscription plan, billing details, and payment receipts.
                    </CardDescription>
                  </div>
                  <Badge
                    variant={
                      currentSub.status === "active" && currentSub.plan !== "free"
                        ? "success"
                        : currentSub.status === "cancelled"
                        ? "danger"
                        : "outline"
                    }
                  >
                    {currentSub.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Subscription Details Grid */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Current Plan</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {currentSub.planName || (currentSub.plan === "family" ? "Family Circle Plus" : currentSub.plan === "premium" ? "Life Pro Premium" : "Free Starter")}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Status</span>
                    <span
                      className={`font-semibold capitalize flex items-center gap-1 ${
                        currentSub.status === "active"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : currentSub.status === "cancelled"
                          ? "text-rose-600 dark:text-rose-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {currentSub.status === "active" ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {currentSub.cancelAtPeriodEnd ? "Cancelling at period end" : currentSub.status}
                      </span>
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Billing Cycle</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                      {currentSub.billingCycle || currentSub.billingInterval || "Monthly"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Price</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {currentSub.amount && currentSub.amount > 0
                        ? formatRegionalCurrency(currentSub.amount, currentSub.currency || "USD")
                        : "Free"}
                      {currentSub.amount && currentSub.amount > 0 ? (currentSub.billingCycle === "yearly" ? "/yr" : "/mo") : ""}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Subscription Start Date</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {currentSub.startedAt
                        ? new Date(currentSub.startedAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Next Billing / Renewal Date</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {currentSub.currentPeriodEnd
                        ? new Date(currentSub.currentPeriodEnd).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "N/A (Free Tier)"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px] font-medium">Payment Provider</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300 capitalize flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                      {currentSub.provider === "stripe" ? "Stripe (Test Mode)" : currentSub.provider || "Stripe"}
                    </span>
                  </div>
                </div>

                {/* Subscription Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <Link href="/premium">
                    <Button type="button" variant="primary" className="gap-2 text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>{currentSub.plan === "free" ? "Upgrade to Pro or Family" : "Change Plan Tier"}</span>
                    </Button>
                  </Link>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleOpenBillingPortal}
                    isLoading={isOpeningPortal}
                    className="gap-2 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Manage Billing & Invoices</span>
                  </Button>

                  {currentSub.plan !== "free" && currentSub.status === "active" && !currentSub.cancelAtPeriodEnd && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCancelModal(true)}
                      className="gap-2 text-xs text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Subscription</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Transaction History */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Payment History & Invoices</CardTitle>
                    <CardDescription className="text-xs">
                      Historical payment receipts and billing confirmations.
                    </CardDescription>
                  </div>
                  <CreditCard className="w-4 h-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No billing transactions recorded yet. When you upgrade, your receipts will appear here.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Plan</th>
                          <th className="py-2.5 px-3">Amount</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Transaction ID</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-300">
                              {new Date(tx.paymentDate).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </td>
                            <td className="py-3 px-3 uppercase font-semibold text-slate-900 dark:text-white">
                              {tx.plan}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                              {formatRegionalCurrency(tx.amount, tx.currency)}
                            </td>
                            <td className="py-3 px-3">
                              {tx.status === "paid" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  PAID
                                </span>
                              ) : tx.status === "failed" ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                                  <XCircle className="w-3 h-3" />
                                  FAILED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                                  {tx.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-mono text-[10px] text-slate-400">
                              {tx.transactionId}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </form>

      {/* CLEAR DATA MODAL */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Clear Personal Data Confirmation
              </h3>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
              <p>The following personal records will be <strong>permanently deleted</strong>:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1">
                <li>All uploaded Documents and private files</li>
                <li>All Reminders and scheduled alerts</li>
                <li>All Expenses, Budgets, and Payment reminders</li>
                <li>All Vehicle maintenance and inspection records</li>
                <li>All Subscriptions and Important Dates</li>
              </ul>
              <p className="font-medium text-slate-700 dark:text-slate-200 pt-1">
                Your login account, email, and subscription will remain active.
              </p>
            </div>

            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                To confirm, type <span className="font-mono text-amber-600 dark:text-amber-400">CLEAR</span> below:
              </label>
              <Input
                type="text"
                placeholder="Type CLEAR"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                className="font-mono uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                disabled={isClearing}
                onClick={() => {
                  setShowClearModal(false);
                  setClearConfirmText("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={clearConfirmText !== "CLEAR" || isClearing}
                isLoading={isClearing}
                onClick={handleClearData}
              >
                Permanently Clear Records
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Delete My Account Permanently
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              This action is <strong>irreversible</strong>. Your profile, authentication credentials, and all recorded data will be permanently wiped. Active sessions will be terminated immediately.
            </p>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter Your Password:
                </label>
                <Input
                  type="password"
                  placeholder="Your current password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  To confirm, type <span className="font-mono text-rose-600 dark:text-rose-400">DELETE</span>:
                </label>
                <Input
                  type="text"
                  placeholder="Type DELETE"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText("");
                  setDeletePassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                isLoading={isDeleting}
                onClick={handleDeleteAccount}
              >
                Delete Account Forever
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL SUBSCRIPTION MODAL */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />
              <h3 className="text-base font-bold">
                Cancel {currentSub.planName || currentSub.plan.toUpperCase()} Subscription?
              </h3>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5">
              <p>
                We are sorry to see you go! If you cancel:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400 pl-1">
                <li>
                  Your premium features will remain active until{" "}
                  <strong>
                    {currentSub.currentPeriodEnd
                      ? new Date(currentSub.currentPeriodEnd).toLocaleDateString(undefined, {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "the end of your billing cycle"}
                  </strong>.
                </li>
                <li>You will not be charged again on your next renewal date.</li>
                <li>Your historical invoices and payment receipts will remain safely in your account.</li>
                <li>You can reactivate your subscription at any time.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                disabled={isCancellingSub}
                onClick={() => setShowCancelModal(false)}
              >
                Keep Subscription
              </Button>
              <Button
                type="button"
                variant="danger"
                isLoading={isCancellingSub}
                onClick={handleCancelSubscription}
              >
                Confirm Cancellation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
