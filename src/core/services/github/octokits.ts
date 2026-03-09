import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import { getGithubApiUrl } from "../../utils";

export type Octokits = {
  rest: Octokit;
  graphql: typeof graphql;
};

export function createOctokits(githubToken: string): Octokits {
  return { rest: newOctokit(githubToken), graphql: newGraphQl(githubToken) };
}

export function newOctokit(githubToken: string): Octokit {
  return new Octokit({
    auth: githubToken,
    baseUrl: getGithubApiUrl(),
    request: {
      timeout: 10000, // 10 second timeout for GitHub API requests
    },
  });
}

export function newGraphQl(githubToken: string): typeof graphql {
  return graphql.defaults({
    baseUrl: getGithubApiUrl(),
    headers: {
      authorization: `token ${githubToken}`,
    },
  });
}
