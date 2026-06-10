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

  const customFetch = async (url: string, init?: RequestInit) => {
    // Intercept and normalize POST request payloads going to the LLM hub
    if (init && init.method === "POST" && init.body && typeof init.body === "string") {
      try {
        const body = JSON.parse(init.body);
        if (body && Array.isArray(body.messages)) {
          for (const msg of body.messages) {
            // Replace any content: null with an empty string to satisfy custom LLM gateway Zod schema
            if (msg.content === null) {
              msg.content = "";
            }
          }
          init.body = JSON.stringify(body);
        }
      } catch (e) {
        // Skip normalization on malformed JSON
      }
    }
    return fetch(url, init);
  };

  const openai = createOpenAI({
    apiKey,
    baseURL,
    fetch: customFetch as any,
  });


  // Force chat completions API (/v1/chat/completions) by default
  // instead of the new responses API (/v1/responses) which custom
  // LLM hubs do not support yet.
  const wrapper = (modelId: string, settings?: any) => {
    return openai.chat(modelId, settings);
  };

  wrapper.chat = (modelId: string, settings?: any) => openai.chat(modelId, settings);
  wrapper.completion = (modelId: string, settings?: any) => openai.completion(modelId, settings);

  for (const key of Object.keys(openai)) {
    if (!(key in wrapper)) {
      (wrapper as any)[key] = (openai as any)[key];
    }
  }

  return wrapper as unknown as ReturnType<typeof createOpenAI>;
}

