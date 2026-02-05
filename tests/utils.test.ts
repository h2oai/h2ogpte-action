import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  getGithubMcpAllowedTools,
  getGithubMcpAllowedToolsets,
  getGithubMcpUrl,
} from "../src/core/services/github/copilot-mcp";
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

describe("getGithubMcpUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns api.githubcopilot.com for github.com", () => {
    process.env.GITHUB_SERVER_URL = "https://github.com";
    expect(getGithubMcpUrl()).toBe("https://api.githubcopilot.com/mcp/");
  });

  test("returns api.githubcopilot.com for github.com with trailing slash", () => {
    process.env.GITHUB_SERVER_URL = "https://github.com/";
    expect(getGithubMcpUrl()).toBe("https://api.githubcopilot.com/mcp/");
  });

  test("returns copilot-api subdomain for GHE.com with data residency", () => {
    process.env.GITHUB_SERVER_URL = "https://octocorp.ghe.com";
    expect(getGithubMcpUrl()).toBe("https://copilot-api.octocorp.ghe.com/mcp");
  });

  test("throws for GitHub Enterprise Server", () => {
    process.env.GITHUB_SERVER_URL = "https://github.company.com";
    expect(() => getGithubMcpUrl()).toThrow(
      "GitHub MCP is not supported for GitHub Enterprise Server (https://github.company.com)." +
        " GitHub Enterprise Server support is planned for a future release",
    );
  });

  test("throws when GITHUB_SERVER_URL is missing", () => {
    delete process.env.GITHUB_SERVER_URL;
    expect(() => getGithubMcpUrl()).toThrow("GitHub server url is required");
  });

  test("throws when GITHUB_SERVER_URL is invalid", () => {
    process.env.GITHUB_SERVER_URL = "not-a-valid-url";
    expect(() => getGithubMcpUrl()).toThrow("Invalid GitHub server URL");
  });
});

describe("getGithubMcpAllowedTools", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns env value when set", () => {
    process.env.GITHUB_MCP_ALLOWED_TOOLS = "custom_tool_a,custom_tool_b";
    expect(getGithubMcpAllowedTools()).toBe("custom_tool_a,custom_tool_b");
  });

  test("throws when env not set", () => {
    delete process.env.GITHUB_MCP_ALLOWED_TOOLS;
    expect(() => getGithubMcpAllowedTools()).toThrow(
      "GITHUB_MCP_ALLOWED_TOOLS is required",
    );
  });

  test("returns empty string when env is explicitly empty", () => {
    process.env.GITHUB_MCP_ALLOWED_TOOLS = "";
    expect(getGithubMcpAllowedTools()).toBe("");
  });
});

describe("getGithubMcpAllowedToolsets", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns env value when set", () => {
    process.env.GITHUB_MCP_ALLOWED_TOOLSETS = "issues,repos";
    expect(getGithubMcpAllowedToolsets()).toBe("issues,repos");
  });

  test("throws when env not set", () => {
    delete process.env.GITHUB_MCP_ALLOWED_TOOLSETS;
    expect(() => getGithubMcpAllowedToolsets()).toThrow(
      "GITHUB_MCP_ALLOWED_TOOLSETS is required",
    );
  });

  test("returns empty string when env is explicitly empty", () => {
    process.env.GITHUB_MCP_ALLOWED_TOOLSETS = "";
    expect(getGithubMcpAllowedToolsets()).toBe("");
  });
});

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
