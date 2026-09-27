import { prisma } from "@/lib/db/prisma";
import { AuditLogClient, AuditLogDTO } from "@/components/admin/AuditLogClient";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  await requireAdmin();
  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const auditDTOs: AuditLogDTO[] = logs.map((l) => ({
    id: l.id,
    adminId: l.adminId,
    adminEmail: l.adminEmail,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    details: l.details,
    ipAddress: l.ipAddress,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Security & Admin Audit Trail
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event log tracking administrative logins, regional pricing updates, and subscription overrides.
        </p>
      </div>

      <AuditLogClient initialLogs={auditDTOs} />
    </div>
  );
}
