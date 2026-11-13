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
  otherNonCurrentAssets?: number | null; inventory?: number | null; tradeReceivables?: number | null;
  otherReceivables?: number | null; cashAndBank?: number | null; otherCurrentAssets?: number | null;
  tradePayables?: number | null; taxLiabilitiesCurrent?: number | null; currentBorrowings?: number | null;
  otherCurrentLiabilities?: number | null; longTermBorrowings?: number | null; deferredTax?: number | null;
  otherNonCurrentLiabilities?: number | null; shareCapital?: number | null; sharePremium?: number | null;
  retainedEarnings?: number | null; otherEquity?: number | null;
}

type Vals = Record<string, number>;

function n(v: number | null | undefined): number { return v ?? 0; }

function AmountRow({
  name, label, value, readOnly, onChange,
}: {
  name: string; label: string; value: number; readOnly: boolean; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-1.5 border-b last:border-0">
      <Label className="flex-1 text-sm font-normal text-muted-foreground">{label}</Label>
      {readOnly ? (
        <span className="text-sm font-medium w-36 text-right">
          {formatCurrency(value, "ZMW")}
        </span>
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

function SubtotalRow({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center gap-4 py-1.5 rounded-sm px-2 mt-1 ${bold ? "bg-primary text-primary-foreground" : "bg-muted/40"}`}>
      <span className={`flex-1 text-sm ${bold ? "font-bold" : "font-semibold"}`}>{label}</span>
      <span className={`text-sm w-36 text-right ${bold ? "font-bold" : "font-semibold"}`}>
        {formatCurrency(value, "ZMW")}
      </span>
    </div>
  );
}

export function BalanceSheetForm({ taxReturnId, data, readOnly }: {
  taxReturnId: string; data: BSData | null; readOnly: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [vals, setVals] = useState<Vals>({
    ppe: n(data?.ppe), intangibleAssets: n(data?.intangibleAssets),
    longTermInvestments: n(data?.longTermInvestments), otherNonCurrentAssets: n(data?.otherNonCurrentAssets),
    inventory: n(data?.inventory), tradeReceivables: n(data?.tradeReceivables),
    otherReceivables: n(data?.otherReceivables), cashAndBank: n(data?.cashAndBank),
    otherCurrentAssets: n(data?.otherCurrentAssets),
    tradePayables: n(data?.tradePayables), taxLiabilitiesCurrent: n(data?.taxLiabilitiesCurrent),
    currentBorrowings: n(data?.currentBorrowings), otherCurrentLiabilities: n(data?.otherCurrentLiabilities),
    longTermBorrowings: n(data?.longTermBorrowings), deferredTax: n(data?.deferredTax),
    otherNonCurrentLiabilities: n(data?.otherNonCurrentLiabilities),
    shareCapital: n(data?.shareCapital), sharePremium: n(data?.sharePremium),
    retainedEarnings: n(data?.retainedEarnings), otherEquity: n(data?.otherEquity),
  });

  const set = (name: string, v: number) => setVals((prev) => ({ ...prev, [name]: v }));

  // Live computed totals
  const totalNCA = vals.ppe + vals.intangibleAssets + vals.longTermInvestments + vals.otherNonCurrentAssets;
  const totalCA = vals.inventory + vals.tradeReceivables + vals.otherReceivables + vals.cashAndBank + vals.otherCurrentAssets;
  const totalAssets = totalNCA + totalCA;
  const totalCL = vals.tradePayables + vals.taxLiabilitiesCurrent + vals.currentBorrowings + vals.otherCurrentLiabilities;
  const totalNCL = vals.longTermBorrowings + vals.deferredTax + vals.otherNonCurrentLiabilities;
  const totalLiabilities = totalCL + totalNCL;
  const totalEquity = vals.shareCapital + vals.sharePremium + vals.retainedEarnings + vals.otherEquity;
  const totalLE = totalLiabilities + totalEquity;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await updateBalanceSheet(taxReturnId, vals);
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
        <CardHeader className="pb-2"><CardTitle className="text-base">Non-Current Assets</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="ppe" label="Property, Plant & Equipment (Net)" value={vals.ppe} readOnly={readOnly} onChange={(v) => set("ppe", v)} />
          <AmountRow name="intangibleAssets" label="Intangible Assets" value={vals.intangibleAssets} readOnly={readOnly} onChange={(v) => set("intangibleAssets", v)} />
          <AmountRow name="longTermInvestments" label="Long-Term Investments" value={vals.longTermInvestments} readOnly={readOnly} onChange={(v) => set("longTermInvestments", v)} />
          <AmountRow name="otherNonCurrentAssets" label="Other Non-Current Assets" value={vals.otherNonCurrentAssets} readOnly={readOnly} onChange={(v) => set("otherNonCurrentAssets", v)} />
          <SubtotalRow label="Total Non-Current Assets" value={totalNCA} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Current Assets</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="inventory" label="Inventory" value={vals.inventory} readOnly={readOnly} onChange={(v) => set("inventory", v)} />
          <AmountRow name="tradeReceivables" label="Trade & Other Receivables" value={vals.tradeReceivables} readOnly={readOnly} onChange={(v) => set("tradeReceivables", v)} />
          <AmountRow name="otherReceivables" label="Other Receivables" value={vals.otherReceivables} readOnly={readOnly} onChange={(v) => set("otherReceivables", v)} />
          <AmountRow name="cashAndBank" label="Cash & Bank Balances" value={vals.cashAndBank} readOnly={readOnly} onChange={(v) => set("cashAndBank", v)} />
          <AmountRow name="otherCurrentAssets" label="Other Current Assets" value={vals.otherCurrentAssets} readOnly={readOnly} onChange={(v) => set("otherCurrentAssets", v)} />
          <SubtotalRow label="Total Current Assets" value={totalCA} />
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="text-base font-bold">TOTAL ASSETS</span>
          <span className="text-base font-bold">{formatCurrency(totalAssets, "ZMW")}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Current Liabilities</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="tradePayables" label="Trade & Other Payables" value={vals.tradePayables} readOnly={readOnly} onChange={(v) => set("tradePayables", v)} />
          <AmountRow name="taxLiabilitiesCurrent" label="Current Tax Liabilities" value={vals.taxLiabilitiesCurrent} readOnly={readOnly} onChange={(v) => set("taxLiabilitiesCurrent", v)} />
          <AmountRow name="currentBorrowings" label="Current Borrowings" value={vals.currentBorrowings} readOnly={readOnly} onChange={(v) => set("currentBorrowings", v)} />
          <AmountRow name="otherCurrentLiabilities" label="Other Current Liabilities" value={vals.otherCurrentLiabilities} readOnly={readOnly} onChange={(v) => set("otherCurrentLiabilities", v)} />
          <SubtotalRow label="Total Current Liabilities" value={totalCL} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Non-Current Liabilities</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="longTermBorrowings" label="Long-Term Borrowings" value={vals.longTermBorrowings} readOnly={readOnly} onChange={(v) => set("longTermBorrowings", v)} />
          <AmountRow name="deferredTax" label="Deferred Tax" value={vals.deferredTax} readOnly={readOnly} onChange={(v) => set("deferredTax", v)} />
          <AmountRow name="otherNonCurrentLiabilities" label="Other Non-Current Liabilities" value={vals.otherNonCurrentLiabilities} readOnly={readOnly} onChange={(v) => set("otherNonCurrentLiabilities", v)} />
          <SubtotalRow label="Total Non-Current Liabilities" value={totalNCL} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Equity</CardTitle></CardHeader>
        <CardContent className="px-4">
          <AmountRow name="shareCapital" label="Share Capital" value={vals.shareCapital} readOnly={readOnly} onChange={(v) => set("shareCapital", v)} />
          <AmountRow name="sharePremium" label="Share Premium" value={vals.sharePremium} readOnly={readOnly} onChange={(v) => set("sharePremium", v)} />
          <AmountRow name="retainedEarnings" label="Retained Earnings / (Losses)" value={vals.retainedEarnings} readOnly={readOnly} onChange={(v) => set("retainedEarnings", v)} />
          <AmountRow name="otherEquity" label="Other Equity Components" value={vals.otherEquity} readOnly={readOnly} onChange={(v) => set("otherEquity", v)} />
          <SubtotalRow label="Total Equity" value={totalEquity} />
        </CardContent>
      </Card>

      <Card className="border-primary">
        <CardContent className="p-4 flex justify-between items-center">
          <span className="text-base font-bold">TOTAL LIABILITIES AND EQUITY</span>
          <span className="text-base font-bold">{formatCurrency(totalLE, "ZMW")}</span>
        </CardContent>
      </Card>

      {totalAssets !== 0 && totalLE !== 0 && totalAssets !== totalLE && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Balance sheet does not balance: Assets ({formatCurrency(totalAssets, "ZMW")}) ≠ Liabilities + Equity ({formatCurrency(totalLE, "ZMW")})
        </div>
      )}

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
