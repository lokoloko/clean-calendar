
import { AppLayout } from "@/components/layout";
import { mockCleaners, mockSchedule } from "@/data/mock-data";
import { ScheduleClient } from "./schedule-client";

export default function SchedulePage() {
  // In a real app, you would fetch this data from a database
  const cleaners = mockCleaners;
  const initialSchedule = mockSchedule;

  return (
    <AppLayout>
      <ScheduleClient initialSchedule={initialSchedule} cleaners={cleaners} />
    </AppLayout>
  );
}
