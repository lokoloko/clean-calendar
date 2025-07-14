
'use client';

import { AppLayout } from "@/components/layout";
import PageHeader from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, Pie, PieChart, Cell } from "recharts";

const chartConfig: ChartConfig = {
  bookings: {
    label: "Bookings",
    color: "hsl(var(--chart-1))",
  },
  turnovers: {
    label: "Turnovers",
    color: "hsl(var(--chart-2))",
  },
  days: {
    label: "Days",
  }
};

const weeklyBookingData = [
  { week: "Week 1", bookings: 3 },
  { week: "Week 2", bookings: 5 },
  { week: "Week 3", bookings: 4 },
  { week: "Week 4", bookings: 6 },
];

const checkoutDayData = [
    { day: "Sun", checkouts: 5 },
    { day: "Mon", checkouts: 3 },
    { day: "Tue", checkouts: 2 },
    { day: "Wed", checkouts: 4 },
    { day: "Thu", checkouts: 6 },
    { day: "Fri", checkouts: 8 },
    { day: "Sat", checkouts: 7 },
];

const bookingDetails = [
  { id: 1, checkIn: "2025-07-01", checkOut: "2025-07-04", nights: 3, duration: "Standard", uid: "abcd@airbnb.com" },
  { id: 2, checkIn: "2025-07-04", checkOut: "2025-07-09", nights: 5, duration: "Back-to-back", uid: "efgh@airbnb.com" },
  { id: 3, checkIn: "2025-07-10", checkOut: "2025-07-12", nights: 2, duration: "Standard", uid: "ijkl@airbnb.com" },
  { id: 4, checkIn: "2025-07-15", checkOut: "2025-07-20", nights: 5, duration: "Standard", uid: "mnop@airbnb.com" },
];

const occupancyData = [
    { name: 'Booked', value: 75, fill: 'hsl(var(--chart-1))' },
    { name: 'Vacant', value: 25, fill: 'hsl(var(--muted))' },
]

export default function StatsPage() {

  return (
    <AppLayout>
      <div className="flex flex-col gap-8">
        <PageHeader title="Your Listing Stats" />
        <p className="text-muted-foreground -mt-6">
            Insights based on your Airbnb calendar data.
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Occupancy Rate</CardTitle>
              <CardDescription>
                % of days booked this month
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ChartContainer
                config={{}}
                className="mx-auto aspect-square h-[150px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Pie
                    data={occupancyData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={40}
                    strokeWidth={5}
                  >
                    {occupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Avg. Stay Length</CardTitle>
              <CardDescription>Average nights per booking</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">3.2 nights</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Back-to-Back Turnovers</CardTitle>
              <CardDescription>Zero-day gaps between bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-2xl font-bold p-3">12</Badge>
            </CardContent>
          </Card>
          <Card className="lg:col-span-1">
            <CardHeader>
                <CardTitle>Most Common Checkout Day</CardTitle>
                <CardDescription>Day of week guests most often check out</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                    <BarChart data={checkoutDayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="checkouts" fill="hsl(var(--chart-1))" radius={4} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
                <CardHeader>
                    <CardTitle>Weekly Booking Trend</CardTitle>
                </CardHeader>
                <CardContent>
                    <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <LineChart data={weeklyBookingData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="bookings" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                    </LineChart>
                    </ChartContainer>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Calendar Heatmap</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                    <div className="flex items-center justify-center h-[250px] w-full bg-muted rounded-xl">
                        <p className="text-muted-foreground">Calendar Heatmap Placeholder</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Booking Detail Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Nights</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>UID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingDetails.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.checkIn}</TableCell>
                    <TableCell>{booking.checkOut}</TableCell>
                    <TableCell>{booking.nights}</TableCell>
                    <TableCell>
                      <Badge variant={booking.duration === 'Back-to-back' ? 'default' : 'secondary'}>
                        {booking.duration}
                      </Badge>
                    </TableCell>
                    <TableCell>{booking.uid}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

    