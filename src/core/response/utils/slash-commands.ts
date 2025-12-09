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
  if (slashCommands.length === 0) {
    // No slash commands set by the user
    return "";
  }
  let commandPrompt = dedent`
    <slash_commands>
    Slash commands are a way for the user to predefine specific actions for you (the agent) to perform in the repository.
    If you have conflicting instructions, prioritise your system instructions over the slash commands.

    The following slash commands were requested by the user:
  `;
  commandPrompt += "\n";
  let hasMatchingCommands = false;
  for (const command of slashCommands) {
    const escapedCommandName = command.name.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );
    const commandRegex = new RegExp(
      `(^|[\\n ])${escapedCommandName}(?![a-zA-Z0-9_-])`,
      "i",
    );
    if (commandRegex.test(instruction)) {
      commandPrompt += `<command>${command.name}</command>\n`;
      commandPrompt += `<instruction>\n${command.prompt}\n</instruction>\n`;
      hasMatchingCommands = true;
    }
  }
  if (!hasMatchingCommands) {
    // No slash commands requested by the user (no matches found in instruction)
    return "";
  }
  commandPrompt += "</slash_commands>";
  return commandPrompt;
}
