"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addFixedAsset } from "@/lib/actions/tax-returns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus } from "lucide-react";

const CATEGORIES = [
  { value: "INDUSTRIAL_BUILDING", label: "Industrial Building (5%)" },
  { value: "COMMERCIAL_BUILDING", label: "Commercial Building (2%)" },
  { value: "PLANT_MACHINERY", label: "Plant & Machinery (25%)" },
  { value: "MOTOR_VEHICLE", label: "Motor Vehicle (25%)" },
  { value: "COMPUTER_EQUIPMENT", label: "Computer Equipment (40%)" },
  { value: "FURNITURE_FITTINGS", label: "Furniture & Fittings (10%)" },
  { value: "OTHER", label: "Other" },
];

const DEFAULT_RATES: Record<string, number> = {
  INDUSTRIAL_BUILDING: 5,
  COMMERCIAL_BUILDING: 2,
  PLANT_MACHINERY: 25,
  MOTOR_VEHICLE: 25,
  COMPUTER_EQUIPMENT: 40,
  FURNITURE_FITTINGS: 10,
  OTHER: 0,
};

export function AddAssetForm({ taxReturnId }: { taxReturnId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("PLANT_MACHINERY");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await addFixedAsset(taxReturnId, Object.fromEntries(fd.entries()));
      if (res.success) {
        setResult(res.calculatedAllowance);
        (e.target as HTMLFormElement).reset();
        setSelectedCategory("PLANT_MACHINERY");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add asset");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        Add Asset
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Add Fixed Asset</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Input id="description" name="description" placeholder="e.g. Toyota Hilux Truck" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assetCategory">Category *</Label>
              <select
                id="assetCategory"
                name="assetCategory"
                required
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="allowanceRate">Tax Allowance Rate (%) *</Label>
              <Input
                id="allowanceRate"
                name="allowanceRate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={DEFAULT_RATES[selectedCategory] ?? 0}
                onChange={() => {}}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acquisitionCost">Acquisition Cost (ZMW) *</Label>
              <Input id="acquisitionCost" name="acquisitionCost" type="number" step="0.01" min="0" placeholder="0.00" required />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="taxWdvBrought">Tax WDV Brought Forward</Label>
              <Input id="taxWdvBrought" name="taxWdvBrought" type="number" step="0.01" min="0" defaultValue="0" placeholder="0.00" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessUsePercent">Business Use %</Label>
              <Input id="businessUsePercent" name="businessUsePercent" type="number" min="0" max="100" defaultValue="100" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="accountingDepreciation">Accounting Depreciation (ZMW)</Label>
              <Input id="accountingDepreciation" name="accountingDepreciation" type="number" step="0.01" min="0" defaultValue="0" placeholder="0.00" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acquisitionDate">Acquisition Date</Label>
              <Input id="acquisitionDate" name="acquisitionDate" type="date" />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Input id="notes" name="notes" placeholder="Optional notes" />
            </div>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>}
          {result != null && (
            <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
              Asset added — calculated allowance: ZMW {Number(result).toLocaleString("en-ZM", { minimumFractionDigits: 2 })}
            </p>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading} size="sm">
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Add Asset
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
