/**
 * Pattern to match the "Max turns X out of Y reached" message
 */
const PATTERN_MAX_TURNS_REACHED =
  /^Max turns \d+ out of \d+ reached, ending conversation to allow for final turn response\. Increase agent accuracy or turns if needed\./;

/**
 * Checks if a string begins with the "Max turns X out of Y reached" pattern
 * where X and Y can be any numbers
 */
function beginsWithMaxTurnsReached(text: string): boolean {
  return PATTERN_MAX_TURNS_REACHED.test(text);
}

/**
 * Extracts the final agent response from the raw response
 */
export function extractFinalAgentResponse(input: string): string {
  if (!input || typeof input !== "string") {
    return "The agent did not return a valid response. Please check h2oGPTe.";
  }

  // Find all occurrences of "ENDOFTURN"
  const endOfTurnMatches = Array.from(input.matchAll(/ENDOFTURN/g));

  if (!endOfTurnMatches || endOfTurnMatches.length < 2) {
    // If there's less than 2 ENDOFTURN markers, return the input as-is
    console.log(
      `Could not find sufficient end of turn markers, returning raw agent response'${input}'`,
    );
    return input;
  }

  // Get the position of the second-to-last ENDOFTURN
  const secondToLastMatch = endOfTurnMatches[endOfTurnMatches.length - 2];

  // Find the ENDOFTURN before the second-to-last (i.e., third-to-last)
  const thirdToLastMatch =
    endOfTurnMatches.length >= 3
      ? endOfTurnMatches[endOfTurnMatches.length - 3]
      : null;

  if (!secondToLastMatch || secondToLastMatch.index === undefined) {
    console.log(`h2oGPTe response is invalid '${input}'`);
    return "The agent did not return a complete response. Please check h2oGPTe.";
  }

  // Extract text between third-to-last and second-to-last ENDOFTURN, or from start if not present
  const startPosition =
    thirdToLastMatch && thirdToLastMatch.index !== undefined
      ? thirdToLastMatch.index + "ENDOFTURN".length
      : 0;
  const endPosition = secondToLastMatch.index;
  const textSection = input.substring(startPosition, endPosition);

  // Remove <stream_turn_title> tags and their content
  const cleanText = textSection.replace(
    /<stream_turn_title>.*?<\/stream_turn_title>/gs,
    "",
  );

  // Remove agent metadata and clean up the whitespace in the text
  const cleanedText = cleanText
    .replace(/\*\*Completed LLM call in.*?\*\*/g, "")
    .replace(/\*\* \[.*?\] .*?\*\*/g, "")
    .replace(/\*\*Executing python code blocks\*\*/g, "")
    .replace(
      /\*\*No executable code blocks found, terminating conversation\.*\*\*/g,
      "",
    )
    .replace(/\s*\[citation:\s*\d+\]\s*/g, " ")
    .replace(/\s+\./g, ".")
    .replace(/\n{2,}/g, "\n")
    .replace(/^\n+|\n+$/g, "")
    .trim();

  if (beginsWithMaxTurnsReached(cleanedText)) {
    // Remove the max turns message from the beginning
    const remainingText = cleanedText
      .replace(PATTERN_MAX_TURNS_REACHED, "")
      .trim();

    return "**Maximum Turns Reached**\n\n---\n\n" + remainingText;
  }

  return cleanedText;
}
