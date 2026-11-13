"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBusiness } from "@/lib/actions/businesses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  legalName: z.string().min(2, "Legal name is required"),
  tradingName: z.string().optional(),
  businessType: z.enum(["PRIVATE_LIMITED", "PUBLIC_LIMITED", "SOLE_TRADER", "PARTNERSHIP", "NGO", "TRUST", "OTHER"]),
  industry: z.string().optional(),
  pacraNumber: z.string().optional(),
  tpin: z.string().optional(),
  napsaEmployerNo: z.string().optional(),
  nhimaEmployerNo: z.string().optional(),
  vatNumber: z.string().optional(),
  physicalAddress: z.string().optional(),
  postalAddress: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().optional(),
  incorporatedDate: z.string().optional(),
  financialYearEnd: z.coerce.number().min(1).max(12).optional(),
});

type FormData = z.infer<typeof schema>;

const BUSINESS_TYPES = [
  { value: "PRIVATE_LIMITED", label: "Private Limited Company" },
  { value: "PUBLIC_LIMITED", label: "Public Limited Company" },
  { value: "SOLE_TRADER", label: "Sole Trader" },
  { value: "PARTNERSHIP", label: "Partnership" },
  { value: "NGO", label: "NGO / Non-Profit" },
  { value: "TRUST", label: "Trust" },
  { value: "OTHER", label: "Other" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function NewBusinessPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { businessType: "PRIVATE_LIMITED" },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const result = await createBusiness(data);
      if (result.success) {
        router.push(`/businesses/${result.id}`);
      }
    } catch {
      setError("Failed to create business. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/businesses">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add New Business</h1>
          <p className="text-muted-foreground">Register a business for compliance tracking</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="legalName">Legal name *</Label>
              <Input id="legalName" placeholder="Pebbles College International School Limited" {...register("legalName")} />
              {errors.legalName && <p className="text-xs text-red-500">{errors.legalName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tradingName">Trading / common name</Label>
              <Input id="tradingName" placeholder="Pebbles College" {...register("tradingName")} />
            </div>
            <div className="space-y-2">
              <Label>Business type *</Label>
              <Select onValueChange={(v) => setValue("businessType", v as FormData["businessType"])} defaultValue="PRIVATE_LIMITED">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input id="industry" placeholder="Education, Hospitality, Retail..." {...register("industry")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incorporatedDate">Incorporation date</Label>
              <Input id="incorporatedDate" type="date" {...register("incorporatedDate")} />
            </div>
            <div className="space-y-2">
              <Label>Financial year end (month)</Label>
              <Select onValueChange={(v) => setValue("financialYearEnd", parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Registration Numbers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registration Numbers</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pacraNumber">PACRA registration number</Label>
              <Input id="pacraNumber" placeholder="120240001234" {...register("pacraNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpin">TPIN (ZRA)</Label>
              <Input id="tpin" placeholder="1001234567" {...register("tpin")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="napsaEmployerNo">NAPSA employer number</Label>
              <Input id="napsaEmployerNo" placeholder="8001234" {...register("napsaEmployerNo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nhimaEmployerNo">NHIMA employer number</Label>
              <Input id="nhimaEmployerNo" placeholder="NH001234" {...register("nhimaEmployerNo")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT number</Label>
              <Input id="vatNumber" placeholder="VAT number if registered" {...register("vatNumber")} />
            </div>
          </CardContent>
        </Card>

        {/* Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="physicalAddress">Physical address</Label>
              <Input id="physicalAddress" placeholder="Plot 1234, Great East Road, Lusaka" {...register("physicalAddress")} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="postalAddress">Postal address</Label>
              <Input id="postalAddress" placeholder="P.O. Box 30001, Lusaka" {...register("postalAddress")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" placeholder="+260 211 123 456" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="info@business.co.zm" {...register("email")} />
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" placeholder="https://www.business.co.zm" {...register("website")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/businesses">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Business
          </Button>
        </div>
      </form>
    </div>
  );
}
