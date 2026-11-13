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
  turnover?: number | null; otherOperatingIncome?: number | null; totalRevenue?: number | null;
  costOfSales?: number | null; grossProfit?: number | null;
  adminExpenses?: number | null; sellingExpenses?: number | null; depreciation?: number | null;
  financeCharges?: number | null; otherExpenses?: number | null; totalExpenses?: number | null;
  profitBeforeTax?: number | null; taxExpense?: number | null; profitAfterTax?: number | null;
}

function Row({ name, label, value, readOnly, indent }: { name: string; label: string; value?: number | null; readOnly: boolean; indent?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-1.5 border-b last:border-0 ${indent ? "pl-4" : ""}`}>
      <Label className="flex-1 text-sm font-normal text-muted-foreground">{label}</Label>
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

function SubtotalRow({ label, value, variant = "normal" }: { label: string; value?: number | null; variant?: "normal" | "bold" }) {
  return (
    <div className={`flex items-center gap-4 py-2 rounded-sm px-2 mt-1 mb-1 ${variant === "bold" ? "bg-primary text-primary-foreground font-bold" : "bg-muted/40 font-semibold"}`}>
      <span className="flex-1 text-sm">{label}</span>
      <span className="text-sm w-36 text-right">
        {value != null ? formatCurrency(Number(value), "ZMW") : "—"}
      </span>
    </div>
  );
}

export function IncomeStatementForm({ taxReturnId, data, readOnly }: { taxReturnId: string; data: ISData | null; readOnly: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const fd = new FormData(e.currentTarget);
    try {
      await updateIncomeStatement(taxReturnId, Object.fromEntries(fd.entries()));
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  const d = data ?? {};

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Revenue</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Row name="turnover" label="Turnover / Sales Revenue" value={d.turnover} readOnly={readOnly} />
          <Row name="otherOperatingIncome" label="Other Operating Income" value={d.otherOperatingIncome} readOnly={readOnly} />
          <SubtotalRow label="Total Revenue" value={d.totalRevenue} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cost of Sales</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Row name="costOfSales" label="Cost of Sales / Cost of Goods Sold" value={d.costOfSales} readOnly={readOnly} />
          <SubtotalRow label="Gross Profit" value={d.grossProfit} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Operating Expenses</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <Row name="adminExpenses" label="Administration Expenses" value={d.adminExpenses} readOnly={readOnly} />
          <Row name="sellingExpenses" label="Selling & Distribution Expenses" value={d.sellingExpenses} readOnly={readOnly} />
          <Row name="depreciation" label="Depreciation & Amortisation (Accounting)" value={d.depreciation} readOnly={readOnly} />
          <Row name="financeCharges" label="Finance Charges / Interest" value={d.financeCharges} readOnly={readOnly} />
          <Row name="otherExpenses" label="Other Expenses" value={d.otherExpenses} readOnly={readOnly} />
          <SubtotalRow label="Total Expenses" value={d.totalExpenses} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-1">
          <SubtotalRow label="Profit / (Loss) Before Tax" value={d.profitBeforeTax} />
          {readOnly ? (
            <div className="flex items-center gap-4 py-1.5">
              <Label className="flex-1 text-sm font-normal text-muted-foreground">Income Tax Expense</Label>
              <span className="text-sm font-medium w-36 text-right">
                {d.taxExpense != null ? formatCurrency(Number(d.taxExpense), "ZMW") : "—"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-4 py-1.5">
              <Label htmlFor="taxExpense" className="flex-1 text-sm font-normal text-muted-foreground">Income Tax Expense</Label>
              <Input
                id="taxExpense"
                name="taxExpense"
                type="number"
                step="0.01"
                defaultValue={d.taxExpense != null ? Number(d.taxExpense) : ""}
                className="w-36 text-right"
                placeholder="0.00"
              />
            </div>
          )}
          <SubtotalRow label="Profit / (Loss) After Tax" value={d.profitAfterTax} variant="bold" />
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
