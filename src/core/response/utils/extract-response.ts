/**
 * Pattern to match the TL;DR header that indicates the final response section
 */
const PATTERN_TLDR_HEADER = /^##\s+.*TL;DR/im;

/**
 * Substring to check for max turns reached message
 */
const MAX_TURNS_SUBSTRING = "Reached max number of turns";

/**
 * Extracts the final agent response from the raw response
 */
export function extractFinalAgentResponse(input: string): string {
  if (!input || typeof input !== "string") {
    return "The agent did not return a valid response. Please check h2oGPTe.";
  }

  // Check for max turns reached first
  if (input.includes(MAX_TURNS_SUBSTRING)) {
    console.debug("Max turns reached detected in response");
    return "**⚠️ Warning: Maximum Turns Reached.**\n\n💡 Hint: If this is a recurring issue, try increasing the `agent_max_turns` or `agent_accuracy` in your config file.";
  }

  // Split the response by ENDOFTURN markers (with newlines)
  const sections = input.split("\nENDOFTURN\n");

  // Find the section that starts with the TL;DR header
  const finalSection = sections.find((section) => {
    const trimmedSection = section.trim();
    return PATTERN_TLDR_HEADER.test(trimmedSection);
  });

  if (!finalSection) {
    // Fallback: return raw agent response
    console.log(`Could not find TL;DR section, returning raw agent response`);
    return input;
  }

  // Remove everything from <stream_turn_title> onwards (or trailing ENDOFTURN)
  let textBeforeTitle = finalSection;
  const titleIndex = finalSection.indexOf("<stream_turn_title>");
  if (titleIndex !== -1) {
    textBeforeTitle = finalSection.substring(0, titleIndex);
  }

  // Remove agent metadata and clean up the whitespace in the text
  const cleanedText = textBeforeTitle
    .replace(/\*\*Completed LLM call in.*?\*\*/g, "")
    .replace(/\*\* \[.*?\] .*?\*\*/g, "")
    .replace(/\*\*Executing python code blocks\*\*/g, "")
    .replace(
      /\*\*No executable code blocks found, terminating conversation\.*\*\*/g,
      "",
    )
    .replace(/\s*\[citation:\s*\d+\]\s*/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/ {2,}/g, " ")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();

  return cleanedText;
}
