/**
 * Adapted from: https://github.com/anthropics/claude-code-action/blob/main/src/github/data/fetcher.ts
 * Original author: Anthropic
 * License: MIT
 */

import { graphql } from "@octokit/graphql";
import { execSync } from "child_process";
import { ISSUE_QUERY, PR_QUERY, USER_QUERY } from "./queries/github";
import type {
  GitHubComment,
  GitHubFile,
  GitHubIssue,
  GitHubPullRequest,
  GitHubReview,
  IssueQueryResponse,
  PullRequestQueryResponse,
} from "./queries/types";
import type { Octokits } from "../services/github/octokits";
import { downloadCommentAttachments, type CommentWithAttachments } from "./utils/file-downloader";

type FetchDataParams = {
  octokits: Octokits;
  repository: string;
  prNumber: string;
  isPR: boolean;
  triggerUsername?: string;
};

export type GitHubFileWithSHA = GitHubFile & {
  sha: string;
};

export type FetchDataResult = {
  contextData: GitHubPullRequest | GitHubIssue;
  comments: GitHubComment[];
  changedFiles: GitHubFile[];
  changedFilesWithSHA: GitHubFileWithSHA[];
  reviewData: { nodes: GitHubReview[] } | null;
  imageUrlMap: Map<string, string>;
  triggerDisplayName?: string | null;
};

export async function fetchGitHubData({
  octokits,
  repository,
  prNumber,
  isPR,
  triggerUsername,
}: FetchDataParams): Promise<FetchDataResult> {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'.");
  }

  let contextData: GitHubPullRequest | GitHubIssue | null = null;
  let comments: GitHubComment[] = [];
  let changedFiles: GitHubFile[] = [];
  let reviewData: { nodes: GitHubReview[] } | null = null;

  try {
    if (isPR) {
      // Fetch PR data with all comments and file information
      const prResult = await octokits.graphql<PullRequestQueryResponse>(
        PR_QUERY,
        {
          owner,
          repo,
          number: parseInt(prNumber),
        },
      );

      if (prResult.repository.pullRequest) {
        const pullRequest = prResult.repository.pullRequest;
        contextData = pullRequest;
        changedFiles = pullRequest.files.nodes || [];
        comments = pullRequest.comments?.nodes || [];
        reviewData = pullRequest.reviews || [];

        console.log(`Successfully fetched PR #${prNumber} data`);
      } else {
        throw new Error(`PR #${prNumber} not found`);
      }
    } else {
      // Fetch issue data
      const issueResult = await octokits.graphql<IssueQueryResponse>(
        ISSUE_QUERY,
        {
          owner,
          repo,
          number: parseInt(prNumber),
        },
      );

      if (issueResult.repository.issue) {
        contextData = issueResult.repository.issue;
        comments = contextData?.comments?.nodes || [];

        console.log(`Successfully fetched issue #${prNumber} data`);
      } else {
        throw new Error(`Issue #${prNumber} not found`);
      }
    }
  } catch (error) {
    console.error(`Failed to fetch ${isPR ? "PR" : "issue"} data:`, error);
    throw new Error(`Failed to fetch ${isPR ? "PR" : "issue"} data`);
  }

  // Compute SHAs for changed files
  let changedFilesWithSHA: GitHubFileWithSHA[] = [];
  if (isPR && changedFiles.length > 0) {
    changedFilesWithSHA = changedFiles.map((file) => {
      // Don't compute SHA for deleted files
      if (file.changeType === "DELETED") {
        return {
          ...file,
          sha: "deleted",
        };
      }

      try {
        // Use git hash-object to compute the SHA for the current file content
        const sha = execSync(`git hash-object "${file.path}"`, {
          encoding: "utf-8",
        }).trim();
        return {
          ...file,
          sha,
        };
      } catch (error) {
        console.warn(`Failed to compute SHA for ${file.path}:`, error);
        // Return original file without SHA if computation fails
        return {
          ...file,
          sha: "unknown",
        };
      }
    });
  }

  // Prepare all comments for image processing
  const issueComments: CommentWithAttachments[] = comments
    .filter((c) => c.body)
    .map((c) => ({
      type: "issue_comment" as const,
      id: c.databaseId,
      body: c.body,
    }));

  const reviewBodies: CommentWithAttachments[] =
    reviewData?.nodes
      ?.filter((r) => r.body)
      .map((r) => ({
        type: "review_body" as const,
        id: r.databaseId,
        pullNumber: prNumber,
        body: r.body,
      })) ?? [];

  const reviewComments: CommentWithAttachments[] =
    reviewData?.nodes
      ?.flatMap((r) => r.comments?.nodes ?? [])
      .filter((c) => c.body)
      .map((c) => ({
        type: "review_comment" as const,
        id: c.databaseId,
        body: c.body,
      })) ?? [];

  // Add the main issue/PR body if it has content
  const mainBody: CommentWithAttachments[] = contextData.body
    ? [
      {
        ...(isPR
          ? {
            type: "pr_body" as const,
            pullNumber: prNumber,
            body: contextData.body,
          }
          : {
            type: "issue_body" as const,
            issueNumber: prNumber,
            body: contextData.body,
          }),
      },
    ]
    : [];

  const allComments = [
    ...mainBody,
    ...issueComments,
    ...reviewBodies,
    ...reviewComments,
  ];

  const DownloadResult = await downloadCommentAttachments(
    octokits.rest,
    owner,
    repo,
    allComments,
  );

  console.log(`Downloaded path errors: ${JSON.stringify(DownloadResult.errors)}`)
  console.log(`Downloaded path informtion: ${JSON.stringify(DownloadResult.downloadedFiles)}`)
  console.log(`Outer path to url map size: ${DownloadResult.urlToPathMap.size}`);
  console.log(`Outer path to url map contents:`, Object.fromEntries(DownloadResult.urlToPathMap));

  // Fetch trigger user display name if username is provided
  let triggerDisplayName: string | null | undefined;
  if (triggerUsername) {
    triggerDisplayName = await fetchUserDisplayName(octokits.graphql, triggerUsername);
  }

  return {
    contextData,
    comments,
    changedFiles,
    changedFilesWithSHA,
    reviewData,
    imageUrlMap: DownloadResult.urlToPathMap,
    triggerDisplayName,
  };
}

export type UserQueryResponse = {
  user: {
    name: string | null;
  };
};

export async function fetchUserDisplayName(
  graph: typeof graphql,
  login: string,
): Promise<string | null> {
  try {
    const result = await graph<UserQueryResponse>(USER_QUERY, {
      login,
    });
    return result.user.name;
  } catch (error) {
    console.warn(`Failed to fetch user display name for ${login}:`, error);
    return null;
  }
}