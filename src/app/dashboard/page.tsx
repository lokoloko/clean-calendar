import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/page-header";
import { DollarSign, Home, Users, CalendarCheck2 } from "lucide-react";
import { mockAssignments, mockCleaners, mockListings } from "@/data/mock-data";

// The main dashboard page for a quick overview of the application's state.
export default function DashboardPage() {
  // TODO: Replace mock data with real data from the database.
  const upcomingCleanings = mockAssignments.length;
  const activeCleaners = mockCleaners.length;
  const totalListings = mockListings.length;
  
  return (
    <div className="flex flex-col gap-8">
      {/* Page Header Component */}
      <PageHeader title="Welcome, Admin" />
      
      {/* Grid for displaying key metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Reusable card for displaying total listings */}
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

        {/* Reusable card for displaying active cleaners */}
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

        {/* Reusable card for displaying upcoming cleanings */}
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

        {/* Reusable card for displaying estimated monthly cost */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Estimated Monthly Cost
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {/* TODO: Calculate this value dynamically based on schedules and cleaner rates. */}
            <div className="text-2xl font-bold">$1,250.00</div>
            <p className="text-xs text-muted-foreground">
              based on scheduled cleanings
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Placeholder for additional dashboard components like recent activity or charts */}
    </div>
  )
}
