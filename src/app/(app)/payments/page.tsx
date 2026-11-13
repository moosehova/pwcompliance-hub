import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { redirect } from "next/navigation";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const membership = await prisma.organizationMember.findFirst({ where: { userId: session.user.id } });
  if (!membership) redirect("/auth/signin");

  const businesses = await prisma.business.findMany({
    where: { organizationId: membership.organizationId, deletedAt: null },
    select: { id: true },
  });
  const businessIds = businesses.map((b) => b.id);

  const payments = await prisma.payment.findMany({
    where: { businessId: { in: businessIds } },
    include: {
      authority: true,
      business: { select: { legalName: true, tradingName: true } },
      obligation: { select: { title: true, periodLabel: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalPaid = payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = payments.filter((p) => p.status === "PENDING").reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">All statutory payments recorded</p>
        </div>
        <Link href="/payments/new">
          <Button>
            <Plus className="h-4 w-4" />
            Record Payment
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-muted-foreground">Pending Payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{payments.length}</p>
            <p className="text-xs text-muted-foreground">Total Records</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments recorded yet.</p>
              <Link href="/payments/new" className="mt-4">
                <Button>Record First Payment</Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Authority</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{p.description}</p>
                      {p.obligation && (
                        <p className="text-xs text-muted-foreground">{p.obligation.title}</p>
                      )}
                    </TableCell>
                    <TableCell><span className="text-sm">{p.authority.name}</span></TableCell>
                    <TableCell><span className="text-sm">{p.business.tradingName ?? p.business.legalName}</span></TableCell>
                    <TableCell><span className="text-sm">{p.obligation?.periodLabel ?? "—"}</span></TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(p.amount))}</TableCell>
                    <TableCell><span className="text-sm">{formatDate(p.paidAt)}</span></TableCell>
                    <TableCell>
                      <span className="text-sm font-mono">{p.referenceNo ?? "—"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        p.status === "PAID" ? "success" :
                        p.status === "PENDING" ? "warning" :
                        p.status === "FAILED" ? "danger" : "secondary"
                      }>
                        {p.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
