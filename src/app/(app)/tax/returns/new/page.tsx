"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTaxReturn } from "@/lib/actions/tax-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

const TAX_TYPES = [
  { value: "COMPANY_INCOME_TAX", label: "Company Income Tax (CIT)" },
  { value: "TURNOVER_TAX", label: "Turnover Tax" },
  { value: "VAT", label: "Value Added Tax (VAT)" },
  { value: "PAYE", label: "Pay As You Earn (PAYE)" },
  { value: "WITHHOLDING_TAX", label: "Withholding Tax" },
];

export default function NewTaxReturnPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; legalName: string; tradingName: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/businesses")
      .then((r) => r.json())
      .then(setBusinesses)
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    try {
      const result = await createTaxReturn(data);
      if (result.success) {
        router.push(`/tax/returns/${result.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create return");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/tax/returns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Tax Return</h1>
          <p className="text-muted-foreground">Create a new tax return for preparation</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Return Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="businessId">Business *</Label>
              <select
                id="businessId"
                name="businessId"
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select business…</option>
                {businesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.tradingName ?? b.legalName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxType">Tax Type *</Label>
              <select
                id="taxType"
                name="taxType"
                required
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select type…</option>
                {TAX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxYear">Tax Year *</Label>
              <Input
                id="taxYear"
                name="taxYear"
                type="number"
                min="2000"
                max="2100"
                defaultValue={new Date().getFullYear()}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="periodStart">Period Start *</Label>
                <Input id="periodStart" name="periodStart" type="date" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="periodEnd">Period End *</Label>
                <Input id="periodEnd" name="periodEnd" type="date" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="financialYearStart">Financial Year Start</Label>
                <Input id="financialYearStart" name="financialYearStart" type="date" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="financialYearEnd">Financial Year End</Label>
                <Input id="financialYearEnd" name="financialYearEnd" type="date" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Any notes about this return…"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Return
              </Button>
              <Link href="/tax/returns">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
