import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { AGENT_GITHUB_ENV_VAR } from "../constants";
import {
  getGithubMcpAllowedTools,
  getGithubMcpAllowedToolsets,
  getGithubMcpUrl,
} from "./services/github/copilot-mcp";
import type { ParsedGitHubContext } from "./services/github/types";
import {
  createAgentKey,
  createCustomTool,
  createToolAssociation,
  deleteAgentKey,
  deleteCustomTools,
  getChatSettings,
  getCustomTools,
  setChatSettings,
} from "./services/h2ogpte/h2ogpte";
import type {
  CustomTool,
  CustomToolInput,
  H2ogpteConfig,
} from "./services/h2ogpte/types";
import {
  extractDefaultSystemTools,
  getAllAgentToolNamesFromLabel,
} from "./services/h2ogpte/utils";

/**
 * Gets Github key from environment variable
 */
export function getGithubToken(): string {
  const githubToken = process.env.GITHUB_TOKEN;

  if (!githubToken) {
    throw new Error("GitHub token is required");
  }

  return githubToken;
}

/**
 * Gets the GitHub API url from environment variable
 */
export function getGithubApiUrl(): string {
  const githubApiBase = process.env.GITHUB_API_URL;

  if (!githubApiBase) {
    throw new Error("GitHub API base url is required");
  }

  return githubApiBase;
}

/**
 * Gets the GitHub server URL from environment variable
 */
export function getGithubServerUrl(): string {
  const githubServerUrl = process.env.GITHUB_SERVER_URL;

  if (!githubServerUrl) {
    throw new Error("GitHub server url is required");
  }

  return githubServerUrl;
}

/**
 * Check if the actor has write permissions to the repository
 * Adapted from: https://github.com/anthropics/claude-code-action/blob/main/src/github/validation/permissions.ts
 * Original author: Anthropic
 * License: MIT
 * @param octokit - The Octokit REST client
 * @param context - The GitHub context
 * @returns true if the actor has write permissions, false otherwise
 */
export async function checkWritePermissions(
  octokit: Octokit,
  context: ParsedGitHubContext,
): Promise<boolean> {
  const { repository, actor } = context;

  try {
    core.debug(`Checking permissions for actor: ${actor}`);

    // Check permissions directly using the permission endpoint
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: repository.owner,
      repo: repository.repo,
      username: actor,
    });

    const permissionLevel = response.data.permission;
    core.debug(`Permission level retrieved: ${permissionLevel}`);

    if (permissionLevel === "admin" || permissionLevel === "write") {
      core.debug(`Actor has write access: ${permissionLevel}`);
      return true;
    } else {
      core.warning(`Actor has insufficient permissions: ${permissionLevel}`);
      return false;
    }
  } catch (error) {
    core.error(`Failed to check permissions: ${error}`);
    throw new Error(`Failed to check permissions for ${actor}: ${error}`);
  }
}

async function createAgentGitHubSecret(githubToken: string): Promise<string> {
  const tokenName = `gh_token-${crypto.randomUUID()}`;
  return await createAgentKey(tokenName, githubToken);
}

export async function createGithubMcpAndSecret(
  githubToken: string,
): Promise<{ keyId: string; toolId: string }> {
  const keyId = await createAgentGitHubSecret(githubToken);
  const { toolName, toolId } = await createGithubRemoteMcpCustomTool();

  await createToolAssociation(toolName, keyId, AGENT_GITHUB_ENV_VAR);

  return { keyId, toolId };
}

/**
 * Creates the GitHub remote MCP custom tool.
 * Requires the GITHUB_TOKEN environment variable to be set and associated in h2oGPTe.
 */
export async function createGithubRemoteMcpCustomTool(
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeoutMs?: number;
  } = {},
): Promise<{ toolName: string; toolId: string }> {
  // Generate a unique name for the GitHub MCP tool to avoid conflicts
  const githubKey = `github_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
  const mcpUrl = getGithubMcpUrl();
  const remoteMcpTool: CustomToolInput = {
    toolType: "remote_mcp",
    toolArgs: {
      mcp_config_json: JSON.stringify({
        [githubKey]: {
          url: mcpUrl,
          type: "http",
          tool_usage_mode: ["runner"],
          description: "GitHub MCP: issues, PRs, Actions, security, repos",
          headers: {
            Authorization: `Bearer os.environ/${AGENT_GITHUB_ENV_VAR}`,
            "X-MCP-Tools": getGithubMcpAllowedTools(),
            "X-MCP-Toolsets": getGithubMcpAllowedToolsets(),
          },
        },
      }),
    },
  };

  core.debug(
    `Creating Github MCP tool with config: ${JSON.stringify(remoteMcpTool)}`,
  );

  const [toolId] = await createCustomTool(remoteMcpTool, options);
  if (!toolId) {
    throw new Error(
      "Failed to create GitHub MCP custom tool: no tool ID returned",
    );
  }
  return { toolName: githubKey, toolId: toolId };
}

export function getToolNameById(tools: CustomTool[], toolId: string): string {
  const tool = tools.find((t) => t.id === toolId);
  if (!tool) {
    throw new Error(`Tool with id ${toolId} not found`);
  }
  return tool.tool_name;
}

export function addToolsToListIfMissing(
  toolNames: string[],
  toolsToAdd: string[],
): string[] {
  const result = [...toolNames];
  for (const tool of toolsToAdd) {
    if (!result.includes(tool)) {
      result.push(tool);
    }
  }
  return result;
}

export function getUserProvidedAgentTools(): string[] {
  const agent_tools = process.env.AGENT_TOOLS;
  if (!agent_tools) {
    return [];
  }
  return agent_tools.split(",").map((t) => t.trim());
}

/**
 * Returns user-chosen agent tool names (from AGENT_TOOLS action input) or default system tool names.
 */
export async function getUserChosenOrSystemDefaultAgentToolNames(): Promise<
  string[]
> {
  const userProvidedAgentTools = getUserProvidedAgentTools();
  if (userProvidedAgentTools.length > 0) {
    return await getAllAgentToolNamesFromLabel(userProvidedAgentTools);
  }
  const defaultSystemTools = await extractDefaultSystemTools();
  return defaultSystemTools.map((t) => t.name);
}

/**
 * Returns the list of tool names to restrict the collection to when using the GitHub MCP.
 * Includes the MCP tool, the tool runner, and default system tools (unless specified otherwise by the user).
 */
export async function getToolsToRestrictCollectionTo(
  githubMcpToolId: string,
): Promise<string[]> {
  const DEFAULT_MCP_TOOL_RUNNER_NAME = "claude_tool_runner.py";

  const tools = await getCustomTools();
  const githubMcpToolName = getToolNameById(tools, githubMcpToolId);
  const agentToolNames = await getUserChosenOrSystemDefaultAgentToolNames();
  return [githubMcpToolName, DEFAULT_MCP_TOOL_RUNNER_NAME, ...agentToolNames];
}

/**
 * Joins the user's h2ogpte config with the restricted tools and applies the combined
 * settings to the collection's chat settings.
 */
export async function applyChatSettingsWithUserConfigAndTools(
  collectionId: string,
  h2ogpteConfig: H2ogpteConfig,
  restrictedTools: string[],
): Promise<void> {
  const chatSettings = await getChatSettings(collectionId);
  const currentAgentTools =
    (chatSettings.llm_args?.agent_tools as string[] | undefined) ?? [];
  const agentTools = addToolsToListIfMissing(
    currentAgentTools,
    restrictedTools,
  );

  core.debug(
    `Applying chat settings with user h2ogpte config and agent tools: ${agentTools}`,
  );
  await setChatSettings(collectionId, {
    ...chatSettings,
    llm: h2ogpteConfig.llm,
    llm_args: {
      ...chatSettings.llm_args,
      use_agent: true,
      agent_tools: agentTools,
      agent_max_turns: h2ogpteConfig.agent_max_turns,
      agent_accuracy: h2ogpteConfig.agent_accuracy,
      agent_total_timeout: h2ogpteConfig.agent_total_timeout,
    },
  });
}

/**
 * Parse h2oGPTe configuration from GitHub action inputs
 */

export function parseUserH2ogpteConfig(): H2ogpteConfig {
  const llm = process.env.LLM;
  const agent_max_turns = process.env.AGENT_MAX_TURNS;
  const agent_accuracy = process.env.AGENT_ACCURACY;
  const agent_total_timeout_raw = process.env.AGENT_TOTAL_TIMEOUT;
  let agent_total_timeout = 3600; // default value

  if (agent_total_timeout_raw !== undefined && agent_total_timeout_raw !== "") {
    const parsed = parseInt(agent_total_timeout_raw);
    if (!isNaN(parsed) && parsed >= 0) {
      agent_total_timeout = parsed;
    }
    // If parsing fails or value is negative, keep the default value
  }

  const allowedMaxTurnsValues = ["auto", "5", "10", "15", "20"];
  if (agent_max_turns && !allowedMaxTurnsValues.includes(agent_max_turns)) {
    throw new Error(
      `Invalid agent_max_turns value: "${agent_max_turns}". Must be one of: ${allowedMaxTurnsValues.join(", ")}`,
    );
  }

  const allowedAccuracyValues = ["quick", "basic", "standard", "maximum"];
  if (agent_accuracy && !allowedAccuracyValues.includes(agent_accuracy)) {
    throw new Error(
      `Invalid agent_accuracy value: "${agent_accuracy}". Must be one of: ${allowedAccuracyValues.join(", ")}`,
    );
  }

  return {
    llm: llm || "auto",
    agent_max_turns: agent_max_turns || "auto",
    agent_accuracy: agent_accuracy || "standard",
    agent_total_timeout: agent_total_timeout,
  };
}

export async function cleanup(
  keyId: string | null,
  toolId: string | null,
): Promise<void> {
  if (keyId) {
    try {
      await deleteAgentKey(keyId);
    } catch (error) {
      core.warning(
        `Failed to clean up agent key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    core.warning(`No agent key to clean up`);
  }

  if (toolId) {
    try {
      await deleteCustomTools([toolId]);
    } catch (error) {
      core.warning(
        `Failed to clean up custom tool: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    core.warning(`No custom tool to clean up`);
  }
}
