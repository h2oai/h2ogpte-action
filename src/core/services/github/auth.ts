import * as core from "@actions/core";
import type { TokenResponse } from "./types";

const TOKEN_EXCHANGE_SERVER_URL =
  "https://xj0o9dha0c.execute-api.us-east-1.amazonaws.com/prod";

export async function checkTokenExchangeServerHealth(): Promise<void> {
  const health = await fetch(`${TOKEN_EXCHANGE_SERVER_URL}/dev/health`, {
    method: "GET",
  });

  const data = await health.json();
  const { status } = data as { status: string };

  if (status !== "healthy") {
    throw new Error(`Token exchange server unhealthy`);
  }
}

export async function getGithubAccessToken(): Promise<string> {
  const idToken = await core.getIDToken();

  if (core.isDebug()) {
    await checkTokenExchangeServerHealth();
  }

  const tokenResponse = await fetch(`${TOKEN_EXCHANGE_SERVER_URL}/dev/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!tokenResponse.ok) {
    core.error(
      `Token exchange failed: ${tokenResponse.status} ${tokenResponse.statusText}`,
    );
    throw new Error(
      `Token exchange failed with status ${tokenResponse.status}`,
    );
  }

  const responseText = await tokenResponse.text();
  const tokenData = JSON.parse(responseText) as TokenResponse;
  const { token: tokenValue, ...tokenDetails } = tokenData;

  core.debug(
    `Token exchange successful: ${JSON.stringify(tokenDetails, null, 2)}`,
  );

  return tokenValue;
}
