import { describe, expect, test } from "vitest";

import type { HermesJob, HermesSession } from "@homarr/integrations/types";

import {
  getCompactStatusKey,
  getHermesGatewayState,
  getHermesPlatformChannels,
  getJobSummary,
  getStatusColor,
  isJobFailed,
  isJobPaused,
} from "./utils";

const baseHealth = { status: "ok", platforms: {}, active_agents: 0 };
const baseDashboardStatus = {
  version: "1.0.0",
  gateway_running: true,
  gateway_platforms: {},
  profiles: [],
  auth_providers: [],
};

describe("Hermes Agent widget utilities", () => {
  test("maps current gateway and readiness states to semantic colors", () => {
    expect(getStatusColor("ready")).toBe("green");
    expect(getStatusColor("degraded")).toBe("yellow");
    expect(getStatusColor("draining")).toBe("yellow");
    expect(getStatusColor("auth_error")).toBe("red");
    expect(getStatusColor("startup_failed")).toBe("red");
    expect(getStatusColor("stopped")).toBe("red");
  });

  test("recognizes Hermes cron error and paused states", () => {
    const healthyJob: HermesJob = { id: "healthy", schedule: null, enabled: true, last_status: "ok" };
    const failedJob: HermesJob = { id: "failed", schedule: null, enabled: true, last_status: "error" };
    const pausedJob: HermesJob = { id: "paused", schedule: null, enabled: true, state: "paused" };
    const jobs = [healthyJob, failedJob, pausedJob];

    expect(isJobFailed(failedJob)).toBe(true);
    expect(isJobPaused(pausedJob)).toBe(true);
    expect(getJobSummary(jobs)).toEqual({ total: 3, active: 2, failed: 1, paused: 1 });
  });

  test("maps gateway states to compact label keys", () => {
    expect(getCompactStatusKey("running")).toBe("ok");
    expect(getCompactStatusKey("waiting_for_approval")).toBe("wait");
    expect(getCompactStatusKey("startup_failed")).toBe("error");
    expect(getCompactStatusKey("something_else")).toBeNull();
  });

  test("derives the gateway state with auth, readiness, and busy precedence", () => {
    expect(
      getHermesGatewayState({
        mode: "dashboard",
        health: baseHealth,
        dashboardStatus: { ...baseDashboardStatus, nous_session_valid: "terminal", gateway_state: "running" },
      }),
    ).toBe("auth_error");
    expect(
      getHermesGatewayState({
        mode: "apiServer",
        health: { ...baseHealth, readiness: { status: "not_ready" }, gateway_busy: true },
        dashboardStatus: null,
      }),
    ).toBe("not_ready");
    expect(
      getHermesGatewayState({
        mode: "apiServer",
        health: { ...baseHealth, readiness: { status: "ready" }, gateway_busy: true },
        dashboardStatus: null,
      }),
    ).toBe("busy");
    expect(
      getHermesGatewayState({
        mode: "apiServer",
        health: { ...baseHealth, readiness: { status: "ready" } },
        dashboardStatus: null,
      }),
    ).toBe("ready");
    expect(
      getHermesGatewayState({
        mode: "dashboard",
        health: baseHealth,
        dashboardStatus: { ...baseDashboardStatus, gateway_state: "starting" },
      }),
    ).toBe("starting");
  });

  test("groups messaging sessions into distinct chats and topics", () => {
    const sessions = [
      {
        id: "session-1",
        source: "telegram",
        chat_id: "1234",
        chat_type: "group",
        display_name: "Operations",
        thread_id: "42",
      },
      {
        id: "session-2",
        source: "telegram",
        chat_id: "1234",
        chat_type: "group",
        display_name: "Operations",
        thread_id: "42",
      },
      {
        id: "session-3",
        source: "telegram",
        chat_id: "1234",
        chat_type: "group",
        display_name: "Operations",
        thread_id: "99",
      },
      { id: "session-without-channel", source: "cron" },
    ] satisfies HermesSession[];

    expect(getHermesPlatformChannels(sessions)).toEqual([
      {
        id: "telegram:1234:42",
        platform: "telegram",
        displayName: "Operations",
        chatId: "1234",
        chatType: "group",
        threadId: "42",
        sessionCount: 2,
      },
      {
        id: "telegram:1234:99",
        platform: "telegram",
        displayName: "Operations",
        chatId: "1234",
        chatType: "group",
        threadId: "99",
        sessionCount: 1,
      },
    ]);
  });
});
