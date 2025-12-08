import { dedent } from "ts-dedent";

type SlashCommand = {
  name: string;
  prompt: string;
};

function getSlashCommands(): SlashCommand[] {
  const slashCommands = JSON.parse(process.env.SLASH_COMMANDS || "[]");
  if (!Array.isArray(slashCommands)) {
    throw new Error("SLASH_COMMANDS must be an array");
  }
  for (const command of slashCommands) {
    if (
      command === null ||
      typeof command !== "object" ||
      typeof command.name !== "string" ||
      typeof command.prompt !== "string"
    ) {
      throw new Error(
        "Each entry in SLASH_COMMANDS must be an object with string 'name' and 'prompt' properties",
      );
    }
  }
  return slashCommands;
}

export function getSlashCommandsPrompt(instruction: string): string {
  const slashCommands = getSlashCommands();
  let commandPrompt = dedent`
    Slash commands are a way for the user to predefine specific actions for you (the agent) to perform in the repository.
    The following slash commands were requested by the user:
  `;
  let hasMatchingCommands = false;
  for (const command of slashCommands) {
    if (instruction.includes(command.name)) {
      commandPrompt += `- ${command.name}: ${command.prompt}\n`;
      hasMatchingCommands = true;
    }
  }
  // No slash commands requested by the user (no matches found in instruction)
  if (!hasMatchingCommands) {
    return "";
  }
  return commandPrompt;
}
