"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateIncomeStatement } from "@/lib/actions/tax-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ISData {
  turnover?: number | null; otherOperatingIncome?: number | null;
  costOfSales?: number | null; adminExpenses?: number | null; sellingExpenses?: number | null;
  depreciation?: number | null; financeCharges?: number | null; otherExpenses?: number | null;
  taxExpense?: number | null;
}

function n(v: number | null | undefined): number { return v ?? 0; }

function AmountRow({ name, label, value, readOnly, onChange, indent }: {
  name: string; label: string; value: number; readOnly: boolean;
  onChange: (v: number) => void; indent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-4 py-1.5 border-b last:border-0 ${indent ? "pl-4" : ""}`}>
      <Label className="flex-1 text-sm font-normal text-muted-foreground">{label}</Label>
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

function SubtotalRow({ label, value, variant = "normal" }: {
  label: string; value: number; variant?: "normal" | "bold";
}) {
  return (
    <div className={`flex items-center gap-4 py-2 rounded-sm px-2 mt-1 mb-1 ${
      variant === "bold" ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 font-semibold"
    }`}>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-sm w-36 text-right">{formatCurrency(value, "ZMW")}</span>
    </div>
  );
}

export function IncomeStatementForm({ taxReturnId, data, readOnly }: {
  taxReturnId: string; data: ISData | null; readOnly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [vals, setVals] = useState({
    turnover: n(data?.turnover),
    otherOperatingIncome: n(data?.otherOperatingIncome),
    costOfSales: n(data?.costOfSales),
    adminExpenses: n(data?.adminExpenses),
    sellingExpenses: n(data?.sellingExpenses),
    depreciation: n(data?.depreciation),
    financeCharges: n(data?.financeCharges),
    otherExpenses: n(data?.otherExpenses),
    taxExpense: n(data?.taxExpense),
  });

  const set = (name: keyof typeof vals, v: number) => setVals((prev) => ({ ...prev, [name]: v }));

  // Live computed totals
  const totalRevenue = vals.turnover + vals.otherOperatingIncome;
  const grossProfit = totalRevenue - vals.costOfSales;
  const totalExpenses = vals.adminExpenses + vals.sellingExpenses + vals.depreciation + vals.financeCharges + vals.otherExpenses;
  const profitBeforeTax = grossProfit - totalExpenses;
  const profitAfterTax = profitBeforeTax - vals.taxExpense;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await updateIncomeStatement(taxReturnId, vals);
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Revenue</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="turnover" label="Turnover / Sales Revenue" value={vals.turnover} readOnly={readOnly} onChange={(v) => set("turnover", v)} />
          <AmountRow name="otherOperatingIncome" label="Other Operating Income" value={vals.otherOperatingIncome} readOnly={readOnly} onChange={(v) => set("otherOperatingIncome", v)} />
          <SubtotalRow label="Total Revenue" value={totalRevenue} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Cost of Sales</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="costOfSales" label="Cost of Sales / Cost of Goods Sold" value={vals.costOfSales} readOnly={readOnly} onChange={(v) => set("costOfSales", v)} />
          <SubtotalRow label="Gross Profit" value={grossProfit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Operating Expenses</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="adminExpenses" label="Administration Expenses" value={vals.adminExpenses} readOnly={readOnly} onChange={(v) => set("adminExpenses", v)} />
          <AmountRow name="sellingExpenses" label="Selling & Distribution Expenses" value={vals.sellingExpenses} readOnly={readOnly} onChange={(v) => set("sellingExpenses", v)} />
          <AmountRow name="depreciation" label="Depreciation & Amortisation (Accounting)" value={vals.depreciation} readOnly={readOnly} onChange={(v) => set("depreciation", v)} />
          <AmountRow name="financeCharges" label="Finance Charges / Interest" value={vals.financeCharges} readOnly={readOnly} onChange={(v) => set("financeCharges", v)} />
          <AmountRow name="otherExpenses" label="Other Expenses" value={vals.otherExpenses} readOnly={readOnly} onChange={(v) => set("otherExpenses", v)} />
          <SubtotalRow label="Total Expenses" value={totalExpenses} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <SubtotalRow label="Profit / (Loss) Before Tax" value={profitBeforeTax} />
          <AmountRow name="taxExpense" label="Income Tax Expense" value={vals.taxExpense} readOnly={readOnly} onChange={(v) => set("taxExpense", v)} />
          <SubtotalRow label="Profit / (Loss) After Tax" value={profitAfterTax} variant="bold" />
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Income Statement
          </Button>
          {success && <span className="text-sm text-green-600">Saved — computation profit updated</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      )}
    </form>
  );
}
