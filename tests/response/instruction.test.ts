import { describe, test, expect } from "bun:test";
import { isInstructionEmpty } from "../../src/core/response/utils/instruction";

describe("isInstructionEmpty", () => {
  describe("empty or whitespace-only instructions", () => {
    test("should return true for empty string", () => {
      expect(isInstructionEmpty("")).toBe(true);
    });

    test("should return true for whitespace-only string", () => {
      expect(isInstructionEmpty("   ")).toBe(true);
      expect(isInstructionEmpty("\n")).toBe(true);
      expect(isInstructionEmpty("\t")).toBe(true);
      expect(isInstructionEmpty(" \n\t ")).toBe(true);
    });
  });

  describe("instructions with only @h2ogpte tag", () => {
    test("should return true for only @h2ogpte", () => {
      expect(isInstructionEmpty("@h2ogpte")).toBe(true);
    });

    test("should return true for @h2ogpte with leading whitespace", () => {
      expect(isInstructionEmpty(" @h2ogpte")).toBe(true);
      expect(isInstructionEmpty("  @h2ogpte")).toBe(true);
      expect(isInstructionEmpty("\n@h2ogpte")).toBe(true);
      expect(isInstructionEmpty("\t@h2ogpte")).toBe(true);
    });

    test("should return true for @h2ogpte with trailing whitespace", () => {
      expect(isInstructionEmpty("@h2ogpte ")).toBe(true);
      expect(isInstructionEmpty("@h2ogpte  ")).toBe(true);
      expect(isInstructionEmpty("@h2ogpte\n")).toBe(true);
      expect(isInstructionEmpty("@h2ogpte\t")).toBe(true);
    });

    test("should return true for @h2ogpte with surrounding whitespace", () => {
      expect(isInstructionEmpty(" @h2ogpte ")).toBe(true);
      expect(isInstructionEmpty("  @h2ogpte  ")).toBe(true);
      expect(isInstructionEmpty("\n@h2ogpte\n")).toBe(true);
      expect(isInstructionEmpty(" \t@h2ogpte\t ")).toBe(true);
    });

    test("should return true for @h2ogpte with multiple whitespace", () => {
      expect(isInstructionEmpty("@h2ogpte   ")).toBe(true);
      expect(isInstructionEmpty("   @h2ogpte")).toBe(true);
      expect(isInstructionEmpty(" @h2ogpte \n\t ")).toBe(true);
    });
  });

  describe("case-insensitive @h2ogpte matching", () => {
    test("should return true for uppercase @H2OGPTE", () => {
      expect(isInstructionEmpty("@H2OGPTE")).toBe(true);
      expect(isInstructionEmpty(" @H2OGPTE ")).toBe(true);
    });

    test("should return true for mixed case @H2oGpTe", () => {
      expect(isInstructionEmpty("@H2oGpTe")).toBe(true);
      expect(isInstructionEmpty(" @H2oGpTe ")).toBe(true);
    });

    test("should return true for lowercase @h2ogpte", () => {
      expect(isInstructionEmpty("@h2ogpte")).toBe(true);
      expect(isInstructionEmpty(" @h2ogpte ")).toBe(true);
    });
  });

  describe("instructions with actual content", () => {
    test("should return false for instruction with text after @h2ogpte", () => {
      expect(isInstructionEmpty("@h2ogpte please review")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte review this code")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte\nplease help")).toBe(false);
    });

    test("should return false for instruction with text before @h2ogpte", () => {
      expect(isInstructionEmpty("Hey @h2ogpte")).toBe(false);
      expect(isInstructionEmpty("Please @h2ogpte help")).toBe(false);
    });

    test("should return false for instruction with text around @h2ogpte", () => {
      expect(isInstructionEmpty("Please @h2ogpte review this")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte can you help?")).toBe(false);
    });

    test("should return false for instruction without @h2ogpte", () => {
      expect(isInstructionEmpty("Please review this code")).toBe(false);
      expect(isInstructionEmpty("Review")).toBe(false);
      expect(isInstructionEmpty("Help me")).toBe(false);
    });

    test("should return false for instruction with multiple @h2ogpte tags and content", () => {
      expect(isInstructionEmpty("@h2ogpte @h2ogpte please help")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte review @h2ogpte")).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("should return false for @h2ogpte followed by punctuation", () => {
      expect(isInstructionEmpty("@h2ogpte!")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte?")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte.")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte,")).toBe(false);
    });

    test("should return false for @h2ogpte with other mentions", () => {
      expect(isInstructionEmpty("@h2ogpte @user")).toBe(false);
      expect(isInstructionEmpty("@h2ogpte @someone")).toBe(false);
    });

    test("should handle multiple @h2ogpte tags with only whitespace", () => {
      expect(isInstructionEmpty("@h2ogpte @h2ogpte")).toBe(true);
      expect(isInstructionEmpty(" @h2ogpte @h2ogpte ")).toBe(true);
      expect(isInstructionEmpty("@h2ogpte  @h2ogpte")).toBe(true);
    });

    test("should return false for similar but different tags", () => {
      expect(isInstructionEmpty("@h2ogpt")).toBe(false);
      expect(isInstructionEmpty("@h2ogptee")).toBe(false);
      expect(isInstructionEmpty("@h2ogpt ")).toBe(false);
    });
  });
});
