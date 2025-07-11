import { Octokit } from "@octokit/rest";
import type { ParsedGitHubContext } from "./types";
import type { PullRequestReviewCommentEvent } from "@octokit/webhooks-types";

export async function createReply(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
  isPR: boolean,
) {
  if (isPR) {
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
    pull_number: context.entityNumber,
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
    issue_number: context.entityNumber,
    body: comment_body,
  });
  return comment;
}

export async function updateComment(
  octokit: Octokit,
  comment_body: string,
  context: ParsedGitHubContext,
  initialh2ogpteCommentId: number,
  isPR: boolean,
) {
  if (isPR) {
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
