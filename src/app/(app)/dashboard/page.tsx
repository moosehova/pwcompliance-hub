import { getDashboardData } from "@/lib/actions/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Building2,
  Users,
  TrendingUp,
  AlertCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusLabel, getObligationStatusColor, getDaysUntil } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const scoreColor =
    data.overallScore >= 90
      ? "text-emerald-600"
      : data.overallScore >= 70
        ? "text-amber-600"
        : "text-red-600";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Compliance Command Center</h1>
        <p className="text-muted-foreground mt-1">
          {data.organization.name} · {data.businesses.length} business{data.businesses.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="col-span-2 md:col-span-3 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-muted-foreground">Overall Compliance Score</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className={cn("text-5xl font-bold", scoreColor)}>{data.overallScore}%</div>
            <Progress value={data.overallScore} className="mt-3 h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {data.stats.completed} of {data.stats.total} obligations completed
            </p>
          </CardContent>
        </Card>

        <StatCard
          label="Businesses"
          value={data.stats.businesses}
          icon={Building2}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Employees"
          value={data.stats.employees}
          icon={Users}
          color="text-purple-600"
          bg="bg-purple-50"
        />
        <StatCard
          label="Overdue"
          value={data.stats.overdue}
          icon={AlertCircle}
          color="text-red-600"
          bg="bg-red-50"
          alert={data.stats.overdue > 0}
        />
        <StatCard
          label="Due Soon"
          value={data.stats.dueSoon}
          icon={Clock}
          color="text-amber-600"
          bg="bg-amber-50"
        />
      </div>

      {/* Authority Scores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance by Authority</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.authorityScores.map(({ authority, score, total }) => {
              if (total === 0) return null;
              const statusColor =
                score === null ? "text-gray-400"
                  : score >= 90 ? "text-emerald-600"
                    : score >= 70 ? "text-amber-600"
                      : "text-red-600";
              return (
                <div key={authority.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/compliance/${authority.code.toLowerCase()}`}
                      className="text-sm font-medium hover:text-primary transition-colors"
                    >
                      {authority.name}
                    </Link>
                    <span className={cn("text-sm font-bold", statusColor)}>
                      {score !== null ? `${score}%` : "—"}
                    </span>
                  </div>
                  <Progress value={score ?? 0} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">{total} obligation{total !== 1 ? "s" : ""}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Overdue */}
        {data.overdueObligations.length > 0 && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                Overdue Obligations ({data.overdueObligations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.overdueObligations.map((obl) => (
                <ObligationRow key={obl.id} obligation={obl} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Due Soon */}
        {data.dueSoonObligations.length > 0 && (
          <Card className="border-amber-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                <Clock className="h-4 w-4" />
                Due Soon ({data.dueSoonObligations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.dueSoonObligations.map((obl) => (
                <ObligationRow key={obl.id} obligation={obl} />
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentPayments.length === 0 && (
              <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
            )}
            {data.recentPayments.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{payment.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.authority.name} · {payment.business.tradingName ?? payment.business.legalName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatCurrency(Number(payment.amount))}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(payment.paidAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expiring Documents */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-600" />
              Documents Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.expiringDocs.length === 0 && (
              <p className="text-sm text-muted-foreground">No documents expiring in the next 60 days.</p>
            )}
            {data.expiringDocs.map((doc) => {
              const days = getDaysUntil(doc.expiryDate!);
              return (
                <div key={doc.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.business.tradingName ?? doc.business.legalName}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-medium", days <= 7 ? "text-red-600" : "text-amber-600")}>
                      {days} day{days !== 1 ? "s" : ""} left
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(doc.expiryDate)}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { href: "/compliance", label: "View All Obligations", icon: CheckCircle2, color: "text-blue-600" },
              { href: "/payments/new", label: "Record Payment", icon: CheckCircle2, color: "text-emerald-600" },
              { href: "/documents/upload", label: "Upload Document", icon: FileText, color: "text-purple-600" },
              { href: "/calendar", label: "Compliance Calendar", icon: Calendar, color: "text-amber-600" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
              >
                <action.icon className={cn("h-5 w-5", action.color)} />
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  alert,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  alert?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("inline-flex p-2 rounded-lg mb-3", bg)}>
          <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className={cn("text-2xl font-bold", alert && value > 0 ? "text-red-600" : "text-foreground")}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

function ObligationRow({ obligation }: { obligation: { id: string; title: string; dueDate: Date; computedStatus: string; authority: { name: string }; business: { legalName: string; tradingName: string | null }; amountDue: unknown } }) {
  const days = getDaysUntil(obligation.dueDate);
  const statusClasses = getObligationStatusColor(obligation.computedStatus);

  return (
    <Link href={`/compliance`} className="block">
      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{obligation.title}</p>
          <p className="text-xs text-muted-foreground">
            {obligation.authority.name} · {obligation.business.tradingName ?? obligation.business.legalName}
          </p>
        </div>
        <div className="ml-3 flex flex-col items-end gap-1">
          <Badge className={cn("text-xs border", statusClasses)}>
            {getStatusLabel(obligation.computedStatus)}
          </Badge>
          <p className="text-xs text-muted-foreground">
            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
          </p>
        </div>
      </div>
    </Link>
  );
}
