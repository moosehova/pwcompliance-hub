import { getTaxReturnById } from "@/lib/actions/tax-returns";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BalanceSheetForm } from "./form";

export default async function BalanceSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taxReturn = await getTaxReturnById(id);
  if (!taxReturn) notFound();

  const isEditable = ["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status);
  function toNum(v: unknown): unknown {
    if (v != null && typeof v === "object" && !Array.isArray(v) && "toNumber" in v && typeof (v as { toNumber: unknown }).toNumber === "function") {
      return (v as { toNumber: () => number }).toNumber();
    }
    return v;
  }
  const rawBs = taxReturn.balanceSheet;
  const bs = rawBs
    ? Object.fromEntries(Object.entries(rawBs).map(([k, v]) => [k, toNum(v)]))
    : null;

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href={`/tax/returns/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Section A: Balance Sheet</h1>
          <p className="text-muted-foreground">
            {taxReturn.business.tradingName ?? taxReturn.business.legalName} — {taxReturn.taxYear}
          </p>
        </div>
      </div>

      <BalanceSheetForm taxReturnId={id} data={bs as never} readOnly={!isEditable} />
    </div>
  );
}
