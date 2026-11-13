import { notFound } from "next/navigation";
import { getTotReturnById } from "@/lib/actions/turnover-tax";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { TotEligibilityForm } from "./eligibility/form";
import { TotComputationForm } from "./computation/form";

const TABS = [
  { id: "eligibility", label: "Eligibility" },
  { id: "computation", label: "Computation" },
  { id: "documents", label: "Documents" },
];

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "DRAFT") return "secondary";
  if (status === "CHANGES_REQUESTED") return "destructive";
  if (status === "COMPLETED") return "secondary";
  if (status === "PREPARED" || status === "APPROVED") return "outline";
  return "default";
}

export default async function TotReturnDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab = "eligibility" } = await searchParams;

  const taxReturn = await getTotReturnById(id);
  if (!taxReturn) notFound();

  const comp = taxReturn.turnoverComputation;
  const isEditable = ["DRAFT", "PREPARED", "CHANGES_REQUESTED"].includes(taxReturn.status);

  return (
    <div className="p-6 space-y-6">
      {/* Back + header */}
      <div className="flex items-start gap-4">
        <Link href="/tax/turnover">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">
              Turnover Tax — {taxReturn.business.tradingName || taxReturn.business.legalName}
            </h1>
            <Badge variant={statusVariant(taxReturn.status)}>
              {taxReturn.status.replace(/_/g, " ")}
            </Badge>
            {comp && !comp.eligibilityChecked && (
              <Badge variant="destructive">Eligibility Incomplete</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tax Year {taxReturn.taxYear} &bull;{" "}
            {formatDate(taxReturn.periodStart)} – {formatDate(taxReturn.periodEnd)}
          </p>
        </div>
      </div>

      {/* Draft rate warning */}
      {!taxReturn.taxRule && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            No TOT tax rule is linked to this return. Go to{" "}
            <Link href="/tax/rules" className="underline font-medium">Tax Rules</Link>{" "}
            and create a Turnover Tax rule, then link it to this return.
          </span>
        </div>
      )}
      {taxReturn.taxRule?.isDraft && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            The linked tax rule (<strong>{taxReturn.taxRule.name}</strong>) is marked as a draft
            and has not been verified. Verify the rate against official ZRA publications before
            finalising this return.
          </span>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Gross Turnover" value={comp ? Number(comp.grossTurnover) : null} />
        <SummaryCard label="Taxable Turnover" value={comp ? Number(comp.taxableTurnover) : null} />
        <SummaryCard
          label="Tax Liability"
          value={comp ? Number(comp.taxLiability) : null}
          rateNote={comp ? `@ ${Number(comp.taxRate)}%` : undefined}
        />
        <SummaryCard label="Net Tax Payable" value={comp ? Number(comp.netTaxPayable) : null} highlight />
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-1">
        {TABS.map((t) => (
          <Link key={t.id} href={`/tax/turnover/${id}?tab=${t.id}`}>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "eligibility" && (
        <TotEligibilityForm
          taxReturnId={id}
          initialData={comp ? {
            annualTurnoverCheck: comp.annualTurnoverCheck,
            notVatRegistered: comp.notVatRegistered,
            eligibilityNotes: comp.eligibilityNotes ?? "",
          } : undefined}
          readOnly={!isEditable}
        />
      )}

      {tab === "computation" && (
        <TotComputationForm
          taxReturnId={id}
          taxRule={taxReturn.taxRule
        ? { ...taxReturn.taxRule, flatRate: taxReturn.taxRule.flatRate ? Number(taxReturn.taxRule.flatRate) : null }
        : null}
          initialData={comp ? {
            grossTurnover: Number(comp.grossTurnover),
            exportSales: Number(comp.exportSales),
            dividendIncome: Number(comp.dividendIncome),
            interestIncome: Number(comp.interestIncome),
            rentalIncome: Number(comp.rentalIncome),
            capitalGains: Number(comp.capitalGains),
            otherExclusions: Number(comp.otherExclusions),
            exclusionNotes: comp.exclusionNotes ?? "",
            quarterlyPayments: Number(comp.quarterlyPayments),
            whtCredits: Number(comp.whtCredits),
            otherCredits: Number(comp.otherCredits),
            notes: comp.notes ?? "",
          } : undefined}
          readOnly={!isEditable}
        />
      )}

      {tab === "documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Supporting Documents</h2>
            <Link href={`/tax/returns/${id}/documents`}>
              <Button variant="outline" size="sm">Manage Documents</Button>
            </Link>
          </div>
          {taxReturn.documents.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No documents uploaded yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {taxReturn.documents.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.category.replace(/_/g, " ")} &bull; {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <a
                      href={`/api/vault/tax/${doc.id}/download`}
                      className="text-xs text-primary underline"
                    >
                      Download
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  rateNote,
  highlight,
}: {
  label: string;
  value: number | null;
  rateNote?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/50" : undefined}>
      <CardContent className="py-4 px-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-mono font-semibold mt-1 ${highlight ? "text-primary" : ""}`}>
          {value !== null
            ? `ZMW ${value.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}`
            : "—"}
        </p>
        {rateNote && (
          <p className="text-xs text-muted-foreground mt-0.5">{rateNote}</p>
        )}
      </CardContent>
    </Card>
  );
}
