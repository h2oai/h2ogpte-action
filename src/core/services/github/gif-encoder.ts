import * as fs from "fs";
import * as path from "path";

/**
 * Reads the pre-encoded h2o_logo_base64.txt file and returns it as a data URL
 * @returns The base64-encoded GIF as a data URL, or null if the file cannot be read
 */
export function getH2oLogoAsBase64(): string | null {
  try {
    // The base64 file is stored as a resource in the same directory
    const base64Path = path.join(__dirname, "h2o_logo_base64.txt");

    if (fs.existsSync(base64Path)) {
      console.log(`Found pre-encoded GIF at: ${base64Path}`);
      return fs.readFileSync(base64Path, "utf8").trim();
    }

    throw new Error(`h2o_logo_base64.txt not found at: ${base64Path}`);
  } catch (error) {
    console.warn("Failed to read pre-encoded h2o_logo_base64.txt:", error);
    return null;
  }
}
