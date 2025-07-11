import * as core from "@actions/core";
import {
  checkWritePermissions,
  cleanup,
  createSecretAndToolAssociation,
  getGithubToken,
} from "./core/utils";
import {
  isIssueCommentEvent,
  isIssuesEvent,
  isPullRequestEvent,
  isPullRequestReviewCommentEvent,
  isPullRequestReviewEvent,
  parseGitHubContext,
} from "./core/data/context";
import { fetchGitHubData } from "./core/data/fetcher";
import { createReply, updateComment } from "./core/services/github/api";
import { createOctokits } from "./core/services/github/octokits";
import * as h2ogpte from "./core/services/h2ogpte/h2ogpte";
import { parseH2ogpteConfig } from "./core/services/h2ogpte/utils";
import { createAgentInstructionPrompt } from "./core/response/prompt";
import { uploadAttachmentsToH2oGPTe } from "./core/data/utils/attachment-upload";
import { extractFinalAgentResponse } from "./core/response/utils/extract-response";

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

    // Fetch Github comment data
    const githubData = await fetchGitHubData({
      octokits: octokits,
      repository: `${context.repository.owner}/${context.repository.repo}`,
      prNumber: context.entityNumber.toString(),
      isPR: context.isPR,
      triggerUsername: context.actor,
    });
    core.debug(`Github Data:\n${JSON.stringify(githubData, null, 2)}`);

    const runId = process.env.GITHUB_RUN_ID;
    const repo = process.env.GITHUB_REPOSITORY; // owner/repo
    const url = `https://github.com/${repo}/actions/runs/${runId}`;
    core.debug(`This run url is ${url}`);

    collectionId = await uploadAttachmentsToH2oGPTe(
      githubData.attachmentUrlMap,
    );

    // Handle GitHub Event
    const isIssue: boolean =
      isIssuesEvent(context) ||
      isIssueCommentEvent(context) ||
      isPullRequestEvent(context) ||
      isPullRequestReviewEvent(context);
    const isPRReviewComment: boolean = isPullRequestReviewCommentEvent(context);

    if (isIssue || isPRReviewComment) {
      core.debug(`Full payload: ${JSON.stringify(context.payload, null, 2)}`);

      // 1. Setup the GitHub secret in h2oGPTe
      keyUuid = await createSecretAndToolAssociation(githubToken);

      // 2. Create a Chat Session in h2oGPTe
      const chatSessionId = await h2ogpte.createChatSession(collectionId);
      const chatSessionUrl = h2ogpte.getChatSessionUrl(chatSessionId.id);
      core.debug(`This chat session url is ${chatSessionUrl}`);

      // 3. Create the initial comment
      const initialCommentBody = `⏳ h2oGPTe is working on it, see the [github action run](${url})`;
      const h2ogpteComment = await createReply(
        octokits.rest,
        initialCommentBody,
        context,
        isPRReviewComment,
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
      let cleanedResponse = "";
      let header = "";
      if (chatCompletion.success) {
        header = `💡 h2oGPTe made some changes`;
        cleanedResponse = extractFinalAgentResponse(chatCompletion.body);
      } else {
        header = `❌ h2oGPTe ran into some issues`;
        cleanedResponse = chatCompletion.body;
      }
      core.debug(`Extracted response: ${cleanedResponse}`);

      // 8. Update initial comment
      const updatedCommentBody = `${header}, see the response below and the [github action run](${url})\n---\n${cleanedResponse}`;
      await updateComment(
        octokits.rest,
        updatedCommentBody,
        context,
        h2ogpteComment.data.id,
        isPRReviewComment,
      );
    } else {
      throw new Error(`Unexpected event: ${context.eventName}`);
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
