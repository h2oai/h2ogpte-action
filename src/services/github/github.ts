import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import { getGithubApiBase, getGithubToken } from '../../utils'
import type { ParsedGitHubContext } from './types'
import type {
    IssuesEvent,
    IssueCommentEvent,
    PullRequestEvent,
    PullRequestReviewEvent,
    PullRequestReviewCommentEvent,
} from "@octokit/webhooks-types";


export async function newOctokit(): Promise<Octokit> {
    const rest = new Octokit({
        auth: getGithubToken(),
        baseUrl: getGithubApiBase(),
        request: {
            timeout: 10000 // 10 second timeout for GitHub API requests
        }
    })
    return rest
}


/**
 * Source: https://github.com/anthropics/claude-code-action/blob/main/src/github/context.ts
 */
export function parseGitHubContext(): ParsedGitHubContext {
    const context = github.context;

    const commonFields = {
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

    switch (context.eventName) {
        case "issues": {
            return {
                ...commonFields,
                payload: context.payload as IssuesEvent,
                entityNumber: (context.payload as IssuesEvent).issue.number,
                isPR: false,
            };
        }
        case "issue_comment": {
            return {
                ...commonFields,
                payload: context.payload as IssueCommentEvent,
                entityNumber: (context.payload as IssueCommentEvent).issue.number,
                isPR: Boolean(
                    (context.payload as IssueCommentEvent).issue.pull_request,
                ),
            };
        }
        case "pull_request": {
            return {
                ...commonFields,
                payload: context.payload as PullRequestEvent,
                entityNumber: (context.payload as PullRequestEvent).pull_request.number,
                isPR: true,
            };
        }
        case "pull_request_review": {
            return {
                ...commonFields,
                payload: context.payload as PullRequestReviewEvent,
                entityNumber: (context.payload as PullRequestReviewEvent).pull_request
                    .number,
                isPR: true,
            };
        }
        case "pull_request_review_comment": {
            return {
                ...commonFields,
                payload: context.payload as PullRequestReviewCommentEvent,
                entityNumber: (context.payload as PullRequestReviewCommentEvent)
                    .pull_request.number,
                isPR: true,
            };
        }
        default:
            throw new Error(`Unsupported event type: ${context.eventName}`);
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


export async function createReplyForReviewComment(octokit: Octokit, comment_body: string, context: ParsedGitHubContext) {
    const comment = await octokit.pulls.createReplyForReviewComment({
        owner: context.repository.owner,
        repo: context.repository.repo,
        pull_number: context.entityNumber,
        comment_id: (context.payload as PullRequestReviewCommentEvent).comment
            .id,
        body: comment_body
    })
    return comment
}


export async function updateReviewComment(octokit: Octokit, comment_body: string, context: ParsedGitHubContext, initialh2ogpteCommentId: number) {
    await octokit.pulls.updateReviewComment({
        owner: context.repository.owner,
        repo: context.repository.repo,
        comment_id: initialh2ogpteCommentId,
        body: comment_body
    })
}