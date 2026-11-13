import { getTaxReturns, getTaxReturnStats } from "@/lib/actions/tax-returns";
import { getBusinesses } from "@/lib/actions/businesses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Clock, CheckCircle2, AlertCircle, Send, XCircle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    DRAFT: { label: "Draft", variant: "secondary" },
    PREPARED: { label: "Prepared", variant: "outline" },
    UNDER_REVIEW: { label: "Under Review", variant: "default" },
    CHANGES_REQUESTED: { label: "Changes Requested", variant: "destructive" },
    APPROVED: { label: "Approved", variant: "default" },
    SUBMITTED: { label: "Submitted", variant: "default" },
    COMPLETED: { label: "Completed", variant: "secondary" },
  };
  const cfg = map[status] ?? { label: status, variant: "secondary" as const };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default async function TaxOverviewPage() {
  const [stats, recentReturns, businesses] = await Promise.all([
    getTaxReturnStats(),
    getTaxReturns(),
    getBusinesses(),
  ]);

  const recent = recentReturns.slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tax Preparation Centre</h1>
          <p className="text-muted-foreground">
            {stats.total} tax return{stats.total !== 1 ? "s" : ""} across {businesses.length} business
            {businesses.length !== 1 ? "es" : ""}
          </p>
        </div>
        <Link href="/tax/returns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Return
          </Button>
        </Link>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-600">{stats.draft}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Draft</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.prepared}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Prepared</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.underReview}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Under Review</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Approved</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{stats.submitted}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Submitted</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.completed}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Returns table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Returns</CardTitle>
          <Link href="/tax/returns" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No tax returns yet</p>
              <p className="text-sm text-muted-foreground mb-4">Create your first return to get started</p>
              <Link href="/tax/returns/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Return
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Business</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Year</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Preparer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Updated</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        {r.business.tradingName ?? r.business.legalName}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {r.taxType.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">{r.taxYear}</td>
                      <td className="py-3 px-4">{statusBadge(r.status)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{r.preparer?.name ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(r.updatedAt)}</td>
                      <td className="py-3 px-4">
                        <Link href={`/tax/returns/${r.id}`}>
                          <Button variant="ghost" size="sm">Open</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
