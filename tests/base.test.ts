import { it, expect, mock } from "bun:test";
import { fetchWithRetry } from "../src/core/services/base";

it("fetchWithRetry times out after expected time", async () => {
  const mockFetch = mock((_, opts: RequestInit) => {
    return new Promise<Response>((_, reject) => {
      if (opts.signal) {
        opts.signal.addEventListener("abort", () => {
          reject(new Error("AbortError"));
        });
      }
    });
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.fetch = mockFetch as any;

  const startTime = Date.now();

  await expect(
    fetchWithRetry(
      "https://api.example.com/test",
      {},
      {
        maxRetries: 1,
        timeoutMs: 10, // Very short timeout for instant test
      },
    ),
  ).rejects.toThrow(
    "Failed to fetch https://api.example.com/test after 1 attempts: AbortError",
  );

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Verify the timeout took approximately the expected time (with some tolerance)
  expect(duration).toBeGreaterThanOrEqual(5);
  expect(duration).toBeLessThanOrEqual(100);

  // Verify fetch was called once
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
