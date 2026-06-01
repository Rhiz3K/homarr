// @vitest-environment node

import { Request, Response } from "undici";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../../base/integration";
import { HermesAgentIntegration } from "../hermes-agent-integration";

vi.mock("@homarr/core/infrastructure/http", () => ({
  fetchWithTrustedCertificatesAsync: vi.fn(),
}));

const TEST_API_KEY = "test-hermes-api-key";
const TEST_URL = "http://127.0.0.1:8642";

type MockResponseData = Record<string, unknown> | unknown[];

const mockFetchWithTrustedCertificates = vi.mocked(fetchWithTrustedCertificatesAsync);

class TestableHermesAgentIntegration extends HermesAgentIntegration {
  public async callTestingAsync(fetchAsync: IntegrationTestingInput["fetchAsync"]) {
    return await this.testingAsync({
      fetchAsync,
      dispatcher: undefined as never,
      axiosInstance: undefined as never,
      options: undefined as never,
    });
  }
}

const createHermesAgentIntegration = () => {
  return new TestableHermesAgentIntegration({
    id: "test-hermes-agent",
    name: "Test Hermes Agent",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets: [{ kind: "apiKey", value: TEST_API_KEY }],
  });
};

const createResponse = (data: MockResponseData, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
};

const getPathname = (url: Parameters<typeof fetchWithTrustedCertificatesAsync>[0]) => {
  const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
  return new URL(urlString).pathname;
};

const setupMockFetch = (responses: Record<string, MockResponseData>) => {
  mockFetchWithTrustedCertificates.mockImplementation((url) => {
    const path = getPathname(url);

    const response = responses[path];
    if (response !== undefined) {
      return Promise.resolve(createResponse(response) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
    }

    return Promise.resolve(
      createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
    );
  });
};

describe("HermesAgentIntegration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("testingAsync checks health and authenticated capabilities", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      if (path === "/health") {
        return Promise.resolve(createResponse({ status: "ok" }));
      }
      if (path === "/v1/capabilities") {
        return Promise.resolve(
          createResponse({
            object: "hermes.api_server.capabilities",
            platform: "hermes-agent",
            model: "hermes-agent",
            auth: { type: "bearer", required: true },
            features: { run_status: true },
          }),
        );
      }
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration();
    const result = await integration.callTestingAsync(fetchAsync);

    expect(result.success).toBe(true);
    expect(fetchAsync).toHaveBeenCalledTimes(2);
    expect(fetchAsync).toHaveBeenLastCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TEST_API_KEY}` }),
      }),
    );
  });

  test("testingAsync accepts dashboard status endpoint", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      if (path === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.15.1",
            release_date: "2026.5.29",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: {},
            active_sessions: 0,
          }),
        );
      }
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration();
    const result = await integration.callTestingAsync(fetchAsync);

    expect(result.success).toBe(true);
    expect(fetchAsync).toHaveBeenCalledTimes(2);
  });

  test("getOverviewAsync aggregates required and optional endpoint data", async () => {
    setupMockFetch({
      "/health/detailed": {
        status: "ok",
        gateway_state: "running",
        platforms: {
          telegram: { state: "connected", updated_at: "2026-01-01T00:00:00Z" },
        },
        active_agents: 2,
        updated_at: "2026-01-01T00:00:00Z",
        pid: 1234,
      },
      "/v1/capabilities": {
        object: "hermes.api_server.capabilities",
        platform: "hermes-agent",
        model: "hermes-agent",
        auth: { type: "bearer", required: true },
        features: { run_status: true, jobs_admin: false },
      },
      "/v1/models": {
        data: [{ id: "hermes-agent", owned_by: "hermes", created: 1767225600 }],
      },
      "/api/sessions": {
        data: [
          {
            id: "session-1",
            source: "api_server",
            title: "Dashboard session",
            message_count: 3,
            tool_call_count: 1,
            input_tokens: 100,
            output_tokens: 50,
            last_active: "2026-01-01T00:00:00Z",
          },
        ],
      },
      "/api/jobs": {
        jobs: [
          {
            id: "abc123",
            name: "Daily briefing",
            schedule: { kind: "cron", expr: "0 9 * * *", display: "0 9 * * *" },
            repeat: { times: null, completed: 4 },
            enabled: true,
          },
        ],
      },
      "/v1/toolsets": [{ name: "core", label: "Core", enabled: true, configured: true, tools: ["read_file"] }],
    });

    const integration = createHermesAgentIntegration();
    const result = await integration.getOverviewAsync();

    expect(result.health.gateway_state).toBe("running");
    expect(result.capabilities.model).toBe("hermes-agent");
    expect(result.models).toHaveLength(1);
    expect(result.sessions).toHaveLength(1);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.schedule).toBe("0 9 * * *");
    expect(result.toolsets).toHaveLength(1);
    expect(mockFetchWithTrustedCertificates).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: `Bearer ${TEST_API_KEY}` }),
      }),
    );
  });

  test("getOverviewAsync caches dashboard GitHub update checks", async () => {
    let latestReleaseCalls = 0;
    let compareCalls = 0;
    mockFetchWithTrustedCertificates.mockImplementation((url) => {
      const urlString = typeof url === "string" ? url : url instanceof Request ? url.url : url.toString();
      const parsedUrl = new URL(urlString);
      const path = parsedUrl.pathname;

      if (parsedUrl.hostname === "api.github.com") {
        if (path === "/repos/NousResearch/hermes-agent/releases/latest") {
          latestReleaseCalls += 1;
          return Promise.resolve(
            createResponse({
              tag_name: "v2099.1.1.2",
              html_url: "https://github.com/NousResearch/hermes-agent",
            }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
          );
        }
        if (path === "/repos/NousResearch/hermes-agent/compare/v2099.1.1...main") {
          compareCalls += 1;
          return Promise.resolve(
            createResponse({ ahead_by: 2, total_commits: 2 }) as Awaited<
              ReturnType<typeof fetchWithTrustedCertificatesAsync>
            >,
          );
        }
      }

      if (path === "/api/status") {
        return Promise.resolve(
          createResponse({
            version: "0.15.1",
            release_date: "2099.1.1",
            gateway_running: true,
            gateway_state: "running",
            gateway_platforms: { telegram: { state: "connected" } },
            active_sessions: 0,
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (path === "/") {
        return Promise.resolve(
          new Response('<script>window.__HERMES_SESSION_TOKEN__="test-token";</script>', {
            headers: { "content-type": "text/html" },
          }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (path === "/api/skills") {
        return Promise.resolve(
          createResponse([{ name: "hermes-agent", enabled: true }]) as Awaited<
            ReturnType<typeof fetchWithTrustedCertificatesAsync>
          >,
        );
      }
      if (path === "/api/sessions") {
        return Promise.resolve(
          createResponse({ sessions: [] }) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
        );
      }
      if (path === "/api/cron/jobs") {
        return Promise.resolve(createResponse([]) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
      }
      if (path === "/api/tools/toolsets") {
        return Promise.resolve(createResponse([]) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>);
      }

      return Promise.resolve(
        createResponse({ error: "Not Found" }, 404) as Awaited<ReturnType<typeof fetchWithTrustedCertificatesAsync>>,
      );
    });

    const integration = createHermesAgentIntegration();
    const firstResult = await integration.getOverviewAsync();
    const secondResult = await integration.getOverviewAsync();

    expect(firstResult.update?.commitsBehind).toBe(2);
    expect(secondResult.update?.commitsBehind).toBe(2);
    expect(latestReleaseCalls).toBe(1);
    expect(compareCalls).toBe(1);
  });

  test("getOverviewAsync keeps optional collections empty when optional endpoints are unavailable", async () => {
    setupMockFetch({
      "/health/detailed": { status: "ok", gateway_state: "running" },
      "/v1/capabilities": {
        object: "hermes.api_server.capabilities",
        platform: "hermes-agent",
        model: "hermes-agent",
        auth: { type: "bearer", required: true },
        features: {},
      },
      "/v1/models": { data: [{ id: "hermes-agent" }] },
    });

    const integration = createHermesAgentIntegration();
    const result = await integration.getOverviewAsync();

    expect(result.sessions).toEqual([]);
    expect(result.jobs).toEqual([]);
    expect(result.toolsets).toEqual([]);
  });

  test("getCapabilitiesAsync throws when API key is rejected", async () => {
    mockFetchWithTrustedCertificates.mockResolvedValue(
      createResponse({ error: { message: "Invalid API key" } }, 401) as Awaited<
        ReturnType<typeof fetchWithTrustedCertificatesAsync>
      >,
    );

    const integration = createHermesAgentIntegration();
    await expect(integration.getCapabilitiesAsync()).rejects.toThrow();
  });
});
