import * as types from "./h2ogpte/types";
import * as core from "@actions/core";

/**
 * Generic fetch function with retry, exponential backoff, and timeout support
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: types.FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000, // 1 second
    timeoutMs = 50000, // 5 seconds
  } = retryOptions;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    core.warning(`Request timed out after ${timeoutMs} ms`);
  }, timeoutMs);

  // Merge the abort signal with existing options
  const fetchOptions = {
    ...options,
    signal: controller.signal,
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.debug(`Attempt ${attempt}/${maxRetries} for ${url}`);

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => "Failed to read error response");
        throw new Error(
          `HTTP error! {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`,
        );
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      lastError = error instanceof Error ? error : new Error(String(error));
      core.warning(
        `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`,
      );

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        core.debug(`Retrying after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Reset timeout for next attempt
        setTimeout(() => {
          controller.abort();
          core.warning(`Request timed out after ${timeoutMs} ms`);
        }, timeoutMs);
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  }

  // If we've exhausted all retries
  const errorMessage = `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message}`;
  core.setFailed(errorMessage);
  throw new Error(errorMessage);
}
