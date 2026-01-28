import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import type { PullRequestReviewCommentEvent } from "@octokit/webhooks-types";
import { isPullRequestReviewCommentEvent } from "../../data/context";
import type { ParsedGitHubContext } from "./types";

export async function createReply(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
) {
  if (isPullRequestReviewCommentEvent(context)) {
    return await createReplyForReviewComment(octokit, comment_body, context);
  } else {
    return await createReplyForIssueComment(octokit, comment_body, context);
  }
}

async function createReplyForReviewComment(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
) {
  const comment = await octokit.pulls.createReplyForReviewComment({
    owner: context.repository.owner,
    repo: context.repository.repo,
    pull_number: context.entityNumber!,
    comment_id: (context.payload as PullRequestReviewCommentEvent).comment.id,
    body: comment_body,
  });
  return comment;
}

async function createReplyForIssueComment(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
) {
  const comment = await octokit.issues.createComment({
    owner: context.repository.owner,
    repo: context.repository.repo,
    issue_number: context.entityNumber!,
    body: comment_body,
  });
  return comment;
}

export async function updateComment(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
  initialh2ogpteCommentId: number,
) {
  if (isPullRequestReviewCommentEvent(context)) {
    return await updateReviewComment(
      octokit,
      comment_body,
      context,
      initialh2ogpteCommentId,
    );
  } else {
    return await updateIssueComment(
      octokit,
      comment_body,
      context,
      initialh2ogpteCommentId,
    );
  }
}

async function updateReviewComment(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
  initialh2ogpteCommentId: number,
) {
  await octokit.pulls.updateReviewComment({
    owner: context.repository.owner,
    repo: context.repository.repo,
    comment_id: initialh2ogpteCommentId,
    body: comment_body,
  });
}

async function updateIssueComment(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
  initialh2ogpteCommentId: number,
) {
  await octokit.issues.updateComment({
    owner: context.repository.owner,
    repo: context.repository.repo,
    comment_id: initialh2ogpteCommentId,
    body: comment_body,
  });
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
