import type {
  IssuesEvent,
  IssueCommentEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  PullRequestReviewCommentEvent,
} from "@octokit/webhooks-types";

export type ParsedGitHubContext = {
  runId: string;
  eventName: string;
  eventAction?: string;
  repository: {
    owner: string;
    repo: string;
    full_name: string;
  };
  actor: string;
  payload?:
    | IssuesEvent
    | IssueCommentEvent
    | PullRequestEvent
    | PullRequestReviewEvent
    | PullRequestReviewCommentEvent;
  entityNumber?: number;
  isPR: boolean;
};

export type TokenResponse = {
  token: string;
  expires_at: string;
  permissions: string;
  repository_selection: string;
  authenticated_as: string;
};
