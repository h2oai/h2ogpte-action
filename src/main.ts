import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import type { PullRequestReviewCommentEvent } from '@octokit/webhooks-types'

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const provided_gh_token: string = core.getInput('gh_token')
    const context = github.context
    const owner = context.repo.owner
    const repo = context.repo.repo

    const rest = new Octokit({
      auth: provided_gh_token,
      baseUrl: 'https://api.github.com'
    })

    console.log("Test!")

    if (context.eventName == "pull_request_review_comment") {
      await rest.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: (context.payload as PullRequestReviewCommentEvent).pull_request.number,
        comment_id: (context.payload as PullRequestReviewCommentEvent).comment.id,
        body: "It works!"
      })
    } else {
      throw new Error(`Unexpected event: ${context.eventName}`)
    }


  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
