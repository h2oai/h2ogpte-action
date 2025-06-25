import { describe, test, expect } from "bun:test";
import {
  getAllEventsInOrder,
  replaceAttachmentUrlsWithLocalPaths,
} from "../src/core/data/formatter";
import { mockFetchDataResult } from "./resources/test-data";
import type { GitHubPullRequest } from "../src/core/data/queries/types";

describe("getAllEventsInOrder", () => {
  test("should return events in chronological order for PR", () => {
    const events = getAllEventsInOrder(mockFetchDataResult, true);

    // Should have 8 events: 2 commits + 2 comments + 2 reviews + 2 review comments
    expect(events).toHaveLength(8);

    // Check chronological order
    const timestamps = events.map((event) =>
      new Date(event.createdAt).getTime(),
    );
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));

    // Check event types
    const eventTypes = events.map((event) => event.type);
    expect(eventTypes).toContain("commit");
    expect(eventTypes).toContain("comment");
    expect(eventTypes).toContain("review");
    expect(eventTypes).toContain("review_comment");

    // Check specific events
    const firstCommit = events.find(
      (event) => event.type === "commit" && event.body === "First commit",
    );
    expect(firstCommit).toBeDefined();
    expect(firstCommit?.createdAt).toBe("2025-06-24T07:14:46Z");

    const firstComment = events.find(
      (event) =>
        event.type === "comment" && event.body === "This is comment #1",
    );
    expect(firstComment).toBeDefined();
    expect(firstComment?.createdAt).toBe("2025-06-24T07:16:09Z");
  });

  test("should handle PR with no events", () => {
    const emptyPR = {
      ...mockFetchDataResult,
      contextData: {
        ...mockFetchDataResult.contextData,
        commits: { totalCount: 0, nodes: [] },
        comments: { nodes: [] },
        reviews: { nodes: [] },
      },
    };

    const events = getAllEventsInOrder(emptyPR, true);
    expect(events).toHaveLength(0);
  });

  test("should handle issue data (non-PR)", () => {
    const issueData = {
      ...mockFetchDataResult,
      contextData: {
        title: "Test Issue",
        body: "This is a test issue",
        author: { login: "testuser", name: "Test User" },
        createdAt: "2025-06-24T07:00:00Z",
        state: "OPEN",
        comments: {
          nodes: [
            {
              id: "issue_comment1",
              databaseId: "1",
              body: "Issue comment",
              createdAt: "2025-06-24T07:16:09Z",
              author: { login: "user1", name: "User One" },
            },
          ],
        },
      },
    };

    const events = getAllEventsInOrder(issueData, false);

    // Should only have comments (no commits or reviews for issues)
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("comment");
    expect(events[0]?.body).toBe("Issue comment");
  });

  test("should handle events with missing timestamps", () => {
    const dataWithMissingTimestamps = {
      ...mockFetchDataResult,
      contextData: {
        ...mockFetchDataResult.contextData,
        comments: {
          nodes: [
            {
              id: "comment1",
              databaseId: "1",
              body: "Comment without timestamp",
              createdAt: null,
              author: { login: "user1", name: "User One" },
            },
            {
              id: "comment2",
              databaseId: "2",
              body: "Comment with timestamp",
              createdAt: "2025-06-24T07:16:09Z",
              author: { login: "user2", name: "User Two" },
            },
          ],
        },
      } as GitHubPullRequest,
    };

    const events = getAllEventsInOrder(dataWithMissingTimestamps, true);

    // Events with timestamps should come before those without
    const eventsWithTimestamps = events.filter((event) => event.createdAt);
    const eventsWithoutTimestamps = events.filter((event) => !event.createdAt);

    expect(eventsWithTimestamps.length).toBeGreaterThan(0);
    expect(eventsWithoutTimestamps.length).toBeGreaterThan(0);
  });
});

describe("replaceAttachmentUrlsWithLocalPaths", () => {
  test("should replace single attachment URL with filename", () => {
    const attachmentUrlMap = new Map([
      [
        "https://github.com/user-attachments/assets/1eb4f910-758a-4824-819e-f1fb801ce948",
        "/tmp/github-attachments/images-1eb4f910-1750826249410-0.png",
      ],
    ]);

    const input =
      "Check this image: ![screenshot](https://github.com/user-attachments/assets/1eb4f910-758a-4824-819e-f1fb801ce948)";
    const expected =
      "Check this image: ![screenshot](images-1eb4f910-1750826249410-0.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should replace multiple attachment URLs", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/image1.png", "/path/to/file1.png"],
      ["https://example.com/image2.jpg", "/path/to/file2.jpg"],
    ]);

    const input =
      "Image 1: ![img1](https://example.com/image1.png) and Image 2: ![img2](https://example.com/image2.jpg)";
    const expected =
      "Image 1: ![img1](file1.png) and Image 2: ![img2](file2.jpg)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle text with no attachment URLs", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/image.png", "/path/to/file.png"],
    ]);

    const input = "This text has no attachments";
    const expected = "This text has no attachments";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle empty attachment map", () => {
    const attachmentUrlMap = new Map<string, string>();

    const input =
      "This text has an image: ![img](https://example.com/image.png)";
    const expected =
      "This text has an image: ![img](https://example.com/image.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle paths with no file extension", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/file", "/path/to/filename"],
    ]);

    const input = "File: ![file](https://example.com/file)";
    const expected = "File: ![file](filename)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle multiple occurrences of the same URL", () => {
    const attachmentUrlMap = new Map([
      ["https://example.com/image.png", "/path/to/file.png"],
    ]);

    const input =
      "Same image twice: ![img1](https://example.com/image.png) and ![img2](https://example.com/image.png)";
    const expected =
      "Same image twice: ![img1](file.png) and ![img2](file.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should handle special characters in URLs", () => {
    const attachmentUrlMap = new Map([
      [
        "https://example.com/image%20with%20spaces.png",
        "/path/to/file with spaces.png",
      ],
    ]);

    const input =
      "Image: ![img](https://example.com/image%20with%20spaces.png)";
    const expected = "Image: ![img](file with spaces.png)";

    const result = replaceAttachmentUrlsWithLocalPaths(input, attachmentUrlMap);
    expect(result).toBe(expected);
  });

  test("should use mock data attachment URLs", () => {
    const input =
      "Check these attachments: ![img1](https://github.com/user-attachments/assets/1eb4f910-758a-4824-819e-f1fb801ce948) and ![doc](https://github.com/user-attachments/assets/2abc123-def4-5678-90ab-cdef12345678)";
    const expected =
      "Check these attachments: ![img1](images-1eb4f910-1750826249410-0.png) and ![doc](document-2abc123-1750826249411.pdf)";

    const result = replaceAttachmentUrlsWithLocalPaths(
      input,
      mockFetchDataResult.attachmentUrlMap,
    );
    expect(result).toBe(expected);
  });
});
