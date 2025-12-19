/**
 * Adapted from: https://github.com/anthropics/claude-code-action/blob/main/src/github/data/fetcher.ts
 * Original author: Anthropic
 * License: MIT
 */

import * as core from "@actions/core";
import { graphql } from "@octokit/graphql";
import { execSync } from "child_process";
import type { Octokits } from "../services/github/octokits";
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
import {
  downloadCommentAttachments,
  type CommentWithAttachments,
} from "./utils/file-downloader";

type FetchDataParams = {
  octokits: Octokits;
  repository: string;
  prNumber: string;
  isPR: boolean;
  triggerUsername?: string;
  isIssueCommentPR?: boolean;
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
  attachmentUrlMap: Map<string, string>;
  triggerDisplayName?: string | null;
  branchInfo?: {
    headBranch: string;
    baseBranch: string;
  };
};

export async function fetchGitHubData({
  octokits,
  repository,
  prNumber,
  isPR,
  triggerUsername,
  isIssueCommentPR,
}: FetchDataParams): Promise<FetchDataResult> {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error("Invalid repository format. Expected 'owner/repo'.");
  }

  let contextData: GitHubPullRequest | GitHubIssue | null = null;
  let comments: GitHubComment[] = [];
  let changedFiles: GitHubFile[] = [];
  let reviewData: { nodes: GitHubReview[] } | null = null;
  let branchInfo: { headBranch: string; baseBranch: string } | undefined;

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
        branchInfo = {
          headBranch: pullRequest.headRefName,
          baseBranch: pullRequest.baseRefName,
        };

        core.info(`Successfully fetched PR #${prNumber} data`);
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

        // If this is an issue comment that's actually a PR comment, fetch PR data for branch info
        if (isIssueCommentPR) {
          try {
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
              branchInfo = {
                headBranch: pullRequest.headRefName,
                baseBranch: pullRequest.baseRefName,
              };
              core.info(
                `Successfully fetched branch info for PR #${prNumber} from issue comment`,
              );
            }
          } catch (prError) {
            core.warning(
              `Failed to fetch PR branch info for issue comment: ${prError}`,
            );
          }
        }

        core.info(`Successfully fetched issue #${prNumber} data`);
      } else {
        throw new Error(`Issue #${prNumber} not found`);
      }
    }
  } catch (error) {
    core.error(`Failed to fetch ${isPR ? "PR" : "issue"} data: ${error}`);
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
        core.warning(`Failed to compute SHA for ${file.path}: ${error}`);
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

  const urlToPathMap = await downloadCommentAttachments(
    octokits.rest,
    owner,
    repo,
    allComments,
  );

  // Fetch trigger user display name if username is provided
  let triggerDisplayName: string | null | undefined;
  if (triggerUsername) {
    triggerDisplayName = await fetchUserDisplayName(
      octokits.graphql,
      triggerUsername,
    );
  }

  return {
    contextData,
    comments,
    changedFiles,
    changedFilesWithSHA,
    reviewData,
    attachmentUrlMap: urlToPathMap,
    triggerDisplayName,
    branchInfo,
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
    core.warning(`Failed to fetch user display name for ${login}: ${error}`);
    return null;
  }
}
