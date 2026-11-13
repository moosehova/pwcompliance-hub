import { getObligationById } from "@/lib/actions/compliance";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, getObligationStatusColor, getStatusLabel, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { UpdateStatusForm } from "./update-status-form";

export default async function ObligationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const obligation = await getObligationById(id);
  if (!obligation) notFound();

  const days = getDaysUntil(obligation.dueDate);
  const statusClasses = getObligationStatusColor(obligation.status);

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/compliance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{obligation.title}</h1>
          <p className="text-muted-foreground text-sm">
            {obligation.authority.name} · {obligation.business.tradingName ?? obligation.business.legalName}
          </p>
        </div>
        <Badge className={cn("text-sm border", statusClasses)}>
          {getStatusLabel(obligation.status)}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="text-lg font-bold mt-1">{formatDate(obligation.dueDate)}</p>
            <p className={cn("text-sm", days < 0 ? "text-red-500" : days <= 7 ? "text-amber-500" : "text-muted-foreground")}>
              {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Due today" : `${days} days remaining`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Period</p>
            <p className="text-lg font-bold mt-1">{obligation.periodLabel}</p>
            <p className="text-sm text-muted-foreground">
              {formatDate(obligation.periodStart)} — {formatDate(obligation.periodEnd)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Amount Due</p>
            <p className="text-lg font-bold mt-1">
              {obligation.amountDue ? formatCurrency(Number(obligation.amountDue)) : "Not set"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Update Status */}
        <Card>
          <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
          <CardContent>
            <UpdateStatusForm obligationId={id} currentStatus={obligation.status} />
          </CardContent>
        </Card>

        {/* Submissions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Submissions</CardTitle>
              <Link href={`/compliance/${id}/submit`}>
                <Button variant="outline" size="sm">Record Submission</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {obligation.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions recorded.</p>
            ) : (
              <div className="space-y-3">
                {obligation.submissions.map((s) => (
                  <div key={s.id} className="p-3 rounded-lg border">
                    <p className="text-sm font-medium">Ref: {s.referenceNo ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">Submitted {formatDate(s.submittedAt)} · {s.method ?? "—"}</p>
                    <Badge variant="success" className="mt-1 text-xs">{s.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Payments</CardTitle>
              <Link href={`/payments/new?obligation=${id}`}>
                <Button variant="outline" size="sm">Record Payment</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {obligation.payments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments recorded.</p>
            ) : (
              <div className="space-y-3">
                {obligation.payments.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border">
                    <div className="flex justify-between">
                      <p className="text-sm font-medium">{formatCurrency(Number(p.amount))}</p>
                      <Badge variant="success" className="text-xs">{p.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(p.paidAt)} · {p.paymentMethod ?? "—"} · Ref: {p.referenceNo ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card>
          <CardHeader><CardTitle className="text-base">Activity Log</CardTitle></CardHeader>
          <CardContent>
            {obligation.auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {obligation.auditLogs.map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm">{log.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.user?.name ?? "System"} · {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {obligation.notes && (
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{obligation.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
