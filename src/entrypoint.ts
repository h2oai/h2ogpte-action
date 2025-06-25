import * as core from "@actions/core";
import {
  isPullRequestReviewCommentEvent,
  parseGitHubContext,
} from "./core/data/context";
import { fetchGitHubData } from "./core/data/fetcher";
import {
  createReplyForReviewComment,
  updateReviewComment,
} from "./core/services/github/api";
import { createOctokits } from "./core/services/github/octokits";
import * as h2ogpte from "./core/services/h2ogpte/h2ogpte";
import { createAgentInstructionPrompt } from "./prompts";
import {
  checkWritePermissions,
  cleanup,
  createSecretAndToolAssociation,
  extractFinalAgentResponse,
  getGithubToken,
  processFileWithJobMonitoring,
} from "./utils";
import { getAllEventsInOrder } from "./core/data/formatter";

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

    core.debug("Github Data:");
    core.debug(JSON.stringify(githubData));

    const eventsInOrder = getAllEventsInOrder(githubData);

    core.debug("Events in order:");
    core.debug(JSON.stringify(eventsInOrder));

    core.debug("Image URL Map:");
    core.debug(JSON.stringify(githubData.attachmentUrlMap));

    // This should be refactored later
    try {
      collectionId = await h2ogpte.createCollection();
      githubData.attachmentUrlMap.forEach(async (localPath) => {
        const uploadResult = await processFileWithJobMonitoring(
          localPath,
          collectionId!,
        );
        if (!uploadResult.success) {
          core.warning(
            `Failed to upload file to h2oGPTe: ${localPath} with error: ${uploadResult.error}`,
          );
        }
      });
    } catch (error) {
      core.warning(
        `Failed to process GitHub attachments: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Handle Github Event
    if (isPullRequestReviewCommentEvent(context)) {
      core.debug(`Full payload: ${JSON.stringify(context.payload, null, 2)}`);

      // 1. Setup the GitHub secret in h2oGPTe
      keyUuid = await createSecretAndToolAssociation(githubToken);

      // 2. Create a Chat Session in h2oGPTe
      const chatSessionId = await h2ogpte.createChatSession(collectionId);
      const chatSessionUrl = h2ogpte.getChatSessionUrl(chatSessionId.id);

      // 3. Create the initial review reply comment
      const intialCommentBody = `⏳ h2oGPTe is working on it, see the chat [here](${chatSessionUrl})`;
      const h2ogpteComment = await createReplyForReviewComment(
        octokits.rest,
        intialCommentBody,
        context,
      );

      // 4. Create the agent instruction prompt
      const instructionPrompt = createAgentInstructionPrompt(
        context,
        eventsInOrder,
      );

      // 5. Query h2oGPTe for Agent completion
      const chatCompletion = await h2ogpte.requestAgentCompletion(
        chatSessionId.id,
        instructionPrompt,
      );

      // 6. Extract response from agent completion
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

      // 7. Update initial review comment
      const updatedCommentBody = `${header}, see the response below and the [full chat history](${chatSessionUrl})\n---\n${cleanedResponse}`;
      await updateReviewComment(
        octokits.rest,
        updatedCommentBody,
        context,
        h2ogpteComment.data.id,
      );
    } else {
      throw new Error(`Unexpected event: ${context.eventName}`);
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  } finally {
    await cleanup(keyUuid, collectionId);
  }
}

if (import.meta.main) {
  run();
}
