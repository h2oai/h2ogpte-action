import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import type { PullRequestReviewCommentEvent } from '@octokit/webhooks-types'
import { dedent } from 'ts-dedent'

/**
 * Creates agent keys with retry mechanism
 */
async function createAgentKeys(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,
  provided_gh_token: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<string> {
  const token_name = `gh_token-${crypto.randomUUID()}`
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${h2ogpte_api_key}`
    },
    body: JSON.stringify({
      name: token_name,
      type: 'private',
      value: provided_gh_token,
      description: 'Delete me'
    })
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.debug(`Attempt ${attempt}/${maxRetries} to create agent key`)
      const response = await fetch(
        `${h2ogpte_api_base}/api/v1/agents/keys`,
        options
      )

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Failed to read error response')
        throw new Error(
          `HTTP error! {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`
        )
      }

      const data = await response.json()
      core.debug(
        `Successfully created agent keys and got response: ${JSON.stringify(data, null, 2)}`
      )
      return token_name
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      core.warning(
        `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
      )

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        core.debug(`Retrying after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // If we've exhausted all retries
  core.setFailed(
    `Failed to create agent key after ${maxRetries} attempts: ${lastError?.message}`
  )
  throw lastError
}

interface AgentKey {
  created_at: string
  description: string
  id: string
  name: string
  owner_email: string
  type: string
  updated_at: string
}

type AgentKeys = Array<AgentKey>

/**
 * Gets agent key ID with retry mechanism
 */
async function getAgentKeyID(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,
  key_name: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<string> {
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${h2ogpte_api_key}`
    }
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.debug(`Attempt ${attempt}/${maxRetries} to get agent key ID`)
      const response = await fetch(
        `${h2ogpte_api_base}/api/v1/agents/keys`,
        options
      )

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Failed to read error response')
        throw new Error(
          `HTTP error! {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`
        )
      }

      const data = (await response.json()) as AgentKeys
      core.debug(
        `Successfully retrieved agent keys and got response: ${JSON.stringify(data, null, 2)}`
      )

      // Search for agent key
      const key_id = data.find((k) => k.name === key_name)
      if (key_id === undefined) {
        throw new Error(
          `Could not find ${key_name} in the list of keys. Check debug logs.`
        )
      }

      core.debug(`Retrieved agent key uuid: ${key_id.id}`)

      return key_id.id
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      core.warning(
        `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
      )

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        core.debug(`Retrying after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // If we've exhausted all retries
  core.setFailed(
    `Failed to get agent key ID after ${maxRetries} attempts: ${lastError?.message}`
  )
  throw lastError
}

interface ToolAssociation {
  associate_id: string
  key_id: string
  name: string
  user_id: string
}

interface ToolAssociations {
  keys: Array<ToolAssociation>
  tool: string
}

/**
 * Creates tool association with retry mechanism
 */
async function createToolAssociation(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,
  tool_name: string,
  key_id: string,
  environment_variable_name: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<ToolAssociations> {
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${h2ogpte_api_key}`
    },
    body: JSON.stringify({
      tool: tool_name,
      keys: [{ name: environment_variable_name, key_id: key_id }]
    })
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.debug(`Attempt ${attempt}/${maxRetries} to create tool association`)
      const response = await fetch(
        `${h2ogpte_api_base}/api/v1/agents/tool_association`,
        options
      )

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Failed to read error response')
        throw new Error(
          `HTTP error! {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`
        )
      }

      const data = (await response.json()) as ToolAssociations
      core.debug(
        `Successfully created tool association and got response: ${JSON.stringify(data, null, 2)}`
      )

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      core.warning(
        `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
      )

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        core.debug(`Retrying after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // If we've exhausted all retries
  core.setFailed(
    `Failed to create tool association after ${maxRetries} attempts: ${lastError?.message}`
  )
  throw lastError
}

interface ChatSession {
  id: string
  updated_at: string
}

/**
 * Creates chat session with retry mechanism
 */
async function createChatSession(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<ChatSession> {
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${h2ogpte_api_key}`
    }
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.debug(`Attempt ${attempt}/${maxRetries} to create chat session`)
      const response = await fetch(`${h2ogpte_api_base}/api/v1/chats`, options)

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => 'Failed to read error response')
        throw new Error(
          `HTTP error! {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`
        )
      }

      const data = (await response.json()) as ChatSession
      core.debug(
        `Successfully created chat session and got response: ${JSON.stringify(data, null, 2)}`
      )

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      core.warning(
        `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
      )

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1)
        core.debug(`Retrying after ${delay}ms`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  // If we've exhausted all retries
  core.setFailed(
    `Failed to create chat session after ${maxRetries} attempts: ${lastError?.message}`
  )
  throw lastError
}

interface ChatResponse {
  success: boolean
  body: string
}

interface h2oRawResponse {
  body: string
}

/**
 * Requests agent completion with improved error handling and timeout management
 */
async function requestAgentCompletion(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,
  session_id: string,
  prompt: string,
  system_prompt?: string,
  timeoutMinutes: number = 30
): Promise<ChatResponse> {
  const agent_completion_config = {
    message: prompt,
    llm_args: { use_agent: true },
    tags: ['github_action_trigger'],
    ...(system_prompt && { system_prompt: system_prompt })
  }

  core.debug(
    `Agent completion config: ${JSON.stringify(agent_completion_config)}`
  )

  const controller = new AbortController()
  const timeoutMs = timeoutMinutes * 60 * 1000
  const timeoutId = setTimeout(() => {
    controller.abort()
    core.warning(`Request timed out after ${timeoutMinutes} minutes`)
  }, timeoutMs)

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${h2ogpte_api_key}`
    },
    body: JSON.stringify(agent_completion_config),
    signal: controller.signal
  }

  try {
    const response = await fetch(
      `${h2ogpte_api_base}/api/v1/chats/${session_id}/completions`,
      options
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'Failed to read error response')
      throw new Error(
        `HTTP error! {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`
      )
    }

    const data = (await response.json()) as h2oRawResponse

    if (!data || !data.body) {
      throw new Error('Received empty or invalid response from h2oGPTe API')
    }

    core.debug(
      `Successfully received chat completion and got response: ${JSON.stringify(data, null, 2)}`
    )

    return { success: true, body: data.body }
  } catch (error) {
    clearTimeout(timeoutId)

    // Handle AbortError specifically
    if (error instanceof DOMException && error.name === 'AbortError') {
      const error_msg = `Request to h2oGPTe was aborted after ${timeoutMinutes} minutes timeout`
      core.error(error_msg)
      return { success: false, body: error_msg }
    }

    if (error instanceof Error) {
      const error_msg = `Failed to receive completion from h2oGPTe with error: ${error.message}`
      core.error(error_msg)
      return { success: false, body: error_msg }
    }

    return {
      success: false,
      body: 'Failed to receive completion from h2oGPTe with unknown error'
    }
  }
}

/**
 * Extracts the final agent response from the raw response
 */
function extractFinalAgentRessponse(input: string): string {
  if (!input || typeof input !== 'string') {
    return 'The agent did not return a valid response. Please check h2oGPTe.'
  }

  // Find all occurrences of "ENDOFTURN"
  const endOfTurnMatches = Array.from(input.matchAll(/ENDOFTURN/g))

  if (endOfTurnMatches.length < 2) {
    // If there's less than 2 ENDOFTURN markers, return empty string
    return 'The agent did not return a complete response. Please check h2oGPTe.'
  }

  // Get the position of the second-to-last ENDOFTURN
  const secondToLastIndex = endOfTurnMatches[endOfTurnMatches.length - 2].index!
  const lastIndex = endOfTurnMatches[endOfTurnMatches.length - 1].index!

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

/**
 * Safely deletes an agent key
 */
async function deleteAgentKey(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,
  key_id: string
): Promise<boolean> {
  try {
    const options = {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${h2ogpte_api_key}`
      }
    }

    const response = await fetch(
      `${h2ogpte_api_base}/api/v1/agents/keys/${key_id}`,
      options
    )

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'Failed to read error response')
      core.warning(
        `Failed to delete agent key: {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`
      )
      return false
    }

    core.debug(`Successfully deleted agent key: ${key_id}`)
    return true
  } catch (error) {
    core.warning(
      `Error deleting agent key: ${error instanceof Error ? error.message : String(error)}`
    )
    return false
  }
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  let key_uuid: string | null = null

  try {
    const provided_gh_token: string = core.getInput('gh_token')
    const h2ogpte_api_key: string = core.getInput('h2ogpte_api_key')
    const h2ogpte_api_base: string = core.getInput('h2ogpte_api_base')
    const context = github.context
    const owner = context.repo.owner
    const repo = context.repo.repo

    // Validate required inputs
    if (!provided_gh_token) {
      throw new Error('GitHub token is required')
    }

    if (!h2ogpte_api_key) {
      throw new Error('h2oGPTe API key is required')
    }

    if (!h2ogpte_api_base) {
      throw new Error('h2oGPTe API base URL is required')
    }

    const rest = new Octokit({
      auth: provided_gh_token,
      baseUrl: 'https://api.github.com',
      request: {
        timeout: 10000 // 10 second timeout for GitHub API requests
      }
    })

    if (context.eventName == 'pull_request_review_comment') {
      core.debug(`Full payload: ${JSON.stringify(context.payload, null, 2)}`)

      // Validate payload
      if (!context.payload.pull_request) {
        throw new Error('Pull request data is missing from the event payload')
      }

      if (!context.payload.comment) {
        throw new Error('Comment data is missing from the event payload')
      }

      // Repository data
      const repository = {
        full_name: `${context.repo.owner}/${context.repo.repo}`
      }

      // Pull request data
      const pullRequest = {
        number: (context.payload as PullRequestReviewCommentEvent).pull_request
          .number
      }

      // Comment data
      const comment = {
        body: (context.payload as PullRequestReviewCommentEvent).comment.body,
        diff_hunk: (context.payload as PullRequestReviewCommentEvent).comment
          .diff_hunk,
        commit_id: (context.payload as PullRequestReviewCommentEvent).comment
          .commit_id,
        file_relative_path: (context.payload as PullRequestReviewCommentEvent)
          .comment.path
      }

      // H2OGPTE Secrets setup
      const AGENT_GITHUB_ENV_VAR = 'GITHUB_PAT_TMP'

      // ** AGENT KEY SHOULD ALWAYS BE DELETED ** //
      try {
        const key_name = await createAgentKeys(
          h2ogpte_api_key,
          h2ogpte_api_base,
          provided_gh_token
        )
        key_uuid = await getAgentKeyID(
          h2ogpte_api_key,
          h2ogpte_api_base,
          key_name
        )
        await Promise.all([
          createToolAssociation(
            h2ogpte_api_key,
            h2ogpte_api_base,
            'python',
            key_uuid,
            AGENT_GITHUB_ENV_VAR
          ),
          createToolAssociation(
            h2ogpte_api_key,
            h2ogpte_api_base,
            'shell',
            key_uuid,
            AGENT_GITHUB_ENV_VAR
          )
        ])
      } catch (error) {
        throw new Error(
          `Failed to set up agent keys and tool associations: ${error instanceof Error ? error.message : String(error)}`
        )
      }
      // *********************************** //

      // h2oGPTe API Calls
      let chat_session_id
      try {
        chat_session_id = await createChatSession(
          h2ogpte_api_key,
          h2ogpte_api_base
        )
      } catch (error) {
        throw new Error(
          `Failed to create chat session: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      const chat_session_url = `${h2ogpte_api_base}/chats/${chat_session_id.id}`

      let h2ogpte_comment
      try {
        h2ogpte_comment = await rest.pulls.createReplyForReviewComment({
          owner,
          repo,
          pull_number: pullRequest.number,
          comment_id: (context.payload as PullRequestReviewCommentEvent).comment
            .id,
          body: `⏳ h2oGPTe is working on it, see the chat [here](${chat_session_url})`
        })
      } catch (error) {
        throw new Error(
          `Failed to create initial comment: ${error instanceof Error ? error.message : String(error)}`
        )
      }

      const instruction_prompt = dedent`You're h2oGPTe an AI Agent created to help software developers review their code in GitHub. 
      Developers interact with you by adding @h2ogpte in their pull request review comments. 
      You'll be provided a github api key that you can access in python by using os.getenv("${AGENT_GITHUB_ENV_VAR}").
      You can also access the github api key in your shell script by using the ${AGENT_GITHUB_ENV_VAR} environment variable.
      You should use the GitHub API directly (https://api.github.com) with the api key as a bearer token.
      You should only ever respond to the users query by reading code and creating commits (if required) on the branch of the pull request.
      Don't create any comments on the pull request yourself.
      
      Here is the user's instruction: '${comment.body}'.
      You must only work in the user's repository, ${repository.full_name}, on pull request number ${pullRequest.number}.
      You must only work on the section of code they've selected which may be a diff hunk or an entire file/s. 
      Use the commit id, ${comment.commit_id}, and the relative file path, ${comment.file_relative_path}, to pull any necessary files.
      ${comment.diff_hunk ? `In this case the user has selected the following diff hunk that you must focus on ${comment.diff_hunk}` : ''}

      Please respond and execute actions according to the user's instruction.
      `

      // Get agent completion
      const chat_completion = await requestAgentCompletion(
        h2ogpte_api_key,
        h2ogpte_api_base,
        chat_session_id.id,
        instruction_prompt
      )

      // Extract response
      let cleaned_response = ''
      let header = ''
      if (chat_completion.success) {
        header = `💡 h2oGPTe made some changes`
        cleaned_response = extractFinalAgentRessponse(chat_completion.body)
      } else {
        header = `❌ h2oGPTe ran into some issues`
        cleaned_response = chat_completion.body
      }
      core.debug(`Extracted response: ${cleaned_response}`)

      // Update initial comment
      try {
        const body = `${header}, see the response below and the full chat history [here](${chat_session_url})\n---\n${cleaned_response}`
        await rest.pulls.updateReviewComment({
          owner,
          repo,
          comment_id: h2ogpte_comment.data.id,
          body
        })
      } catch (error) {
        core.warning(
          `Failed to update comment, but main task completed: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    } else {
      throw new Error(`Unexpected event: ${context.eventName}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  } finally {
    // Always try to clean up the agent key
    if (key_uuid) {
      try {
        const h2ogpte_api_key: string = core.getInput('h2ogpte_api_key')
        const h2ogpte_api_base: string = core.getInput('h2ogpte_api_base')
        await deleteAgentKey(h2ogpte_api_key, h2ogpte_api_base, key_uuid)
      } catch (error) {
        core.warning(
          `Failed to clean up agent key: ${error instanceof Error ? error.message : String(error)}`
        )
      }
    }
  }
}
