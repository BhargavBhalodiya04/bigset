/**
 * Backend configuration for AI models.
 *
 * Supports both OpenRouter and OpenAI as model providers.
 * Model slugs are stored as:
 *   - OpenRouter: "anthropic/claude-sonnet-4.6" (no prefix)
 *   - OpenAI:     "openai:gpt-4o" (openai: prefix)
 */

import { api, internal, convex } from "../convex.js";
import { env } from "../env.js";
import { requireOpenRouterApiKey, getOpenAIApiKey, getOpenAIBaseUrl } from "../local-credentials.js";

export interface AIModel {
  modelName: string;
  canonicalSlug: string;
  contextLength: number;
  completionCost: number;
  promptCost: number;
}

// Keep backward-compat alias
export type OpenRouterModel = AIModel;

/**
 * Default model slugs for each agent role.
 */
export const DEFAULT_MODEL_IDS = {
  SCHEMA_INFERENCE: env.SCHEMA_INFERENCE_MODEL,
  POPULATE_ORCHESTRATOR: env.POPULATE_ORCHESTRATOR_MODEL,
  INVESTIGATE_SUBAGENT: env.INVESTIGATE_SUBAGENT_MODEL,
} as const;

export const MODEL_ROLES = [
  { key: "schemaInference", label: "Schema Inference" },
  { key: "populateOrchestrator", label: "Populate Orchestrator" },
  { key: "investigateSubagent", label: "Investigate Subagent" },
] as const;

export const EXCLUDED_MODEL_SLUGS: string[] = [];

/**
 * Fetch all cached models from Convex (both OpenRouter and OpenAI).
 * Auto-populates from OpenRouter API if the OpenRouter cache is empty.
 */
export async function getCachedModels(): Promise<AIModel[]> {
  const [orModels, aiModels] = await Promise.all([
    convex.query(api.openRouterModels.list, {}),
    convex.query(api.openAIModels.list, {}),
  ]);

  const cached = [...(orModels as unknown as AIModel[]), ...(aiModels as unknown as AIModel[])];

  if (cached.length > 0) return cached;

  // Bootstrap: fetch from OpenRouter on first call
  const fetched = await fetchModelsFromOpenRouter();
  await upsertModelBatch(fetched);
  return fetched;
}

/**
 * Validate that a model slug exists in the combined cached model list.
 */
export async function validateModelSlug(
  slug: string,
  role: "schemaInference" | "populateOrchestrator" | "investigateSubagent"
): Promise<void> {
  const models = await getCachedModels();
  const found = models.some((m) => m.canonicalSlug === slug);
  if (!found) {
    throw new Error(
      `Invalid model slug "${slug}" for ${role}. ` +
        `Available models: ${models.map((m) => m.canonicalSlug).join(", ") || "none (run refresh first)"}`
    );
  }
}

/**
 * Upsert a batch of OpenRouter models to Convex.
 */
export async function upsertModelBatch(models: AIModel[]): Promise<void> {
  await convex.mutation(internal.openRouterModels.upsertBatch, { models });
}

/**
 * Upsert a batch of OpenAI models to Convex.
 */
export async function upsertOpenAIModelBatch(models: AIModel[]): Promise<void> {
  await convex.mutation(internal.openAIModels.upsertBatch, { models });
}

export async function upsertModelConfig(
  userId: string,
  config: {
    schemaInference?: string;
    populateOrchestrator?: string;
    investigateSubagent?: string;
  }
): Promise<void> {
  await convex.mutation(internal.modelConfig.upsertInternal, {
    userId,
    schemaInference: config.schemaInference ?? undefined,
    populateOrchestrator: config.populateOrchestrator ?? undefined,
    investigateSubagent: config.investigateSubagent ?? undefined,
  });
}

export async function getModelConfig(
  userId: string
): Promise<{
  schemaInference: string;
  populateOrchestrator: string;
  investigateSubagent: string;
}> {
  const config = await convex.query(internal.modelConfig.getInternal, { userId });
  return {
    schemaInference: config?.schemaInference ?? DEFAULT_MODEL_IDS.SCHEMA_INFERENCE,
    populateOrchestrator: config?.populateOrchestrator ?? DEFAULT_MODEL_IDS.POPULATE_ORCHESTRATOR,
    investigateSubagent: config?.investigateSubagent ?? DEFAULT_MODEL_IDS.INVESTIGATE_SUBAGENT,
  };
}

/**
 * Fetch models from OpenRouter REST API.
 */
export async function fetchModelsFromOpenRouter(): Promise<AIModel[]> {
  const apiKey = await requireOpenRouterApiKey();

  const baseUrl = (process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/models`);
  url.searchParams.set("output_modalities", "text");
  url.searchParams.set("supported_parameters", "tools");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as {
    data: Array<{
      id: string;
      name?: string;
      context_length?: number;
      pricing?: { completion?: string; prompt?: string };
    }>;
  };

  return json.data
    .filter((m) => !EXCLUDED_MODEL_SLUGS.includes(m.id))
    .map((model) => ({
      modelName: model.name ?? model.id,
      canonicalSlug: model.id,
      contextLength: model.context_length ?? 0,
      promptCost: parseFloat(model.pricing?.prompt ?? "0") * 1_000_000,
      completionCost: parseFloat(model.pricing?.completion ?? "0") * 1_000_000,
    }));
}

/**
 * Fetch models from OpenAI REST API.
 * Only includes chat/completion models that support tool use.
 * Slugs are prefixed with "openai:" so they can be routed correctly.
 */
export async function fetchModelsFromOpenAI(): Promise<AIModel[]> {
  const apiKey = await getOpenAIApiKey();
  if (!apiKey) {
    throw new Error("OpenAI API key is not configured.");
  }

  const storedBaseUrl = await getOpenAIBaseUrl();
  const baseUrl = (storedBaseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API failed: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as {
    data: Array<{ id: string; owned_by?: string }>;
  };

  // Include GPT-4 family, o1/o3 family, and gpt-3.5 chat models only
  const chatModelPattern = /^(gpt-4|gpt-3\.5-turbo|o1|o3|o4)/i;

  return json.data
    .filter((m) => chatModelPattern.test(m.id) && !EXCLUDED_MODEL_SLUGS.includes(`openai:${m.id}`))
    .map((model) => ({
      modelName: model.id,
      canonicalSlug: `openai:${model.id}`,
      contextLength: 0, // OpenAI /models endpoint doesn't return context length
      promptCost: 0,
      completionCost: 0,
    }))
    .sort((a, b) => a.modelName.localeCompare(b.modelName));
}
