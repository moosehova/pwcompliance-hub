import { getTaxReturnById } from "@/lib/actions/tax-returns";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddAssetForm } from "./add-asset-form";
import { DeleteAssetButton } from "./delete-asset-button";

const CATEGORY_LABELS: Record<string, string> = {
  INDUSTRIAL_BUILDING: "Industrial Building",
  COMMERCIAL_BUILDING: "Commercial Building",
  PLANT_MACHINERY: "Plant & Machinery",
  MOTOR_VEHICLE: "Motor Vehicle",
  COMPUTER_EQUIPMENT: "Computer Equipment",
  FURNITURE_FITTINGS: "Furniture & Fittings",
  OTHER: "Other",
};

export default async function AssetsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taxReturn = await getTaxReturnById(id);
  if (!taxReturn) notFound();

  const isEditable = ["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status);
  const assets = taxReturn.fixedAssets;
  const totalAllowances = assets.reduce((sum, a) => sum + Number(a.calculatedAllowance), 0);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/tax/returns/${id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Section D: Fixed Asset Register</h1>
            <p className="text-muted-foreground">
              {taxReturn.business.tradingName ?? taxReturn.business.legalName} — {taxReturn.taxYear}
            </p>
          </div>
        </div>
      </div>

      {/* Important note */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Note:</strong> This schedule computes <em>tax capital allowances</em> under the Income Tax Act.
        These are distinct from accounting depreciation (Section B) and must not be mixed.
        Enter the tax written-down value (WDV) brought forward, not the accounting net book value.
      </div>

      {/* Summary */}
      {assets.length > 0 && (
        <Card className="border-primary">
          <CardContent className="p-4 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Tax Capital Allowances</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAllowances, "ZMW")}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Carry this total to Section C → Capital Allowances deduction
            </p>
          </CardContent>
        </Card>
      )}

      {/* Assets table */}
      {assets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Assets ({assets.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Description</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Category</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Acquisition Cost</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">WDV B/F</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Rate</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Allowance</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">WDV C/F</th>
                    <th className="text-right py-2.5 px-4 font-medium text-muted-foreground">Acctg Dep.</th>
                    {isEditable && <th className="py-2.5 px-4" />}
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id} className="border-b hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-medium">{a.description}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{CATEGORY_LABELS[a.assetCategory] ?? a.assetCategory}</td>
                      <td className="py-2.5 px-4 text-right">{formatCurrency(Number(a.acquisitionCost), "ZMW")}</td>
                      <td className="py-2.5 px-4 text-right">{formatCurrency(Number(a.taxWdvBrought), "ZMW")}</td>
                      <td className="py-2.5 px-4 text-right">{Number(a.allowanceRate)}%</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-green-700">{formatCurrency(Number(a.calculatedAllowance), "ZMW")}</td>
                      <td className="py-2.5 px-4 text-right">{formatCurrency(Number(a.taxWdvCarried), "ZMW")}</td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground">{formatCurrency(Number(a.accountingDepreciation), "ZMW")}</td>
                      {isEditable && (
                        <td className="py-2.5 px-4">
                          <DeleteAssetButton assetId={a.id} />
                        </td>
                      )}
                    </tr>
                  ))}
                  <tr className="bg-muted/40 font-semibold">
                    <td className="py-2.5 px-4" colSpan={5}>Totals</td>
                    <td className="py-2.5 px-4 text-right text-green-700">{formatCurrency(totalAllowances, "ZMW")}</td>
                    <td className="py-2.5 px-4 text-right">
                      {formatCurrency(assets.reduce((s, a) => s + Number(a.taxWdvCarried), 0), "ZMW")}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {formatCurrency(assets.reduce((s, a) => s + Number(a.accountingDepreciation), 0), "ZMW")}
                    </td>
                    {isEditable && <td />}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add asset form */}
      {isEditable && <AddAssetForm taxReturnId={id} />}

      {!isEditable && assets.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No fixed assets recorded for this return
          </CardContent>
        </Card>
      )}
    </div>
  );
}
