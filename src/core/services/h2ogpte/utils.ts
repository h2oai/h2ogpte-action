import * as core from "@actions/core";
import { readFileSync } from "fs";
import yaml from "js-yaml";
import { basename } from "path";
import {
  addDocumentToCollection,
  getChatSettings,
  getCollection,
  getCollectionDocumentsData,
  getCollectionSettings,
  getCustomTools,
  getSystemTools,
  setChatSettings,
  setCollectionSettings,
  getSessionMessages,
} from "./h2ogpte";
import type {
  ChatSettings,
  CollectionSettings,
  CustomToolInput,
  Document,
  StreamingChunk,
  SystemTool,
  UsageStats,
} from "./types";
/**
 * Gets H2OGPTE configuration from environment variables
 */
export function getH2ogpteConfig(): { apiKey: string; apiBase: string } {
  const apiKey = process.env.H2OGPTE_API_KEY;
  const apiBase = process.env.H2OGPTE_API_BASE;

  if (!apiKey) {
    throw new Error("H2OGPTE_API_KEY environment variable is required");
  }
  if (!apiBase) {
    throw new Error("H2OGPTE_API_BASE environment variable is required");
  }

  return { apiKey, apiBase };
}

/**
 * Parses a newline-delimited streaming agent response and returns the last valid chunk (with body and finished)
 */
export function parseStreamingAgentResponse(
  rawResponse: string,
): StreamingChunk | null {
  if (!rawResponse || typeof rawResponse !== "string") return null;
  const lines = rawResponse.trim().split("\n");
  const streamingChunks = lines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((chunk) => chunk !== null);
  const lastChunk = streamingChunks[streamingChunks.length - 1];
  if (lastChunk && lastChunk.body && lastChunk.finished) {
    return lastChunk;
  }
  return null;
}

export function buildCustomToolFormData(input: CustomToolInput): FormData {
  const formData = new FormData();
  const toolArgsString =
    typeof input.toolArgs === "string"
      ? input.toolArgs
      : JSON.stringify(input.toolArgs);

  formData.append("tool_type", input.toolType);
  formData.append("tool_args", toolArgsString);

  if (input.customToolPath) {
    formData.append("custom_tool_path", input.customToolPath);
  }

  if (input.filePath) {
    const buffer = readFileSync(input.filePath);
    const name = input.filename || basename(input.filePath);
    const file = new File([buffer], name);
    formData.append("file", file);
  }

  if (input.filename) {
    formData.append("filename", input.filename);
  }

  return formData;
}

export async function getAllAgentToolNamesFromLabel(
  toolLabels: string[],
): Promise<string[]> {
  const allSystemTools = await getSystemTools();
  const allCustomTools = await getCustomTools();

  const systemTools = allSystemTools.filter((t) =>
    toolLabels.includes(t.description),
  );
  const customTools = allCustomTools.filter((t) => {
    const label = t.tool_args?.label;
    return typeof label === "string" && toolLabels.includes(label);
  });

  const systemToolNames = systemTools.map((t) => t.name);
  const customToolNames = customTools.map((t) => t.tool_name);

  const allToolNames = [...systemToolNames, ...customToolNames];
  core.debug(
    `Matched agent labels [${toolLabels.join(", ")}] to agent tool names: [${allToolNames.join(", ")}]`,
  );
  return allToolNames;
}

/**
 * Extracts the default system tools from h2oGPTe.
 */
export async function extractDefaultSystemTools(): Promise<SystemTool[]> {
  const systemTools = await getSystemTools();
  return systemTools.filter((t) => t.default);
}

/**
 * Copies a collection by copying settings, chat configuration, and documents
 * @param sourceCollectionId - The ID of the collection to copy from
 * @param targetCollectionId - The ID of the collection to copy to
 * @returns Promise<void>
 * @throws Error if copy fails at any step
 */
export async function copyCollection(
  sourceCollectionId: string,
  targetCollectionId: string,
): Promise<void> {
  // Get source collection settings
  const collectionSettings = (await getCollectionSettings(
    sourceCollectionId,
  )) as CollectionSettings;
  // Update target collection settings
  await setCollectionSettings(targetCollectionId, collectionSettings);

  // Get source chat settings
  const chatSettings = (await getChatSettings(
    sourceCollectionId,
  )) as ChatSettings;
  // Update target chat settings
  await setChatSettings(targetCollectionId, chatSettings);

  // Get source collection documents
  const documents = (await getCollectionDocumentsData(
    sourceCollectionId,
  )) as Document[];
  // Add documents to target collection
  await Promise.all(
    documents.map(async (doc) => {
      await addDocumentToCollection(targetCollectionId, doc.id);
    }),
  );

  core.debug(
    `Successfully duplicated collection from ${sourceCollectionId} to ${targetCollectionId}`,
  );
}

/**
 * Validates if a collection exists and is accessible
 * @param collectionId - The ID of the collection to validate
 * @returns Promise<boolean> - True if collection is valid and accessible
 * @throws Error if the API request fails
 */
export async function isValidCollection(
  collectionId: string,
): Promise<boolean> {
  return (await getCollection(collectionId)) !== null;
}

export async function updateGuardRailsSettings(
  collectionId: string,
  guardrailsSettings?: string,
): Promise<void> {
  if (!guardrailsSettings) {
    core.debug("No guardrails settings found");
    return;
  }

  core.debug(`Guardrails settings: ${guardrailsSettings}`);
  const guardrailsSettingsPayload =
    yaml.load(guardrailsSettings, {
      schema: yaml.JSON_SCHEMA,
    }) || undefined;
  core.debug(`Guardrails settings payload: ${guardrailsSettingsPayload}`);
  const oldSettings = await getCollectionSettings(collectionId);
  const updatedSettings: CollectionSettings = {
    ...oldSettings,
    guardrails_settings: guardrailsSettingsPayload,
  };
  await setCollectionSettings(collectionId, updatedSettings);
}

/**
 * Creates and writes a usage statistics report to the GitHub Actions job summary.
 *
 * This function fetches messages from an h2oGPTe chat session and generates a summary
 * report containing usage statistics (model, cost, response time, queue time, retrieval time).
 * If the session encountered an error, it displays an error summary and throws.
 *
 * @param sessionId - The unique identifier of the h2oGPTe chat session
 * @returns A promise that resolves when the summary has been written
 *
 * @throws Error if:
 * - No messages are found for the session
 * - The first message is undefined
 * - The agent execution encountered an error
 * - Usage stats are not found in the message type list
 **/
export async function createUsageReport(sessionId: string): Promise<void> {
  const messages = await getSessionMessages(sessionId);
  if (!messages || messages.length === 0) {
    throw new Error(`No messages found for session ${sessionId}`);
  }

  // Reply message is always at the first index
  const replyMessage = messages.at(0);
  if (!replyMessage) {
    throw new Error(`First message is undefined for session ${sessionId}`);
  }

  if (replyMessage.error && replyMessage.error !== "") {
    const MAX_ERROR_LENGTH = 100;
    await core.summary
      .addHeading("📋 Summary Statistics")
      .addRaw(
        "Usage Statistics are not available due to the following error:\n",
      )
      .addCodeBlock(
        replyMessage.error.length > MAX_ERROR_LENGTH
          ? replyMessage.error.substring(0, MAX_ERROR_LENGTH) + "..."
          : replyMessage.error,
        "plaintext",
      )
      .addRaw(
        "\nTo view more details, please check the action logs and the h2oGPTe chat session.",
      )
      .write();
    return;
  }

  if (
    !replyMessage.type_list ||
    replyMessage.type_list.length === 0 ||
    !replyMessage.type_list.some((t) => t.message_type === "usage_stats")
  ) {
    throw new Error(
      `Usage stats not found in message type list for session ${sessionId}`,
    );
  }

  const usageTypeList = replyMessage.type_list.find(
    (t) => t.message_type === "usage_stats",
  )!;

  const usage: UsageStats = JSON.parse(usageTypeList.content);

  await core.summary
    .addHeading("📋 Summary Statistics", 2)
    .addTable([
      [
        { data: "Metric", header: true },
        { data: "Value", header: true },
      ],
      ["Model", `${usage.llm}`],
      ["Total Cost", `${usage.cost}`],
      ["Response Time", `${usage.response_time}`],
      ["Queue Time", `${usage.queue_time}`],
      ["Retrieval Time", `${usage.retrieval_time}`],
    ])
    .addDetails(
      "Detailed Usage Statistics",
      `<pre><code class="language-json">
        ${JSON.stringify(usage, null, 2)}
        </code></pre>`,
    )
    .write();
}
