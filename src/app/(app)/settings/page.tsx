import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Building2, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id },
    include: { organization: true },
  });
  if (!membership) redirect("/auth/signin");

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: membership.organizationId },
    include: { user: { select: { name: true, email: true, createdAt: true } } },
  });

  const authorities = await prisma.authority.findMany({ orderBy: { sortOrder: "asc" } });
  const requirements = await prisma.complianceRequirement.findMany({
    include: { authority: true },
    orderBy: { authority: { sortOrder: "asc" } },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Organisation and system configuration</p>
      </div>

      {/* Organisation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organisation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Name</span>
            <span className="text-sm font-medium">{membership.organization.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Plan</span>
            <Badge variant="secondary">{membership.organization.plan}</Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Your role</span>
            <Badge variant="info">{membership.role.replace(/_/g, " ")}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{m.user.name ?? "Unknown"}</p>
                  <p className="text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                <Badge variant="secondary">{m.role.replace(/_/g, " ")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Authorities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Configured Authorities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {authorities.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{a.fullName ?? a.name}</p>
                  <p className="text-xs text-muted-foreground">{requirements.filter((r) => r.authorityId === a.id).length} requirements configured</p>
                </div>
                <Badge variant={a.active ? "success" : "secondary"}>{a.active ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {requirements.map((r) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">{r.authority.name} · {r.frequency} · Due day {r.defaultDueDayOfMonth ?? "N/A"}</p>
                </div>
                <Badge variant={r.active ? "success" : "secondary"}>{r.frequency}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
