import dedent from "ts-dedent";
import { AGENT_GITHUB_ENV_VAR } from "../../constants";
import { getGithubApiUrl } from "../utils";
import type { ParsedGitHubContext } from "../services/github/types";
import type { FetchDataResult } from "../data/fetcher";
import { getAllEventsInOrder } from "./utils/formatter";
import { replaceAttachmentUrlsWithLocalPaths } from "./utils/url-replace";
import {
  extractInstruction,
  extractIdNumber,
  extractPRReviewCommentDetails,
} from "./utils/instruction";
import { isPullRequestReviewCommentEvent } from "../data/context";

export function createAgentInstructionPrompt(
  context: ParsedGitHubContext,
  githubData: FetchDataResult,
): string {
  const githubApiBase = getGithubApiUrl();

  const isPRReviewComment = isPullRequestReviewCommentEvent(context);

  // Extract instruction based on event type
  const instruction = extractInstruction(context);

  // Find PR/Issue number
  const idNumber = extractIdNumber(context);

  // Exclusive for PR Review Comment Event
  const prReviewDetails = extractPRReviewCommentDetails(context);
  const commitId = prReviewDetails?.commitId;
  const fileRelativePath = prReviewDetails?.fileRelativePath;
  const diffHunk = prReviewDetails?.diffHunk;

  // Format events for the prompt
  const eventsText = getAllEventsInOrder(githubData, context.isPR)
    .map((event) => `- ${event.type}: ${event.body} (${event.createdAt})`)
    .join("\n");

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
    For context, you have been provided the previous events on the ${context.isPR ? "pull request" : "issue"}.
    You can reference the previous events in the repo itself by their id provided.
    Here are the previous events in chronological order:
    ${eventsText}

    First read the previous events and understand the context of the conversation.
    Then read the user's instruction and understand the task they want to complete.
    Then read the code in the repository and understand the context of the code.
    Once you have a good understanding of the context, you can begin to respond to the user's instruction.

    If necessary, include GitHub referencing (e.g. #23) when referring to any other issues or PRs. Don't respond with the literal link.
    Begin your final response by quoting the initial instruction in a code block as markdown, labelling it as "User's Instruction".
    Remove any files that were in the instruction from your response.

    Please respond and execute actions according to the user's instruction.
  `;

  const prompt = `${prompt_intro}\n\n${prompt_body}\n\n${prompt_outro}`;

  // Replace attachment URLs with local file paths
  return replaceAttachmentUrlsWithLocalPaths(
    prompt,
    githubData.attachmentUrlMap,
  );
}
