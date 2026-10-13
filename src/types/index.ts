// Smart Life Manager - Core TypeScript Types & DTOs

export type UserRole = "customer" | "user" | "admin" | "super_admin";

export interface SessionUser {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  country?: string | null;
  region?: string | null;
  currency?: string | null;
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
  dailyBriefingEnabled?: boolean;
  dailyBriefingTime?: string;
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

// Daily Life Planner Task / Appointment DTO
export interface PlannerTaskDTO {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  itemType: "task" | "appointment";
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  location?: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  category: "work" | "personal" | "health" | "family" | "errand" | "appointment";
  isCompleted: boolean;
  completedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Home Inventory & Warranty DTO
export interface InventoryItemDTO {
  id: string;
  userId: string;
  name: string;
  category: string;
  brand?: string | null;
  modelNumber?: string | null;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  currency: string;
  retailer?: string | null;
  location?: string | null;
  warrantyStart?: string | null;
  warrantyExpiry?: string | null;
  warrantyNotes?: string | null;
  receiptUrl?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  serviceLogs?: InventoryServiceLogDTO[];
  warrantyStatus?: "active" | "expiring_soon" | "expired" | "unknown";
  daysUntilWarrantyExpiry?: number | null;
}

export interface InventoryServiceLogDTO {
  id: string;
  inventoryItemId: string;
  userId: string;
  serviceDate: string;
  description: string;
  provider?: string | null;
  cost?: number | null;
  currency: string;
  nextServiceDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
