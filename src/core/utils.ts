import * as core from "@actions/core";
import { AGENT_GITHUB_ENV_VAR } from "../constants";
import {
  createAgentKey,
  createToolAssociation,
  deleteAgentKey,
} from "./services/h2ogpte/h2ogpte";
import { getGithubAccessToken } from "./services/github/auth";

export function getGithubTokenFromEnv(): string | undefined {
  const githubToken = process.env.OVERRIDE_GITHUB_TOKEN;

  return githubToken;
}

export async function getGithubToken(): Promise<string> {
  const githubTokenFromEnv = getGithubTokenFromEnv();

  if (githubTokenFromEnv) {
    console.log("Using GitHub token from user input");
    return githubTokenFromEnv;
  }

  const githubAccessToken = await getGithubAccessToken();

  return githubAccessToken;
}

export function getGithubApiUrl(): string {
  const githubApiBase = process.env.GITHUB_API_URL;

  if (!githubApiBase) {
    throw new Error("GitHub API base url is required");
  }

  return githubApiBase;
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
      core.warning(
        `Failed to clean up agent key: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  } else {
    core.warning(`No agent key to clean up`);
  }
}
