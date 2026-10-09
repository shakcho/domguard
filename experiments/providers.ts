/**
 * Shared model wiring for the empirical study. Both the single-page collector
 * (corpus-collect.ts) and the seeded-codebase collector (corpus-collect-seeded.ts)
 * build their model set from here so provider gating stays in one place.
 *
 * Five provider classes, each gated on its own env vars:
 *   OPENAI_API_KEY                         -> gpt-4o-2024-08-06
 *   ANTHROPIC_API_KEY                      -> claude-sonnet-4-6
 *   GOOGLE_GENERATIVE_AI_API_KEY           -> gemini-2.5-flash
 *   OLLAMA_CLOUD_API_KEY + OLLAMA_CLOUD_MODELS=a,b,c   -> a,b,c on Ollama Cloud
 *   OLLAMA_LOCAL_MODELS=a,b,c                          -> a,b,c on local Ollama
 */
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const TEMPERATURE = 0.2;
export const MAX_OUTPUT_TOKENS = 8000;

export interface ModelClient {
  key: string;
  generate: (system: string, prompt: string) => Promise<string>;
}

type LanguageModel = Parameters<typeof generateText>[0]["model"];

function client(key: string, model: LanguageModel): ModelClient {
  return {
    key,
    generate: async (system, prompt) => {
      const r = await generateText({
        model,
        system,
        prompt,
        temperature: TEMPERATURE,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      return r.text;
    },
  };
}

export function parseModelList(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function buildEnabledModels(): ModelClient[] {
  const models: ModelClient[] = [];

  if (process.env.OPENAI_API_KEY) {
    models.push(client("gpt-4o-2024-08-06", openai("gpt-4o-2024-08-06")));
  }
  if (process.env.ANTHROPIC_API_KEY) {
    models.push(client("claude-sonnet-4-6", anthropic("claude-sonnet-4-6")));
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    models.push(client("gemini-2.5-flash", google("gemini-2.5-flash")));
  }

  const cloudModels = parseModelList(process.env.OLLAMA_CLOUD_MODELS);
  if (cloudModels.length > 0) {
    if (!process.env.OLLAMA_CLOUD_API_KEY) {
      throw new Error("OLLAMA_CLOUD_MODELS is set but OLLAMA_CLOUD_API_KEY is not.");
    }
    const cloud = createOpenAICompatible({
      name: "ollama-cloud",
      baseURL: process.env.OLLAMA_CLOUD_BASE_URL ?? "https://ollama.com/v1",
      apiKey: process.env.OLLAMA_CLOUD_API_KEY,
    });
    for (const name of cloudModels) {
      models.push(client(`ollama-cloud/${name}`, cloud(name)));
    }
  }

  const localModels = parseModelList(process.env.OLLAMA_LOCAL_MODELS);
  if (localModels.length > 0) {
    const local = createOpenAICompatible({
      name: "ollama-local",
      baseURL: process.env.OLLAMA_LOCAL_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: "ollama",
    });
    for (const name of localModels) {
      models.push(client(`ollama-local/${name}`, local(name)));
    }
  }

  return models;
}

export function enabledModelsHelp(): string {
  return [
    "No models enabled. Set at least one of:",
    "  OPENAI_API_KEY",
    "  ANTHROPIC_API_KEY",
    "  GOOGLE_GENERATIVE_AI_API_KEY",
    "  OLLAMA_CLOUD_API_KEY + OLLAMA_CLOUD_MODELS  (comma-separated)",
    "  OLLAMA_LOCAL_MODELS                         (comma-separated)",
  ].join("\n");
}
