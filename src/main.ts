import * as core from '@actions/core'
import { Octokit } from "@octokit/rest";
import * as github from "@actions/github"
import { wait } from './wait.js'
import type {
  IssuesEvent,
  IssueCommentEvent,
  PullRequestEvent,
  PullRequestReviewEvent,
  PullRequestReviewCommentEvent,
} from "@octokit/webhooks-types";

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const ms: string = core.getInput('milliseconds')
      const context = github.context
      const owner = context.repo.owner
      const repo = context.repo.repo

      const provided_gh_token = process.env.GH_TOKEN  // REQUIRED: gh token secret before running
      const rest = new Octokit({auth: provided_gh_token, baseUrl: "https://api.github.com"})

      await rest.issues.createComment({owner, repo, issue_number: (context.payload as IssuesEvent).issue.number, body: "It works!"})


    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Waiting ${ms} milliseconds ...`)

    // Log the current timestamp, wait, then log the new timestamp
    core.debug(new Date().toTimeString())
    await wait(parseInt(ms, 10))
    core.debug(new Date().toTimeString())

    // Set outputs for other workflow steps to use
    core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
