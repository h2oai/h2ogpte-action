import dedent from "ts-dedent";
import { AGENT_GITHUB_ENV_VAR } from "./constants";
import type { PullRequestReviewCommentEvent } from "@octokit/webhooks-types";
import { getGithubApiUrl } from "./utils";
import type { ParsedGitHubContext } from "./core/services/github/types";
import type { FetchDataResult } from "./core/data/fetcher";
import {
  getAllEventsInOrder,
  replaceAttachmentUrlsWithLocalPaths,
} from "./core/data/formatter";

export function createAgentInstructionPrompt(
  context: ParsedGitHubContext,
  githubData: FetchDataResult,
) {
  const commentBody = (context.payload as PullRequestReviewCommentEvent).comment
    .body;
  const pullRequestNumber = (context.payload as PullRequestReviewCommentEvent)
    .pull_request.number;
  const fileRelativePath = (context.payload as PullRequestReviewCommentEvent)
    .comment.path;
  const commitId = (context.payload as PullRequestReviewCommentEvent).comment
    .commit_id;
  const diffHunk = (context.payload as PullRequestReviewCommentEvent).comment
    .diff_hunk;
  const githubApiBase = getGithubApiUrl();

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

  return dedent`You're h2oGPTe an AI Agent created to help software developers review their code in GitHub.
    Developers interact with you by adding @h2ogpte in their pull request review comments.
    You'll be provided a github api key that you can access in python by using os.getenv("${AGENT_GITHUB_ENV_VAR}").
    You can also access the github api key in your shell script by using the ${AGENT_GITHUB_ENV_VAR} environment variable.
    You should use the GitHub API directly (${githubApiBase}) with the api key as a bearer token.
    You should only ever respond to the users query by reading code and creating commits (if required) on the branch of the pull request.
    Don't create any comments on the pull request yourself.

    Here is the user's instruction: '${commentBody}'.
    You must only work in the user's repository, ${context.repository.full_name}, on pull request number ${pullRequestNumber}.
    You must only work on the section of code they've selected which may be a diff hunk or an entire file/s.
    Use the commit id, ${commitId}, and the relative file path, ${fileRelativePath}, to pull any necessary files.
    ${diffHunk ? `In this case the user has selected the following diff hunk that you must focus on ${diffHunk}` : ""}

    For context, here are the previous events on the pull request in chronological order:
    ${processedEventsText}

    Please respond and execute actions according to the user's instruction.
    `;
}
