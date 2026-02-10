import * as core from "@actions/core";
import {
  isIssueCommentEvent,
  isPRIssueEvent,
  parseGitHubContext,
} from "./core/data/context";
import { fetchGitHubData } from "./core/data/fetcher";
import { uploadAttachmentsToH2oGPTe } from "./core/data/utils/attachment-upload";
import { createAgentInstructionPrompt } from "./core/response/prompt";
import { buildH2ogpteResponse } from "./core/response/response_builder";
import { createInitialWorkingComment } from "./core/response/utils/comment-formatter";
import { extractInstruction } from "./core/response/utils/instruction";
import { getSlashCommandsUsed } from "./core/response/utils/slash-commands";
import { createReply, updateComment } from "./core/services/github/api";
import { createOctokits } from "./core/services/github/octokits";
import * as h2ogpte from "./core/services/h2ogpte/h2ogpte";
import {
  copyCollection,
  isValidCollection,
  parseUserH2ogpteConfig,
  updateGuardRailsSettings,
} from "./core/services/h2ogpte/utils";
import {
  applyChatSettingsWithUserConfigAndTools,
  checkWritePermissions,
  cleanup,
  createGithubMcpAndSecret,
  getGithubToken,
  getToolsToRestrictCollectionTo,
} from "./core/utils";

import { getGuidelinesFile } from "./core/response/utils/guidelines";
/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  let cleanupKeyId: string | null = null;
  let cleanupToolId: string | null = null;
  const userProvidedCollectionId: string | null =
    process.env.COLLECTION_ID || null;

  try {
    // Fetch context
    const octokits = createOctokits();
    const context = parseGitHubContext();
    const githubToken = getGithubToken();

    // Check if actor has correct permissions, otherwise exit immeditely
    const hasWritePermissions = await checkWritePermissions(
      octokits.rest,
      context,
    );
    if (!hasWritePermissions) {
      throw new Error(
        "Actor does not have write permissions to the repository",
      );
    }

    const runId = process.env.GITHUB_RUN_ID;
    const repo = process.env.GITHUB_REPOSITORY; // owner/repo
    const url = `https://github.com/${repo}/actions/runs/${runId}`;
    core.debug(`This run url is ${url}`);

    const instruction = extractInstruction(context);

    // Create Collection
    const collectionId = await h2ogpte.createCollection();

    // Copy collection if userProvidedCollectionId exists
    if (
      userProvidedCollectionId &&
      (await isValidCollection(userProvidedCollectionId))
    ) {
      await copyCollection(userProvidedCollectionId, collectionId);
    }

    // Set Guardrail settings
    core.debug(`Guardrail settings: ${process.env.GUARDRAILS_SETTINGS}`);
    await updateGuardRailsSettings(
      collectionId,
      process.env.GUARDRAILS_SETTINGS,
    );

    // Setup the GitHub MCP and secret in h2oGPTe
    const { keyId: gitHubSecretKeyId, toolId: gitHubMcpToolId } =
      await createGithubMcpAndSecret(githubToken);
    cleanupKeyId = gitHubSecretKeyId;
    cleanupToolId = gitHubMcpToolId;

    // Parse h2oGPTe configuration
    const h2ogpteConfig = parseUserH2ogpteConfig();
    core.debug(
      `User provided h2oGPTe config: ${JSON.stringify(h2ogpteConfig)}`,
    );

    // Apply user config combined with restricted MCP tools to collection chat settings
    // h2oGPTe always overrides settings so better to apply it once to the collection globally
    const restrictedTools =
      await getToolsToRestrictCollectionTo(gitHubMcpToolId);
    await applyChatSettingsWithUserConfigAndTools(
      collectionId,
      h2ogpteConfig,
      restrictedTools,
    );

    // Create a Chat Session in h2oGPTe
    const chatSessionId = await h2ogpte.createChatSession(collectionId);
    const chatSessionUrl = h2ogpte.getChatSessionUrl(chatSessionId.id);
    core.debug(`This chat session url is ${chatSessionUrl}`);

    // Retrieved agent doc's contents
    const agentDocsPath = process.env.AGENT_DOCS;
    let agentDocsContent;
    if (agentDocsPath) {
      agentDocsContent = await getGuidelinesFile(
        octokits.rest,
        agentDocsPath,
        context,
      );
    }

    if (isPRIssueEvent(context) && instruction?.includes("@h2ogpte")) {
      // Fetch Github comment data (only for PR/Issue events)
      const githubData = await fetchGitHubData({
        octokits: octokits,
        repository: `${context.repository.owner}/${context.repository.repo}`,
        prNumber: context.entityNumber?.toString() || "",
        isPR: context.isPR,
        triggerUsername: context.actor,
        isIssueCommentPR: isIssueCommentEvent(context) && context.isPR,
      });
      core.debug(`Github Data:\n${JSON.stringify(githubData, null, 2)}`);

      // Upload attachments
      await uploadAttachmentsToH2oGPTe(
        collectionId,
        githubData.attachmentUrlMap,
      );

      core.debug(`Full payload: ${JSON.stringify(context.payload, null, 2)}`);

      // Create the initial comment
      const { commands: usedCommands, error: slashCommandError } =
        getSlashCommandsUsed(instruction);
      const initialCommentBody = createInitialWorkingComment(url, usedCommands);
      const h2ogpteComment = await createReply(
        octokits.rest,
        initialCommentBody,
        context,
      );

      // Create the agent instruction prompt
      const instructionPrompt = createAgentInstructionPrompt(
        context,
        githubData,
        agentDocsContent,
      );

      // Query h2oGPTe for Agent completion
      const chatCompletion = await h2ogpte.requestAgentCompletion(
        chatSessionId.id,
        instructionPrompt,
      );

      // Extract response from agent completion
      const updatedCommentBody = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        url,
        chatSessionUrl,
        usedCommands,
        slashCommandError,
      );
      core.debug(`Extracted response: ${updatedCommentBody}`);

      core.debug(`Commands used: ${JSON.stringify(usedCommands, null, 2)}`);

      // Update initial comment
      await updateComment(
        octokits.rest,
        updatedCommentBody,
        context,
        h2ogpteComment.data.id,
      );
    } else {
      // Create the agent instruction prompt
      const instructionPrompt = createAgentInstructionPrompt(
        context,
        undefined,
        agentDocsContent,
      );

      // Query h2oGPTe for Agent completion
      const chatCompletion = await h2ogpte.requestAgentCompletion(
        chatSessionId.id,
        instructionPrompt,
      );

      core.debug(
        `Chat completion:\n ${JSON.stringify(chatCompletion, null, 2)}`,
      );
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  } finally {
    await cleanup(cleanupKeyId, cleanupToolId);
  }
}

if (import.meta.main) {
  run();
}
