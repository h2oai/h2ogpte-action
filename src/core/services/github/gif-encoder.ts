import * as fs from "fs";
import * as path from "path";

/**
 * Reads the h2o_logo.gif file and returns it as a base64-encoded data URL
 * @returns The base64-encoded GIF as a data URL, or null if the file cannot be read
 */
export function getH2oLogoAsBase64(): string | null {
  try {
    const gifPath = path.join(__dirname, "../../../assets/h2o_logo.gif");
    const gifBuffer = fs.readFileSync(gifPath);
    const base64String = gifBuffer.toString("base64");
    return `data:image/gif;base64,${base64String}`;
  } catch (error) {
    console.warn("Failed to read h2o_logo.gif:", error);
    return null;
  }
}
