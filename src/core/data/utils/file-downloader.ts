/**
 * Universal GitHub attachment downloader
 * Adapted from: https://github.com/anthropics/claude-code-action/blob/main/src/github/utils/image-downloader.ts
 * Original author: Anthropic
 * License: MIT
 */

import fs from "fs/promises";
import path from "path";
import type { Octokit } from "@octokit/rest";
import { getGithubServerUrl } from "../../../utils";

// Regex to match any GitHub user-attachments URL (both ![](url) and [](url) formats)
const GITHUB_ATTACHMENT_REGEX = new RegExp(
  `\\[[^\\]]*\\]\\((${getGithubServerUrl().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\/user-attachments\\/(?:assets|files)\\/[^)]+)\\)`,
  "g",
);

// File type categories for organisation
const FILE_TYPE_CATEGORIES = {
  images: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.heic', '.avif'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt', '.pages'],
  spreadsheets: ['.xls', '.xlsx', '.csv', '.ods', '.numbers'],
  presentations: ['.ppt', '.pptx', '.odp', '.key'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz'],
  code: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.xml', '.json', '.yaml', '.yml', '.go', '.rs', '.php', '.rb', '.swift'],
  data: ['.json', '.xml', '.yaml', '.yml', '.sql', '.db', '.sqlite', '.csv', '.tsv'],
  media: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.mp3', '.wav', '.ogg', '.flac', '.aac'],
  fonts: ['.ttf', '.otf', '.woff', '.woff2', '.eot'],
  other: [] as string[] // fallback category
};

export type FileType = keyof typeof FILE_TYPE_CATEGORIES;

export type DownloadedFile = {
  originalUrl: string;
  localPath: string;
  filename: string;
  fileType: FileType;
  extension: string;
  size: number;
  downloadedAt: Date;
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

export type DownloadResult = {
  urlToPathMap: Map<string, string>;
  downloadedFiles: DownloadedFile[];
  errors: Array<{ url: string; error: string }>;
};

export async function downloadCommentAttachments(
  rest: Octokit,
  owner: string,
  repo: string,
  comments: CommentWithAttachments[],
  options: DownloadOptions = {}
): Promise<DownloadResult> {
  const {
    maxFileSize = 50 * 1024 * 1024, // 50MB default
    allowedExtensions,
    allowedFileTypes,
    downloadsDir = "/tmp/github-attachments"
  } = options;

  const urlToPathMap = new Map<string, string>();
  const downloadedFiles: DownloadedFile[] = [];
  const errors: Array<{ url: string; error: string }> = [];

  try {
    await fs.mkdir(downloadsDir, { recursive: true });

    const commentsWithAttachments: Array<{
      comment: CommentWithAttachments;
      urls: string[];
    }> = [];

    console.log(`Processing ${comments.length} comments for attachments...`);

    // First pass: find all attachments
    for (const comment of comments) {
      const attachmentMatches = [...comment.body.matchAll(GITHUB_ATTACHMENT_REGEX)];
      const urls = attachmentMatches.map((match) => match[1] as string).filter(Boolean);

      if (urls.length > 0) {
        commentsWithAttachments.push({ comment, urls });
        const id = getCommentId(comment);
        console.log(`Found ${urls.length} attachment(s) in ${comment.type} ${id}`);
      }
    }

    console.log(`Total comments with attachments: ${commentsWithAttachments.length}`);

    // Process each comment with attachments
    for (const { comment, urls } of commentsWithAttachments) {
      try {
        const bodyHtml = await getCommentHtml(rest, owner, repo, comment);

        if (!bodyHtml) {
          const id = getCommentId(comment);
          console.warn(`No HTML body found for ${comment.type} ${id}`);
          continue;
        }

        console.log(`Processing ${urls.length} attachment(s) for ${comment.type}`);

        // Extract signed URLs from HTML - handle multiple possible patterns
        const signedUrlPatterns = [
          /https:\/\/private-user-images\.githubusercontent\.com\/[^"'>\s]+\?jwt=[^"'>\s]+/g,
          /https:\/\/github\.com\/user-attachments\/files\/[^"'>\s]+/g,
          /https:\/\/user-images\.githubusercontent\.com\/[^"'>\s]+/g,
          /https:\/\/github\.com\/user-attachments\/assets\/[^"'>\s]+/g
        ];

        const allSignedUrls: string[] = [];
        for (const pattern of signedUrlPatterns) {
          const matches = bodyHtml.match(pattern) || [];
          allSignedUrls.push(...matches);
        }

        console.log(`Found ${allSignedUrls.length} signed URLs`);

        // Download each attachment
        for (let i = 0; i < urls.length; i++) {
          const originalUrl = urls[i];

          if (!originalUrl) continue;

          // Check if we've already downloaded this URL
          if (urlToPathMap.has(originalUrl)) {
            console.log(`Already downloaded: ${originalUrl}`);
            continue;
          }

          // Get file extension and type
          const extension = getFileExtension(originalUrl);
          const fileType = categoriseFile(extension);

          // Check if file type/extension is allowed
          if (allowedExtensions && !allowedExtensions.includes(extension)) {
            console.log(`Skipping ${originalUrl} - extension ${extension} not allowed`);
            continue;
          }

          if (allowedFileTypes && !allowedFileTypes.includes(fileType)) {
            console.log(`Skipping ${originalUrl} - file type ${fileType} not allowed`);
            continue;
          }

          // Find matching signed URL
          let signedUrl = allSignedUrls[i];
          if (!signedUrl && allSignedUrls.length > 0) {
            // Try to find a matching signed URL by file ID or use first available
            signedUrl = findMatchingSignedUrl(originalUrl, allSignedUrls) || allSignedUrls[0];
          }

          if (!signedUrl) {
            console.warn(`No signed URL found for ${originalUrl}, trying direct download...`);
            signedUrl = originalUrl;
          }

          const filename = generateFilename(originalUrl, i, extension, fileType);
          const localPath = path.join(downloadsDir, filename);

          try {
            console.log(`Downloading ${fileType} file: ${originalUrl}...`);

            const response = await fetch(signedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; GitHub-Attachment-Downloader/1.0)',
                'Accept': '*/*',
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Check file size
            const contentLength = response.headers.get('content-length');
            if (contentLength && parseInt(contentLength) > maxFileSize) {
              throw new Error(`File too large: ${contentLength} bytes (max: ${maxFileSize} bytes)`);
            }

            const arrayBuffer = await response.arrayBuffer();

            // Double-check size after download
            if (arrayBuffer.byteLength > maxFileSize) {
              throw new Error(`File too large: ${arrayBuffer.byteLength} bytes (max: ${maxFileSize} bytes)`);
            }

            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(localPath, buffer);

            console.log(`✓ Saved: ${localPath} (${arrayBuffer.byteLength} bytes)`);

            urlToPathMap.set(originalUrl, localPath);

            const downloadedFile: DownloadedFile = {
              originalUrl,
              localPath,
              filename,
              fileType,
              extension,
              size: arrayBuffer.byteLength,
              downloadedAt: new Date()
            };

            downloadedFiles.push(downloadedFile);

            console.log(`✓ Downloaded ${fileType} file: ${filename}`);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`✗ Failed to download ${originalUrl}: ${errorMessage}`);
            errors.push({ url: originalUrl, error: errorMessage });
          }
        }
      } catch (error) {
        const id = getCommentId(comment);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Failed to process attachments for ${comment.type} ${id}: ${errorMessage}`);
        errors.push({ url: `${comment.type}:${id}`, error: errorMessage });
      }
    }

    console.log(`Download complete: ${downloadedFiles.length} files, ${errors.length} errors`);
    console.log(`Final URL to path map size: ${urlToPathMap.size}`);

    // Log file type summary
    const fileTypeCounts = downloadedFiles.reduce((acc, file) => {
      acc[file.fileType] = (acc[file.fileType] || 0) + 1;
      return acc;
    }, {} as Record<FileType, number>);

    console.log('Downloaded file types:', fileTypeCounts);

    return {
      urlToPathMap,
      downloadedFiles,
      errors
    };

  } catch (error) {
    console.error('Error in downloadCommentAttachments:', error);
    return {
      urlToPathMap,
      downloadedFiles,
      errors: [{ url: 'general', error: error instanceof Error ? error.message : String(error) }]
    };
  }
}

async function getCommentHtml(
  rest: Octokit,
  owner: string,
  repo: string,
  comment: CommentWithAttachments
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

function getFileExtension(url: string): string {
  try {
    // Handle GitHub asset URLs which might have UUIDs
    const urlParts = url.split("/");
    const filename = urlParts[urlParts.length - 1];

    if (!filename) {
      return ".bin"; // Binary fallback
    }

    // Try to extract extension from filename
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    if (match && match[1]) {
      return `.${match[1].toLowerCase()}`;
    }

    // If no extension found, default to .bin
    return ".bin";
  } catch (error) {
    console.warn(`Error getting extension for ${url}:`, error);
    return ".bin";
  }
}

function categoriseFile(extension: string): FileType {
  const ext = extension.toLowerCase();

  for (const [category, extensions] of Object.entries(FILE_TYPE_CATEGORIES)) {
    if (extensions.includes(ext)) {
      return category as FileType;
    }
  }

  return 'other';
}

function generateFilename(originalUrl: string, index: number, extension: string, fileType: FileType): string {
  const timestamp = Date.now();
  const urlHash = originalUrl.split('/').pop()?.substring(0, 8) || 'unknown';
  return `${fileType}-${urlHash}-${timestamp}-${index}${extension}`;
}

function findMatchingSignedUrl(originalUrl: string, signedUrls: string[]): string | null {
  // Try to match by extracting the asset ID from both URLs
  const originalAssetId = extractAssetId(originalUrl);
  if (!originalAssetId) return null;

  for (const signedUrl of signedUrls) {
    const signedAssetId = extractAssetId(signedUrl);
    if (signedAssetId && signedAssetId === originalAssetId) {
      return signedUrl;
    }
  }

  return null;
}

function extractAssetId(url: string): string | null {
  // GitHub asset URLs typically have UUIDs in them
  const uuidMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
  if (uuidMatch && uuidMatch[1]) {
    return uuidMatch[1];
  }

  // Fallback: use last part of path
  const pathParts = url.split('/');
  return pathParts[pathParts.length - 1] || null;
}

// Backwards compatibility - keep the old function name as an alias
export async function downloadCommentImages(
  rest: Octokit,
  owner: string,
  repo: string,
  comments: CommentWithAttachments[],
): Promise<Map<string, string>> {
  const result = await downloadCommentAttachments(rest, owner, repo, comments, {
    allowedFileTypes: ['images'] // Only download image files for backwards compatibility
  });
  return result.urlToPathMap;
}
