/**
 * Shared LLM provider factory.
 *
 * Uses the Vercel AI SDK's OpenAI provider pointed at a custom base URL,
 * so any OpenAI-compatible hub (e.g. https://api.llmhub.andaihub.ai/v1)
 * works as a drop-in replacement for OpenRouter.
 *
 * Required env vars:
 *   OPENAI_API_KEY  — API key for the LLM hub
 *   OPENAI_BASE_URL — Base URL of the hub (with or without trailing "/chat/completions")
 *
 * Usage:
 *   import { createLLMProvider } from "../config/llm-provider.js";
 *   const provider = createLLMProvider();
 *   const model = provider("gpt-5.2");
 */

import { createOpenAI } from "@ai-sdk/openai";

function normalizeBaseUrl(raw: string): string {
  // Strip trailing /chat/completions so the SDK can append its own path
  return raw.replace(/\/chat\/completions\/?$/, "");
}

export function createLLMProvider() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }

  const rawBase = process.env.OPENAI_BASE_URL;
  if (!rawBase) {
    throw new Error("Missing required environment variable: OPENAI_BASE_URL");
  }

  const baseURL = normalizeBaseUrl(rawBase);

  return createOpenAI({
    apiKey,
    baseURL,
  });
}
