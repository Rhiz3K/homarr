import type { HermesAgentOverview, HermesJob, HermesSession } from "@homarr/integrations/types";

export interface HermesPlatformChannel {
  id: string;
  platform: string;
  displayName: string | null;
  chatId: string | null;
  chatType: string | null;
  threadId: string | null;
  sessionCount: number;
}

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

const isHealthyStatus = (status: string) => ["connected", "ok", "ready", "running"].includes(status.toLowerCase());

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

export const getHermesGatewayState = (overview: Pick<HermesAgentOverview, "mode" | "health" | "dashboardStatus">) => {
  const status = overview.dashboardStatus;
  if (status?.nous_session_valid === "terminal") return "auth_error";

  const apiReadinessState =
    overview.mode === "apiServer" ? (overview.health.readiness?.status ?? overview.health.status) : null;
  if (apiReadinessState && !isHealthyStatus(apiReadinessState)) return apiReadinessState;
  if (overview.health.gateway_busy) return "busy";
  if (overview.mode === "apiServer") return apiReadinessState ?? overview.health.gateway_state ?? null;

  return status?.gateway_state ?? overview.health.gateway_state ?? overview.health.status;
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

export const getHermesPlatformChannels = (sessions: HermesSession[]) => {
  const channels = new Map<string, HermesPlatformChannel>();

  for (const session of sessions) {
    const platform = session.source?.toLowerCase();
    if (!platform || (!session.chat_id && !session.display_name)) continue;

    const id = `${platform}:${session.chat_id ?? session.display_name}:${session.thread_id ?? "root"}`;
    const existing = channels.get(id);

    if (existing) {
      existing.sessionCount += 1;
      continue;
    }

    channels.set(id, {
      id,
      platform,
      displayName: session.display_name ?? null,
      chatId: session.chat_id ?? null,
      chatType: session.chat_type ?? null,
      threadId: session.thread_id ?? null,
      sessionCount: 1,
    });
  }

  return [...channels.values()];
};
