import { getTaxReturnById } from "@/lib/actions/tax-returns";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, Calendar, FileText } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { TaxReturnWorkflowActions } from "./workflow-actions";

function statusColor(status: string) {
  const map: Record<string, string> = {
    DRAFT: "secondary",
    PREPARED: "outline",
    UNDER_REVIEW: "default",
    CHANGES_REQUESTED: "destructive",
    APPROVED: "default",
    SUBMITTED: "default",
    COMPLETED: "secondary",
  };
  return (map[status] ?? "secondary") as "default" | "secondary" | "destructive" | "outline";
}

const TABS = [
  { label: "Overview", href: "" },
  { label: "Balance Sheet", href: "/balance-sheet" },
  { label: "Income Statement", href: "/income-statement" },
  { label: "Tax Computation", href: "/computation" },
  { label: "Fixed Assets", href: "/assets" },
];

export default async function TaxReturnPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taxReturn = await getTaxReturnById(id);
  if (!taxReturn) notFound();

  const baseHref = `/tax/returns/${id}`;
  const isEditable = ["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/tax/returns">
            <Button variant="ghost" size="icon" className="mt-0.5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">
                {taxReturn.taxType.replace(/_/g, " ")} — {taxReturn.taxYear}
              </h1>
              <Badge variant={statusColor(taxReturn.status)}>
                {taxReturn.status.replace(/_/g, " ")}
              </Badge>
              {taxReturn.isAmended && <Badge variant="outline">Amended</Badge>}
            </div>
            <p className="text-muted-foreground">
              {taxReturn.business.tradingName ?? taxReturn.business.legalName}
            </p>
          </div>
        </div>
        <TaxReturnWorkflowActions taxReturn={{ id, status: taxReturn.status }} />
      </div>

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-xs">Business</span>
            </div>
            <p className="font-medium text-sm truncate">
              {taxReturn.business.tradingName ?? taxReturn.business.legalName}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="h-3.5 w-3.5" />
              <span className="text-xs">Period</span>
            </div>
            <p className="font-medium text-sm">
              {formatDate(taxReturn.periodStart)} – {formatDate(taxReturn.periodEnd)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-3.5 w-3.5" />
              <span className="text-xs">Preparer</span>
            </div>
            <p className="font-medium text-sm">{taxReturn.preparer?.name ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-3.5 w-3.5" />
              <span className="text-xs">Reviewer</span>
            </div>
            <p className="font-medium text-sm">{taxReturn.reviewer?.name ?? "Not assigned"}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0 overflow-x-auto">
        {TABS.map((tab) => {
          const href = `${baseHref}${tab.href}`;
          return (
            <Link
              key={tab.label}
              href={href}
              className="px-4 py-2.5 text-sm border-b-2 border-transparent hover:border-muted-foreground transition-colors whitespace-nowrap text-muted-foreground hover:text-foreground data-[active]:border-primary data-[active]:text-foreground"
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Overview tab content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Computation summary */}
        {taxReturn.computation && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tax Computation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                ["Accounting Profit", taxReturn.computation.accountingProfit],
                ["Total Addbacks", taxReturn.computation.totalAddbacks],
                ["Total Deductions", taxReturn.computation.totalDeductions],
                ["Losses Utilised", taxReturn.computation.lossesUtilised],
                ["Taxable Profit", taxReturn.computation.taxableProfit, true],
                ["Tax Rate", `${taxReturn.computation.taxRate}%`],
                ["Gross Tax Liability", taxReturn.computation.grossTaxLiability],
                ["Total Credits", taxReturn.computation.totalCredits],
                ["Net Tax Payable", taxReturn.computation.netTaxPayable, true],
              ].map(([label, value, bold]) => (
                <div key={String(label)} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span className={bold ? "font-semibold" : "text-muted-foreground"}>{String(label)}</span>
                  <span className={bold ? "font-semibold" : ""}>
                    {typeof value === "number" || (value && typeof value === "object")
                      ? formatCurrency(Number(value), "ZMW")
                      : String(value ?? "—")}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Review history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Review History</CardTitle>
          </CardHeader>
          <CardContent>
            {taxReturn.reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No review actions yet</p>
            ) : (
              <div className="space-y-3">
                {taxReturn.reviews.map((review) => (
                  <div key={review.id} className="text-sm border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{review.action.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{review.reviewer.name}</p>
                    {review.notes && <p className="text-xs mt-1 text-muted-foreground italic">{review.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick links to sections */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {TABS.slice(1).map((tab) => (
          <Link key={tab.label} href={`${baseHref}${tab.href}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardContent className="p-4 text-center">
                <FileText className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">{tab.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isEditable ? "Edit" : "View"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
