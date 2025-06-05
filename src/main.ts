import * as core from '@actions/core'
import { Octokit } from '@octokit/rest'
import * as github from '@actions/github'
import type { PullRequestReviewCommentEvent } from '@octokit/webhooks-types'

async function createAgentKeys(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,

  provided_gh_token: string
): Promise<string> {
  const token_name = `gh_token-${crypto.randomUUID()}`
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${h2ogpte_api_key}`
    },
    body: `{"name":"${token_name}","type":"private","value":"${provided_gh_token}","description":"Delete me"}`
  }
  try {
    const response = await fetch(
      `${h2ogpte_api_base}/api/v1/agents/keys`,
      options
    )

    if (!response.ok) {
      throw new Error(
        `HTTP error! {status: ${response.status}, msg: ${response.statusText}}`
      )
    }

    const data = await response.json()
    core.debug(
      `Successfully created agent keys and got response: ${JSON.stringify(data, null, 2)}`
    )
    return token_name
  } catch (error) {
    if (error instanceof Error)
      core.setFailed(`Failed to create agent key with error: ${error.message}`)
    throw error
  }
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

async function getAgentKeyID(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,

  key_name: string
): Promise<string> {
  const options = {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${h2ogpte_api_key}`
    }
  }
  try {
    const response = await fetch(
      `${h2ogpte_api_base}/api/v1/agents/keys`,
      options
    )

    if (!response.ok) {
      throw new Error(
        `HTTP error! {status: ${response.status}, msg: ${response.statusText}}`
      )
    }

    const data = (await response.json()) as AgentKeys
    core.debug(
      `Successfully retrieved agent keys and got response: ${JSON.stringify(data, null, 2)}`
    )

    // Search for agent key
    const key_id = data.find((k) => k.name == key_name)
    if (key_id == undefined) {
      throw new Error(
        `Could not find ${key_name} in the list of keys. Check debug logs.`
      )
    }

    core.debug(`Retrieved agent key uuid: ${key_id.id}`)

    return key_id.id
  } catch (error) {
    if (error instanceof Error)
      core.setFailed(`Failed to get agent key with error: ${error.message}`)
    throw error
  }
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

async function createToolAssociation(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,

  tool_name: string,
  key_id: string,
  environment_variable_name: string
): Promise<ToolAssociations> {
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${h2ogpte_api_key}`
    },
    body: `{"tool":"${tool_name}","keys":[{"name":"${environment_variable_name}","key_id":"${key_id}"}]}`
  }
  try {
    const response = await fetch(
      `${h2ogpte_api_base}/api/v1/agents/tool_association`,
      options
    )

    if (!response.ok) {
      throw new Error(
        `HTTP error! {status: ${response.status}, msg: ${response.statusText}}`
      )
    }

    const data = (await response.json()) as ToolAssociations
    core.debug(
      `Successfully created tool association and got response: ${JSON.stringify(data, null, 2)}`
    )

    return data
  } catch (error) {
    if (error instanceof Error)
      core.setFailed(
        `Failed to create tool association with error: ${error.message}`
      )
    throw error
  }
}

interface ChatSession {
  id: string
  updated_at: string
}

async function createChatSession(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string
): Promise<ChatSession> {
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${h2ogpte_api_key}`
    }
  }
  try {
    const response = await fetch(`${h2ogpte_api_base}/api/v1/chats`, options)

    if (!response.ok) {
      throw new Error(
        `HTTP error! {status: ${response.status}, msg: ${response.statusText}}`
      )
    }

    const data = (await response.json()) as ChatSession
    core.debug(
      `Successfully created chat session and got response: ${JSON.stringify(data, null, 2)}`
    )

    return data
  } catch (error) {
    if (error instanceof Error)
      core.setFailed(
        `Failed to create chat session with error: ${error.message}`
      )
    throw error
  }
}

interface ChatResponse {
  success: boolean
  body: string
}

interface h2oRawResponse {
  body: string
}

async function requestAgentCompletion(
  h2ogpte_api_key: string,
  h2ogpte_api_base: string,
  session_id: string,
  prompt: string,
  system_prompt?: string
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
  const timeoutId = setTimeout(() => controller.abort(), 30 * 60 * 1000) // 30 mins

  const options = {
    method: 'POST',
    headers: {
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
      throw new Error(
        `HTTP error! {status: ${response.status}, msg: ${response.statusText}}`
      )
    }

    const data = (await response.json()) as h2oRawResponse
    core.debug(
      `Successfully receieved chat completion and got response: ${JSON.stringify(data, null, 2)}`
    )

    return { success: true, body: data.body }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error) {
      const error_msg = `Failed to receive completion from h2oGPTe with error: ${error.message}`
      core.error(error_msg)
      return { success: false, body: error_msg }
    }
    return {
      success: false,
      body: 'Failed to receive completion from h2oGPTe with unknown completion'
    }
  }
}

function extractFinalAgentRessponse(input: string): string {
  // Find all occurrences of "ENDOFTURN"
  const endOfTurnMatches = Array.from(input.matchAll(/ENDOFTURN/g))

  if (endOfTurnMatches.length < 2) {
    // If there's less than 2 ENDOFTURN markers, return empty string
    return 'The agent did not return a response. Please check h2oGPTe.'
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
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const provided_gh_token: string = core.getInput('gh_token')
    const h2ogpte_api_key: string = core.getInput('h2ogpte_api_key')
    const h2ogpte_api_base: string = core.getInput('h2ogpte_api_base')
    const context = github.context
    const owner = context.repo.owner
    const repo = context.repo.repo

    const rest = new Octokit({
      auth: provided_gh_token,
      baseUrl: 'https://api.github.com'
    })

    if (context.eventName == 'pull_request_review_comment') {
      core.debug(`Full payload: ${JSON.stringify(context.payload, null, 2)}`)
      core.debug(`Pull request object: ${context.payload.pull_request}`)
      core.debug(`Comment object: ${context.payload.comment}`)

      // Repository data
      const repository = {
        owner: owner,
        repo: repo,
        full_name: `${context.repo.owner}/${context.repo.repo}`
      }

      // Pull request data
      const pullRequest = {
        number: (context.payload as PullRequestReviewCommentEvent).pull_request
          .number
      }

      // Comment data
      const comment = {
        id: (context.payload as PullRequestReviewCommentEvent).comment.id,
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
      const key_name = await createAgentKeys(
        h2ogpte_api_key,
        h2ogpte_api_base,
        provided_gh_token
      )
      const key_uuid = await getAgentKeyID(
        h2ogpte_api_key,
        h2ogpte_api_base,
        key_name
      )
      const python_tool_association = await createToolAssociation(
        h2ogpte_api_key,
        h2ogpte_api_base,
        'python',
        key_uuid,
        AGENT_GITHUB_ENV_VAR
      )
      const shell_tool_association = await createToolAssociation(
        h2ogpte_api_key,
        h2ogpte_api_base,
        'shell',
        key_uuid,
        AGENT_GITHUB_ENV_VAR
      )
      // *********************************** //

      // h2oGPTe API Calls
      const chat_session_id = await createChatSession(
        h2ogpte_api_key,
        h2ogpte_api_base
      )

      const chat_session_url = `${h2ogpte_api_base}/chats/${chat_session_id.id}`
      const h2ogpte_comment = await rest.pulls.createReplyForReviewComment({
        owner,
        repo,
        pull_number: pullRequest.number,
        comment_id: comment.id,
        body: `⏳ h2oGPTe is working on it, see the chat [here](${chat_session_url})`
      })

      const system_prompt = `You're h2oGPTe an AI Agent created to help software developers review their code in GitHub. 
      Developers interact with you by adding @h2ogpte in their pull request review comments. 
      You'll be provided a github api key that you can access in python by using os.getenv("${AGENT_GITHUB_ENV_VAR}").
      You can also access the github api key in your shell script by using the ${AGENT_GITHUB_ENV_VAR} environment variable.
      You should only ever respond to the users query by creating commits (if required) on the provided pull request.
      Your response will automatically be added to the user's initial comment so don't create any comments yourself.
      `

      const instruction_prompt = `You've been called upon by the github action as described in your system prompt.
      Here is the information about the repository: ${JSON.stringify(repository)} 
      Here is the information about the pull request: ${JSON.stringify(pullRequest)} 
      Here is the comment data: ${JSON.stringify(comment)}
      Please respond and execute actions accordingly.
      `

      // Get agent completion
      const chat_completion = await requestAgentCompletion(
        h2ogpte_api_key,
        h2ogpte_api_base,
        chat_session_id.id,
        instruction_prompt,
        system_prompt
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
      const body = `${header}, see the response below and the full chat history [here](${chat_session_url})
      ---
      ${cleaned_response}
      `
      await rest.pulls.updateReviewComment({
        owner,
        repo,
        comment_id: h2ogpte_comment.data.id,
        body
      })
    } else {
      throw new Error(`Unexpected event: ${context.eventName}`)
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
