import type { SlashCommand } from "./slash-commands";

const GIF_DATA_URL = `https://h2ogpte-github-action.cdn.h2o.ai/h2o_loading.gif`;

const WORKING_MESSAGES = [
  "h2oGPTe is working on it",
  "h2oGPTe is working",
  "h2oGPTe is thinking",
  "h2oGPTe is connecting the dots",
  "h2oGPTe is putting it all together",
  "h2oGPTe is processing your request",
] as const;

export function createInitialWorkingComment(
  actionUrl: string,
  usedCommands: SlashCommand[],
): string {
  const randomMessage =
    WORKING_MESSAGES[Math.floor(Math.random() * WORKING_MESSAGES.length)];

  let commentBody = `### ${randomMessage} &nbsp;<img src="${GIF_DATA_URL}" width="40px"/>\n\n`;

  if (usedCommands.length > 0) {
    commentBody += `Commands used:\n`;
    for (const command of usedCommands) {
      commentBody += `- ${command.name}\n`;
    }
    commentBody += "\n";
  }

  commentBody += `Follow progress in the [GitHub Action run](${actionUrl})`;

  return commentBody;
}
