import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined, fmt = "dd MMM yyyy") {
  if (!date) return "—";
  return format(new Date(date), fmt);
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy HH:mm");
}

export function formatRelative(date: Date | string | null | undefined) {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number | string | null | undefined, currency = "ZMW") {
  if (amount === null || amount === undefined) return "—";
  return new Intl.NumberFormat("en-ZM", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount));
}

export function getDaysUntil(date: Date | string): number {
  return differenceInDays(new Date(date), new Date());
}

export function isOverdue(date: Date | string): boolean {
  return isPast(new Date(date));
}

export function maskNRC(nrc: string | null | undefined): string {
  if (!nrc) return "—";
  return nrc.length > 4 ? "••••••••" + nrc.slice(-4) : "••••";
}

export function maskAccount(account: string | null | undefined): string {
  if (!account) return "—";
  return account.length > 4 ? "••••" + account.slice(-4) : "••••";
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getObligationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    UPCOMING: "text-blue-600 bg-blue-50 border-blue-200",
    DUE_SOON: "text-amber-600 bg-amber-50 border-amber-200",
    DUE: "text-orange-600 bg-orange-50 border-orange-200",
    OVERDUE: "text-red-600 bg-red-50 border-red-200",
    SUBMITTED: "text-purple-600 bg-purple-50 border-purple-200",
    PENDING_PAYMENT: "text-yellow-600 bg-yellow-50 border-yellow-200",
    PAID: "text-emerald-600 bg-emerald-50 border-emerald-200",
    COMPLETED: "text-green-600 bg-green-50 border-green-200",
    NOT_APPLICABLE: "text-gray-500 bg-gray-50 border-gray-200",
    CANCELLED: "text-gray-400 bg-gray-50 border-gray-200",
  };
  return colors[status] ?? "text-gray-600 bg-gray-50 border-gray-200";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    UPCOMING: "Upcoming",
    DUE_SOON: "Due Soon",
    DUE: "Due",
    OVERDUE: "Overdue",
    SUBMITTED: "Submitted",
    PENDING_PAYMENT: "Pending Payment",
    PAID: "Paid",
    COMPLETED: "Completed",
    NOT_APPLICABLE: "N/A",
    CANCELLED: "Cancelled",
  };
  return labels[status] ?? status;
}

export function computeObligationStatus(dueDate: Date, currentStatus: string): string {
  if (["COMPLETED", "PAID", "SUBMITTED", "CANCELLED", "NOT_APPLICABLE"].includes(currentStatus)) {
    return currentStatus;
  }
  const days = getDaysUntil(dueDate);
  if (days < 0) return "OVERDUE";
  if (days <= 3) return "DUE";
  if (days <= 14) return "DUE_SOON";
  return "UPCOMING";
}
