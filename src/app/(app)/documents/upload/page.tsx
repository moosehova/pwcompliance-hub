"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Upload } from "lucide-react";
import Link from "next/link";

const CATEGORIES = [
  "PACRA", "ZRA", "NAPSA", "NHIMA", "PAYROLL", "TAX",
  "COMPANY_REGISTRATION", "LICENCE", "CERTIFICATE", "RECEIPT", "RETURN", "CONTRACT", "OTHER",
];

const schema = z.object({
  businessId: z.string().min(1, "Business is required"),
  name: z.string().min(1, "Document name is required"),
  description: z.string().optional(),
  category: z.string().min(1),
  url: z.string().url("Enter a valid URL or file path"),
  periodLabel: z.string().optional(),
  expiryDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function UploadDocumentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; legalName: string; tradingName: string | null }[]>([]);
  const [authorities, setAuthorities] = useState<{ id: string; name: string }[]>([]);
  const [authorityId, setAuthorityId] = useState<string>("");

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then(setBusinesses).catch(() => {});
    fetch("/api/authorities").then((r) => r.json()).then(setAuthorities).catch(() => {});
  }, []);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { category: "OTHER" },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, authorityId: authorityId || undefined }),
      });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Failed to save document");
        return;
      }
      router.push("/documents");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/documents">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Upload Document</h1>
          <p className="text-muted-foreground">Add a document to the compliance vault</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-base">Document Details</CardTitle></CardHeader>
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
              <Label>Authority (optional)</Label>
              <Select onValueChange={setAuthorityId}>
                <SelectTrigger><SelectValue placeholder="Select authority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {authorities.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="name">Document name *</Label>
              <Input id="name" placeholder="PACRA Certificate of Incorporation" {...register("name")} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select defaultValue="OTHER" onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodLabel">Period (optional)</Label>
              <Input id="periodLabel" placeholder="July 2026" {...register("periodLabel")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="url">Document URL or file path *</Label>
              <Input id="url" placeholder="https://storage.example.com/doc.pdf" {...register("url")} />
              {errors.url && <p className="text-xs text-red-500">{errors.url.message}</p>}
              <p className="text-xs text-muted-foreground">
                Note: File upload to cloud storage (Phase 2). For now, enter the URL or path where the document is stored.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiryDate">Expiry date (optional)</Label>
              <Input id="expiryDate" type="date" {...register("expiryDate")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Additional notes about this document..." {...register("description")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/documents"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <Upload className="h-4 w-4" />
            Save Document
          </Button>
        </div>
      </form>
    </div>
  );
}
