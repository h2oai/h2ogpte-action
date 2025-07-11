import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  parseStreamingAgentResponse,
  parseH2ogpteConfig,
} from "../../src/core/services/h2ogpte/utils";

// Helper function to test validation logic
function validateAgentMaxTurns(value: string): number | null {
  const maxTurns = parseInt(value);
  const allowedValues = [5, 10, 15, 20];

  if (isNaN(maxTurns) || !allowedValues.includes(maxTurns)) {
    throw new Error(
      `Invalid agent_max_turns value: "${value}". Must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return maxTurns;
}

describe("parseStreamingAgentResponse", () => {
  test("should return the last valid finished chunk with body", () => {
    const input = [
      JSON.stringify({ body: "partial", finished: false }),
      JSON.stringify({ body: "final", finished: true }),
    ].join("\n");
    const result = parseStreamingAgentResponse(input);
    if (result) {
      expect(result.body).toBe("final");
      expect(result.finished).toBe(true);
    }
  });

  test("should return null if no valid finished chunk", () => {
    const input = [
      JSON.stringify({ body: "partial", finished: false }),
      JSON.stringify({ foo: "bar" }),
    ].join("\n");
    const result = parseStreamingAgentResponse(input);
    expect(result).toBeNull();
  });

  test("should skip invalid JSON lines", () => {
    const input = [
      "not json",
      JSON.stringify({ body: "final", finished: true }),
    ].join("\n");
    const result = parseStreamingAgentResponse(input);
    if (result) {
      expect(result.body).toBe("final");
      expect(result.finished).toBe(true);
    }
  });

  test("should return null for empty input", () => {
    expect(parseStreamingAgentResponse("")).toBeNull();
    expect(parseStreamingAgentResponse(null as unknown as string)).toBeNull();
    expect(
      parseStreamingAgentResponse(undefined as unknown as string),
    ).toBeNull();
  });
});

describe("validateAgentMaxTurns", () => {
  test("should accept valid agent_max_turns values", () => {
    const validValues = ["5", "10", "15", "20"];

    for (const value of validValues) {
      const result = validateAgentMaxTurns(value);
      expect(result).toBe(parseInt(value));
    }
  });

  test("should throw error for invalid agent_max_turns values", () => {
    const invalidValues = ["1", "3", "7", "12", "25", "abc", ""];

    for (const value of invalidValues) {
      expect(() => validateAgentMaxTurns(value)).toThrow(
        `Invalid agent_max_turns value: "${value}". Must be one of: 5, 10, 15, 20`,
      );
    }
  });
});

describe("parseH2ogpteConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment variables before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  test("should parse valid agent_max_turns from environment", () => {
    process.env.INPUT_AGENT_MAX_TURNS = "15";
    process.env.INPUT_LLM = "gpt-4o";

    const config = parseH2ogpteConfig();
    expect(config.agent_max_turns).toBe(15);
    expect(config.llm).toBe("gpt-4o");
  });

  test("should throw error for invalid agent_max_turns from environment", () => {
    process.env.INPUT_AGENT_MAX_TURNS = "7";

    expect(() => parseH2ogpteConfig()).toThrow(
      `Invalid agent_max_turns value: "7". Must be one of: 5, 10, 15, 20`,
    );
  });

  test("should handle empty agent_max_turns from environment", () => {
    process.env.INPUT_AGENT_MAX_TURNS = "";

    const config = parseH2ogpteConfig();
    expect(config.agent_max_turns).toBeUndefined();
  });
});
