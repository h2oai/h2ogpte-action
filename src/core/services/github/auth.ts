import * as core from "@actions/core";
import type { TokenResponse } from "./types";

export async function getGithubAccessToken(): Promise<string> {
  const idToken = await core.getIDToken();

  // tmp for debugging
  const health = await fetch(
    "https://8iys2kexcg.execute-api.us-east-1.amazonaws.com/dev/health",
    {
      method: "GET",
    },
  );

  const data = await health.json();

  const { status } = data as { status: string };

  if (status == "healthy") {
    core.debug(`Token exchange server healthy`);
  } else {
    core.error(`Token exchange server unhealthy`);
    throw new Error(`Token exchange server unhealthy`);
  }

  const tokenResponse = await fetch(
    "https://8iys2kexcg.execute-api.us-east-1.amazonaws.com/dev/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
    },
  );

  const responseText = await tokenResponse.text();
  let parsedResponse: unknown = null;
  if (responseText) {
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (error) {
      core.debug(`Token exchange response JSON parse failed: ${String(error)}`);
    }
  }

  if (!tokenResponse.ok) {
    core.error(
      `Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`,
    );
    core.error(
      `Token exchange headers: ${JSON.stringify([...tokenResponse.headers], null, 2)}`,
    );
    core.error(
      `Token exchange body: ${responseText || "(empty response body)"}`,
    );
    throw new Error(
      `Token exchange failed with status ${tokenResponse.status}`,
    );
  }

  const tokenData = parsedResponse as TokenResponse;
  const { token: _token, ...tokenDetails } = tokenData ?? {};

  core.debug(
    `Token exchange successful: ${JSON.stringify(tokenDetails, null, 2)}`,
  );

  return idToken;
}
