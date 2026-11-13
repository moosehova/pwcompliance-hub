import { getTotReturns } from "@/lib/actions/turnover-tax";
import { getBusinesses } from "@/lib/actions/businesses";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Percent, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "DRAFT") return "secondary";
  if (status === "CHANGES_REQUESTED") return "destructive";
  if (status === "COMPLETED") return "secondary";
  if (status === "PREPARED" || status === "APPROVED") return "outline";
  return "default";
}

export default async function TurnoverTaxPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; status?: string; year?: string }>;
}) {
  const params = await searchParams;
  const [returns, businesses] = await Promise.all([
    getTotReturns({
      businessId: params.business,
      status: params.status !== "ALL" ? params.status : undefined,
      taxYear: params.year ? parseInt(params.year) : undefined,
    }),
    getBusinesses(),
  ]);

  const years = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Percent className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Turnover Tax</h1>
          </div>
          <p className="text-muted-foreground mt-0.5">
            {returns.length} return{returns.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/tax/returns/new?type=TURNOVER_TAX">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New TOT Return
          </Button>
        </Link>
      </div>

      {/* ⚠️  Draft rate notice */}
      <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        <span>
          Turnover Tax rates must be verified against current ZRA guidelines before submitting.
          Go to <Link href="/tax/rules" className="underline font-medium">Tax Rules</Link> to
          add or confirm the official rate.
        </span>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-2">
        <select
          name="business"
          defaultValue={params.business ?? ""}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Businesses</option>
          {businesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.tradingName || b.legalName}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={params.year ?? ""}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="">All Years</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-md border bg-background px-3 py-1.5 text-sm"
        >
          <option value="ALL">All Statuses</option>
          {["DRAFT", "PREPARED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "SUBMITTED", "COMPLETED"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      {/* Returns list */}
      {returns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No Turnover Tax returns found.{" "}
            <Link href="/tax/returns/new?type=TURNOVER_TAX" className="underline text-primary">
              Create one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {returns.map((r) => {
            const comp = r.turnoverComputation;
            return (
              <Link key={r.id} href={`/tax/turnover/${r.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {r.business.tradingName || r.business.legalName}
                          </span>
                          <Badge variant={statusVariant(r.status)}>
                            {r.status.replace(/_/g, " ")}
                          </Badge>
                          {comp && !comp.eligibilityChecked && (
                            <Badge variant="destructive">Eligibility Pending</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          Tax Year {r.taxYear} &bull;{" "}
                          {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {comp && (
                          <p className="font-mono font-medium text-sm">
                            ZMW {Number(comp.netTaxPayable).toLocaleString("en-ZM", { minimumFractionDigits: 2 })}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {r.preparer?.name ?? "Unassigned"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
