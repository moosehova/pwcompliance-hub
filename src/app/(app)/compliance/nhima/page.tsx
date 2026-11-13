import { getObligations } from "@/lib/actions/compliance";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getObligationStatusColor, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function NhimaPage() {
  const obligations = await getObligations({ authorityCode: "NHIMA" });
  const overdue = obligations.filter((o) => o.computedStatus === "OVERDUE");
  const completed = obligations.filter((o) => ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus));
  const score = obligations.length > 0 ? Math.round((completed.length / obligations.length) * 100) : 100;

  const contributionRules = await prisma.contributionRule.findMany({
    where: { active: true, contributionType: "NHIMA" },
  });

  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    select: { id: true, legalName: true, tradingName: true, nhimaEmployerNo: true },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100">
            <Users className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">NHIMA Compliance</h1>
            <p className="text-muted-foreground">National Health Insurance Management Authority</p>
          </div>
        </div>
        <Link href="/compliance/new?authority=NHIMA">
          <Button>
            <Plus className="h-4 w-4" />
            Add Obligation
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className={cn("text-3xl font-bold", score >= 90 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-red-600")}>
              {score}%
            </p>
            <p className="text-xs text-muted-foreground">NHIMA Compliance Score</p>
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
            <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{obligations.length}</p>
            <p className="text-xs text-muted-foreground">Total Obligations</p>
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
                <p className="text-sm font-medium">{b.tradingName ?? b.legalName}</p>
                <p className="text-xs text-muted-foreground">
                  NHIMA No: <span className="font-mono">{b.nhimaEmployerNo ?? "Not registered"}</span>
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {contributionRules.map((rule) => (
        <Card key={rule.id} className="border-teal-200 bg-teal-50/30">
          <CardHeader><CardTitle className="text-base">Contribution Rate: {rule.name}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Employee Rate</p>
                <p className="font-bold text-lg">{((Number(rule.employeeRate) ?? 0) * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employer Rate</p>
                <p className="font-bold text-lg">{((Number(rule.employerRate) ?? 0) * 100).toFixed(1)}%</p>
              </div>
            </div>
            <p className="text-xs text-amber-700">⚠️ Verify rates with NHIMA before processing contributions.</p>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader><CardTitle className="text-base">Monthly Obligations</CardTitle></CardHeader>
        <CardContent>
          {obligations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No NHIMA obligations found.</p>
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
        ⓘ ComplianceHub Zambia is an independent platform and is not affiliated with or endorsed by NHIMA.
      </p>
    </div>
  );
}
