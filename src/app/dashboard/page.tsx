import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { DollarSign, Home, Users, CalendarCheck2 } from "lucide-react";
import { mockAssignments, mockCleaners, mockListings } from "@/data/mock-data";

export default function DashboardPage() {
  const upcomingCleanings = mockAssignments.length;
  const activeCleaners = mockCleaners.length;
  const totalListings = mockListings.length;
  
  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Welcome, Admin" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Listings
            </CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalListings}</div>
            <p className="text-xs text-muted-foreground">
              properties being managed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Cleaners
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{activeCleaners}</div>
            <p className="text-xs text-muted-foreground">
              cleaners available
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Cleanings</CardTitle>
            <CalendarCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCleanings}</div>
            <p className="text-xs text-muted-foreground">
              in the next 7 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estimated Monthly Cost
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,250.00</div>
            <p className="text-xs text-muted-foreground">
              based on scheduled cleanings
            </p>
          </CardContent>
        </Card>
      </div>
      {/* Additional dashboard components can be added here */}
    </div>
  )
}
