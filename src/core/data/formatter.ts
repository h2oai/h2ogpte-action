import type { FetchDataResult } from "../data/fetcher";
import type { GitHubPullRequest } from "./queries/types";

export function getAllEventsInOrder(
  githubData: FetchDataResult,
  isPR: boolean,
) {
  const events = [];

  if (isPR) {
    const data = githubData.contextData as GitHubPullRequest;

    for (const node of data.commits.nodes) {
      const commit = node.commit;
      events.push({
        type: "commit",
        title: commit.message,
        body: commit.message,
        createdAt: commit.committedDate,
      });
    }

    for (const review of data.reviews.nodes) {
      events.push({
        type: "review",
        title: data.title || "",
        body: review.body,
        createdAt: review.submittedAt,
      });
      if (review.comments && review.comments.nodes) {
        for (const reviewComment of review.comments.nodes) {
          events.push({
            type: "review_comment",
            title: data.title || "",
            body: reviewComment.body,
            createdAt: reviewComment.createdAt,
          });
        }
      }
    }
  }

  // 2. Comments (for both PRs and Issues)
  if (
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

export function replaceAttachmentUrlsWithLocalPaths(
  text: string,
  attachmentUrlMap: Map<string, string>,
): string {
  let result = text;

  // Replace each attachment URL with just the filename from its corresponding local path
  attachmentUrlMap.forEach((localPath, attachmentUrl) => {
    // Extract just the filename from the local path
    const filename = localPath.split("/").pop() || localPath;
    result = result.replace(new RegExp(attachmentUrl, "g"), filename);
  });

  return result;
}
