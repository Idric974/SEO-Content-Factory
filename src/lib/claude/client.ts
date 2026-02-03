import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface GenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

/**
 * Génère du texte via Claude API (non-streaming, pour les API routes classiques)
 */
export async function generate(options: GenerateOptions): Promise<GenerateResult> {
  const {
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    model = "claude-sonnet-4-20250514",
  } = options;

  const response = await anthropic.messages.create({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  return {
    text,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    model,
  };
}

/**
 * Génère du texte via Claude API en streaming (pour les Server-Sent Events)
 */
export async function generateStream(options: GenerateOptions) {
  const {
    systemPrompt,
    userPrompt,
    maxTokens = 4096,
    temperature = 0.7,
    model = "claude-sonnet-4-20250514",
  } = options;

  const stream = anthropic.messages.stream({
    model,
    max_tokens: maxTokens,
    temperature,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  return stream;
}
