import * as types from "./h2ogpte/types";
import fetch from "node-fetch";
import type {
  RequestInit as NodeFetchRequestInit,
  Response as NodeFetchResponse,
} from "node-fetch";

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
    console.warn(`Request timed out after ${timeoutMs} ms`);
  }, timeoutMs);

  // Merge the abort signal with existing options
  const fetchOptions: NodeFetchRequestInit = {
    ...options,
    signal: controller.signal,
  } as NodeFetchRequestInit;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} for ${url}`);

      const response: NodeFetchResponse = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response
          .text()
          .catch(() => "Failed to read error response");
        throw new Error(
          `HTTP error! {status: ${response.status}, msg: ${response.statusText}, details: ${errorText}}`,
        );
      }

      return response as unknown as Response;
    } catch (error) {
      clearTimeout(timeoutId);

      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(
        `Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`,
      );

      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying after ${delay}ms`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // If we've exhausted all retries
  const errorMessage = `Failed to fetch ${url} after ${maxRetries} attempts: ${lastError?.message}`;
  throw new Error(errorMessage);
}
