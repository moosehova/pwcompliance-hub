import { getObligations } from "@/lib/actions/compliance";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { formatDate, getObligationStatusColor, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, isToday, addMonths, subMonths } from "date-fns";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth();

  const currentMonth = new Date(year, month, 1);
  const prevMonth = subMonths(currentMonth, 1);
  const nextMonth = addMonths(currentMonth, 1);

  const obligations = await getObligations();
  const monthObls = obligations.filter((o) => {
    const d = new Date(o.dueDate);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });

  const firstDayOffset = getDay(startOfMonth(currentMonth));

  // Upcoming in next 30 days
  const upcoming = obligations
    .filter((o) => {
      const d = new Date(o.dueDate);
      const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 30;
    })
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 10);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Calendar</h1>
          <p className="text-muted-foreground">{monthObls.length} obligations due in {format(currentMonth, "MMMM yyyy")}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-1">
                <Link href={`/calendar?month=${prevMonth.getMonth()}&year=${prevMonth.getFullYear()}`}>
                  <Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
                </Link>
                <Link href={`/calendar?month=${now.getMonth()}&year=${now.getFullYear()}`}>
                  <Button variant="ghost" size="sm">Today</Button>
                </Link>
                <Link href={`/calendar?month=${nextMonth.getMonth()}&year=${nextMonth.getFullYear()}`}>
                  <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOffset }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {days.map((day) => {
                const dayObls = monthObls.filter((o) => isSameDay(new Date(o.dueDate), day));
                const hasOverdue = dayObls.some((o) => o.computedStatus === "OVERDUE");
                const hasCompleted = dayObls.some((o) => ["COMPLETED", "PAID", "SUBMITTED"].includes(o.computedStatus));
                const todayDay = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[60px] rounded-lg p-1 border",
                      todayDay ? "border-primary bg-primary/5" : "border-transparent",
                      dayObls.length > 0 ? "bg-muted/30" : ""
                    )}
                  >
                    <p className={cn("text-xs font-medium mb-1", todayDay ? "text-primary" : "text-foreground")}>
                      {format(day, "d")}
                    </p>
                    {dayObls.slice(0, 2).map((o) => (
                      <Link key={o.id} href={`/compliance/${o.id}`}>
                        <div className={cn("text-[9px] rounded px-1 py-0.5 mb-0.5 truncate cursor-pointer border", getObligationStatusColor(o.computedStatus))}>
                          {o.authority.name}
                        </div>
                      </Link>
                    ))}
                    {dayObls.length > 2 && (
                      <div className="text-[9px] text-muted-foreground">+{dayObls.length - 2} more</div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next 30 Days</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No obligations due in the next 30 days.</p>
            ) : (
              upcoming.map((obl) => {
                const statusClasses = getObligationStatusColor(obl.computedStatus);
                return (
                  <Link key={obl.id} href={`/compliance/${obl.id}`}>
                    <div className="p-3 rounded-lg border hover:bg-muted/20 transition-colors cursor-pointer mb-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium flex-1 leading-tight">{obl.title}</p>
                        <Badge className={cn("text-[10px] border shrink-0", statusClasses)}>
                          {getStatusLabel(obl.computedStatus)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {obl.authority.name} · {formatDate(obl.dueDate)}
                      </p>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
