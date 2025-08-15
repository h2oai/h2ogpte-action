import type {
  PullRequestReviewCommentEvent,
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  IssueCommentEvent,
} from "@octokit/webhooks-types";
import type { ParsedGitHubContext } from "../../services/github/types";
import {
  isIssueCommentEvent,
  isIssuesEvent,
  isPullRequestEvent,
  isPullRequestReviewCommentEvent,
  isPullRequestReviewEvent,
} from "../../data/context";

/**
 * Extracts instruction text from GitHub event payload based on event type
 * @param context - Parsed GitHub context containing the event payload
 * @returns The instruction text from the event body
 */
export function extractInstruction(context: ParsedGitHubContext): string {
  if (isIssuesEvent(context)) {
    return (context.payload as IssuesEvent).issue.body || "";
  } else if (isIssueCommentEvent(context)) {
    return (context.payload as IssueCommentEvent).comment.body || "";
  } else if (isPullRequestEvent(context)) {
    return (context.payload as PullRequestEvent).pull_request.body || "";
  } else if (isPullRequestReviewEvent(context)) {
    return (context.payload as PullRequestReviewEvent).review.body || "";
  } else if (isPullRequestReviewCommentEvent(context)) {
    return (
      (context.payload as PullRequestReviewCommentEvent).comment.body || ""
    );
  } else {
    // Non PR/Issue events don't have a body/instruction
    return "";
  }
}

/**
 * Extracts the PR/Issue number from GitHub event payload based on event type
 * @param context - Parsed GitHub context containing the event payload
 * @returns The PR/Issue number
 */
export function extractIdNumber(
  context: ParsedGitHubContext,
): number | undefined {
  const isIssueComment = isIssueCommentEvent(context);
  const isPRReviewComment = isPullRequestReviewCommentEvent(context);
  const isPREvent =
    isPullRequestEvent(context) ||
    isPullRequestReviewEvent(context) ||
    isPRReviewComment;

  if (isIssueComment) {
    return (context.payload as IssueCommentEvent).issue.number;
  } else if (isPRReviewComment) {
    return (context.payload as PullRequestReviewCommentEvent).pull_request
      .number;
  } else if (isPREvent) {
    return (context.payload as PullRequestEvent).pull_request.number;
  } else if (isIssuesEvent(context)) {
    return (context.payload as IssuesEvent).issue.number;
  } else {
    return undefined;
  }
}

/**
 * Extracts PR review comment details (commit ID, file path, diff hunk) from GitHub event payload
 * @param context - Parsed GitHub context containing the event payload
 * @returns Object containing commitId, fileRelativePath, and diffHunk, or undefined if not a PR review comment event
 */
export function extractPRReviewCommentDetails(context: ParsedGitHubContext):
  | {
      commitId: string | undefined;
      fileRelativePath: string | undefined;
      diffHunk: string | undefined;
    }
  | undefined {
  if (!isPullRequestReviewCommentEvent(context)) {
    return undefined;
  }

  const payload = context.payload as PullRequestReviewCommentEvent;
  return {
    commitId: payload.comment.commit_id,
    fileRelativePath: payload.comment.path,
    diffHunk: payload.comment.diff_hunk,
  };
}
