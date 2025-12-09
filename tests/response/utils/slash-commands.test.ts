import { describe, test, expect, beforeEach } from "bun:test";
import { getSlashCommandsPrompt } from "../../../src/core/response/utils/slash-commands";

// Test data constants
const EMPTY_COMMANDS = "[]";
const SINGLE_COMMAND = JSON.stringify([
  { name: "/review", prompt: "Review the code and provide feedback" },
]);
const MULTIPLE_COMMANDS = JSON.stringify([
  { name: "/review", prompt: "Review the code and provide feedback" },
  { name: "/test", prompt: "Run tests and report results" },
  { name: "/docs", prompt: "Generate documentation" },
]);
const COMMAND_WITH_SPECIAL_CHARS = JSON.stringify([
  {
    name: "/review",
    prompt: "Review code with: - Error handling\n- Performance\n- Security",
  },
]);
const INVALID_JSON = "not valid json";
const NOT_AN_ARRAY = JSON.stringify({ not: "an array" });
const INVALID_COMMAND = JSON.stringify([{ name: 123, prompt: "Invalid" }]);
const NULL_COMMAND = JSON.stringify([null]);

describe("getSlashCommandsPrompt", () => {
  beforeEach(() => {
    // Clear the environment variable before each test
    delete process.env.SLASH_COMMANDS;
  });

  describe("valid slash commands", () => {
    test("should return empty string when no slash commands are configured", () => {
      process.env.SLASH_COMMANDS = EMPTY_COMMANDS;
      const instruction = "Please review this code";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe("");
    });

    test("should return empty string when no slash commands are defined but user tries to use one", () => {
      process.env.SLASH_COMMANDS = EMPTY_COMMANDS;
      const instruction = "Please /review this code";
      // Even though instruction contains /review, no commands are defined, so should return empty string
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe("");
    });

    test("should return empty string when instruction does not contain any command names", () => {
      process.env.SLASH_COMMANDS = MULTIPLE_COMMANDS;
      const instruction = "Please help me with this";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe("");
    });

    test("should include matching command when instruction contains command name", () => {
      process.env.SLASH_COMMANDS = SINGLE_COMMAND;
      const instruction = "Please /review this code";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe(
        "<slash_commands>\nSlash commands are a way for the user to predefine specific actions for you (the agent) to perform in the repository.\nThe following slash commands were requested by the user:\n- /review: Review the code and provide feedback\n</slash_commands>",
      );
    });

    test("should include multiple matching commands", () => {
      process.env.SLASH_COMMANDS = MULTIPLE_COMMANDS;
      const instruction = "Please /review and /test this code";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toContain(
        "Slash commands are a way for the user to predefine specific actions for you (the agent) to perform in the repository.",
      );
      expect(result).toContain(
        "- /review: Review the code and provide feedback",
      );
      expect(result).toContain("- /test: Run tests and report results");
      expect(result).not.toContain("/docs");
    });

    test("should handle multi-line instructions", () => {
      process.env.SLASH_COMMANDS = MULTIPLE_COMMANDS;
      const instruction = `Please help me with:
/review the code
and /test it`;
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toContain(
        "Slash commands are a way for the user to predefine specific actions for you (the agent) to perform in the repository.",
      );
      expect(result).toContain(
        "- /review: Review the code and provide feedback",
      );
      expect(result).toContain("- /test: Run tests and report results");
    });

    test("should handle commands with special characters in prompt", () => {
      process.env.SLASH_COMMANDS = COMMAND_WITH_SPECIAL_CHARS;
      const instruction = "Please /review this";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toContain(
        "Slash commands are a way for the user to predefine specific actions for you (the agent) to perform in the repository.",
      );
      expect(result).toContain(
        "- /review: Review code with: - Error handling\n- Performance\n- Security",
      );
    });
  });

  describe("error handling", () => {
    test("should throw error when SLASH_COMMANDS is not valid JSON", () => {
      process.env.SLASH_COMMANDS = INVALID_JSON;
      const instruction = "Please review this";
      expect(() => getSlashCommandsPrompt(instruction)).toThrow();
    });

    test("should throw error when SLASH_COMMANDS is not an array", () => {
      process.env.SLASH_COMMANDS = NOT_AN_ARRAY;
      const instruction = "Please review this";
      expect(() => getSlashCommandsPrompt(instruction)).toThrow(
        "SLASH_COMMANDS must be an array",
      );
    });

    test("should throw error when command has invalid structure", () => {
      process.env.SLASH_COMMANDS = INVALID_COMMAND;
      const instruction = "Please review this";
      expect(() => getSlashCommandsPrompt(instruction)).toThrow(
        "Each entry in SLASH_COMMANDS must be an object with string 'name' and 'prompt' properties",
      );
    });

    test("should throw proper error when command is null", () => {
      process.env.SLASH_COMMANDS = NULL_COMMAND;
      const instruction = "Please review this";
      expect(() => getSlashCommandsPrompt(instruction)).toThrow(
        "Each entry in SLASH_COMMANDS must be an object with string 'name' and 'prompt' properties",
      );
    });
  });

  describe("edge cases", () => {
    test("should match command with different case", () => {
      process.env.SLASH_COMMANDS = SINGLE_COMMAND;
      const instruction = "Please /REVIEW this code";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toContain(
        "- /review: Review the code and provide feedback",
      );
    });

    test("should not match command name as substring of another word", () => {
      process.env.SLASH_COMMANDS = JSON.stringify([
        { name: "/test", prompt: "Run tests" },
      ]);
      const instruction = "Please /testing this code";
      // Should not match because "/test" is part of "/testing", so should return empty string
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe("");
    });

    test("should not match command name in hyphenated word", () => {
      process.env.SLASH_COMMANDS = JSON.stringify([
        { name: "/test", prompt: "Run tests" },
      ]);
      const instruction = "Please /test-drive this code";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe("");
    });

    test("should match exact command name with word boundaries", () => {
      process.env.SLASH_COMMANDS = JSON.stringify([
        { name: "/test", prompt: "Run tests" },
      ]);
      const instruction = "Please /test this code";
      // Should match exact "/test" command
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toContain("- /test: Run tests");
    });
  });
});
