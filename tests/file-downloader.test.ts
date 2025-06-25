/**
 * Adapted from: https://github.com/anthropics/claude-code-action/blob/main/test/image-downloader.test.ts
 * Original author: Anthropic
 * License: MIT
 */

import {
  describe,
  test,
  expect,
  spyOn,
  beforeEach,
  afterEach,
  jest,
  setSystemTime,
} from "bun:test";
import fs from "fs/promises";
import { downloadCommentAttachments } from "../src/core/data/utils/file-downloader";
import type { CommentWithAttachments } from "../src/core/data/utils/file-downloader";
import type { Octokits } from "../src/core/services/github/octokits";

describe("downloadCommentAttachments", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let fsMkdirSpy: any;
  let fsWriteFileSpy: any;
  let fetchSpy: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  beforeEach(() => {
    // Spy on console methods
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    // Spy on fs methods
    fsMkdirSpy = spyOn(fs, "mkdir").mockResolvedValue(undefined);
    fsWriteFileSpy = spyOn(fs, "writeFile").mockResolvedValue(undefined);

    // Set fake system time for consistent filenames
    setSystemTime(new Date("2024-01-01T00:00:00.000Z")); // 1704067200000
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    fsMkdirSpy.mockRestore();
    fsWriteFileSpy.mockRestore();
    if (fetchSpy) fetchSpy.mockRestore();
    setSystemTime(); // Reset to real time
  });

  const createMockOctokit = (): Octokits => {
    return {
      rest: {
        issues: {
          getComment: jest.fn(),
          get: jest.fn(),
        },
        pulls: {
          getReviewComment: jest.fn(),
          getReview: jest.fn(),
          get: jest.fn(),
        },
      },
    } as any as Octokits; // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  test("should create download directory", async () => {
    const mockOctokit = createMockOctokit();
    const comments: CommentWithAttachments[] = [];

    await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(fsMkdirSpy).toHaveBeenCalledWith("/tmp/github-attachments", {
      recursive: true,
    });
  });

  test("should handle comments without attachments", async () => {
    const mockOctokit = createMockOctokit();
    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "123",
        body: "This is a comment without attachments",
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(result.size).toBe(0);
    expect(consoleLogSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Found"),
    );
  });

  test("should detect and download images from issue comments", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl =
      "https://github.com/user-attachments/assets/test-image.png";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/test.png?jwt=token";

    // Mock octokit response
    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl}">`,
      },
    });

    // Mock fetch for image download
    const mockArrayBuffer = new ArrayBuffer(8);
    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockArrayBuffer,
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "123",
        body: `Here's an image: ![test](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(mockOctokit.rest.issues.getComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      comment_id: 123,
      mediaType: { format: "full+json" },
    });

    expect(fetchSpy).toHaveBeenCalledWith(signedUrl);
    expect(fsWriteFileSpy).toHaveBeenCalledWith(
      "/tmp/github-attachments/images-test-ima-1704067200000-0.png",
      Buffer.from(mockArrayBuffer),
    );

    expect(result.size).toBe(1);
    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-test-ima-1704067200000-0.png",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Found 1 attachment(s) in issue_comment 123",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `Downloading image (images): https://github.com/user-attachments/assets/test-image.png...`,
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "✓ Downloaded image (images): images-test-ima-1704067200000-0.png",
    );
  });

  test("should detect and download HTML style image tags with attributes", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl =
      "https://github.com/user-attachments/assets/test-image.png";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/test.png?jwt=token";

    // Mock octokit response with HTML img tag containing attributes
    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img width="475" alt="Screenshot 2025-06-23 at 4 04 31 PM" src="${signedUrl}" />`,
      },
    });

    // Mock fetch for image download
    const mockArrayBuffer = new ArrayBuffer(8);
    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => mockArrayBuffer,
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "456",
        body: `Here's an image: <img width="475" alt="Screenshot 2025-06-23 at 4 04 31 PM" src="${imageUrl}" />`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(mockOctokit.rest.issues.getComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      comment_id: 456,
      mediaType: { format: "full+json" },
    });

    expect(fetchSpy).toHaveBeenCalledWith(signedUrl);
    expect(fsWriteFileSpy).toHaveBeenCalledWith(
      "/tmp/github-attachments/images-test-ima-1704067200000-0.png",
      Buffer.from(mockArrayBuffer),
    );

    expect(result.size).toBe(1);
    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-test-ima-1704067200000-0.png",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Found 1 attachment(s) in issue_comment 456",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `Downloading image (images): https://github.com/user-attachments/assets/test-image.png...`,
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "✓ Downloaded image (images): images-test-ima-1704067200000-0.png",
    );
  });

  test("should handle review comments", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl =
      "https://github.com/user-attachments/assets/review-image.jpg";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/review.jpg?jwt=token";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.pulls.getReviewComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "review_comment",
        id: "456",
        body: `Review comment with image: ![review](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(mockOctokit.rest.pulls.getReviewComment).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      comment_id: 456,
      mediaType: { format: "full+json" },
    });

    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-review-i-1704067200000-0.jpg",
    );
  });

  test("should handle review bodies", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl =
      "https://github.com/user-attachments/assets/review-body.png";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/body.png?jwt=token";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.pulls.getReview = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "review_body",
        id: "789",
        pullNumber: "100",
        body: `Review body: ![body](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(mockOctokit.rest.pulls.getReview).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      pull_number: 100,
      review_id: 789,
      mediaType: { format: "full+json" },
    });

    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-review-b-1704067200000-0.png",
    );
  });

  test("should handle issue bodies", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl =
      "https://github.com/user-attachments/assets/issue-body.gif";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/issue.gif?jwt=token";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.get = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_body",
        issueNumber: "200",
        body: `Issue description: ![issue](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(mockOctokit.rest.issues.get).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      issue_number: 200,
      mediaType: { format: "full+json" },
    });

    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-issue-bo-1704067200000-0.gif",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Found 1 attachment(s) in issue_body 200",
    );
  });

  test("should handle PR bodies", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl = "https://github.com/user-attachments/assets/pr-body.tiff";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/pr.tiff?jwt=token";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.pulls.get = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "pr_body",
        pullNumber: "300",
        body: `PR description: ![pr](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
      owner: "owner",
      repo: "repo",
      pull_number: 300,
      mediaType: { format: "full+json" },
    });

    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-pr-body.-1704067200000-0.tiff",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Found 1 attachment(s) in pr_body 300",
    );
  });

  test("should handle multiple attachment types in a single comment", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl = "https://github.com/user-attachments/assets/image.png";
    const fileUrl =
      "https://github.com/user-attachments/files/20805483/markdown.md";
    const signedUrl1 =
      "https://private-user-images.githubusercontent.com/image.png?jwt=token1";
    const signedUrl2 =
      "https://github.com/user-attachments/files/20805483/markdown.md";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl1}"><a href="${signedUrl2}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "999",
        body: `Two files: ![img](${imageUrl}) and [file](${fileUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.size).toBe(2);
    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-image.pn-1704067200000-0.png",
    );
    expect(result.get(fileUrl)).toBe(
      "/tmp/github-attachments/documents-markdown-1704067200000-1.md",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Found 2 attachment(s) in issue_comment 999",
    );
  });

  test("should skip already downloaded files", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl = "https://github.com/user-attachments/assets/duplicate.png";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/dup.png?jwt=token";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "111",
        body: `First: ![dup](${imageUrl})`,
      },
      {
        type: "issue_comment",
        id: "222",
        body: `Second: ![dup](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1); // Only downloaded once
    expect(result.size).toBe(1);
    expect(result.get(imageUrl)).toBe(
      "/tmp/github-attachments/images-duplicat-1704067200000-0.png",
    );
  });

  test("should handle missing HTML body", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl = "https://github.com/user-attachments/assets/missing.png";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: null,
      },
    });

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "333",
        body: `Missing HTML: ![missing](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(result.size).toBe(0);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "No HTML body found for issue_comment 333",
    );
  });

  test("should handle fetch errors", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl = "https://github.com/user-attachments/assets/error.png";
    const signedUrl =
      "https://private-user-images.githubusercontent.com/error.png?jwt=token";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "444",
        body: `Error image: ![error](${imageUrl})`,
      },
    ];

    // consoleErrorSpy.mockRestore(,

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(result.size).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `✗ Failed to download ${imageUrl}: HTTP 404: Not Found`,
    );
  });

  test("should handle API errors gracefully", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl = "https://github.com/user-attachments/assets/api-error.png";

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest
      .fn()
      .mockRejectedValue(new Error("API rate limit exceeded"));

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "555",
        body: `API error: ![api-error](${imageUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(result.size).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to process attachments for issue_comment 555: API rate limit exceeded",
    );
  });

  test("should handle mismatched signed URL count", async () => {
    const mockOctokit = createMockOctokit();
    const imageUrl1 = "https://github.com/user-attachments/assets/img1.png";
    const imageUrl2 = "https://github.com/user-attachments/assets/img2.png";
    const signedUrl1 =
      "https://private-user-images.githubusercontent.com/1.png?jwt=token";

    // Only one signed URL for two images
    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<img src="${signedUrl1}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "666",
        body: `Two images: ![img1](${imageUrl1}) ![img2](${imageUrl2})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(1);
    expect(result.get(imageUrl1)).toBe(
      "/tmp/github-attachments/images-img1.png-1704067200000-0.png",
    );
    expect(result.get(imageUrl2)).toBeUndefined();
  });

  test("should ignore unsupported file types", async () => {
    const mockOctokit = createMockOctokit();
    const fileUrl =
      "https://github.com/user-attachments/files/20805483/other.bin";
    const signedUrl1 = fileUrl;

    // Only one signed URL for two images
    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<a href="${signedUrl1}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "666",
        body: `One file: [other.bin](${fileUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(0);
    expect(result.size).toBe(0);
    expect(consoleLogSpy).toHaveBeenCalledWith(
      `Skipping ${fileUrl} - extension .bin unsupported`,
    );
  });

  test("should throw an error for files that are too large", async () => {
    const mockOctokit = createMockOctokit();
    const fileUrl =
      "https://github.com/user-attachments/files/20805483/data.csv";
    const signedUrl1 = fileUrl;

    // Only one signed URL for two images
    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokit.rest.issues.getComment = jest.fn().mockResolvedValue({
      data: {
        body_html: `<a href="${signedUrl1}">`,
      },
    });

    fetchSpy = spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
      headers: new Headers({ "content-length": "8" }),
    } as Response);

    const comments: CommentWithAttachments[] = [
      {
        type: "issue_comment",
        id: "666",
        body: `One file: [other.bin](${fileUrl})`,
      },
    ];

    const result = await downloadCommentAttachments(
      mockOctokit.rest,
      "owner",
      "repo",
      comments,
      { maxFileSize: 0 },
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.size).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      `✗ Failed to download ${fileUrl}: File too large: 8 bytes (max: 0 bytes)`,
    );
  });
});
