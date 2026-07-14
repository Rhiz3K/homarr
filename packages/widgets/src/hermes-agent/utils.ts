import dayjs from "dayjs";

import type { HermesJob } from "@homarr/integrations/types";

export const getStatusColor = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case "ok":
    case "running":
    case "connected":
    case "ready":
      return "green";
    case "queued":
    case "busy":
    case "degraded":
    case "draining":
    case "retrying":
    case "starting":
    case "stopping":
    case "waiting_for_approval":
      return "yellow";
    case "cancelled":
    case "auth_error":
    case "error":
    case "unhealthy":
    case "not_ready":
    case "disconnected":
    case "failed":
    case "fatal":
    case "paused":
    case "startup_failed":
    case "stopped":
      return "red";
    default:
      return "gray";
  }
};

export const getJobKey = (job: HermesJob, index: number) => job.id ?? job.job_id ?? job.name ?? `job-${index}`;

export const isJobPaused = (job: HermesJob) =>
  job.paused === true || job.enabled === false || job.state?.toLowerCase() === "paused";

export const isJobFailed = (job: HermesJob) =>
  Boolean(job.last_error ?? job.last_delivery_error) ||
  ["error", "failed"].includes(job.last_status?.toLowerCase() ?? "");

export const getJobSummary = (jobs: HermesJob[]) => {
  return jobs.reduce(
    (summary, job) => {
      const isPaused = isJobPaused(job);
      const isFailed = isJobFailed(job);

      return {
        total: summary.total + 1,
        active: summary.active + (isPaused ? 0 : 1),
        failed: summary.failed + (isFailed ? 1 : 0),
        paused: summary.paused + (isPaused ? 1 : 0),
      };
    },
    { total: 0, active: 0, failed: 0, paused: 0 },
  );
};

export const formatTokenCount = (value: number | null | undefined) => {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toString();
};

export const getHermesDate = (value: string | number) => (typeof value === "number" ? dayjs.unix(value) : dayjs(value));
