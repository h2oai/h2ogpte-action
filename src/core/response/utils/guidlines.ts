import { Octokit } from "@octokit/rest";
import { getFile } from "../../services/github/api";
import core from "@actions/core";
import type { ParsedGitHubContext } from "../../services/github/types";

export async function getGuidelinesFile(
  octokit: Octokit,
  agentDocsPath: string,
  context: ParsedGitHubContext,
): Promise<string> {
  const maxFileSize = 50 * 1024 * 1024; // 50 MB
  core.debug(`Fetching guidelines file from ${agentDocsPath}`);
  core.debug(
    `Owner: ${context.repository.owner}, Repo: ${context.repository.repo}`,
  );
  const response = await getFile(
    octokit,
    agentDocsPath,
    context.repository.owner,
    context.repository.repo,
  );
  if (Array.isArray(response.data)) {
    throw new Error(
      `Expected a single file but got a directory listing for path '${agentDocsPath}'`,
    );
  }

  if (response.data.type !== "file") {
    throw new Error(
      `Expected a file but got type '${response.data.type}' for path '${agentDocsPath}'`,
    );
  }

  if (!(response.data.content == "") && !response.data.content) {
    throw new Error(
      `File content not found in response for path '${agentDocsPath}'`,
    );
  }

  if (response.data.size > maxFileSize) {
    throw new Error(
      `File size exceeds maximum limit of ${maxFileSize} bytes for path '${agentDocsPath}'`,
    );
  }

  const content = Buffer.from(response.data.content, "base64").toString(
    "utf-8",
  );

  return content;
}
