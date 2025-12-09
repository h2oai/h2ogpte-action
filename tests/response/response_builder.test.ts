import { describe, test, expect } from "bun:test";
import { buildH2ogpteResponse } from "../../src/core/response/response_builder";
import type { ChatResponse } from "../../src/core/services/h2ogpte/types";
import type { SlashCommand } from "../../src/core/response/utils/slash-commands";

describe("buildH2ogpteResponse", () => {
  const mockActionUrl =
    "https://github.com/username/repo/actions/runs/123456789";
  const mockChatUrl = "https://h2ogpte.example.com/chat/abc123";

  // Extract references to a variable for easy maintenance
  const getExpectedReferences = (actionUrl: string, chatUrl: string) =>
    `For more details see the [github action run](${actionUrl}) or contact the repository admin to see the [chat session](${chatUrl}).\n🚀 Powered by [h2oGPTe](https://h2o.ai/platform/enterprise-h2ogpte/)`;

  describe("successful responses", () => {
    test("should format successful response with single line instruction", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "This is a successful response from h2oGPTe.",
      };
      const instruction = "Please review this code";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "> Please review this code",
        "---",
        "This is a successful response from h2oGPTe.",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should format successful response with multi-line instruction", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Here are my suggestions:\n\n1. Add error handling\n2. Improve documentation",
      };
      const instruction =
        "Please review this PR\nand suggest improvements\nfor the error handling";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "> Please review this PR",
        "> and suggest improvements",
        "> for the error handling",
        "---",
        "Here are my suggestions:\n\n1. Add error handling\n2. Improve documentation",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle instruction with empty lines and whitespace", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Response content",
      };
      const instruction =
        "  First line  \n\n  Second line  \n  \n  Third line  ";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "> First line",
        "> Second line",
        "> Third line",
        "---",
        "Response content",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle empty instruction", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Response content",
      };
      const instruction = "";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "",
        "---",
        "Response content",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle instruction with only whitespace", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Response content",
      };
      const instruction = "   \n  \n  ";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "",
        "---",
        "Response content",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });
  });

  describe("failed responses", () => {
    test("should format failed response with error header", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Error: Unable to access the repository. Please check your permissions.",
      };
      const instruction = "Analyze the test coverage";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        "> Analyze the test coverage",
        "---",
        "Error: Unable to access the repository. Please check your permissions.",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should format failed response with multi-line instruction", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Connection timeout after 30 seconds",
      };
      const instruction =
        "Please review this code\nand provide feedback\non the implementation";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        "> Please review this code",
        "> and provide feedback",
        "> on the implementation",
        "---",
        "Connection timeout after 30 seconds",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should format failed response with empty instruction", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Authentication failed",
      };
      const instruction = "";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        "",
        "---",
        "Authentication failed",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should format failed response with whitespace-only instruction", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Rate limit exceeded",
      };
      const instruction = "   \n  \n  ";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        "",
        "---",
        "Rate limit exceeded",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });
  });

  describe("instruction formatting", () => {
    test("should handle instruction with special characters", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Response with special chars",
      };
      const instruction = "Please check: @#$%^&*()_+-=[]{}|;':\",./<>?";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "> Please check: @#$%^&*()_+-=[]{}|;':\",./<>?",
        "---",
        "Response with special chars",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle newlines in response body", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Line 1\nLine 2\n\nLine 3\n  Line 4  ",
      };
      const instruction = "Format this text";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        [],
      );

      const expected = [
        "> Format this text",
        "---",
        "Line 1\nLine 2\n\nLine 3\n  Line 4  ",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });
  });

  describe("URL handling", () => {
    test("should properly format different action URLs", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Test response",
      };
      const instruction = "Test instruction";
      const customActionUrl =
        "https://github.com/org/repo/actions/runs/987654321";
      const customChatUrl = "https://custom-h2ogpte.com/chat/xyz789";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        customActionUrl,
        customChatUrl,
        [],
      );

      expect(result).toContain(`[github action run](${customActionUrl})`);
      expect(result).toContain(`[chat session](${customChatUrl})`);
      expect(result).toContain(
        "🚀 Powered by [h2oGPTe](https://h2o.ai/platform/enterprise-h2ogpte/)",
      );
    });

    test("should handle URLs with query parameters", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "Test response",
      };
      const instruction = "Test instruction";
      const actionUrlWithParams =
        "https://github.com/username/repo/actions/runs/123?check_suite_focus=true";
      const chatUrlWithParams =
        "https://h2ogpte.example.com/chat/abc123?session=active&user=test";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        actionUrlWithParams,
        chatUrlWithParams,
        [],
      );

      expect(result).toContain(`[github action run](${actionUrlWithParams})`);
      expect(result).toContain(`[chat session](${chatUrlWithParams})`);
      expect(result).toContain(
        "🚀 Powered by [h2oGPTe](https://h2o.ai/platform/enterprise-h2ogpte/)",
      );
    });
  });

  describe("slash commands", () => {
    test("should not include slash commands in successful response", () => {
      const chatCompletion: ChatResponse = {
        success: true,
        body: "This is a successful response",
      };
      const instruction = "Please review this code";
      const usedCommands: SlashCommand[] = [
        { name: "/review", prompt: "Review the code" },
      ];

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        usedCommands,
      );

      expect(result).not.toContain("Slash commands used:");
      expect(result).toContain("This is a successful response");
    });

    test("should include single slash command in failed response", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Error: Connection failed",
      };
      const instruction = "Please analyze this code";
      const usedCommands: SlashCommand[] = [
        { name: "/review", prompt: "Review the code" },
      ];

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        usedCommands,
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        "> Please analyze this code",
        "---",
        "Error: Connection failed",
        "",
        "---",
        "Slash commands used: /review",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should include multiple slash commands in failed response", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Error: Processing failed",
      };
      const instruction = "Please review and test this code";
      const usedCommands: SlashCommand[] = [
        { name: "/review", prompt: "Review the code" },
        { name: "/test", prompt: "Run tests" },
        { name: "/docs", prompt: "Generate documentation" },
      ].sort((a, b) => a.name.localeCompare(b.name)); // sorted since it is sorted in `src/core/response/utils/slash-commands.ts`

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        usedCommands,
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        "> Please review and test this code",
        "---",
        "Error: Processing failed",
        "",
        "---",
        "Slash commands used: /docs /review /test",
        "",
        "---",
        getExpectedReferences(mockActionUrl, mockChatUrl),
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle slash commands with special characters in failed response", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Error: Validation error",
      };
      const instruction = "Check this out";
      const usedCommands: SlashCommand[] = [
        { name: "/custom-command", prompt: "Custom prompt" },
        { name: "/test_command", prompt: "Test prompt" },
      ];

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        usedCommands,
      );

      expect(result).toContain(
        "Slash commands used: /custom-command /test_command",
      );
      expect(result).toContain("Error: Validation error");
    });

    test("should not include slash commands section when empty array in failed response", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Error: Something went wrong",
      };
      const instruction = "Do something";
      const usedCommands: SlashCommand[] = [];

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
        usedCommands,
      );

      expect(result).not.toContain("Slash commands used:");
      expect(result).toContain("Error: Something went wrong");
    });
  });
});
