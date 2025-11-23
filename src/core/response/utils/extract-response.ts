/**
 * Pattern to match the TL;DR header that indicates the final response section
 * Matches any markdown header level (1-6 #) with TL;DR (case insensitive, flexible spacing)
 */
const PATTERN_TLDR_HEADER = /^#{1,6}\s+.*TL;?DR.*/im;

/**
 * Pattern to match the stream turn title marker
 */
const PATTERN_STREAM_TURN_TITLE = /<stream_turn_title>.*?<\/stream_turn_title>/gs;

/**
 * Substring to check for max turns reached message
 */
const MAX_TURNS_SUBSTRING = "Reached max number of turns";

/**
 * Patterns to identify agent metadata that should be removed
 */
const AGENT_METADATA_PATTERNS = [
  /\*\*Completed LLM call in.*?\*\*/g,
  /\*\* \[.*?\] .*?\*\*/g,
  /\*\*Executing python code blocks\*\*/g,
  /\*\*No executable code blocks found, terminating conversation\.\*\*\*/g,
  /\*\*LLM Call Info:\*\*[\s\S]*?(?=\n\n|$)/g,
  /Turn Time:.*?(?=\n|$)/g,
  /Turns:.*?(?=\n|$)/g,
  /Time:.*?(?=\n|$)/g,
  /Cost:.*?(?=\n|$)/g,
];

/**
 * Extracts the final agent response from the raw response with improved robustness
 * 
 * This function handles multiple response formats:
 * 1. Standard format with TL;DR section and ENDOFTURN markers
 * 2. Responses without proper TL;DR formatting
 * 3. Responses with multiple turns
 * 4. Responses with various agent metadata formats
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

  // Strategy 1: Find the LAST section that starts with the TL;DR header
  let finalSection: string | undefined;
  for (let i = sections.length - 1; i >= 0; i--) {
    const trimmedSection = sections[i]?.trim();
    if (trimmedSection && PATTERN_TLDR_HEADER.test(trimmedSection)) {
      finalSection = sections[i];
      console.debug(`Found TL;DR section at index ${i} of ${sections.length} sections`);
      break;
    }
  }

  // Strategy 2: If no TL;DR found, look for the last substantial section
  if (!finalSection) {
    console.debug("No TL;DR section found, looking for last substantial section");
    
    // Filter out empty sections and agent status messages
    const substantialSections = sections.filter(section => {
      const trimmed = section.trim();
      return trimmed.length > 50 && // Must have substantial content
             !trimmed.startsWith("**") && // Not just metadata
             !trimmed.includes("Code block you just gave was not executed") &&
             !trimmed.includes("No executable code blocks found");
    });

    if (substantialSections.length > 0) {
      finalSection = substantialSections[substantialSections.length - 1];
      console.debug(`Using last substantial section (${substantialSections.length} found)`);
    }
  }

  // Strategy 3: If still no section found, try to extract content after the last agent status message
  if (!finalSection) {
    console.debug("No substantial section found, trying to extract after last status message");
    
    const lastStatusIndex = Math.max(
      input.lastIndexOf("#### Starting Agent"),
      input.lastIndexOf("#### Preparing Streaming"),
      input.lastIndexOf("#### Starting Streaming")
    );

    if (lastStatusIndex !== -1) {
      const afterStatus = input.substring(lastStatusIndex);
      const lines = afterStatus.split("\n");
      
      // Skip the status line and any empty lines
      let contentStart = 1;
      while (contentStart < lines.length && lines[contentStart].trim() === "") {
        contentStart++;
      }
      
      if (contentStart < lines.length) {
        finalSection = lines.slice(contentStart).join("\n");
        console.debug("Extracted content after last status message");
      }
    }
  }

  // Strategy 4: Last resort - return the entire input with cleaning
  if (!finalSection) {
    console.log("Could not identify final section, returning cleaned full response");
    finalSection = input;
  }

  // Remove stream turn title markers
  let textBeforeTitle = finalSection;
  const titleMatch = finalSection.match(PATTERN_STREAM_TURN_TITLE);
  if (titleMatch) {
    const titleIndex = finalSection.indexOf(titleMatch[0]);
    if (titleIndex !== -1) {
      textBeforeTitle = finalSection.substring(0, titleIndex);
    }
  }

  // Remove agent metadata and clean up the whitespace in the text
  let cleanedText = textBeforeTitle;
  
  // Apply all metadata removal patterns
  for (const pattern of AGENT_METADATA_PATTERNS) {
    cleanedText = cleanedText.replace(pattern, "");
  }

  // Additional cleaning
  cleanedText = cleanedText
    .replace(/\s*\[citation:\s*\d+\]\s*/g, " ") // Remove citations
    .replace(/\s+\./g, ".") // Fix spacing before periods
    .replace(/ {2,}/g, " ") // Collapse multiple spaces
    .replace(/\n{3,}/g, "\n\n") // Collapse multiple newlines to max 2
    .replace(/^\n+|\n+$/g, "") // Trim leading/trailing newlines
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => {
      // Remove lines that are just metadata
      return line.length > 0 && 
             !line.match(/^ENDOFTURN$/i) &&
             !line.match(/^\*\*.*execution.*\*\*$/i);
    })
    .join("\n")
    .trim();

  // Final validation - ensure we have meaningful content
  if (cleanedText.length < 10) {
    console.warn("Cleaned text is too short, returning fallback message");
    return "The agent completed processing but the response format was unexpected. Please check the [chat session](link) for the full response.";
  }

  return cleanedText;
}
