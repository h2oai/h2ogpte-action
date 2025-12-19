import * as core from "@actions/core";
import * as types from "./h2ogpte/types";

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
    timeoutMs = 5000, // 5 seconds
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
      core.info(`Attempt ${attempt}/${maxRetries} for ${url}`);

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
        core.info(`Retrying after ${delay}ms`);
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
  throw new Error(errorMessage);
}

/**
 * Streaming fetch function with retry, exponential backoff, and timeout support
 * Returns the complete response as a string after all chunks are received
 */
export async function fetchWithRetryStreaming(
  url: string,
  options: RequestInit,
  retryOptions: types.FetchWithRetryOptions = {},
): Promise<string> {
  const {
    maxRetries = 3,
    retryDelay = 1000, // 1 second
    timeoutMs = 5000, // 5 seconds
  } = retryOptions;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
    core.warning(`Streaming request timed out after ${timeoutMs} ms`);
  }, timeoutMs);

  // Merge the abort signal with existing options
  const fetchOptions = {
    ...options,
    signal: controller.signal,
    verbose: "curl",
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      core.info(`Streaming attempt ${attempt}/${maxRetries} for ${url}`);

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

      // Handle streaming response
      if (!response.body) {
        throw new Error("Response body is null or undefined");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          core.info(`Streaming chunk: ${chunk}`);
          result += chunk;
        }
      } finally {
        reader.releaseLock();
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      lastError = error instanceof Error ? error : new Error(String(error));
      core.warning(
        `Streaming attempt ${attempt}/${maxRetries} failed: ${lastError.message}`,
      );

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        core.info(`Retrying streaming request after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        // Reset timeout for next attempt
        setTimeout(() => {
          controller.abort();
          core.warning(`Streaming request timed out after ${timeoutMs} ms`);
        }, timeoutMs);
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
  }

  // If we've exhausted all retries
  const errorMessage = `Failed to fetch streaming response from ${url} after ${maxRetries} attempts: ${lastError?.message}`;
  throw new Error(errorMessage);
}
