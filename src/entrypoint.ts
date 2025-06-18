import * as core from '@actions/core'
import * as h2ogpte from "./core/services/h2ogpte/h2ogpte"
import { checkWritePermissions, createSecretAndToolAssociation, extractFinalAgentResponse, getGithubToken } from './utils'
import { createAgentInstructionPrompt } from './prompts'
import { createOctokits } from './core/services/github/octokits'
import { isPullRequestReviewCommentEvent, parseGitHubContext } from './core/data/context'
import { createReplyForReviewComment, updateReviewComment } from './core/services/github/api'
import { fetchGitHubData } from './core/data/fetcher'


/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
    let keyUuid: string | null = null

    try {

        // Fetch context
        const octokits = createOctokits()
        const context = parseGitHubContext()
        const githubToken = getGithubToken()

        // Check if actor has correct permissions, otherwise exit immeditely
        const hasWritePermissions = await checkWritePermissions(
            octokits.rest,
            context,
        );
        if (!hasWritePermissions) {
            throw new Error(
                "Actor does not have write permissions to the repository",
            );
        }
        
        // Fetch Github comment data
        const githubData = await fetchGitHubData({
            octokits: octokits,
            repository: `${context.repository.owner}/${context.repository.repo}`,
            prNumber: context.entityNumber.toString(),
            isPR: context.isPR,
            triggerUsername: context.actor,
        });

        core.debug(`GH data fetch result: ${JSON.stringify(githubData, null, 2)}`)

        // Handle Github Event
        if (isPullRequestReviewCommentEvent(context)) {
            core.debug(`Full payload: ${JSON.stringify(context.payload, null, 2)}`)

            // 1. Setup the GitHub secret in h2oGPTe
            const keyUuid = await createSecretAndToolAssociation(githubToken)

            // 2. Create a Chat Session in h2oGPTe
            const chatSessionId = await h2ogpte.createChatSession()
            const chatSessionUrl = h2ogpte.getChatSessionUrl(chatSessionId.id)

            // 3. Create the initial review reply comment
            const intialCommentBody = `⏳ h2oGPTe is working on it, see the chat [here](${chatSessionUrl})`
            const h2ogpteComment = await createReplyForReviewComment(octokits.rest, intialCommentBody, context)

            // 4. Create the agent instruction prompt
            const instructionPrompt = createAgentInstructionPrompt(context)

            // 5. Query h2oGPTe for Agent completion
            const chatCompletion = await h2ogpte.requestAgentCompletion(
                chatSessionId.id,
                instructionPrompt
            )

            // 6. Extract response from agent completion
            let cleanedResponse = ''
            let header = ''
            if (chatCompletion.success) {
                header = `💡 h2oGPTe made some changes`
                cleanedResponse = extractFinalAgentResponse(chatCompletion.body)
            } else {
                header = `❌ h2oGPTe ran into some issues`
                cleanedResponse = chatCompletion.body
            }
            core.debug(`Extracted response: ${cleanedResponse}`)

            // 7. Update initial review comment
            const updatedCommentBody = `${header}, see the response below and the [full chat history](${chatSessionUrl})\n---\n${cleanedResponse}`
            await updateReviewComment(octokits.rest, updatedCommentBody, context, h2ogpteComment.data.id)

        } else {
            throw new Error(`Unexpected event: ${context.eventName}`)
        }
    } catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error) core.setFailed(error.message)
    } finally {
        // Always try to clean up the agent key
        if (keyUuid) {
            try {
                await h2ogpte.deleteAgentKey(keyUuid)
            } catch (error) {
                core.warning(
                    `Failed to clean up agent key: ${error instanceof Error ? error.message : String(error)}`
                )
            }
        }
    }
}

if (import.meta.main) {
    run();
}
