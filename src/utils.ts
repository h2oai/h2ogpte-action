import { Octokit } from "@octokit/rest";
import { basename } from "path";
import { AGENT_GITHUB_ENV_VAR } from "./constants";
import type { ParsedGitHubContext } from "./core/services/github/types";
// import * as h2ogpte from "./core/services/h2ogpte/h2ogpte";
import {
  createAgentKey,
  createIngestionJob,
  createToolAssociation,
  getAgentKeyId,
  getJobDetails,
  uploadFile,
} from "./core/services/h2ogpte/h2ogpte";
import type { JobDetails, UploadResponse } from "./core/services/h2ogpte/types";

/**
 * Waits for a job to complete, polling at intervals
 */
export async function waitForJobCompletion(
  jobId: string,
  checkIntervalMs: number = 2000,
  timeoutMs: number = 300000,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<JobDetails> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const jobStatus = await getJobDetails(jobId, maxRetries, retryDelay);
    if (!jobStatus) {
      throw new Error(`Job status not found for jobId '${jobId}'`);
    }
    if (jobStatus.overall_status === "completed") {
      return jobStatus;
    }
    if (jobStatus.overall_status === "failed") {
      throw new Error(
        `Job failed: ${jobStatus.errors?.join(", ") || "Unknown error"}`,
      );
    }
    if (jobStatus.overall_status === "canceled") {
      throw new Error("Job was canceled");
    }
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
  }
  throw new Error(`Job monitoring timeout after ${timeoutMs}ms`);
}

/**
 * Gets H2OGPTE configuration from environment variables
 */
export function getH2ogpteConfig(): { apiKey: string; apiBase: string } {
  const apiKey = process.env.H2OGPTE_API_KEY;
  const apiBase = process.env.H2OGPTE_API_BASE;

  if (!apiKey) {
    throw new Error("H2OGPTE_API_KEY environment variable is required");
  }
  if (!apiBase) {
    throw new Error("H2OGPTE_API_BASE environment variable is required");
  }

  return { apiKey, apiBase };
}

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
 * Gets the GitHub API url from environment variable
 */
export function getGithubServerUrl(): string {
  const githubServerURL = process.env.GITHUB_SERVER_URL;

  if (!githubServerURL) {
    throw new Error("GitHub server url is required");
  }

  return githubServerURL;
}

/**
 * Check if the actor has write permissions to the repository
 * Source: https://github.com/anthropics/claude-code-action/blob/main/src/github/validation/permissions.ts
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

/**
 * Extracts the final agent response from the raw response
 */
export function extractFinalAgentResponse(input: string): string {
  if (!input || typeof input !== "string") {
    return "The agent did not return a valid response. Please check h2oGPTe.";
  }

  // Find all occurrences of "ENDOFTURN"
  const endOfTurnMatches = Array.from(input.matchAll(/ENDOFTURN/g));

  if (!endOfTurnMatches || endOfTurnMatches.length < 2) {
    // If there's less than 2 ENDOFTURN markers, return empty string
    console.log(
      `Could not find any end of turn markers, returning raw agent response: '${input}'`,
    );
    return input;
  }

  // Get the position of the second-to-last ENDOFTURN
  const secondToLastMatch = endOfTurnMatches[endOfTurnMatches.length - 2];
  const lastMatch = endOfTurnMatches[endOfTurnMatches.length - 1];

  // Check that both matches exist and have valid index values
  if (
    !secondToLastMatch ||
    !lastMatch ||
    secondToLastMatch.index === undefined ||
    lastMatch.index === undefined
  ) {
    console.log(`h2oGPTe response is invalid: '${input}'`);
    return "The agent did not return a complete response. Please check h2oGPTe.";
  }

  const secondToLastIndex = secondToLastMatch.index;
  const lastIndex = lastMatch.index;

  // Extract text between second-to-last and last ENDOFTURN
  const startPosition = secondToLastIndex + "ENDOFTURN".length;
  const textSection = input.substring(startPosition, lastIndex);

  // Remove <stream_turn_title> tags and their content
  const cleanText = textSection.replace(
    /<stream_turn_title>.*?<\/stream_turn_title>/gs,
    "",
  );

  // Trim newlines and whitespace from the beginning and end
  return cleanText.replace(/^\n+|\n+$/g, "").trim();
}

export async function createAgentGitHubSecret(
  githubToken: string,
): Promise<string> {
  const tokenName = `gh_token-${crypto.randomUUID()}`;
  return await createAgentKey(tokenName, githubToken);
}

export async function createSecretAndToolAssociation(
  githubToken: string,
): Promise<string> {
  const gitHubTokenKeyName = await createAgentGitHubSecret(githubToken);

  const keyUuid = await getAgentKeyId(gitHubTokenKeyName);

  await Promise.all([
    createToolAssociation("python", keyUuid, AGENT_GITHUB_ENV_VAR),
    createToolAssociation("shell", keyUuid, AGENT_GITHUB_ENV_VAR),
  ]);

  return keyUuid;
}

export async function processFileWithJobMonitoring(
  filePath: string,
  collectionId: string,
  options: {
    collectionName?: string;
    collectionDescription?: string;
    metadata?: Record<string, unknown>;
    timeout?: number;
    checkIntervalMs?: number;
    timeoutMs?: number;
    gen_doc_summaries?: boolean;
    gen_doc_questions?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  } = {},
): Promise<{
  upload?: UploadResponse;
  job?: JobDetails;
  collectionId: string;
  success: boolean;
  error?: string;
}> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  try {
    // Step 1: Upload file
    const upload = await uploadFile(filePath, maxRetries, retryDelay);
    // Step 2: Create ingestion job
    const job = await createIngestionJob(upload.id, collectionId, {
      metadata: {
        filename: basename(filePath),
        timestamp: new Date().toISOString(),
        ...options.metadata,
      },
      timeout: options.timeout || 600,
      gen_doc_summaries: options.gen_doc_summaries,
      gen_doc_questions: options.gen_doc_questions,
      maxRetries,
      retryDelay,
    });
    // Step 3: Monitor job completion
    const completedJob = await waitForJobCompletion(
      job.id,
      options.checkIntervalMs || 2000,
      options.timeoutMs || 300000,
      maxRetries,
      retryDelay,
    );
    return {
      upload,
      job: completedJob,
      collectionId,
      success: true,
    };
  } catch (error) {
    return {
      upload: undefined,
      job: undefined,
      collectionId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function cleanup(
  keyUuid: string | null,
  collectionId: string | null,
): Promise<void> {
  console.log("Cleaning up...");
  console.log("Key UUID:", keyUuid);
  console.log("Collection ID:", collectionId);
  // if (keyUuid) {
  //   try {
  //     await h2ogpte.deleteAgentKey(keyUuid);
  //   } catch (error) {
  //     console.warn(
  //       `Failed to clean up agent key: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // } else {
  //   console.log(`No agent key to clean up`);
  // }
  // if (collectionId) {
  //   try {
  //     await h2ogpte.deleteCollection(collectionId);
  //   } catch (error) {
  //     console.warn(
  //       `Failed to clean up collection: ${error instanceof Error ? error.message : String(error)}`,
  //     );
  //   }
  // } else {
  //   console.log(`No collection to clean up`);
  // }
}
