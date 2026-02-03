/**
 * Calcul des coûts API basé sur l'usage de tokens
 */

// Coûts par 1K tokens (en USD) - Claude Sonnet
const COSTS: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-20250514": { input: 0.003, output: 0.015 },
  "claude-haiku-3-5-20241022": { input: 0.001, output: 0.005 },
};

const DEFAULT_COST = { input: 0.003, output: 0.015 };

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const cost = COSTS[model] ?? DEFAULT_COST;
  return (inputTokens / 1000) * cost.input + (outputTokens / 1000) * cost.output;
}

// Coûts DALL-E
export const DALLE_COSTS = {
  standard: 0.04, // 1024x1024
  hd: 0.08, // HD
} as const;
