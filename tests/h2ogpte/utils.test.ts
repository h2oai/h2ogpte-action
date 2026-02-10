import { describe, test, expect } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  buildCustomToolFormData,
  parseStreamingAgentResponse,
} from "../../src/core/services/h2ogpte/utils";

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
