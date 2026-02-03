import type {
  StreamingChunk,
  H2ogpteConfig,
  CollectionSettings,
} from "./types";
import * as core from "@actions/core";
import yaml from "js-yaml";
import { getCollectionSettings, setCollectionSettings } from "./h2ogpte";
/**
 * Gets H2OGPTE configuration from environment variables
 */
export function getH2ogpteConfig(): { apiKey: string; apiBase: string } {
  const apiKey = process.env.H2OGPTE_API_KEY;
  const apiBase = process.env.H2OGPTE_API_BASE;

  if (!apiKey) {
    throw new Error("H2OGPTE_API_KEY environment variable is required");
  }
  if (!apiBase) {
    throw new Error("H2OGPTE_API_BASE environment variable is required");
  }

  return { apiKey, apiBase };
}

/**
 * Parses a newline-delimited streaming agent response and returns the last valid chunk (with body and finished)
 */
export function parseStreamingAgentResponse(
  rawResponse: string,
): StreamingChunk | null {
  if (!rawResponse || typeof rawResponse !== "string") return null;
  const lines = rawResponse.trim().split("\n");
  const streamingChunks = lines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((chunk) => chunk !== null);
  const lastChunk = streamingChunks[streamingChunks.length - 1];
  if (lastChunk && lastChunk.body && lastChunk.finished) {
    return lastChunk;
  }
  return null;
}

/**
 * Parse h2oGPTe configuration from GitHub action inputs
 */
export function parseH2ogpteConfig(): H2ogpteConfig {
  const llm = process.env.LLM;
  const agent_max_turns = process.env.AGENT_MAX_TURNS;
  const agent_accuracy = process.env.AGENT_ACCURACY;
  const agent_total_timeout_raw = process.env.AGENT_TOTAL_TIMEOUT;
  let agent_total_timeout = 3600; // default value

  if (agent_total_timeout_raw !== undefined && agent_total_timeout_raw !== "") {
    const parsed = parseInt(agent_total_timeout_raw);
    if (!isNaN(parsed) && parsed >= 0) {
      agent_total_timeout = parsed;
    }
    // If parsing fails or value is negative, keep the default value
  }

  const allowedMaxTurnsValues = ["auto", "5", "10", "15", "20"];
  if (agent_max_turns && !allowedMaxTurnsValues.includes(agent_max_turns)) {
    throw new Error(
      `Invalid agent_max_turns value: "${agent_max_turns}". Must be one of: ${allowedMaxTurnsValues.join(", ")}`,
    );
  }

  const allowedAccuracyValues = ["quick", "basic", "standard", "maximum"];
  if (agent_accuracy && !allowedAccuracyValues.includes(agent_accuracy)) {
    throw new Error(
      `Invalid agent_accuracy value: "${agent_accuracy}". Must be one of: ${allowedAccuracyValues.join(", ")}`,
    );
  }

  return {
    llm: llm || "auto",
    agent_max_turns: agent_max_turns || "auto",
    agent_accuracy: agent_accuracy || "standard",
    agent_total_timeout: agent_total_timeout,
  };
}

export async function updateGuardRailsSettings(
  collectionId: string,
  guardrailsSettings?: string,
): Promise<void> {
  if (!guardrailsSettings) {
    core.debug("No guardrails settings found");
    return;
  }

  core.debug(`Guardrails settings: ${guardrailsSettings}`);
  const guardrailsSettingsPayload =
    yaml.load(guardrailsSettings, {
      schema: yaml.JSON_SCHEMA,
    }) || undefined;
  core.debug(`Guardrails settings payload: ${guardrailsSettingsPayload}`);
  const oldSettings = await getCollectionSettings(collectionId);
  const updatedSettings: CollectionSettings = {
    ...oldSettings,
    guardrails_settings: guardrailsSettingsPayload,
  };
  await setCollectionSettings(collectionId, updatedSettings);
}
