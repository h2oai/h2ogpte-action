import { Octokit } from "@octokit/rest";
import { AGENT_GITHUB_ENV_VAR } from "../constants";
import type { ParsedGitHubContext } from "./services/github/types";
import {
  createAgentKey,
  createToolAssociation,
  deleteAgentKey,
} from "./services/h2ogpte/h2ogpte";

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
    console.log(`Checking permissions for actor: ${actor}`);

    // Check permissions directly using the permission endpoint
    const response = await octokit.repos.getCollaboratorPermissionLevel({
      owner: repository.owner,
      repo: repository.repo,
      username: actor,
    });

    const permissionLevel = response.data.permission;
    console.log(`Permission level retrieved: ${permissionLevel}`);

    if (permissionLevel === "admin" || permissionLevel === "write") {
      console.log(`Actor has write access: ${permissionLevel}`);
      return true;
    } else {
      console.warn(`Actor has insufficient permissions: ${permissionLevel}`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to check permissions: ${error}`);
    throw new Error(`Failed to check permissions for ${actor}: ${error}`);
  }
}

async function createAgentGitHubSecret(githubToken: string): Promise<string> {
  const tokenName = `gh_token-${crypto.randomUUID()}`;
  return await createAgentKey(tokenName, githubToken);
}

export async function createSecretAndToolAssociation(
  githubToken: string,
): Promise<string> {
  const keyUuid = await createAgentGitHubSecret(githubToken);

  await Promise.all([
    createToolAssociation("python", keyUuid, AGENT_GITHUB_ENV_VAR),
    createToolAssociation("shell", keyUuid, AGENT_GITHUB_ENV_VAR),
  ]);

  return keyUuid;
}

export async function cleanup(keyUuid: string | null): Promise<void> {
  if (keyUuid) {
    try {
      await deleteAgentKey(keyUuid);
    } catch (error) {
      console.warn(
        `Failed to clean up agent key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    console.log(`No agent key to clean up`);
  }
}
