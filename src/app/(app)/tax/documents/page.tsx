import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { TaxVaultFilters } from "./vault-filters";

const CATEGORY_LABELS: Record<string, string> = {
  BANK_STATEMENTS:          "Bank Statements",
  FINANCIAL_STATEMENTS:     "Financial Statements",
  TRIAL_BALANCES:           "Trial Balances",
  INVOICES_AND_RECEIPTS:    "Invoices & Receipts",
  TAX_CERTIFICATES:         "Tax Certificates",
  CAPITAL_ALLOWANCE_SCHEDULES: "Capital Allowance Schedules",
  PAYROLL_RECORDS:          "Payroll Records",
  ZRA_CORRESPONDENCE:       "ZRA Correspondence",
  PACRA_DOCUMENTS:          "PACRA Documents",
  NAPSA_DOCUMENTS:          "NAPSA Documents",
  NHIMA_DOCUMENTS:          "NHIMA Documents",
  OTHER_SUPPORTING:         "Other Supporting",
};

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TaxVaultPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; taxYear?: string }>;
}) {
  const { orgId } = await getOrgContext();
  const sp = await searchParams;

  const whereBase = {
    organizationId: orgId,
    deletedAt: null as null,
    versionOf: null as null,
  };

  const documents = await prisma.taxReturnDocument.findMany({
    where: {
      ...whereBase,
      ...(sp.category ? { category: sp.category as never } : {}),
      ...(sp.taxYear ? { taxYear: parseInt(sp.taxYear) } : {}),
      ...(sp.q ? { name: { contains: sp.q, mode: "insensitive" as const } } : {}),
    },
    include: {
      taxReturn: {
        select: {
          id: true,
          taxType: true,
          taxYear: true,
          business: { select: { legalName: true, tradingName: true } },
        },
      },
      uploadedBy: { select: { name: true } },
      versions: {
        where: { deletedAt: null },
        orderBy: { versionNumber: "desc" },
        select: { id: true, versionNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Distinct tax years for filter
  const allYears = await prisma.taxReturnDocument.groupBy({
    by: ["taxYear"],
    where: { organizationId: orgId, deletedAt: null, taxYear: { not: null } },
    orderBy: { taxYear: "desc" },
  });
  const taxYears = allYears.map((r) => r.taxYear).filter(Boolean) as number[];

  const totalByCategory: Record<string, number> = {};
  for (const doc of documents) {
    totalByCategory[doc.category] = (totalByCategory[doc.category] ?? 0) + 1;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tax Document Vault</h1>
          <p className="text-muted-foreground">
            {documents.length} document{documents.length !== 1 ? "s" : ""}
            {sp.q ? ` matching "${sp.q}"` : ""}
            {sp.category ? ` · ${CATEGORY_LABELS[sp.category] ?? sp.category}` : ""}
            {sp.taxYear ? ` · ${sp.taxYear}` : ""}
          </p>
        </div>
      </div>

      <TaxVaultFilters taxYears={taxYears} />

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No documents found</h3>
            <p className="text-muted-foreground text-sm">
              {sp.q || sp.category || sp.taxYear
                ? "Try adjusting your filters."
                : "Documents attached to tax returns will appear here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Document</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Tax Return</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Year</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Uploaded</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documents.map((doc) => {
                    const latestId =
                      doc.versions.length > 0 ? doc.versions[0].id : doc.id;
                    const latestVersion =
                      doc.versions.length > 0
                        ? doc.versions[0].versionNumber
                        : doc.versionNumber;
                    return (
                      <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium truncate max-w-[240px]">{doc.name}</p>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                                  {doc.description}
                                </p>
                              )}
                              {doc.size ? (
                                <p className="text-xs text-muted-foreground">{formatBytes(doc.size)}</p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <Link
                            href={`/tax/returns/${doc.taxReturn.id}`}
                            className="hover:text-foreground hover:underline"
                          >
                            {doc.taxReturn.business.tradingName ?? doc.taxReturn.business.legalName}
                          </Link>
                          <p className="text-xs">
                            {doc.taxReturn.taxType.replace(/_/g, " ")} {doc.taxReturn.taxYear}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-xs whitespace-nowrap">
                            {CATEGORY_LABELS[doc.category] ?? doc.category}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {doc.taxYear ?? doc.taxReturn.taxYear}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          <span>{doc.uploadedBy?.name ?? "—"}</span>
                          <p className="text-xs">{formatDate(doc.createdAt)}</p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            {latestVersion > 1 && (
                              <Badge variant="secondary" className="text-xs">v{latestVersion}</Badge>
                            )}
                            <a href={`/api/vault/tax/${latestId}/download`} title="Download">
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Download className="h-4 w-4" />
                              </Button>
                            </a>
                            <Link href={`/tax/returns/${doc.taxReturn.id}/documents`}>
                              <Button variant="ghost" size="sm" className="h-8 text-xs">
                                View Return
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
