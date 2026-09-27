"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Moon,
  Laptop,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck } from "lucide-react";

interface SettingsFormProps {
  initialProfile: {
    firstName: string;
    lastName: string;
    displayName: string;
    phoneNumber: string;
    timezone: string;
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
}

export function SettingsForm({ initialProfile, initialSettings }: SettingsFormProps) {
  const { theme, setTheme } = useTheme();
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profile, setProfile] = useState(initialProfile);
  const [settings, setSettings] = useState(initialSettings);

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

      setSuccessMessage("Settings saved successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleThemeChange = (newTheme: "system" | "light" | "dark") => {
    setTheme(newTheme);
    setSettings((prev) => ({ ...prev, theme: newTheme }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {successMessage && (
        <AlertBanner
          type="success"
          title="Success"
          message={successMessage}
        />
      )}

      {errorMessage && (
        <AlertBanner
          type="error"
          title="Error"
          message={errorMessage}
        />
      )}

      {/* 1. Appearance / Theme */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance & Theme</CardTitle>
          <CardDescription>
            Select your visual preference. Supports system automatic detection.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "system", label: "System", icon: Laptop },
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
            ].map((item) => {
              const Icon = item.icon;
              const isSelected = (theme || settings.theme) === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleThemeChange(item.id as "system" | "light" | "dark")}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl border text-xs font-medium transition-all ${
                    isSelected
                      ? "border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 ring-2 ring-brand-500"
                      : "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <Icon className="w-5 h-5 mb-2" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 2. Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>
            Your personal details used for display and reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              value={profile.displayName}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={profile.phoneNumber}
              onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Preferred Currency
              </label>
              <select
                value={profile.currency}
                onChange={(e) => setProfile({ ...profile, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Timezone
              </label>
              <input
                type="text"
                value={profile.timezone}
                onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications & Alerts</CardTitle>
          <CardDescription>
            Configure how and when you receive reminders before due dates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Email Notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Receive upcoming expiry and payment reminders via email
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.emailNotifications}
              onChange={(e) =>
                setSettings({ ...settings, emailNotifications: e.target.checked })
              }
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Push Notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct browser and mobile device alert banners
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.pushNotifications}
              onChange={(e) =>
                setSettings({ ...settings, pushNotifications: e.target.checked })
              }
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Advance Reminder Window
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Number of days before an event to trigger primary alerts
              </p>
            </div>
            <select
              value={settings.reminderDaysBefore}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  reminderDaysBefore: Number(e.target.value),
                })
              }
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value={1}>1 Day before</option>
              <option value={3}>3 Days before</option>
              <option value={7}>7 Days before</option>
              <option value={14}>14 Days before</option>
              <option value={30}>30 Days before</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* 4. Security & Privacy Architecture */}
      <Card className="border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle>Security Architecture</CardTitle>
            </div>
            <Badge variant="success">Active Isolation</Badge>
          </div>
          <CardDescription>
            Your data is bound to your user record and isolated from other tenants
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p>• <strong>Strict Server Scoping:</strong> All database queries are filtered with the authenticated userId at the repository layer.</p>
          <p>• <strong>HttpOnly Session Storage:</strong> Authentication tokens are stored in secure, encrypted HTTP cookies with CSRF defense.</p>
          <p>• <strong>Private Document Vault:</strong> Prepared storage architecture keeps files outside the public web server directory.</p>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end pt-2">
        <Button type="submit" isLoading={isSaving} className="gap-2">
          <Save className="w-4 h-4" />
          <span>Save Preferences</span>
        </Button>
      </div>
    </form>
  );
}
