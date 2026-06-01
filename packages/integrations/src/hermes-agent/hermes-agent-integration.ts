import type { z } from "zod/v4";

import { env } from "@homarr/common/env";
import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { HermesAgentOverview, HermesDashboardStatus, HermesUpdateStatus } from "./hermes-agent-types";
import {
  hermesCapabilitiesSchema,
  hermesCompareSchema,
  hermesDashboardStatusSchema,
  hermesDetailedHealthSchema,
  hermesHealthSchema,
  hermesJobsResponseSchema,
  hermesModelsResponseSchema,
  hermesReleaseSchema,
  hermesSessionsResponseSchema,
  hermesSkillsResponseSchema,
  hermesToolsetsResponseSchema,
} from "./hermes-agent-types";

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "Homarr Hermes Agent integration",
} satisfies Record<string, string>;

const githubUpdateCacheDurationMs = 60 * 60 * 1000;
const githubUpdateCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<HermesUpdateStatus | null>;
  }
>();

const createGithubHeaders = () => {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  return token ? { ...githubHeaders, Authorization: `Bearer ${token}` } : githubHeaders;
};

export class HermesAgentIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthResponse = await input.fetchAsync(this.url("/health"), {
      headers: { Accept: "application/json" },
    });

    if (!healthResponse.ok) {
      const dashboardStatusResponse = await input.fetchAsync(this.url("/api/status"), {
        headers: { Accept: "application/json" },
      });

      if (!dashboardStatusResponse.ok) {
        throw new ResponseError(healthResponse);
      }

      hermesDashboardStatusSchema.parse(await dashboardStatusResponse.json());
      return { success: true };
    }

    hermesHealthSchema.parse(await healthResponse.json());

    const capabilitiesResponse = await input.fetchAsync(this.url("/v1/capabilities"), {
      headers: this.getAuthHeaders(),
    });

    if (!capabilitiesResponse.ok) {
      throw new ResponseError(capabilitiesResponse);
    }

    hermesCapabilitiesSchema.parse(await capabilitiesResponse.json());

    return { success: true };
  }

  public async getOverviewAsync(): Promise<HermesAgentOverview> {
    try {
      return await this.getApiServerOverviewAsync();
    } catch (error) {
      const dashboardStatus = await this.getOptionalAsync(() => this.getDashboardStatusAsync(), null);
      if (!dashboardStatus) {
        if (error instanceof Error) throw error;
        throw new Error("Failed to fetch Hermes Agent overview", { cause: error });
      }

      return await this.getDashboardOverviewAsync(dashboardStatus);
    }
  }

  private async getApiServerOverviewAsync(): Promise<HermesAgentOverview> {
    const [health, capabilities, models] = await Promise.all([
      this.getDetailedHealthAsync(),
      this.getCapabilitiesAsync(),
      this.getModelsAsync(),
    ]);

    const [sessions, jobs, toolsets, dashboardStatus, skills] = await Promise.all([
      this.getOptionalAsync(() => this.getSessionsAsync(), []),
      this.getOptionalAsync(() => this.getJobsAsync(), []),
      this.getOptionalAsync(() => this.getToolsetsAsync(), []),
      this.getOptionalAsync(() => this.getDashboardStatusAsync(), null),
      this.getOptionalAsync(() => this.getDashboardSkillsAsync(), []),
    ]);
    const releaseDate = dashboardStatus?.release_date;
    const update = releaseDate ? await this.getOptionalAsync(() => this.getUpdateStatusAsync(releaseDate), null) : null;

    return {
      health,
      capabilities,
      models,
      sessions,
      jobs,
      toolsets,
      dashboardStatus,
      skills,
      update,
    };
  }

  private async getDashboardOverviewAsync(dashboardStatus: HermesDashboardStatus): Promise<HermesAgentOverview> {
    const token = await this.getDashboardSessionTokenAsync();
    const dashboardHeaders = token ? { "X-Hermes-Session-Token": token } : null;
    const releaseDate = dashboardStatus.release_date;
    const [skills, sessions, jobs, toolsets, update] = await Promise.all([
      dashboardHeaders
        ? this.getOptionalAsync(
            () => this.getJsonAsync("/api/skills", hermesSkillsResponseSchema, undefined, false, dashboardHeaders),
            [],
          )
        : [],
      dashboardHeaders
        ? this.getOptionalAsync(
            () => this.getJsonAsync("/api/sessions", hermesSessionsResponseSchema, undefined, false, dashboardHeaders),
            [],
          )
        : [],
      dashboardHeaders
        ? this.getOptionalAsync(
            () => this.getJsonAsync("/api/cron/jobs", hermesJobsResponseSchema, undefined, false, dashboardHeaders),
            [],
          )
        : [],
      dashboardHeaders
        ? this.getOptionalAsync(
            () =>
              this.getJsonAsync(
                "/api/tools/toolsets",
                hermesToolsetsResponseSchema,
                undefined,
                false,
                dashboardHeaders,
              ),
            [],
          )
        : [],
      releaseDate ? this.getOptionalAsync(() => this.getUpdateStatusAsync(releaseDate), null) : null,
    ]);

    return {
      health: {
        status: dashboardStatus.gateway_running === false ? "error" : "ok",
        platform: "hermes-dashboard",
        gateway_state: dashboardStatus.gateway_state,
        platforms: dashboardStatus.gateway_platforms,
        active_agents: 0,
        exit_reason: dashboardStatus.gateway_exit_reason,
        updated_at: dashboardStatus.gateway_updated_at,
      },
      capabilities: {
        platform: "hermes-dashboard",
        model: null,
        features: {},
      },
      models: [],
      sessions,
      jobs,
      toolsets,
      dashboardStatus,
      skills,
      update,
    };
  }

  public async getDetailedHealthAsync() {
    return await this.getJsonAsync("/health/detailed", hermesDetailedHealthSchema);
  }

  public async getCapabilitiesAsync() {
    return await this.getJsonAsync("/v1/capabilities", hermesCapabilitiesSchema);
  }

  public async getModelsAsync() {
    return (await this.getJsonAsync("/v1/models", hermesModelsResponseSchema)).data;
  }

  public async getSessionsAsync() {
    return await this.getJsonAsync("/api/sessions", hermesSessionsResponseSchema, {
      limit: 10,
      include_children: false,
    });
  }

  public async getJobsAsync() {
    return await this.getJsonAsync("/api/jobs", hermesJobsResponseSchema, {
      include_disabled: true,
    });
  }

  public async getToolsetsAsync() {
    return await this.getJsonAsync("/v1/toolsets", hermesToolsetsResponseSchema);
  }

  public async getDashboardStatusAsync() {
    return await this.getJsonAsync("/api/status", hermesDashboardStatusSchema, undefined, false);
  }

  public async getDashboardSkillsAsync() {
    const token = await this.getDashboardSessionTokenAsync();
    if (!token) return [];

    return await this.getJsonAsync("/api/skills", hermesSkillsResponseSchema, undefined, false, {
      "X-Hermes-Session-Token": token,
    });
  }

  private async getUpdateStatusAsync(releaseDate: string): Promise<HermesUpdateStatus | null> {
    if (env.NO_EXTERNAL_CONNECTION) return null;

    const now = Date.now();
    const cached = githubUpdateCache.get(releaseDate);
    if (cached && cached.expiresAt > now) {
      return await cached.promise;
    }

    const promise = this.fetchUpdateStatusAsync(releaseDate);
    githubUpdateCache.set(releaseDate, {
      expiresAt: now + githubUpdateCacheDurationMs,
      promise,
    });

    return await promise;
  }

  private async fetchUpdateStatusAsync(releaseDate: string): Promise<HermesUpdateStatus | null> {
    const currentReleaseTag = `v${releaseDate}`;
    const headers = createGithubHeaders();
    const latestReleaseResponse = await fetchWithTrustedCertificatesAsync(
      new URL("https://api.github.com/repos/NousResearch/hermes-agent/releases/latest"),
      { headers },
    );

    if (!latestReleaseResponse.ok) {
      return null;
    }

    const latestRelease = hermesReleaseSchema.parse(await latestReleaseResponse.json());
    const compareResponse = await fetchWithTrustedCertificatesAsync(
      new URL(`https://api.github.com/repos/NousResearch/hermes-agent/compare/${currentReleaseTag}...main`),
      { headers },
    );
    const compare = compareResponse.ok ? hermesCompareSchema.parse(await compareResponse.json()) : null;

    return {
      currentReleaseTag,
      latestReleaseTag: latestRelease.tag_name,
      hasNewRelease: latestRelease.tag_name !== currentReleaseTag,
      commitsBehind: compare?.ahead_by ?? compare?.total_commits ?? null,
      releaseUrl: latestRelease.html_url ?? null,
    };
  }

  private async getDashboardSessionTokenAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/"), {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) return null;

    const html = await response.text();
    return html.match(/__HERMES_SESSION_TOKEN__="([^"]+)"/)?.[1] ?? null;
  }

  private async getJsonAsync<TSchema extends z.ZodType>(
    path: `/${string}`,
    schema: TSchema,
    queryParams?: Record<string, string | number | boolean>,
    includeAuth = true,
    headers: Record<string, string> = {},
  ): Promise<z.infer<TSchema>> {
    const response = await fetchWithTrustedCertificatesAsync(this.url(path, queryParams), {
      headers: {
        ...(includeAuth ? this.getAuthHeaders() : { Accept: "application/json" }),
        ...headers,
      },
    });

    if (!response.ok) {
      throw new ResponseError(response);
    }

    return schema.parse(await response.json()) as z.infer<TSchema>;
  }

  private async getOptionalAsync<T>(requestAsync: () => Promise<T>, fallback: T) {
    try {
      return await requestAsync();
    } catch {
      return fallback;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getSecretValue("apiKey")}`,
      Accept: "application/json",
    };
  }
}
