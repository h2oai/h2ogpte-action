import { Octokit } from '@octokit/rest'
import type { ParsedGitHubContext } from './types'
import type {
    PullRequestReviewCommentEvent,
} from "@octokit/webhooks-types";


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