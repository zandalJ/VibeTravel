/**
 * Prompt Builder Utility
 *
 * Constructs AI prompts from user profile and note data.
 * Includes input sanitization and template management.
 */

export interface AIPromptData {
  destination: string;
  startDate: string;
  endDate: string;
  totalBudget: number | null;
  dailyBudget: number | null;
  travelStyle: string;
  interests: string[];
  otherInterests: string | null;
  additionalNotes: string | null;
}

const PROMPT_VERSION = "v1";
const MAX_PROMPT_LENGTH = 8000;

/**
 * Sanitize user input to prevent prompt injection
 * Removes potentially harmful characters while preserving readability
 */
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>{}]/g, "") // Remove brackets that could be used for injection
    .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
    .trim();
}

/**
 * Format date for display in prompt
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate trip duration in days
 */
function calculateDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end day
}

/**
 * Build AI prompt from user data
 *
 * @param data - User profile and note data
 * @returns Formatted prompt string ready for AI processing
 * @throws Error if prompt exceeds maximum length
 */
export function buildPrompt(data: AIPromptData): string {
  const duration = calculateDuration(data.startDate, data.endDate);

  // Build interests section
  const interestsList = [...data.interests];
  if (data.otherInterests) {
    interestsList.push(sanitizeInput(data.otherInterests));
  }
  const interestsText = interestsList.length > 0 ? interestsList.join(", ") : "general tourism";

  // Build budget section
  let budgetText = "";
  if (data.totalBudget) {
    budgetText = `Total budget: $${data.totalBudget}`;
    if (data.dailyBudget) {
      budgetText += ` (approximately $${data.dailyBudget} per day)`;
    }
  } else if (data.dailyBudget) {
    budgetText = `Daily budget: $${data.dailyBudget}`;
  }

  // Build additional notes section
  const notesText = data.additionalNotes ? sanitizeInput(data.additionalNotes) : "";

  // Construct the prompt
  const prompt = `You are a professional travel planner. Create a detailed, personalized travel itinerary based on the following information:

**Destination:** ${sanitizeInput(data.destination)}
**Travel Dates:** ${formatDate(data.startDate)} to ${formatDate(data.endDate)} (${duration} days)
**Travel Style:** ${sanitizeInput(data.travelStyle)}
**Interests:** ${interestsText}
${budgetText ? `**Budget:** ${budgetText}` : ""}
${notesText ? `**Additional Notes:** ${notesText}` : ""}

Please create a comprehensive day-by-day itinerary that includes:
1. Daily activities aligned with the traveler's interests and style
2. Recommended places to visit with brief descriptions
3. Suggested dining options that fit the budget
4. Practical tips and local insights
5. Estimated costs breakdown if budget is specified
6. Transportation recommendations between locations

Format the itinerary in markdown with clear section headers. Make it engaging, practical, and personalized to the traveler's preferences.`;

  // Validate prompt length
  if (prompt.length > MAX_PROMPT_LENGTH) {
    throw new Error(`Prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters (${prompt.length} characters)`);
  }

  return prompt;
}

/**
 * Get current prompt version
 * Useful for tracking which prompt template was used
 */
export function getPromptVersion(): string {
  return PROMPT_VERSION;
}

/**
 * Validate prompt data completeness
 * Ensures all required fields are present before building prompt
 */
export function validatePromptData(data: Partial<AIPromptData>): data is AIPromptData {
  return !!(data.destination && data.startDate && data.endDate && data.travelStyle && Array.isArray(data.interests));
}
