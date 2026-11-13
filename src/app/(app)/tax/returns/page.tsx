import { getTaxReturns } from "@/lib/actions/tax-returns";
import { getBusinesses } from "@/lib/actions/businesses";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = ["ALL", "DRAFT", "PREPARED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "SUBMITTED", "COMPLETED"];
const TAX_TYPES = ["ALL", "COMPANY_INCOME_TAX", "TURNOVER_TAX", "VAT", "PAYE", "WITHHOLDING_TAX"];

function statusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "DRAFT") return "secondary";
  if (status === "CHANGES_REQUESTED") return "destructive";
  if (status === "COMPLETED") return "secondary";
  if (status === "PREPARED" || status === "APPROVED") return "outline";
  return "default";
}

export default async function TaxReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; type?: string; status?: string; year?: string }>;
}) {
  const params = await searchParams;
  const [returns, businesses] = await Promise.all([
    getTaxReturns({
      businessId: params.business,
      taxType: params.type !== "ALL" ? params.type : undefined,
      status: params.status !== "ALL" ? params.status : undefined,
      taxYear: params.year ? parseInt(params.year) : undefined,
    }),
    getBusinesses(),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tax Returns</h1>
          <p className="text-muted-foreground">{returns.length} return{returns.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/tax/returns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Return
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <form className="flex flex-wrap gap-2" method="GET">
          <select
            name="business"
            defaultValue={params.business ?? ""}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All Businesses</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.tradingName ?? b.legalName}
              </option>
            ))}
          </select>
          <select
            name="type"
            defaultValue={params.type ?? "ALL"}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {TAX_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "ALL" ? "All Types" : t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={params.status ?? "ALL"}
            className="rounded-md border bg-background px-3 py-1.5 text-sm"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "ALL" ? "All Statuses" : s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            name="year"
            type="number"
            placeholder="Year"
            defaultValue={params.year ?? ""}
            className="rounded-md border bg-background px-3 py-1.5 text-sm w-24"
          />
          <Button type="submit" variant="outline" size="sm">Filter</Button>
        </form>
      </div>

      <Card>
        <CardContent className="p-0">
          {returns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No tax returns found</p>
              <p className="text-sm text-muted-foreground mb-4">
                {params.status || params.type || params.business ? "Try adjusting your filters" : "Create your first return to get started"}
              </p>
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tax Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Year</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Period</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Preparer</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Updated</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {returns.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        {r.business.tradingName ?? r.business.legalName}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{r.taxType.replace(/_/g, " ")}</td>
                      <td className="py-3 px-4">{r.taxYear}</td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadgeVariant(r.status)}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </td>
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
