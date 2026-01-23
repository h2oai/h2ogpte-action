import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as core from "@actions/core";
import { createGuardRailsSettings } from "../../src/core/services/h2ogpte/h2ogpte";
import * as utils from "../../src/core/services/h2ogpte/utils";
import * as base from "../../src/core/services/base";

let getH2ogpteConfigSpy: ReturnType<typeof spyOn>;
let fetchWithRetrySpy: ReturnType<typeof spyOn>;
let coreDebugSpy: ReturnType<typeof spyOn>;

describe("createGuardRailsSettings", () => {
  const testCollectionId = "test-collection-123";
  const validGuardrailsSettings = JSON.stringify({
    presidio_labels_to_flag: ["CREDIT_CARD", "IBAN_CODE"],
    pii_labels_to_flag: ["ACCOUNTNUMBER", "CREDITCARDNUMBER"],
    pii_detection_parse_action: "redact",
    pii_detection_llm_input_action: "redact",
    pii_detection_llm_output_action: "redact",
  });

  beforeEach(() => {
    // Set up spies
    getH2ogpteConfigSpy = spyOn(utils, "getH2ogpteConfig").mockReturnValue({
      apiKey: "test-api-key",
      apiBase: "https://h2ogpte.test.com",
    });

    fetchWithRetrySpy = spyOn(base, "fetchWithRetry").mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    } as Response);

    coreDebugSpy = spyOn(core, "debug").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore spies
    if (getH2ogpteConfigSpy) getH2ogpteConfigSpy.mockRestore();
    if (fetchWithRetrySpy) fetchWithRetrySpy.mockRestore();
    if (coreDebugSpy) coreDebugSpy.mockRestore();
  });

  test("should successfully create guardrail settings with valid JSON", async () => {
    await createGuardRailsSettings(testCollectionId, validGuardrailsSettings);

    expect(getH2ogpteConfigSpy).toHaveBeenCalledTimes(1);
    expect(fetchWithRetrySpy).toHaveBeenCalledTimes(1);

    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    expect(fetchCall[0]).toBe(
      `https://h2ogpte.test.com/api/v1/collections/${testCollectionId}/settings`,
    );
    expect(fetchCall[1]).toMatchObject({
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-api-key",
      },
    });

    const body = JSON.parse(fetchCall[1].body as string);
    expect(body).toHaveProperty("guardrails_settings");
    expect(body.guardrails_settings).toMatchObject({
      presidio_labels_to_flag: ["CREDIT_CARD", "IBAN_CODE"],
      pii_labels_to_flag: ["ACCOUNTNUMBER", "CREDITCARDNUMBER"],
      pii_detection_parse_action: "redact",
      pii_detection_llm_input_action: "redact",
      pii_detection_llm_output_action: "redact",
    });
  });

  test("should return early when guardrails settings is undefined", async () => {
    await createGuardRailsSettings(testCollectionId, undefined);

    expect(coreDebugSpy).toHaveBeenCalledWith("No guardrails settings found");
    expect(getH2ogpteConfigSpy).not.toHaveBeenCalled();
    expect(fetchWithRetrySpy).not.toHaveBeenCalled();
  });

  test("should return early when guardrails settings is empty string", async () => {
    await createGuardRailsSettings(testCollectionId, "");

    expect(coreDebugSpy).toHaveBeenCalledWith("No guardrails settings found");
    expect(getH2ogpteConfigSpy).not.toHaveBeenCalled();
    expect(fetchWithRetrySpy).not.toHaveBeenCalled();
  });

  test("should throw error when API request fails", async () => {
    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () => "Invalid guardrail settings",
    } as Response);

    await expect(
      createGuardRailsSettings(testCollectionId, validGuardrailsSettings),
    ).rejects.toThrow(
      "Failed to set guardrails settings in collection: 400 Bad Request - Invalid guardrail settings",
    );

    expect(fetchWithRetrySpy).toHaveBeenCalledTimes(1);
  });

  test("should handle guardrail settings with all optional fields", async () => {
    const fullGuardrailsSettings = JSON.stringify({
      disallowed_regex_patterns: ["\\d{4}-\\d{4}-\\d{4}-\\d{4}"],
      presidio_labels_to_flag: ["CREDIT_CARD", "IBAN_CODE", "EMAIL"],
      pii_labels_to_flag: ["ACCOUNTNUMBER", "CREDITCARDNUMBER", "SSN"],
      pii_detection_parse_action: "fail",
      pii_detection_llm_input_action: "allow",
      pii_detection_llm_output_action: "redact",
    });

    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    } as Response);

    await createGuardRailsSettings(testCollectionId, fullGuardrailsSettings);

    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.guardrails_settings).toMatchObject({
      disallowed_regex_patterns: ["\\d{4}-\\d{4}-\\d{4}-\\d{4}"],
      presidio_labels_to_flag: ["CREDIT_CARD", "IBAN_CODE", "EMAIL"],
      pii_labels_to_flag: ["ACCOUNTNUMBER", "CREDITCARDNUMBER", "SSN"],
      pii_detection_parse_action: "fail",
      pii_detection_llm_input_action: "allow",
      pii_detection_llm_output_action: "redact",
    });
  });

  test("should handle guardrail settings with minimal fields", async () => {
    const minimalGuardrailsSettings = JSON.stringify({
      pii_detection_llm_output_action: "redact",
    });

    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    } as Response);

    await createGuardRailsSettings(testCollectionId, minimalGuardrailsSettings);

    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.guardrails_settings).toMatchObject({
      pii_detection_llm_output_action: "redact",
    });
  });

  test("should handle guardrail settings with empty arrays", async () => {
    const emptyArraysSettings = JSON.stringify({
      presidio_labels_to_flag: [],
      pii_labels_to_flag: [],
    });

    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    } as Response);

    await createGuardRailsSettings(testCollectionId, emptyArraysSettings);

    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.guardrails_settings).toMatchObject({
      presidio_labels_to_flag: [],
      pii_labels_to_flag: [],
    });
  });

  test("should log debug messages correctly", async () => {
    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    } as Response);

    await createGuardRailsSettings(testCollectionId, validGuardrailsSettings);

    expect(coreDebugSpy).toHaveBeenCalledWith(
      `Guardrails settings: ${validGuardrailsSettings}`,
    );
    expect(coreDebugSpy).toHaveBeenCalledWith(
      "200 - Successfully set guardrails settings",
    );
  });

  test("should use custom retry parameters when provided", async () => {
    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    } as Response);

    await createGuardRailsSettings(
      testCollectionId,
      validGuardrailsSettings,
      5, // maxRetries
      2000, // retryDelay
    );

    expect(fetchWithRetrySpy).toHaveBeenCalledTimes(1);
    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    expect(fetchCall[2]).toMatchObject({
      maxRetries: 5,
      retryDelay: 2000,
    });
  });

  test("should use default retry parameters when not provided", async () => {
    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "",
    } as Response);

    await createGuardRailsSettings(testCollectionId, validGuardrailsSettings);

    expect(fetchWithRetrySpy).toHaveBeenCalledTimes(1);
    const fetchCall = fetchWithRetrySpy.mock.calls[0];
    expect(fetchCall[2]).toMatchObject({
      maxRetries: 3,
      retryDelay: 1000,
    });
  });

  test("should handle different pii_detection action values", async () => {
    const testCases = [
      { action: "allow" as const },
      { action: "redact" as const },
      { action: "fail" as const },
    ];

    for (const testCase of testCases) {
      fetchWithRetrySpy.mockClear();
      const settings = JSON.stringify({
        pii_detection_parse_action: testCase.action,
        pii_detection_llm_input_action: testCase.action,
        pii_detection_llm_output_action: testCase.action,
      });

      fetchWithRetrySpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "",
      } as Response);

      await createGuardRailsSettings(testCollectionId, settings);

      const fetchCall = fetchWithRetrySpy.mock.calls[0];
      const body = JSON.parse(fetchCall[1].body as string);
      expect(body.guardrails_settings.pii_detection_parse_action).toBe(
        testCase.action,
      );
      expect(body.guardrails_settings.pii_detection_llm_input_action).toBe(
        testCase.action,
      );
      expect(body.guardrails_settings.pii_detection_llm_output_action).toBe(
        testCase.action,
      );
    }
  });

  test("should handle API error with detailed error message", async () => {
    const errorMessage = "Collection not found";
    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => errorMessage,
    } as Response);

    await expect(
      createGuardRailsSettings(testCollectionId, validGuardrailsSettings),
    ).rejects.toThrow(
      `Failed to set guardrails settings in collection: 404 Not Found - ${errorMessage}`,
    );
  });

  test("should handle API error when error text cannot be read", async () => {
    fetchWithRetrySpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => {
        throw new Error("Failed to read error");
      },
    } as unknown as Response);

    // The error should still be thrown, but the text reading might fail
    await expect(
      createGuardRailsSettings(testCollectionId, validGuardrailsSettings),
    ).rejects.toThrow();
  });
});
