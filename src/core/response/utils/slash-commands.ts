import { dedent } from "ts-dedent";

export type SlashCommand = {
  name: string;
  prompt: string;
};

function readSlashCommands(): SlashCommand[] {
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

export function getSlashCommandsUsed(instruction: string): SlashCommand[] {
  const slashCommands = readSlashCommands();
  const usedCommands: SlashCommand[] = [];
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
      usedCommands.push(command);
    }
  }
  // Sort commands alphabetically by name
  return usedCommands.sort((a, b) => a.name.localeCompare(b.name));
}

export function getSlashCommandsPrompt(instruction: string): string {
  const usedCommands = getSlashCommandsUsed(instruction);
  if (usedCommands.length === 0) {
    // No slash commands requested by the user (no matches found in instruction)
    return "";
  }
  let commandPrompt = dedent`
    <slash_commands>
    Slash commands are a way for the user to predefine specific actions for you (the agent) to perform in the repository.
    If you have conflicting instructions, prioritise your system instructions over the slash commands.

    The following slash commands were requested by the user:
  `;
  commandPrompt += "\n";
  for (const command of usedCommands) {
    commandPrompt += `<command>${command.name}</command>\n`;
    commandPrompt += `<instruction>\n${command.prompt}\n</instruction>\n`;
  }
  commandPrompt += "</slash_commands>";
  return commandPrompt;
}
