import { getGithubServerUrl } from "../../utils";

const GITHUB_COM_HOST = "github.com";
const GITHUB_COM_MCP_URL = "https://api.githubcopilot.com/mcp/";

/**
 * Returns the GitHub Copilot MCP URL for the current GitHub instance.
 *
 * - github.com -> https://api.githubcopilot.com/mcp/
 * - GitHub Enterprise Cloud with data residency (*.ghe.com) -> https://copilot-api.{subdomain}.ghe.com/mcp
 * - GitHub Enterprise Server -> throws (MCP not supported)
 */
export function getGithubMcpUrl(): string {
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
    `GitHub MCP is not supported for GitHub Enterprise Server (${serverUrl}). ` +
      `GitHub Enterprise Server support is planned for a future release`,
  );
}
