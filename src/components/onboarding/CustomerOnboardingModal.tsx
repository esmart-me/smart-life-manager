"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  FileText,
  Car,
  Bell,
  Users,
  Calendar,
  DollarSign,
  CreditCard,
  Bot,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  Check,
} from "lucide-react";

interface OnboardingStep {
  id: number;
  badge: string;
  title: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  badgeColor: string;
  highlights: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 1,
    badge: "Welcome",
    title: "Welcome to Smart Life Manager",
    description:
      "Your private, secure, all-in-one personal operations center. Organize documents, track vehicles, manage finances, and stay ahead of every deadline in one unified dashboard.",
    icon: Sparkles,
    iconBg: "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300",
    highlights: [
      "100% private, isolated personal data storage",
      "Unified timeline of renewals, bills, and milestones",
      "Accessible anywhere across desktop and mobile devices",
    ],
  },
  {
    id: 2,
    badge: "Documents",
    title: "Secure Document Management",
    description:
      "Store, organize, and safeguard vital family and personal records with automated expiry tracking and renewal countdowns.",
    icon: FileText,
    iconBg: "bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300",
    highlights: [
      "Passports, National IDs, Driving Licenses & Contracts",
      "Automated advance alerts before documents expire",
      "Instant search, category tagging, and file verification",
    ],
  },
  {
    id: 3,
    badge: "Vehicles",
    title: "Complete Vehicle Fleet Tracking",
    description:
      "Manage all personal and family vehicles effortlessly. Keep track of insurance policies, registration renewals, maintenance logs, and inspection dates.",
    icon: Car,
    iconBg: "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
    highlights: [
      "Registration & road tax expiration alerts",
      "Insurance policy numbers, providers, and validity periods",
      "Service history, mileage tracking, and maintenance schedules",
    ],
  },
  {
    id: 4,
    badge: "Reminders",
    title: "Intelligent Reminders & Tasks",
    description:
      "Never miss a critical task, deadline, or appointment again with one-time, daily, weekly, monthly, and yearly recurring reminders.",
    icon: Bell,
    iconBg: "bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800",
    iconColor: "text-amber-600 dark:text-amber-400",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300",
    highlights: [
      "Configurable advance reminder lead times (1, 3, 7, 14 days)",
      "Recurring scheduling engine for repetitive life tasks",
      "One-click task completion and snooze controls",
    ],
  },
  {
    id: 5,
    badge: "Family",
    title: "Family Member Directory",
    description:
      "Organize health information, emergency contacts, vital documents, and relations for every member of your family in one centralized place.",
    icon: Users,
    iconBg: "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800",
    iconColor: "text-rose-600 dark:text-rose-400",
    badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300",
    highlights: [
      "Spouse, children, parents, and dependent profiles",
      "Emergency contact information and relationship tags",
      "Associated personal documents and important dates per member",
    ],
  },
  {
    id: 6,
    badge: "Milestones",
    title: "Important Dates & Anniversaries",
    description:
      "Keep track of life milestones, birthdays, anniversaries, visa renewals, and passport deadlines with automated annual reminders.",
    icon: Calendar,
    iconBg: "bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600 dark:text-purple-400",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300",
    highlights: [
      "Annual countdowns for birthdays and wedding anniversaries",
      "Document validity and immigration visa renewal milestones",
      "Advance notifications to prepare gifts and celebrations",
    ],
  },
  {
    id: 7,
    badge: "Finance",
    title: "Personal Ledger & Financial Records",
    description:
      "Monitor personal cash flow, expense categories, payments, and budgets with real-time multi-currency support.",
    icon: DollarSign,
    iconBg: "bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800",
    iconColor: "text-teal-600 dark:text-teal-400",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300",
    highlights: [
      "Categorized expenses (Housing, Utilities, Groceries, Travel)",
      "Income logging and month-over-month financial trends",
      "Multi-currency support matching your localized region",
    ],
  },
  {
    id: 8,
    badge: "Subscriptions",
    title: "Subscription Tracking & Monitoring",
    description:
      "Audit your recurring digital and physical subscriptions. Track billing frequencies, renewal dates, and eliminate unused recurring costs.",
    icon: CreditCard,
    iconBg: "bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-800",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300",
    highlights: [
      "Monthly and annual billing cycle tracking",
      "Advance renewal warnings before credit cards are charged",
      "Estimated monthly and annual commitment calculation",
    ],
  },
  {
    id: 9,
    badge: "AI Assistant",
    title: "Private AI Assistant",
    description:
      "Your intelligent companion powered by Google Gemini. Ask natural language questions about your records, upcoming bills, and documents with 100% private data isolation.",
    icon: Bot,
    iconBg: "bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-800",
    iconColor: "text-violet-600 dark:text-violet-400",
    badgeColor: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300",
    highlights: [
      "Grounded exclusively in your authenticated personal data",
      "Zero-mock, strictly read-only security architecture",
      "Available anywhere on your screen via the floating AI button",
    ],
  },
  {
    id: 10,
    badge: "Alerts",
    title: "Smart Notification & Reminder Engine",
    description:
      "Stay in control with intelligent, prioritized alerts. Customize quiet hours, notification channels, and priority levels so you're never overwhelmed.",
    icon: ShieldCheck,
    iconBg: "bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-800",
    iconColor: "text-green-600 dark:text-green-400",
    badgeColor: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300",
    highlights: [
      "4 priority levels: Critical, High, Medium, Low",
      "Configurable Quiet Hours with emergency critical override",
      "Sound effects, email notifications, and in-app alert badges",
    ],
  },
];

export function CustomerOnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // 0-indexed (0 to 9)
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Check onboarding status on mount
  useEffect(() => {
    let isMounted = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/user/onboarding");
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (isMounted) {
          if (data?.success && data.data) {
            if (!data.data.onboardingCompleted) {
              const savedStep = data.data.onboardingStep || 1;
              const stepIdx = Math.max(0, Math.min(ONBOARDING_STEPS.length - 1, savedStep - 1));
              setCurrentStepIndex(stepIdx);
              setIsOpen(true);
            }
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch onboarding status:", err);
        if (isMounted) setLoading(false);
      }
    }

    checkStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  const saveProgress = useCallback(async (stepNumber: number, completed = false) => {
    try {
      await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: stepNumber, completed }),
      });
    } catch (err) {
      console.error("Failed to save onboarding progress:", err);
    }
  }, []);

  const handleNext = async () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      saveProgress(nextIndex + 1, false);
    } else {
      await handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      saveProgress(prevIndex + 1, false);
    }
  };

  const handleSkip = async () => {
    setSaving(true);
    await saveProgress(ONBOARDING_STEPS.length, true);
    setIsOpen(false);
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    await saveProgress(ONBOARDING_STEPS.length, true);
    setIsOpen(false);
    setSaving(false);
  };

  // Keyboard navigation (Escape to dismiss/skip, ArrowRight to next, ArrowLeft to back)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handleBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (loading || !isOpen) {
    return null;
  }

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const StepIcon = currentStep.icon;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === ONBOARDING_STEPS.length - 1;
  const progressPercent = ((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-step-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center space-x-2">
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${currentStep.badgeColor}`}
            >
              {currentStep.badge}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
            </span>
          </div>

          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Skip tour"
            aria-label="Skip tour"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {/* Main Visual Icon Card */}
          <div className="flex items-center space-x-4 mb-5">
            <div
              className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm shrink-0 ${currentStep.iconBg} ${currentStep.iconColor}`}
            >
              <StepIcon className="w-7 h-7" />
            </div>
            <div>
              <h2
                id="onboarding-step-title"
                className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight"
              >
                {currentStep.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Smart Life Manager Feature Tour
              </p>
            </div>
          </div>

          {/* Body Description */}
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
            {currentStep.description}
          </p>

          {/* Feature Highlights Card */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 space-y-2.5 mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Key Capabilities
            </p>
            {currentStep.highlights.map((highlight, idx) => (
              <div key={idx} className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                  {highlight}
                </span>
              </div>
            ))}
          </div>

          {/* Dot navigation indicators */}
          <div className="flex items-center justify-center space-x-1.5 pt-4">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStepIndex(idx);
                  saveProgress(idx + 1, false);
                }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? "w-6 bg-indigo-600 dark:bg-indigo-400"
                    : idx < currentStepIndex
                    ? "w-2 bg-slate-300 dark:bg-slate-600"
                    : "w-2 bg-slate-200 dark:bg-slate-700"
                }`}
                title={`Go to step ${idx + 1}: ${step.title}`}
                aria-label={`Step ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            {!isFirstStep ? (
              <button
                onClick={handleBack}
                disabled={saving}
                className="inline-flex items-center space-x-1 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <button
                onClick={handleSkip}
                disabled={saving}
                className="text-xs sm:text-sm font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Skip Tour
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {!isLastStep && (
              <button
                onClick={handleSkip}
                disabled={saving}
                className="hidden sm:inline-block px-3 py-2 text-xs sm:text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Skip
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={saving}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-white shadow-sm transition-all duration-200 ${
                isLastStep
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 ring-2 ring-emerald-500/20"
                  : "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              }`}
            >
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Get Started</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
