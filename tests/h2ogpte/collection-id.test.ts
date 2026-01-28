import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as core from "@actions/core";
import { isValidCollection } from "../../src/core/services/h2ogpte/h2ogpte";
import * as utils from "../../src/core/services/h2ogpte/utils";
import * as base from "../../src/core/services/base";

let getH2ogpteConfigSpy: ReturnType<typeof spyOn>;
let fetchWithRetrySpy: ReturnType<typeof spyOn>;
let coreDebugSpy: ReturnType<typeof spyOn>;

const mockChatSessionResponse = {
  id: "session-123",
  updated_at: "2024-01-01T00:00:00Z",
};

function createMockResponse(
  overrides: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
  } = {},
) {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => mockChatSessionResponse,
    text: async () => "",
    ...overrides,
  } as unknown as Response;
}

describe("isValidCollection", () => {
  beforeEach(() => {
    getH2ogpteConfigSpy = spyOn(utils, "getH2ogpteConfig").mockReturnValue({
      apiKey: "test-api-key",
      apiBase: "https://h2ogpte.test.com",
    });

    fetchWithRetrySpy = spyOn(base, "fetchWithRetry").mockResolvedValue(
      createMockResponse(),
    );

    coreDebugSpy = spyOn(core, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    if (getH2ogpteConfigSpy) getH2ogpteConfigSpy.mockRestore();
    if (fetchWithRetrySpy) fetchWithRetrySpy.mockRestore();
    if (coreDebugSpy) coreDebugSpy.mockRestore();
  });

  test("should return true when collection exists (response ok)", async () => {
    const collectionId = "valid-collection-123";
    fetchWithRetrySpy.mockResolvedValue(createMockResponse({ ok: true }));

    const result = await isValidCollection(collectionId);

    expect(result).toBe(true);
    expect(fetchWithRetrySpy).toHaveBeenCalledTimes(1);
    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    expect(fetchCall[0]).toBe(
      `https://h2ogpte.test.com/api/v1/collections/${collectionId}`,
    );
    expect(coreDebugSpy).toHaveBeenCalledWith(
      `Collection ${collectionId} is valid.`,
    );
  });

  test("should return false when collection does not exist (response not ok)", async () => {
    const collectionId = "invalid-collection-456";
    fetchWithRetrySpy.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 404,
        statusText: "Not Found",
        text: async () => "Collection not found",
      }),
    );

    const result = await isValidCollection(collectionId);

    expect(result).toBe(false);
    expect(fetchWithRetrySpy).toHaveBeenCalledTimes(1);
    expect(coreDebugSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to validate collection ${collectionId}`),
    );
  });

  test("should use GET method to validate collection", async () => {
    const collectionId = "collection-to-validate";
    fetchWithRetrySpy.mockResolvedValue(createMockResponse({ ok: true }));

    await isValidCollection(collectionId);

    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    expect(fetchCall[1]).toMatchObject({
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-api-key",
      },
    });
  });

  test("should return false for 403 Forbidden response", async () => {
    const collectionId = "forbidden-collection";
    fetchWithRetrySpy.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "Access denied",
      }),
    );

    const result = await isValidCollection(collectionId);

    expect(result).toBe(false);
  });

  test("should return false for 400 Bad Request response", async () => {
    const collectionId = "malformed-collection-id";
    fetchWithRetrySpy.mockResolvedValue(
      createMockResponse({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "Invalid collection ID format",
      }),
    );

    const result = await isValidCollection(collectionId);

    expect(result).toBe(false);
  });
});
