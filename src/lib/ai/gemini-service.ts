// src/lib/ai/gemini-service.ts
// Server-side integration with Google Gemini via @google/genai.
// Strict server-side only execution. Never exposes keys to client.

import { GoogleGenAI } from "@google/genai";
import { buildCustomerContext } from "./context-builder";
import { buildSystemPromptWithContext } from "./prompts";
import { AiStatusResponse } from "./types";

/**
 * Retrieves the AI API key from server environment variables only.
 * Checks GEMINI_API_KEY first, then AI_API_KEY.
 * Never exposed via NEXT_PUBLIC_.
 */
export function getAiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "";
  const trimmed = key.trim();
  if (
    !trimmed ||
    trimmed === "your-api-key" ||
    trimmed === "placeholder" ||
    trimmed.startsWith("YOUR_")
  ) {
    return null;
  }
  return trimmed;
}

/**
 * Indicates whether a valid AI API key is configured in the environment.
 */
export function isAiConfigured(): boolean {
  return getAiApiKey() !== null;
}

/**
 * Returns the configured Gemini model name.
 * Defaults to "gemini-3.8-flash".
 */
export function getAiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";
}

/**
 * Returns public-safe configuration status for UI and diagnostics.
 * NEVER returns the API key string.
 */
export function getAiConfigStatus(): AiStatusResponse {
  const configured = isAiConfigured();
  const model = getAiModel();
  return {
    configured,
    provider: "Google Gemini",
    model,
    message: configured
      ? `AI Assistant is operational using ${model}.`
      : "AI Assistant is awaiting configuration. Please set GEMINI_API_KEY in your server environment.",
  };
}

export interface GenerateAiResponseParams {
  userId: string;
  userMessage: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface GenerateAiResult {
  reply: string;
  provider: string;
  model: string;
}

/**
 * Generates an AI assistant response grounded in the customer's isolated life data.
 * Throws a descriptive error if the API key is unconfigured.
 */
export async function generateAiResponse({
  userId,
  userMessage,
  history = [],
}: GenerateAiResponseParams): Promise<GenerateAiResult> {
  const apiKey = getAiApiKey();
  const model = getAiModel();

  if (!apiKey) {
    throw new Error(
      "AI Assistant is currently unavailable. Please configure the GEMINI_API_KEY environment variable on your server."
    );
  }

  // 1. Build strictly user-isolated data context
  const customerContext = await buildCustomerContext(userId, userMessage);

  // 2. Build system prompt containing guidelines and authenticated context
  const systemInstruction = buildSystemPromptWithContext(customerContext);

  // 3. Format previous conversation turns (limit to last 10 messages)
  const recentHistory = history.slice(-10);
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  for (const item of recentHistory) {
    contents.push({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    });
  }

  // Add the current user query
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  // 4. Invoke Google GenAI client
  const client = new GoogleGenAI({ apiKey });
  let activeModel = model;
  let response;

  try {
    response = await client.models.generateContent({
      model: activeModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.2, // Low temperature for high factual adherence to user context
        maxOutputTokens: 2048,
      },
    });
  } catch (primaryError: any) {
    const rawMsg = primaryError?.message || String(primaryError);
    console.warn(`[GeminiService] Primary model (${activeModel}) error:`, rawMsg);

    // Resilient fallback: If primary model hits 429 quota, 503 high demand, or 404, attempt fallback models
    const isRecoverable =
      rawMsg.includes("429") ||
      rawMsg.includes("RESOURCE_EXHAUSTED") ||
      rawMsg.includes("quota") ||
      rawMsg.includes("503") ||
      rawMsg.includes("UNAVAILABLE") ||
      rawMsg.includes("high demand") ||
      rawMsg.includes("404") ||
      rawMsg.includes("NOT_FOUND");

    if (isRecoverable) {
      const fallbackCandidates = ["gemini-3.5-flash-lite", "gemini-3.5-flash"].filter(
        (m) => m !== activeModel
      );

      let fallbackSucceeded = false;
      for (const fallbackModel of fallbackCandidates) {
        try {
          console.log(`[GeminiService] Attempting high-availability fallback to ${fallbackModel}...`);
          response = await client.models.generateContent({
            model: fallbackModel,
            contents,
            config: {
              systemInstruction,
              temperature: 0.2,
              maxOutputTokens: 2048,
            },
          });
          activeModel = fallbackModel;
          fallbackSucceeded = true;
          console.log(`[GeminiService] Successfully generated response using fallback model ${activeModel}`);
          break;
        } catch (fbErr: any) {
          console.warn(`[GeminiService] Fallback ${fallbackModel} unavailable:`, fbErr?.message || fbErr);
        }
      }

      if (!fallbackSucceeded) {
        // Sanitize clean, useful application error without leaking credentials or stack traces
        if (rawMsg.includes("429") || rawMsg.includes("RESOURCE_EXHAUSTED") || rawMsg.includes("quota")) {
          throw new Error(
            `The AI service has reached its daily quota limit for model ${activeModel}. Please try again later or check your Google AI Studio plan.`
          );
        }
        if (rawMsg.includes("503") || rawMsg.includes("UNAVAILABLE") || rawMsg.includes("high demand")) {
          throw new Error(
            `The AI service (${activeModel}) is temporarily experiencing high demand. Please try again in a few moments.`
          );
        }
        if (rawMsg.includes("404") || rawMsg.includes("NOT_FOUND")) {
          throw new Error(
            `The requested AI model (${activeModel}) is not available. Please verify model configuration.`
          );
        }
        throw new Error("An error occurred while communicating with the AI service. Please try again.");
      }
    } else {
      // Non-recoverable error (e.g. invalid key format)
      if (rawMsg.includes("API key not valid") || rawMsg.includes("API_KEY_INVALID")) {
        throw new Error("The configured GEMINI_API_KEY is invalid. Please check your API key in server settings.");
      }
      throw new Error("An error occurred while communicating with the AI service. Please try again.");
    }
  }

  const reply =
    response?.text?.trim() ||
    "I reviewed your records, but could not produce a detailed answer. Please try rephrasing your question.";

  return {
    reply,
    provider: "Google Gemini",
    model: activeModel,
  };
}
