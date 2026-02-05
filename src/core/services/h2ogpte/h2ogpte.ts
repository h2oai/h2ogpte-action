import * as core from "@actions/core";
import { readFileSync } from "fs";
import { basename } from "path";
import { fetchWithRetry, fetchWithRetryStreaming } from "../base";
import * as types from "./types";
import {
  buildCustomToolFormData,
  getH2ogpteConfig,
  parseStreamingAgentResponse,
} from "./utils";
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
  core.debug(`Successfully created agent keys with id: ${data.id}`);

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
  core.debug(`Successfully created chat session with id: ${data.id}`);

  return data;
}

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
    tags: ["github_action_trigger"],
    stream: true,
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
    const rawResponse = await fetchWithRetryStreaming(
      `${apiBase}/api/v1/chats/${sessionId}/completions`,
      options,
      { maxRetries, retryDelay, timeoutMs: timeoutMinutes * 60 * 1000 },
    );

    core.debug(`Received streaming response: ${rawResponse}`);

    try {
      const lastChunk = parseStreamingAgentResponse(rawResponse);
      if (lastChunk) {
        core.debug(
          `Returning last complete chunk from streaming response ${JSON.stringify(lastChunk)}`,
        );
        return { success: true, body: lastChunk.body };
      }
      core.error("No valid chunks found in streaming response");
      return {
        success: false,
        body: "The agent did not return a complete response. Please check h2oGPTe.",
      };
    } catch (parseError) {
      core.error(
        `Failed to parse streaming response: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
      );
      return {
        success: false,
        body: "Failed to parse the agent response. Please check h2oGPTe.",
      };
    }
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
    body: JSON.stringify({ name: collectionName, description: description }),
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

  core.debug(`Successfully created collection with id: ${data.id}`);

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
  core.debug(
    `${response.status} - Successfully deleted collection: ${collectionId}`,
  );
}

export async function createCustomTool(
  tool: types.CustomToolInput,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    timeoutMs?: number;
  } = {},
): Promise<string[]> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const { maxRetries = 3, retryDelay = 1000, timeoutMs = 5000 } = options;

  const formData = buildCustomToolFormData(tool);

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/agents/custom_tools`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    },
    { maxRetries, retryDelay, timeoutMs },
  );

  const data = (await response.json()) as types.AgentCustomToolResponse[];
  const toolIds = data.map((item) => item.agent_custom_tool_id);
  core.debug(
    `Created custom agent tool(s) for type ${tool.toolType}: ${toolIds.join(",")}`,
  );

  return toolIds;
}

/**
 * List agent tools present on the system
 */
export async function getSystemTools(
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.SystemTool[]> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/agents/tools`,
    options,
    { maxRetries, retryDelay },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get system tools: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = (await response.json()) as types.SystemTool[];
  core.debug(`Successfully retrieved ${data.length} system tool(s)`);

  return data;
}

/**
 * Gets custom tools with retry mechanism
 */
export async function getCustomTools(
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.CustomTool[]> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/agents/custom_tools`,
    options,
    { maxRetries, retryDelay },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get custom tools: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = (await response.json()) as types.CustomTool[];
  core.debug(`Successfully retrieved ${data.length} custom tool(s)`);

  return data;
}

/**
 * Deletes custom agent tools with retry mechanism
 */
export async function deleteCustomTools(
  toolIds: string[],
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.Count> {
  const { apiKey, apiBase } = getH2ogpteConfig();

  const toolIdsPath = toolIds.join(",");

  const options = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  };

  const response = await fetchWithRetry(
    `${apiBase}/api/v1/agents/custom_tools/${toolIdsPath}`,
    options,
    { maxRetries, retryDelay },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete custom tools: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data = (await response.json()) as types.Count;
  return data;
}

export async function getCollection(
  collectionId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<object | null> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}`,
    options,
    {
      maxRetries: maxRetries,
      retryDelay: retryDelay,
    },
  );

  if (response.ok) {
    core.debug(`Collection ${collectionId} is valid.`);
    return response.json;
  } else {
    const errorText = await response.text();
    core.debug(
      `Failed to validate collection ${collectionId}: ${response.status} ${response.statusText} - ${errorText}`,
    );
    return null;
  }
}

export async function getCollectionSettings(
  collectionId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.CollectionSettings> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}/settings`,
    options,
    {
      maxRetries,
      retryDelay,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get collection settings: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  const data = (await response.json()) as types.CollectionSettings;
  return data;
}

export async function getChatSettings(
  collectionId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.ChatSettings> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}/chat_settings`,
    options,
    {
      maxRetries,
      retryDelay,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get chat settings: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  const data = (await response.json()) as types.ChatSettings;
  return data;
}

export async function setCollectionSettings(
  collectionId: string,
  collectionSettings: types.CollectionSettings,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<void> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(collectionSettings),
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}/settings`,
    options,
    {
      maxRetries,
      retryDelay,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update collection settings: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  core.debug(`${response.status} - Successfully updated collection settings`);
}

export async function setChatSettings(
  collectionId: string,
  chatSettingsPayload: types.ChatSettings,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<void> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(chatSettingsPayload),
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}/chat_settings`,
    options,
    {
      maxRetries,
      retryDelay,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update chat settings: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  core.debug(`${response.status} - Successfully updated chat settings`);
}

export async function getCollectionDocumentsData(
  collectionId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<types.Document[]> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const options = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
  const response = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}/documents`,
    options,
    {
      maxRetries,
      retryDelay,
    },
  );
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get collection documents: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }
  const data = (await response.json()) as types.Document[];
  return data;
}

export async function addDocumentToCollection(
  collectionId: string,
  documentId: string,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<void> {
  const { apiKey, apiBase } = getH2ogpteConfig();
  const res = await fetchWithRetry(
    `${apiBase}/api/v1/collections/${collectionId}/documents/insert_job?ingest_mode=agent_only`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        document_id: documentId,
      }),
    },
    {
      maxRetries,
      retryDelay,
    },
  );
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Failed to add document ${documentId} to collection: ${res.status} ${res.statusText} - ${errorText}`,
    );
  }
  core.debug(
    `${res.status} - Successfully added document ${documentId} to collection`,
  );
}
