"use client";

import { useState } from "react";
import { User, Mail, DollarSign, Globe, Bell, Save, CheckCircle2, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { AlertBanner } from "@/components/ui/AlertBanner";
import { Badge } from "@/components/ui/Badge";

interface ProfileFormProps {
  initialData: {
    email: string;
    role: string;
    createdAt: string;
    firstName: string;
    lastName: string;
    displayName: string;
    phoneNumber: string;
    currency: string;
    timezone: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
    reminderDaysBefore: number;
  };
}

export function ProfileForm({ initialData }: ProfileFormProps) {
  const [formData, setFormData] = useState(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            displayName: formData.displayName,
            phoneNumber: formData.phoneNumber,
            currency: formData.currency,
            timezone: formData.timezone,
          },
          settings: {
            emailNotifications: formData.emailNotifications,
            pushNotifications: formData.pushNotifications,
            reminderDaysBefore: Number(formData.reminderDaysBefore) || 3,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "We couldn't save your profile changes. Please try again.");
      }

      setSuccessMessage("Profile updated successfully.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "We couldn't save your profile changes. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          title="Update Failed"
          message={errorMessage}
        />
      )}

      {/* 1. Personal Identity & Email */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Personal Details</CardTitle>
              <CardDescription>
                Manage your name and account identity
              </CardDescription>
            </div>
            <Badge variant="success">Active Account</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="e.g. Alex"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <Input
              label="Last Name"
              placeholder="e.g. Morgan"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Display Name"
              placeholder="e.g. Alex Morgan"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
            />
            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
            />
          </div>

          {/* Email Address - Protected Read-Only with Security Note */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
              Account Email
            </label>
            <div className="relative">
              <input
                type="email"
                disabled
                value={formData.email}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 cursor-not-allowed select-none"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Your email is your verified login identity and cannot be edited directly without security verification.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 2. Localization & Preferences (Currency & Timezone) */}
      <Card>
        <CardHeader>
          <CardTitle>Regional Preferences</CardTitle>
          <CardDescription>
            Configure your active currency and time zone for upcoming expiries and reminders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Default Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="USD">USD ($) - US Dollar</option>
                <option value="EUR">EUR (€) - Euro</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
                <option value="AED">AED (د.إ) - UAE Dirham</option>
                <option value="SGD">SGD ($) - Singapore Dollar</option>
                <option value="JPY">JPY (¥) - Japanese Yen</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Time Zone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">America/New_York (Eastern Time)</option>
                <option value="America/Chicago">America/Chicago (Central Time)</option>
                <option value="America/Denver">America/Denver (Mountain Time)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (Pacific Time)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Choose how you would like to be alerted before important life events and expiry dates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Email Notifications
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Send expiry warnings and payment reminders to {formData.email}
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.emailNotifications}
              onChange={(e) =>
                setFormData({ ...formData, emailNotifications: e.target.checked })
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
                Show browser and on-device popup notifications
              </p>
            </div>
            <input
              type="checkbox"
              checked={formData.pushNotifications}
              onChange={(e) =>
                setFormData({ ...formData, pushNotifications: e.target.checked })
              }
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-slate-300"
            />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Default Alert Window
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                How many days before a deadline should Smart Life Manager alert you?
              </p>
            </div>
            <select
              value={formData.reminderDaysBefore}
              onChange={(e) =>
                setFormData({
                  ...formData,
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

      {/* Action Buttons */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          isLoading={isSaving}
          className="gap-2 px-6"
        >
          <Save className="w-4 h-4" />
          <span>Save Profile</span>
        </Button>
      </div>
    </form>
  );
}
