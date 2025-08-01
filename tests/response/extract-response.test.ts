import { describe, test, expect } from "bun:test";
import { extractFinalAgentResponse } from "../../src/core/response/utils/extract-response";

describe("extractFinalAgentResponse", () => {
  test("should extract and clean the section between third-to-last and second-to-last ENDOFTURN", () => {
    const input = [
      "Some irrelevant text",
      "ENDOFTURN",
      "<stream_turn_title>Title</stream_turn_title>\n**Completed LLM call in 1.23 seconds after 1 turns and time 1.23 out of 3600.**\nThis is the final response.",
      "ENDOFTURN",
      "<stream_turn_title>Another</stream_turn_title>\n** [2025-07-02 - 08:45:44.1 PM PDT] Completed execution of code block using python in 2.03 seconds after 1 turns and time 54.98 out of 3600.**\nCleaned response!",
      "ENDOFTURN",
      "Trailing stuff",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("This is the final response.");
  });

  test("should return input as-is if less than 2 ENDOFTURNs", () => {
    const input = "No end markers here";
    expect(extractFinalAgentResponse(input)).toBe(input);
    const input2 = "ENDOFTURN only once";
    expect(extractFinalAgentResponse(input2)).toBe(input2);
  });

  test("should remove metadata and timestamps", () => {
    const input = [
      "ENDOFTURN",
      "Some text\n**Completed LLM call in 2.34 seconds after 2 turns and time 2.34 out of 3600.**\n** [2025-07-02 - 08:45:44.1 PM PDT] Completed execution of code block using python in 2.03 seconds after 1 turns and time 54.98 out of 3600.**\n**Executing python code blocks**\n**No executable code blocks found, terminating conversation...**\nFinal output!",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Some text\nFinal output!");
  });

  test("should remove citation patterns", () => {
    const input = [
      "ENDOFTURN",
      "Here is some information [citation: 1] and more details [citation:42]. Also check this [citation: 123] and that [citation:1].",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "Here is some information and more details. Also check this and that.",
    );
  });

  test("should handle null, undefined, or empty input", () => {
    expect(extractFinalAgentResponse("")).toBe(
      "The agent did not return a valid response. Please check h2oGPTe.",
    );
    expect(extractFinalAgentResponse(null as unknown as string)).toBe(
      "The agent did not return a valid response. Please check h2oGPTe.",
    );
    expect(extractFinalAgentResponse(undefined as unknown as string)).toBe(
      "The agent did not return a valid response. Please check h2oGPTe.",
    );
  });

  test("should trim whitespace and newlines", () => {
    const input = [
      "ENDOFTURN",
      "\n\n   Some text with whitespace   \n\n",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Some text with whitespace");
  });

  test("should handle max turns reached message at the beginning", () => {
    const input = [
      "ENDOFTURN",
      "Max turns 4 out of 5 reached, ending conversation to allow for final turn response. Increase agent accuracy or turns if needed.I'll now implement the file upload feature for the LLM service. Based on my analysis of the repository, I need to add functionality that allows users to upload files (like.txt and.pdf) and have the LLM summarize or answer questions about their contents.",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "**Warning: Maximum Turns Reached**\n\n---\n\nI'll now implement the file upload feature for the LLM service. Based on my analysis of the repository, I need to add functionality that allows users to upload files (like.txt and.pdf) and have the LLM summarize or answer questions about their contents.",
    );
  });

  test("should handle max turns reached with different numbers", () => {
    const input = [
      "ENDOFTURN",
      "Max turns 10 out of 15 reached, ending conversation to allow for final turn response. Increase agent accuracy or turns if needed. Here is the actual response content.",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "**Warning: Maximum Turns Reached**\n\n---\n\nHere is the actual response content.",
    );
  });

  test("should not match max turns pattern if it's not at the beginning", () => {
    const input = [
      "ENDOFTURN",
      "Here is some content. Max turns 4 out of 5 reached, ending conversation to allow for final turn response. Increase agent accuracy or turns if needed. More content here.",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "Here is some content. Max turns 4 out of 5 reached, ending conversation to allow for final turn response. Increase agent accuracy or turns if needed. More content here.",
    );
  });

  test("should handle max turns reached with only the message and no additional content", () => {
    const input = [
      "ENDOFTURN",
      "Max turns 1 out of 3 reached, ending conversation to allow for final turn response. Increase agent accuracy or turns if needed.",
      "ENDOFTURN",
      "ENDOFTURN",
    ].join("\n");
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("**Warning: Maximum Turns Reached**\n\n---\n\n");
  });
});
