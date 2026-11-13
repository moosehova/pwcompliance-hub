"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateTaxComputation } from "@/lib/actions/tax-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CompData {
  accountingProfit?: number | null;
  addbackDepreciation?: number | null; addbackEntertainment?: number | null;
  addbackFines?: number | null; addbackOther?: number | null; totalAddbacks?: number | null;
  capitalAllowances?: number | null; otherAllowableDeductions?: number | null; totalDeductions?: number | null;
  lossesUtilised?: number | null; taxableProfit?: number | null;
  taxRate?: number | null; grossTaxLiability?: number | null;
  taxCredits?: number | null; advanceTaxPaid?: number | null; whtCredits?: number | null;
  totalCredits?: number | null; netTaxPayable?: number | null; taxRefundable?: number | null;
  notes?: string | null;
}

function Row({ name, label, value, readOnly, note }: { name: string; label: string; value?: number | null; readOnly: boolean; note?: string }) {
  return (
    <div className="flex items-center gap-4 py-1.5 border-b last:border-0">
      <div className="flex-1">
        <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
        {note && <p className="text-xs text-muted-foreground/70 mt-0.5">{note}</p>}
      </div>
      {readOnly ? (
        <span className="text-sm font-medium w-36 text-right">
          {value != null ? formatCurrency(Number(value), "ZMW") : "—"}
        </span>
      ) : (
        <Input
          name={name}
          type="number"
          step="0.01"
          defaultValue={value != null ? Number(value) : ""}
          className="w-36 text-right"
          placeholder="0.00"
        />
      )}
    </div>
  );
}

function SubRow({ label, value, highlight }: { label: string; value?: number | null; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-2 rounded-sm px-2 mt-1 mb-1 ${highlight ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}>
      <span className={`flex-1 text-sm font-semibold`}>{label}</span>
      <span className={`text-sm font-semibold w-36 text-right`}>
        {value != null ? formatCurrency(Number(value), "ZMW") : "—"}
      </span>
    </div>
  );
}

export function ComputationForm({
  taxReturnId, data, profitBeforeTax, readOnly
}: {
  taxReturnId: string;
  data: CompData | null;
  profitBeforeTax?: number | null;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ taxableProfit: number; netTaxPayable: number; taxRuleUsed?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await updateTaxComputation(taxReturnId, Object.fromEntries(fd.entries()));
      if (res.success) {
        setResult({ taxableProfit: res.taxableProfit, netTaxPayable: res.netTaxPayable, taxRuleUsed: res.taxRuleUsed });
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  const d = data ?? {};
  const displayProfit = profitBeforeTax ?? d.accountingProfit;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section C: Profit adjustment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Section C: Profit Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="px-4 space-y-1">
          {/* Accounting profit — read-only, pulled from income statement */}
          <div className="flex items-center gap-4 py-1.5 border-b">
            <div className="flex-1">
              <Label className="text-sm font-normal text-muted-foreground">Accounting Profit Before Tax</Label>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Auto-populated from Income Statement (Section B)</p>
            </div>
            <span className="text-sm font-medium w-36 text-right">
              {displayProfit != null ? formatCurrency(Number(displayProfit), "ZMW") : "—"}
            </span>
            {!readOnly && <input type="hidden" name="accountingProfit" value={displayProfit != null ? Number(displayProfit) : 0} />}
          </div>

          <p className="text-xs font-semibold text-muted-foreground pt-2 pb-1 uppercase tracking-wide">Addbacks (Disallowable Expenses)</p>
          <Row name="addbackDepreciation" label="Add: Accounting Depreciation" value={d.addbackDepreciation} readOnly={readOnly}
            note="Replace with tax capital allowances (Section D)" />
          <Row name="addbackEntertainment" label="Add: Entertainment / Non-business" value={d.addbackEntertainment} readOnly={readOnly} />
          <Row name="addbackFines" label="Add: Fines & Penalties" value={d.addbackFines} readOnly={readOnly} />
          <Row name="addbackOther" label="Add: Other Disallowable" value={d.addbackOther} readOnly={readOnly} />
          <SubRow label="Total Addbacks" value={d.totalAddbacks} />

          <p className="text-xs font-semibold text-muted-foreground pt-2 pb-1 uppercase tracking-wide">Deductions (Allowable)</p>
          <Row name="capitalAllowances" label="Less: Tax Capital Allowances" value={d.capitalAllowances} readOnly={readOnly}
            note="From Fixed Assets schedule (Section D)" />
          <Row name="otherAllowableDeductions" label="Less: Other Allowable Deductions" value={d.otherAllowableDeductions} readOnly={readOnly} />
          <SubRow label="Total Deductions" value={d.totalDeductions} />

          <Row name="lossesUtilised" label="Less: Tax Losses Utilised" value={d.lossesUtilised} readOnly={readOnly} />
          <SubRow label="Taxable Profit / (Loss)" value={d.taxableProfit} highlight />
        </CardContent>
      </Card>

      {/* Section D: Tax Calculation */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Section D: Tax Calculation</CardTitle>
        </CardHeader>
        <CardContent className="px-4 space-y-1">
          <div className="flex items-center gap-4 py-1.5 border-b">
            <div className="flex-1">
              <Label htmlFor="taxRate" className="text-sm font-normal text-muted-foreground">Applicable Tax Rate (%)</Label>
              <p className="text-xs text-muted-foreground/70 mt-0.5">Auto-populated from active tax rule; override only if necessary</p>
            </div>
            {readOnly ? (
              <span className="text-sm font-medium w-36 text-right">{d.taxRate != null ? `${d.taxRate}%` : "—"}</span>
            ) : (
              <Input id="taxRate" name="taxRate" type="number" step="0.01" min="0" max="100"
                defaultValue={d.taxRate != null ? Number(d.taxRate) : ""} className="w-36 text-right" placeholder="e.g. 30" />
            )}
          </div>

          <SubRow label="Gross Tax Liability" value={d.grossTaxLiability} />

          <p className="text-xs font-semibold text-muted-foreground pt-2 pb-1 uppercase tracking-wide">Tax Credits</p>
          <Row name="taxCredits" label="Tax Credits" value={d.taxCredits} readOnly={readOnly} />
          <Row name="advanceTaxPaid" label="Advance Tax Already Paid" value={d.advanceTaxPaid} readOnly={readOnly} />
          <Row name="whtCredits" label="Withholding Tax Credits" value={d.whtCredits} readOnly={readOnly} />
          <SubRow label="Total Credits" value={d.totalCredits} />

          <SubRow label="Net Tax Payable" value={d.netTaxPayable} highlight />
          {d.taxRefundable != null && Number(d.taxRefundable) > 0 && (
            <SubRow label="Tax Refundable" value={d.taxRefundable} />
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Computation Notes</CardTitle>
        </CardHeader>
        <CardContent>
          {readOnly ? (
            <p className="text-sm text-muted-foreground">{d.notes ?? "No notes"}</p>
          ) : (
            <textarea
              name="notes"
              defaultValue={d.notes ?? ""}
              rows={3}
              placeholder="Add computation notes, assumptions, or references…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          )}
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex items-center gap-3 flex-wrap">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Calculate & Save
          </Button>
          {result && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md px-3 py-1.5">
              <Info className="h-3.5 w-3.5" />
              Taxable profit: {formatCurrency(result.taxableProfit, "ZMW")} · Tax payable: {formatCurrency(result.netTaxPayable, "ZMW")}
              {result.taxRuleUsed && <span className="text-xs text-muted-foreground ml-1">(rule: {result.taxRuleUsed})</span>}
            </div>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      )}
    </form>
  );
}
