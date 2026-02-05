import dedent from "ts-dedent";
import {
  isPRIssueEvent,
  isPullRequestReviewCommentEvent,
} from "../data/context";
import type { FetchDataResult } from "../data/fetcher";
import {
  getGithubMcpAllowedTools,
  getGithubMcpAllowedToolsets,
} from "../services/github/copilot-mcp";
import type { ParsedGitHubContext } from "../services/github/types";
import { buildEventsText } from "./utils/formatter";
import {
  extractBaseBranch,
  extractHeadBranch,
  extractIdNumber,
  extractInstruction,
  extractPRReviewCommentDetails,
  isInstructionEmpty,
} from "./utils/instruction";
import { getSlashCommandsPrompt } from "./utils/slash-commands";
import { replaceAttachmentUrlsWithLocalPaths } from "./utils/url-replace";

const USER_PROMPT = process.env.PROMPT || "";

function getGithubMcpToolsAndToolsetsSection(): string {
  const toolsStr = getGithubMcpAllowedTools();
  const toolsetsStr = getGithubMcpAllowedToolsets();
  const tools = toolsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const toolsets = toolsetsStr
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const toolsDisplay =
    toolsStr === "" || tools.length === 0 ? "none" : tools.join(", ");
  const toolsetsDisplay =
    toolsetsStr === "" || toolsets.length === 0 ? "none" : toolsets.join(", ");
  return dedent`
    Available tools: ${toolsDisplay}
    Available toolsets: ${toolsetsDisplay}
  `;
}

function getMcpInstructions(): string {
  return dedent`
    You have access to the GitHub Model Context Protocol (MCP) server through h2oGPTe's tool runner. The GitHub MCP custom tool is already configured and available for you to use. It provides standardized tools for interacting with GitHub repositories, issues, pull requests, Actions, security features, and more. The MCP server handles authentication automatically and provides a reliable and secure way to perform GitHub operations.

    ${getGithubMcpToolsAndToolsetsSection()}

    The list of custom tools (including the GitHub tool) is provided in your system prompt. Use the GitHub tool name from that list (it is often suffixed with an ID, e.g. github_d007527f).

    Optionally, to discover the tool name at runtime:
    \`\`\`python
    from api_server.agent_tools.claude_tool_runner import claude_tool_runner
    tools_dict = claude_tool_runner(action="list")
    github_tool = [t["name"] for t in tools_dict.get("available_tools", []) if t.get("name", "").startswith("github")][0]
    \`\`\`

    IMPORTANT:
    - You must use the GitHub MCP custom tool through h2oGPTe's tool runner for all GitHub operations. The tool is already configured and ready to use.
    - The claude_tool_runner is a sub-agent that executes specific GitHub MCP operations. You should provide it with very specific, granular tasks rather than broad or vague instructions.
    - To launch MCP tools, use the claude_tool_runner from api_server.agent_tools.claude_tool_runner. This is the designated way to execute GitHub MCP tools - do NOT attempt to create your own MCP client or wrapper code.
    - When retrieving file contents, instruct the tool runner to write contents to the workspace and return the path rather than returning them inline.
    - For commits: small changes can be passed directly to claude_tool_runner; for large commits or new files, write the content to a file first, then instruct claude_tool_runner to commit the changes from that file.
    - Example usage - provide specific, granular tasks. Use the GitHub tool name from the custom tools list in your system prompt:
    \`\`\`python
    from api_server.agent_tools.claude_tool_runner import claude_tool_runner

    # github_tool is the name from the custom tools list in your system prompt (e.g. github_d007527f)

    # Example 1: Write a specific file's contents to the workspace and return the path
    claude_tool_runner(
        query="Write the contents of src/utils/helper.ts from the main branch to the workspace and return the path",
        tools=[github_tool]
    )

    # Example 2: Small commit - pass content directly
    claude_tool_runner(
        query="Update the file src/config/settings.json on branch feature/add-logging with the following content: {'debug': true, 'logLevel': 'info'}",
        tools=[github_tool]
    )

    # Example 3: Large commit or new file - write to file first, then commit from file
    # Step 1: Write your changes to a local file (e.g. patch.txt or new-feature.ts)
    # Step 2: Instruct claude_tool_runner to commit from that file
    claude_tool_runner(
        query="Commit the changes from patch.txt to the repository on branch feature/add-logging",
        tools=[github_tool]
    )

    # Example 4: Search for specific code patterns
    claude_tool_runner(
        query="Search for all occurrences of 'useState' in TypeScript files (.ts, .tsx) in the src directory",
        tools=[github_tool]
    )

    # Example 5: Create a pull request with specific details
    claude_tool_runner(
        query="Create a pull request from branch feature/fix-bug-123 to main branch with title 'Fix authentication bug' and description 'Resolves issue #123 by updating token validation logic'",
        tools=[github_tool]
    )

    # Example 6: Write multiple files to the workspace and return the paths
    claude_tool_runner(
        query="Write the contents of package.json and tsconfig.json from the main branch to the workspace and return the paths",
        tools=[github_tool]
    )
    \`\`\`
    - Break down complex operations into multiple specific sub-agent calls. Each call should target a single, well-defined task.
    - Do NOT attempt to create your own MCP client in Python or any other language.
    - Do NOT make direct API calls or use Python/shell scripts to interact with GitHub (except for using claude_tool_runner to execute MCP tools).
    - If the MCP server encounters a fatal error, exit with an appropriate error message. For errors related to incorrect parameters or tool usage, handle them gracefully and provide helpful feedback.
  `;
}

function getPromptWrapper(): string {
  return dedent`
You're h2oGPTe an AI Agent created to help software developers review their code in GitHub.
This event is triggered automatically when a pull request is created/synchronized.

${getMcpInstructions()}

You must only work in the user's repository, {{repoName}}.

{{userPrompt}}

Respond and execute actions according to the user's instruction.
`;
}

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
    prompt = getPromptWrapper();
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
  let finalPrompt = prompt;

  if (USER_PROMPT) {
    finalPrompt = finalPrompt.replace("{{userPrompt}}", USER_PROMPT);
  }

  const instruction = extractInstruction(context) || "";
  const isEmpty = isInstructionEmpty(instruction);

  const emptyInstructionGuidance = isEmpty
    ? dedent`
      IMPORTANT: The user has only tagged @h2ogpte without providing any specific instruction. In this case, you should:
      - Leave a polite comment explaining that you're ready to help but need more information
      - Ask the user what they would like you to do
      - DO NOT make any code changes, create branches, or open PRs in the repository
      - DO NOT analyze code from the repository
    `
    : "";

  const codeAnalysisGuidance = isEmpty
    ? ""
    : "Then read the code in the repository and understand the context of the code.";

  const replacements = {
    "{{repoName}}": context.repository.full_name,
    "{{instruction}}": instruction,
    "{{idNumber}}": (extractIdNumber(context) || "undefined").toString(),
    "{{headBranch}}": extractHeadBranch(context, githubData) || "undefined",
    "{{baseBranch}}": extractBaseBranch(context, githubData) || "undefined",
    "{{eventsText}}": buildEventsText(githubData, context.isPR),
    "{{emptyInstructionGuidance}}": emptyInstructionGuidance,
    "{{codeAnalysisGuidance}}": codeAnalysisGuidance,
    "{{slashCommands}}": getSlashCommandsPrompt(instruction),
  };

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

    ${getMcpInstructions()}

    What you CANNOT do under any circumstances:
    - Post comments on the pull request or issue
    - Edit any existing comments
    - Edit any issue/pr headers
    - Submit formal GitHub PR reviews
    - Approve pull requests
    - Execute commands outside the repository context
    - Modify files in the .github/workflows directory

    CRITICAL: DO NOT make any changes to the repository (including creating branches, PRs, or modifying files) unless the user's instruction explicitly requests it using action words like 'add', 'create', 'make changes', 'open pr', 'fix', 'update', 'implement', 'refactor', 'modify', 'change', etc. If the user's instruction is empty or only contains the @h2ogpte tag without any specific task, you should politely inform them that there is nothing to do and ask how you can help.
  `;

  const prompt_pr_review = dedent`
    Use the commit id, {{idNumber}}, and the relative file path, ${fileRelativePath}, to write any necessary file contents to local files using the GitHub MCP.
    ${diffHunk ? `In this case the user has selected the following diff hunk that you must focus on ${diffHunk}` : ""}
  `;

  const prompt_pr = dedent`
    You must only work on pull request number {{idNumber}}. The head branch is "{{headBranch}}" and the base branch is "{{baseBranch}}".
    You must only work on the section of code they've selected which may be a diff hunk or an entire file/s.
    Ensure you search for the relevant files in the head branch using the GitHub MCP server's search_code or get_file_contents tools, as they may not exist in the base branch if files were added in the PR.
    ${isPRReviewComment ? prompt_pr_review : ""}
  `;

  const prompt_issue = dedent`
    If code changes are required, you must create a new branch and pull request in the user's repository using the GitHub MCP server's create_pull_request tool and name it appropriately.
    You must link the pull request to the issue.
  `;

  const prompt_body = dedent`
    <user_instruction>
    {{instruction}}
    </user_instruction>

    {{slashCommands}}

    {{emptyInstructionGuidance}}

    You must only work in the user's repository, {{repoName}}.
    ${context.isPR ? prompt_pr : prompt_issue}
  `;

  const prompt_outro = dedent`
    For context, you have been provided the previous events on the ${context.isPR ? "pull request" : "issue"}.
    You can reference the previous events in the repo itself by their id provided.
    Here are the previous events in chronological order:
    {{eventsText}}

    First read the previous events and understand the context of the conversation.
    Then read the user's instruction (within the <user_instruction> tags) and understand the task they want to complete.
    {{codeAnalysisGuidance}}
    Once you have a good understanding of the context, use the GitHub MCP server tools to interact with the repository and begin responding to the user's instruction.

    If necessary, reference GitHub issues or PRs using the # symbol followed by their number (e.g., #42, #123). Don't respond with the literal link.

    Please respond and execute actions according to the user's instruction. Remember: only make changes to the repository if the user explicitly requests it with clear action words.

    Format your response using GitHub Flavored Markdown with clean spacing. Keep one blank line between all block elements (headings, paragraphs, lists, tables, code blocks, etc.).

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
