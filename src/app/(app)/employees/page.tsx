import { getEmployees } from "@/lib/actions/employees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Search } from "lucide-react";
import Link from "next/link";
import { formatCurrency, maskNRC } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; status?: string }>;
}) {
  const params = await searchParams;
  const employees = await getEmployees({ businessId: params.business, status: params.status });

  const active = employees.filter((e) => e.status === "ACTIVE").length;
  const noNapsa = employees.filter((e) => !e.napsaNumber).length;
  const noNhima = employees.filter((e) => !e.nhimaNumber).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground">{employees.length} employees across all businesses</p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-600">{active}</p>
            <p className="text-xs text-muted-foreground">Active Employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-purple-600">{employees.filter((e) => !!e.napsaNumber).length}</p>
            <p className="text-xs text-muted-foreground">With NAPSA Number</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className={`text-2xl font-bold ${noNapsa > 0 ? "text-amber-600" : "text-emerald-600"}`}>{noNapsa}</p>
            <p className="text-xs text-muted-foreground">Missing NAPSA No.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className={`text-2xl font-bold ${noNhima > 0 ? "text-amber-600" : "text-emerald-600"}`}>{noNhima}</p>
            <p className="text-xs text-muted-foreground">Missing NHIMA No.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No employees yet</h3>
              <p className="text-muted-foreground mb-4">Add employees to track NAPSA and NHIMA obligations.</p>
              <Link href="/employees/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Employee
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Basic Salary</TableHead>
                  <TableHead>NAPSA No.</TableHead>
                  <TableHead>NHIMA No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.employeeNo ?? "—"}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{emp.business.tradingName ?? emp.business.legalName}</span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{emp.jobTitle ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{emp.department ?? ""}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{emp.basicSalary ? formatCurrency(Number(emp.basicSalary)) : "—"}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-mono ${!emp.napsaNumber ? "text-amber-600" : ""}`}>
                        {emp.napsaNumber ?? "Missing"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-sm font-mono ${!emp.nhimaNumber ? "text-amber-600" : ""}`}>
                        {emp.nhimaNumber ?? "Missing"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={emp.status === "ACTIVE" ? "success" : "secondary"}>{emp.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/employees/${emp.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
