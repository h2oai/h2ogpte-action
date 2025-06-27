import dedent from "ts-dedent";
import { AGENT_GITHUB_ENV_VAR } from "./constants";
import type {
  PullRequestReviewCommentEvent,
  IssuesEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  IssueCommentEvent,
} from "@octokit/webhooks-types";
import { getGithubApiUrl } from "./utils";
import type { ParsedGitHubContext } from "./core/services/github/types";
import type { FetchDataResult } from "./core/data/fetcher";
import {
  getAllEventsInOrder,
  replaceAttachmentUrlsWithLocalPaths,
} from "./core/data/formatter";
import {
  isIssueCommentEvent,
  isIssuesEvent,
  isPullRequestEvent,
  isPullRequestReviewCommentEvent,
  isPullRequestReviewEvent,
} from "./core/data/context";

export function createAgentInstructionPrompt(
  context: ParsedGitHubContext,
  githubData: FetchDataResult,
): string {
  const githubApiBase = getGithubApiUrl();

  const isPRReviewComment = isPullRequestReviewCommentEvent(context);
  const isPREvent =
    isPullRequestEvent(context) ||
    isPullRequestReviewEvent(context) ||
    isPRReviewComment;
  const isIssueComment = isIssueCommentEvent(context);

  // Extract instruction based on event type
  let instruction: string;

  if (isIssuesEvent(context)) {
    instruction = (context.payload as IssuesEvent).issue.body || "";
  } else if (isPullRequestEvent(context)) {
    instruction = (context.payload as PullRequestEvent).pull_request.body || "";
  } else if (isPullRequestReviewEvent(context)) {
    instruction = (context.payload as PullRequestReviewEvent).review.body || "";
  } else if (isPRReviewComment) {
    instruction =
      (context.payload as PullRequestReviewCommentEvent).comment.body || "";
  } else {
    instruction = (context.payload as IssueCommentEvent).comment.body || "";
  }

  // Find PR/Issue number
  let idNumber: number | undefined;

  if (isIssueComment) {
    idNumber = (context.payload as IssueCommentEvent).issue.number;
  } else if (isPRReviewComment) {
    idNumber = (context.payload as PullRequestReviewCommentEvent).pull_request
      .number;
  } else if (isPREvent) {
    idNumber = (context.payload as PullRequestEvent).pull_request.number;
  } else {
    idNumber = (context.payload as IssuesEvent).issue.number;
  }

  // Exclusive for PR Review Comment Event
  const commitId = isPRReviewComment
    ? (context.payload as PullRequestReviewCommentEvent).comment.commit_id
    : undefined;
  const fileRelativePath = isPRReviewComment
    ? (context.payload as PullRequestReviewCommentEvent).comment.path
    : undefined;
  const diffHunk = isPRReviewComment
    ? (context.payload as PullRequestReviewCommentEvent).comment.diff_hunk
    : undefined;

  // Format events for the prompt
  const eventsText = getAllEventsInOrder(githubData, context.isPR)
    .map((event) => `- ${event.type}: ${event.body} (${event.createdAt})`)
    .join("\n");

  const attachmentUrlMap = githubData.attachmentUrlMap;

  // Replace attachment URLs with local file paths in the events text
  const processedEventsText = replaceAttachmentUrlsWithLocalPaths(
    eventsText,
    attachmentUrlMap,
  );

  const prompt_intro = dedent`You're h2oGPTe an AI Agent created to help software developers review their code in GitHub.
    Developers interact with you by adding @h2ogpte in their pull request review comments.
    You'll be provided a github api key that you can access in python by using os.getenv("${AGENT_GITHUB_ENV_VAR}").
    You can also access the github api key in your shell script by using the ${AGENT_GITHUB_ENV_VAR} environment variable.
    You should use the GitHub API directly (${githubApiBase}) with the api key as a bearer token.
    You should only ever respond to the users query by reading code and creating commits (if required) on the branch of the pull request.
    Don't create any comments on the pull request yourself.`;

  const prompt_pr_review = dedent`
    Use the commit id, ${commitId}, and the relative file path, ${fileRelativePath}, to pull any necessary files.
    ${diffHunk ? `In this case the user has selected the following diff hunk that you must focus on ${diffHunk}` : ""}
  `;

  const prompt_pr = dedent`
    You must only work on pull request number ${idNumber}.
    You must only work on the section of code they've selected which may be a diff hunk or an entire file/s.
    ${isPRReviewComment ? prompt_pr_review : ""}
  `;

  const prompt_issue = dedent`
    If code changes are required, you must create a new branch and pull request in the user's repository and name it appropriately.
    You must link the pull request to the issue.
  `;

  const prompt_body = dedent`
    Here is the user's instruction: '${instruction}'.
    You must only work in the user's repository, ${context.repository.full_name}.
    ${context.isPR ? prompt_pr : prompt_issue}
  `;

  const prompt_outro = dedent`
    For context, here are the previous events on the ${context.isPR ? "pull request" : "issue"} in chronological order:
    ${processedEventsText}

    Please respond and execute actions according to the user's instruction.
  `;

  return `${prompt_intro}\n\n${prompt_body}\n\n${prompt_outro}`;
}
