import type { ChatResponse } from "../services/h2ogpte/types";
import { extractFinalAgentResponse } from "./utils/extract-response";

export function buildH2ogpteResponse(
  chatCompletion: ChatResponse,
  instruction: string,
  actionUrl: string,
  chatUrl: string,
): string {
  const formattedInstruction = formatUserInstruction(instruction);
  const references = `For more details see the [github action run](${actionUrl}) or contact the repository admin to see the [chat session](${chatUrl}).\n🚀 Powered by [h2oGPTe](https://h2o.ai/platform/enterprise-h2ogpte/)`;

  let commentFormat = "";

  if (chatCompletion.success) {
    const cleanedResponse = extractFinalAgentResponse(chatCompletion.body);

    commentFormat = `${formattedInstruction}\n---\n${cleanedResponse}\n\n---\n${references}`;
  } else {
    const header = `❌ h2oGPTe ran into some issues`;
    const response = chatCompletion.body;

    commentFormat = `${header}\n---\n${formattedInstruction}\n---\n${response}\n\n---\n${references}`;
  }

  return commentFormat;
}

function formatUserInstruction(instruction: string): string {
  // Prepend each line with '> ' for blockquote in markdown
  const formattedInstruction = instruction
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => `> ${line}`)
    .join("\n");

  // Replace @h2ogpte with @ h2ogpte to prevent the agent rerunning everytime the comment is updated
  const replacedInstruction = formattedInstruction.replace(
    /@h2ogpte/g,
    "@ h2ogpte",
  );

  return replacedInstruction;
}
