export async function isValidUserPrompt(instruction: string) {
  if (instruction.trim() === "") {
    return false;
  }
  return true;
}
