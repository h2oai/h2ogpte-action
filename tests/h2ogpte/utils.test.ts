import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  parseStreamingAgentResponse,
  parseH2ogpteConfig,
} from "../../src/core/services/h2ogpte/utils";

// Helper function to test validation logic
function validateAgentMaxTurns(value: string): string | null {
  const allowedValues = ["auto", "5", "10", "15", "20"];

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid agent_max_turns value: "${value}". Must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return value;
}

// Helper function to test agent_accuracy validation logic
function validateAgentAccuracy(value: string): string | null {
  const allowedValues = ["quick", "basic", "standard", "maximum"];

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid agent_accuracy value: "${value}". Must be one of: ${allowedValues.join(", ")}`,
    );
  }

  return value;
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
    const validValues = ["auto", "5", "10", "15", "20"];

    for (const value of validValues) {
      const result = validateAgentMaxTurns(value);
      expect(result).toBe(value);
    }
  });

  test("should throw error for invalid agent_max_turns values", () => {
    const invalidValues = ["1", "3", "7", "12", "25", "abc", ""];

    for (const value of invalidValues) {
      expect(() => validateAgentMaxTurns(value)).toThrow(
        `Invalid agent_max_turns value: "${value}". Must be one of: auto, 5, 10, 15, 20`,
      );
    }
  });
});

describe("validateAgentAccuracy", () => {
  test("should accept valid agent_accuracy values", () => {
    const validValues = ["quick", "basic", "standard", "maximum"];

    for (const value of validValues) {
      const result = validateAgentAccuracy(value);
      expect(result).toBe(value);
    }
  });

  test("should throw error for invalid agent_accuracy values", () => {
    const invalidValues = ["very_low", "very_high", "normal", "abc", ""];

    for (const value of invalidValues) {
      expect(() => validateAgentAccuracy(value)).toThrow(
        `Invalid agent_accuracy value: "${value}". Must be one of: quick, basic, standard, maximum`,
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
    process.env.AGENT_MAX_TURNS = "15";
    process.env.LLM = "gpt-4o";

    const config = parseH2ogpteConfig();
    expect(config.agent_max_turns).toBe("15");
    expect(config.llm).toBe("gpt-4o");
  });

  test("should throw error for invalid agent_max_turns from environment", () => {
    process.env.AGENT_MAX_TURNS = "7";

    expect(() => parseH2ogpteConfig()).toThrow(
      `Invalid agent_max_turns value: "7". Must be one of: auto, 5, 10, 15, 20`,
    );
  });

  test("should parse auto agent_max_turns from environment", () => {
    process.env.AGENT_MAX_TURNS = "auto";
    process.env.LLM = "gpt-4o";

    const config = parseH2ogpteConfig();
    expect(config.agent_max_turns).toBe("auto");
    expect(config.llm).toBe("gpt-4o");
  });

  test("should use default llm when empty from environment", () => {
    process.env.LLM = "";

    const config = parseH2ogpteConfig();
    expect(config.llm).toBe("auto");
  });

  test("should use default agent_max_turns when empty from environment", () => {
    process.env.AGENT_MAX_TURNS = "";

    const config = parseH2ogpteConfig();
    expect(config.agent_max_turns).toBe("auto");
  });

  test("should parse valid agent_accuracy from environment", () => {
    process.env.AGENT_ACCURACY = "standard";
    process.env.LLM = "gpt-4o";

    const config = parseH2ogpteConfig();
    expect(config.agent_accuracy).toBe("standard");
    expect(config.llm).toBe("gpt-4o");
  });

  test("should throw error for invalid agent_accuracy from environment", () => {
    process.env.AGENT_ACCURACY = "very_high";

    expect(() => parseH2ogpteConfig()).toThrow(
      `Invalid agent_accuracy value: "very_high". Must be one of: quick, basic, standard, maximum`,
    );
  });

  test("should use default agent_accuracy when empty from environment", () => {
    process.env.AGENT_ACCURACY = "";

    const config = parseH2ogpteConfig();
    expect(config.agent_accuracy).toBe("standard");
  });

  test("should parse valid agent_total_timeout from environment", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "1800";
    process.env.LLM = "gpt-4o";

    const config = parseH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(1800);
    expect(config.llm).toBe("gpt-4o");
  });

  test("should use default agent_total_timeout when empty from environment", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "";

    const config = parseH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should use default agent_total_timeout when undefined from environment", () => {
    delete process.env.AGENT_TOTAL_TIMEOUT;

    const config = parseH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should parse zero timeout value", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "0";

    const config = parseH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(0);
  });

  test("should parse large timeout values", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "7200";

    const config = parseH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(7200);
  });

  test("should handle negative timeout values by using default", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "-1";

    const config = parseH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should handle non-numeric timeout values by using default", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "invalid";

    const config = parseH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should use defaults when environment variables are undefined", () => {
    delete process.env.LLM;
    delete process.env.AGENT_MAX_TURNS;
    delete process.env.AGENT_ACCURACY;
    delete process.env.AGENT_TOTAL_TIMEOUT;

    const config = parseH2ogpteConfig();
    expect(config.llm).toBe("auto");
    expect(config.agent_max_turns).toBe("auto");
    expect(config.agent_accuracy).toBe("standard");
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should parse all configuration values together", () => {
    process.env.LLM = "gpt-4o";
    process.env.AGENT_MAX_TURNS = "20";
    process.env.AGENT_ACCURACY = "maximum";
    process.env.AGENT_TOTAL_TIMEOUT = "5400";

    const config = parseH2ogpteConfig();
    expect(config.llm).toBe("gpt-4o");
    expect(config.agent_max_turns).toBe("20");
    expect(config.agent_accuracy).toBe("maximum");
    expect(config.agent_total_timeout).toBe(5400);
  });
});
