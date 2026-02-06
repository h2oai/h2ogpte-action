import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  buildCustomToolFormData,
  parseStreamingAgentResponse,
  createUsageReport,
  parseUserH2ogpteConfig,
} from "../../src/core/services/h2ogpte/utils";
import type { Message } from "../../src/core/services/h2ogpte/types";
import * as h2ogpte from "../../src/core/services/h2ogpte/h2ogpte";
import * as core from "@actions/core";

function createTempFile(filename: string, content: string) {
  const dir = mkdtempSync(join(tmpdir(), "h2ogpte-"));
  const filePath = join(dir, filename);
  writeFileSync(filePath, content);
  return { dir, filePath };
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

    const config = parseUserH2ogpteConfig();
    expect(config.agent_max_turns).toBe("15");
    expect(config.llm).toBe("gpt-4o");
  });

  test("should throw error for invalid agent_max_turns from environment", () => {
    process.env.AGENT_MAX_TURNS = "7";

    expect(() => parseUserH2ogpteConfig()).toThrow(
      `Invalid agent_max_turns value: "7". Must be one of: auto, 5, 10, 15, 20`,
    );
  });

  test("should parse auto agent_max_turns from environment", () => {
    process.env.AGENT_MAX_TURNS = "auto";
    process.env.LLM = "gpt-4o";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_max_turns).toBe("auto");
    expect(config.llm).toBe("gpt-4o");
  });

  test("should use default llm when empty from environment", () => {
    process.env.LLM = "";

    const config = parseUserH2ogpteConfig();
    expect(config.llm).toBe("auto");
  });

  test("should use default agent_max_turns when empty from environment", () => {
    process.env.AGENT_MAX_TURNS = "";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_max_turns).toBe("auto");
  });

  test("should parse valid agent_accuracy from environment", () => {
    process.env.AGENT_ACCURACY = "standard";
    process.env.LLM = "gpt-4o";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_accuracy).toBe("standard");
    expect(config.llm).toBe("gpt-4o");
  });

  test("should throw error for invalid agent_accuracy from environment", () => {
    process.env.AGENT_ACCURACY = "very_high";

    expect(() => parseUserH2ogpteConfig()).toThrow(
      `Invalid agent_accuracy value: "very_high". Must be one of: quick, basic, standard, maximum`,
    );
  });

  test("should use default agent_accuracy when empty from environment", () => {
    process.env.AGENT_ACCURACY = "";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_accuracy).toBe("standard");
  });

  test("should parse valid agent_total_timeout from environment", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "1800";
    process.env.LLM = "gpt-4o";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(1800);
    expect(config.llm).toBe("gpt-4o");
  });

  test("should use default agent_total_timeout when empty from environment", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should use default agent_total_timeout when undefined from environment", () => {
    delete process.env.AGENT_TOTAL_TIMEOUT;

    const config = parseUserH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should parse zero timeout value", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "0";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(0);
  });

  test("should parse large timeout values", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "7200";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(7200);
  });

  test("should handle negative timeout values by using default", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "-1";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should handle non-numeric timeout values by using default", () => {
    process.env.AGENT_TOTAL_TIMEOUT = "invalid";

    const config = parseUserH2ogpteConfig();
    expect(config.agent_total_timeout).toBe(3600);
  });

  test("should use defaults when environment variables are undefined", () => {
    delete process.env.LLM;
    delete process.env.AGENT_MAX_TURNS;
    delete process.env.AGENT_ACCURACY;
    delete process.env.AGENT_TOTAL_TIMEOUT;

    const config = parseUserH2ogpteConfig();
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

    const config = parseUserH2ogpteConfig();
    expect(config.llm).toBe("gpt-4o");
    expect(config.agent_max_turns).toBe("20");
    expect(config.agent_accuracy).toBe("maximum");
    expect(config.agent_total_timeout).toBe(5400);
  });
});

describe("createUsageReport", () => {
  test("should call core.warning when no messages are found", async () => {
    const warningSpy = spyOn(core, "warning");
    const getMessagesSpy = spyOn(
      h2ogpte,
      "getSessionMessages",
    ).mockResolvedValue([]);

    await createUsageReport("session-123");

    expect(warningSpy).toHaveBeenCalledWith(
      "No messages found for session session-123",
    );
    expect(warningSpy).toHaveBeenCalledTimes(1);

    warningSpy.mockRestore();
    getMessagesSpy.mockRestore();
  });

  test("should call core.warning when messages is null", async () => {
    const warningSpy = spyOn(core, "warning");
    const getMessagesSpy = spyOn(
      h2ogpte,
      "getSessionMessages",
    ).mockResolvedValue(null as unknown as Message[]);

    await createUsageReport("session-456");

    expect(warningSpy).toHaveBeenCalledWith(
      "No messages found for session session-456",
    );
    expect(warningSpy).toHaveBeenCalledTimes(1);

    warningSpy.mockRestore();
    getMessagesSpy.mockRestore();
  });

  test("should attempt to write summary when error is present", async () => {
    const warningSpy = spyOn(core, "warning");
    const getMessagesSpy = spyOn(
      h2ogpte,
      "getSessionMessages",
    ).mockResolvedValue([
      {
        id: "msg-1",
        content: "",
        created_at: "2024-01-01T00:00:00Z",
        error: "Test error message",
      },
    ] as Message[]);

    await createUsageReport("session-789");

    expect(warningSpy.mock.calls[0]?.[0]).toContain(
      "Failed to create usage report",
    );

    warningSpy.mockRestore();
    getMessagesSpy.mockRestore();
  });

  test("should handle errors and call core.warning on failure", async () => {
    const warningSpy = spyOn(core, "warning");
    const getMessagesSpy = spyOn(
      h2ogpte,
      "getSessionMessages",
    ).mockRejectedValue(new Error("Network error"));

    await createUsageReport("session-error");

    expect(warningSpy).toHaveBeenCalled();
    expect(warningSpy.mock.calls[0]?.[0]).toContain(
      "Failed to create usage report",
    );
    expect(warningSpy.mock.calls[0]?.[0]).toContain("Network error");

    warningSpy.mockRestore();
    getMessagesSpy.mockRestore();
  });
});

describe("buildCustomToolFormData", () => {
  test("stringifies object toolArgs", () => {
    const formData = buildCustomToolFormData({
      toolType: "local_mcp",
      toolArgs: { foo: "bar", count: 2 },
    });

    expect(formData.get("tool_type")).toBe("local_mcp");
    expect(formData.get("tool_args")).toBe(
      JSON.stringify({ foo: "bar", count: 2 }),
    );
    expect(formData.get("custom_tool_path")).toBeNull();
    expect(formData.get("file")).toBeNull();
  });

  test("attaches file, custom tool path, and respects provided filename", async () => {
    const { dir, filePath } = createTempFile("input.txt", "file-contents");

    const formData = buildCustomToolFormData({
      toolType: "browser_action",
      toolArgs: "raw-args",
      filePath,
      customToolPath: "/tmp/custom-tool",
      filename: "override.txt",
    });

    expect(formData.get("tool_type")).toBe("browser_action");
    expect(formData.get("tool_args")).toBe("raw-args");
    expect(formData.get("custom_tool_path")).toBe("/tmp/custom-tool");
    expect(formData.get("filename")).toBe("override.txt");

    const fileEntry = formData.get("file");
    expect(fileEntry).toBeInstanceOf(File);
    if (fileEntry instanceof File) {
      expect(fileEntry.name).toBe("override.txt");
      expect(await fileEntry.text()).toBe("file-contents");
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("falls back to basename when filename not provided", async () => {
    const { dir, filePath } = createTempFile("default.txt", "hello world");

    const formData = buildCustomToolFormData({
      toolType: "general_code",
      toolArgs: "{}",
      filePath,
    });

    const fileEntry = formData.get("file");
    expect(fileEntry).toBeInstanceOf(File);
    if (fileEntry instanceof File) {
      expect(fileEntry.name).toBe("default.txt");
      expect(await fileEntry.text()).toBe("hello world");
    }

    // filename field should not be set when not provided
    expect(formData.get("filename")).toBeNull();

    rmSync(dir, { recursive: true, force: true });
  });
});
