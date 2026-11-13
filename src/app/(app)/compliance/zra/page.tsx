import { getObligations } from "@/lib/actions/compliance";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getObligationStatusColor, getStatusLabel, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function ZraPage() {
  const obligations = await getObligations({ authorityCode: "ZRA" });
  const overdue = obligations.filter((o) => o.computedStatus === "OVERDUE");
  const completed = obligations.filter((o) => ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus));
  const score = obligations.length > 0 ? Math.round((completed.length / obligations.length) * 100) : 100;

  const taxRules = await prisma.taxRule.findMany({ where: { active: true }, orderBy: { effectiveFrom: "desc" } });
  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    select: { id: true, legalName: true, tradingName: true, tpin: true, vatNumber: true },
    take: 20,
  });

  const byType: Record<string, typeof obligations> = {};
  for (const obl of obligations) {
    const type = obl.requirement?.name ?? "Other";
    if (!byType[type]) byType[type] = [];
    byType[type].push(obl);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <Receipt className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ZRA Compliance</h1>
            <p className="text-muted-foreground">Zambia Revenue Authority</p>
          </div>
        </div>
        <Link href="/compliance/new?authority=ZRA">
          <Button>
            <Plus className="h-4 w-4" />
            Add Obligation
          </Button>
        </Link>
      </div>

      {/* Score */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className={cn("text-3xl font-bold", score >= 90 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-red-600")}>
              {score}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">ZRA Compliance Score</p>
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

      {/* Business Tax Profiles */}
      <Card>
        <CardHeader><CardTitle className="text-base">Tax Profiles</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Business</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">TPIN</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">VAT Number</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b) => (
                  <tr key={b.id} className="border-b hover:bg-muted/20">
                    <td className="py-3 px-3">
                      <Link href={`/businesses/${b.id}`} className="text-sm font-medium hover:text-primary">
                        {b.tradingName ?? b.legalName}
                      </Link>
                    </td>
                    <td className="py-3 px-3"><span className="text-sm font-mono">{b.tpin ?? "—"}</span></td>
                    <td className="py-3 px-3"><span className="text-sm font-mono">{b.vatNumber ?? "—"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Obligations grouped by type */}
      {Object.entries(byType).map(([type, obls]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle className="text-base">{type}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {obls.slice(0, 12).map((obl) => {
                const days = getDaysUntil(obl.dueDate);
                const statusClasses = getObligationStatusColor(obl.computedStatus);
                return (
                  <div key={obl.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/20">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{obl.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {obl.business.tradingName ?? obl.business.legalName} · Due {formatDate(obl.dueDate)}
                        {obl.amountDue ? ` · ${formatCurrency(Number(obl.amountDue))}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs border", statusClasses)}>{getStatusLabel(obl.computedStatus)}</Badge>
                      <Link href={`/compliance/${obl.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Tax Rules */}
      {taxRules.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Configured Tax Rules</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {taxRules.map((rule) => (
              <div key={rule.id} className="p-3 rounded-lg border bg-muted/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{rule.name}</p>
                  <Badge variant="outline">{rule.taxType}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                <p className="text-xs text-muted-foreground">Effective from {formatDate(rule.effectiveFrom)}</p>
                {rule.verifiedAt && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Rule last verified: {formatDate(rule.verifiedAt)} — verify rates with ZRA before use.</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        ⓘ ComplianceHub Zambia is an independent business compliance management platform and is not affiliated with or endorsed by ZRA. Tax rates must be verified with ZRA before filing or payment.
      </p>
    </div>
  );
}
