import { describe, expect, test } from "vitest";

import type { HermesJob } from "@homarr/integrations/types";

import { formatTokenCount, getHermesDate, getJobSummary, getStatusColor, isJobFailed, isJobPaused } from "./utils";

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

  test("formats Unix-second session timestamps and token counts", () => {
    expect(getHermesDate(1_767_225_600).toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(formatTokenCount(1_250)).toBe("1.3K");
    expect(formatTokenCount(1_250_000)).toBe("1.3M");
  });
});
