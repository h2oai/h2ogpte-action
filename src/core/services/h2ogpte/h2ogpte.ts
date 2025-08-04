import { readFileSync } from "fs";
import { basename } from "path";
import { getH2ogpteConfig, parseStreamingAgentResponse } from "./utils";
import { fetchWithRetry, fetchWithRetryStreaming } from "../base";
import * as types from "./types";

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

  const data = (await response.json()) as types.AgentKey;
  console.debug(
    `Successfully created agent keys and got response: ${JSON.stringify(data, null, 2)}`,
  );

  return data.id;
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
  console.debug(
    `Successfully created tool association and got response: ${JSON.stringify(data, null, 2)}`,
  );

  return data;
}

/**
 * Creates chat session with retry mechanism
 */
export async function createChatSession(
  collectionId: string | null,
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

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/chats${collectionId ? `?collection_id=${collectionId}` : ""}`,
    options,
    {
      maxRetries,
      retryDelay,
    },
  );

  const data = (await response.json()) as types.ChatSession;
  console.debug(
    `Successfully created chat session and got response: ${JSON.stringify(data, null, 2)}`,
  );

  return data;
}

/**
 * Requests agent completion with improved error handling and timeout management
 * Now properly handles streaming responses when stream: true is set
 */
export async function requestAgentCompletion(
  sessionId: string,
  prompt: string,
  config?: types.H2ogpteConfig,
  systemPrompt?: string,
  timeoutMinutes: number = 30,
  maxRetries: number = 1,
  retryDelay: number = 1000,
): Promise<types.ChatResponse> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const agentCompletionConfig = {
    message: prompt,
    llm: config?.llm,
    llm_args: {
      use_agent: true,
      agent_accuracy: config?.agent_accuracy,
      agent_max_turns: config?.agent_max_turns,
      agent_total_timeout: config?.agent_total_timeout,
    },
    tags: ["github_action_trigger"],
    stream: true,
    ...(systemPrompt && { system_prompt: systemPrompt }),
  };

  console.debug(
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
    const rawResponse = await fetchWithRetryStreaming(
      `${apiBase}/api/v1/chats/${sessionId}/completions`,
      options,
      { maxRetries, retryDelay, timeoutMs: timeoutMinutes * 60 * 1000 },
    );

    console.log(`Received streaming response: ${rawResponse}`);

    try {
      const lastChunk = parseStreamingAgentResponse(rawResponse);
      if (lastChunk) {
        console.log("Returning last complete chunk from streaming response");
        console.log(lastChunk);
        return { success: true, body: lastChunk.body };
      }
      console.log("No valid chunks found");
      return {
        success: false,
        body: "The agent did not return a complete response. Please check h2oGPTe.",
      };
    } catch (parseError) {
      console.error("Failed to parse streaming response:", parseError);
      return {
        success: false,
        body: "Failed to parse the agent response. Please check h2oGPTe.",
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      const errorMsg = `Failed to receive completion from h2oGPTe with error: ${error.message}`;
      console.error(errorMsg);
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

  console.debug(`Successfully deleted agent key: ${keyId}`);
}

export function getChatSessionUrl(chatSessionId: string) {
  const { apiBase } = getH2ogpteConfig();
  return `${apiBase}/chats/${chatSessionId}`;
}

export async function createCollection(
  collectionName?: string,
  description?: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<string> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  collectionName = collectionName || `h2oGPTe-action-collection-${Date.now()}`;
  description = description || "Collection created by h2oGPTe GitHub action";

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ name: collectionName, description }),
  };

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections`,
    options,
    { maxRetries, retryDelay },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create collection: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = (await response.json()) as types.Collection;

  console.debug(
    `Successfully created collection and got response: ${JSON.stringify(data, null, 2)}`,
  );

  return data.id;
}

/**
 * Uploads a file to h2oGPTe and returns the upload result
 */
export async function uploadFile(
  filePath: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.UploadResponse> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const fileBuffer = readFileSync(filePath);
  const fileName = basename(filePath);
  const file = new File([fileBuffer], fileName);
  const formData = new FormData();
  formData.append("file", file);

  const options = {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  };

  const response = await fetchWithRetry(`${apiBase}/api/v1/uploads`, options, {
    maxRetries,
    retryDelay,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to upload file: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  return (await response.json()) as types.UploadResponse;
}

/**
 * Creates an ingestion job for a given upload and collection
 */
export async function createIngestionJob(
  uploadId: string,
  collectionId: string,
  options: {
    timeout?: number;
    gen_doc_summaries?: boolean;
    gen_doc_questions?: boolean;
    metadata?: Record<string, unknown>;
    maxRetries?: number;
    retryDelay?: number;
    ingest_mode?: string;
  } = {},
): Promise<types.JobDetails> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const params = new URLSearchParams({
    collection_id: collectionId,
    ingest_mode: options.ingest_mode || "agent_only",
    timeout: String(options.timeout || 600),
    gen_doc_summaries: String(options.gen_doc_summaries || false),
    gen_doc_questions: String(options.gen_doc_questions || false),
  });
  const metadata = options.metadata || {};
  const reqOptions = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(metadata),
  };
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/uploads/${uploadId}/ingest/job?${params}`,
    reqOptions,
    { maxRetries, retryDelay },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create ingestion job: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  return (await response.json()) as types.JobDetails;
}

/**
 * Gets the status of a job by jobId
 */
export async function getJobDetails(
  jobId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.JobDetails> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/jobs/${jobId}`,
    options,
    { maxRetries, retryDelay },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get job details: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  return (await response.json()) as types.JobDetails;
}

export async function deleteCollection(
  collectionId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
  timeout: number = 300,
): Promise<void> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}?timeout=${timeout}`,
    options,
    {
      maxRetries,
      retryDelay,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete collection: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  console.debug(
    `${response.status} - Successfully deleted collection: ${collectionId}`,
  );
}
