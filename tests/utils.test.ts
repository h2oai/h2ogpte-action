import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  parseStreamingAgentResponse,
  extractFinalAgentResponse,
  parseH2ogpteConfig,
} from "../src/utils";

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

describe("extractFinalAgentResponse", () => {
  test("should extract and clean the section between third-to-last and second-to-last ENDOFTURN", () => {
    const input = [
      "Some irrelevant text",
      "ENDOFTURN",
      "<stream_turn_title>Title</stream_turn_title>\n**Completed LLM call in 1.23 seconds after 1 turns and time 1.23 out of 3600.**\nThis is the final response.",
      "ENDOFTURN",
      "<stream_turn_title>Another</stream_turn_title>\n** [2025-07-02 - 08:45:44.1 PM PDT] Completed execution of code block using python in 2.03 seconds after 1 turns and time 54.98 out of 3600.**\nCleaned response!",
      "ENDOFTURN",
      "Trailing stuff",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("This is the final response.");
  });

  test("should return input as-is if less than 2 ENDOFTURNs", () => {
    const input = "No end markers here";
    expect(extractFinalAgentResponse(input)).toBe(input);
    const input2 = "ENDOFTURN only once";
    expect(extractFinalAgentResponse(input2)).toBe(input2);
  });

  test("should remove metadata and timestamps", () => {
    const input = [
      "ENDOFTURN",
      "Some text\n**Completed LLM call in 2.34 seconds after 2 turns and time 2.34 out of 3600.**\n** [2025-07-02 - 08:45:44.1 PM PDT] Completed execution of code block using python in 2.03 seconds after 1 turns and time 54.98 out of 3600.**\n**Executing python code blocks**\n**No executable code blocks found, terminating conversation...**\nFinal output!",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Some text\nFinal output!");
  });

  test("should remove citation patterns", () => {
    const input = [
      "ENDOFTURN",
      "Here is some information [citation: 1] and more details [citation:42]. Also check this [citation: 123] and that [citation:1].",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "Here is some information and more details. Also check this and that.",
    );
  });

  test("should handle null, undefined, or empty input", () => {
    expect(extractFinalAgentResponse("")).toBe(
      "The agent did not return a valid response. Please check h2oGPTe.",
    );
    expect(extractFinalAgentResponse(null as unknown as string)).toBe(
      "The agent did not return a valid response. Please check h2oGPTe.",
    );
    expect(extractFinalAgentResponse(undefined as unknown as string)).toBe(
      "The agent did not return a valid response. Please check h2oGPTe.",
    );
  });

  test("should trim whitespace and newlines", () => {
    const input = [
      "ENDOFTURN",
      "\n\n   Some text with whitespace   \n\n",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Some text with whitespace");
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
