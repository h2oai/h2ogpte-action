import { describe, test, expect } from "bun:test";
import { createInitialWorkingComment } from "../../../src/core/response/utils/comment-formatter";
import type { SlashCommand } from "../../../src/core/response/utils/slash-commands";

const TEST_ACTION_URL = "https://github.com/owner/repo/actions/runs/123456789";

describe("createInitialWorkingComment", () => {
  test("should create comment with no commands", () => {
    const usedCommands: SlashCommand[] = [];
    const result = createInitialWorkingComment(TEST_ACTION_URL, usedCommands);

    // Extract the working message from the result
    const match = result.match(/^### (.+) &nbsp;/);
    expect(match).not.toBeNull();
    const workingMessage = match![1];

    const expected = `### ${workingMessage} &nbsp;<img src="https://h2ogpte-github-action.cdn.h2o.ai/h2o_loading.gif" width="40px"/>\n\nFollow progress in the [GitHub Action run](${TEST_ACTION_URL})`;
    expect(result).toBe(expected);
  });

  test("should create comment with single command", () => {
    const usedCommands: SlashCommand[] = [
      { name: "/review", prompt: "Review the code" },
    ];
    const result = createInitialWorkingComment(TEST_ACTION_URL, usedCommands);

    expect(result).toContain("### h2oGPTe");
    expect(result).toContain(
      '<img src="https://h2ogpte-github-action.cdn.h2o.ai/h2o_loading.gif" width="40px"/>',
    );
    expect(result).toContain("Slash commands used: `/review`");
    expect(result).toContain(
      `Follow progress in the [GitHub Action run](${TEST_ACTION_URL})`,
    );
  });

  test("should create comment with multiple commands", () => {
    const usedCommands: SlashCommand[] = [
      { name: "/docs", prompt: "Generate docs" },
      { name: "/review", prompt: "Review the code" },
      { name: "/test", prompt: "Run tests" },
    ];
    const result = createInitialWorkingComment(TEST_ACTION_URL, usedCommands);

    expect(result).toContain("### h2oGPTe");
    expect(result).toContain(
      '<img src="https://h2ogpte-github-action.cdn.h2o.ai/h2o_loading.gif" width="40px"/>',
    );
    expect(result).toContain("Slash commands used: `/docs /review /test`");
    expect(result).toContain(
      `Follow progress in the [GitHub Action run](${TEST_ACTION_URL})`,
    );
  });

  test("should include one of the working messages", () => {
    const usedCommands: SlashCommand[] = [];
    const result = createInitialWorkingComment(TEST_ACTION_URL, usedCommands);

    const workingMessages = [
      "h2oGPTe is working on it",
      "h2oGPTe is working",
      "h2oGPTe is thinking",
      "h2oGPTe is connecting the dots",
      "h2oGPTe is putting it all together",
      "h2oGPTe is processing your request",
    ];

    const containsOneMessage = workingMessages.some((message) =>
      result.includes(message),
    );
    expect(containsOneMessage).toBe(true);
  });

  test("should format commands with correct formatting", () => {
    const usedCommands: SlashCommand[] = [
      { name: "/review", prompt: "Review code" },
      { name: "/test", prompt: "Run tests" },
    ];
    const result = createInitialWorkingComment(TEST_ACTION_URL, usedCommands);

    // Verify commands are space-separated in backticks
    expect(result).toContain("Slash commands used: `/review /test`");
  });

  test("should maintain correct markdown structure", () => {
    const usedCommands: SlashCommand[] = [
      { name: "/review", prompt: "Review code" },
    ];
    const result = createInitialWorkingComment(TEST_ACTION_URL, usedCommands);

    // Should have proper markdown structure
    expect(result).toMatch(/^### .+ &nbsp;.+$/m); // Header with GIF
    expect(result).toContain("Slash commands used:");
    expect(result).toMatch(/\[GitHub Action run\]\(.+\)/); // Link format
  });

  test("should handle commands with special characters in name", () => {
    const usedCommands: SlashCommand[] = [
      { name: "/custom-command", prompt: "Custom prompt" },
      { name: "/test_command", prompt: "Test prompt" },
    ];
    const result = createInitialWorkingComment(TEST_ACTION_URL, usedCommands);

    expect(result).toContain(
      "Slash commands used: `/custom-command /test_command`",
    );
  });
});
