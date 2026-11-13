"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateBalanceSheet } from "@/lib/actions/tax-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface BSData {
  ppe?: number | null; intangibleAssets?: number | null; longTermInvestments?: number | null;
  otherNonCurrentAssets?: number | null; totalNonCurrentAssets?: number | null;
  inventory?: number | null; tradeReceivables?: number | null; otherReceivables?: number | null;
  cashAndBank?: number | null; otherCurrentAssets?: number | null; totalCurrentAssets?: number | null;
  totalAssets?: number | null;
  tradePayables?: number | null; taxLiabilitiesCurrent?: number | null; currentBorrowings?: number | null;
  otherCurrentLiabilities?: number | null; totalCurrentLiabilities?: number | null;
  longTermBorrowings?: number | null; deferredTax?: number | null; otherNonCurrentLiabilities?: number | null;
  totalNonCurrentLiabilities?: number | null; totalLiabilities?: number | null;
  shareCapital?: number | null; sharePremium?: number | null; retainedEarnings?: number | null;
  otherEquity?: number | null; totalEquity?: number | null; totalLiabilitiesAndEquity?: number | null;
}

function AmountInput({ name, label, defaultValue, readOnly }: { name: string; label: string; defaultValue?: number | null; readOnly: boolean }) {
  return (
    <div className="flex items-center gap-4 py-1.5 border-b last:border-0">
      <Label className="flex-1 text-sm font-normal text-muted-foreground">{label}</Label>
      {readOnly ? (
        <span className="text-sm font-medium w-36 text-right">
          {defaultValue != null ? formatCurrency(Number(defaultValue), "ZMW") : "—"}
        </span>
      ) : (
        <Input
          name={name}
          type="number"
          step="0.01"
          defaultValue={defaultValue != null ? Number(defaultValue) : ""}
          className="w-36 text-right"
          placeholder="0.00"
        />
      )}
    </div>
  );
}

function SubtotalRow({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="flex items-center gap-4 py-1.5 bg-muted/40 rounded-sm px-2 mt-1">
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <span className="text-sm font-semibold w-36 text-right">
        {value != null ? formatCurrency(Number(value), "ZMW") : "—"}
      </span>
    </div>
  );
}

export function BalanceSheetForm({ taxReturnId, data, readOnly }: { taxReturnId: string; data: BSData | null; readOnly: boolean }) {
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
    const formData = Object.fromEntries(fd.entries());
    try {
      await updateBalanceSheet(taxReturnId, formData);
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
      {/* Non-Current Assets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Non-Current Assets</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <AmountInput name="ppe" label="Property, Plant & Equipment (Net)" defaultValue={d.ppe} readOnly={readOnly} />
          <AmountInput name="intangibleAssets" label="Intangible Assets" defaultValue={d.intangibleAssets} readOnly={readOnly} />
          <AmountInput name="longTermInvestments" label="Long-Term Investments" defaultValue={d.longTermInvestments} readOnly={readOnly} />
          <AmountInput name="otherNonCurrentAssets" label="Other Non-Current Assets" defaultValue={d.otherNonCurrentAssets} readOnly={readOnly} />
          <SubtotalRow label="Total Non-Current Assets" value={d.totalNonCurrentAssets} />
        </CardContent>
      </Card>

      {/* Current Assets */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current Assets</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <AmountInput name="inventory" label="Inventory" defaultValue={d.inventory} readOnly={readOnly} />
          <AmountInput name="tradeReceivables" label="Trade & Other Receivables" defaultValue={d.tradeReceivables} readOnly={readOnly} />
          <AmountInput name="otherReceivables" label="Other Receivables" defaultValue={d.otherReceivables} readOnly={readOnly} />
          <AmountInput name="cashAndBank" label="Cash & Bank Balances" defaultValue={d.cashAndBank} readOnly={readOnly} />
          <AmountInput name="otherCurrentAssets" label="Other Current Assets" defaultValue={d.otherCurrentAssets} readOnly={readOnly} />
          <SubtotalRow label="Total Current Assets" value={d.totalCurrentAssets} />
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="text-base font-bold">TOTAL ASSETS</span>
          <span className="text-base font-bold">{d.totalAssets != null ? formatCurrency(Number(d.totalAssets), "ZMW") : "—"}</span>
        </CardContent>
      </Card>

      {/* Current Liabilities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Current Liabilities</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <AmountInput name="tradePayables" label="Trade & Other Payables" defaultValue={d.tradePayables} readOnly={readOnly} />
          <AmountInput name="taxLiabilitiesCurrent" label="Current Tax Liabilities" defaultValue={d.taxLiabilitiesCurrent} readOnly={readOnly} />
          <AmountInput name="currentBorrowings" label="Current Borrowings" defaultValue={d.currentBorrowings} readOnly={readOnly} />
          <AmountInput name="otherCurrentLiabilities" label="Other Current Liabilities" defaultValue={d.otherCurrentLiabilities} readOnly={readOnly} />
          <SubtotalRow label="Total Current Liabilities" value={d.totalCurrentLiabilities} />
        </CardContent>
      </Card>

      {/* Non-Current Liabilities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Non-Current Liabilities</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <AmountInput name="longTermBorrowings" label="Long-Term Borrowings" defaultValue={d.longTermBorrowings} readOnly={readOnly} />
          <AmountInput name="deferredTax" label="Deferred Tax" defaultValue={d.deferredTax} readOnly={readOnly} />
          <AmountInput name="otherNonCurrentLiabilities" label="Other Non-Current Liabilities" defaultValue={d.otherNonCurrentLiabilities} readOnly={readOnly} />
          <SubtotalRow label="Total Non-Current Liabilities" value={d.totalNonCurrentLiabilities} />
        </CardContent>
      </Card>

      {/* Equity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Equity</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          <AmountInput name="shareCapital" label="Share Capital" defaultValue={d.shareCapital} readOnly={readOnly} />
          <AmountInput name="sharePremium" label="Share Premium" defaultValue={d.sharePremium} readOnly={readOnly} />
          <AmountInput name="retainedEarnings" label="Retained Earnings / (Losses)" defaultValue={d.retainedEarnings} readOnly={readOnly} />
          <AmountInput name="otherEquity" label="Other Equity Components" defaultValue={d.otherEquity} readOnly={readOnly} />
          <SubtotalRow label="Total Equity" value={d.totalEquity} />
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="text-base font-bold">TOTAL LIABILITIES AND EQUITY</span>
          <span className="text-base font-bold">{d.totalLiabilitiesAndEquity != null ? formatCurrency(Number(d.totalLiabilitiesAndEquity), "ZMW") : "—"}</span>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Balance Sheet
          </Button>
          {success && <span className="text-sm text-green-600">Saved successfully</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      )}
    </form>
  );
}
