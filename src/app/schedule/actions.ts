"use server";

import { optimizeSchedule, OptimizeScheduleInput } from "@/ai/flows/optimize-schedule";
import { mockListings, mockCleaners } from "@/data/mock-data";

export async function optimizeScheduleAction() {
  try {
    const input: OptimizeScheduleInput = {
      listings: mockListings.map(l => ({
        name: l.name,
        checkoutTime: '11:00 AM', // Mocked checkout time
        location: 'City Center', // Mocked location
      })),
      cleaners: mockCleaners.map(c => ({
        name: c.name,
        availability: '9am - 5pm', // Mocked availability
        location: 'City Outskirts', // Mocked location
        preferences: 'Prefers morning shifts',
      })),
      historicalData: 'Yolanda is generally 15% faster at Downtown Loft. Travel time between Downtown Loft and Monrovia A is 25 minutes.'
    };

    const result = await optimizeSchedule(input);
    return { success: true, data: result.assignments };
  } catch (error) {
    console.error("Error optimizing schedule:", error);
    return { success: false, error: "Failed to optimize schedule." };
  }
}
