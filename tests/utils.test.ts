import { describe, expect, test } from "bun:test";
import type { CustomTool } from "../src/core/services/h2ogpte/types";
import { addToolsToListIfMissing, getToolNameById } from "../src/core/utils";

function createTool(id: string, toolName: string): CustomTool {
  return {
    id,
    tool_name: toolName,
    tool_type: "remote_mcp",
    tool_args: {},
    owner_email: "test@example.com",
  };
}

describe("getToolNameById", () => {
  test("returns tool_name when tool exists", () => {
    const tools: CustomTool[] = [
      createTool("id-1", "tool_a"),
      createTool("id-2", "tool_b"),
      createTool("id-3", "tool_c"),
    ];
    expect(getToolNameById(tools, "id-2")).toBe("tool_b");
  });

  test("returns tool_name for first tool in list", () => {
    const tools: CustomTool[] = [
      createTool("first", "first_tool"),
      createTool("second", "second_tool"),
    ];
    expect(getToolNameById(tools, "first")).toBe("first_tool");
  });

  test("returns tool_name for last tool in list", () => {
    const tools: CustomTool[] = [
      createTool("a", "tool_a"),
      createTool("b", "tool_b"),
    ];
    expect(getToolNameById(tools, "b")).toBe("tool_b");
  });

  test("throws when tool id not found", () => {
    const tools: CustomTool[] = [
      createTool("id-1", "tool_a"),
      createTool("id-2", "tool_b"),
    ];
    expect(() => getToolNameById(tools, "nonexistent")).toThrow(
      "Tool with id nonexistent not found",
    );
  });

  test("throws when tools array is empty", () => {
    const tools: CustomTool[] = [];
    expect(() => getToolNameById(tools, "any-id")).toThrow(
      "Tool with id any-id not found",
    );
  });
});

describe("addToolsToListIfMissing", () => {
  test("adds all tools when list is empty", () => {
    const result = addToolsToListIfMissing([], ["a", "b", "c"]);
    expect(result).toEqual(["a", "b", "c"]);
  });

  test("adds only missing tools", () => {
    const result = addToolsToListIfMissing(["a", "b"], ["b", "c", "d"]);
    expect(result).toEqual(["a", "b", "c", "d"]);
  });

  test("returns copy when all tools already present", () => {
    const original = ["a", "b", "c"];
    const result = addToolsToListIfMissing(original, ["a", "b", "c"]);
    expect(result).toEqual(["a", "b", "c"]);
    expect(result).not.toBe(original);
  });

  test("does not mutate original array", () => {
    const original = ["x", "y"];
    addToolsToListIfMissing(original, ["z"]);
    expect(original).toEqual(["x", "y"]);
  });

  test("adds no tools when toolsToAdd is empty", () => {
    const result = addToolsToListIfMissing(["a", "b"], []);
    expect(result).toEqual(["a", "b"]);
  });

  test("preserves order of existing tools", () => {
    const result = addToolsToListIfMissing(["first", "second"], ["new"]);
    expect(result).toEqual(["first", "second", "new"]);
  });
});
