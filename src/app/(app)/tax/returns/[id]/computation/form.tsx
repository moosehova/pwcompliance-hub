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
  addbackFines?: number | null; addbackOther?: number | null;
  capitalAllowances?: number | null; otherAllowableDeductions?: number | null;
  lossesUtilised?: number | null; taxRate?: number | null;
  taxCredits?: number | null; advanceTaxPaid?: number | null; whtCredits?: number | null;
  taxRefundable?: number | null; notes?: string | null;
}

function n(v: number | null | undefined): number { return v ?? 0; }

function AmountRow({ name, label, value, readOnly, onChange, note }: {
  name: string; label: string; value: number; readOnly: boolean;
  onChange: (v: number) => void; note?: string;
}) {
  return (
    <div className="flex items-center gap-4 py-1.5 border-b last:border-0">
      <div className="flex-1">
        <Label className="text-sm font-normal text-muted-foreground">{label}</Label>
        {note && <p className="text-xs text-muted-foreground/70 mt-0.5">{note}</p>}
      </div>
      {readOnly ? (
        <span className="text-sm font-medium w-36 text-right">{formatCurrency(value, "ZMW")}</span>
      ) : (
        <Input
          name={name}
          type="number"
          step="0.01"
          value={value || ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-36 text-right"
          placeholder="0.00"
        />
      )}
    </div>
  );
}

function SubRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-2 rounded-sm px-2 mt-1 mb-1 ${highlight ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <span className="text-sm font-semibold w-36 text-right">{formatCurrency(value, "ZMW")}</span>
    </div>
  );
}

export function ComputationForm({ taxReturnId, data, profitBeforeTax, readOnly }: {
  taxReturnId: string; data: CompData | null; profitBeforeTax?: number | null; readOnly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedResult, setSavedResult] = useState<{ taxableProfit: number; netTaxPayable: number; taxRuleUsed?: string } | null>(null);

  const [vals, setVals] = useState({
    addbackDepreciation: n(data?.addbackDepreciation),
    addbackEntertainment: n(data?.addbackEntertainment),
    addbackFines: n(data?.addbackFines),
    addbackOther: n(data?.addbackOther),
    capitalAllowances: n(data?.capitalAllowances),
    otherAllowableDeductions: n(data?.otherAllowableDeductions),
    lossesUtilised: n(data?.lossesUtilised),
    taxRate: n(data?.taxRate),
    taxCredits: n(data?.taxCredits),
    advanceTaxPaid: n(data?.advanceTaxPaid),
    whtCredits: n(data?.whtCredits),
    notes: data?.notes ?? "",
  });

  const set = <K extends keyof typeof vals>(name: K, v: typeof vals[K]) =>
    setVals((prev) => ({ ...prev, [name]: v }));

  const setNum = (name: keyof typeof vals, v: number) =>
    setVals((prev) => ({ ...prev, [name]: v }));

  // Auto-populated from Income Statement
  const displayProfit = profitBeforeTax ?? n(data?.accountingProfit);

  // Live computed totals
  const totalAddbacks = vals.addbackDepreciation + vals.addbackEntertainment + vals.addbackFines + vals.addbackOther;
  const totalDeductions = vals.capitalAllowances + vals.otherAllowableDeductions;
  const taxableProfit = displayProfit + totalAddbacks - totalDeductions - vals.lossesUtilised;
  const grossTaxLiability = taxableProfit > 0 ? (taxableProfit * vals.taxRate) / 100 : 0;
  const totalCredits = vals.taxCredits + vals.advanceTaxPaid + vals.whtCredits;
  const netTaxPayable = Math.max(0, grossTaxLiability - totalCredits);
  const taxRefundable = Math.max(0, totalCredits - grossTaxLiability);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedResult(null);
    try {
      const payload = { ...vals, accountingProfit: displayProfit };
      const res = await updateTaxComputation(taxReturnId, payload);
      if (res.success) {
        setSavedResult({ taxableProfit: res.taxableProfit, netTaxPayable: res.netTaxPayable, taxRuleUsed: res.taxRuleUsed });
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <span className="text-sm font-medium w-36 text-right">{formatCurrency(displayProfit, "ZMW")}</span>
          </div>

          <p className="text-xs font-semibold text-muted-foreground pt-2 pb-1 uppercase tracking-wide">Addbacks (Disallowable Expenses)</p>
          <AmountRow name="addbackDepreciation" label="Add: Accounting Depreciation" value={vals.addbackDepreciation} readOnly={readOnly} onChange={(v) => setNum("addbackDepreciation", v)}
            note="Replace with tax capital allowances (Section D)" />
          <AmountRow name="addbackEntertainment" label="Add: Entertainment / Non-business" value={vals.addbackEntertainment} readOnly={readOnly} onChange={(v) => setNum("addbackEntertainment", v)} />
          <AmountRow name="addbackFines" label="Add: Fines & Penalties" value={vals.addbackFines} readOnly={readOnly} onChange={(v) => setNum("addbackFines", v)} />
          <AmountRow name="addbackOther" label="Add: Other Disallowable" value={vals.addbackOther} readOnly={readOnly} onChange={(v) => setNum("addbackOther", v)} />
          <SubRow label="Total Addbacks" value={totalAddbacks} />

          <p className="text-xs font-semibold text-muted-foreground pt-2 pb-1 uppercase tracking-wide">Deductions (Allowable)</p>
          <AmountRow name="capitalAllowances" label="Less: Tax Capital Allowances" value={vals.capitalAllowances} readOnly={readOnly} onChange={(v) => setNum("capitalAllowances", v)}
            note="From Fixed Assets schedule (Section D)" />
          <AmountRow name="otherAllowableDeductions" label="Less: Other Allowable Deductions" value={vals.otherAllowableDeductions} readOnly={readOnly} onChange={(v) => setNum("otherAllowableDeductions", v)} />
          <SubRow label="Total Deductions" value={totalDeductions} />

          <AmountRow name="lossesUtilised" label="Less: Tax Losses Utilised" value={vals.lossesUtilised} readOnly={readOnly} onChange={(v) => setNum("lossesUtilised", v)} />
          <SubRow label="Taxable Profit / (Loss)" value={taxableProfit} highlight />
        </CardContent>
      </Card>

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
              <span className="text-sm font-medium w-36 text-right">{vals.taxRate > 0 ? `${vals.taxRate}%` : "—"}</span>
            ) : (
              <Input
                id="taxRate"
                name="taxRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={vals.taxRate || ""}
                onChange={(e) => setNum("taxRate", parseFloat(e.target.value) || 0)}
                className="w-36 text-right"
                placeholder="e.g. 30"
              />
            )}
          </div>

          <SubRow label="Gross Tax Liability" value={grossTaxLiability} />

          <p className="text-xs font-semibold text-muted-foreground pt-2 pb-1 uppercase tracking-wide">Tax Credits</p>
          <AmountRow name="taxCredits" label="Tax Credits" value={vals.taxCredits} readOnly={readOnly} onChange={(v) => setNum("taxCredits", v)} />
          <AmountRow name="advanceTaxPaid" label="Advance Tax Already Paid" value={vals.advanceTaxPaid} readOnly={readOnly} onChange={(v) => setNum("advanceTaxPaid", v)} />
          <AmountRow name="whtCredits" label="Withholding Tax Credits" value={vals.whtCredits} readOnly={readOnly} onChange={(v) => setNum("whtCredits", v)} />
          <SubRow label="Total Credits" value={totalCredits} />

          <SubRow label="Net Tax Payable" value={netTaxPayable} highlight />
          {taxRefundable > 0 && (
            <SubRow label="Tax Refundable" value={taxRefundable} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Computation Notes</CardTitle></CardHeader>
        <CardContent>
          {readOnly ? (
            <p className="text-sm text-muted-foreground">{vals.notes || "No notes"}</p>
          ) : (
            <textarea
              name="notes"
              value={vals.notes}
              onChange={(e) => set("notes", e.target.value)}
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
          {savedResult && (
            <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-md px-3 py-1.5">
              <Info className="h-3.5 w-3.5" />
              Taxable profit: {formatCurrency(savedResult.taxableProfit, "ZMW")} · Tax payable: {formatCurrency(savedResult.netTaxPayable, "ZMW")}
              {savedResult.taxRuleUsed && <span className="text-xs text-muted-foreground ml-1">(rule: {savedResult.taxRuleUsed})</span>}
            </div>
          )}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      )}
    </form>
  );
}
