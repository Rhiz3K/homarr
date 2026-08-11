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

interface HermesJobState {
  failed: boolean;
  paused: boolean;
}

export const getJobSortPriority = (job: HermesJobState) => (job.failed ? 0 : job.paused ? 1 : 2);

export const getJobDisplayState = (job: HermesJobState) => (job.paused ? "paused" : job.failed ? "failed" : "enabled");

export const getCompactStatusKey = (status: string) => {
  switch (status.toLowerCase()) {
    case "connected":
    case "ok":
    case "ready":
    case "running":
      return "ok" as const;
    case "busy":
      return "busy" as const;
    case "degraded":
      return "warn" as const;
    case "auth_error":
      return "auth" as const;
    case "error":
    case "unhealthy":
    case "not_ready":
    case "disconnected":
    case "failed":
    case "fatal":
    case "startup_failed":
    case "stopped":
      return "error" as const;
    case "draining":
    case "queued":
    case "retrying":
    case "starting":
    case "stopping":
    case "waiting_for_approval":
      return "wait" as const;
    default:
      return null;
  }
};
