import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";
import { AGENT_GITHUB_ENV_VAR } from "./constants";
import type { ParsedGitHubContext } from "./core/services/github/types";
import { createAgentKey, createToolAssociation, getAgentKeyId } from "./core/services/h2ogpte/h2ogpte";


/**
 * Gets H2OGPTE configuration from environment variables
 */
export function getH2ogpteConfig(): { apiKey: string; apiBase: string } {
    const apiKey = process.env.H2OGPTE_API_KEY
    const apiBase = process.env.H2OGPTE_API_BASE

    if (!apiKey) {
        throw new Error('H2OGPTE_API_KEY environment variable is required')
    }
    if (!apiBase) {
        throw new Error('H2OGPTE_API_BASE environment variable is required')
    }

    return { apiKey, apiBase }
}


/**
 * Gets Github key from environment variable
 */
export function getGithubToken(): string {
    const githubToken = process.env.GITHUB_TOKEN

    if (!githubToken) {
        throw new Error('GitHub token is required')
    }

    return githubToken
}


/**
 * Gets the GitHub API url from environment variable
 */
export function getGithubApiBase(): string {
    const githubApiBase = process.env.GITHUB_API_BASE

    if (!githubApiBase) {
        throw new Error('GitHub API base url is required')
    }

    return githubApiBase
}


/**
 * Check if the actor has write permissions to the repository
 * Source: https://github.com/anthropics/claude-code-action/blob/main/src/github/validation/permissions.ts
 * @param octokit - The Octokit REST client
 * @param context - The GitHub context
 * @returns true if the actor has write permissions, false otherwise
 */
export async function checkWritePermissions(
    octokit: Octokit,
    context: ParsedGitHubContext,
): Promise<boolean> {
    const { repository, actor } = context;

    try {
        core.info(`Checking permissions for actor: ${actor}`);

        // Check permissions directly using the permission endpoint
        const response = await octokit.repos.getCollaboratorPermissionLevel({
            owner: repository.owner,
            repo: repository.repo,
            username: actor,
        });

        const permissionLevel = response.data.permission;
        core.info(`Permission level retrieved: ${permissionLevel}`);

        if (permissionLevel === "admin" || permissionLevel === "write") {
            core.info(`Actor has write access: ${permissionLevel}`);
            return true;
        } else {
            core.warning(`Actor has insufficient permissions: ${permissionLevel}`);
            return false;
        }
    } catch (error) {
        core.error(`Failed to check permissions: ${error}`);
        throw new Error(`Failed to check permissions for ${actor}: ${error}`);
    }
}


/**
 * Extracts the final agent response from the raw response
 */
export function extractFinalAgentResponse(input: string): string {
    if (!input || typeof input !== 'string') {
        return 'The agent did not return a valid response. Please check h2oGPTe.'
    }

    // Find all occurrences of "ENDOFTURN"
    const endOfTurnMatches = Array.from(input.matchAll(/ENDOFTURN/g))

    if (!endOfTurnMatches || endOfTurnMatches.length < 2) {
        // If there's less than 2 ENDOFTURN markers, return empty string
        core.debug(`Could not find any end of turn markers, returning raw agent response: '${input}'`)
        return input
    }

    // Get the position of the second-to-last ENDOFTURN
    const secondToLastMatch = endOfTurnMatches[endOfTurnMatches.length - 2]
    const lastMatch = endOfTurnMatches[endOfTurnMatches.length - 1]

    // Check that both matches exist and have valid index values
    if (!secondToLastMatch || !lastMatch ||
        secondToLastMatch.index === undefined || lastMatch.index === undefined) {
        core.debug(`h2oGPTe response is invalid: '${input}'`)
        return 'The agent did not return a complete response. Please check h2oGPTe.'
    }

    const secondToLastIndex = secondToLastMatch.index
    const lastIndex = lastMatch.index

    // Extract text between second-to-last and last ENDOFTURN
    const startPosition = secondToLastIndex + 'ENDOFTURN'.length
    const textSection = input.substring(startPosition, lastIndex)

    // Remove <stream_turn_title> tags and their content
    const cleanText = textSection.replace(
        /<stream_turn_title>.*?<\/stream_turn_title>/gs,
        ''
    )

    // Trim newlines and whitespace from the beginning and end
    return cleanText.replace(/^\n+|\n+$/g, '').trim()
}


export async function createAgentGitHubSecret(githubToken: string): Promise<string> {
    const tokenName = `gh_token-${crypto.randomUUID()}`
    return await createAgentKey(tokenName, githubToken)
}


export async function createSecretAndToolAssociation(githubToken: string): Promise<string> {
    const gitHubTokenKeyName = await createAgentGitHubSecret(githubToken)

    const keyUuid = await getAgentKeyId(
        gitHubTokenKeyName
    )

    await Promise.all([
        createToolAssociation(
            'python',
            keyUuid,
            AGENT_GITHUB_ENV_VAR
        ),
        createToolAssociation(
            'shell',
            keyUuid,
            AGENT_GITHUB_ENV_VAR
        )
    ])

    return keyUuid
}


