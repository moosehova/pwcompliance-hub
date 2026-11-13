import { getObligations } from "@/lib/actions/compliance";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getObligationStatusColor, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function NapsaPage() {
  const obligations = await getObligations({ authorityCode: "NAPSA" });
  const overdue = obligations.filter((o) => o.computedStatus === "OVERDUE");
  const completed = obligations.filter((o) => ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus));
  const score = obligations.length > 0 ? Math.round((completed.length / obligations.length) * 100) : 100;

  const contributionRules = await prisma.contributionRule.findMany({
    where: { active: true, contributionType: "NAPSA" },
  });

  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    select: {
      id: true, legalName: true, tradingName: true, napsaEmployerNo: true,
      _count: { select: { employees: { where: { deletedAt: null, status: "ACTIVE", napsaNumber: { not: null } } } } },
    },
  });

  const totalEmployeesWithNapsa = businesses.reduce((sum, b) => sum + b._count.employees, 0);
  const totalEmployees = await prisma.employee.count({ where: { deletedAt: null, status: "ACTIVE" } });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <Users className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">NAPSA Compliance</h1>
            <p className="text-muted-foreground">National Pension Scheme Authority</p>
          </div>
        </div>
        <Link href="/compliance/new?authority=NAPSA">
          <Button>
            <Plus className="h-4 w-4" />
            Add Obligation
          </Button>
        </Link>
      </div>

      {/* Score & Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className={cn("text-3xl font-bold", score >= 90 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-red-600")}>
              {score}%
            </p>
            <p className="text-xs text-muted-foreground">NAPSA Compliance Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-purple-600">{totalEmployeesWithNapsa}</p>
            <p className="text-xs text-muted-foreground">Employees with NAPSA No.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className={cn("text-2xl font-bold", totalEmployees !== totalEmployeesWithNapsa ? "text-amber-600" : "text-emerald-600")}>
              {totalEmployees - totalEmployeesWithNapsa}
            </p>
            <p className="text-xs text-muted-foreground">Without NAPSA No.</p>
          </CardContent>
        </Card>
      </div>

      {/* Employer Registration */}
      <Card>
        <CardHeader><CardTitle className="text-base">Employer Registration</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {businesses.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="text-sm font-medium">{b.tradingName ?? b.legalName}</p>
                  <p className="text-xs text-muted-foreground">
                    Employer No: <span className="font-mono">{b.napsaEmployerNo ?? "Not registered"}</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{b._count.employees}</p>
                  <p className="text-xs text-muted-foreground">employees with NAPSA</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contribution Rate */}
      {contributionRules.map((rule) => (
        <Card key={rule.id} className="border-amber-200 bg-amber-50/30">
          <CardHeader><CardTitle className="text-base">Contribution Rate: {rule.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Employee Rate</p>
                <p className="font-bold text-lg">{((Number(rule.employeeRate) ?? 0) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employer Rate</p>
                <p className="font-bold text-lg">{((Number(rule.employerRate) ?? 0) * 100).toFixed(1)}%</p>
              </div>
              {rule.ceiling && (
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Ceiling</p>
                  <p className="font-bold text-lg">{formatCurrency(Number(rule.ceiling))}</p>
                </div>
              )}
            </div>
            <p className="text-xs text-amber-700">⚠️ Rule last verified: {formatDate(rule.verifiedAt)} — verify rates with NAPSA before contribution.</p>
            {rule.source && <p className="text-xs text-muted-foreground">Source: {rule.source}</p>}
          </CardContent>
        </Card>
      ))}

      {/* Monthly Obligations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Monthly Contribution Obligations</CardTitle>
            <Link href="/employees?filter=napsa">
              <Button variant="outline" size="sm">Employee NAPSA Numbers</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {obligations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No NAPSA obligations found.</p>
          ) : (
            <div className="space-y-2">
              {obligations.slice(0, 12).map((obl) => {
                const statusClasses = getObligationStatusColor(obl.computedStatus);
                return (
                  <div key={obl.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">{obl.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {obl.business.tradingName ?? obl.business.legalName} · Due {formatDate(obl.dueDate)}
                        {obl.amountDue ? ` · ${formatCurrency(Number(obl.amountDue))}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs border", statusClasses)}>{getStatusLabel(obl.computedStatus)}</Badge>
                      <Link href={`/compliance/${obl.id}`}><Button variant="ghost" size="sm">View</Button></Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ⓘ ComplianceHub Zambia is an independent platform and is not affiliated with or endorsed by NAPSA. Contribution rates must be verified with NAPSA before filing or payment.
      </p>
    </div>
  );
}
