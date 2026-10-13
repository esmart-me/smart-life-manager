import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { calculateWarrantyStatus } from "@/lib/inventory/status";
import { InventoryListClient } from "@/components/inventory/InventoryListClient";
import { Package } from "lucide-react";

export const metadata = {
  title: "Home Inventory & Warranty — Smart Life Manager",
  description: "Track home appliances, electronics, warranty status, serial numbers, and service history.",
};

export default async function InventoryPage() {
  const user = await requireUser();

  const items = await prisma.inventoryItem.findMany({
    where: {
      userId: user.id,
      isArchived: false,
    },
    include: {
      serviceLogs: {
        orderBy: { serviceDate: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let activeWarranties = 0;
  let expiringSoonWarranties = 0;
  let expiredWarranties = 0;
  const valuationByCurrency: Record<string, number> = {};

  const formattedItems = items.map((item) => {
    const warrantyInfo = calculateWarrantyStatus(item.warrantyExpiry, item.warrantyStart);
    if (warrantyInfo.status === "active") activeWarranties++;
    else if (warrantyInfo.status === "expiring_soon") expiringSoonWarranties++;
    else if (warrantyInfo.status === "expired") expiredWarranties++;

    if (item.purchasePrice && item.purchasePrice > 0) {
      const curr = item.currency || "USD";
      valuationByCurrency[curr] = (valuationByCurrency[curr] || 0) + item.purchasePrice;
    }

    return {
      ...item,
      warrantyStatus: warrantyInfo.status,
      daysUntilWarrantyExpiry: warrantyInfo.daysRemaining,
      warrantyLabel: warrantyInfo.label,
    };
  });

  const categories = Array.from(new Set(items.map((i) => i.category).filter(Boolean)));
  const locations = Array.from(new Set(items.map((i) => i.location).filter(Boolean))) as string[];

  const metrics = {
    totalCount: items.length,
    activeWarranties,
    expiringSoonWarranties,
    expiredWarranties,
    valuationByCurrency,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-theme-accent-subtle flex items-center justify-center text-theme-accent border border-theme-accent/20 shadow-theme-glow">
            <Package className="w-5 h-5 text-theme-accent" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-theme-text-primary">
              Home Inventory & Warranty
            </h1>
            <p className="text-xs sm:text-sm text-theme-text-muted">
              Organize household electronics, appliances, warranty expirations, serial numbers, and maintenance records.
            </p>
          </div>
        </div>
      </div>

      {/* Main Client Shell */}
      <InventoryListClient
        initialItems={formattedItems}
        initialMetrics={metrics}
        initialFilters={{ categories, locations }}
      />
    </div>
  );
}
