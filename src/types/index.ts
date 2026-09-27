// Smart Life Manager - Core TypeScript Types & DTOs

export type UserRole = "user" | "admin";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}

export interface AuthTokenPayload {
  sub: string; // userId
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Standardized API response contract for reliable frontend consumption
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// Navigation structure
export interface NavItem {
  label: string;
  href: string;
  iconName: string;
  badge?: string | number;
  exact?: boolean;
}

// Quick action items for dashboard shell
export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  iconName: string;
  badge?: string;
  colorVariant: "primary" | "emerald" | "amber" | "sky";
}

// Dashboard Attention & Upcoming item types
export interface AttentionItem {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string;
  urgency: "urgent" | "high" | "medium";
  category: "document" | "payment" | "reminder" | "vehicle";
  actionHref: string;
}

export interface UpcomingItem {
  id: string;
  title: string;
  subtitle?: string;
  eventDate: string;
  category: string;
  actionHref?: string;
}

// User Settings DTO
export interface UserSettingsDTO {
  theme: "system" | "light" | "dark";
  emailNotifications: boolean;
  pushNotifications: boolean;
  reminderDaysBefore: number;
  weeklyDigest: boolean;
  securityAlerts: boolean;
}

export interface UserProfileDTO {
  firstName: string;
  lastName: string;
  displayName: string;
  phoneNumber?: string;
  timezone: string;
  currency: string;
  locale: string;
}
