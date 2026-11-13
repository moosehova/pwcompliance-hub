import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Plus, AlertTriangle, Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDate, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  PACRA: "text-blue-600 bg-blue-50",
  ZRA: "text-green-600 bg-green-50",
  NAPSA: "text-purple-600 bg-purple-50",
  NHIMA: "text-teal-600 bg-teal-50",
  PAYROLL: "text-orange-600 bg-orange-50",
  CERTIFICATE: "text-amber-600 bg-amber-50",
  RECEIPT: "text-emerald-600 bg-emerald-50",
  OTHER: "text-gray-600 bg-gray-50",
};

export default async function DocumentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/auth/signin");

  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  const businessIds = businesses.map((b) => b.id);

  const documents = await prisma.document.findMany({
    where: { businessId: { in: businessIds }, deletedAt: null },
    include: {
      business: { select: { legalName: true, tradingName: true } },
      authority: { select: { name: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const now = new Date();
  const expiringSoon = documents.filter(
    (d) => d.expiryDate && getDaysUntil(d.expiryDate) >= 0 && getDaysUntil(d.expiryDate) <= 60
  );
  const expired = documents.filter((d) => d.expiryDate && getDaysUntil(d.expiryDate) < 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Vault</h1>
          <p className="text-muted-foreground">{documents.length} documents</p>
        </div>
        <Link href="/documents/upload">
          <Button>
            <Plus className="h-4 w-4" />
            Upload Document
          </Button>
        </Link>
      </div>

      {/* Alerts */}
      {(expiringSoon.length > 0 || expired.length > 0) && (
        <div className="space-y-3">
          {expired.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-red-200 bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">
                <strong>{expired.length} document{expired.length !== 1 ? "s" : ""}</strong> have expired and may need renewal.
              </p>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">
                <strong>{expiringSoon.length} document{expiringSoon.length !== 1 ? "s" : ""}</strong> expiring in the next 60 days.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-2xl font-bold">{documents.length}</p><p className="text-xs text-muted-foreground">Total Documents</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-amber-600">{expiringSoon.length}</p><p className="text-xs text-muted-foreground">Expiring Soon</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-red-600">{expired.length}</p><p className="text-xs text-muted-foreground">Expired</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-2xl font-bold text-emerald-600">{documents.filter((d) => !d.expiryDate || getDaysUntil(d.expiryDate) > 60).length}</p><p className="text-xs text-muted-foreground">Valid</p></CardContent></Card>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold">No documents yet</h3>
            <p className="text-muted-foreground mb-4">Upload compliance documents, certificates, and receipts.</p>
            <Link href="/documents/upload">
              <Button><Plus className="h-4 w-4" />Upload Document</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {documents.map((doc) => {
                const daysLeft = doc.expiryDate ? getDaysUntil(doc.expiryDate) : null;
                const isExpired = daysLeft !== null && daysLeft < 0;
                const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 60;
                const catColor = CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.OTHER;
                return (
                  <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors">
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", catColor)}>
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{doc.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {doc.business.tradingName ?? doc.business.legalName}
                        {doc.authority ? ` · ${doc.authority.name}` : ""}
                        {doc.periodLabel ? ` · ${doc.periodLabel}` : ""}
                        {" · "}Uploaded by {doc.uploadedBy.name} on {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="outline" className="text-xs">{doc.category.replace(/_/g, " ")}</Badge>
                      {doc.expiryDate && (
                        <div className="text-right">
                          <p className={cn("text-xs font-medium", isExpired ? "text-red-600" : isExpiringSoon ? "text-amber-600" : "text-emerald-600")}>
                            {isExpired
                              ? `Expired ${Math.abs(daysLeft!)}d ago`
                              : `Expires in ${daysLeft!}d`}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatDate(doc.expiryDate)}</p>
                        </div>
                      )}
                      <a href={`/api/vault/${doc.id}/download`} title="Download">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
