import { Octokit } from "@octokit/rest";
import tmp from "tmp";
import fs from "fs/promises";
import { basename } from "path";
import path from "path";
import { getFile } from "../../services/github/api";
import core from "@actions/core";
import type { ParsedGitHubContext } from "../../services/github/types";

export async function getGuidelinesFile(
  octokit: Octokit,
  agentDocsPath: string,
  context: ParsedGitHubContext,
): Promise<string | null> {
  const maxFileSize = 50 * 1024 * 1024; // 50 MB
  core.debug(`Fetching guidelines file from ${agentDocsPath}`);
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

  if (!response.data.content) {
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

  const downloadsDir = tmp.dirSync({ unsafeCleanup: true }).name;
  const fileName = path.join(downloadsDir, basename(agentDocsPath));

  await fs.writeFile(fileName, content);
  return fileName;
}
