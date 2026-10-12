// src/lib/config/system-config-service.ts
// Secure Server-Side System Configuration Service for Desktop & Web
// Manages runtime environment variables and persistent AppData overrides.

import fs from "fs";
import path from "path";
import os from "os";
import { GoogleGenAI } from "@google/genai";

export interface SystemConfigData {
  geminiApiKeyConfigured: boolean;
  geminiApiKeyMasked: string | null;
  geminiModel: string;
  googleOAuthConfigured: boolean;
  googleClientId: string | null;
  googleClientSecretConfigured: boolean;
  googleDesktopClientId: string | null;
  googleDesktopClientSecretConfigured: boolean;
}

/**
 * Resolves the persistent configuration file path.
 * Priority:
 * 1. %APPDATA%\smart-life-manager\.env (Windows Desktop / Packaged runtime)
 * 2. $HOME/.config/smart-life-manager/.env (Linux / Mac)
 * 3. Root .env file in project directory (Development fallback)
 */
export function getPersistentEnvPath(): string {
  if (process.platform === "win32" && process.env.APPDATA) {
    const appDataDir = path.join(process.env.APPDATA, "smart-life-manager");
    if (!fs.existsSync(appDataDir)) {
      try {
        fs.mkdirSync(appDataDir, { recursive: true });
      } catch {}
    }
    return path.join(appDataDir, ".env");
  }

  const homeDir = os.homedir();
  const configDir = path.join(homeDir, ".config", "smart-life-manager");
  if (!fs.existsSync(configDir)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
    } catch {}
  }
  return path.join(configDir, ".env");
}

/**
 * Loads key-value pairs from an env file into process.env without overwriting existing critical vars.
 */
export function loadEnvFileIntoProcess(filePath: string, overwrite = true): Record<string, string> {
  const loaded: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return loaded;

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        loaded[key] = val;
        if (overwrite || !process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (err) {
    console.warn(`[SystemConfig] Warning reading env file at ${filePath}:`, err);
  }

  return loaded;
}

/**
 * Writes or updates key-value pairs in the persistent .env file.
 */
export function updatePersistentEnv(entries: Record<string, string | null | undefined>): void {
  const envPath = getPersistentEnvPath();
  let existingContent = "";

  if (fs.existsSync(envPath)) {
    try {
      existingContent = fs.readFileSync(envPath, "utf8");
    } catch {}
  }

  const lines = existingContent ? existingContent.split(/\r?\n/) : [];
  const updatedKeys = new Set<string>();
  const newLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      newLines.push(line);
      continue;
    }

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      if (key in entries) {
        updatedKeys.add(key);
        const newVal = entries[key];
        if (newVal !== null && newVal !== undefined && newVal !== "") {
          newLines.push(`${key}="${newVal}"`);
          process.env[key] = newVal;
        } else {
          // Remove key from process.env if set to null/empty
          delete process.env[key];
        }
      } else {
        newLines.push(line);
      }
    } else {
      newLines.push(line);
    }
  }

  // Append new keys that were not already present in the file
  for (const [key, val] of Object.entries(entries)) {
    if (!updatedKeys.has(key)) {
      if (val !== null && val !== undefined && val !== "") {
        newLines.push(`${key}="${val}"`);
        process.env[key] = val;
      }
    }
  }

  fs.writeFileSync(envPath, newLines.join("\n") + "\n", { encoding: "utf8", mode: 0o600 });
}

/**
 * Safely masks a sensitive key, showing only the first 6 and last 4 characters.
 */
export function maskSecret(secret?: string | null): string | null {
  if (!secret || secret.trim().length === 0) return null;
  const trimmed = secret.trim();
  if (trimmed.length <= 10) return "••••••••";
  const start = trimmed.slice(0, 6);
  const end = trimmed.slice(-4);
  return `${start}${"•".repeat(Math.min(trimmed.length - 10, 16))}${end}`;
}

/**
 * Returns current public-safe system configuration metadata.
 */
export function getSystemConfig(): SystemConfigData {
  // Ensure AppData env is loaded if available
  const userEnv = getPersistentEnvPath();
  if (fs.existsSync(userEnv)) {
    loadEnvFileIntoProcess(userEnv, false);
  }

  const geminiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const isGeminiConfigured = Boolean(
    geminiKey &&
    geminiKey.trim().length > 5 &&
    !geminiKey.includes("your-api-key") &&
    !geminiKey.includes("placeholder")
  );

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() || null;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const isGoogleConfigured = Boolean(
    googleClientId &&
    googleClientSecret &&
    !googleClientId.includes("your-client-id")
  );

  const googleDesktopClientId = process.env.GOOGLE_DESKTOP_CLIENT_ID?.trim() || null;
  const googleDesktopSecret = process.env.GOOGLE_DESKTOP_CLIENT_SECRET?.trim();

  return {
    geminiApiKeyConfigured: isGeminiConfigured,
    geminiApiKeyMasked: maskSecret(geminiKey),
    geminiModel: process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash",
    googleOAuthConfigured: isGoogleConfigured,
    googleClientId: googleClientId ? maskSecret(googleClientId) : null,
    googleClientSecretConfigured: Boolean(googleClientSecret),
    googleDesktopClientId: googleDesktopClientId ? maskSecret(googleDesktopClientId) : null,
    googleDesktopClientSecretConfigured: Boolean(googleDesktopSecret),
  };
}

/**
 * Tests live connectivity with Google Gemini using the configured API key.
 */
export async function testGeminiConnection(keyToTest?: string): Promise<{
  success: boolean;
  message: string;
  model: string;
}> {
  const apiKey = keyToTest?.trim() || process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

  if (!apiKey || apiKey.length < 5) {
    return {
      success: false,
      message: "No Gemini API key provided or configured.",
      model,
    };
  }

  try {
    const client = new GoogleGenAI({ apiKey });

    // Generous token headroom for reasoning models (e.g. gemini-3.8-flash)
    // Attempt with thinkingBudget: 0 first for low latency
    let response: any;
    try {
      response = await client.models.generateContent({
        model,
        contents: "Respond with the single word: OK",
        config: {
          maxOutputTokens: 1000,
          temperature: 0.1,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
    } catch {
      // Fallback for models or configurations that do not support thinkingConfig
      response = await client.models.generateContent({
        model,
        contents: "Respond with the single word: OK",
        config: {
          maxOutputTokens: 1000,
          temperature: 0.1,
        },
      });
    }

    // 1. Check prompt feedback / block reasons
    const promptFeedback = response?.promptFeedback;
    if (promptFeedback?.blockReason) {
      return {
        success: false,
        message: `Prompt blocked by Gemini: ${promptFeedback.blockReason}${promptFeedback.blockReasonMessage ? ` (${promptFeedback.blockReasonMessage})` : ""}`,
        model,
      };
    }

    // 2. Check candidates
    const candidates = response?.candidates;
    if (!candidates || candidates.length === 0) {
      return {
        success: false,
        message: "Gemini API returned 0 candidates (HTTP 200 OK, but no candidates generated).",
        model,
      };
    }

    const firstCandidate = candidates[0];
    const finishReason = firstCandidate?.finishReason;

    // 3. Inspect candidate finish reasons for policy / filter interventions
    if (finishReason === "SAFETY") {
      return {
        success: false,
        message: "Response generation was blocked by Gemini safety filters (finishReason: SAFETY).",
        model,
      };
    }
    if (finishReason === "RECITATION") {
      return {
        success: false,
        message: "Response was blocked due to recitation check (finishReason: RECITATION).",
        model,
      };
    }
    if (finishReason === "BLOCKLIST") {
      return {
        success: false,
        message: "Response was blocked by content blocklist (finishReason: BLOCKLIST).",
        model,
      };
    }
    if (finishReason === "PROHIBITED_CONTENT") {
      return {
        success: false,
        message: "Response was blocked for prohibited content policy (finishReason: PROHIBITED_CONTENT).",
        model,
      };
    }

    // 4. Extract response text from response.text or candidate parts
    let reply = response?.text?.trim() || "";
    if (!reply && firstCandidate?.content?.parts) {
      for (const part of firstCandidate.content.parts) {
        if (typeof part.text === "string" && part.text.trim()) {
          reply = part.text.trim();
          break;
        }
      }
    }

    if (reply.length > 0) {
      return {
        success: true,
        message: `Successfully connected to Google Gemini (${model}). Response: "${reply}"`,
        model,
      };
    }

    // 5. If no text was extracted, return detailed diagnostics
    const thoughts = response?.usageMetadata?.thoughtsTokenCount ?? 0;
    const partsCount = firstCandidate?.content?.parts?.length ?? 0;
    return {
      success: false,
      message: `Connected to Gemini, but received empty response content (finishReason: ${finishReason || "unknown"}, parts: ${partsCount}, thoughtTokens: ${thoughts}).`,
      model,
    };
  } catch (err: any) {
    let errorMsg = err.message || String(err);
    try {
      if (typeof err.message === "string" && err.message.trim().startsWith("{")) {
        const parsed = JSON.parse(err.message);
        if (parsed.error?.message) {
          errorMsg = `${parsed.error.message} (${parsed.error.status || parsed.error.code || "Error"})`;
        }
      }
    } catch {}

    return {
      success: false,
      message: `Gemini connection failed: ${errorMsg}`,
      model,
    };
  }
}
