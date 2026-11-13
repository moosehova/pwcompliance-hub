import { getEmployeeById } from "@/lib/actions/employees";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User } from "lucide-react";
import Link from "next/link";
import { formatDate, formatCurrency, maskNRC, maskAccount } from "@/lib/utils";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/employees">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
            <User className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{employee.firstName} {employee.lastName}</h1>
            <p className="text-sm text-muted-foreground">
              {employee.jobTitle ?? "—"} · {employee.business.tradingName ?? employee.business.legalName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={employee.status === "ACTIVE" ? "success" : "secondary"}>{employee.status}</Badge>
          <Link href={`/employees/${id}/edit`}>
            <Button variant="outline" size="sm">Edit</Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Employee No." value={employee.employeeNo} />
            <InfoRow label="Gender" value={employee.gender} />
            <InfoRow label="Date of Birth" value={formatDate(employee.dob)} />
            <InfoRow label="NRC" value={maskNRC(employee.nrc)} />
            <InfoRow label="Phone" value={employee.phone} />
            <InfoRow label="Email" value={employee.email} />
            <InfoRow label="Address" value={employee.address} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Employment Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Job Title" value={employee.jobTitle} />
            <InfoRow label="Department" value={employee.department} />
            <InfoRow label="Employment Date" value={formatDate(employee.employedAt)} />
            <InfoRow label="Basic Salary" value={employee.basicSalary ? formatCurrency(Number(employee.basicSalary)) : null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Statutory Numbers</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="NAPSA Number" value={employee.napsaNumber} />
            <InfoRow label="NHIMA Number" value={employee.nhimaNumber} />
            <InfoRow label="TPIN" value={employee.tpin} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Bank Details</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="Bank" value={employee.bankName} />
            <InfoRow label="Account" value={employee.bankAccountNo ? maskAccount(employee.bankAccountNo) : null} />
            <InfoRow label="Emergency Contact" value={employee.emergencyContact} />
            <InfoRow label="Emergency Phone" value={employee.emergencyPhone} />
          </CardContent>
        </Card>
      </div>

      {employee.payrollItems.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Payroll</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employee.payrollItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{item.payroll.periodLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      Gross: {formatCurrency(Number(item.grossSalary))} ·
                      NAPSA: {formatCurrency(Number(item.napsaEmployee))} ·
                      PAYE: {formatCurrency(Number(item.paye))}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{formatCurrency(Number(item.netSalary))}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-1 border-b border-dashed">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value ?? "—"}</span>
    </div>
  );
}
