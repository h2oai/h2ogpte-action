/**
 * Adapted from: https://github.com/anthropics/claude-code-action/blob/main/src/github/context.ts
 * Original author: Anthropic
 * License: MIT
 */

import * as github from "@actions/github";
import type { ParsedGitHubContext } from "../services/github/types";
import type {
  IssuesEvent,
  IssueCommentEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  PullRequestReviewCommentEvent,
} from "@octokit/webhooks-types";

export function parseGitHubContext(): ParsedGitHubContext {
  const context = github.context;

  // Common fields for PR and issue events
  const commonPRIssueFields = {
    runId: process.env.GITHUB_RUN_ID!,
    eventName: context.eventName,
    eventAction: context.payload.action,
    repository: {
      owner: context.repo.owner,
      repo: context.repo.repo,
      full_name: `${context.repo.owner}/${context.repo.repo}`,
    },
    actor: context.actor,
  };

  // Common fields for other events
  const commonEventFields = {
    runId: process.env.GITHUB_RUN_ID!,
    eventName: context.eventName,
    eventAction: context.payload?.action,
    repository: {
      owner: context.repo.owner,
      repo: context.repo.repo,
      full_name: `${context.repo.owner}/${context.repo.repo}`,
    },
    actor: context.actor,
  };

  switch (context.eventName) {
    case "issues": {
      return {
        ...commonPRIssueFields,
        payload: context.payload as IssuesEvent,
        entityNumber: (context.payload as IssuesEvent).issue.number,
        isPR: false,
      };
    }
    case "issue_comment": {
      return {
        ...commonPRIssueFields,
        payload: context.payload as IssueCommentEvent,
        entityNumber: (context.payload as IssueCommentEvent).issue.number,
        isPR: Boolean(
          (context.payload as IssueCommentEvent).issue.pull_request,
        ),
      };
    }
    case "pull_request": {
      return {
        ...commonPRIssueFields,
        payload: context.payload as PullRequestEvent,
        entityNumber: (context.payload as PullRequestEvent).pull_request.number,
        isPR: true,
      };
    }
    case "pull_request_review": {
      return {
        ...commonPRIssueFields,
        payload: context.payload as PullRequestReviewEvent,
        entityNumber: (context.payload as PullRequestReviewEvent).pull_request
          .number,
        isPR: true,
      };
    }
    case "pull_request_review_comment": {
      return {
        ...commonPRIssueFields,
        payload: context.payload as PullRequestReviewCommentEvent,
        entityNumber: (context.payload as PullRequestReviewCommentEvent)
          .pull_request.number,
        isPR: true,
      };
    }
    default:
      return {
        ...commonEventFields,
        isPR: false,
      };
  }
}

export function isIssuesEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: IssuesEvent } {
  return context.eventName === "issues";
}

export function isIssueCommentEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: IssueCommentEvent } {
  return context.eventName === "issue_comment";
}

export function isPullRequestEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestEvent } {
  return context.eventName === "pull_request";
}

export function isPullRequestReviewEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewEvent } {
  return context.eventName === "pull_request_review";
}

export function isPullRequestReviewCommentEvent(
  context: ParsedGitHubContext,
): context is ParsedGitHubContext & { payload: PullRequestReviewCommentEvent } {
  return context.eventName === "pull_request_review_comment";
}

export function isPRIssueEvent(context: ParsedGitHubContext): boolean {
  return (
    isIssuesEvent(context) ||
    isIssueCommentEvent(context) ||
    isPullRequestEvent(context) ||
    isPullRequestReviewEvent(context) ||
    isPullRequestReviewCommentEvent(context)
  );
}
