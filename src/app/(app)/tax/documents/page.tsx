import { prisma } from "@/lib/prisma";
import { getOrgContext } from "@/lib/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default async function TaxDocumentsPage() {
  const { orgId } = await getOrgContext();

  const documents = await prisma.taxReturnDocument.findMany({
    where: {
      taxReturn: { organizationId: orgId, deletedAt: null },
      deletedAt: null,
    },
    include: {
      taxReturn: {
        select: {
          taxType: true,
          taxYear: true,
          business: { select: { legalName: true, tradingName: true } },
        },
      },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Documents</h1>
        <p className="text-muted-foreground">{documents.length} document{documents.length !== 1 ? "s" : ""} across all returns</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="font-medium">No documents yet</p>
              <p className="text-sm text-muted-foreground">Documents attached to tax returns will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Document</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Return</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Uploaded By</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Date</th>
                    <th className="py-3 px-4" />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b hover:bg-muted/20">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{doc.name}</span>
                        </div>
                        {doc.description && <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {doc.taxReturn.business.tradingName ?? doc.taxReturn.business.legalName} ·{" "}
                        {doc.taxReturn.taxType.replace(/_/g, " ")} {doc.taxReturn.taxYear}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">{doc.category}</Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{doc.uploadedBy?.name ?? "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatDate(doc.createdAt)}</td>
                      <td className="py-3 px-4">
                        <Link href={`/tax/returns/${doc.taxReturnId}`}>
                          <Button variant="ghost" size="sm">View Return</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
