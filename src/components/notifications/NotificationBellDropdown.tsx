"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  AlertCircle,
  AlertTriangle,
  Info,
  Calendar,
  Car,
  FileText,
  CreditCard,
  Repeat,
  Settings,
  RefreshCw,
} from "lucide-react";
import { playNotificationSound } from "@/lib/notifications/sound";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "reminder" | "document" | "vehicle" | "payment" | "subscription" | "date" | "general";
  linkUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBellDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "critical">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const list: NotificationItem[] = json.data.notifications || [];
          const unread: number = json.data.unreadCount || 0;
          const critical: number = json.data.criticalCount || 0;

          // Sound check: if new unread notifications arrived while user is active
          if (isBackground && unread > prevCountRef.current) {
            const hasCritical = list.some((n) => !n.isRead && n.priority === "critical");
            playNotificationSound(hasCritical ? "critical" : "medium");
          }
          prevCountRef.current = unread;

          setNotifications(list);
          setUnreadCount(unread);
          setCriticalCount(critical);
        }
      }
    } catch (err) {
      console.error("[NotificationBell] Fetch error:", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, []);

  // Initial load and periodic refresh every 45 seconds
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(true);
    }, 45000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
        const item = notifications.find((n) => n.id === id);
        if (item?.priority === "critical") {
          setCriticalCount((c) => Math.max(0, c - 1));
        }
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
        setUnreadCount(0);
        setCriticalCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Delete notification
  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        const item = notifications.find((n) => n.id === id);
        if (item && !item.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
          if (item.priority === "critical") {
            setCriticalCount((c) => Math.max(0, c - 1));
          }
        }
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  };

  // Click on a notification item to navigate and mark read
  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      handleMarkAsRead(item.id);
    }
    setIsOpen(false);
    if (item.linkUrl) {
      router.push(item.linkUrl);
    }
  };

  // Filter items based on active tab
  const filteredNotifications = notifications.filter((item) => {
    if (activeTab === "unread") return !item.isRead;
    if (activeTab === "critical") return item.priority === "critical";
    return true;
  });

  // Relative time helper
  const getRelativeTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  };

  // Priority visual elements
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 dark:bg-rose-400" />
            CRITICAL
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            HIGH
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            MED
          </span>
        );
      case "low":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            LOW
          </span>
        );
    }
  };

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "document":
        return <FileText className="w-3.5 h-3.5 text-blue-500" />;
      case "vehicle":
        return <Car className="w-3.5 h-3.5 text-emerald-500" />;
      case "payment":
        return <CreditCard className="w-3.5 h-3.5 text-purple-500" />;
      case "subscription":
        return <Repeat className="w-3.5 h-3.5 text-indigo-500" />;
      case "date":
        return <Calendar className="w-3.5 h-3.5 text-pink-500" />;
      case "reminder":
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications(true);
        }}
        aria-label="View notifications"
        aria-expanded={isOpen}
        title="Notifications"
        className={`relative p-2 rounded-lg transition-all duration-200 ${
          isOpen
            ? "bg-slate-100 dark:bg-slate-800 text-brand-600 dark:text-brand-400"
            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
        } ${
          criticalCount > 0
            ? "ring-2 ring-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)]"
            : ""
        }`}
      >
        <Bell className="w-5 h-5" />

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-xs ${
              criticalCount > 0
                ? "bg-rose-600 animate-pulse ring-2 ring-white dark:ring-slate-900"
                : "bg-brand-600 ring-2 ring-white dark:ring-slate-900"
            }`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute inset-x-3 sm:inset-x-auto top-18 sm:top-full sm:right-0 sm:mt-2 sm:w-96 max-h-[85vh] sm:max-h-[560px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/90 backdrop-blur-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-800">
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fetchNotifications(false)}
                title="Refresh notifications"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={isMarkingAll}
                  title="Mark all as read"
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}

              <Link
                href="/settings#notifications"
                onClick={() => setIsOpen(false)}
                title="Notification Settings"
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="grid grid-cols-3 px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-xs font-medium gap-1 bg-slate-50/40 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className={`py-1 rounded-md transition-colors text-center ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unread")}
              className={`py-1 rounded-md transition-colors text-center flex items-center justify-center gap-1 ${
                activeTab === "unread"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("critical")}
              className={`py-1 rounded-md transition-colors text-center flex items-center justify-center gap-1 ${
                activeTab === "critical"
                  ? "bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 font-semibold shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              }`}
            >
              <span>Critical</span>
              {criticalCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          </div>

          {/* Notification List Scroll Area */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[380px]">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                  <Bell className="w-6 h-6 stroke-1 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {activeTab === "unread"
                    ? "No unread notifications"
                    : activeTab === "critical"
                    ? "No critical alerts"
                    : "You're all caught up!"}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[220px]">
                  Upcoming reminders, payment due dates, and expiry alerts will appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const isCritical = item.priority === "critical";

                return (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`p-3 transition-colors cursor-pointer group flex items-start gap-3 relative ${
                      !item.isRead
                        ? isCritical
                          ? "bg-rose-50/50 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          : "bg-brand-50/30 dark:bg-brand-950/20 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    }`}
                  >
                    {/* Unread Accent Bar */}
                    {!item.isRead && (
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isCritical ? "bg-rose-500" : "bg-brand-500"
                        }`}
                      />
                    )}

                    {/* Icon container */}
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isCritical
                          ? "bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {getPriorityBadge(item.priority)}
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                          {getRelativeTime(item.createdAt)}
                        </span>
                      </div>

                      <h4
                        className={`text-xs font-semibold leading-tight line-clamp-1 ${
                          !item.isRead
                            ? isCritical
                              ? "text-rose-900 dark:text-rose-200"
                              : "text-slate-900 dark:text-white"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {item.message}
                      </p>

                      {item.linkUrl && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] text-brand-600 dark:text-brand-400 font-medium group-hover:underline">
                          <span>View record</span>
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Item Actions */}
                    <div className="flex flex-col items-end gap-1 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item.id, e)}
                          title="Mark as read"
                          className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNotification(item.id, e)}
                        title="Dismiss notification"
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-white dark:hover:bg-slate-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 text-center">
            <Link
              href="/reminders"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              View Reminders & Tasks &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
