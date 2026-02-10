export async function isValidInstruction(instruction: string) {
  if (instruction.trim() === "") {
    return false;
  }
  return true;
}
