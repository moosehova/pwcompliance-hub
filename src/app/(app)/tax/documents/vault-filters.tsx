"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { useCallback, useTransition } from "react";

const CATEGORIES = [
  { value: "BANK_STATEMENTS",             label: "Bank Statements" },
  { value: "FINANCIAL_STATEMENTS",        label: "Financial Statements" },
  { value: "TRIAL_BALANCES",              label: "Trial Balances" },
  { value: "INVOICES_AND_RECEIPTS",       label: "Invoices & Receipts" },
  { value: "TAX_CERTIFICATES",            label: "Tax Certificates" },
  { value: "CAPITAL_ALLOWANCE_SCHEDULES", label: "Capital Allowance Schedules" },
  { value: "PAYROLL_RECORDS",             label: "Payroll Records" },
  { value: "ZRA_CORRESPONDENCE",          label: "ZRA Correspondence" },
  { value: "PACRA_DOCUMENTS",             label: "PACRA Documents" },
  { value: "NAPSA_DOCUMENTS",             label: "NAPSA Documents" },
  { value: "NHIMA_DOCUMENTS",             label: "NHIMA Documents" },
  { value: "OTHER_SUPPORTING",            label: "Other Supporting" },
];

export function TaxVaultFilters({ taxYears }: { taxYears: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(sp.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, sp]
  );

  const hasFilters = sp.has("q") || sp.has("category") || sp.has("taxYear");

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="relative flex-1 min-w-48 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search documents…"
          className="pl-9"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => {
            const v = e.target.value.trim();
            clearTimeout((window as unknown as { _vaultSearch?: ReturnType<typeof setTimeout> })._vaultSearch);
            (window as unknown as { _vaultSearch?: ReturnType<typeof setTimeout> })._vaultSearch = setTimeout(
              () => update("q", v || null),
              300
            );
          }}
        />
      </div>

      <Select
        value={sp.get("category") ?? ""}
        onValueChange={(v) => update("category", v === "__all__" ? null : v)}
      >
        <SelectTrigger className="w-56">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All categories</SelectItem>
          {CATEGORIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {taxYears.length > 0 && (
        <Select
          value={sp.get("taxYear") ?? ""}
          onValueChange={(v) => update("taxYear", v === "__all__" ? null : v)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All years</SelectItem>
            {taxYears.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(pathname)}
          className="gap-1"
        >
          <X className="h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
