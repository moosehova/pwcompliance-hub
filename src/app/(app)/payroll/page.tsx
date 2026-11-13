import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, AlertCircle } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

export default async function PayrollPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/auth/signin");

  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  const businessIds = businesses.map((b) => b.id);

  const payrolls = await prisma.payroll.findMany({
    where: { businessId: { in: businessIds } },
    include: {
      business: { select: { legalName: true, tradingName: true } },
      _count: { select: { items: true } },
    },
    orderBy: [{ periodStart: "desc" }],
    take: 20,
  });

  const taxRules = await prisma.taxRule.findMany({ where: { active: true }, take: 3 });
  const contributionRules = await prisma.contributionRule.findMany({ where: { active: true }, take: 5 });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-muted-foreground">Payroll processing and statutory calculation support</p>
        </div>
        <Link href="/payroll/new">
          <Button>
            <Plus className="h-4 w-4" />
            New Payroll Run
          </Button>
        </Link>
      </div>

      {/* Rate Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>Important:</strong> Statutory rates configured in this system (PAYE brackets, NAPSA/NHIMA rates) are for reference only.
          Always verify current rates with ZRA, NAPSA and NHIMA before processing payroll for filing or payment.
        </p>
      </div>

      {/* Configured Rates */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Configured Tax Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {taxRules.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{r.name}</p>
                  <Badge variant="outline">{r.taxType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Effective from {formatDate(r.effectiveFrom)}
                  {r.verifiedAt ? ` · Verified ${formatDate(r.verifiedAt)}` : ""}
                </p>
              </div>
            ))}
            {taxRules.length === 0 && <p className="text-sm text-muted-foreground">No tax rules configured.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Contribution Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {contributionRules.map((r) => (
              <div key={r.id} className="p-3 rounded-lg border">
                <div className="flex justify-between">
                  <p className="text-sm font-medium">{r.name}</p>
                  <Badge variant="outline">{r.contributionType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Employee: {((Number(r.employeeRate) ?? 0) * 100).toFixed(1)}% · Employer: {((Number(r.employerRate) ?? 0) * 100).toFixed(1)}%
                  {r.ceiling ? ` · Ceiling: ${formatCurrency(Number(r.ceiling))}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Payroll History */}
      <Card>
        <CardHeader><CardTitle className="text-base">Payroll Runs</CardTitle></CardHeader>
        <CardContent>
          {payrolls.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payroll runs yet.</p>
              <Link href="/payroll/new" className="mt-4">
                <Button>Start First Payroll Run</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {payrolls.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{p.periodLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.business.tradingName ?? p.business.legalName} · {p._count.items} employees
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(Number(p.totalNet))}</p>
                      <p className="text-xs text-muted-foreground">Net payroll</p>
                    </div>
                    <Badge variant={p.status === "PAID" ? "success" : p.status === "PROCESSED" ? "info" : "secondary"}>
                      {p.status}
                    </Badge>
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
