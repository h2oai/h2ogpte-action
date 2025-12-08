/**
 * Pattern to match the TL;DR header that indicates the final response section
 * Matches any markdown header level (1-6 #) with TL;DR
 */
const PATTERN_TLDR_HEADER = /^#{1,6}\s+.*TL;DR.*/im;

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

  // Find the LAST section that starts with the TL;DR header
  let finalSection: string | undefined;
  for (let i = sections.length - 1; i >= 0; i--) {
    const trimmedSection = sections[i]?.trim();
    if (trimmedSection && PATTERN_TLDR_HEADER.test(trimmedSection)) {
      finalSection = sections[i];
      break;
    }
  }

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

  // Remove everything before `## ⚡️ TL;DR`
  let tlDrSection = textBeforeTitle;
  const tlDrIndex = tlDrSection.indexOf("## ⚡️ TL;DR");
  if (tlDrIndex !== -1) {
    tlDrSection = tlDrSection.substring(tlDrIndex);
  }

  // Remove agent metadata and clean up the whitespace in the text
  // First, preserve code blocks by temporarily replacing them
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks: string[] = [];
  let codeBlockIndex = 0;

  const textWithPlaceholders = tlDrSection.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlockIndex++}__`;
  });

  // Clean up whitespace in non-code-block text
  let cleanedText = textWithPlaceholders
    .replace(/\*\*Completed LLM call in.*?\*\*/g, "")
    .replace(/\*\* \[.*?\] .*?\*\*/g, "")
    .replace(/\*\*Executing python code blocks\*\*/g, "")
    .replace(
      /\*\*No executable code blocks found, terminating conversation\.*\*\*/g,
      "",
    )
    .replace(/\[citation:\s*\d+\]/g, "")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+$/, ""))
    .join("\n")
    .trim();

  // Restore code blocks (preserving their original formatting including tabs)
  codeBlocks.forEach((block, index) => {
    cleanedText = cleanedText.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return cleanedText;
}
