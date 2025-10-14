import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
  mock,
} from "bun:test";

// Mock the dependencies first, before any imports
const mockConstants = {
  AGENT_GITHUB_ENV_VAR: "GITHUB_PAT_TMP",
};

const mockUtils = {
  getGithubApiUrl: () => "https://api.github.com",
};

const mockFormatter = {
  buildEventsText: jest.fn(() => "Mock events text"),
};

// Note: We don't mock url-replace globally to avoid interfering with other tests

const mockInstruction = {
  extractInstruction: jest.fn(),
  extractIdNumber: jest.fn(),
  extractPRReviewCommentDetails: jest.fn(),
  extractHeadBranch: jest.fn(),
  extractBaseBranch: jest.fn(),
};

const mockContext = {
  isPRIssueEvent: jest.fn(),
  isPullRequestReviewCommentEvent: jest.fn(),
};

// Mock the modules before importing the actual module
mock.module("../../src/constants", () => mockConstants);
mock.module("../../src/core/utils", () => mockUtils);
mock.module("../../src/core/response/utils/formatter", () => mockFormatter);
// Note: We don't mock url-replace globally to avoid interfering with other tests
mock.module("../../src/core/response/utils/instruction", () => mockInstruction);
mock.module("../../src/core/data/context", () => mockContext);

// Now import the module under test
import { createAgentInstructionPrompt } from "../../src/core/response/prompt";
import type { ParsedGitHubContext } from "../../src/core/services/github/types";
import type { FetchDataResult } from "../../src/core/data/fetcher";
import type { PullRequestEvent } from "@octokit/webhooks-types";

describe("createAgentInstructionPrompt", () => {
  let originalEnv: Record<string, string | undefined>;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };

    // Reset all mocks
    jest.clearAllMocks();

    // Set default mock implementations
    mockContext.isPRIssueEvent.mockReturnValue(false);
    mockContext.isPullRequestReviewCommentEvent.mockReturnValue(false);
    mockInstruction.extractInstruction.mockReturnValue("");
    mockInstruction.extractIdNumber.mockReturnValue(undefined);
    mockInstruction.extractHeadBranch.mockReturnValue(undefined);
    mockInstruction.extractBaseBranch.mockReturnValue(undefined);
    mockInstruction.extractPRReviewCommentDetails.mockReturnValue(undefined);
    mockFormatter.buildEventsText.mockReturnValue("Mock events text");
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });

  describe("basic prompt generation", () => {
    test("should generate basic prompt wrapper when not a PR issue event", () => {
      const context = createMockContext();
      const result = createAgentInstructionPrompt(context, undefined);

      expect(result).toContain("You're h2oGPTe an AI Agent");
      expect(result).toContain("GITHUB_PAT_TMP");
      expect(result).toContain("https://api.github.com");
      expect(result).toContain("test-owner/test-repo");
    });

    test("should apply basic replacements from constants and utils", () => {
      const context = createMockContext();
      const githubData = createMockGithubData();

      mockInstruction.extractInstruction.mockReturnValue("Test instruction");
      mockInstruction.extractIdNumber.mockReturnValue(123);
      mockInstruction.extractHeadBranch.mockReturnValue("feature-branch");
      mockInstruction.extractBaseBranch.mockReturnValue("main");
      mockFormatter.buildEventsText.mockReturnValue("Event 1\nEvent 2");

      const result = createAgentInstructionPrompt(context, githubData);

      // Check that the basic replacements are applied
      expect(result).toContain("GITHUB_PAT_TMP");
      expect(result).toContain("https://api.github.com");
      expect(result).toContain("test-owner/test-repo");
    });

    test("should handle undefined values in replacements", () => {
      const context = createMockContext();

      mockInstruction.extractInstruction.mockReturnValue(undefined);
      mockInstruction.extractIdNumber.mockReturnValue(undefined);
      mockInstruction.extractHeadBranch.mockReturnValue(undefined);
      mockInstruction.extractBaseBranch.mockReturnValue(undefined);

      const result = createAgentInstructionPrompt(context, undefined);

      // The basic replacements should still work
      expect(result).toContain("GITHUB_PAT_TMP");
      expect(result).toContain("https://api.github.com");
      expect(result).toContain("test-owner/test-repo");
    });
  });

  describe("PR issue event with @h2ogpte instruction", () => {
    test("should generate specialized prompt for PR issue event with @h2ogpte", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please review this code",
      );

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain(
        "Developers interact with you by adding @h2ogpte",
      );
      expect(result).toContain("What you CANNOT do under any circumstances");
      // Note: We can't easily test the url-replace function call without mocking it globally
      // which would interfere with other tests. The function is tested separately in url-replace.test.ts
    });

    test("should generate PR-specific prompt sections when isPR is true", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please review this PR",
      );
      mockInstruction.extractIdNumber.mockReturnValue(456);
      mockInstruction.extractHeadBranch.mockReturnValue("feature-branch");
      mockInstruction.extractBaseBranch.mockReturnValue("main");

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain("pull request number 456");
      expect(result).toContain('head branch is "feature-branch"');
      expect(result).toContain('base branch is "main"');
      expect(result).toContain("pull request");
    });

    test("should generate issue-specific prompt sections when isPR is false", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please help with this issue",
      );

      const context = createMockContext({ isPR: false });
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain("create a new branch and pull request");
      expect(result).toContain("link the pull request to the issue");
      expect(result).toContain("issue");
    });
  });

  describe("PR review comment event handling", () => {
    test("should include PR review comment details when applicable", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockContext.isPullRequestReviewCommentEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte review this change",
      );
      mockInstruction.extractIdNumber.mockReturnValue(789);
      mockInstruction.extractPRReviewCommentDetails.mockReturnValue({
        commitId: "abc123",
        fileRelativePath: "src/file.ts",
        diffHunk: "@@ -1,3 +1,3 @@\n-old code\n+new code",
      });

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain("commit id, 789");
      expect(result).toContain("relative file path, src/file.ts");
      expect(result).toContain(
        "diff hunk that you must focus on @@ -1,3 +1,3 @@",
      );
    });

    test("should handle missing PR review comment details", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockContext.isPullRequestReviewCommentEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte review this change",
      );
      mockInstruction.extractPRReviewCommentDetails.mockReturnValue(undefined);

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain("commit id,");
      expect(result).not.toContain("diff hunk that you must focus on");
    });

    test("should handle missing diff hunk in PR review comment details", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockContext.isPullRequestReviewCommentEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte review this change",
      );
      mockInstruction.extractPRReviewCommentDetails.mockReturnValue({
        commitId: "abc123",
        fileRelativePath: "src/file.ts",
        diffHunk: undefined,
      });

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).not.toContain("diff hunk that you must focus on");
    });
  });

  describe("prompt structure validation", () => {
    test("should include required sections in specialized prompt", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please help",
      );

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain("## ⚡️ TL;DR");
      expect(result).toContain("## 🔎 [Context-Specific Analysis]");
      expect(result).toContain("## 🎯 Next Steps (if any)");
      expect(result).toContain(
        "Here are the previous events in chronological order",
      );
    });

    test("should include GitHub referencing instructions", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please help",
      );

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain("GitHub referencing (e.g. #23)");
      expect(result).toContain("Don't respond with the literal link");
    });

    test("should include context reading instructions", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please help",
      );

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      expect(result).toContain("First read the previous events");
      expect(result).toContain("Then read the user's instruction");
      expect(result).toContain("Then read the code in the repository");
    });
  });

  describe("attachment URL replacement", () => {
    test("should generate specialized prompt that includes attachment URL replacement", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please help",
      );

      const context = createMockContext();
      const githubData = createMockGithubData();
      const mockAttachmentUrlMap = new Map([["url1", "path1"]]);
      githubData.attachmentUrlMap = mockAttachmentUrlMap;

      const result = createAgentInstructionPrompt(context, githubData);

      // Verify the specialized prompt is generated (which internally calls url-replace)
      expect(result).toContain(
        "Developers interact with you by adding @h2ogpte",
      );
      // Note: The actual url-replace functionality is tested in url-replace.test.ts
    });

    test("should generate basic prompt without attachment URL replacement", () => {
      mockContext.isPRIssueEvent.mockReturnValue(false);

      const context = createMockContext();
      const result = createAgentInstructionPrompt(context, undefined);

      // Verify basic prompt is generated (which doesn't call url-replace)
      expect(result).toContain("You're h2oGPTe an AI Agent");
      expect(result).not.toContain(
        "Developers interact with you by adding @h2ogpte",
      );
    });
  });

  describe("edge cases", () => {
    test("should handle missing githubData for PR issue event", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "@h2ogpte please help",
      );

      const context = createMockContext();
      const result = createAgentInstructionPrompt(context, undefined);

      // Should fall back to basic prompt wrapper
      expect(result).toContain("You're h2oGPTe an AI Agent");
      expect(result).not.toContain(
        "Developers interact with you by adding @h2ogpte",
      );
    });

    test("should handle instruction without @h2ogpte", () => {
      mockContext.isPRIssueEvent.mockReturnValue(true);
      mockInstruction.extractInstruction.mockReturnValue(
        "Please review this code",
      );

      const context = createMockContext();
      const githubData = createMockGithubData();

      const result = createAgentInstructionPrompt(context, githubData);

      // Should fall back to basic prompt wrapper
      expect(result).toContain("You're h2oGPTe an AI Agent");
      expect(result).not.toContain(
        "Developers interact with you by adding @h2ogpte",
      );
    });

    test("should handle multiple placeholder replacements in basic prompt", () => {
      const context = createMockContext();
      const result = createAgentInstructionPrompt(context, undefined);

      // Check that the basic placeholders are replaced
      expect(result).toContain("test-owner/test-repo");
      expect(result).toContain("https://api.github.com");
    });
  });

  // Helper functions to create mock data
  function createMockContext(
    overrides: Partial<ParsedGitHubContext> = {},
  ): ParsedGitHubContext {
    return {
      runId: "123456",
      eventName: "pull_request",
      eventAction: "opened",
      repository: {
        owner: "test-owner",
        repo: "test-repo",
        full_name: "test-owner/test-repo",
      },
      actor: "test-user",
      entityNumber: 1,
      isPR: true,
      payload: createMockPullRequestEvent(),
      ...overrides,
    };
  }

  function createMockGithubData(): FetchDataResult {
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      contextData: {} as any,
      comments: [],
      changedFiles: [],
      changedFilesWithSHA: [],
      reviewData: null,
      attachmentUrlMap: new Map(),
      triggerDisplayName: "test-user",
      branchInfo: {
        headBranch: "feature-branch",
        baseBranch: "main",
      },
    };
  }

  function createMockPullRequestEvent(): PullRequestEvent {
    return {
      action: "opened",
      pull_request: {
        number: 1,
        body: "Test PR body",
        head: {
          ref: "feature-branch",
          sha: "abc123",
        },
        base: {
          ref: "main",
          sha: "def456",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      repository: {
        full_name: "test-owner/test-repo",
        name: "test-repo",
        owner: {
          login: "test-owner",
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    } as PullRequestEvent;
  }
});
