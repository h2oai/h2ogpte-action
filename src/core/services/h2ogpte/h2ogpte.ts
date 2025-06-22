import * as core from "@actions/core";
import { fetchWithRetry } from "../base";
import * as types from "./types";
import { getH2ogpteConfig } from "../../../utils";

/**
 * Creates agent keys with retry mechanism
 */
export async function createAgentKey(
  tokenName: string,
  tokenValue: string,
  tokenType: string = "private",
  tokenDescription: string = "Temporary key, created for h2oGPTe GitHub action",
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<string> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: tokenName,
      type: tokenType,
      value: tokenValue,
      description: tokenDescription,
    }),
  };

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/agents/keys`,
    options,
    { maxRetries, retryDelay },
  );

  const data = await response.json();
  core.debug(
    `Successfully created agent keys and got response: ${JSON.stringify(data, null, 2)}`,
  );

  return tokenName;
}

/**
 * Gets agent key ID with retry mechanism
 */
export async function getAgentKeyId(
  keyName: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<string> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/agents/keys`,
    options,
    { maxRetries, retryDelay },
  );

  const data = (await response.json()) as types.AgentKeys;
  core.debug(
    `Successfully retrieved agent keys and got response: ${JSON.stringify(data, null, 2)}`,
  );

  // Search for agent key
  const keyId = data.find((k) => k.name === keyName);
  if (keyId === undefined) {
    throw new Error(
      `Could not find ${keyName} in the list of keys. Check debug logs.`,
    );
  }

  core.debug(`Retrieved agent key uuid: ${keyId.id}`);
  return keyId.id;
}

/**
 * Creates tool association with retry mechanism
 */
export async function createToolAssociation(
  toolName: string,
  keyId: string,
  environmentVariableName: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.ToolAssociations> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      tool: toolName,
      keys: [{ name: environmentVariableName, key_id: keyId }],
    }),
  };

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/agents/tool_association`,
    options,
    { maxRetries, retryDelay },
  );

  const data = (await response.json()) as types.ToolAssociations;
  core.debug(
    `Successfully created tool association and got response: ${JSON.stringify(data, null, 2)}`,
  );

  return data;
}

/**
 * Creates chat session with retry mechanism
 */
export async function createChatSession(
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.ChatSession> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const response = await fetchWithRetry(`${apiBase}/api/v1/chats`, options, {
    maxRetries,
    retryDelay,
  });

  const data = (await response.json()) as types.ChatSession;
  core.debug(
    `Successfully created chat session and got response: ${JSON.stringify(data, null, 2)}`,
  );

  return data;
}

/**
 * Requests agent completion with improved error handling and timeout management
 */
export async function requestAgentCompletion(
  sessionId: string,
  prompt: string,
  systemPrompt?: string,
  timeoutMinutes: number = 30,
  maxRetries: number = 1,
  retryDelay: number = 1000,
): Promise<types.ChatResponse> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const agentCompletionConfig = {
    message: prompt,
    llm_args: { use_agent: true },
    tags: ["github_action_trigger"],
    ...(systemPrompt && { system_prompt: systemPrompt }),
  };

  core.debug(
    `Agent completion config: ${JSON.stringify(agentCompletionConfig)}`,
  );

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(agentCompletionConfig),
  };

  try {
    const response = await fetchWithRetry(
      `${apiBase}/api/v1/chats/${sessionId}/completions`,
      options,
      { maxRetries, retryDelay, timeoutMs: timeoutMinutes * 60 * 1000 },
    );

    const data = (await response.json()) as types.H2oRawResponse;

    if (!data || !data.body) {
      throw new Error("Received empty or invalid response from h2oGPTe API");
    }

    core.debug(
      `Successfully received chat completion and got response: ${JSON.stringify(data, null, 2)}`,
    );

    return { success: true, body: data.body };
  } catch (error) {
    if (error instanceof Error) {
      const errorMsg = `Failed to receive completion from h2oGPTe with error: ${error.message}`;
      core.error(errorMsg);
      return { success: false, body: errorMsg };
    }

    return {
      success: false,
      body: "Failed to receive completion from h2oGPTe with unknown error",
    };
  }
}

/**
 * Deletes agent key with retry mechanism
 */
export async function deleteAgentKey(
  keyId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<void> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const options = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };

  await fetchWithRetry(`${apiBase}/api/v1/agents/keys/${keyId}`, options, {
    maxRetries,
    retryDelay,
  });

  core.debug(`Successfully deleted agent key: ${keyId}`);
}

export function getChatSessionUrl(chatSessionId: string) {
  const { apiBase } = getH2ogpteConfig();
  return `${apiBase}/chats/${chatSessionId}`;
}
