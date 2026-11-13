import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";
import { formatDateTime } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "success",
  UPDATE: "info",
  UPDATE_STATUS: "info",
  DELETE: "danger",
  SUBMIT: "purple",
  RECORD_PAYMENT: "success",
  GENERATE: "info",
};

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/auth/signin");

  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  const businessIds = businesses.map((b) => b.id);

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { businessId: { in: businessIds } },
        { userId: session.user.id },
      ],
    },
    include: {
      user: { select: { name: true, email: true } },
      business: { select: { legalName: true, tradingName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">Complete history of all actions taken in the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {logs.length} audit entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/20 border-b last:border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={(ACTION_COLORS[log.action] ?? "secondary") as never} className="text-xs">
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-sm font-medium">{log.description ?? `${log.action} on ${log.entity}`}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {log.user?.name ?? log.user?.email ?? "System"}
                      {log.business ? ` · ${log.business.tradingName ?? log.business.legalName}` : ""}
                      {" · "}{formatDateTime(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
