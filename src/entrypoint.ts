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
import { extractInstruction } from "./core/response/utils/instruction";
import { createReply, updateComment } from "./core/services/github/api";
import { createOctokits } from "./core/services/github/octokits";
import * as h2ogpte from "./core/services/h2ogpte/h2ogpte";
import { parseH2ogpteConfig } from "./core/services/h2ogpte/utils";
import {
  checkWritePermissions,
  cleanup,
  createGitHubMCPAndSecret,
  getGithubToken,
} from "./core/utils";

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  let keyUuid: string | null = null;
  let collectionId: string | null = null;

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

      collectionId = await uploadAttachmentsToH2oGPTe(
        githubData.attachmentUrlMap,
      );

      core.debug(`Full payload: ${JSON.stringify(context.payload, null, 2)}`);

      // 1. Setup the GitHub secret in h2oGPTe
      keyUuid = await createGitHubMCPAndSecret(githubToken);

      // 2. Create a Chat Session in h2oGPTe
      const chatSessionId = await h2ogpte.createChatSession(collectionId);
      const chatSessionUrl = h2ogpte.getChatSessionUrl(chatSessionId.id);
      core.debug(`This chat session url is ${chatSessionUrl}`);

      // 3. Create the initial comment
      const gifDataUrl = `https://h2ogpte-github-action.cdn.h2o.ai/h2o_loading.gif`;
      const workingMessages = [
        "h2oGPTe is working on it",
        "h2oGPTe is working",
        "h2oGPTe is thinking",
        "h2oGPTe is connecting the dots",
        "h2oGPTe is putting it all together",
        "h2oGPTe is processing your request",
      ];
      const randomMessage =
        workingMessages[Math.floor(Math.random() * workingMessages.length)];
      const initialCommentBody = `### ${randomMessage} &nbsp;<img src="${gifDataUrl}" width="40px"/>\n\nFollow progress in the [GitHub Action run](${url})`;
      const h2ogpteComment = await createReply(
        octokits.rest,
        initialCommentBody,
        context,
      );

      // 4. Create the agent instruction prompt
      const instructionPrompt = createAgentInstructionPrompt(
        context,
        githubData,
      );

      // 5. Parse h2oGPTe configuration
      const h2ogpteConfig = parseH2ogpteConfig();
      core.debug(`h2oGPTe config: ${JSON.stringify(h2ogpteConfig)}`);

      // 6. Query h2oGPTe for Agent completion
      const chatCompletion = await h2ogpte.requestAgentCompletion(
        chatSessionId.id,
        instructionPrompt,
        h2ogpteConfig,
      );

      // 7. Extract response from agent completion
      const updatedCommentBody = buildH2ogpteResponse(
        chatCompletion,
        instruction,
        url,
        chatSessionUrl,
      );
      core.debug(`Extracted response: ${updatedCommentBody}`);

      // 8. Update initial comment
      await updateComment(
        octokits.rest,
        updatedCommentBody,
        context,
        h2ogpteComment.data.id,
      );
    } else {
      // 1. Setup the GitHub secret in h2oGPTe
      keyUuid = await createGitHubMCPAndSecret(githubToken);

      // 2. Create a Chat Session in h2oGPTe
      const chatSessionId = await h2ogpte.createChatSession(collectionId);
      const chatSessionUrl = h2ogpte.getChatSessionUrl(chatSessionId.id);
      core.debug(`This chat session url is ${chatSessionUrl}`);

      // 3. Create the agent instruction prompt
      const instructionPrompt = createAgentInstructionPrompt(
        context,
        undefined,
      );

      // 4. Parse h2oGPTe configuration
      const h2ogpteConfig = parseH2ogpteConfig();
      core.debug(`h2oGPTe config: ${JSON.stringify(h2ogpteConfig)}`);

      // 5. Query h2oGPTe for Agent completion
      const chatCompletion = await h2ogpte.requestAgentCompletion(
        chatSessionId.id,
        instructionPrompt,
        h2ogpteConfig,
      );

      core.debug(
        `Chat completion:\n ${JSON.stringify(chatCompletion, null, 2)}`,
      );
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  } finally {
    await cleanup(keyUuid);
  }
}

if (import.meta.main) {
  run();
}
