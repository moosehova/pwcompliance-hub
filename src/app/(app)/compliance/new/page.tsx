"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createObligation } from "@/lib/actions/compliance";
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
  requirementId: z.string().min(1, "Requirement is required"),
  title: z.string().min(2, "Title is required"),
  periodLabel: z.string().min(1, "Period is required"),
  periodStart: z.string().min(1, "Period start is required"),
  periodEnd: z.string().min(1, "Period end is required"),
  dueDate: z.string().min(1, "Due date is required"),
  amountDue: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function NewObligationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; legalName: string; tradingName: string | null }[]>([]);
  const [authorities, setAuthorities] = useState<{ id: string; name: string; code: string }[]>([]);
  const [requirements, setRequirements] = useState<{ id: string; name: string; authorityId: string }[]>([]);
  const [selectedAuthority, setSelectedAuthority] = useState<string>(searchParams.get("authority") ?? "");

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then(setBusinesses).catch(() => {});
    fetch("/api/authorities").then((r) => r.json()).then(setAuthorities).catch(() => {});
    fetch("/api/requirements").then((r) => r.json()).then(setRequirements).catch(() => {});
  }, []);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const filteredRequirements = selectedAuthority
    ? requirements.filter((r) => {
        const auth = authorities.find((a) => a.code === selectedAuthority || a.id === selectedAuthority);
        return auth ? r.authorityId === auth.id : true;
      })
    : requirements;

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await createObligation({
        ...data,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        dueDate: new Date(data.dueDate),
      });
      router.push("/compliance");
    } catch {
      setError("Failed to create obligation. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/compliance">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Compliance Obligation</h1>
          <p className="text-muted-foreground">Create a new compliance obligation</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-base">Obligation Details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Business *</Label>
              <Select onValueChange={(v) => setValue("businessId", v)}>
                <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.tradingName ?? b.legalName}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.businessId && <p className="text-xs text-red-500">{errors.businessId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Authority *</Label>
              <Select defaultValue={selectedAuthority} onValueChange={(v) => {
                setSelectedAuthority(v);
                const auth = authorities.find((a) => a.code === v || a.id === v);
                if (auth) setValue("authorityId", auth.id);
              }}>
                <SelectTrigger><SelectValue placeholder="Select authority" /></SelectTrigger>
                <SelectContent>
                  {authorities.map((a) => <SelectItem key={a.id} value={a.code}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.authorityId && <p className="text-xs text-red-500">{errors.authorityId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Requirement type *</Label>
              <Select onValueChange={(v) => setValue("requirementId", v)}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {filteredRequirements.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.requirementId && <p className="text-xs text-red-500">{errors.requirementId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" placeholder="PAYE Return — August 2026" {...register("title")} />
              {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodLabel">Period label *</Label>
              <Input id="periodLabel" placeholder="August 2026" {...register("periodLabel")} />
              {errors.periodLabel && <p className="text-xs text-red-500">{errors.periodLabel.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due date *</Label>
              <Input id="dueDate" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-xs text-red-500">{errors.dueDate.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodStart">Period start *</Label>
              <Input id="periodStart" type="date" {...register("periodStart")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period end *</Label>
              <Input id="periodEnd" type="date" {...register("periodEnd")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountDue">Amount due (ZMW)</Label>
              <Input id="amountDue" type="number" step="0.01" placeholder="0.00" {...register("amountDue")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/compliance"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Obligation
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewObligationPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <NewObligationForm />
    </Suspense>
  );
}
