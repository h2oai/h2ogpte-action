export async function isValidInstruction(instruction: string) {
  if (instruction.trim() === "@h2ogpte") {
    return false;
  }
  return true;
}
