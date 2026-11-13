import { getTaxReturnById } from "@/lib/actions/tax-returns";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ComputationForm } from "./form";

export default async function ComputationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taxReturn = await getTaxReturnById(id);
  if (!taxReturn) notFound();

  const isEditable = ["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status);
  // Convert Prisma Decimal fields to plain numbers for client component
  function toNum(v: unknown): unknown {
    if (v != null && typeof v === "object" && !Array.isArray(v) && "toNumber" in v && typeof (v as { toNumber: unknown }).toNumber === "function") {
      return (v as { toNumber: () => number }).toNumber();
    }
    return v;
  }
  const rawComp = taxReturn.computation;
  const compData = rawComp
    ? Object.fromEntries(Object.entries(rawComp).map(([k, v]) => [k, toNum(v)]))
    : null;
  const pbt = taxReturn.incomeStatement?.profitBeforeTax;
  const profitBeforeTax = toNum(pbt) as number | null | undefined;

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href={`/tax/returns/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Sections C & D: Tax Computation</h1>
          <p className="text-muted-foreground">
            {taxReturn.business.tradingName ?? taxReturn.business.legalName} — {taxReturn.taxYear}
          </p>
        </div>
      </div>

      <ComputationForm
        taxReturnId={id}
        data={compData as never}
        profitBeforeTax={profitBeforeTax}
        readOnly={!isEditable}
      />
    </div>
  );
}
