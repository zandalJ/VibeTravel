import { z } from "zod";

export const itinerarySegmentSchema = z.object({
  title: z.string().min(1, "Segment title is required"),
  morning: z.string().min(1, "Morning plan is required"),
  afternoon: z.string().min(1, "Afternoon plan is required"),
  evening: z.string().min(1, "Evening plan is required"),
  notes: z.string().optional(),
});

export const itineraryDaySchema = itinerarySegmentSchema;

export const budgetSchema = z.object({
  daily: z.number().min(0, "Daily budget must be non-negative"),
  currency: z.string().min(1, "Currency code is required"),
  totalEstimate: z.number().min(0, "Total estimate must be non-negative").optional(),
});

export const travelTipsSchema = z.array(z.string().min(1, "Tip text must be provided")).max(12).optional();

export const structuredTravelPlanSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  destinationHighlights: z.array(z.string().min(1)).min(1).max(10).optional(),
  days: z.array(itineraryDaySchema).min(1, "At least one day must be provided"),
  budget: budgetSchema,
  tips: travelTipsSchema,
  additionalRecommendations: z.array(z.string().min(1)).optional(),
});

export type StructuredTravelPlan = z.infer<typeof structuredTravelPlanSchema>;
