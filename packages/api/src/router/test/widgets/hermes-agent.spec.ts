import { describe, expect, test } from "vitest";

import type { HermesAgentOverview } from "@homarr/integrations/types";

import { toHermesAgentWidgetOverview } from "../../widgets/hermes-agent-transform";

const overview = {
  mode: "apiServer",
  health: {
    status: "ready",
    platform: "hermes-agent",
    version: "0.19.0",
    gateway_state: "running",
    platforms: {
      telegram: {
        state: "connected",
        updated_at: "2026-07-21T10:00:00Z",
        error: "upstream token-shaped error",
      },
    },
    active_agents: 2,
  },
  sessions: [{ id: "session-private-id", source: "telegram", title: "Private operations session" }],
  jobs: [
    {
      id: "job-private-id",
      name: "Private backup job",
      schedule: "0 3 * * *",
      enabled: true,
      has_error: true,
    },
  ],
  toolsets: [
    {
      name: "private-tools",
      label: "Private tools",
      enabled: true,
      configured: true,
      tools: ["read_secret_file"],
    },
  ],
  dashboardStatus: null,
  skills: [{ name: "private-skill", enabled: true }],
  update: null,
  dataAvailability: { sessions: true, jobs: true, toolsets: true, skills: true },
} satisfies HermesAgentOverview;

describe("Hermes Agent widget projection", () => {
  test("returns aggregate-only data when detail access is not granted", () => {
    const result = toHermesAgentWidgetOverview(overview, false);
    const serialized = JSON.stringify(result);

    expect(result.detailsRestricted).toBe(true);
    expect(result.details).toBeNull();
    expect(result.summary).toMatchObject({
      activeAgents: 2,
      sessions: 1,
      platforms: { connected: 1, total: 1 },
      jobs: { total: 1, active: 1, failed: 1, paused: 0 },
      skills: { enabled: 1, total: 1 },
      toolsets: { enabled: 1, total: 1 },
    });
    expect(serialized).not.toContain("session-private-id");
    expect(serialized).not.toContain("Private operations session");
    expect(serialized).not.toContain("Private backup job");
    expect(serialized).not.toContain("private-tools");
    expect(serialized).not.toContain("telegram");
    expect(serialized).not.toContain("upstream token-shaped error");
  });

  test("returns only redacted detail fields when detail access is granted", () => {
    const result = toHermesAgentWidgetOverview(overview, true);
    const serialized = JSON.stringify(result);

    expect(result.detailsRestricted).toBe(false);
    expect(result.details).toMatchObject({
      platforms: [{ name: "telegram", state: "connected" }],
      sessions: [{ id: "session-private-id", title: "Private operations session", source: "telegram" }],
      jobs: [{ id: "job-private-id", name: "Private backup job", failed: true }],
      toolsets: [{ name: "private-tools", toolCount: 1 }],
    });
    expect(serialized).not.toContain("read_secret_file");
    expect(serialized).not.toContain("upstream token-shaped error");
  });
});
