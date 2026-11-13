import { getDashboardData } from "@/lib/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import { formatDate, formatCurrency, getStatusLabel } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const data = await getDashboardData();

  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/auth/signin");

  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  const businessIds = businesses.map((b) => b.id);

  const allObligations = await prisma.complianceObligation.findMany({
    where: { businessId: { in: businessIds }, deletedAt: null },
    include: { authority: true, business: { select: { legalName: true, tradingName: true } } },
    orderBy: { dueDate: "desc" },
  });

  const allPayments = await prisma.payment.findMany({
    where: { businessId: { in: businessIds } },
    include: { authority: true, business: { select: { legalName: true, tradingName: true } } },
    orderBy: { createdAt: "desc" },
  });

  const totalPayments = allPayments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Compliance overview and financial summary</p>
        </div>
        <p className="text-xs text-muted-foreground">Generated {formatDate(new Date())}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-blue-600">{data.overallScore}%</p>
            <p className="text-xs text-muted-foreground">Overall Compliance Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-emerald-600">{data.stats.completed}</p>
            <p className="text-xs text-muted-foreground">Obligations Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-red-600">{data.stats.overdue}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-3xl font-bold text-amber-600">{formatCurrency(totalPayments)}</p>
            <p className="text-xs text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>
      </div>

      {/* Compliance by Authority */}
      <Card>
        <CardHeader><CardTitle className="text-base">Compliance Score by Authority</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.authorityScores.map(({ authority, score, total, completed }) => {
              if (total === 0) return null;
              return (
                <div key={authority.id}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{authority.fullName ?? authority.name}</span>
                    <span className={`text-sm font-bold ${score !== null && score >= 90 ? "text-emerald-600" : score !== null && score >= 70 ? "text-amber-600" : "text-red-600"}`}>
                      {score !== null ? `${score}%` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${score !== null && score >= 90 ? "bg-emerald-500" : score !== null && score >= 70 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${score ?? 0}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{completed}/{total}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Obligations Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Obligations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.overdueObligations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No overdue obligations. Well done!</p>
            ) : (
              <div className="space-y-2">
                {data.overdueObligations.map((obl) => (
                  <div key={obl.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{obl.title}</p>
                      <p className="text-xs text-muted-foreground">{obl.authority.name} · {formatDate(obl.dueDate)}</p>
                    </div>
                    <Badge variant="danger" className="text-xs">Overdue</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allPayments.slice(0, 8).map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">{p.description}</p>
                    <p className="text-xs text-muted-foreground">{p.authority.name} · {formatDate(p.paidAt)}</p>
                  </div>
                  <p className="text-sm font-medium">{formatCurrency(Number(p.amount))}</p>
                </div>
              ))}
              {allPayments.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-2">+{allPayments.length - 8} more payments</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50/20">
        <CardContent className="p-4">
          <p className="text-xs text-amber-700">
            ⓘ ComplianceHub Zambia is an independent business compliance management platform and is not affiliated with or endorsed by ZRA, NAPSA, NHIMA or PACRA. All data is based on manually recorded information. This report should not be considered an official compliance certification.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
