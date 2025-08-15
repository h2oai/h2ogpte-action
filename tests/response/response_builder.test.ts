import { describe, test, expect } from "bun:test";
import { buildH2ogpteResponse } from "../../src/core/response/response_builder";
import type { ChatResponse } from "../../src/core/services/h2ogpte/types";

describe("buildH2ogpteResponse", () => {
  const mockActionUrl =
    "https://github.com/username/repo/actions/runs/123456789";
  const mockChatUrl = "https://h2ogpte.example.com/chat/abc123";

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
      );

      const expected = [
        ">## User's Instruction",
        "> Please review this code",
        "---",
        "This is a successful response from h2oGPTe.",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      const expected = [
        ">## User's Instruction",
        "> Please review this PR",
        "> and suggest improvements",
        "> for the error handling",
        "---",
        "Here are my suggestions:\n\n1. Add error handling\n2. Improve documentation",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      const expected = [
        ">## User's Instruction",
        "> First line",
        "> Second line",
        "> Third line",
        "---",
        "Response content",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      const expected = [
        ">## User's Instruction",
        "",
        "---",
        "Response content",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      const expected = [
        ">## User's Instruction",
        "",
        "---",
        "Response content",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        ">## User's Instruction",
        "> Analyze the test coverage",
        "---",
        "Error: Unable to access the repository. Please check your permissions.",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        ">## User's Instruction",
        "> Please review this code",
        "> and provide feedback",
        "> on the implementation",
        "---",
        "Connection timeout after 30 seconds",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
      ].join("\n");

      expect(result).toBe(expected);
    });

    test("should handle failed response with empty instruction", () => {
      const chatCompletion: ChatResponse = {
        success: false,
        body: "Service unavailable",
      };
      const instruction = "";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
      );

      const expected = [
        "❌ h2oGPTe ran into some issues",
        "---",
        ">## User's Instruction",
        "",
        "---",
        "Service unavailable",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
      ].join("\n");

      expect(result).toBe(expected);
    });
  });

  describe("edge cases", () => {
    test("should handle very long response body", () => {
      const longResponse = "Long response content\n".repeat(100);
      const chatCompletion: ChatResponse = {
        success: true,
        body: longResponse,
      };
      const instruction = "Simple instruction";

      const result = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        mockActionUrl,
        mockChatUrl,
      );

      expect(result).toContain(">## User's Instruction");
      expect(result).toContain("> Simple instruction");
      expect(result).toContain(longResponse);
      expect(result).toContain("see [github action run]");
      expect(result).toContain("see [chat session]");
    });

    test("should handle special characters in instruction", () => {
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
      );

      const expected = [
        ">## User's Instruction",
        "> Please check: @#$%^&*()_+-=[]{}|;':\",./<>?",
        "---",
        "Response with special chars",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      const expected = [
        ">## User's Instruction",
        "> Format this text",
        "---",
        "Line 1\nLine 2\n\nLine 3\n  Line 4  ",
        "---",
        "see [github action run](https://github.com/username/repo/actions/runs/123456789)",
        "see [chat session](https://h2ogpte.example.com/chat/abc123), contact repo admin for access permissions",
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
      );

      expect(result).toContain(`see [github action run](${customActionUrl})`);
      expect(result).toContain(
        `see [chat session](${customChatUrl}), contact repo admin for access permissions`,
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
      );

      expect(result).toContain(
        `see [github action run](${actionUrlWithParams})`,
      );
      expect(result).toContain(
        `see [chat session](${chatUrlWithParams}), contact repo admin for access permissions`,
      );
    });
  });
});
