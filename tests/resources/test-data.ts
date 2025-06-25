import type { FetchDataResult } from "../../src/core/data/fetcher";

// Simplified test data for formatter tests
export const mockFetchDataResult: FetchDataResult = {
  contextData: {
    title: "Test Pull Request",
    body: "This is a test PR body",
    author: {
      login: "testuser",
      name: "Test User",
    },
    baseRefName: "main",
    headRefName: "feature/test",
    headRefOid: "abc123",
    createdAt: "2025-06-24T07:00:00Z",
    additions: 10,
    deletions: 5,
    state: "OPEN",
    commits: {
      totalCount: 2,
      nodes: [
        {
          commit: {
            committedDate: "2025-06-24T07:14:46Z",
            oid: "commit1",
            message: "First commit",
            author: {
              name: "Test User",
              email: "test@example.com",
            },
          },
        },
        {
          commit: {
            committedDate: "2025-06-24T07:20:00Z",
            oid: "commit2",
            message: "Second commit",
            author: {
              name: "Test User",
              email: "test@example.com",
            },
          },
        },
      ],
    },
    files: {
      nodes: [
        {
          path: "src/test.ts",
          additions: 5,
          deletions: 2,
          changeType: "MODIFIED",
        },
      ],
    },
    comments: {
      nodes: [
        {
          id: "comment1",
          databaseId: "1",
          body: "This is comment #1",
          createdAt: "2025-06-24T07:16:09Z",
          author: {
            login: "user1",
            name: "User One",
          },
        },
        {
          id: "comment2",
          databaseId: "2",
          body: "This is comment #2",
          createdAt: "2025-06-24T07:18:00Z",
          author: {
            login: "user2",
            name: "User Two",
          },
        },
      ],
    },
    reviews: {
      nodes: [
        {
          id: "review1",
          databaseId: "1",
          author: {
            login: "reviewer1",
            name: "Reviewer One",
          },
          body: "Great work!",
          state: "APPROVED",
          submittedAt: "2025-06-24T07:16:27Z",
          comments: {
            nodes: [
              {
                id: "review_comment1",
                databaseId: "1",
                body: "This is review comment #1",
                createdAt: "2025-06-24T07:16:27Z",
                path: "src/test.ts",
                line: 10,
                author: {
                  login: "reviewer1",
                  name: "Reviewer One",
                },
              },
            ],
          },
        },
        {
          id: "review2",
          databaseId: "2",
          author: {
            login: "reviewer2",
            name: "Reviewer Two",
          },
          body: "",
          state: "COMMENTED",
          submittedAt: "2025-06-24T07:17:14Z",
          comments: {
            nodes: [
              {
                id: "review_comment2",
                databaseId: "2",
                body: "This is review comment #2",
                createdAt: "2025-06-24T07:17:14Z",
                path: "src/test.ts",
                line: 15,
                author: {
                  login: "reviewer2",
                  name: "Reviewer Two",
                },
              },
            ],
          },
        },
      ],
    },
  },
  comments: [],
  changedFiles: [],
  changedFilesWithSHA: [],
  reviewData: null,
  attachmentUrlMap: new Map([
    [
      "https://github.com/user-attachments/assets/1eb4f910-758a-4824-819e-f1fb801ce948",
      "/tmp/github-attachments/images-1eb4f910-1750826249410-0.png",
    ],
    [
      "https://github.com/user-attachments/assets/2abc123-def4-5678-90ab-cdef12345678",
      "/tmp/github-attachments/document-2abc123-1750826249411.pdf",
    ],
  ]),
  triggerDisplayName: "Test User",
};
