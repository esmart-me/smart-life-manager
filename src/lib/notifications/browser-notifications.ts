// src/lib/notifications/browser-notifications.ts
// Client-side browser Notification API manager.
// Handles permission requests, state persistence, and dispatching native browser notifications.
// Respects browser autoplay/interaction requirements and does NOT request permission silently.

const PERMISSION_ASKED_KEY = "slm_notif_permission_asked";
const SOUND_ENABLED_KEY = "slm_notif_sound_enabled";

/**
 * Returns the current browser notification permission state.
 * Safe to call during SSR — returns "unavailable" on server.
 */
export function getBrowserNotificationPermission(): NotificationPermission | "unavailable" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";
  return Notification.permission;
}

/**
 * Returns true if browser notifications are supported and granted.
 */
export function isBrowserNotificationGranted(): boolean {
  return getBrowserNotificationPermission() === "granted";
}

/**
 * Returns true if permission has previously been asked (regardless of outcome).
 * Used to avoid repeatedly prompting the user.
 */
export function hasAskedPermission(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PERMISSION_ASKED_KEY) === "true";
}

/**
 * Requests browser notification permission from the user.
 * Only calls Notification.requestPermission() once per session life cycle.
 * Must be called from a user-gesture handler (click, etc.) to comply with browser policies.
 * 
 * @returns The resulting permission state
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission | "unavailable"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unavailable";

  // Mark that we asked, regardless of outcome (prevent re-prompting)
  localStorage.setItem(PERMISSION_ASKED_KEY, "true");

  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return "denied";
  }
}

/**
 * Dispatches a native browser notification if permission is granted.
 * Includes click-to-focus behaviour and optional sound (controlled by user setting).
 */
export function showBrowserNotification(options: {
  title: string;
  body: string;
  tag?: string;
  priority?: string;
  linkUrl?: string;
  icon?: string;
}): Notification | null {
  if (!isBrowserNotificationGranted()) return null;
  if (typeof window === "undefined") return null;

  try {
    const notif = new Notification(options.title, {
      body: options.body,
      tag: options.tag || `slm-${Date.now()}`,
      icon: options.icon || "/favicon.ico",
      badge: options.icon || "/favicon.ico",
      requireInteraction: options.priority === "critical" || options.priority === "urgent",
      silent: !getSoundEnabled(), // Respect user sound setting
    });

    notif.onclick = () => {
      window.focus();
      if (options.linkUrl) {
        window.location.href = options.linkUrl;
      }
      notif.close();
    };

    // Auto-close non-critical notifications after 8 seconds
    if (options.priority !== "critical" && options.priority !== "urgent") {
      setTimeout(() => {
        try { notif.close(); } catch { /* ignore */ }
      }, 8000);
    }

    return notif;
  } catch (err) {
    console.debug("[BrowserNotification] Failed to show notification:", err);
    return null;
  }
}

/**
 * Gets current sound enabled state from localStorage.
 * Defaults to true if not set.
 */
export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(SOUND_ENABLED_KEY);
  return val === null ? true : val === "true";
}

/**
 * Sets the sound enabled state in localStorage.
 */
export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
}
