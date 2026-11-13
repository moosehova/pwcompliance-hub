"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createEmployee } from "@/lib/actions/employees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

const schema = z.object({
  businessId: z.string().min(1, "Business is required"),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  employeeNo: z.string().optional(),
  nrc: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  employedAt: z.string().optional(),
  basicSalary: z.coerce.number().optional(),
  napsaNumber: z.string().optional(),
  nhimaNumber: z.string().optional(),
  tpin: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNo: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [businesses, setBusinesses] = useState<{ id: string; legalName: string; tradingName: string | null }[]>([]);

  useEffect(() => {
    fetch("/api/businesses").then((r) => r.json()).then(setBusinesses).catch(() => {});
  }, []);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const result = await createEmployee(data);
      if (result.success) router.push(`/employees/${result.id}`);
    } catch {
      setError("Failed to create employee. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/employees">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Add Employee</h1>
          <p className="text-muted-foreground">Add a new employee for NAPSA/NHIMA tracking</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
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
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last name *</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeNo">Employee number</Label>
              <Input id="employeeNo" placeholder="EMP001" {...register("employeeNo")} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select onValueChange={(v) => setValue("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job title</Label>
              <Input id="jobTitle" {...register("jobTitle")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...register("department")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employedAt">Employment date</Label>
              <Input id="employedAt" type="date" {...register("employedAt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="basicSalary">Basic salary (ZMW)</Label>
              <Input id="basicSalary" type="number" step="0.01" {...register("basicSalary")} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Statutory Numbers</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="napsaNumber">NAPSA number</Label>
              <Input id="napsaNumber" placeholder="N001234" {...register("napsaNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nhimaNumber">NHIMA number</Label>
              <Input id="nhimaNumber" placeholder="H001234" {...register("nhimaNumber")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nrc">NRC number</Label>
              <Input id="nrc" placeholder="123456/78/9" {...register("nrc")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpin">Employee TPIN</Label>
              <Input id="tpin" {...register("tpin")} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href="/employees"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Add Employee
          </Button>
        </div>
      </form>
    </div>
  );
}
