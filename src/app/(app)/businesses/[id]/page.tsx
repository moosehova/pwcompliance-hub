import { getBusinessById } from "@/lib/actions/businesses";
import { notFound } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Users, FileText, Receipt, Pencil } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await getBusinessById(id);
  if (!business) notFound();

  const obligations = await prisma.complianceObligation.findMany({
    where: { businessId: id, deletedAt: null },
    include: { authority: true },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  const employees = await prisma.employee.findMany({
    where: { businessId: id, deletedAt: null },
    orderBy: { lastName: "asc" },
    take: 10,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/businesses">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{business.tradingName ?? business.legalName}</h1>
            {business.tradingName && <p className="text-sm text-muted-foreground">{business.legalName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={business.status === "ACTIVE" ? "success" : "secondary"}>{business.status}</Badge>
          <Link href={`/businesses/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Employees", value: business._count.employees, icon: Users },
          { label: "Obligations", value: business._count.obligations, icon: FileText },
          { label: "Payments", value: business._count.payments, icon: Receipt },
          { label: "Documents", value: business._count.documents, icon: FileText },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="directors">Directors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Registration Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Business Type" value={business.businessType.replace(/_/g, " ")} />
                <InfoRow label="Industry" value={business.industry} />
                <InfoRow label="PACRA Number" value={business.pacraNumber} />
                <InfoRow label="TPIN" value={business.tpin} />
                <InfoRow label="NAPSA Employer No." value={business.napsaEmployerNo} />
                <InfoRow label="NHIMA Employer No." value={business.nhimaEmployerNo} />
                <InfoRow label="VAT Number" value={business.vatNumber} />
                <InfoRow label="Incorporated" value={formatDate(business.incorporatedDate)} />
                <InfoRow label="Financial Year End" value={business.financialYearEnd ? new Date(2024, business.financialYearEnd - 1).toLocaleDateString("en-ZM", { month: "long" }) : null} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Contact Details</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Physical Address" value={business.physicalAddress} />
                <InfoRow label="Postal Address" value={business.postalAddress} />
                <InfoRow label="Phone" value={business.phone} />
                <InfoRow label="Email" value={business.email} />
                <InfoRow label="Website" value={business.website} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Compliance Obligations</CardTitle>
                <Link href={`/compliance?business=${id}`}>
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {obligations.length === 0 ? (
                <p className="text-sm text-muted-foreground">No obligations found.</p>
              ) : (
                <div className="space-y-3">
                  {obligations.map((obl) => (
                    <div key={obl.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{obl.title}</p>
                        <p className="text-xs text-muted-foreground">{obl.authority.name} · Due {formatDate(obl.dueDate)}</p>
                      </div>
                      <Badge variant={
                        obl.status === "OVERDUE" ? "danger" :
                        obl.status === "COMPLETED" || obl.status === "PAID" ? "success" :
                        obl.status === "DUE_SOON" ? "warning" : "secondary"
                      }>
                        {obl.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Employees</CardTitle>
                <Link href={`/employees?business=${id}`}>
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <p className="text-sm text-muted-foreground">No employees found.</p>
              ) : (
                <div className="space-y-3">
                  {employees.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.jobTitle} · {emp.department}</p>
                      </div>
                      <Badge variant={emp.status === "ACTIVE" ? "success" : "secondary"}>{emp.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="directors" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Directors & Shareholders</CardTitle></CardHeader>
            <CardContent>
              {business.directors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No directors recorded.</p>
              ) : (
                <div className="space-y-3">
                  {business.directors.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="text-sm font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.position} · {d.nationality}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Appointed {formatDate(d.appointedAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return (
    <div className="flex justify-between py-1 border-b border-dashed">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-muted-foreground">—</span>
    </div>
  );
  return (
    <div className="flex justify-between py-1 border-b border-dashed">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
