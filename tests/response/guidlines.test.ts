import { describe, expect, test } from "bun:test";
import { getGuidelinesFile } from "../../src/core/response/utils/guidlines";
import type { Octokit } from "@octokit/rest";
import type { ParsedGitHubContext } from "../../src/core/services/github/types";

// Helper function to create a fake Octokit that returns predefined responses
function createFakeOctokit(mockResponse: object): Octokit {
  return {
    rest: {
      repos: {
        getContent: async () => mockResponse,
      },
    },
  } as Octokit;
}

// Helper function to create a fake GitHub context
function createFakeContext(): ParsedGitHubContext {
  return {
    repository: {
      owner: "test-owner",
      repo: "test-repo",
    },
  } as ParsedGitHubContext;
}

describe("getGuidelinesFile", () => {
  test("should successfully decode and return file content", async () => {
    const content = "This is test content";
    const base64Content = Buffer.from(content).toString("base64");

    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        content: base64Content,
        size: content.length,
        encoding: "base64",
        name: "agents.md",
        path: "agents.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    const result = await getGuidelinesFile(octokit, "agents.md", context);

    expect(result).toBe(content);
  });

  test("should throw error when response is a directory (array)", async () => {
    const mockResponse = {
      status: 200,
      data: [
        { type: "file", name: "file1.md" },
        { type: "file", name: "file2.md" },
      ],
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    expect(async () => {
      await getGuidelinesFile(octokit, "some-dir", context);
    }).toThrow(
      "Expected a single file but got a directory listing for path 'some-dir'",
    );
  });

  test("should throw error when type is not file", async () => {
    const mockResponse = {
      status: 200,
      data: {
        type: "symlink",
        target: "other-file.md",
        name: "link.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    expect(async () => {
      await getGuidelinesFile(octokit, "link.md", context);
    }).toThrow("Expected a file but got type 'symlink' for path 'link.md'");
  });

  test("should throw error when content is missing", async () => {
    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        size: 100,
        name: "agents.md",
        path: "agents.md",
        // content is missing
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    expect(async () => {
      await getGuidelinesFile(octokit, "agents.md", context);
    }).toThrow("File content not found in response for path 'agents.md'");
  });

  test("should throw error when file size exceeds maximum limit", async () => {
    const maxFileSize = 50 * 1024 * 1024; // 50 MB
    const tooLargeSize = maxFileSize + 1;

    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        content: "dGVzdA==", // base64 for "test"
        size: tooLargeSize,
        encoding: "base64",
        name: "large-file.md",
        path: "large-file.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    expect(async () => {
      await getGuidelinesFile(octokit, "large-file.md", context);
    }).toThrow(
      `File size exceeds maximum limit of ${maxFileSize} bytes for path 'large-file.md'`,
    );
  });

  test("should handle file at exact maximum size limit", async () => {
    const maxFileSize = 50 * 1024 * 1024; // 50 MB
    const content = "Content at max size";
    const base64Content = Buffer.from(content).toString("base64");

    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        content: base64Content,
        size: maxFileSize, // Exactly at limit
        encoding: "base64",
        name: "max-size.md",
        path: "max-size.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    const result = await getGuidelinesFile(octokit, "max-size.md", context);

    expect(result).toBe(content);
  });

  test("should handle empty file content", async () => {
    const content = "";
    const base64Content = Buffer.from(content).toString("base64");

    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        content: base64Content,
        size: 0,
        encoding: "base64",
        name: "empty.md",
        path: "empty.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    const result = await getGuidelinesFile(octokit, "empty.md", context);

    expect(result).toBe("");
  });

  test("should handle file with special characters", async () => {
    const content = "Content with special chars: 你好世界 🎉 \n\t\r";
    const base64Content = Buffer.from(content).toString("base64");

    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        content: base64Content,
        size: Buffer.from(content).length,
        encoding: "base64",
        name: "special.md",
        path: "special.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    const result = await getGuidelinesFile(octokit, "special.md", context);

    expect(result).toBe(content);
  });

  test("should handle file in subdirectory path", async () => {
    const content = "Documentation content";
    const base64Content = Buffer.from(content).toString("base64");

    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        content: base64Content,
        size: content.length,
        encoding: "base64",
        name: "agents.md",
        path: "docs/guidelines/agents.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    const result = await getGuidelinesFile(
      octokit,
      "docs/guidelines/agents.md",
      context,
    );

    expect(result).toBe(content);
  });

  test("should handle multiline markdown content", async () => {
    const content = `# Guidelines

## Section 1
This is some content.

## Section 2
More content here.

- List item 1
- List item 2

\`\`\`typescript
const example = "code block";
\`\`\`
`;
    const base64Content = Buffer.from(content).toString("base64");

    const mockResponse = {
      status: 200,
      data: {
        type: "file",
        content: base64Content,
        size: Buffer.from(content).length,
        encoding: "base64",
        name: "agents.md",
        path: "agents.md",
      },
    };

    const octokit = createFakeOctokit(mockResponse);
    const context = createFakeContext();

    const result = await getGuidelinesFile(octokit, "agents.md", context);

    expect(result).toBe(content);
  });
});
