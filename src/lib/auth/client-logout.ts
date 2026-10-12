// src/lib/auth/client-logout.ts
// Centralized customer logout helper that cleans both server cookies and desktop persisted sessions.

export async function performCustomerLogout(): Promise<void> {
  try {
    if (typeof window !== "undefined" && (window as any).desktopAPI?.clearPersistedSession) {
      await (window as any).desktopAPI.clearPersistedSession();
    }
  } catch (err) {
    console.warn("[Logout] Failed to clear desktop persisted session:", err);
  }

  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (err) {
    console.warn("[Logout] Failed to post logout to server:", err);
  }

  window.location.href = "/login";
}
