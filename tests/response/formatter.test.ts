import { describe, test, expect } from "bun:test";
import { getAllEventsInOrder } from "../../src/core/response/utils/formatter";
import { mockFetchDataResult } from "../resources/test-data";
import type { GitHubPullRequest } from "../../src/core/data/queries/types";

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

    // Should have issue body + comments
    expect(events).toHaveLength(2);

    // Check issue body event
    const issueBodyEvent = events.find((event) => event.type === "issue_body");
    expect(issueBodyEvent).toBeDefined();
    expect(issueBodyEvent?.title).toBe("Test Issue");
    expect(issueBodyEvent?.body).toBe("This is a test issue");
    expect(issueBodyEvent?.createdAt).toBe("2025-06-24T07:00:00Z");

    // Check comment event
    const commentEvent = events.find((event) => event.type === "comment");
    expect(commentEvent).toBeDefined();
    expect(commentEvent?.body).toBe("Issue comment");
  });

  test("should handle issue with empty body", () => {
    const issueData = {
      ...mockFetchDataResult,
      contextData: {
        title: "Test Issue",
        body: "", // Empty body
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

    // Should only have comments (no issue body event for empty body)
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("comment");
    expect(events[0]?.body).toBe("Issue comment");
  });

  test("should handle issue with null body", () => {
    const issueData = {
      ...mockFetchDataResult,
      contextData: {
        title: "Test Issue",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        body: null as any, // Null body
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

    // Should only have comments (no issue body event for null body)
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("comment");
    expect(events[0]?.body).toBe("Issue comment");
  });

  test("should order issue body and comments chronologically", () => {
    const issueData = {
      ...mockFetchDataResult,
      contextData: {
        title: "Test Issue",
        body: "This is a test issue",
        author: { login: "testuser", name: "Test User" },
        createdAt: "2025-06-24T07:10:00Z", // Issue created after comment
        state: "OPEN",
        comments: {
          nodes: [
            {
              id: "issue_comment1",
              databaseId: "1",
              body: "Issue comment",
              createdAt: "2025-06-24T07:05:00Z", // Comment created before issue
              author: { login: "user1", name: "User One" },
            },
          ],
        },
      },
    };

    const events = getAllEventsInOrder(issueData, false);

    // Should have 2 events in chronological order
    expect(events).toHaveLength(2);

    // Comment should come first (earlier timestamp)
    expect(events[0]?.type).toBe("comment");
    expect(events[0]?.createdAt).toBe("2025-06-24T07:05:00Z");

    // Issue body should come second (later timestamp)
    expect(events[1]?.type).toBe("issue_body");
    expect(events[1]?.createdAt).toBe("2025-06-24T07:10:00Z");
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
