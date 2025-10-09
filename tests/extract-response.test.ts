import { extractFinalAgentResponse } from "../src/core/response/utils/extract-response";

describe("extractFinalAgentResponse", () => {
  test("should extract response between ENDOFTURN markers", () => {
    const input = "Some initial textENDOFTURNActual responseENDOFTURNFinal text";
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Actual response");
  });

  test("should handle input with only two ENDOFTURN markers", () => {
    const input = "Actual responseENDOFTURNFinal text";
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Actual response");
  });

  test("should handle input with no ENDOFTURN markers", () => {
    const input = "Some text without markers";
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Some text without markers");
  });

  test("should handle empty input", () => {
    const input = "";
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("The agent did not return a valid response. Please check h2oGPTe.");
  });

  test("should handle null input", () => {
    const input = null as unknown as string;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("The agent did not return a valid response. Please check h2oGPTe.");
  });

  test("should handle input with 'No executable code blocks found' error message", () => {
    const input = "Some initial textENDOFTURN**No executable code blocks found, terminating conversation.**ENDOFTURNActual agent response";
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Actual agent response");
  });

  test("should handle input with empty text section but valid last section", () => {
    const input = "Some initial textENDOFTURNENDOFTURNActual agent response";
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("Actual agent response");
  });

  test("should handle input with 'Max turns reached' message", () => {
    const input = "Some initial textENDOFTURNMax turns 10 out of 20 reached, ending conversation to allow for final turn response. Increase agent accuracy or turns if needed.Actual responseENDOFTURNFinal text";
    const result = extractFinalAgentResponse(input);
    expect(result).toContain("**⚠️ Warning: Maximum Turns Reached.**");
    expect(result).toContain("Actual response");
  });
});
