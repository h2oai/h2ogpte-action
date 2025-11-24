import { describe, expect, test } from "bun:test";
import { extractFinalAgentResponse } from "../../src/core/response/utils/extract-response";

describe("extractFinalAgentResponse", () => {
  test("should extract TL;DR section and remove stream_turn_title", () => {
    const input = `Some code output
ENDOFTURN

## ⚡️ TL;DR
The repository lacks test coverage for critical components.

## 🧪 Analysis
Detailed analysis here...

## 🎯 Next Steps
- Add tests
- Improve coverage

<stream_turn_title>Test Coverage Analysis</stream_turn_title>

**LLM Call Info:**
Turn Time: 19.40s
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nThe repository lacks test coverage for critical components.\n## 🧪 Analysis\nDetailed analysis here...\n## 🎯 Next Steps\n- Add tests\n- Improve coverage",
    );
  });

  test("should find TL;DR in middle of multiple ENDOFTURN blocks", () => {
    const input = `Repository Structure:
- src/ (dir)
- tests/ (dir)
ENDOFTURN

**Executing python code blocks**

Analysis complete
ENDOFTURN

## ⚡️ TL;DR
Critical functionality is undertested.

## 🔬 Details
More information here...

<stream_turn_title>Analysis Complete</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nCritical functionality is undertested.\n## 🔬 Details\nMore information here...",
    );
  });

  test("should handle TL;DR without stream_turn_title", () => {
    const input = `Previous content
ENDOFTURN

## ⚡️ TL;DR
Short summary of findings.

## Analysis
The main analysis content.
ENDOFTURN

**LLM Call Info:**
Time: 120s
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nShort summary of findings.\n## Analysis\nThe main analysis content.",
    );
  });

  test("should fallback to raw response when no TL;DR found", () => {
    const input = `Code execution results
ENDOFTURN

Analysis without TL;DR marker.

Some findings here.
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(input);
  });

  test("should handle TL;DR with extra whitespace", () => {
    const input = `
ENDOFTURN

##   ⚡️   TL;DR
Summary with irregular spacing.

## Details
Content here.

<stream_turn_title>Title</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nSummary with irregular spacing.\n## Details\nContent here.",
    );
  });

  test("should find last TL;DR section when multiple exist", () => {
    const input = `First analysis
ENDOFTURN

## ⚡️ TL;DR
First summary.

## Details
First details.
ENDOFTURN

## ⚡️ TL;DR
Second summary.

## More Details
Second details.

<stream_turn_title>Final</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nSecond summary.\n## More Details\nSecond details.",
    );
  });

  test("should remove execution logs from TL;DR section", () => {
    const input = `
ENDOFTURN

** [Wednesday, October 08, 2025] Completed execution **

## ⚡️ TL;DR
Main response here.

**Executing python code blocks**

## Analysis
Analysis content.

<stream_turn_title>Done</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nMain response here.\n## Analysis\nAnalysis content.",
    );
  });

  test("should remove metadata and timestamps from TL;DR section", () => {
    const input = `
ENDOFTURN

## ⚡️ TL;DR
Some text
**Completed LLM call in 2.34 seconds after 2 turns and time 2.34 out of 3600.**
** [2025-07-02 - 08:45:44.1 PM PDT] Completed execution of code block using python in 2.03 seconds after 1 turns and time 54.98 out of 3600.**
**Executing python code blocks**
**No executable code blocks found, terminating conversation...**
Final output!

<stream_turn_title>Title</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("## ⚡️ TL;DR\nSome text\nFinal output!");
  });

  test("should remove citation patterns from TL;DR section", () => {
    const input = `
ENDOFTURN

## ⚡️ TL;DR
Here is some information [citation: 1] and more details [citation:42]. Also check this [citation: 123] and that [citation:1].

<stream_turn_title>Citations</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nHere is some information and more details. Also check this and that.",
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

  test("should trim whitespace and newlines from TL;DR section", () => {
    const input = `
ENDOFTURN

## ⚡️ TL;DR
   Some text with whitespace

<stream_turn_title>Title</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("## ⚡️ TL;DR\nSome text with whitespace");
  });

  test("should handle max turns reached message", () => {
    const input = `
ENDOFTURN

## ⚡️ TL;DR
Some analysis here.

Reached max number of turns, increase agent accuracy (or max turns) if seems to have finished without completing task.

<stream_turn_title>Implementation</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "**⚠️ Warning: Maximum Turns Reached.**\n\n💡 Hint: If this is a recurring issue, try increasing the `agent_max_turns` or `agent_accuracy` in your config file.",
    );
  });

  test("should handle max turns reached anywhere in response", () => {
    const input = `
ENDOFTURN

Some content here.

Reached max number of turns, increase agent accuracy (or max turns) if seems to have finished without completing task.

More content.
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "**⚠️ Warning: Maximum Turns Reached.**\n\n💡 Hint: If this is a recurring issue, try increasing the `agent_max_turns` or `agent_accuracy` in your config file.",
    );
  });

  test("should not match partial max turns text", () => {
    const input = `
ENDOFTURN

## ⚡️ TL;DR
Here is some content about reaching max turns in theory. More content here.

<stream_turn_title>Content</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nHere is some content about reaching max turns in theory. More content here.",
    );
  });

  test("should handle TL;DR with case variations", () => {
    const input = `
ENDOFTURN

## TL;DR Summary
This should still match the pattern.

## Details
More content here.

<stream_turn_title>Summary</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## TL;DR Summary\nThis should still match the pattern.\n## Details\nMore content here.",
    );
  });

  test("should extract single header TL;DR (# instead of ##)", () => {
    const input = `
ENDOFTURN

# ⚡️ TL;DR
Summary with single header.

## Details
More content here.

<stream_turn_title>Summary</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "# ⚡️ TL;DR\nSummary with single header.\n## Details\nMore content here.",
    );
  });

  // ENDOFTURN position handling
  test("should extract TL;DR that appears before first ENDOFTURN", () => {
    const input = `## ⚡️ TL;DR
Summary at the start.

## Details
More details here.
ENDOFTURN

Some content.
ENDOFTURN

More content here.
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nSummary at the start.\n## Details\nMore details here.",
    );
  });

  test("should extract TL;DR that appears after last ENDOFTURN", () => {
    const input = `Some content
ENDOFTURN

More content
ENDOFTURN

## ⚡️ TL;DR
Summary at the end.

## Analysis
Final analysis.`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nSummary at the end.\n## Analysis\nFinal analysis.",
    );
  });

  test("should skip empty sections and find TL;DR in non-empty section", () => {
    const input = `Initial content
ENDOFTURN

ENDOFTURN

## ⚡️ TL;DR
Found the summary.

<stream_turn_title>Title</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("## ⚡️ TL;DR\nFound the summary.");
  });

  test("should extract TL;DR from first section after first ENDOFTURN", () => {
    const input = `
ENDOFTURN

## ⚡️ TL;DR
First section summary.

## Details
More information.

<stream_turn_title>Analysis</stream_turn_title>
ENDOFTURN

Other content
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nFirst section summary.\n## Details\nMore information.",
    );
  });

  test("should handle response with only one ENDOFTURN marker", () => {
    const input = `
ENDOFTURN

## ⚡️ TL;DR
Summary content.

<stream_turn_title>Done</stream_turn_title>`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("## ⚡️ TL;DR\nSummary content.");
  });

  test("should handle multiple empty sections before TL;DR", () => {
    const input = `
ENDOFTURN

ENDOFTURN

ENDOFTURN

## ⚡️ TL;DR
Finally found it.

<stream_turn_title>End</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("## ⚡️ TL;DR\nFinally found it.");
  });

  test("should extract TL;DR before ENDOFTURN with stream_turn_title", () => {
    const input = `## ⚡️ TL;DR
Summary here.

<stream_turn_title>Title</stream_turn_title>
ENDOFTURN

Other content
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("## ⚡️ TL;DR\nSummary here.");
  });

  test("should remove everything before ## ⚡️ TL;DR in the final section", () => {
    const input = `
ENDOFTURN

Some unwanted content before TL;DR
More unwanted text here
Random information

## ⚡️ TL;DR
This is the actual summary.

## Details
Important details here.

<stream_turn_title>Title</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe(
      "## ⚡️ TL;DR\nThis is the actual summary.\n## Details\nImportant details here.",
    );
  });

  test("should remove content before ## ⚡️ TL;DR even with multiple lines", () => {
    const input = `
ENDOFTURN

Line 1 before TL;DR
Line 2 before TL;DR
Line 3 before TL;DR

## ⚡️ TL;DR
The summary starts here.

<stream_turn_title>Title</stream_turn_title>
ENDOFTURN`;
    const result = extractFinalAgentResponse(input);
    expect(result).toBe("## ⚡️ TL;DR\nThe summary starts here.");
  });
});
