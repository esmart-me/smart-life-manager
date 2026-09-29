// public/sw.js
// Smart Life Manager Service Worker - Web Push & Notification Routing Engine

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// 1. Receive Push Events from Server
self.addEventListener("push", (event) => {
  let data = {
    title: "Smart Life Manager",
    body: "You have a new life reminder or update.",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-72x72.png",
    data: { url: "/reminders" },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        ...data,
        ...parsed,
        data: {
          ...data.data,
          ...(parsed.data || {}),
          url: parsed.data?.url || parsed.url || "/reminders",
        },
      };
    } catch {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    tag: data.tag || `slm-notif-${Date.now()}`,
    data: data.data || { url: "/reminders" },
    vibrate: [100, 50, 100],
    requireInteraction: data.priority === "critical",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// 2. Handle Notification Click Events & Route to Relevant Page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/reminders";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, navigate and focus it
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Otherwise, open a new window directly to the target record URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
