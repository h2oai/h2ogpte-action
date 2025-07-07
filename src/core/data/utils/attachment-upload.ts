import * as core from "@actions/core";
import { createCollection } from "../../services/h2ogpte/h2ogpte";
import { processFileWithJobMonitoring } from "../../../utils";

/**
 * Uploads attachments to h2oGPTe by creating a collection and uploading each file.
 * @param attachmentUrlMap - Map of attachment URLs to local file paths
 * @returns The created collectionId, or null if no collection was created
 */
export async function uploadAttachmentsToH2oGPTe(
  attachmentUrlMap: Map<string, string>,
): Promise<string | null> {
  let collectionId: string | null = null;
  try {
    collectionId = await createCollection();
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
