import { getObligations } from "@/lib/actions/compliance";
import { getBusinesses } from "@/lib/actions/businesses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency, getObligationStatusColor, getStatusLabel, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Filter, Plus } from "lucide-react";
import Link from "next/link";

export default async function CompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; authority?: string; status?: string }>;
}) {
  const params = await searchParams;
  const [obligations, businesses] = await Promise.all([
    getObligations({
      businessId: params.business,
      authorityCode: params.authority,
      status: params.status,
    }),
    getBusinesses(),
  ]);

  const overdue = obligations.filter((o) => o.computedStatus === "OVERDUE");
  const dueSoon = obligations.filter((o) => ["DUE_SOON", "DUE"].includes(o.computedStatus));
  const completed = obligations.filter((o) => ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus));

  const STATUSES = ["ALL", "OVERDUE", "DUE_SOON", "DUE", "UPCOMING", "SUBMITTED", "PAID", "COMPLETED"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Overview</h1>
          <p className="text-muted-foreground">{obligations.length} obligations across all businesses</p>
        </div>
        <Link href="/compliance/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Obligation
          </Button>
        </Link>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">{dueSoon.length}</p>
            <p className="text-xs text-muted-foreground">Due Soon</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-600">{obligations.length - overdue.length - dueSoon.length - completed.length}</p>
            <p className="text-xs text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600">{completed.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1 flex-wrap">
              <span className="text-xs text-muted-foreground self-center mr-1">Status:</span>
              {STATUSES.map((s) => (
                <Link
                  key={s}
                  href={`/compliance?${new URLSearchParams({ ...params, status: s === "ALL" ? "" : s })}`}
                >
                  <Badge
                    variant={(params.status ?? "ALL") === s ? "default" : "outline"}
                    className="cursor-pointer"
                  >
                    {s === "ALL" ? "All" : getStatusLabel(s)}
                  </Badge>
                </Link>
              ))}
            </div>
            {businesses.length > 1 && (
              <div className="flex gap-1 flex-wrap">
                <span className="text-xs text-muted-foreground self-center mr-1">Business:</span>
                <Link href={`/compliance?${new URLSearchParams({ ...params, business: "" })}`}>
                  <Badge variant={!params.business ? "default" : "outline"} className="cursor-pointer">All</Badge>
                </Link>
                {businesses.map((b) => (
                  <Link key={b.id} href={`/compliance?${new URLSearchParams({ ...params, business: b.id })}`}>
                    <Badge variant={params.business === b.id ? "default" : "outline"} className="cursor-pointer">
                      {b.tradingName ?? b.legalName}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Obligations Table */}
      <Card>
        <CardContent className="p-0">
          {obligations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground">No obligations found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Obligation</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Authority</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Business</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Due Date</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((obl) => {
                    const days = getDaysUntil(obl.dueDate);
                    const statusClasses = getObligationStatusColor(obl.computedStatus);
                    return (
                      <tr key={obl.id} className="border-b hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium">{obl.title}</p>
                          <p className="text-xs text-muted-foreground">{obl.periodLabel}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{obl.authority.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm">{obl.business.tradingName ?? obl.business.legalName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm">{formatDate(obl.dueDate)}</p>
                          <p className={cn("text-xs", days < 0 ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-muted-foreground")}>
                            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm">{obl.amountDue ? formatCurrency(Number(obl.amountDue)) : "—"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn("text-xs border", statusClasses)}>
                            {getStatusLabel(obl.computedStatus)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/compliance/${obl.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
