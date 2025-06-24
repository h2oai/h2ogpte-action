import type { FetchDataResult } from "../data/fetcher";
import type { GitHubPullRequest } from "../data/queries/types";

function isPullRequest(
  contextData: FetchDataResult["contextData"],
): contextData is GitHubPullRequest {
  return (contextData as GitHubPullRequest).commits !== undefined;
}

export function getAllEventsInOrder(githubData: FetchDataResult) {
  const events = [];

  // 1. Commits (only for PRs)
  if (
    githubData.contextData &&
    isPullRequest(githubData.contextData) &&
    githubData.contextData.commits &&
    githubData.contextData.commits.nodes
  ) {
    for (const node of githubData.contextData.commits.nodes) {
      const commit = node.commit;
      events.push({
        type: "commit",
        title: commit.message,
        body: commit.message,
        createdAt: null,
      });
    }
  }

  // 2. Comments (for both PRs and Issues)
  if (
    githubData.contextData &&
    githubData.contextData.comments &&
    githubData.contextData.comments.nodes
  ) {
    for (const comment of githubData.contextData.comments.nodes) {
      events.push({
        type: "comment",
        title: githubData.contextData.title || "",
        body: comment.body,
        createdAt: comment.createdAt,
      });
    }
  }

  // 3. Reviews (only for PRs)
  if (
    githubData.contextData &&
    isPullRequest(githubData.contextData) &&
    githubData.contextData.reviews &&
    githubData.contextData.reviews.nodes
  ) {
    for (const review of githubData.contextData.reviews.nodes) {
      events.push({
        type: "review",
        title: githubData.contextData.title || "",
        body: review.body,
        createdAt: review.submittedAt,
      });
      if (review.comments && review.comments.nodes) {
        for (const reviewComment of review.comments.nodes) {
          events.push({
            type: "review_comment",
            title: githubData.contextData.title || "",
            body: reviewComment.body,
            createdAt: reviewComment.createdAt,
          });
        }
      }
    }
  }

  events.sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return (
      new Date(a.createdAt as string).getTime() -
      new Date(b.createdAt as string).getTime()
    );
  });

  return events.map(({ type, title, body, createdAt }) => ({
    type,
    title,
    body,
    createdAt,
  }));
}
