import type { FetchDataResult } from "../../data/fetcher";
import type { GitHubIssue, GitHubPullRequest } from "../../data/queries/types";

export function getAllEventsInOrder(
  githubData: FetchDataResult,
  isPR: boolean,
) {
  const events = [];

  // 1. Events in PRs
  if (isPR) {
    const data = githubData.contextData as GitHubPullRequest;

    for (const node of data.commits.nodes) {
      const commit = node.commit;
      events.push({
        type: "commit",
        title: commit.message,
        body: commit.message,
        createdAt: commit.committedDate,
        id: commit.oid,
      });
    }

    for (const review of data.reviews.nodes) {
      events.push({
        type: "review",
        title: data.title || "",
        body: review.body,
        createdAt: review.submittedAt,
        id: review.id,
      });
      if (review.comments && review.comments.nodes) {
        for (const reviewComment of review.comments.nodes) {
          events.push({
            type: "review_comment",
            title: data.title || "",
            body: reviewComment.body,
            createdAt: reviewComment.createdAt,
            id: reviewComment.id,
          });
        }
      }
    }
  }

  // 2. Events in Issues
  if (!isPR) {
    const data = githubData.contextData as GitHubIssue;
    if (data.body) {
      events.push({
        type: "issue_body",
        title: data.title || "",
        body: data.body,
        createdAt: data.createdAt,
        id: null,
      });
    }
  }

  // 3. Comments (for both PRs and Issues)
  for (const comment of githubData.contextData.comments.nodes) {
    events.push({
      type: "comment",
      title: githubData.contextData.title || "",
      body: comment.body,
      createdAt: comment.createdAt,
      id: comment.id,
    });
  }

  events.sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return (
      new Date(a.createdAt as string).getTime() -
      new Date(b.createdAt as string).getTime()
    );
  });

  return events.map(({ type, title, body, createdAt, id }) => ({
    type,
    title,
    body,
    createdAt,
    id,
  }));
}
