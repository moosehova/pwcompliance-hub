import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getOrgContext } from "@/lib/session";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Upload } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { TaxDocumentUpload } from "./document-upload";

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function TaxReturnDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user?.id) notFound();

  const ctx = await getOrgContext();

  const taxReturn = await prisma.taxReturn.findFirst({
    where: { id, organizationId: ctx.orgId },
    select: { id: true, status: true, businessId: true },
  });
  if (!taxReturn) notFound();

  const documents = await prisma.taxReturnDocument.findMany({
    where: { taxReturnId: id, organizationId: ctx.orgId, deletedAt: null, versionOf: null },
    include: {
      uploadedBy: { select: { name: true } },
      versions: {
        where: { deletedAt: null },
        orderBy: { versionNumber: "desc" },
        select: { id: true, versionNumber: true, createdAt: true, uploadedBy: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const isEditable = ["DRAFT", "CHANGES_REQUESTED"].includes(taxReturn.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Supporting Documents</h2>
          <p className="text-sm text-muted-foreground">{documents.length} document{documents.length !== 1 ? "s" : ""} · stored privately</p>
        </div>
      </div>

      {isEditable && (
        <TaxDocumentUpload taxReturnId={id} businessId={taxReturn.businessId} />
      )}

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="font-medium">No documents yet</h3>
            <p className="text-sm text-muted-foreground">Upload supporting documents for this tax return.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {documents.map((doc) => {
                const latestId = doc.versions.length > 0 ? doc.versions[0].id : doc.id;
                const latestVersion = doc.versions.length > 0 ? doc.versions[0].versionNumber : doc.versionNumber;
                return (
                  <div key={doc.id} className="p-4">
                    <div className="flex items-start gap-3">
                      <FileText className="h-9 w-9 text-primary bg-primary/10 rounded-lg p-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.category.replace(/_/g, " ")}
                          {doc.mimeType ? ` · ${doc.mimeType.split("/")[1]?.toUpperCase()}` : ""}
                          {doc.size ? ` · ${formatBytes(doc.size)}` : ""}
                          {" · "}Uploaded by {doc.uploadedBy.name} on {formatDate(doc.createdAt)}
                        </p>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                        )}
                        {/* Version history */}
                        {doc.versions.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {doc.versions.slice(0, 3).map((v) => (
                              <a key={v.id} href={`/api/vault/${v.id}/download`} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                v{v.versionNumber}
                              </a>
                            ))}
                            {doc.versions.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{doc.versions.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {latestVersion > 1 && (
                          <Badge variant="outline" className="text-xs">v{latestVersion}</Badge>
                        )}
                        <a href={`/api/vault/${latestId}/download`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download latest version">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      </div>
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
