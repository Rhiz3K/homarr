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

const createHermesAgentIntegration = (
  decryptedSecrets: { kind: "apiKey"; value: string }[] = [{ kind: "apiKey", value: TEST_API_KEY }],
) => {
  return new TestableHermesAgentIntegration({
    id: "test-hermes-agent",
    name: "Test Hermes Agent",
    url: TEST_URL,
    externalUrl: null,
    decryptedSecrets,
  });
};

const createResponse = (data: MockResponseData, status = 200) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
};

const getRequestUrl = (url: Parameters<typeof fetchWithTrustedCertificatesAsync>[0]) =>
  new URL(typeof url === "string" ? url : url instanceof Request ? url.url : url.toString());

const getPathname = (url: Parameters<typeof fetchWithTrustedCertificatesAsync>[0]) => getRequestUrl(url).pathname;

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

  test("testingAsync supports an API server without an API key", async () => {
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
            auth: { type: "none", required: false },
            features: { run_status: true },
          }),
        );
      }
      return Promise.resolve(createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration([]);
    const result = await integration.callTestingAsync(fetchAsync);

    expect(result.success).toBe(true);
    expect(fetchAsync).toHaveBeenCalledTimes(2);
    expect(fetchAsync).toHaveBeenLastCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: { Accept: "application/json" },
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

  test("testingAsync rejects an unrelated empty status response", async () => {
    const fetchAsync = vi.fn((url: Parameters<IntegrationTestingInput["fetchAsync"]>[0]) => {
      const path = getPathname(url);
      return Promise.resolve(path === "/api/status" ? createResponse({}) : createResponse({ error: "Not Found" }, 404));
    }) as IntegrationTestingInput["fetchAsync"];

    const integration = createHermesAgentIntegration([]);
    await expect(integration.callTestingAsync(fetchAsync)).rejects.toThrow();
  });

  test("getOverviewAsync aggregates required and optional endpoint data", async () => {
    setupMockFetch({
      "/health/detailed": {
        status: "ready",
        version: "0.18.2",
        readiness: { status: "ready", checks: { config: { status: "ready" } } },
        gateway_state: "running",
        platforms: {
          telegram: { state: "connected", updated_at: "2026-01-01T00:00:00Z" },
        },
        active_agents: 2,
        gateway_busy: true,
        gateway_drainable: false,
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
            last_active: 1_767_225_600,
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
      "/v1/skills": {
        object: "list",
        data: [
          {
            name: "github-pr-workflow",
            description: "Review GitHub pull requests",
            category: "development",
          },
        ],
      },
    });

    const integration = createHermesAgentIntegration();
    const result = await integration.getOverviewAsync();

    expect(result.mode).toBe("apiServer");
    expect(result.health.gateway_state).toBe("running");
    expect(result.health.version).toBe("0.18.2");
    expect(result.health.gateway_busy).toBe(true);
    expect(result.health.readiness?.status).toBe("ready");
    expect(result.capabilities.model).toBe("hermes-agent");
    expect(result.models).toHaveLength(1);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]?.last_active).toBe(1_767_225_600);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]?.schedule).toBe("0 9 * * *");
    expect(result.toolsets).toHaveLength(1);
    expect(result.skills).toHaveLength(1);
    expect(result.dataAvailability).toEqual({ sessions: true, jobs: true, toolsets: true, skills: true });
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
    expect(firstResult.mode).toBe("dashboard");
    expect(firstResult.dataAvailability).toEqual({ sessions: true, jobs: true, toolsets: true, skills: true });
    expect(latestReleaseCalls).toBe(1);
    expect(compareCalls).toBe(1);
    const dashboardSessionsUrl = mockFetchWithTrustedCertificates.mock.calls
      .map(([url]) => getRequestUrl(url))
      .find((url) => url.pathname === "/api/sessions");
    expect(dashboardSessionsUrl?.searchParams.get("limit")).toBe("10");
    expect(dashboardSessionsUrl?.searchParams.get("order")).toBe("recent");
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
    expect(result.skills).toEqual([]);
    expect(result.dataAvailability).toEqual({ sessions: false, jobs: false, toolsets: false, skills: false });
  });

  test("getOverviewAsync supports status-only dashboard mode without an API key", async () => {
    setupMockFetch({
      "/api/status": {
        version: "0.18.2",
        release_date: null,
        gateway_running: true,
        gateway_state: "running",
        gateway_platforms: { telegram: { state: "connected" } },
        active_sessions: 3,
        active_agents: 1,
        gateway_busy: true,
        gateway_drainable: false,
        profiles: ["default"],
        gateway_mode: "single",
        auth_required: true,
        auth_providers: ["basic"],
      },
    });

    const integration = createHermesAgentIntegration([]);
    const result = await integration.getOverviewAsync();

    expect(result.mode).toBe("dashboard");
    expect(result.health).toMatchObject({
      status: "ok",
      version: "0.18.2",
      gateway_state: "running",
      active_agents: 1,
      gateway_busy: true,
      gateway_drainable: false,
    });
    expect(result.dashboardStatus?.profiles).toEqual(["default"]);
    expect(result.dataAvailability).toEqual({ sessions: false, jobs: false, toolsets: false, skills: false });
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
