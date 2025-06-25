/**
 * Universal GitHub attachment downloader with special handling for images
 * Adapted from: https://github.com/anthropics/claude-code-action/blob/main/src/github/utils/image-downloader.ts
 * Original author: Anthropic
 * License: MIT
 *
 * NOTE: Images are identified by their signed URLs containing "user-images":
 * - Image signed URLs: https://private-user-images.githubusercontent.com/.../file-id.jpeg?jwt=...
 * - File signed URLs: https://github.com/user-attachments/files/...
 * The file extension for images is embedded in the middle of the signed URL path.
 *
 * WARNING: In private repos, we can't directly download issue attachments
 *  See: https://github.com/orgs/community/discussions/162417#discussioncomment-13428503
 */

import fs from "fs/promises";
import path from "path";
import type { Octokit } from "@octokit/rest";
import { getGithubServerUrl } from "../../../utils";

// Simple regex to match any GitHub user-attachments URL
const GITHUB_ATTACHMENT_REGEX = new RegExp(
  `${getGithubServerUrl().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/user-attachments\\/(?:assets|files)\\/[^\\s"'>)]+`,
  "g",
);

// File type categories for organisation
const FILE_TYPE_CATEGORIES = {
  images: [
    ".jpg",
    ".jpeg",
    ".png",
    ".bmp",
    ".gif",
    ".tif",
    ".tiff",
    ".pnm",
    ".pgm",
    ".pbm",
    ".ppm",
    ".pam",
    ".jpx",
    ".jp2",
    ".psd",
    ".svg",
  ],
  documents: [".pdf", ".rtf", ".doc", ".docx", ".xps", ".md", ".rst"],
  spreadsheets: [".xls", ".xlsx", ".csv", ".tsv"],
  presentations: [".ppt", ".pptx"],
  archives: [".zip", ".tar", ".gz", ".tgz", ".bz2", ".tbz2", ".xz", ".txz"],
  code: [
    ".html",
    ".htm",
    ".xhtml",
    ".txt",
    ".log",
    ".c",
    ".cs",
    ".cpp",
    ".java",
    ".json",
    ".py",
    ".rb",
    ".tex",
    ".css",
    ".js",
    ".sh",
    ".ts",
    ".xml",
    ".php",
    ".bat",
    ".sql",
    ".yaml",
    ".yml",
    ".ini",
    ".cfg",
    ".conf",
    ".toml",
  ],
  ebook: [".fb2", ".epub", ".mobi", ".cbz"],
  audio: [".mp3", ".flac", ".wav", ".m4a", ".aac"],
  email: [".eml", ".msg"],
  other: [] as Array<string>, // fallback category - empty since only specific files are supported
};

const IGNORE_FILE_EXT = ".ignore";

export type FileType = keyof typeof FILE_TYPE_CATEGORIES;

export type DownloadedFile = {
  originalUrl: string;
  localPath: string;
  filename: string;
  fileType: FileType;
  extension: string;
  size: number;
  downloadedAt: Date;
  isImage: boolean; // Track whether this was detected as an image
};

type IssueComment = {
  type: "issue_comment";
  id: string;
  body: string;
};

type ReviewComment = {
  type: "review_comment";
  id: string;
  body: string;
};

type ReviewBody = {
  type: "review_body";
  id: string;
  pullNumber: string;
  body: string;
};

type IssueBody = {
  type: "issue_body";
  issueNumber: string;
  body: string;
};

type PullRequestBody = {
  type: "pr_body";
  pullNumber: string;
  body: string;
};

export type CommentWithAttachments =
  | IssueComment
  | ReviewComment
  | ReviewBody
  | IssueBody
  | PullRequestBody;

export type DownloadOptions = {
  maxFileSize?: number; // in bytes, default 50MB
  allowedExtensions?: string[]; // if specified, only these extensions will be downloaded
  allowedFileTypes?: FileType[]; // if specified, only these file types will be downloaded
  downloadsDir?: string;
};

export async function downloadCommentAttachments(
  rest: Octokit,
  owner: string,
  repo: string,
  comments: CommentWithAttachments[],
  options: DownloadOptions = {},
): Promise<Map<string, string>> {
  const {
    maxFileSize = 50 * 1024 * 1024, // 50MB default
    downloadsDir = "/tmp/github-attachments",
  } = options;

  const urlToPathMap = new Map<string, string>();

  try {
    await fs.mkdir(downloadsDir, { recursive: true });

    const commentsWithAttachments: Array<{
      comment: CommentWithAttachments;
      urls: string[];
    }> = [];

    console.log(`Processing ${comments.length} comments for attachments...`);

    // First pass: find all attachments using single regex
    for (const comment of comments) {
      const attachmentMatches = [
        ...comment.body.matchAll(GITHUB_ATTACHMENT_REGEX),
      ];
      const urls = attachmentMatches
        .map((match) => match[0] as string)
        .filter(Boolean);

      if (urls.length > 0) {
        commentsWithAttachments.push({ comment, urls });
        const id = getCommentId(comment);
        console.log(
          `Found ${urls.length} attachment(s) in ${comment.type} ${id}`,
        );
      }
    }

    console.log(
      `Total comments with attachments: ${commentsWithAttachments.length}`,
    );

    // Process each comment with attachments
    for (const { comment, urls } of commentsWithAttachments) {
      try {
        const bodyHtml = await getCommentHtml(rest, owner, repo, comment);

        if (!bodyHtml) {
          const id = getCommentId(comment);
          console.warn(`No HTML body found for ${comment.type} ${id}`);
          continue;
        }

        console.log(
          `Processing ${urls.length} attachment(s) for ${comment.type}`,
        );

        // Extract signed URLs from HTML
        // Combined regex pattern to preserve order
        const combinedPattern =
          /https:\/\/private-user-images\.githubusercontent\.com\/[^"]+\?jwt=[^"]+|https:\/\/github\.com\/user-attachments\/files\/[^"'>\s]+|https:\/\/user-images\.githubusercontent\.com\/[^"'>\s]+/g;

        // Find all matches
        const matches = [...bodyHtml.matchAll(combinedPattern)];
        const allSignedUrls = matches.map((match) => match[0]);

        // Remove duplicates while preserving order
        const signedUrls = [
          ...new Map(allSignedUrls.map((url) => [url, url])).values(),
        ];

        console.log(
          `Found ${allSignedUrls.length} signed URLs, only ${signedUrls.length} after deduplicating`,
        );
        console.log(`All Signed urls: ${JSON.stringify(allSignedUrls)}`);
        console.log(`Final Signed urls: ${JSON.stringify(signedUrls)}`);

        // Download each attachment - assume signed URLs match original URLs in order
        for (let i = 0; i < Math.min(signedUrls.length, urls.length); i++) {
          const signedUrl = signedUrls[i];
          const originalUrl = urls[i];

          if (!signedUrl || !originalUrl) {
            continue;
          }

          // Check if we've already downloaded this URL
          if (urlToPathMap.has(originalUrl)) {
            console.log(`Already downloaded: ${originalUrl}`);
            continue;
          }

          // Determine if this is an image based on the signed URL containing "user-images"
          const isImage = signedUrl.includes("user-images");

          // Get file extension - handle images differently due to their signed URL structure
          const extension = getFileExtension(originalUrl, signedUrl, isImage);
          const fileType = categoriseFile(extension);

          console.log(
            `Detected ${isImage ? "image" : "file"}: ${originalUrl} -> extension: ${extension}, type: ${fileType}`,
          );

          // Ignore file if it is categorised as other
          if (fileType == "other") {
            console.log(
              `Skipping ${originalUrl} - extension ${extension} unsupported`,
            );
            continue;
          }

          const filename = generateFilename(
            originalUrl,
            i,
            extension,
            fileType,
          );
          const localPath = path.join(downloadsDir, filename);

          try {
            console.log(
              `Downloading ${isImage ? "image" : "file"} (${fileType}): ${originalUrl}...`,
            );

            const response = await fetch(signedUrl);

            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }

            // Check file size
            const contentLength = response.headers.get("content-length");
            if (contentLength && parseInt(contentLength) > maxFileSize) {
              throw new Error(
                `File too large: ${contentLength} bytes (max: ${maxFileSize} bytes)`,
              );
            }

            const arrayBuffer = await response.arrayBuffer();

            // Double-check size after download
            if (arrayBuffer.byteLength > maxFileSize) {
              throw new Error(
                `File too large: ${arrayBuffer.byteLength} bytes (max: ${maxFileSize} bytes)`,
              );
            }

            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(localPath, buffer);

            console.log(
              `✓ Saved: ${localPath} (${arrayBuffer.byteLength} bytes)`,
            );

            urlToPathMap.set(originalUrl, localPath);

            console.log(
              `✓ Downloaded ${isImage ? "image" : "file"} (${fileType}): ${filename}`,
            );
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            console.error(
              `✗ Failed to download ${originalUrl}: ${errorMessage}`,
            );
          }
        }
      } catch (error) {
        const id = getCommentId(comment);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Failed to process attachments for ${comment.type} ${id}: ${errorMessage}`,
        );
      }
    }

    console.log(`Final URL to path map size: ${urlToPathMap.size}`);
    console.log("Image URL Map in file-downloader:");
    console.log(JSON.stringify(urlToPathMap));

    return urlToPathMap;
  } catch (error) {
    console.error("Error in downloadCommentAttachments:", error);
    return urlToPathMap;
  }
}

async function getCommentHtml(
  rest: Octokit,
  owner: string,
  repo: string,
  comment: CommentWithAttachments,
): Promise<string | undefined> {
  switch (comment.type) {
    case "issue_comment": {
      const response = await rest.issues.getComment({
        owner,
        repo,
        comment_id: parseInt(comment.id),
        mediaType: { format: "full+json" },
      });
      return response.data.body_html;
    }
    case "review_comment": {
      const response = await rest.pulls.getReviewComment({
        owner,
        repo,
        comment_id: parseInt(comment.id),
        mediaType: { format: "full+json" },
      });
      return response.data.body_html;
    }
    case "review_body": {
      const response = await rest.pulls.getReview({
        owner,
        repo,
        pull_number: parseInt(comment.pullNumber),
        review_id: parseInt(comment.id),
        mediaType: { format: "full+json" },
      });
      return response.data.body_html;
    }
    case "issue_body": {
      const response = await rest.issues.get({
        owner,
        repo,
        issue_number: parseInt(comment.issueNumber),
        mediaType: { format: "full+json" },
      });
      return response.data.body_html;
    }
    case "pr_body": {
      const response = await rest.pulls.get({
        owner,
        repo,
        pull_number: parseInt(comment.pullNumber),
        mediaType: { format: "full+json" },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (response.data as any).body_html;
    }
  }
}

function getCommentId(comment: CommentWithAttachments): string {
  return comment.type === "issue_body"
    ? comment.issueNumber
    : comment.type === "pr_body"
      ? comment.pullNumber
      : comment.id;
}

/**
 * Extract file extension from URLs, with special handling for images
 *
 * Images have different signed URL structure where the extension is embedded in the path:
 * - Original: https://github.com/user-attachments/assets/416e686f-3fe1-40aa-885d-bb54c4a6cbdb
 * - Signed: https://private-user-images.githubusercontent.com/.../416e686f-3fe1-40aa-885d-bb54c4a6cbdb.jpeg?jwt=...
 *
 * For images, we need to check the signed URL for the extension, not just the original URL.
 */
function getFileExtension(
  originalUrl: string,
  signedUrl: string,
  isImage: boolean,
): string {
  try {
    // For images, prioritize checking the signed URL since it contains the actual extension
    if (isImage) {
      // Extract extension from signed URL path - look for pattern like "file-id.ext" before query params
      const signedUrlPath = signedUrl.split("?")[0]; // Remove query parameters
      const pathMatch = signedUrlPath?.match(/\/([^/]+)\.([a-zA-Z0-9]+)$/);
      if (pathMatch && pathMatch[2]) {
        const ext = `.${pathMatch[2].toLowerCase()}`;
        console.log(`Extracted extension from signed URL: ${ext}`);
        return ext;
      }

      // Fallback: look anywhere in the signed URL path for common image extensions
      const extensionMatch = signedUrlPath?.match(/\.([a-zA-Z0-9]+)/g);
      if (extensionMatch && extensionMatch.length > 0) {
        // Take the last extension found (most likely to be the file extension)
        const lastExtension = extensionMatch[extensionMatch.length - 1];
        const ext = lastExtension!.toLowerCase();
        console.log(`Found extension in signed URL path: ${ext}`);
        return ext;
      }
    }

    // For non-images or fallback, check the original URL
    const urlParts = originalUrl.split("/");
    const filename = urlParts[urlParts.length - 1];

    if (!filename) {
      return isImage ? ".png" : IGNORE_FILE_EXT; // Default fallbacks
    }

    // Try to extract extension from filename
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (match && match[1]) {
      return `.${match[1].toLowerCase()}`;
    }

    // If no extension found, use defaults based on type
    return isImage ? ".png" : IGNORE_FILE_EXT;
  } catch (error) {
    console.warn(`Error getting extension for ${originalUrl}:`, error);
    return isImage ? ".png" : IGNORE_FILE_EXT;
  }
}

function categoriseFile(extension: string): FileType {
  const ext = extension.toLowerCase();

  for (const [category, extensions] of Object.entries(FILE_TYPE_CATEGORIES)) {
    if (extensions.includes(ext)) {
      return category as FileType;
    }
  }

  return "other";
}

function generateFilename(
  originalUrl: string,
  index: number,
  extension: string,
  fileType: FileType,
): string {
  const timestamp = Date.now();
  const urlHash = originalUrl.split("/").pop()?.substring(0, 8) || "unknown";
  return `${fileType}-${urlHash}-${timestamp}-${index}${extension}`;
}
