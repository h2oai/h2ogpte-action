import assert from "node:assert";
import { getGithubServerUrl } from "../../utils";

const GITHUB_COM_HOST = "github.com";

/**
 * Returns the comma-separated list of allowed tools for the GitHub MCP.
 */
export function getGithubMcpAllowedTools(): string {
  const value = process.env.GITHUB_MCP_ALLOWED_TOOLS;
  assert(value !== undefined, "GITHUB_MCP_ALLOWED_TOOLS is required");
  return value;
}

/**
 * Returns the comma-separated list of allowed toolsets for the GitHub MCP.
 */
export function getGithubMcpAllowedToolsets(): string {
  const value = process.env.GITHUB_MCP_ALLOWED_TOOLSETS;
  assert(value !== undefined, "GITHUB_MCP_ALLOWED_TOOLSETS is required");
  return value;
}
const GITHUB_COM_MCP_URL = "https://api.githubcopilot.com/mcp/";

/**
 * Returns the GitHub Copilot MCP URL for the current GitHub instance.
 *
 * - If GITHUB_MCP_URL is set: validate (valid URL) and return it.
 * - github.com -> https://api.githubcopilot.com/mcp/
 * - GitHub Enterprise Cloud with data residency (*.ghe.com) -> https://copilot-api.{subdomain}.ghe.com/mcp
 * - GitHub Enterprise Server (no custom URL) -> throws; set github_mcp_url for GHES.
 */
export function getGithubMcpUrl(): string {
  const customUrl = process.env.GITHUB_MCP_URL?.trim();
  if (customUrl) {
    try {
      const parsedUrl = new URL(customUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error(
          `Invalid GITHUB_MCP_URL protocol: ${parsedUrl.protocol}. Only http and https are supported. ` +
            `See docs/CONFIGURATION.md for configuring MCP for GHES.`,
        );
      }
      return customUrl;
    } catch (err) {
      if (err instanceof Error && err.message.includes("GITHUB_MCP_URL")) {
        throw err;
      }
      throw new Error(
        `Invalid GITHUB_MCP_URL: ${customUrl}. Must be a valid URL. ` +
          `See docs/CONFIGURATION.md for configuring MCP for GHES.`,
      );
    }
  }

  const serverUrl = getGithubServerUrl();
  let host: string;
  try {
    host = new URL(serverUrl).hostname.toLowerCase();
  } catch {
    throw new Error(
      `Invalid GitHub server URL: ${serverUrl}. GitHub MCP is not supported for this configuration.`,
    );
  }

  if (host === GITHUB_COM_HOST) {
    return GITHUB_COM_MCP_URL;
  }

  if (host.endsWith(".ghe.com")) {
    const subdomain = host.slice(0, -".ghe.com".length);
    if (subdomain) {
      return `https://copilot-api.${subdomain}.ghe.com/mcp`;
    }
  }

  throw new Error(
    `GitHub MCP is not supported for GitHub Enterprise Server (${serverUrl}) when using the default remote MCP. ` +
      `Host a standalone GitHub MCP server and set the github_mcp_url input to its full URL. ` +
      `See docs/CONFIGURATION.md for configuring MCP for GHES.`,
  );
}
