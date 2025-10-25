import { z } from "zod";

export const planFeedbackSchema = z.object({
  feedback: z.union([z.literal(1), z.literal(-1)], {
    invalid_type_error: "Feedback must be a number",
  }),
});

export type PlanFeedbackInput = z.infer<typeof planFeedbackSchema>;

