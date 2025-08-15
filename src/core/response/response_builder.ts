import type { ChatResponse } from "../services/h2ogpte/types";
import { extractFinalAgentResponse } from "./utils/extract-response";

/**
 * Builds the response for h2oGPTe agent completions
 * @param chatCompletion - The chat completion response from h2oGPTe
 * @param instruction - The instruction that was sent to h2oGPTe
 * @param url - The GitHub action run URL
 * @returns Formatted comment body string
 */
export function buildH2ogpteResponse(
  chatCompletion: ChatResponse,
  instruction: string,
  actionUrl: string,
  chatUrl: string,
): string {
  const formattedInstruction = `>## User's Instruction\n${formatInstruction(instruction)}`;
  const actionRunUrl = `see [github action run](${actionUrl})`;
  const chatSessionUrl = `see [chat session](${chatUrl}), contact repo admin for access permissions`;

  let comment_format = "";

  if (chatCompletion.success) {
    const cleanedResponse = extractFinalAgentResponse(chatCompletion.body);

    comment_format = `${formattedInstruction}\n---\n${cleanedResponse}\n---\n${actionRunUrl}\n${chatSessionUrl}`;
  } else {
    const header = `❌ h2oGPTe ran into some issues`;
    const response = chatCompletion.body;

    comment_format = `${header}\n---\n${formattedInstruction}\n---\n${response}\n---\n${actionRunUrl}\n${chatSessionUrl}`;
  }

  return comment_format;
}

/**
 * Formats an instruction string by prefixing each line with '> '
 * Handles multi-line instructions properly
 * @param instruction - The instruction string that may contain multiple lines
 * @returns Formatted instruction with each line prefixed
 */
function formatInstruction(instruction: string): string {
  return instruction
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `> ${line}`)
    .join("\n");
}
