import type { HermesJob } from "@homarr/integrations/types";

export const getStatusColor = (status: string | null | undefined) => {
  switch (status?.toLowerCase()) {
    case "ok":
    case "running":
    case "connected":
    case "ready":
      return "green";
    case "queued":
    case "retrying":
    case "starting":
    case "stopping":
    case "waiting_for_approval":
      return "yellow";
    case "cancelled":
    case "disconnected":
    case "failed":
    case "fatal":
    case "paused":
      return "red";
    default:
      return "gray";
  }
};

export const getJobKey = (job: HermesJob, index: number) => job.id ?? job.job_id ?? job.name ?? `job-${index}`;

export const getJobSummary = (jobs: HermesJob[]) => {
  return jobs.reduce(
    (summary, job) => {
      const isPaused = job.paused === true || job.enabled === false || job.state === "paused";
      const isFailed = Boolean(job.last_error ?? job.last_delivery_error) || job.last_status === "failed";

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
