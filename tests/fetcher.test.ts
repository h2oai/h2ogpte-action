/**
 * Unit tests for fetchGitHubData function
 *
 * Focus: Error handling, edge cases, and validation logic
 * Note: Happy path data fetching scenarios should be covered by integration tests
 * that use real GitHub APIs and repositories.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  mock,
  spyOn,
  test,
} from "bun:test";

// Mock child_process module
mock.module("child_process", () => ({
  execSync: jest.fn(),
}));

import { graphql } from "@octokit/graphql";
import { execSync } from "child_process";
import {
  fetchGitHubData,
  fetchUserDisplayName,
} from "../src/core/data/fetcher";
import type {
  IssueQueryResponse,
  PullRequestQueryResponse,
} from "../src/core/data/queries/types";
import type { Octokits } from "../src/core/services/github/octokits";

describe("fetchGitHubData", () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let execSyncSpy: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */

  beforeEach(() => {
    // Set up environment variables required for tests
    process.env.GITHUB_SERVER_URL = "https://github.com";
    process.env.GITHUB_TOKEN = "mock-token";
    process.env.GITHUB_API_URL = "https://api.github.com";
    process.env.GITHUB_RUN_ID = "123456789";
    process.env.GITHUB_REPOSITORY = "owner/repo";

    // Spy on console methods
    consoleLogSpy = spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
    consoleErrorSpy = spyOn(console, "error").mockImplementation(() => {});

    // Spy on external dependencies
    execSyncSpy = spyOn({ execSync }, "execSync");
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    execSyncSpy.mockRestore();
  });

  const createMockOctokits = (): Octokits => {
    return {
      graphql: jest.fn(),
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

  test("should throw error for invalid repository format", async () => {
    const mockOctokits = createMockOctokits();

    expect(
      fetchGitHubData({
        octokits: mockOctokits,
        repository: "invalid-repo-format",
        prNumber: "42",
        isPR: true,
      }),
    ).rejects.toThrow("Invalid repository format. Expected 'owner/repo'.");
  });

  // Note: Happy path tests (successful data fetching) should be covered by integration tests

  test("should handle PR not found", async () => {
    const mockOctokits = createMockOctokits();
    const mockPRResponse = {
      repository: {
        pullRequest: null,
      },
    } as unknown as PullRequestQueryResponse;

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest.fn().mockResolvedValue(mockPRResponse);

    await expect(
      fetchGitHubData({
        octokits: mockOctokits,
        repository: "owner/repo",
        prNumber: "42",
        isPR: true,
      }),
    ).rejects.toThrow("Failed to fetch PR data");
  });

  test("should handle issue not found", async () => {
    const mockOctokits = createMockOctokits();
    const mockIssueResponse = {
      repository: {
        issue: null,
      },
    } as unknown as IssueQueryResponse;

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest.fn().mockResolvedValue(mockIssueResponse);

    await expect(
      fetchGitHubData({
        octokits: mockOctokits,
        repository: "owner/repo",
        prNumber: "42",
        isPR: false,
      }),
    ).rejects.toThrow("Failed to fetch issue data");
  });

  test("should handle GraphQL API errors", async () => {
    const mockOctokits = createMockOctokits();

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest
      .fn()
      .mockRejectedValue(new Error("API rate limit exceeded"));

    await expect(
      fetchGitHubData({
        octokits: mockOctokits,
        repository: "owner/repo",
        prNumber: "42",
        isPR: true,
      }),
    ).rejects.toThrow("Failed to fetch PR data");

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to fetch PR data:",
      expect.any(Error),
    );
  });

  test("should compute SHA for added/modified files", async () => {
    const mockOctokits = createMockOctokits();
    const mockPRResponse: PullRequestQueryResponse = {
      repository: {
        pullRequest: {
          id: "PR_123",
          databaseId: 123,
          number: 42,
          title: "Test PR",
          body: "Test body",
          state: "OPEN",
          files: {
            nodes: [
              {
                path: "src/new-file.ts",
                changeType: "ADDED",
                additions: 50,
                deletions: 0,
              },
            ],
          },
          comments: { nodes: [] },
          reviews: { nodes: [] },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    };

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest.fn().mockResolvedValue(mockPRResponse);

    // Mock successful SHA computation
    execSyncSpy.mockReturnValue("abc123def456\n");
    consoleWarnSpy.mockRestore();
    const result = await fetchGitHubData({
      octokits: mockOctokits,
      repository: "owner/repo",
      prNumber: "42",
      isPR: true,
    });

    expect(result.changedFilesWithSHA[0]).toEqual({
      path: "src/new-file.ts",
      changeType: "ADDED",
      additions: 50,
      deletions: 0,
      sha: "abc123def456",
    });

    expect(execSyncSpy).toHaveBeenCalledWith(
      'git hash-object "src/new-file.ts"',
      { encoding: "utf-8" },
    );
  });

  test("should handle deleted files without computing SHA", async () => {
    const mockOctokits = createMockOctokits();
    const mockPRResponse: PullRequestQueryResponse = {
      repository: {
        pullRequest: {
          id: "PR_123",
          databaseId: 123,
          number: 42,
          title: "Test PR",
          body: "Test body",
          state: "OPEN",
          files: {
            nodes: [
              {
                path: "deleted-file.ts",
                changeType: "DELETED",
                additions: 0,
                deletions: 20,
              },
            ],
          },
          comments: { nodes: [] },
          reviews: { nodes: [] },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    };

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest.fn().mockResolvedValue(mockPRResponse);

    const result = await fetchGitHubData({
      octokits: mockOctokits,
      repository: "owner/repo",
      prNumber: "42",
      isPR: true,
    });

    expect(result.changedFilesWithSHA[0]).toEqual({
      path: "deleted-file.ts",
      changeType: "DELETED",
      additions: 0,
      deletions: 20,
      sha: "deleted",
    });

    // Should not call git hash-object for deleted files
    expect(execSyncSpy).not.toHaveBeenCalled();
  });

  test("should handle SHA computation failure gracefully", async () => {
    const mockOctokits = createMockOctokits();
    const mockPRResponse: PullRequestQueryResponse = {
      repository: {
        pullRequest: {
          id: "PR_123",
          databaseId: 123,
          number: 42,
          title: "Test PR",
          body: "Test body",
          state: "OPEN",
          files: {
            nodes: [
              {
                path: "src/test.ts",
                changeType: "MODIFIED",
                additions: 10,
                deletions: 5,
              },
            ],
          },
          comments: { nodes: [] },
          reviews: { nodes: [] },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    };

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest.fn().mockResolvedValue(mockPRResponse);

    // Mock execSync to throw an error
    execSyncSpy.mockImplementation(() => {
      throw new Error("git command failed");
    });

    const result = await fetchGitHubData({
      octokits: mockOctokits,
      repository: "owner/repo",
      prNumber: "42",
      isPR: true,
    });

    expect(result.changedFilesWithSHA[0]).toEqual({
      path: "src/test.ts",
      changeType: "MODIFIED",
      additions: 10,
      deletions: 5,
      sha: "unknown",
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to compute SHA for src/test.ts:",
      expect.any(Error),
    );
  });

  test("should handle empty comments and files", async () => {
    const mockOctokits = createMockOctokits();
    const mockPRResponse: PullRequestQueryResponse = {
      repository: {
        pullRequest: {
          id: "PR_123",
          databaseId: 123,
          number: 42,
          title: "Test PR",
          body: null,
          state: "OPEN",
          files: { nodes: [] },
          comments: { nodes: [] },
          reviews: { nodes: [] },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      },
    };

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest.fn().mockResolvedValue(mockPRResponse);

    const result = await fetchGitHubData({
      octokits: mockOctokits,
      repository: "owner/repo",
      prNumber: "42",
      isPR: true,
    });

    expect(result.comments).toEqual([]);
    expect(result.changedFiles).toEqual([]);
    expect(result.changedFilesWithSHA).toEqual([]);
    expect(result.reviewData).toEqual({ nodes: [] });
  });

  test("should handle null/undefined comment nodes", async () => {
    const mockOctokits = createMockOctokits();
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const mockPRResponse: PullRequestQueryResponse = {
      repository: {
        pullRequest: {
          id: "PR_123",
          databaseId: 123,
          number: 42,
          title: "Test PR",
          body: "Test body",
          state: "OPEN",
          files: { nodes: [] },
          comments: null as any,
          reviews: null as any,
        } as any,
      },
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // @ts-expect-error Mock implementation doesn't match full type signature
    mockOctokits.graphql = jest.fn().mockResolvedValue(mockPRResponse);

    const result = await fetchGitHubData({
      octokits: mockOctokits,
      repository: "owner/repo",
      prNumber: "42",
      isPR: true,
    });

    expect(result.comments).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(result.reviewData).toEqual([] as any);
  });
});

describe("fetchUserDisplayName", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  test("should return null when user has no display name", async () => {
    const mockGraphql = jest.fn().mockResolvedValue({
      user: {
        name: null,
      },
    }) as unknown as typeof graphql;

    const result = await fetchUserDisplayName(mockGraphql, "johndoe");

    expect(result).toBeNull();
  });

  test("should handle GraphQL errors gracefully", async () => {
    const mockGraphql = jest
      .fn()
      .mockRejectedValue(
        new Error("User not found"),
      ) as unknown as typeof graphql;

    const result = await fetchUserDisplayName(mockGraphql, "nonexistent");

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "Failed to fetch user display name for nonexistent:",
      expect.any(Error),
    );
  });
});
