"use client";

import { useState, useTransition } from "react";
import { saveTotComputation } from "@/lib/actions/turnover-tax";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { computeTurnoverTax } from "@/lib/tot-computation";

interface TaxRuleSnapshot {
  id: string;
  name: string;
  flatRate: number | string | null;
  isDraft: boolean;
  source?: string | null;
}

interface Props {
  taxReturnId: string;
  taxRule?: TaxRuleSnapshot | null;
  initialData?: {
    grossTurnover: number;
    exportSales: number;
    dividendIncome: number;
    interestIncome: number;
    rentalIncome: number;
    capitalGains: number;
    otherExclusions: number;
    exclusionNotes: string;
    quarterlyPayments: number;
    whtCredits: number;
    otherCredits: number;
    notes: string;
  };
  readOnly?: boolean;
}

type NumField =
  | "grossTurnover" | "exportSales" | "dividendIncome" | "interestIncome"
  | "rentalIncome" | "capitalGains" | "otherExclusions"
  | "quarterlyPayments" | "whtCredits" | "otherCredits";

const ZERO = {
  grossTurnover: 0, exportSales: 0, dividendIncome: 0, interestIncome: 0,
  rentalIncome: 0, capitalGains: 0, otherExclusions: 0,
  quarterlyPayments: 0, whtCredits: 0, otherCredits: 0,
};

export function TotComputationForm({ taxReturnId, taxRule, initialData, readOnly }: Props) {
  const [fields, setFields] = useState<Record<NumField, number>>({
    ...ZERO,
    ...(initialData ? {
      grossTurnover: initialData.grossTurnover,
      exportSales: initialData.exportSales,
      dividendIncome: initialData.dividendIncome,
      interestIncome: initialData.interestIncome,
      rentalIncome: initialData.rentalIncome,
      capitalGains: initialData.capitalGains,
      otherExclusions: initialData.otherExclusions,
      quarterlyPayments: initialData.quarterlyPayments,
      whtCredits: initialData.whtCredits,
      otherCredits: initialData.otherCredits,
    } : {}),
  });
  const [exclusionNotes, setExclusionNotes] = useState(initialData?.exclusionNotes ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const taxRate = taxRule?.flatRate ? Number(taxRule.flatRate) : 0;
  const preview = computeTurnoverTax({ ...fields, taxRate });

  function set(field: NumField, value: string) {
    const n = parseFloat(value) || 0;
    setFields((f) => ({ ...f, [field]: n }));
    setSaved(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!taxRule?.flatRate) {
      setError("No verified TOT rate is linked to this return. Add a Turnover Tax rule first.");
      return;
    }
    startTransition(async () => {
      try {
        await saveTotComputation({
          taxReturnId,
          ...fields,
          exclusionNotes,
          notes,
        });
        setSaved(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Rate notice */}
      {!taxRule ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>No TOT tax rule linked. Computation cannot be saved until a rate is confirmed.</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm bg-muted">
          <span className="font-medium">{taxRule.name}</span>
          <span className="text-muted-foreground">— {taxRate}% flat rate</span>
          {taxRule.isDraft && (
            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1 ml-auto">
              <AlertTriangle className="h-3 w-3" /> Draft — verify with ZRA
            </span>
          )}
        </div>
      )}

      {/* Gross Turnover */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gross Turnover</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total revenue/receipts received during the tax period.
          </p>
        </CardHeader>
        <CardContent>
          <AmountRow
            label="Gross Turnover"
            field="grossTurnover"
            value={fields.grossTurnover}
            onChange={set}
            readOnly={readOnly}
          />
        </CardContent>
      </Card>

      {/* Exclusions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statutory Exclusions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Income types excluded from taxable turnover under the Income Tax Act.
            Verify applicable exclusions with ZRA.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <AmountRow label="Export Sales" field="exportSales" value={fields.exportSales} onChange={set} readOnly={readOnly} />
          <AmountRow label="Dividend Income" field="dividendIncome" value={fields.dividendIncome} onChange={set} readOnly={readOnly} />
          <AmountRow label="Interest Income" field="interestIncome" value={fields.interestIncome} onChange={set} readOnly={readOnly} />
          <AmountRow label="Rental Income" field="rentalIncome" value={fields.rentalIncome} onChange={set} readOnly={readOnly} />
          <AmountRow label="Capital Gains" field="capitalGains" value={fields.capitalGains} onChange={set} readOnly={readOnly} />
          <AmountRow label="Other Exclusions" field="otherExclusions" value={fields.otherExclusions} onChange={set} readOnly={readOnly} />
          <TotalRow label="Total Exclusions" value={preview.totalExclusions} />

          <div>
            <label className="text-sm font-medium">Exclusion Notes</label>
            <textarea
              value={exclusionNotes}
              onChange={(e) => setExclusionNotes(e.target.value)}
              disabled={readOnly}
              rows={2}
              placeholder="Describe the basis for any exclusions…"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Computation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tax Computation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <TotalRow label="Taxable Turnover" value={preview.taxableTurnover} />
          <div className="flex items-center justify-between py-1">
            <span className="text-sm">Tax Rate</span>
            <span className="font-mono text-sm">{taxRate}%</span>
          </div>
          <TotalRow label="Tax Liability" value={preview.taxLiability} />
        </CardContent>
      </Card>

      {/* Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments &amp; Credits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AmountRow label="Quarterly Advance Payments" field="quarterlyPayments" value={fields.quarterlyPayments} onChange={set} readOnly={readOnly} />
          <AmountRow label="WHT Credits" field="whtCredits" value={fields.whtCredits} onChange={set} readOnly={readOnly} />
          <AmountRow label="Other Credits" field="otherCredits" value={fields.otherCredits} onChange={set} readOnly={readOnly} />
          <TotalRow label="Total Credits" value={preview.totalCredits} />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-primary/40">
        <CardContent className="py-4 space-y-2">
          <TotalRow label="Net Tax Payable" value={preview.netTaxPayable} bold />
          {preview.taxRefundable > 0 && (
            <TotalRow label="Tax Refundable" value={preview.taxRefundable} bold />
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <div>
        <label className="text-sm font-medium">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={readOnly}
          rows={3}
          placeholder="Optional notes…"
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60 resize-none"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-green-700 dark:text-green-400">Computation saved.</p>}

      {!readOnly && (
        <Button type="submit" disabled={isPending || !taxRule?.flatRate}>
          {isPending ? "Saving…" : "Save Computation"}
        </Button>
      )}
    </form>
  );
}

function AmountRow({
  label, field, value, onChange, readOnly,
}: {
  label: string;
  field: NumField;
  value: number;
  onChange: (f: NumField, v: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={field} className="text-sm flex-1">{label}</label>
      <input
        id={field}
        type="number"
        min="0"
        step="0.01"
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(field, e.target.value)}
        disabled={readOnly}
        placeholder="0.00"
        className="w-40 rounded-md border bg-background px-3 py-1.5 text-sm text-right font-mono disabled:opacity-60"
      />
    </div>
  );
}

function TotalRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 border-t ${bold ? "font-semibold" : ""}`}>
      <span className="text-sm">{label}</span>
      <span className="font-mono text-sm">
        ZMW {value.toLocaleString("en-ZM", { minimumFractionDigits: 2 })}
      </span>
    </div>
  );
}
