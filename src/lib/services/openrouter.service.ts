/**
 * OpenRouter Service (Mock Implementation)
 *
 * Mock service for plan generation - returns example plan content.
 * TODO: Replace with real OpenRouter.ai integration in the future.
 */

export interface AIResponse {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Custom error for OpenRouter API failures
 */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

/**
 * Mock OpenRouter API Client
 * Returns example travel plans without making external API calls
 */
export class OpenRouterService {
  /**
   * Generate travel plan using AI (Mock)
   *
   * @param prompt - The formatted prompt containing user preferences and trip details
   * @returns Mock AI-generated plan content with token usage
   */
  async generatePlan(prompt: string): Promise<AIResponse> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock travel plan content in markdown format
    const mockContent = `# Travel Itinerary

## Overview
This is a personalized travel plan based on your preferences and trip details.

## Day 1: Arrival
- **Morning**: Arrive at destination, check into accommodation
- **Afternoon**: Explore the local neighborhood, grab lunch at a recommended spot
- **Evening**: Welcome dinner at a traditional restaurant

## Day 2: Main Attractions
- **Morning**: Visit major landmarks and attractions
- **Afternoon**: Lunch break and shopping in local markets
- **Evening**: Optional cultural show or local entertainment

## Day 3: Adventure Day
- **Morning**: Outdoor activity or excursion
- **Afternoon**: Picnic lunch at scenic location
- **Evening**: Relax and review experiences

## Budget Breakdown
- Accommodation: ~40% of total budget
- Food & Dining: ~30% of total budget
- Activities: ~20% of total budget
- Transportation: ~10% of total budget

## Tips & Recommendations
- Book activities in advance to secure best prices
- Try local street food for authentic experience
- Keep some cash for small vendors
- Stay hydrated and respect local customs

*This is a mock plan. Real AI-generated plans will be more detailed and personalized.*`;

    // Mock token usage
    const promptTokens = Math.floor(prompt.length / 4); // Rough estimate
    const completionTokens = Math.floor(mockContent.length / 4);

    return {
      content: mockContent,
      promptTokens,
      completionTokens,
    };
  }
}

/**
 * Singleton instance for reuse across requests
 */
let openRouterServiceInstance: OpenRouterService | null = null;

/**
 * Get or create OpenRouter service instance
 */
export function getOpenRouterService(): OpenRouterService {
  if (!openRouterServiceInstance) {
    openRouterServiceInstance = new OpenRouterService();
  }
  return openRouterServiceInstance;
}
