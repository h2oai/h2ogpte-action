import type { StreamingChunk, H2ogpteConfig } from "./types";
import * as core from "@actions/core";

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
  const config: H2ogpteConfig = {};
  const llm = core.getInput("llm");
  const agent_max_turns = core.getInput("agent_max_turns");

  if (llm) config.llm = llm;

  if (agent_max_turns) {
    const maxTurns = parseInt(agent_max_turns);
    const allowedValues = [5, 10, 15, 20];

    if (isNaN(maxTurns) || !allowedValues.includes(maxTurns)) {
      throw new Error(
        `Invalid agent_max_turns value: "${agent_max_turns}". Must be one of: ${allowedValues.join(", ")}`,
      );
    }

    config.agent_max_turns = maxTurns;
  }
  return config;
}
