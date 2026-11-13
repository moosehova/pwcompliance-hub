import { getBusinesses } from "@/lib/actions/businesses";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Users, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function BusinessesPage() {
  const businesses = await getBusinesses();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Businesses</h1>
          <p className="text-muted-foreground">{businesses.length} registered business{businesses.length !== 1 ? "es" : ""}</p>
        </div>
        <Link href="/businesses/new">
          <Button>
            <Plus className="h-4 w-4" />
            Add Business
          </Button>
        </Link>
      </div>

      {businesses.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No businesses yet</h3>
            <p className="text-muted-foreground mb-6">Add your first business to start tracking compliance.</p>
            <Link href="/businesses/new">
              <Button>
                <Plus className="h-4 w-4" />
                Add your first business
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {businesses.map((b) => (
          <Link key={b.id} href={`/businesses/${b.id}`}>
            <Card className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <Badge variant={b.status === "ACTIVE" ? "success" : "secondary"}>
                    {b.status}
                  </Badge>
                </div>
                <h3 className="font-semibold text-base leading-tight">{b.tradingName ?? b.legalName}</h3>
                {b.tradingName && b.tradingName !== b.legalName && (
                  <p className="text-xs text-muted-foreground mt-0.5">{b.legalName}</p>
                )}
                <div className="mt-3 space-y-1">
                  {b.businessType && (
                    <p className="text-xs text-muted-foreground">{b.businessType.replace(/_/g, " ")}</p>
                  )}
                  {b.industry && (
                    <p className="text-xs text-muted-foreground">{b.industry}</p>
                  )}
                  {b.tpin && (
                    <p className="text-xs text-muted-foreground">TPIN: {b.tpin}</p>
                  )}
                </div>
                <div className="flex gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {b._count.employees} employees
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5" />
                    {b._count.obligations} obligations
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
