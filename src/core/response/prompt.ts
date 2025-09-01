import dedent from "ts-dedent";
import { AGENT_GITHUB_ENV_VAR } from "../../constants";
import { getGithubApiUrl } from "../utils";
import type { ParsedGitHubContext } from "../services/github/types";
import type { FetchDataResult } from "../data/fetcher";
import { buildEventsText } from "./utils/formatter";
import { replaceAttachmentUrlsWithLocalPaths } from "./utils/url-replace";
import {
  extractInstruction,
  extractIdNumber,
  extractPRReviewCommentDetails,
  extractHeadBranch,
  extractBaseBranch,
} from "./utils/instruction";
import {
  isPRIssueEvent,
  isPullRequestReviewCommentEvent,
} from "../data/context";

const USER_PROMPT = process.env.PROMPT || "";
const PROMPT_WRAPPER = dedent`
You're h2oGPTe an AI Agent created to help software developers review their code in GitHub.
This event is triggered automatically when a pull request is created/synchronized.

You'll be provided a github api key that you can access in python by using os.getenv("{{AGENT_GITHUB_ENV_VAR}}").
You can also access the github api key in your shell script by using the {{AGENT_GITHUB_ENV_VAR}} environment variable.
You should use the GitHub API directly ({{githubApiBase}}) with the api key as a bearer token.

You must only work in the user's repository, {{repoName}}.
Under no circumstances should you print the github api key in your response or any output stream.

{{userPrompt}}

Respond and execute actions according to the user's instruction.
`;

export function createAgentInstructionPrompt(
  context: ParsedGitHubContext,
  githubData: FetchDataResult | undefined,
): string {
  let prompt: string;

  if (
    isPRIssueEvent(context) &&
    extractInstruction(context)?.includes("@h2ogpte") &&
    githubData
  ) {
    prompt = createAgentInstructionPromptForComment(context, githubData);
  } else {
    prompt = PROMPT_WRAPPER;
  }
  return applyReplacements(prompt, context, githubData);
}

/**
 * Applies all replacements from the central dictionary to a prompt string
 */
function applyReplacements(
  prompt: string,
  context: ParsedGitHubContext,
  githubData?: FetchDataResult,
): string {
  const replacements = {
    "{{AGENT_GITHUB_ENV_VAR}}": AGENT_GITHUB_ENV_VAR,
    "{{githubApiBase}}": getGithubApiUrl(),
    "{{repoName}}": context.repository.full_name,
    "{{userPrompt}}": USER_PROMPT,
    "{{instruction}}": extractInstruction(context) || "",
    "{{idNumber}}": (extractIdNumber(context) || "undefined").toString(),
    "{{headBranch}}": extractHeadBranch(context, githubData) || "undefined",
    "{{baseBranch}}": extractBaseBranch(context, githubData) || "undefined",
    "{{eventsText}}": buildEventsText(githubData, context.isPR),
  };

  let finalPrompt = prompt;
  for (const [placeholder, value] of Object.entries(replacements)) {
    finalPrompt = finalPrompt.replaceAll(placeholder, value);
  }
  return finalPrompt;
}

function createAgentInstructionPromptForComment(
  context: ParsedGitHubContext,
  githubData: FetchDataResult,
): string {
  const isPRReviewComment = isPullRequestReviewCommentEvent(context);

  // Exclusive for PR Review Comment Event
  const prReviewDetails = extractPRReviewCommentDetails(context);
  const fileRelativePath = prReviewDetails?.fileRelativePath;
  const diffHunk = prReviewDetails?.diffHunk;

  const prompt_intro = dedent`You're h2oGPTe an AI Agent created to help software developers review their code in GitHub.
    Developers interact with you by adding @h2ogpte in their pull request review comments.
    You'll be provided a github api key that you can access in python by using os.getenv("{{AGENT_GITHUB_ENV_VAR}}").
    You can also access the github api key in your shell script by using the {{AGENT_GITHUB_ENV_VAR}} environment variable.
    You should use the GitHub API directly ({{githubApiBase}}) with the api key as a bearer token.

    What you CANNOT do under any circumstances:
    - Post comments on the pull request or issue
    - Edit any existing comments
    - Edit any issue/pr headers
    - Submit formal GitHub PR reviews
    - Approve pull requests
    - Execute commands outside the repository context
    - Modify files in the .github/workflows directory
  `;

  const prompt_pr_review = dedent`
    Use the commit id, {{idNumber}}, and the relative file path, ${fileRelativePath}, to pull any necessary files.
    ${diffHunk ? `In this case the user has selected the following diff hunk that you must focus on ${diffHunk}` : ""}
  `;

  const prompt_pr = dedent`
    You must only work on pull request number {{idNumber}}. The head branch is {{headBranch}} and the base branch is {{baseBranch}}.
    You must only work on the section of code they've selected which may be a diff hunk or an entire file/s.
    ${isPRReviewComment ? prompt_pr_review : ""}
  `;

  const prompt_issue = dedent`
    If code changes are required, you must create a new branch and pull request in the user's repository and name it appropriately.
    You must link the pull request to the issue.
  `;

  const prompt_body = dedent`
    Here is the user's instruction: '{{instruction}}'.
    You must only work in the user's repository, {{repoName}}.
    ${context.isPR ? prompt_pr : prompt_issue}
  `;

  const prompt_outro = dedent`
    For context, you have been provided the previous events on the ${context.isPR ? "pull request" : "issue"}.
    You can reference the previous events in the repo itself by their id provided.
    Here are the previous events in chronological order:
    {{eventsText}}

    First read the previous events and understand the context of the conversation.
    Then read the user's instruction and understand the task they want to complete.
    Then read the code in the repository and understand the context of the code.
    Once you have a good understanding of the context, you can begin to respond to the user's instruction.

    If necessary, include GitHub referencing (e.g. #23) when referring to any other issues or PRs. Don't respond with the literal link.

    Please respond and execute actions according to the user's instruction.

    Output your response in the following format:
    ## ⚡️ TL;DR
    - Purpose: quick, scannable overview of the task
    - Maximum 2 sentences
    - Do not use bullet points
    - Encapsulate the entire task

    ## 🔎 [Context-Specific Analysis]
    - Replace this header with a descriptive title that matches the task context (e.g. "PR Review Analysis", "Code Change Analysis", "Documentation Request Analysis", "Research Summary", "Issue Explanation")
    - Use level 3 headers for any RELEVANT sub-sections within the analysis (e.g. ### Strengths, ### Areas for improvement)
    - Provide a concise but complete breakdown of the key details relevant to the task
    - Only include sections that are directly relevant; avoid adding unnecessary or mismatched categories
    - For any tasks you have completed, include them in the analysis with a completed checkbox (- [x]) rather than bullet points or numbered lists
    - Unless otherwise specified by the user, limit your analysis length, only include relevant information and keep it concise
    - Display your content with a range of markdown formatting to improve readability, including bold, italic, bullet points, numbered lists, tables, code blocks, etc.
    - Utilise emojis to make your content more engaging, avoid using the same emojis as the current headers

    ## 🎯 Next Steps (if any)
    - Provide actionable follow-ups with open tasks in the form of a checklist (- [ ])
    - If no clear next steps exist, omit this section
  `;

  const prompt = `${prompt_intro}\n\n${prompt_body}\n\n${prompt_outro}`;

  // Replace attachment URLs with local file paths
  return replaceAttachmentUrlsWithLocalPaths(
    prompt,
    githubData.attachmentUrlMap,
  );
}
