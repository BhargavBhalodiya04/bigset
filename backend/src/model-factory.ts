import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";

export interface ProviderKeys {
  openrouter?: string;
  openai?: string;
  openaiBaseUrl?: string;
}

/**
 * Parse a model slug and extract provider + model id.
 * OpenAI slugs are prefixed with "openai:" (e.g. "openai:gpt-4o").
 * All other slugs are treated as OpenRouter (e.g. "anthropic/claude-sonnet-4.6").
 */
export function parseModelSlug(slug: string): { provider: "openai" | "openrouter"; modelId: string } {
  if (slug.startsWith("openai:")) {
    return { provider: "openai", modelId: slug.slice(7) };
  }
  return { provider: "openrouter", modelId: slug };
}

/**
 * Create a Vercel AI SDK model instance from a slug and provider API keys.
 * Throws if the required key for the detected provider is missing.
 */
export function createModelInstance(slug: string, keys: ProviderKeys) {
  const { provider, modelId } = parseModelSlug(slug);

  if (provider === "openai") {
    if (!keys.openai) {
      throw new Error(`OpenAI API key is required for model "${slug}". Configure it in setup.`);
    }
    return createOpenAI({
      apiKey: keys.openai,
      baseURL: keys.openaiBaseUrl || process.env.OPENAI_BASE_URL,
    })(modelId);
  }

  if (!keys.openrouter) {
    throw new Error(`OpenRouter API key is required for model "${slug}". Configure it in setup.`);
  }
  return createOpenRouter({
    apiKey: keys.openrouter,
    baseURL: process.env.OPENROUTER_BASE_URL,
  })(modelId);
}
