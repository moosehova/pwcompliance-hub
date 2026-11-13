import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default async function TaxRulesPage() {
  const rules = await prisma.taxRule.findMany({
    where: { active: true },
    orderBy: [{ taxType: "asc" }, { effectiveFrom: "desc" }],
  });

  const grouped = rules.reduce<Record<string, typeof rules>>((acc, rule) => {
    if (!acc[rule.taxType]) acc[rule.taxType] = [];
    acc[rule.taxType].push(rule);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tax Rules</h1>
        <p className="text-muted-foreground">
          Verified tax rates and thresholds. These are referenced when computing tax liabilities.
        </p>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          Tax rules must be sourced from official ZRA publications and verified before use.
          Rates shown here are <strong>not automatically applied</strong> without an active, approved rule entry.
          Contact your administrator to add or update rules.
        </span>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No tax rules configured</p>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Tax rules need to be added by an administrator before they can be referenced in computations.
            </p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([taxType, typeRules]) => (
          <Card key={taxType}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{taxType.replace(/_/g, " ")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Rule Name</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Effective From</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Effective To</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Rate</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Approved By</th>
                  </tr>
                </thead>
                <tbody>
                  {typeRules.map((rule) => (
                    <tr key={rule.id} className="border-b hover:bg-muted/20">
                      <td className="py-2.5 px-4 font-medium">{rule.name}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{formatDate(rule.effectiveFrom)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{rule.effectiveTo ? formatDate(rule.effectiveTo) : "Current"}</td>
                      <td className="py-2.5 px-4">
                        {rule.flatRate != null ? (
                          <span className="font-semibold">{Number(rule.flatRate)}%</span>
                        ) : rule.brackets ? (
                          <span className="text-muted-foreground">Graduated (see brackets)</span>
                        ) : "—"}
                      </td>
                      <td className="py-2.5 px-4">
                        {rule.isDraft ? (
                          <Badge variant="secondary">Draft</Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-300">Approved</Badge>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{rule.approvedById ? "Verified" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
