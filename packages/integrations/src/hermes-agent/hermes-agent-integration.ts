import type { z } from "zod/v4";

import { env } from "@homarr/common/env";
import { ResponseError } from "@homarr/common/server";
import { fetchWithTrustedCertificatesAsync } from "@homarr/core/infrastructure/http";
import { createLogger } from "@homarr/core/infrastructure/logs";
import { ErrorWithMetadata } from "@homarr/core/infrastructure/logs/error";

import type { IntegrationTestingInput } from "../base/integration";
import { Integration } from "../base/integration";
import type { TestingResult } from "../base/test-connection/test-connection-service";
import type { HermesAgentOverview, HermesDashboardStatus, HermesUpdateStatus } from "./hermes-agent-types";
import {
  hermesApiHealthSchema,
  hermesCapabilitiesSchema,
  hermesCompareSchema,
  hermesDashboardStatusSchema,
  hermesDashboardUpdateSchema,
  hermesDetailedHealthSchema,
  hermesJobsResponseSchema,
  hermesReleaseSchema,
  hermesSessionsResponseSchema,
  hermesSkillsResponseSchema,
  hermesToolsetsResponseSchema,
} from "./hermes-agent-types";

const logger = createLogger({ module: "hermesAgentIntegration" });

const githubHeaders = {
  Accept: "application/vnd.github+json",
  "User-Agent": "Homarr Hermes Agent integration",
} satisfies Record<string, string>;

const githubUpdateCacheDurationMs = 60 * 60 * 1000;
const githubUpdateCacheMaxEntries = 32;
const githubUpdateCache = new Map<
  string,
  {
    expiresAt: number;
    promise: Promise<HermesUpdateStatus | null>;
  }
>();

export class HermesAgentIntegration extends Integration {
  protected async testingAsync(input: IntegrationTestingInput): Promise<TestingResult> {
    const healthResponse = await input.fetchAsync(this.url("/health"), {
      headers: { Accept: "application/json" },
    });
    const healthData = healthResponse.ok ? await healthResponse.json().catch(() => null) : null;
    const isApiServer = hermesApiHealthSchema.safeParse(healthData).success;

    if (!isApiServer) {
      const dashboardStatusResponse = await input.fetchAsync(this.url("/api/status"), {
        headers: { Accept: "application/json" },
      });

      if (!dashboardStatusResponse.ok) {
        throw new ResponseError(healthResponse.ok ? dashboardStatusResponse : healthResponse);
      }

      hermesDashboardStatusSchema.parse(await dashboardStatusResponse.json());
      return { success: true };
    }

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
    if (await this.isApiServerAsync()) {
      return await this.getApiServerOverviewAsync();
    }

    return await this.getDashboardOverviewAsync(await this.getDashboardStatusAsync());
  }

  private async getApiServerOverviewAsync(): Promise<HermesAgentOverview> {
    const [health] = await Promise.all([this.getDetailedHealthAsync(), this.getCapabilitiesAsync()]);

    const [sessions, jobs, toolsets, skills] = await Promise.all([
      this.getOptionalDataAsync("sessions", () => this.getSessionsAsync(), []),
      this.getOptionalDataAsync("jobs", () => this.getJobsAsync(), []),
      this.getOptionalDataAsync("toolsets", () => this.getToolsetsAsync(), []),
      this.getOptionalDataAsync("skills", () => this.getSkillsAsync(), []),
    ]);

    return {
      mode: "apiServer",
      health,
      sessions: sessions.data,
      jobs: jobs.data,
      toolsets: toolsets.data,
      dashboardStatus: null,
      skills: skills.data,
      update: null,
      dataAvailability: {
        sessions: sessions.available,
        jobs: jobs.available,
        toolsets: toolsets.available,
        skills: skills.available,
      },
    };
  }

  private async getDashboardOverviewAsync(dashboardStatus: HermesDashboardStatus): Promise<HermesAgentOverview> {
    const token = await this.getOptionalAsync(
      "dashboard session token",
      () => this.getDashboardSessionTokenAsync(),
      null,
    );
    const dashboardHeaders = token ? { "X-Hermes-Session-Token": token } : null;
    const releaseDate = dashboardStatus.release_date;
    const [skills, sessions, jobs, toolsets, update] = await Promise.all([
      dashboardHeaders
        ? this.getOptionalDataAsync(
            "dashboard skills",
            () => this.getJsonAsync("/api/skills", hermesSkillsResponseSchema, undefined, false, dashboardHeaders),
            [],
          )
        : this.getUnavailableData([]),
      dashboardHeaders
        ? this.getOptionalDataAsync(
            "dashboard sessions",
            () =>
              this.getJsonAsync(
                "/api/sessions",
                hermesSessionsResponseSchema,
                { limit: 50, order: "recent" },
                false,
                dashboardHeaders,
              ),
            [],
          )
        : this.getUnavailableData([]),
      dashboardHeaders
        ? this.getOptionalDataAsync(
            "dashboard jobs",
            () => this.getJsonAsync("/api/cron/jobs", hermesJobsResponseSchema, undefined, false, dashboardHeaders),
            [],
          )
        : this.getUnavailableData([]),
      dashboardHeaders
        ? this.getOptionalDataAsync(
            "dashboard toolsets",
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
        : this.getUnavailableData([]),
      this.getDashboardUpdateStatusAsync(dashboardHeaders, releaseDate),
    ]);

    return {
      mode: "dashboard",
      health: {
        status: dashboardStatus.gateway_running === false ? "error" : "ok",
        platform: "hermes-dashboard",
        version: dashboardStatus.version,
        gateway_state: dashboardStatus.gateway_state,
        platforms: dashboardStatus.gateway_platforms,
        active_agents: dashboardStatus.active_agents ?? 0,
        gateway_busy: dashboardStatus.gateway_busy,
        gateway_drainable: dashboardStatus.gateway_drainable,
        exit_reason: dashboardStatus.gateway_exit_reason,
        updated_at: dashboardStatus.gateway_updated_at,
      },
      sessions: sessions.data,
      jobs: jobs.data,
      toolsets: toolsets.data,
      dashboardStatus,
      skills: skills.data,
      update,
      dataAvailability: {
        sessions: sessions.available,
        jobs: jobs.available,
        toolsets: toolsets.available,
        skills: skills.available,
      },
    };
  }

  public async getDetailedHealthAsync() {
    return await this.getJsonAsync("/health/detailed", hermesDetailedHealthSchema);
  }

  public async getCapabilitiesAsync() {
    return await this.getJsonAsync("/v1/capabilities", hermesCapabilitiesSchema);
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

  public async getSkillsAsync() {
    return await this.getJsonAsync("/v1/skills", hermesSkillsResponseSchema);
  }

  public async getDashboardStatusAsync() {
    return await this.getJsonAsync("/api/status", hermesDashboardStatusSchema, undefined, false);
  }

  private async getDashboardUpdateStatusAsync(
    dashboardHeaders: Record<string, string> | null,
    releaseDate: string | null | undefined,
  ): Promise<HermesUpdateStatus | null> {
    const dashboardUpdate = dashboardHeaders
      ? await this.getOptionalAsync(
          "dashboard update status",
          () =>
            this.getJsonAsync(
              "/api/hermes/update/check",
              hermesDashboardUpdateSchema,
              undefined,
              false,
              dashboardHeaders,
            ),
          null,
        )
      : null;

    if (dashboardUpdate?.behind !== null && dashboardUpdate?.behind !== undefined) {
      return {
        currentReleaseTag: releaseDate ? `v${releaseDate}` : dashboardUpdate.current_version,
        latestReleaseTag: "upstream main",
        hasNewRelease: dashboardUpdate.update_available || dashboardUpdate.behind !== 0,
        commitsBehind: dashboardUpdate.behind >= 0 ? dashboardUpdate.behind : null,
        releaseUrl: "https://github.com/NousResearch/hermes-agent/commits/main",
      };
    }

    return releaseDate
      ? await this.getOptionalAsync("GitHub release status", () => this.getUpdateStatusAsync(releaseDate), null)
      : null;
  }

  private async getUpdateStatusAsync(releaseDate: string): Promise<HermesUpdateStatus | null> {
    if (env.NO_EXTERNAL_CONNECTION) return null;

    const now = Date.now();
    for (const [key, entry] of githubUpdateCache) {
      if (entry.expiresAt <= now) githubUpdateCache.delete(key);
    }

    const cached = githubUpdateCache.get(releaseDate);
    if (cached && cached.expiresAt > now) {
      return await cached.promise;
    }

    while (githubUpdateCache.size >= githubUpdateCacheMaxEntries) {
      const oldestKey = githubUpdateCache.keys().next().value;
      if (oldestKey === undefined) break;
      githubUpdateCache.delete(oldestKey);
    }

    const promise = this.fetchUpdateStatusAsync(releaseDate).catch((error: unknown) => {
      if (githubUpdateCache.get(releaseDate)?.promise === promise) githubUpdateCache.delete(releaseDate);
      throw error;
    });
    githubUpdateCache.set(releaseDate, {
      expiresAt: now + githubUpdateCacheDurationMs,
      promise,
    });

    return await promise;
  }

  private async fetchUpdateStatusAsync(releaseDate: string): Promise<HermesUpdateStatus | null> {
    const currentReleaseTag = `v${releaseDate}`;
    const latestReleaseResponse = await fetchWithTrustedCertificatesAsync(
      new URL("https://api.github.com/repos/NousResearch/hermes-agent/releases/latest"),
      { headers: githubHeaders },
    );

    if (!latestReleaseResponse.ok) {
      return null;
    }

    const latestRelease = hermesReleaseSchema.parse(await latestReleaseResponse.json());
    if (latestRelease.tag_name === currentReleaseTag) {
      return {
        currentReleaseTag,
        latestReleaseTag: latestRelease.tag_name,
        hasNewRelease: false,
        commitsBehind: 0,
        releaseUrl: latestRelease.html_url ?? null,
      };
    }

    const compareResponse = await fetchWithTrustedCertificatesAsync(
      new URL(
        `https://api.github.com/repos/NousResearch/hermes-agent/compare/${currentReleaseTag}...${latestRelease.tag_name}`,
      ),
      { headers: githubHeaders },
    );
    if (!compareResponse.ok) return null;

    const compare = hermesCompareSchema.parse(await compareResponse.json());
    const hasNewRelease = compare.status === "ahead" || (compare.status === "diverged" && (compare.ahead_by ?? 0) > 0);

    return {
      currentReleaseTag,
      latestReleaseTag: latestRelease.tag_name,
      hasNewRelease,
      commitsBehind: hasNewRelease ? (compare.ahead_by ?? null) : 0,
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

  private async isApiServerAsync() {
    const response = await fetchWithTrustedCertificatesAsync(this.url("/health"), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return false;

    const data = await response.json().catch(() => null);
    return hermesApiHealthSchema.safeParse(data).success;
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

  private async getOptionalAsync<T>(endpoint: string, requestAsync: () => Promise<T>, fallback: T) {
    try {
      return await requestAsync();
    } catch (error) {
      this.logUnexpectedOptionalError(endpoint, error);
      return fallback;
    }
  }

  private async getOptionalDataAsync<T>(endpoint: string, requestAsync: () => Promise<T>, fallback: T) {
    try {
      return { data: await requestAsync(), available: true };
    } catch (error) {
      this.logUnexpectedOptionalError(endpoint, error);
      return this.getUnavailableData(fallback);
    }
  }

  private logUnexpectedOptionalError(endpoint: string, error: unknown) {
    if (error instanceof ResponseError && [401, 403, 404, 405].includes(error.statusCode)) return;

    logger.warn(
      new ErrorWithMetadata(
        "Optional Hermes Agent endpoint failed",
        { endpoint, integrationId: this.integration.id },
        { cause: error },
      ),
    );
  }

  private getUnavailableData<T>(data: T) {
    return { data, available: false };
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      ...(this.hasSecretValue("apiKey") ? { Authorization: `Bearer ${this.getSecretValue("apiKey")}` } : {}),
      Accept: "application/json",
    };
  }
}
