import * as core from "@actions/core";
import { basename } from "path";
import { createCollection } from "../../services/h2ogpte/h2ogpte";
import {
  createIngestionJob,
  getJobDetails,
  uploadFile,
} from "../../services/h2ogpte/h2ogpte";
import type { JobDetails, UploadResponse } from "../../services/h2ogpte/types";

/**
 * Waits for a job to complete, polling at intervals
 */
async function waitForJobCompletion(
  jobId: string,
  checkIntervalMs: number = 2000,
  timeoutMs: number = 300000,
  maxRetries: number = 3,
  retryDelay: number = 1000,
): Promise<JobDetails> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const jobStatus = await getJobDetails(jobId, maxRetries, retryDelay);
    if (!jobStatus) {
      throw new Error(`Job status not found for jobId '${jobId}'`);
    }
    if (jobStatus.overall_status === "completed") {
      return jobStatus;
    }
    if (jobStatus.overall_status === "failed") {
      throw new Error(
        `Job failed: ${jobStatus.errors?.join(", ") || "Unknown error"}`,
      );
    }
    if (jobStatus.overall_status === "canceled") {
      throw new Error("Job was canceled");
    }
    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
  }
  throw new Error(`Job monitoring timeout after ${timeoutMs}ms`);
}

/**
 * Processes a file with job monitoring - uploads file, creates ingestion job, and monitors completion
 */
async function processFileWithJobMonitoring(
  filePath: string,
  collectionId: string,
  options: {
    collectionName?: string;
    collectionDescription?: string;
    metadata?: Record<string, unknown>;
    timeout?: number;
    checkIntervalMs?: number;
    timeoutMs?: number;
    gen_doc_summaries?: boolean;
    gen_doc_questions?: boolean;
    maxRetries?: number;
    retryDelay?: number;
  } = {},
): Promise<{
  upload?: UploadResponse;
  job?: JobDetails;
  collectionId: string;
  success: boolean;
  error?: string;
}> {
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  try {
    // Step 1: Upload file
    const upload = await uploadFile(filePath, maxRetries, retryDelay);
    // Step 2: Create ingestion job
    const job = await createIngestionJob(upload.id, collectionId, {
      metadata: {
        filename: basename(filePath),
        timestamp: new Date().toISOString(),
        ...options.metadata,
      },
      timeout: options.timeout || 600,
      gen_doc_summaries: options.gen_doc_summaries,
      gen_doc_questions: options.gen_doc_questions,
      maxRetries,
      retryDelay,
    });
    // Step 3: Monitor job completion
    const completedJob = await waitForJobCompletion(
      job.id,
      options.checkIntervalMs || 2000,
      options.timeoutMs || 300000,
      maxRetries,
      retryDelay,
    );
    return {
      upload,
      job: completedJob,
      collectionId,
      success: true,
    };
  } catch (error) {
    return {
      upload: undefined,
      job: undefined,
      collectionId,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Uploads attachments to h2oGPTe by creating a collection and uploading each file.
 * @param attachmentUrlMap - Map of attachment URLs to local file paths
 * @returns The created collectionId, or null if no collection was created
 */
export async function uploadAttachmentsToH2oGPTe(
  attachmentUrlMap: Map<string, string>,
  piiProfile: any,
): Promise<string | null> {
  if (attachmentUrlMap.size === 0) {
    core.debug("No attachments found, skipping collection creation");
    return null;
  }

  let collectionId: string | null = null;
  try {
    collectionId = await createCollection(piiProfile);
    await Promise.all(
      Array.from(attachmentUrlMap.values()).map(async (localPath) => {
        const uploadResult = await processFileWithJobMonitoring(
          localPath,
          collectionId!,
        );
        if (!uploadResult.success) {
          core.warning(
            `Failed to upload file to h2oGPTe: ${localPath} with error: ${uploadResult.error}`,
          );
        } else {
          core.debug(`Uploaded file to h2oGPTe: ${localPath}`);
        }
      }),
    );
  } catch (error) {
    core.warning(
      `Failed to process GitHub attachments: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return collectionId;
}
