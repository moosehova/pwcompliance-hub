"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const schema = z.object({
  businessId: z.string().min(1, "Business is required"),
  authorityId: z.string().min(1, "Authority is required"),
  description: z.string().min(2, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().min(1),
  paidAt: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().optional(),
  referenceNo: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function NewPaymentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; legalName: string; tradingName: string | null }[]>([]);
  const [authorities, setAuthorities] = useState<{ id: string; name: string }[]>([]);

  useState(() => {
    fetch("/api/businesses").then((r) => r.json()).then(setBusinesses).catch(() => {});
    fetch("/api/authorities").then((r) => r.json()).then(setAuthorities).catch(() => {});
  });

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { currency: "ZMW" },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, obligationId: searchParams.get("obligation") }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to record payment");
        return;
      }
      router.push("/payments");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/payments">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground">Record a statutory payment</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business *</Label>
              <Select onValueChange={(v) => setValue("businessId", v)}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.tradingName ?? b.legalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.businessId && <p className="text-xs text-red-500">{errors.businessId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Authority *</Label>
              <Select onValueChange={(v) => setValue("authorityId", v)}>
                <SelectTrigger><SelectValue placeholder="Select authority" /></SelectTrigger>
                <SelectContent>
                  {authorities.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.authorityId && <p className="text-xs text-red-500">{errors.authorityId.message}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Input id="description" placeholder="NAPSA Contribution — July 2026" {...register("description")} />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (ZMW) *</Label>
              <Input id="amount" type="number" step="0.01" placeholder="0.00" {...register("amount")} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidAt">Payment date *</Label>
              <Input id="paidAt" type="date" {...register("paidAt")} />
              {errors.paidAt && <p className="text-xs text-red-500">{errors.paidAt.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select onValueChange={(v) => setValue("paymentMethod", v)}>
                <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceNo">Reference / receipt number</Label>
              <Input id="referenceNo" placeholder="REF123456" {...register("referenceNo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank name</Label>
              <Input id="bankName" placeholder="Zanaco, Stanbic..." {...register("bankName")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Additional notes..." {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/payments">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Record Payment
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewPaymentPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewPaymentForm />
    </Suspense>
  );
}
