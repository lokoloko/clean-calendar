'use server';

/**
 * @fileOverview AI-powered schedule optimizer flow.
 *
 * - optimizeSchedule - A function that optimizes the cleaning schedule.
 * - OptimizeScheduleInput - The input type for the optimizeSchedule function.
 * - OptimizeScheduleOutput - The return type for the optimizeSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeScheduleInputSchema = z.object({
  listings: z.array(
    z.object({
      name: z.string().describe('The name of the listing.'),
      checkoutTime: z.string().describe('The checkout time of the listing.'),
      location: z.string().describe('The address of the listing.'),
    })
  ).describe('A list of listings that need to be cleaned.'),
  cleaners: z.array(
    z.object({
      name: z.string().describe('The name of the cleaner.'),
      availability: z.string().describe('The availability of the cleaner.'),
      location: z.string().describe('The current location of the cleaner.'),
      preferences: z.string().optional().describe('Any preferences the cleaner has.'),
    })
  ).describe('A list of cleaners available to be assigned to listings.'),
  historicalData: z.string().optional().describe('Historical data on cleaner performance and travel times.'),
});
export type OptimizeScheduleInput = z.infer<typeof OptimizeScheduleInputSchema>;

const OptimizeScheduleOutputSchema = z.object({
  assignments: z.array(
    z.object({
      listingName: z.string().describe('The name of the listing.'),
      cleanerName: z.string().describe('The name of the assigned cleaner.'),
      startTime: z.string().describe('The start time of the cleaning task.'),
      travelTime: z.string().describe('The estimated travel time for the cleaner to reach the listing.'),
    })
  ).describe('A list of optimized cleaner assignments.'),
});
export type OptimizeScheduleOutput = z.infer<typeof OptimizeScheduleOutputSchema>;

export async function optimizeSchedule(input: OptimizeScheduleInput): Promise<OptimizeScheduleOutput> {
  return optimizeScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeSchedulePrompt',
  input: {schema: OptimizeScheduleInputSchema},
  output: {schema: OptimizeScheduleOutputSchema},
  prompt: `You are an AI schedule optimization expert, tasked with creating an ideal cleaning schedule for Airbnb properties.

  Given the following information about listings and cleaners, create an optimized schedule that minimizes travel time and maximizes worker satisfaction.

  Listings:
  {{#each listings}}
  - Name: {{this.name}}, Checkout Time: {{this.checkoutTime}}, Location: {{this.location}}
  {{/each}}

  Cleaners:
  {{#each cleaners}}
  - Name: {{this.name}}, Availability: {{this.availability}}, Location: {{this.location}}, Preferences: {{this.preferences}}
  {{/each}}

  Historical Data: {{historicalData}}

  Consider the following factors when creating the schedule:
  - Travel time between listings and cleaner locations.
  - Cleaner availability and preferences.
  - Checkout times of listings.
  - Historical data on cleaner performance.

  Present the schedule in a clear and concise format, including the listing name, assigned cleaner, start time, and estimated travel time.

  The output should be a JSON array of assignments.
  `,
});

const optimizeScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeScheduleFlow',
    inputSchema: OptimizeScheduleInputSchema,
    outputSchema: OptimizeScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
