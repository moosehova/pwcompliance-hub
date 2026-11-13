import { getObligations } from "@/lib/actions/compliance";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Landmark, Plus, CheckCircle2, AlertTriangle, Clock } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getObligationStatusColor, getStatusLabel, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default async function PacraPage() {
  const obligations = await getObligations({ authorityCode: "PACRA" });
  const overdue = obligations.filter((o) => o.computedStatus === "OVERDUE");
  const completed = obligations.filter((o) => ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus));
  const score = obligations.length > 0 ? Math.round((completed.length / obligations.length) * 100) : 100;

  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      legalName: true,
      tradingName: true,
      pacraNumber: true,
      businessType: true,
      status: true,
      incorporatedDate: true,
    },
    take: 20,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <Landmark className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">PACRA Compliance</h1>
            <p className="text-muted-foreground">Patents and Companies Registration Agency</p>
          </div>
        </div>
        <Link href="/compliance/new?authority=PACRA">
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
            <p className="text-xs text-muted-foreground mt-1">PACRA Compliance Score</p>
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

      {/* Company Registration Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registered Businesses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Business</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">PACRA Number</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Incorporated</th>
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
                    <td className="py-3 px-3">
                      <span className="text-sm font-mono">{b.pacraNumber ?? "—"}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm">{b.businessType.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant={b.status === "ACTIVE" ? "success" : "secondary"}>{b.status}</Badge>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-sm">{formatDate(b.incorporatedDate)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Obligations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PACRA Obligations</CardTitle>
        </CardHeader>
        <CardContent>
          {obligations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No PACRA obligations found.</p>
          ) : (
            <div className="space-y-3">
              {obligations.map((obl) => {
                const days = getDaysUntil(obl.dueDate);
                const statusClasses = getObligationStatusColor(obl.computedStatus);
                return (
                  <div key={obl.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/20 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {obl.computedStatus === "OVERDUE" ? (
                          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                        ) : obl.computedStatus === "COMPLETED" || obl.computedStatus === "PAID" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <p className="text-sm font-medium">{obl.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        {obl.business.tradingName ?? obl.business.legalName} · Due {formatDate(obl.dueDate)}
                        {obl.amountDue ? ` · ${formatCurrency(Number(obl.amountDue))}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn("text-xs border", statusClasses)}>{getStatusLabel(obl.computedStatus)}</Badge>
                      <Link href={`/compliance/${obl.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        ⓘ ComplianceHub Zambia is an independent business compliance management platform and is not affiliated with or endorsed by PACRA.
      </p>
    </div>
  );
}
