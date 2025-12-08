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
const CASE_SENSITIVE_COMMAND = JSON.stringify([
  { name: "/Review", prompt: "Review code" },
]);
const INVALID_JSON = "not valid json";
const NOT_AN_ARRAY = JSON.stringify({ not: "an array" });
const INVALID_COMMAND = JSON.stringify([{ name: 123, prompt: "Invalid" }]);

describe("getSlashCommandsPrompt", () => {
  beforeEach(() => {
    // Clear the environment variable before each test
    delete process.env.SLASH_COMMANDS;
  });

  describe("valid slash commands", () => {
    test("should return header when no slash commands are configured", () => {
      process.env.SLASH_COMMANDS = EMPTY_COMMANDS;
      const instruction = "Please review this code";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe(
        "The following slash commands were requested by the user:",
      );
    });

    test("should return header when instruction does not contain any command names", () => {
      process.env.SLASH_COMMANDS = MULTIPLE_COMMANDS;
      const instruction = "Please help me with this";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe(
        "The following slash commands were requested by the user:",
      );
    });

    test("should include matching command when instruction contains command name", () => {
      process.env.SLASH_COMMANDS = SINGLE_COMMAND;
      const instruction = "Please /review this code";
      const result = getSlashCommandsPrompt(instruction);
      expect(result).toBe(
        "The following slash commands were requested by the user:- /review: Review the code and provide feedback\n",
      );
    });

    test("should include multiple matching commands", () => {
      process.env.SLASH_COMMANDS = MULTIPLE_COMMANDS;
      const instruction = "Please /review and /test this code";
      const result = getSlashCommandsPrompt(instruction);
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
        "- /review: Review the code and provide feedback",
      );
      expect(result).toContain("- /test: Run tests and report results");
    });

    test("should handle commands with special characters in prompt", () => {
      process.env.SLASH_COMMANDS = COMMAND_WITH_SPECIAL_CHARS;
      const instruction = "Please /review this";
      const result = getSlashCommandsPrompt(instruction);
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
  });

  describe("edge cases", () => {
    test("should handle case-sensitive matching", () => {
      process.env.SLASH_COMMANDS = CASE_SENSITIVE_COMMAND;
      const instruction = "Please /review this";
      // Should not match because case is different
      const result = getSlashCommandsPrompt(instruction);
      expect(result).not.toContain("/Review");
    });

    test("should not match command name as substring of another word", () => {
      process.env.SLASH_COMMANDS = JSON.stringify([
        { name: "/test", prompt: "Run tests" },
      ]);
      const instruction = "Please test this code";
      // Should not match because "/test" is not in the instruction
      const result = getSlashCommandsPrompt(instruction);
      expect(result).not.toContain("/test");
    });
  });
});
