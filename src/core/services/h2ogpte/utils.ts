import type {
  StreamingChunk,
  H2ogpteConfig,
  ChatSettings,
  CollectionSettings,
  Document,
  Message,
  UsageStats,
} from "./types";
import {
  getCollectionSettings,
  getChatSettings,
  setChatSettings,
  getCollectionDocumentsData,
  addDocumentToCollection,
  getCollection,
  setCollectionSettings,
  getSessionMessages,
} from "./h2ogpte";
import * as core from "@actions/core";
import yaml from "js-yaml";
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

/**
 * Parse h2oGPTe configuration from GitHub action inputs
 */
export function parseH2ogpteConfig(): H2ogpteConfig {
  const llm = process.env.LLM;
  const agent_max_turns = process.env.AGENT_MAX_TURNS;
  const agent_accuracy = process.env.AGENT_ACCURACY;
  const agent_total_timeout_raw = process.env.AGENT_TOTAL_TIMEOUT;
  let agent_total_timeout = 3600; // default value

  if (agent_total_timeout_raw !== undefined && agent_total_timeout_raw !== "") {
    const parsed = parseInt(agent_total_timeout_raw);
    if (!isNaN(parsed) && parsed >= 0) {
      agent_total_timeout = parsed;
    }
    // If parsing fails or value is negative, keep the default value
  }

  const allowedMaxTurnsValues = ["auto", "5", "10", "15", "20"];
  if (agent_max_turns && !allowedMaxTurnsValues.includes(agent_max_turns)) {
    throw new Error(
      `Invalid agent_max_turns value: "${agent_max_turns}". Must be one of: ${allowedMaxTurnsValues.join(", ")}`,
    );
  }

  const allowedAccuracyValues = ["quick", "basic", "standard", "maximum"];
  if (agent_accuracy && !allowedAccuracyValues.includes(agent_accuracy)) {
    throw new Error(
      `Invalid agent_accuracy value: "${agent_accuracy}". Must be one of: ${allowedAccuracyValues.join(", ")}`,
    );
  }

  return {
    llm: llm || "auto",
    agent_max_turns: agent_max_turns || "auto",
    agent_accuracy: agent_accuracy || "standard",
    agent_total_timeout: agent_total_timeout,
  };
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

export async function createUsageReport(
  sessionId: string,
  chatSessionUrl: string,
): Promise<void> {
  const messages = (await getSessionMessages(sessionId)) as Message[];
  if (!messages || messages.length === 0) {
    core.warning(`No messages found for session ${sessionId}`);
    return;
  }

  const replyMessage = messages[0];
  if (!replyMessage) {
    core.warning(`First message is undefined for session ${sessionId}`);
    return;
  }

  if (replyMessage.error && replyMessage.error !== "") {
    await core.summary
      .addHeading("🚨 Action ran unsuccessfully")
      .addSeparator()
      .addHeading("📊 Usage Statistics")
      .addRaw(
        "Usage Statistics are not available due to the following error:\n",
      )
      .addCodeBlock(replyMessage.error.substring(0, 100))
      .addRaw(
        ":\nTo view more details, please check the action logs and the h2oGPTe chat session linked below.",
      )
      .write();
    core.debug(`Error in chat session ${sessionId}: ${replyMessage.error}`);
  } else if (
    replyMessage.type_list &&
    replyMessage.type_list.length > 0 &&
    replyMessage.type_list.some((t) => t.message_type === "usage_stats")
  ) {
    const usageTypeList = replyMessage.type_list.find(
      (t) => t.message_type === "usage_stats",
    );

    if (!usageTypeList) {
      core.warning(`Usage stats not found in message for session ${sessionId}`);
      return;
    }

    const usage: UsageStats = JSON.parse(usageTypeList.content);

    await core.summary
      .addHeading("✅ Action ran successfully")
      .addSeparator()
      .addHeading("📊 Usage Statistics")

      .addTable([
        [
          { data: "Metric", header: true },
          { data: "Value", header: true },
        ],
        ["Model", usage.llm.toString()],
        ["Total Cost", usage.cost.toString()],
        ["Response Time", usage.response_time.toString()],
        ["Queue Time", usage.queue_time.toString()],
        ["Retrieval Time", usage.retrieval_time.toString()],
      ])
      .addDetails(
        "Detailed Usage Statistics",
        `<pre><code class="language-json">
        ${JSON.stringify(usage, null, 2)}
        </code></pre>`,
      )
      .write();
  }

  await core.summary
    .addHeading("🔗 View Full h2oGPTe Chat Session")
    .addLink(
      chatSessionUrl,
      "Click here to view the full chat session in h2oGPTe",
    )
    .write();
}
