"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Sparkles, AlertCircle, X, ShieldCheck } from "lucide-react";

const HEARTBEAT_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = "slm_last_entitlement_heartbeat";
const DISMISS_KEY = "slm_expired_banner_dismissed_until";

export function EntitlementHeartbeat() {
  const isCheckingRef = useRef(false);
  const [showExpiredBanner, setShowExpiredBanner] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const performHeartbeat = async () => {
      // Prevent concurrent duplicate requests
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const res = await fetch("/api/central/handshake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deviceId: "desktop_app",
            os: "windows",
            appVersion: "1.0.0",
            loginMethod: "session_heartbeat",
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const now = Date.now();
          localStorage.setItem(STORAGE_KEY, String(now));

          // If subscription has expired, check if banner should be displayed
          if (data.success && data.entitlement?.status === "expired") {
            const dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || "0", 10);
            if (now > dismissedUntil) {
              setShowExpiredBanner(true);
            }
          } else {
            setShowExpiredBanner(false);
          }
        }
      } catch (err) {
        // Network failure gracefully handled; offline grace policy continues to protect user
        console.debug("[Entitlement Heartbeat] Network verification skipped, maintaining offline entitlement.");
      } finally {
        isCheckingRef.current = false;
      }
    };

    const lastCheckStr = localStorage.getItem(STORAGE_KEY);
    const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) : 0;
    const now = Date.now();

    // If never checked, or if >= 24 hours elapsed since last check: execute heartbeat
    if (!lastCheck || now - lastCheck >= HEARTBEAT_INTERVAL_MS) {
      performHeartbeat();
      // Next heartbeat in 24 hours
      timer = setTimeout(performHeartbeat, HEARTBEAT_INTERVAL_MS);
    } else {
      // Schedule timer for remaining duration of current 24-hour cycle
      const remainingMs = Math.max(60000, HEARTBEAT_INTERVAL_MS - (now - lastCheck));
      timer = setTimeout(performHeartbeat, remainingMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    setShowExpiredBanner(false);
    // Dismiss banner for 24 hours so it does not annoy the user
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 60 * 60 * 1000));
  };

  if (!showExpiredBanner) {
    return null;
  }

  return (
    <div className="bg-amber-500/10 dark:bg-amber-400/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 transition-all backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span>
          Your Premium subscription has expired. Your existing data remains safe and available. Renew Premium to continue using Premium features.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/premium"
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 text-[11px] font-semibold transition-colors"
        >
          <Sparkles className="w-3 h-3" />
          <span>Renew Premium</span>
        </Link>
        <button
          onClick={handleDismiss}
          className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-white rounded"
          title="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
