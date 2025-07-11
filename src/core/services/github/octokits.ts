import { Octokit } from "@octokit/rest";
import { graphql } from "@octokit/graphql";
import { getGithubApiUrl, getGithubToken } from "../../utils";

export type Octokits = {
  rest: Octokit;
  graphql: typeof graphql;
};

export function createOctokits(): Octokits {
  return { rest: newOctokit(), graphql: newGraphQl() };
}

export function newOctokit(): Octokit {
  return new Octokit({
    auth: getGithubToken(),
    baseUrl: getGithubApiUrl(),
    request: {
      timeout: 10000, // 10 second timeout for GitHub API requests
    },
  });
}

export function newGraphQl(): typeof graphql {
  return graphql.defaults({
    baseUrl: getGithubApiUrl(),
    headers: {
      authorization: `token ${getGithubToken()}`,
    },
  });
}
